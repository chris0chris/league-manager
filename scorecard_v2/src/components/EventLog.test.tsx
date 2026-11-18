// The log renderer's data work: rows from the server's events (and from the
// scoring entries of an older server), the labels, the undo body and the list.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  GameLog,
  GameLogEvent,
  GameLogTeam,
  LogEntry,
} from "../api/types";
import EventLog, {
  describeRow,
  formatLogTime,
  isMarker,
  isUndoable,
  logRows,
  offlineAttribution,
  undoBody,
  type LogRow,
} from "./EventLog";

function team(overrides: Partial<GameLogTeam> = {}): GameLogTeam {
  return {
    id: 1,
    name: "Ravens",
    score: 0,
    firsthalf: { score: 0, entries: [] },
    secondhalf: { score: 0, entries: [] },
    ...overrides,
  };
}

function event(overrides: Partial<GameLogEvent> = {}): GameLogEvent {
  return {
    id: 10,
    sequence: 1,
    team: "Ravens",
    event: "First Down",
    player: null,
    input: null,
    half: 1,
    cop: false,
    isDeleted: false,
    time: "2026-10-26T12:00:00Z",
    ...overrides,
  };
}

function row(overrides: Partial<LogRow> = {}): LogRow {
  return {
    key: "e1",
    teamLogId: 1,
    eventSeq: null,
    groupSequence: 1,
    team: "Ravens",
    event: "First Down",
    player: null,
    input: null,
    half: 1,
    cop: false,
    isDeleted: false,
    time: "2026-10-26T12:00:00Z",
    payload: null,
    ...overrides,
  };
}

function log(overrides: Partial<GameLog> = {}): GameLog {
  return {
    gameId: 42,
    isFirstHalf: true,
    inPossession: "Ravens",
    events: [],
    home: team(),
    away: team({ id: 2, name: "Wolves" }),
    ...overrides,
  };
}

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return { ...overrides, sequence: overrides.sequence ?? 1 };
}

describe("logRows", () => {
  it("maps the server's events and trims the input", () => {
    const rows = logRows(
      log({
        events: [
          event({ id: 5, input: "  Holding  ", time: "2026-10-26T12:00:00Z" }),
        ],
      }),
    );

    expect(rows).toEqual([
      {
        key: "e5",
        teamLogId: 5,
        eventSeq: null,
        groupSequence: 1,
        team: "Ravens",
        event: "First Down",
        player: null,
        input: "Holding",
        half: 1,
        cop: false,
        isDeleted: false,
        time: "2026-10-26T12:00:00Z",
        payload: null,
      },
    ]);
  });

  it("keeps a blank input and a missing time as null", () => {
    const [only] = logRows(
      log({
        events: [
          event({ input: "   ", time: undefined as unknown as string }),
        ],
      }),
    );

    expect(only?.input).toBeNull();
    expect(only?.time).toBeNull();
  });

  it("rebuilds the scoring rows of a server without events", () => {
    const rows = logRows(
      log({
        events: undefined,
        home: team({
          firsthalf: {
            score: 6,
            entries: [
              entry({
                sequence: 3,
                time: "2026-10-26T12:00:00Z",
                td: 23,
                pat1: null,
                cop: true,
                name: "Turnover",
                player: 11,
              }),
            ],
          },
        }),
      }),
    );

    expect(rows.map((entryRow) => entryRow.event)).toEqual(
      expect.arrayContaining(["Touchdown", "1-Extra-Punkt", "Turnover"]),
    );
    const touchdown = rows.find((entryRow) => entryRow.event === "Touchdown");
    expect(touchdown).toMatchObject({
      teamLogId: null,
      team: "Ravens",
      half: 1,
      player: 23,
      input: null,
      isDeleted: false,
      time: "2026-10-26T12:00:00Z",
    });
    // A conversion without a jersey keeps `player: null`.
    expect(
      rows.find((entryRow) => entryRow.event === "1-Extra-Punkt")?.player,
    ).toBeNull();
    // A cop row names the event and the defender.
    expect(rows.find((entryRow) => entryRow.event === "Turnover")).toMatchObject(
      { player: 11, input: null },
    );
  });

  it("keeps the unknown keys of an old entry as events and skips the ignored ones", () => {
    const rows = logRows(
      log({
        events: undefined,
        away: team({
          id: 2,
          name: "Wolves",
          secondhalf: {
            score: 0,
            entries: [
              entry({
                sequence: 4,
                isDeleted: true,
                cop: false,
                Kragen: 7,
                Notiz: null,
              }),
            ],
          },
        }),
      }),
    );

    expect(rows.map((entryRow) => entryRow.event)).toEqual(["Kragen", "Notiz"]);
    expect(rows[0]).toMatchObject({
      half: 2,
      team: "Wolves",
      player: 7,
      isDeleted: true,
    });
    expect(rows[1]?.player).toBeNull();
  });

  it("puts a timed row ahead of an untimed one in either input order", () => {
    const timed = entry({ sequence: 1, time: "2026-10-26T10:00:00Z", td: 1 });
    const untimed = entry({ sequence: 2, td: 2 });

    const untimedFirst = logRows(
      log({
        events: undefined,
        home: team({
          firsthalf: { score: 0, entries: [untimed] },
          secondhalf: { score: 0, entries: [timed] },
        }),
      }),
    );
    const timedFirst = logRows(
      log({
        events: undefined,
        home: team({
          firsthalf: { score: 0, entries: [timed] },
          secondhalf: { score: 0, entries: [untimed] },
        }),
      }),
    );

    expect(untimedFirst.map((entryRow) => entryRow.groupSequence)).toEqual([1, 2]);
    expect(timedFirst.map((entryRow) => entryRow.groupSequence)).toEqual([1, 2]);
  });

  it("orders two untimed rows by half, then by sequence", () => {
    const rows = logRows(
      log({
        events: undefined,
        home: team({
          firsthalf: { score: 0, entries: [entry({ sequence: 4, td: 1 })] },
          secondhalf: { score: 0, entries: [entry({ sequence: 2, td: 2 })] },
        }),
      }),
    );

    expect(rows.map((entryRow) => entryRow.half)).toEqual([2, 1]);
  });

  it("sorts newest first by time, then half, then sequence", () => {
    const rows = logRows(
      log({
        events: undefined,
        home: team({
          firsthalf: {
            score: 0,
            entries: [
              entry({ sequence: 1, time: "2026-10-26T10:00:00Z", td: 1 }),
              entry({ sequence: 5, time: "2026-10-26T11:00:00Z", td: 2 }),
              entry({ sequence: 9, time: "2026-10-26T09:00:00Z", td: 3 }),
            ],
          },
          secondhalf: {
            score: 0,
            entries: [entry({ sequence: 2, td: 4 }), entry({ sequence: 8, td: 5 })],
          },
        }),
      }),
    );

    // Two timed rows first (newest first), then the untimed second-half rows by
    // sequence, then the untimed first-half row.
    expect(rows.map((entryRow) => entryRow.groupSequence)).toEqual([5, 1, 9, 8, 2]);
  });
});

describe("describeRow", () => {
  it("labels every scoring event", () => {
    expect(describeRow(row({ event: "Touchdown", player: 23 }))).toEqual({
      kind: "td",
      primary: "Touchdown Ravens",
      secondary: "#23",
    });
    expect(describeRow(row({ event: "1-Extra-Punkt" }))).toEqual({
      kind: "pat",
      primary: "1 Extrapunkt Ravens",
      secondary: null,
    });
    expect(describeRow(row({ event: "2-Extra-Punkte", player: 3 }))).toEqual({
      kind: "pat",
      primary: "2 Extrapunkte Ravens",
      secondary: "#3",
    });
    expect(describeRow(row({ event: "Overtime" }))).toEqual({
      kind: "pat",
      primary: "Overtime Ravens",
      secondary: null,
    });
    expect(describeRow(row({ event: "Turnover" }))).toMatchObject({
      kind: "int",
      primary: "Turnover Ravens",
    });
    expect(describeRow(row({ event: "Interception", player: 4 }))).toEqual({
      kind: "int",
      primary: "Interception Ravens",
      secondary: "#4",
    });
    expect(describeRow(row({ event: "First Down" }))).toEqual({
      kind: "first",
      primary: "1st Down Ravens",
      secondary: null,
    });
  });

  it("spells out the safety points and leaves a plain safety without them", () => {
    expect(
      describeRow(row({ event: "Safety (+1)", player: 7 })).secondary,
    ).toBe("+1 Punkt · #7");
    expect(describeRow(row({ event: "Safety (+2)" })).secondary).toBe(
      "+2 Punkte",
    );
    expect(describeRow(row({ event: "Safety" })).secondary).toBeNull();
  });

  it("labels penalties, timeouts, time and notes", () => {
    expect(
      describeRow(row({ event: "Strafe", input: "Holding", player: 9 })),
    ).toEqual({
      kind: "pen",
      primary: "Strafe gegen Ravens",
      secondary: "Holding · #9",
    });
    expect(describeRow(row({ event: "Strafe" }))).toEqual({
      kind: "pen",
      primary: "Strafe gegen Ravens",
      secondary: null,
    });
    expect(
      describeRow(
        row({
          event: "Strafe",
          input: "Unsportliches Verhalten Offense",
          payload: { unsportsmanlike: "12, 7" },
        }),
      ),
    ).toEqual({
      kind: "pen",
      primary: "Strafe gegen Ravens",
      secondary: "Unsportliches Verhalten Offense · Nr. 12, 7",
    });
    expect(describeRow(row({ event: "Auszeit", input: "30" }))).toEqual({
      kind: "to",
      primary: "Auszeit Ravens",
      secondary: "30",
    });
    expect(describeRow(row({ event: "Spielzeit", input: "05:30" }))).toEqual({
      kind: "time",
      primary: "Spielzeit 05:30",
      secondary: null,
    });
    expect(describeRow(row({ event: "Spielzeit" })).primary).toBe("Spielzeit");
    expect(describeRow(row({ event: "Kickoff", input: "Verschoben" }))).toEqual({
      kind: "note",
      primary: "Kickoff",
      secondary: "Verschoben",
    });
  });

  it("uses a dash for a game-level marker without a team", () => {
    expect(describeRow(row({ event: "Spiel beendet", team: null })).primary).toBe(
      "Spiel beendet",
    );
    expect(
      describeRow(row({ event: "Touchdown", team: null })).primary,
    ).toBe("Touchdown –");
  });
});

describe("undoBody and isMarker", () => {
  it("undoes a scoring play by its sequence", () => {
    expect(undoBody(row({ event: "Touchdown", groupSequence: 4 }))).toEqual({
      sequence: 4,
    });
  });

  it("undoes an excluded event or a sequence-0 row by its row id", () => {
    expect(undoBody(row({ event: "Strafe", groupSequence: 7 }))).toEqual({
      team_log_id: 1,
    });
    expect(undoBody(row({ event: "Kickoff", groupSequence: 0 }))).toEqual({
      team_log_id: 1,
    });
  });

  it("falls back to the sequence for a reconstructed row", () => {
    expect(undoBody(row({ event: "Strafe", teamLogId: null }))).toEqual({
      sequence: 1,
    });
  });

  it("marks only the game-level markers", () => {
    for (const eventName of [
      "Spiel gestartet",
      "2. Halbzeit gestartet",
      "Spiel beendet",
    ]) {
      expect(isMarker(row({ event: eventName }))).toBe(true);
    }
    expect(isMarker(row({ event: "First Down" }))).toBe(false);
  });

  it("undoes the half-time and overtime markers, never the start or end", () => {
    expect(isUndoable(row({ event: "2. Halbzeit gestartet" }))).toBe(true);
    expect(isUndoable(row({ event: "Overtime startet" }))).toBe(true);
    expect(isUndoable(row({ event: "Spiel gestartet" }))).toBe(false);
    expect(isUndoable(row({ event: "Spiel beendet" }))).toBe(false);
    expect(isUndoable(row({ event: "Touchdown" }))).toBe(true);
    expect(isUndoable(row({ event: "Touchdown", isDeleted: true }))).toBe(false);
  });
});

describe("formatLogTime", () => {
  it("formats an ISO time and hides an absent or broken one", () => {
    expect(formatLogTime(null)).toBe("");
    expect(formatLogTime("keine Zeit")).toBe("");
    expect(formatLogTime("2026-10-26T12:05:00Z")).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("offlineAttribution", () => {
  it("names the recorder and the sender when they differ", () => {
    expect(
      offlineAttribution(
        row({
          payload: {
            offline_recorded_by: "anna",
            offline_sent_by: "bernd",
          },
        }),
      ),
    ).toBe("erfasst von anna, gesendet von bernd");
  });

  it("names only the recorder when the sender is not part of the payload", () => {
    expect(
      offlineAttribution(row({ payload: { offline_recorded_by: "anna" } })),
    ).toBe("erfasst von anna");
  });

  it("adds nothing to an ordinary row", () => {
    expect(offlineAttribution(row())).toBeNull();
  });
});

describe("EventLog", () => {
  it("shows who recorded a replayed entry next to who sent it", () => {
    render(
      <EventLog
        rows={[
          row({
            payload: {
              offline_recorded_by: "anna",
              offline_sent_by: "bernd",
            },
          }),
        ]}
      />,
    );

    expect(
      screen.getByText("erfasst von anna, gesendet von bernd"),
    ).toBeInTheDocument();
  });

  it("marks an entry that has not reached the server yet as waiting", () => {
    render(
      <EventLog
        onUndo={vi.fn()}
        rows={[
          row({ key: "local", teamLogId: -1, event: "First Down" }),
          row({ key: "sent", teamLogId: 9, event: "Turnover" }),
        ]}
      />,
    );

    const [local, sent] = screen.getAllByRole("listitem");
    expect(local).toHaveTextContent("wartet");
    expect(sent).not.toHaveTextContent("wartet");
  });


  it("says so when the log is empty and shows an undo error", () => {
    render(
      <EventLog
        error="Rückgängig fehlgeschlagen."
        onUndo={vi.fn()}
        rows={[]}
      />,
    );

    expect(screen.getByText("Noch keine Einträge")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Rückgängig fehlgeschlagen.",
    );
    expect(screen.getByText("0 Einträge")).toBeInTheDocument();
  });

  it("renders a row with its time and hands the undo the row", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    const only = row({ event: "Touchdown", player: 23 });
    render(<EventLog onUndo={onUndo} rows={[only]} />);

    expect(screen.getByText("Touchdown Ravens")).toBeInTheDocument();
    expect(screen.getByText("#23")).toBeInTheDocument();
    expect(screen.getByText("1 Einträge")).toBeInTheDocument();
    const time = document.querySelector("time");
    expect(time).toHaveAttribute("dateTime", "2026-10-26T12:00:00Z");

    await user.click(
      screen.getByRole("button", { name: "Rückgängig: Touchdown Ravens" }),
    );

    expect(onUndo).toHaveBeenCalledWith(only);
  });

  it("shows the undo as an icon with a tooltip, not a label", () => {
    render(<EventLog onUndo={vi.fn()} rows={[row({ event: "Touchdown" })]} />);

    const undo = screen.getByRole("button", {
      name: "Rückgängig: Touchdown Ravens",
    });
    expect(undo).toHaveTextContent(/^$/);
    expect(undo).toHaveAttribute("title", "Rückgängig: Touchdown Ravens");
  });

  it("strikes a deleted row and offers no undo for it", () => {
    render(
      <EventLog
        onUndo={vi.fn()}
        rows={[row({ event: "Touchdown", isDeleted: true })]}
      />,
    );

    expect(screen.getByText("gelöscht")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Rückgängig/ }),
    ).not.toBeInTheDocument();
  });

  it("offers the undo of a wrong overtime or half-time start", () => {
    for (const eventName of ["Overtime startet", "2. Halbzeit gestartet"]) {
      const { unmount } = render(
        <EventLog onUndo={vi.fn()} rows={[row({ event: eventName })]} />,
      );

      expect(
        screen.getByRole("button", { name: /Rückgängig/ }),
      ).toBeInTheDocument();
      unmount();
    }
  });

  it("shows the kick-off and end markers but never offers their undo", () => {
    render(
      <EventLog
        onUndo={vi.fn()}
        rows={[
          row({ event: "Spiel gestartet", key: "a" }),
          row({ event: "Spiel beendet", key: "b" }),
        ]}
      />,
    );

    expect(screen.getByText("Spiel gestartet")).toBeInTheDocument();
    expect(screen.getByText("Spiel beendet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Rückgängig/ }),
    ).not.toBeInTheDocument();
  });

  it("disables every undo while another write runs", () => {
    render(
      <EventLog
        disabled
        onUndo={vi.fn()}
        rows={[row({ event: "Touchdown" }), row({ key: "e2", event: "Strafe" })]}
      />,
    );

    for (const button of screen.getAllByRole("button", { name: /Rückgängig/ })) {
      expect(button).toBeDisabled();
    }
  });

  it("disables every undo while one row's undo is in flight", () => {
    render(
      <EventLog
        onUndo={vi.fn()}
        rows={[row({ event: "Touchdown" }), row({ key: "e2", event: "Strafe" })]}
        undoKey="e1"
      />,
    );

    const buttons = screen.getAllByRole("button", { name: /Rückgängig/ });
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }
  });

  it("renders a row without a stored time as an empty time", () => {
    render(<EventLog onUndo={vi.fn()} rows={[row({ time: null })]} />);

    const time = document.querySelector("time");
    expect(time).not.toHaveAttribute("dateTime");
    expect(time).toHaveTextContent("");
  });

  it("shows a play with its jersey and detail", () => {
    render(
      <EventLog
        onUndo={vi.fn()}
        rows={[
          row({
            event: "Pass",
            player: 7,
            input: "8 Yards · QB #12",
          }),
          row({ key: "b", event: "Sack", player: 12, input: "5 Yards Verlust" }),
        ]}
      />,
    );

    expect(screen.getByText("Pass Ravens")).toBeInTheDocument();
    expect(screen.getByText("#7 · 8 Yards · QB #12")).toBeInTheDocument();
    expect(screen.getByText("Sack Ravens")).toBeInTheDocument();
    expect(screen.getByText("#12 · 5 Yards Verlust")).toBeInTheDocument();
  });

  it("shows a challenge with its reason", () => {
    render(
      <EventLog
        onUndo={vi.fn()}
        rows={[row({ event: "Challenge", input: "Catch nicht im Feld" })]}
      />,
    );

    expect(screen.getByText("Challenge")).toBeInTheDocument();
    expect(screen.getByText("Catch nicht im Feld")).toBeInTheDocument();
  });

  it("hides the detail line of a row without one", () => {
    render(
      <EventLog
        onUndo={vi.fn()}
        rows={[row({ event: "Spielzeit", input: null })]}
      />,
    );

    const item = screen.getByRole("listitem");
    expect(within(item).queryByText(/·/)).not.toBeInTheDocument();
  });
});

describe("EventLog — Nur Punkte", () => {
  it("filters the log down to the scoring plays", async () => {
    const user = userEvent.setup();
    render(
      <EventLog
        onUndo={vi.fn()}
        rows={[
          row({ key: "a", event: "Touchdown", player: 23, eventSeq: 1 }),
          row({ key: "b", event: "Strafe", input: "Holding", eventSeq: 2 }),
          row({ key: "c", event: "1-Extra-Punkt", player: 23, eventSeq: 3 }),
        ]}
      />,
    );

    expect(screen.getByText("3 Einträge")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nur Punkte" }));

    expect(screen.getByText("2 Einträge")).toBeInTheDocument();
    expect(screen.getByText("Touchdown Ravens")).toBeInTheDocument();
    expect(screen.getByText("1 Extrapunkt Ravens")).toBeInTheDocument();
    expect(screen.queryByText("Strafe gegen Ravens")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Nur Punkte" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("says so when nothing scored yet", async () => {
    const user = userEvent.setup();
    render(<EventLog onUndo={vi.fn()} rows={[row({ event: "First Down" })]} />);

    await user.click(screen.getByRole("button", { name: "Nur Punkte" }));

    expect(screen.getByText("Noch keine Punkte")).toBeInTheDocument();
  });

  it("offers the edit next to undo, but not on a marker or a legacy row", () => {
    const onEdit = vi.fn();
    render(
      <EventLog
        onEdit={onEdit}
        onUndo={vi.fn()}
        rows={[
          row({ key: "a", event: "Touchdown", player: 23, eventSeq: 4 }),
          row({ key: "b", event: "Spiel beendet", eventSeq: 5 }),
          row({ key: "c", event: "First Down", teamLogId: 9, eventSeq: null }),
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Ändern: Touchdown Ravens" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ändern: Spiel beendet" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ändern: 1st Down Ravens" }),
    ).not.toBeInTheDocument();
  });

  it("hides the edit where the log is read-only", () => {
    render(
      <EventLog
        onUndo={vi.fn()}
        rows={[row({ event: "Touchdown", player: 23, eventSeq: 4 })]}
      />,
    );

    expect(screen.queryByRole("button", { name: /Ändern/ })).toBeNull();
  });
});

describe("the Feldposition row", () => {
  it("names the down, the line to gain and the spot", () => {
    expect(
      describeRow(
        row({
          event: "Feldposition",
          input: "1st & M · A4",
          payload: { ballOn: 4, down: 1, goal: false },
        }),
      ),
    ).toEqual({
      kind: "note",
      primary: "Feldposition 1st & M · A4",
      secondary: null,
    });
  });

  it("renders a goal-to-go row from its structured payload", () => {
    expect(
      describeRow(
        row({
          event: "Feldposition",
          payload: { ballOn: 45, down: 3, goal: true },
        }),
      ),
    ).toEqual({
      kind: "note",
      primary: "Feldposition 3rd & G · B5",
      secondary: null,
    });
  });

  it("keeps a row the old app wrote without the structured down", () => {
    expect(
      describeRow(row({ event: "Feldposition", input: "A4" })),
    ).toEqual({
      kind: "note",
      primary: "Feldposition",
      secondary: "A4",
    });
  });

  it("defaults a partially structured row to the first down", () => {
    expect(
      describeRow(
        row({
          event: "Feldposition",
          payload: { ballOn: 20, goal: true },
        }),
      ),
    ).toEqual({
      kind: "note",
      primary: "Feldposition 1st & G · A20",
      secondary: null,
    });
  });

  it("derives the line to gain from the spot when the row has none", () => {
    expect(
      describeRow(
        row({
          event: "Feldposition",
          payload: { ballOn: 12, down: 3 },
        }),
      ),
    ).toEqual({
      kind: "note",
      primary: "Feldposition 3rd & M · A12",
      secondary: null,
    });
  });

  it("renders the whole situation as one line", () => {
    render(
      <EventLog
        onUndo={vi.fn()}
        rows={[
          row({
            event: "Feldposition",
            input: "1st & M · A4",
            payload: { ballOn: 4, down: 1, goal: false },
          }),
        ]}
      />,
    );

    expect(
      screen.getByText("Feldposition 1st & M · A4"),
    ).toBeInTheDocument();
  });
});

describe("a missed extra point", () => {
  it("names the receiver and the defence instead of the points", () => {
    expect(
      describeRow(
        row({
          event: "1-Extra-Punkt",
          player: 3,
          input: "nicht verwandelt · Deflection #2",
          payload: {
            missed: true,
            qb: 23,
            defense: { player: 2, deflection: true },
          },
        }),
      ),
    ).toEqual({
      kind: "pat",
      primary: "1 Extrapunkt nicht verwandelt Ravens",
      secondary: "#3 · Deflection #2",
      missed: true,
    });
  });

  it("reads as a miss without a receiver or details", () => {
    expect(
      describeRow(
        row({
          event: "2-Extra-Punkte",
          input: "nicht verwandelt",
          payload: { missed: true },
        }),
      ),
    ).toEqual({
      kind: "pat",
      primary: "2 Extrapunkte nicht verwandelt Ravens",
      secondary: null,
      missed: true,
    });
  });

  it("recognises the miss in the visible text, not only in the payload", () => {
    const described = describeRow(
      row({
        event: "1-Extra-Punkt",
        player: 3,
        input: "nicht verwandelt · Tackle #2",
      }),
    );

    expect(described).toMatchObject({
      primary: "1 Extrapunkt nicht verwandelt Ravens",
      missed: true,
    });
    expect(described.secondary).toBe("#3 · Tackle #2");
  });

  it("shows a miss the payload names without any visible detail", () => {
    expect(
      describeRow(
        row({
          event: "1-Extra-Punkt",
          payload: { missed: true },
        }),
      ),
    ).toEqual({
      kind: "pat",
      primary: "1 Extrapunkt nicht verwandelt Ravens",
      secondary: null,
      missed: true,
    });
  });

  it("keeps a detail that does not spell out the miss", () => {
    expect(
      describeRow(
        row({
          event: "1-Extra-Punkt",
          player: 3,
          input: "Deflection #2",
          payload: { missed: true },
        }),
      ),
    ).toEqual({
      kind: "pat",
      primary: "1 Extrapunkt nicht verwandelt Ravens",
      secondary: "#3 · Deflection #2",
      missed: true,
    });
  });

  it("keeps a converted try a scoring row", () => {
    const converted = row({
      event: "1-Extra-Punkt",
      player: 3,
      payload: { qb: 23 },
    });

    expect(describeRow(converted)).toMatchObject({
      primary: "1 Extrapunkt Ravens",
      secondary: "#3",
    });
    expect(describeRow(converted).missed).toBeUndefined();
  });

  it("renders the miss with its receiver and the defence", () => {
    render(
      <EventLog
        onUndo={vi.fn()}
        rows={[
          row({
            event: "1-Extra-Punkt",
            player: 3,
            input: "nicht verwandelt · Deflection #2",
            payload: { missed: true },
          }),
        ]}
      />,
    );

    expect(
      screen.getByText("1 Extrapunkt nicht verwandelt Ravens"),
    ).toBeInTheDocument();
    expect(screen.getByText("#3 · Deflection #2")).toBeInTheDocument();
  });

  it("is not counted as points in the Nur Punkte view", async () => {
    const user = userEvent.setup();
    render(
      <EventLog
        onUndo={vi.fn()}
        rows={[
          row({
            key: "a",
            event: "Touchdown",
            player: 23,
            payload: { yards: 8 },
          }),
          row({
            key: "b",
            event: "1-Extra-Punkt",
            input: "nicht verwandelt · Deflection #2",
            payload: { missed: true },
          }),
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Nur Punkte" }));

    expect(screen.getByText("1 Einträge")).toBeInTheDocument();
    expect(screen.getByText("Touchdown Ravens")).toBeInTheDocument();
    expect(
      screen.queryByText("1 Extrapunkt nicht verwandelt Ravens"),
    ).not.toBeInTheDocument();
  });
});

describe("the interception's row", () => {
  it("shows the return detail beside the defender's number", () => {
    const rows = [
      row({
        event: "Interception",
        player: 11,
        input: "bis B20 · 15 Yards Return",
      }),
    ];

    expect(describeRow(rows[0] as never)).toMatchObject({
      primary: "Interception Ravens",
      secondary: "#11 · bis B20 · 15 Yards Return",
    });
  });
});
