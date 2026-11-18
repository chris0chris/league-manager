import {
  act,
  fireEvent,
  render as renderComponent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import "fake-indexeddb/auto";

import { IDBFactory } from "fake-indexeddb";

import { createOutbox } from "../offline/outbox";

import { ApiError, apiDelete, apiGet, apiPost, apiPut } from "../api/client";
import { TeamLogosProvider } from "../app/teamLogos";
import type {
  Game,
  GameLog,
  GameLogEvent,
  GameLogEventInput,
  GameLogTeam,
  GameSetup,
  LogEntry,
  Official,
  Penalty,
  RosterPlayer,
  TeamOfficial,
} from "../api/types";
import TrackingScreen, {
  describeSaved,
  flipsPossession,
  secondHalfPossession,
  SyncStrip,
  trackingSubtitle,
  trackingTitle,
  writeTeam,
} from "./Tracking";
import { getRuntime, resetRuntime } from "../session/runtime";
import { ARM_MS } from "./useArmed";
import type { SyncStatus } from "../session/useSyncStatus";
import { resetSnapshotStore } from "../offline/snapshot";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPut: vi.fn(),
    apiDelete: vi.fn(),
  };
});

const apiPutMock = apiPut as unknown as Mock;
const apiDeleteMock = apiDelete as unknown as Mock;
const apiGetMock = apiGet as unknown as Mock;
const apiPostMock = apiPost as unknown as Mock;

const GAME: Game = {
  id: 42,
  scheduled: "13:30:00",
  field: 2,
  officials: "Crew Rhein",
  officialsId: 7,
  stage: "Vorrunde",
  standing: "",
  home: "Ravens",
  away: "Wolves",
  points_home: null,
  points_away: null,
  status: "1. Halbzeit",
  id_home: "11",
  id_away: "12",
  passcheck: true,
};

/** Local wall-clock time as ISO, so `formatLogTime` is timezone-independent. */
function isoAt(hour: number, minute: number): string {
  return new Date(2026, 9, 26, hour, minute).toISOString();
}

interface EventOverrides {
  id?: number;
  sequence?: number;
  /** The event `seq` a correction names; `null`/absent is a legacy row. */
  seq?: number | null;
  team?: string | null;
  event?: string;
  player?: number | null;
  input?: string | null;
  half?: number;
  cop?: boolean;
  isDeleted?: boolean;
  time?: string;
  payload?: Record<string, unknown> | null;
}

function logEvent(overrides: EventOverrides = {}): GameLogEvent {
  return {
    id: 1,
    sequence: 1,
    seq: null,
    team: "Ravens",
    event: "Touchdown",
    player: null,
    input: null,
    half: 1,
    cop: false,
    isDeleted: false,
    time: isoAt(12, 0),
    ...overrides,
  };
}

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

interface LogOverrides {
  isFirstHalf?: boolean;
  inPossession?: string | null;
  home?: GameLogTeam;
  away?: GameLogTeam;
  events?: GameLogEvent[];
  /** Omit `events` entirely to imitate a server that predates the addition. */
  withoutEvents?: boolean;
}

function makeLog(overrides: LogOverrides = {}): GameLog {
  return {
    gameId: 42,
    isFirstHalf: overrides.isFirstHalf ?? true,
    inPossession: overrides.inPossession ?? null,
    ...(overrides.withoutEvents === true
      ? {}
      : { events: overrides.events ?? [] }),
    home: overrides.home ?? team(),
    away:
      overrides.away ??
      team({ id: 2, name: "Wolves", score: 0 }),
  };
}

/** The server log right after a half-time: second half, marker row, ball at Wolves. */
function markerLog(): GameLog {
  return makeLog({
    isFirstHalf: false,
    inPossession: "Wolves",
    events: [
      logEvent({
        id: 9,
        sequence: 0,
        half: 2,
        team: null,
        event: "2. Halbzeit gestartet",
      }),
    ],
  });
}

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return { sequence: 1, time: isoAt(12, 0), ...overrides };
}

async function clickUndo(name: RegExp): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name }));
}

type SentEvents = { type?: string; code?: string }[] | undefined;

/**
 * A *ball change* is a plain `possession` event with a side — not the turnover
 * and interception plays, which are `possession` events with a play code.
 */
function isPossessionChange(body: unknown): boolean {
  const events = (body as { events?: SentEvents })?.events;
  return (
    events?.length === 1 &&
    events[0].type === "possession" &&
    (events[0].code === "home" || events[0].code === "away")
  );
}

/** The possession changes the screen appended, in order (`away`, `home`, …). */
function sentPossessions(): string[] {
  return apiPostMock.mock.calls
    .map(([, body]) => body)
    .filter(isPossessionChange)
    .map(
      (body) =>
        ((body as { events: SentEvents }).events?.[0]?.code ?? "") as string,
    );
}

/** The play and correction appends (everything but a ball change). */
function sentWrites(): unknown[] {
  return apiPostMock.mock.calls
    .map(([, body]) => body)
    .filter((body) => !isPossessionChange(body));
}

/** How many first downs were sent, with or without a jersey. */
function firstDownPosts(): number {
  return sentWrites().filter(
    (body) =>
      (body as { events?: SentEvents }).events?.[0]?.code === "first_down",
  ).length;
}

/** Answer every append immediately, but hang or reject the ball change. */
function answerPossession(handler: () => Promise<unknown>): void {
  apiPostMock.mockImplementation((_path: string, body: unknown) =>
    isPossessionChange(body)
      ? handler()
      : Promise.resolve({ state: {}, cursor: 1 }),
  );
}

/**
 * The log the next append answers with.
 *
 * The write is now `POST /api/game/<id>/events` (answer: `{state, cursor}`)
 * followed by a read of the log, so a test that wants a specific log sets it
 * here and `routeGets` serves it — the same payload the screen would adopt.
 */
let appendLog: GameLog | null = null;

function answerAppend(log: GameLog): void {
  appendLog = log;
  apiPostMock.mockResolvedValue({ state: {}, cursor: 1 });
  // The session reads the log back after the append; serve it from here so a
  // test only has to name the log it wants, whatever its other GET stubs are.
  const previous = apiGetMock.getMockImplementation();
  apiGetMock.mockImplementation((path: string, options?: unknown) =>
    path === "/api/gamelog/42"
      ? Promise.resolve(log)
      : previous === undefined
        ? Promise.reject(new Error(`unexpected GET ${path}`))
        : previous(path, options),
  );
}

beforeEach(() => {
  // One runtime per test: a pause (device lock, expired session) is app-wide
  // by design and must not leak into the next case.
  // The offline queue is IndexedDB-backed, and a lost log answer falls back to
  // it: a test without a database would fail where the app would not.
  vi.stubGlobal("indexedDB", new IDBFactory());
  globalThis.localStorage.clear();
  resetRuntime();
  resetSnapshotStore();
  appendLog = null;
  apiPutMock.mockReset();
  apiDeleteMock.mockReset();
  apiPostMock.mockReset();
  apiGetMock.mockReset();
  apiPutMock.mockResolvedValue(undefined);
  apiPostMock.mockResolvedValue({ state: {}, cursor: 1 });
  // The roster request only matters for the entry sheets; a pending promise
  // keeps the unrelated tests free of state updates after they finished.
  apiGetMock.mockReturnValue(new Promise(() => undefined));
});

afterEach(async () => {
  // A write whose log read failed is queued; let that land, then empty the
  // queue so the next case starts from a known state (a leftover half-time
  // would otherwise be flushed into the next test).
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  resetRuntime();
  await createOutbox().clearAll();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * The score board reads the team directory from the provider. Every case is a
 * screen on its own, so the wrapper supplies an empty map: no logos, which is
 * what these tests assert around.
 */
function render(ui: ReactElement) {
  return renderComponent(
    <TeamLogosProvider logos={new Map()}>{ui}</TeamLogosProvider>,
  );
}

describe("Tracking score header", () => {
  it("shows both teams, the big score, possession and the half", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          isFirstHalf: false,
          inPossession: "Ravens",
          home: team({ score: 20 }),
          away: team({ id: 2, name: "Wolves", score: 7 }),
        })}
        onFinalize={vi.fn()}
      />,
    );

    const board = screen.getByLabelText("Spielstand");
    expect(within(board).getByText("20")).toBeInTheDocument();
    expect(within(board).getByText("7")).toBeInTheDocument();
    expect(within(board).getByText("2. Halbzeit")).toBeInTheDocument();

    // Possession lives in the team rows; tapping a row hands it the ball.
    expect(
      within(board).getByRole("button", { name: "Ravens, 20 Punkte, am Ball" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(board).getByRole("button", {
        name: "Wolves, 7 Punkte, nicht am Ball",
      }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("derives the half from the payload instead of defaulting to the first", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ isFirstHalf: false })}
        onFinalize={vi.fn()}
      />,
    );

    expect(screen.getByText("2. Halbzeit")).toBeInTheDocument();
    expect(screen.queryByText("1. Halbzeit")).not.toBeInTheDocument();
  });

  it("shows no possession marker when the payload has none", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: null })}
        onFinalize={vi.fn()}
      />,
    );

    expect(screen.queryByText("Ball")).not.toBeInTheDocument();
  });
});

describe("Tracking possession", () => {
  it("sends the team name and switches the marker optimistically", async () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onFinalize={vi.fn()}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^Wolves/ }));

    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [{ type: "possession", code: "away", side: "away" }],
      client_id: expect.any(String),
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^Wolves/ }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("sends only one possession change for two rapid taps", () => {
    answerPossession(() => new Promise(() => undefined));
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onFinalize={vi.fn()}
      />,
    );

    const wolves = screen.getByRole("button", { name: /^Wolves/ });
    fireEvent.click(wolves);
    fireEvent.click(wolves);

    expect(sentPossessions()).toEqual(["away"]);
    expect(wolves).toBeDisabled();
  });

  it("rolls the marker back when the request fails", async () => {
    answerPossession(() =>
      Promise.reject(new ApiError(500, { detail: "Server weg" }, "Server weg")),
    );
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onFinalize={vi.fn()}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^Wolves/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Server weg"),
    );
    expect(screen.getByRole("button", { name: /^Wolves/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: /^Ravens/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("Tracking edit", () => {
  it("writes the corrected event, then undoes the row it replaces", async () => {
    const original = makeLog({
      inPossession: "Ravens",
      events: [
        logEvent({
          id: 9,
          seq: 5,
          event: "Touchdown",
          team: "Ravens",
          player: 23,
          half: 1,
        }),
      ],
    });
    routeGets({ log: original });
    answerAppend(original);
    renderTracking({ log: original });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ändern: Touchdown Ravens" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Touchdown ändern" });
    expect(dialog).toHaveTextContent("Ravens · 1. Halbzeit");
    await user.click(
      await within(dialog).findByRole("button", { name: "Trikot 7, Meier" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Änderung speichern" }),
    );

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    expect(apiPostMock).toHaveBeenNthCalledWith(1, "/api/game/42/events", {
      events: [
        {
          type: "score",
          code: "touchdown",
          side: "home",
          player: 7,
          period: 1,
        },
      ],
      client_id: expect.any(String),
    });
    expect(apiPostMock).toHaveBeenNthCalledWith(2, "/api/game/42/events", {
      events: [{ type: "correction", code: "undo", payload: { undo_of: 5 } }],
      client_id: expect.any(String),
    });
    // The correction does not move the ball, unlike a fresh touchdown.
    expect(sentPossessions()).toEqual([]);
  });

  it("keeps the row's half, so a first-half entry stays in the first half", async () => {
    const original = makeLog({
      isFirstHalf: false,
      inPossession: "Ravens",
      events: [
        logEvent({
          id: 9,
          seq: 5,
          event: "Auszeit",
          team: "Ravens",
          input: "08:12",
          half: 1,
        }),
      ],
    });
    routeGets({ log: original });
    answerAppend(original);
    renderTracking({ log: original });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ändern: Auszeit Ravens" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Auszeit ändern" });
    const minutes = within(dialog).getByRole("textbox", { name: "Minuten" });
    await user.clear(minutes);
    await user.type(minutes, "4");
    await user.click(
      within(dialog).getByRole("button", { name: "Änderung speichern" }),
    );

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    expect(apiPostMock).toHaveBeenNthCalledWith(1, "/api/game/42/events", {
      events: [
        {
          type: "timeout",
          code: "home",
          side: "home",
          player: null,
          period: 1,
          payload: { input: "04:12" },
        },
      ],
      client_id: expect.any(String),
    });
  });
});

describe("Tracking event log", () => {
  it("renders every event kind with its detail", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          events: [
            logEvent({ id: 1, event: "Spielzeit", input: "12:34", time: isoAt(12, 34) }),
            logEvent({ id: 2, event: "Auszeit", team: "Wolves", input: "1:30" }),
            logEvent({ id: 3, event: "Safety (+1)", player: 7 }),
            logEvent({ id: 4, event: "First Down" }),
            logEvent({ id: 5, event: "Interception", cop: true }),
            logEvent({ id: 6, event: "Strafe", team: "Wolves", input: "Holding Defense" }),
            logEvent({ id: 7, event: "1-Extra-Punkt", player: 7 }),
            logEvent({ id: 8, event: "Touchdown", player: 23 }),
          ],
        })}
        onFinalize={vi.fn()}
      />,
    );

    expect(screen.getByText("Spielzeit 12:34")).toBeInTheDocument();
    expect(screen.getByText("Auszeit Wolves")).toBeInTheDocument();
    expect(screen.getByText("Safety · Ravens")).toBeInTheDocument();
    expect(screen.getByText("+1 Punkt · #7")).toBeInTheDocument();
    expect(screen.getByText("1st Down Ravens")).toBeInTheDocument();
    expect(screen.getByText("Interception Ravens")).toBeInTheDocument();
    expect(screen.getByText("Strafe gegen Wolves")).toBeInTheDocument();
    expect(screen.getByText("Holding Defense")).toBeInTheDocument();
    expect(screen.getByText("1 Extrapunkt Ravens")).toBeInTheDocument();
    expect(screen.getByText("Touchdown Ravens")).toBeInTheDocument();
    expect(screen.getByText("#23")).toBeInTheDocument();

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Spielzeit 12:34");
    expect(rows[0]).toHaveTextContent("12:34");
    expect(rows[rows.length - 1]).toHaveTextContent("Touchdown Ravens");
  });

  it("passes the server's event order through unchanged", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          events: [
            logEvent({ id: 1, event: "Touchdown", time: isoAt(12, 5) }),
            logEvent({
              id: 9,
              event: "First Down",
              time: isoAt(12, 30),
            }),
          ],
        })}
        onFinalize={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Touchdown Ravens");
    expect(rows[1]).toHaveTextContent("1st Down Ravens");
  });

  it("keeps a deleted row visible, struck through and without undo", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          events: [
            logEvent({ id: 1, event: "Strafe", team: "Wolves", isDeleted: true }),
            logEvent({ id: 2, event: "Touchdown" }),
          ],
        })}
        onFinalize={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveClass("deleted");
    expect(
      within(rows[0]).queryByRole("button", { name: /Rückgängig/ }),
    ).not.toBeInTheDocument();
    expect(within(rows[1]).getByRole("button", { name: /Rückgängig/ })).toBeInTheDocument();
  });

  it("does not render an empty detail line for an empty input", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          events: [
            logEvent({
              id: 1,
              sequence: 0,
              event: "Auszeit",
              input: "",
            }),
          ],
        })}
        onFinalize={vi.fn()}
      />,
    );

    const row = screen.getAllByRole("listitem")[0];
    expect(row.querySelector(".rowsub")).toBeNull();
  });

  it("shows the empty state when there is nothing to log", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ events: [] })}
        onFinalize={vi.fn()}
      />,
    );

    expect(screen.getByText("Noch keine Einträge")).toBeInTheDocument();
  });

  it("falls back to the scoring entries of an older server", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          withoutEvents: true,
          home: team({
            score: 7,
            firsthalf: { score: 7, entries: [entry({ sequence: 4, td: 23, pat1: 7 })] },
          }),
        })}
        onFinalize={vi.fn()}
      />,
    );

    expect(screen.getByText("Touchdown Ravens")).toBeInTheDocument();
    expect(screen.getByText("1 Extrapunkt Ravens")).toBeInTheDocument();
  });
});

describe("Tracking undo", () => {
  it("undoes an event-sourced row with a correction event", async () => {
    answerAppend(
      makeLog({
        events: [
          logEvent({ id: 5, sequence: 3, seq: 7, event: "Touchdown", isDeleted: true }),
        ],
      }),
    );
    renderTracking({
      log: makeLog({
        events: [logEvent({ id: 5, sequence: 3, seq: 7, event: "Touchdown" })],
      }),
    });

    await clickUndo(/Rückgängig: Touchdown Ravens/);

    // A row an event wrote names its `seq`: the server removes the whole
    // submission group (a touchdown takes its conversion with it).
    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [{ type: "correction", code: "undo", payload: { undo_of: 7 } }],
      client_id: expect.any(String),
    });
    expect(apiDeleteMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getAllByRole("listitem")[0]).toHaveClass("deleted"),
    );
  });

  it("undoes a penalty with a correction event, not a DELETE", async () => {
    answerAppend(
      makeLog({
        events: [
          logEvent({
            id: 6,
            sequence: 0,
            seq: 4,
            event: "Strafe",
            input: "Holding",
            isDeleted: true,
          }),
        ],
      }),
    );
    renderTracking({
      log: makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({
            id: 6,
            sequence: 0,
            seq: 4,
            event: "Strafe",
            input: "Holding",
          }),
        ],
      }),
    });

    await clickUndo(/Rückgängig: Strafe/);

    // A sequence-0 row is addressable because the server links it to the
    // event that wrote it; deleting "sequence 0" would wipe every penalty.
    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [{ type: "correction", code: "undo", payload: { undo_of: 4 } }],
      client_id: expect.any(String),
    });
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });

  it("undoes a legacy row by sequence", async () => {
    apiDeleteMock.mockResolvedValue(makeLog());
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          events: [logEvent({ id: 5, sequence: 3, event: "Touchdown" })],
        })}
        onFinalize={vi.fn()}
      />,
    );

    await clickUndo(/Rückgängig: Touchdown Ravens/);

    expect(apiDeleteMock).toHaveBeenCalledWith("/api/gamelog/42", {
      sequence: 3,
    });
  });

  it("undoes an excluded event by team_log_id", async () => {
    apiDeleteMock.mockResolvedValue(makeLog());
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          events: [
            logEvent({
              id: 6,
              sequence: 0,
              event: "Strafe",
              team: "Wolves",
              input: "Holding Defense",
            }),
          ],
        })}
        onFinalize={vi.fn()}
      />,
    );

    await clickUndo(/Rückgängig: Strafe gegen Wolves/);

    expect(apiDeleteMock).toHaveBeenCalledWith("/api/gamelog/42", {
      team_log_id: 6,
    });
  });

  it("does not offer undo for a game marker", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          events: [
            logEvent({
              id: 9,
              sequence: 0,
              half: 0,
              team: null,
              event: "Spiel gestartet",
            }),
          ],
        })}
        onFinalize={vi.fn()}
      />,
    );

    expect(screen.getByText("Spiel gestartet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Rückgängig/ }),
    ).not.toBeInTheDocument();
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });

  it("undoes a change-of-possession play by sequence", async () => {
    apiDeleteMock.mockResolvedValue(makeLog());
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          events: [
            logEvent({
              id: 7,
              sequence: 6,
              event: "Turnover",
              cop: true,
            }),
          ],
        })}
        onFinalize={vi.fn()}
      />,
    );

    await clickUndo(/Rückgängig: Turnover Ravens/);

    expect(apiDeleteMock).toHaveBeenCalledWith("/api/gamelog/42", {
      sequence: 6,
    });
  });

  it("sends only one delete for two rapid undo taps", () => {
    apiDeleteMock.mockReturnValue(new Promise(() => undefined));
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          events: [
            logEvent({ id: 5, sequence: 2, event: "Touchdown" }),
            logEvent({ id: 6, sequence: 3, event: "Touchdown", player: 7 }),
          ],
        })}
        onFinalize={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button", { name: /Rückgängig/ });
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(apiDeleteMock).toHaveBeenCalledTimes(1);
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it("replaces the log with the delete response", async () => {
    apiDeleteMock.mockResolvedValue(
      makeLog({
        inPossession: "Wolves",
        home: team({ score: 14 }),
        away: team({ id: 2, name: "Wolves", score: 7 }),
        events: [
          logEvent({ id: 10, sequence: 0, event: "First Down", team: "Wolves" }),
          logEvent({ id: 5, sequence: 3, event: "Touchdown", isDeleted: true }),
        ],
      }),
    );
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          inPossession: "Ravens",
          home: team({ score: 20 }),
          away: team({ id: 2, name: "Wolves", score: 7 }),
          events: [logEvent({ id: 5, sequence: 3, event: "Touchdown" })],
        })}
        onFinalize={vi.fn()}
      />,
    );

    await clickUndo(/Rückgängig: Touchdown Ravens/);

    const board = screen.getByLabelText("Spielstand");
    await waitFor(() => expect(within(board).getByText("14")).toBeInTheDocument());
    expect(
      within(board).getByRole("button", { name: /^Wolves, / }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("1st Down Wolves")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")[1]).toHaveClass("deleted");
  });

  it("does not adopt stale possession from a delete while a possession event is in flight", async () => {
    let resolvePut: (() => void) | undefined;
    answerPossession(
      () =>
        new Promise<void>((resolve) => {
          resolvePut = resolve;
        }),
    );
    apiDeleteMock.mockResolvedValue(
      makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({ id: 5, sequence: 3, event: "Touchdown", isDeleted: true }),
        ],
      }),
    );
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          inPossession: "Ravens",
          events: [logEvent({ id: 5, sequence: 3, event: "Touchdown" })],
        })}
        onFinalize={vi.fn()}
      />,
    );

    const wolves = screen.getByRole("button", { name: /^Wolves/ });
    fireEvent.click(wolves);
    await clickUndo(/Rückgängig: Touchdown Ravens/);

    expect(wolves).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /^Ravens/ }),
    ).toHaveAttribute("aria-pressed", "false");

    await act(async () => {
      resolvePut?.();
    });
    expect(wolves).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the log and shows the server detail when undo fails", async () => {
    apiDeleteMock.mockRejectedValueOnce(
      new ApiError(403, { detail: "Keine Berechtigung." }, "Keine Berechtigung."),
    );
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          events: [logEvent({ id: 5, sequence: 3, event: "Touchdown" })],
        })}
        onFinalize={vi.fn()}
      />,
    );

    await clickUndo(/Rückgängig: Touchdown Ravens/);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Keine Berechtigung."),
    );
    expect(screen.getByText("Touchdown Ravens")).toBeInTheDocument();
  });
});

describe("Tracking finalize", () => {
  it("hands the finalise flow to the caller", async () => {
    const onFinalize = vi.fn();
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog()}
        onFinalize={onFinalize}
      />,
    );
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Spiel beenden" }),
    );

    expect(onFinalize).toHaveBeenCalledTimes(1);
  });
});

const ROSTER: RosterPlayer[] = [
  { side: "home", jersey: 7, name: "Meier" },
  { side: "home", jersey: 23, name: "Schulz" },
  { side: "away", jersey: 11, name: "Wolf" },
];

/** The penalty catalogue the sheet loads itself. */
const PENALTIES: Penalty[] = [
  { name: "Holding Defense", subtext: "BS/LoD 10", isPenaltyAgainstOpponent: true },
  { name: "Fehlstart", subtext: "DB/5", isPenaltyAgainstOpponent: false },
  { name: "Abschirmen (Blocken) Offense", subtext: "BS/5", isPenaltyAgainstOpponent: false },
];

/**
 * Route the GETs of one screen: the roster, the penalty catalogue and the log
 * reload after half-time. Unrouted paths fail loudly so a forgotten stub is a
 * test error instead of a silently pending promise.
 */
function routeGets(
  routes: {
    roster?: RosterPlayer[];
    penalties?: Penalty[];
    log?: GameLog;
    setup?: GameSetup;
    officials?: Official[];
    people?: TeamOfficial[];
  } = {},
): void {
  apiGetMock.mockImplementation((path: string) => {
    if (path === "/api/game/42/roster") {
      return Promise.resolve(routes.roster ?? ROSTER);
    }
    if (path === "/api/game/42/officials") {
      return Promise.resolve(routes.officials ?? []);
    }
    if (path === "/api/officials/team/7/list") {
      return Promise.resolve(routes.people ?? []);
    }
    if (path === "/api/config/scorecard/penalties") {
      return Promise.resolve(routes.penalties ?? PENALTIES);
    }
    if (path === "/api/gamelog/42") {
      return Promise.resolve(appendLog ?? routes.log ?? makeLog());
    }
    if (path === "/api/game/42/setup") {
      return Promise.resolve(routes.setup ?? {});
    }
    return Promise.reject(new Error(`unexpected GET ${path}`));
  });
}

function renderTracking(
  overrides: { game?: Game; log?: GameLog } = {},
): void {
  render(
    <TrackingScreen
      game={overrides.game ?? GAME}
      initialLog={overrides.log ?? makeLog({ inPossession: "Ravens" })}
      onFinalize={vi.fn()}
    />,
  );
}

/**
 * Render, then let the snapshot-backed reads settle.
 *
 * The screen reads the setup at mount (through the IndexedDB preload), and the
 * second-half rule needs it. Clicking before that read lands would exercise the
 * documented fallback instead, which is a different test.
 */
async function renderTrackingReady(
  overrides: { game?: Game; log?: GameLog } = {},
): Promise<void> {
  renderTracking(overrides);
  // The preload reads IndexedDB before it asks the network; wait for the
  // setup request, then let the answer be applied.
  await waitFor(() =>
    expect(apiGetMock).toHaveBeenCalledWith("/api/game/42/setup", {
      deviceId: expect.any(String),
    }),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function openSheet(
  user: ReturnType<typeof userEvent.setup>,
  name: string | RegExp,
): Promise<HTMLElement> {
  await user.click(screen.getByRole("button", { name }));
  return screen.findByRole("dialog");
}

/** The board's play tile opens the wizard on that type. */
async function openPlay(
  user: ReturnType<typeof userEvent.setup>,
  name: "Pass" | "Run" | "Sack" | "Interception",
): Promise<HTMLElement> {
  await user.click(screen.getByRole("button", { name }));
  return screen.findByRole("dialog", { name: "Spielzug · Ravens" });
}

/** Advance the play wizard one or more steps (its primary button). */
async function wizardNext(
  user: ReturnType<typeof userEvent.setup>,
  times = 1,
): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await user.click(screen.getByRole("button", { name: "Weiter" }));
  }
}

async function pickJersey(
  user: ReturnType<typeof userEvent.setup>,
  jersey: number,
): Promise<void> {
  await user.click(
    await screen.findByRole("button", {
      name: new RegExp(`^Trikotnummer ${jersey}`),
    }),
  );
}

describe("Tracking play-by-play", () => {
  it("records a pass with yards and the remembered quarterback", async () => {
    globalThis.localStorage.setItem("scorecard:v2:qb:42:home", "12");
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    const sheet = await openPlay(user, "Pass");
    await wizardNext(user); // type → result
    await wizardNext(user); // result → qb + receiver
    await user.click(
      await within(sheet).findByRole("button", { name: "Trikot 7, Meier" }),
    );
    await wizardNext(user); // receiver → defender
    await wizardNext(user); // defender → field position
    const yards = within(sheet).getByRole("textbox", { name: /Raumgewinn/ });
    await user.clear(yards);
    await user.type(yards, "8");
    await user.click(
      within(sheet).getByRole("button", { name: "Spielzug speichern" }),
    );

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [
          {
            type: "play",
            code: "pass",
            side: "home",
            player: 7,
            period: 1,
            payload: {
              input: "8 Yards · QB #12 · 2nd & M · A13",
              yards: 8,
              complete: true,
              qb: 12,
            },
          },
        ],
        client_id: expect.any(String),
      }),
    );
    // A play is the snap, not a change of possession.
    expect(sentPossessions()).toEqual([]);
    expect(
      await screen.findByText(/Pass gespeichert · 8 Yards · QB #12 · 2nd & M · A13/),
    ).toBeInTheDocument();
    // The thrower is remembered for the next pass of this side.
    expect(globalThis.localStorage.getItem("scorecard:v2:qb:42:home")).toBe(
      "12",
    );
  });

  it("preselects the default quarterback again after one play changed it", async () => {
    // The pre-game setup named #7. A trick play's #23 belongs to that play: the
    // next pass starts from the default again (scorer feedback, 2026-11-17).
    globalThis.localStorage.setItem("scorecard:v2:qb:42:home", "7");
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    const sheet = await openPlay(user, "Pass");
    await wizardNext(user); // type → result
    await wizardNext(user); // result → qb + receiver
    expect(within(sheet).getByText("#7")).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "ändern" }));
    await user.click(
      within(
        within(sheet).getByRole("group", { name: "Trikotnummer Quarterback" }),
      ).getByRole("button", { name: "QB 23, Schulz" }),
    );
    await user.click(within(sheet).getByRole("button", { name: "Weiter" }));
    await user.click(within(sheet).getByRole("button", { name: "Weiter" }));
    await user.click(
      within(sheet).getByRole("button", { name: "Spielzug speichern" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    const second = await openPlay(user, "Pass");
    await wizardNext(user); // type → result
    await wizardNext(user); // result → qb + receiver

    expect(within(second).getByText("#7")).toBeInTheDocument();
    expect(globalThis.localStorage.getItem("scorecard:v2:qb:42:home")).toBe("7");
  });

  it("shows the down & distance the log derives", () => {
    renderTracking({
      log: makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({ id: 2, event: "Run", payload: { yards: 3 } }),
          logEvent({ id: 1, event: "Run", payload: { yards: 4 } }),
        ],
      }),
    });

    // Newest first: 4 yards, then 3.
    expect(screen.getByText(/3rd & M/)).toBeInTheDocument();
  });

  it("sets the field position and shows the spot", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    const log = makeLog({
      inPossession: "Ravens",
      events: [
        logEvent({
          id: 5,
          event: "Feldposition",
          input: "A12",
          payload: { ballOn: 12 },
        }),
      ],
    });
    answerAppend(log);
    renderTracking({ log });
    const user = userEvent.setup();

    expect(screen.getByText(/1st & M/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Feldposition" }));
    const sheet = screen.getByRole("dialog", {
      name: "Feldposition · Ravens",
    });
    await user.click(
      within(sheet).getByRole("button", { name: "Feldposition speichern" }),
    );

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [
          {
            type: "fieldpos",
            code: "",
            side: "home",
            player: null,
            period: 1,
            payload: { ballOn: 12, input: "A12", down: 1, goal: false },
          },
        ],
        client_id: expect.any(String),
      }),
    );
    expect(await screen.findByText(/1st & M · A12/)).toBeInTheDocument();
  });

  it("keeps the down when the field position is corrected", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    const log = makeLog({
      inPossession: "Ravens",
      events: [logEvent({ id: 1, event: "Run", payload: { yards: 5 } })],
    });
    // The server log after the correction: the new spot row on top.
    answerAppend(
      makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({
            id: 2,
            event: "Feldposition",
            input: "A15",
            payload: { ballOn: 15, input: "A15" },
          }),
          ...(log.events ?? []),
        ],
      }),
    );
    renderTracking({ log });
    const user = userEvent.setup();

    expect(screen.getByText(/2nd & M · A10/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Feldposition" }));
    const sheet = screen.getByRole("dialog", {
      name: "Feldposition · Ravens",
    });
    const yards = within(sheet).getByRole("textbox", { name: /Yardlinie/ });
    await user.clear(yards);
    await user.type(yards, "15");
    await user.click(
      within(sheet).getByRole("button", { name: "Feldposition speichern" }),
    );

    // The spot moves, the series does not restart.
    expect(await screen.findByText(/2nd & M · A15/)).toBeInTheDocument();
  });

  it("shows goal-to-go once the ball is in B territory", () => {
    renderTracking({
      log: makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({
            id: 2,
            event: "Feldposition",
            input: "B8",
            payload: { ballOn: 42 },
          }),
          logEvent({ id: 1, event: "Run", payload: { yards: 3 } }),
        ],
      }),
    });

    // The spot row is the newest: the drive starts there, goal to go.
    expect(screen.getByText(/1st & G/)).toBeInTheDocument();
    // The spot is in the drive line and in the log row's detail.
    expect(screen.getAllByText(/B8/).length).toBeGreaterThan(0);
  });

  it("moves the spot with the yards of a play", () => {
    renderTracking({
      log: makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({ id: 1, event: "Run", payload: { yards: 30 } }),
          logEvent({
            id: 2,
            event: "Feldposition",
            input: "A10",
            payload: { ballOn: 10 },
          }),
        ],
      }),
    });

    // Newest first: the 30-yard run came after the spot was set.
    expect(screen.getByText(/1st & G · B10/)).toBeInTheDocument();
  });

  it("hands the ball over after a failed fourth down", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    const log = makeLog({
      inPossession: "Ravens",
      events: [
        logEvent({ id: 3, event: "Run", payload: { yards: 6 } }),
        logEvent({ id: 2, event: "Run", payload: { yards: 6 } }),
        logEvent({ id: 1, event: "Run", payload: { yards: 6 } }),
      ],
    });
    answerAppend(log);
    renderTracking({ log });
    const user = userEvent.setup();

    // Fourth down after three runs; one more yard is short of midfield.
    expect(screen.getByText(/4th & M/)).toBeInTheDocument();
    const sheet = await openPlay(user, "Run");
    await wizardNext(user); // type → result
    await wizardNext(user); // result → player
    await user.click(
      await within(sheet).findByRole("button", { name: "Trikot 23, Schulz" }),
    );
    await wizardNext(user); // player → defender
    await wizardNext(user); // defender → field position
    const yards = within(sheet).getByRole("textbox", { name: /Raumgewinn/ });
    await user.clear(yards);
    await user.type(yards, "1");
    await user.click(
      within(sheet).getByRole("button", { name: "Spielzug speichern" }),
    );

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [
          {
            type: "play",
            code: "run",
            side: "home",
            player: 23,
            period: 1,
            payload: { input: "1 Yards · 1st & M · A5", yards: 1 },
          },
          {
            type: "possession",
            code: "turnover",
            side: "home",
            player: null,
            period: 1,
            payload: { input: "4th down", reason: "downs" },
          },
        ],
        client_id: expect.any(String),
      }),
    );
    await waitFor(() => expect(sentPossessions()).toEqual(["away"]));
  });

  it("records a run without a quarterback", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    const sheet = await openPlay(user, "Run");
    await wizardNext(user); // type → result
    await wizardNext(user); // result → player
    await user.click(
      await within(sheet).findByRole("button", { name: "Trikot 23, Schulz" }),
    );
    await wizardNext(user); // player → defender
    await wizardNext(user); // defender → field position
    const yards = within(sheet).getByRole("textbox", { name: /Raumgewinn/ });
    await user.clear(yards);
    await user.type(yards, "14");
    await user.click(
      within(sheet).getByRole("button", { name: "Spielzug speichern" }),
    );

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [
          {
            type: "play",
            code: "run",
            side: "home",
            player: 23,
            period: 1,
            payload: { input: "14 Yards · 2nd & M · A19", yards: 14 },
          },
        ],
        client_id: expect.any(String),
      }),
    );
  });
});

describe("Tracking challenge", () => {
  it("records a challenge with its optional reason and keeps the ball", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Mehr" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Mehr" })).getByRole(
        "button",
        { name: "Challenge" },
      ),
    );
    const sheet = screen.getByRole("dialog", { name: "Challenge · Ravens" });
    await user.type(
      within(sheet).getByRole("textbox", { name: /Was wird gechallenget/ }),
      "Catch nicht im Feld",
    );
    await user.click(
      within(sheet).getByRole("button", { name: "Challenge speichern" }),
    );

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [
          {
            type: "challenge",
            code: "",
            side: "home",
            player: null,
            period: 1,
            payload: { input: "Catch nicht im Feld" },
          },
        ],
        client_id: expect.any(String),
      }),
    );
    expect(sentPossessions()).toEqual([]);
    expect(
      await screen.findByText(/Challenge gespeichert/),
    ).toBeInTheDocument();
  });
});

describe("Tracking touchdown entry", () => {
  it("loads the roster and offers only the possessing side's jerseys", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    renderTracking();
    const user = userEvent.setup();

    const dialog = await openSheet(user, /^Touchdown Ravens$/);

    expect(dialog).toHaveAccessibleName("Wer hat gepunktet?");
    expect(
      await screen.findByRole("button", { name: "Trikotnummer 23, Schulz" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Wolf/ }),
    ).not.toBeInTheDocument();
    expect(apiGetMock).toHaveBeenCalledWith("/api/game/42/roster");
  });

  it("posts the touchdown and replaces the log with the response", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({
        inPossession: "Ravens",
        home: team({ score: 7, firsthalf: { score: 7, entries: [] } }),
        events: [
          logEvent({ id: 10, sequence: 1, event: "1-Extra-Punkt", player: 23 }),
          logEvent({ id: 9, sequence: 1, event: "Touchdown", player: 23 }),
        ],
      }),
    );
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 23);
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [
        { type: "score", code: "touchdown", side: "home", player: 23, period: 1 },
      ],
      client_id: expect.any(String),
    });

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const board = screen.getByLabelText("Spielstand");
    expect(within(board).getByText("7")).toBeInTheDocument();
    // The saved toast gives way to the open extra point.
    expect(
      screen.getByRole("group", { name: "Extrapunkt Ravens" }),
    ).toHaveTextContent("#23");
  });

  it("keeps the sheet open with the server detail when the write fails", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    apiPostMock.mockRejectedValue(
      new ApiError(
        409,
        { detail: "Dieses Spiel läuft auf einem anderen Gerät." },
        "Dieses Spiel läuft auf einem anderen Gerät.",
      ),
    );
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 23);
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(
      (await screen.findAllByRole("alert")).map((alert) => alert.textContent),
    ).toContain("Dieses Spiel läuft auf einem anderen Gerät.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      await screen.findByText(/Nur lesen – das Spiel läuft auf einem anderen Gerät/),
    ).toBeInTheDocument();
  });

  it("disables the composer while a write is in flight", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    apiPostMock.mockReturnValue(new Promise(() => undefined));
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 23);
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(screen.getByRole("button", { name: /^Touchdown Ravens$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1st Down" })).toBeDisabled();
  });
});

describe("Tracking series and time entry", () => {
  it("records the second half's Spielzeit with the payload half", async () => {
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking({
      log: makeLog({ isFirstHalf: false, inPossession: "Ravens" }),
    });
    const user = userEvent.setup();

    const dialog = await openSheet(user, /^Spielzeit$/);
    expect(dialog).toHaveAccessibleName("Spielzeit");
    await user.type(screen.getByRole("textbox", { name: "Minuten" }), "12");
    await user.type(screen.getByRole("textbox", { name: "Sekunden" }), "34");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [
        {
          type: "time",
          code: "clock",
          side: "home",
          player: null,
          period: 2,
          payload: { input: "12:34" },
        },
      ],
      client_id: expect.any(String),
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Spielzeit gespeichert · 12:34",
    );
  });

  it("records an interception from the play wizard for the defender", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    globalThis.localStorage.setItem("scorecard:v2:qb:42:home", "7");
    renderTracking();
    const user = userEvent.setup();

    const sheet = await openPlay(user, "Interception");
    await wizardNext(user); // type → result
    await wizardNext(user, 2); // result → qb → interception
    await user.click(
      await within(sheet).findByRole("button", { name: "Defense 11, Wolf" }),
    );
    await user.click(
      within(sheet).getByRole("button", { name: "Spielzug speichern" }),
    );

    // The interception row is credited to the defender's team and carries the
    // number; the play itself stays with the offence.
    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "/api/game/42/events",
        expect.objectContaining({
          events: [
            expect.objectContaining({
              type: "possession",
              code: "interception",
              side: "away",
              player: 11,
            }),
          ],
        }),
      ),
    );
    await waitFor(() => expect(sentPossessions()).toEqual(["away"]));
  });

  it("records a first down with one tap, no sheet", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "1st Down" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [
          { type: "series", code: "first_down", side: "home", player: null, period: 1 },
        ],
        client_id: expect.any(String),
      }),
    );
  });

  it("adds the jersey to a one-tap first down with a second tap on the tile", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(
      makeLog({
        inPossession: "Ravens",
        events: [logEvent({ id: 9, sequence: 4, seq: 11, event: "First Down" })],
      }),
    );
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "1st Down" }));
    // The tile itself offers the jersey; the toast only confirms and undoes.
    const toast = await screen.findByRole("status", { name: "Gespeichert" });
    expect(within(toast).queryByRole("button", { name: "Nr. ergänzen" })).toBeNull();
    await user.click(await screen.findByRole("button", { name: "Nr. ergänzen" }));
    await user.click(
      await screen.findByRole("button", { name: "Trikot 7, Meier" }),
    );
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [{ type: "correction", code: "undo", payload: { undo_of: 11 } }],
        client_id: expect.any(String),
      }),
    );
    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [
        { type: "series", code: "first_down", side: "home", player: 7, period: 1 },
      ],
      client_id: expect.any(String),
    });
  });
});

describe("Tracking two-step tiles", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("turns the 1st Down tile back after the window, so a tap records again", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(
      makeLog({
        inPossession: "Ravens",
        events: [logEvent({ id: 9, sequence: 4, seq: 11, event: "First Down" })],
      }),
    );
    renderTracking();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.click(screen.getByRole("button", { name: "1st Down" }));
    expect(await screen.findByRole("button", { name: "Nr. ergänzen" })).toHaveClass(
      "is-armed",
    );

    act(() => vi.advanceTimersByTime(ARM_MS));
    await user.click(screen.getByRole("button", { name: "1st Down" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(firstDownPosts()).toBe(2));
  });

  it("adds the jersey when the 1 key is pressed twice", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(min-width: 1280px)",
        media: query,
      })),
    );
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(
      makeLog({
        inPossession: "Ravens",
        events: [logEvent({ id: 9, sequence: 4, seq: 11, event: "First Down" })],
      }),
    );
    renderTracking();

    fireEvent.keyDown(window, { key: "8" });
    await screen.findByRole("button", { name: "Nr. ergänzen" });
    fireEvent.keyDown(window, { key: "8" });

    expect(await screen.findByRole("dialog", { name: "First Down" })).toBeInTheDocument();
    expect(firstDownPosts()).toBe(1);
  });
});

describe("Tracking cockpit", () => {
  it("offers possession in the score header as a two-way switch", async () => {
    answerAppend(makeLog({ inPossession: "Wolves" }));
    renderTracking();
    const user = userEvent.setup();

    const board = screen.getByLabelText("Spielstand");
    const ravens = within(board).getByRole("button", { name: /^Ravens, / });
    const wolves = within(board).getByRole("button", { name: /^Wolves, / });
    expect(ravens).toHaveAttribute("aria-pressed", "true");
    expect(wolves).toHaveAttribute("aria-pressed", "false");

    await user.click(wolves);

    await waitFor(() => expect(sentPossessions()).toEqual(["away"]));
    expect(wolves).toHaveAttribute("aria-pressed", "true");
  });

  it("puts the log above the actions and the actions above the end button", () => {
    renderTracking();

    const log = screen.getByRole("region", { name: "Spielverlauf" });
    const actions = screen.getByRole("region", { name: "Einträge" });
    const end = screen.getByRole("button", { name: "Spiel beenden" });
    expect(log.compareDocumentPosition(actions)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(actions.compareDocumentPosition(end)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("tints the action zone in the colour of the side with the ball", () => {
    renderTracking({ log: makeLog({ inPossession: "Wolves" }) });

    expect(screen.getByRole("region", { name: "Einträge" })).toHaveClass("away");
  });

  it("records a turnover with one tap and undoes it from the toast", async () => {
    answerAppend(
      makeLog({
        inPossession: "Wolves",
        events: [
          logEvent({ id: 7, sequence: 6, seq: 12, event: "Turnover", cop: true }),
        ],
      }),
    );
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Turnover" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const toast = await screen.findByRole("status", { name: "Gespeichert" });
    expect(toast).toHaveTextContent("Turnover");
    // Turnover never names a player: no jersey offer.
    expect(within(toast).queryByRole("button", { name: "Nr. ergänzen" })).toBeNull();

    await user.click(within(toast).getByRole("button", { name: "Rückgängig" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [{ type: "correction", code: "undo", payload: { undo_of: 12 } }],
        client_id: expect.any(String),
      }),
    );
  });

  it("keeps a sheet only for the entry that needs input", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Spielzeit" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    expect(apiPostMock).not.toHaveBeenCalled();
    // the Auszeit tile opens the same dialog as the circles on the team row
    await user.click(screen.getByRole("button", { name: "Auszeit" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Auszeit Ravens" }),
    ).toBeInTheDocument();
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});

describe("Tracking wide layout", () => {
  it("renders the grid landmarks, growing action grid and shared end row", () => {
    renderTracking();

    const layout = screen.getByRole("main", { name: "Spiel erfassen" });
    expect(layout).toHaveClass("tracking-layout");
    expect(
      within(layout).getByRole("complementary", { name: "Spielinfo" }),
    ).toHaveClass("tracking-info");
    expect(layout.querySelector(".tracking-controls")).not.toBeNull();
    expect(
      screen.getByRole("region", { name: "Spielverlauf" }).closest(".tracking-log"),
    ).not.toBeNull();

    const actions = screen.getByRole("region", { name: "Einträge" });
    // the four play tiles, penalty, Spielzeit, Auszeit, Mehr and the
    // short-form entries
    expect(actions.querySelectorAll(".action-grid > .action")).toHaveLength(12);
    const end = screen.getByRole("group", { name: "Spielabschluss" });
    expect(end).toHaveClass("tracking-end");
    expect(within(end).getByRole("button", { name: "Halbzeit" })).toBeInTheDocument();
    expect(
      within(end).getByRole("button", { name: "Spiel beenden" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Neueste oben")).toHaveClass("logfoot-newest");
  });

  it("shows the existing setup, officials and per-half scores in Spielinfo", async () => {
    routeGets({
      setup: { ctResult: "home", direction: "Süd" },
      officials: [
        { id: 1, official: 9, name: null, position: "Referee" },
        { id: 2, official: null, name: "Gast Judge", position: "Judge" },
      ],
      people: [
        {
          id: 9,
          first_name: "Mia",
          last_name: "Klein",
          team: "Crew Rhein",
          license: "A",
          valid_until: "2027-01-01",
          is_valid: true,
        },
      ],
    });
    renderTracking({
      log: makeLog({
        home: team({
          score: 13,
          firsthalf: { score: 6, entries: [] },
          secondhalf: { score: 7, entries: [] },
        }),
        away: team({
          id: 2,
          name: "Wolves",
          score: 14,
          firsthalf: { score: 7, entries: [] },
          secondhalf: { score: 7, entries: [] },
        }),
      }),
    });

    const info = screen.getByRole("complementary", { name: "Spielinfo" });
    await waitFor(() => expect(info).toHaveTextContent("Mia Klein"));
    expect(info).toHaveTextContent("13:30 · Feld 2");
    expect(info).toHaveTextContent("Münzwurf");
    expect(info).toHaveTextContent("Ravens");
    expect(info).toHaveTextContent("Spielrichtung");
    expect(info).toHaveTextContent("Süd");
    expect(info).toHaveTextContent("Passcheck");
    expect(info).toHaveTextContent("Geprüft");
    expect(info).toHaveTextContent("Referee");
    expect(info).toHaveTextContent("Judge");
    expect(info).toHaveTextContent("Gast Judge");

    const halves = within(info).getByRole("table", { name: "Halbzeiten" });
    expect(within(halves).getAllByRole("row")).toHaveLength(3);
    expect(halves).toHaveTextContent("6");
    expect(halves).toHaveTextContent("13");
    expect(halves).toHaveTextContent("14");
  });

  it("does not call the crew empty while it is still loading", () => {
    renderTracking();

    const info = screen.getByRole("complementary", { name: "Spielinfo" });
    expect(info).toHaveTextContent("Offizielle werden geladen");
    expect(info).not.toHaveTextContent("Keine Offiziellen eingetragen");
  });

  it("says when the crew is unavailable instead of calling it empty", async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === "/api/game/42/officials") {
        return Promise.reject(new Error("offline"));
      }
      if (path === "/api/officials/team/7/list") {
        return Promise.resolve([]);
      }
      return new Promise(() => undefined);
    });
    renderTracking();

    const info = screen.getByRole("complementary", { name: "Spielinfo" });
    await waitFor(() =>
      expect(info).toHaveTextContent("Offizielle konnten nicht geladen werden"),
    );
    expect(info).not.toHaveTextContent("Keine Offiziellen eingetragen");
  });

  it("shows the desktop key hints without changing accessible button names", () => {
    renderTracking();

    expect(
      screen.getByRole("button", { name: "Touchdown Ravens" }).querySelector("kbd"),
    ).toHaveAttribute("data-key", "T");
    expect(
      Array.from(
        document.querySelectorAll(".action-grid > .action > kbd"),
        (hint) => hint.getAttribute("data-key"),
      ),
    ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]);
    for (const name of ["Ravens", "Wolves"]) {
      expect(
        screen
          .getByRole("button", { name: new RegExp(`^${name}, `) })
          .querySelector("kbd"),
      ).toHaveAttribute("data-key", "B");
    }
    expect(screen.getByText("Strg Z").tagName).toBe("KBD");
  });

  it("uses the desktop keys for sheets and possession", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(min-width: 1280px)",
        media: query,
      })),
    );
    renderTracking();

    fireEvent.keyDown(window, { key: "t" });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "1" });
    expect(apiPostMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Schließen" }));

    fireEvent.keyDown(window, { key: "b" });
    await waitFor(() => expect(sentPossessions()).toEqual(["away"]));
  });

  it("starts overtime with the 7 key", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(min-width: 1280px)",
        media: query,
      })),
    );
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();

    fireEvent.keyDown(window, { key: "7" });
    // Mehr opens; the Overtime row starts the period.
    const menu = await screen.findByRole("dialog", { name: "Mehr" });
    fireEvent.click(within(menu).getByRole("button", { name: "Overtime" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [
          { type: "period", code: "overtime", side: "home", player: null, period: 1 },
        ],
        client_id: expect.any(String),
      }),
    );
  });

  it("opens the +1 XP step with the 7 key in overtime", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(min-width: 1280px)",
        media: query,
      })),
    );
    apiGetMock.mockResolvedValue(ROSTER);
    const otLog = makeLog({
      inPossession: "Ravens",
      events: [
        logEvent({ id: 9, event: "Overtime startet", team: null, half: 0 }),
      ],
    });
    answerAppend(otLog);
    renderTracking({ log: otLog });

    fireEvent.keyDown(window, { key: "7" });
    const menu = await screen.findByRole("dialog", { name: "Mehr" });
    fireEvent.click(within(menu).getByRole("button", { name: "Overtime" }));

    expect(
      await screen.findByRole("dialog", { name: "Extrapunkt Ravens" }),
    ).toBeInTheDocument();
  });

  it("undoes the newest undoable row with Ctrl+Z and skips markers", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(min-width: 1280px)",
        media: query,
      })),
    );
    renderTracking({
      log: makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({
            id: 10,
            sequence: 0,
            event: "Spiel gestartet",
            team: null,
          }),
          logEvent({ id: 7, sequence: 4, seq: 12, event: "Touchdown" }),
        ],
      }),
    });

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [{ type: "correction", code: "undo", payload: { undo_of: 12 } }],
        client_id: expect.any(String),
      }),
    );
  });
});

describe("Tracking extra point after the try", () => {
  async function scoreTouchdown(user: ReturnType<typeof userEvent.setup>) {
    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 23);
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    return screen.findByRole("group", { name: "Extrapunkt Ravens" });
  }

  it("asks the extra point for a touchdown nobody scored", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await openPlay(user, "Run");
    await wizardNext(user); // type → result
    await user.click(screen.getByRole("button", { name: "Touchdown" }));
    await wizardNext(user, 2); // result → player (no number) → field position
    await user.click(screen.getByRole("button", { name: "Spielzug speichern" }));

    // The six points stand without a name, so the try must still be asked —
    // with no scorer to pre-select.
    const pat = await screen.findByRole("group", { name: "Extrapunkt Ravens" });
    expect(within(pat).getByText(/ohne Nummer/)).toBeInTheDocument();

    await user.click(within(pat).getByRole("button", { name: "+1" }));
    const sheet = screen.getByRole("dialog", { name: "Extrapunkt Ravens" });
    expect(
      within(sheet).getByRole("button", { name: "Ohne Nummer" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(within(sheet).getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [
          { type: "score", code: "pat1", side: "home", player: null, period: 1 },
        ],
        client_id: expect.any(String),
      }),
    );
  });

  it("asks for the extra point once the touchdown is saved, nothing pre-selected", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    const pat = await scoreTouchdown(user);

    for (const name of ["+1", "+2", "nicht verwandelt"]) {
      expect(within(pat).getByRole("button", { name })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
  });

  it("credits the extra point to the scoring team and then hands the ball over", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    const pat = await scoreTouchdown(user);
    // The touchdown keeps the ball: the try belongs to the scoring team.
    expect(sentPossessions()).toEqual([]);
    await user.click(within(pat).getByRole("button", { name: "+1" }));
    // The scorer is pre-selected; saving keeps that jersey.
    const sheet = screen.getByRole("dialog", { name: "Extrapunkt Ravens" });
    await user.click(within(sheet).getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [{ type: "score", code: "pat1", side: "home", player: 23, period: 1 }],
        client_id: expect.any(String),
      }),
    );
    // The conversion ends the try: the kickoff hands the ball to Wolves.
    await waitFor(() => expect(sentPossessions()).toEqual(["away"]));
    await waitFor(() =>
      expect(screen.queryByRole("group", { name: "Extrapunkt Ravens" })).toBeNull(),
    );
  });

  it("lets the official pick who converted the try", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    const pat = await scoreTouchdown(user);
    await user.click(within(pat).getByRole("button", { name: "+2" }));

    // The scorer is the default, the grid is there to change it.
    const sheet = screen.getByRole("dialog", { name: "Extrapunkt Ravens" });
    expect(
      within(sheet).getByText(/Wer hat den Extrapunkt verwandelt/),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByRole("button", { name: "Trikot 23, Schulz" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(
      within(sheet).getByRole("button", { name: "Trikot 7, Meier" }),
    );
    await user.click(within(sheet).getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [{ type: "score", code: "pat2", side: "home", player: 7, period: 1 }],
        client_id: expect.any(String),
      }),
    );
  });

  it("records the try's quarterback with the conversion", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    globalThis.localStorage.setItem("scorecard:v2:qb:42:home", "7");
    renderTracking();
    const user = userEvent.setup();

    const pat = await scoreTouchdown(user);
    await user.click(within(pat).getByRole("button", { name: "+1" }));

    const sheet = screen.getByRole("dialog", { name: "Extrapunkt Ravens" });
    // The remembered thrower is shown as a number, not as the whole grid.
    expect(within(sheet).getByText("#7")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "ändern" })).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [
          {
            type: "score",
            code: "pat1",
            side: "home",
            player: 23,
            period: 1,
            payload: { qb: 7 },
          },
        ],
        client_id: expect.any(String),
      }),
    );
  });

  it("goes back to the result choice without writing", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    const pat = await scoreTouchdown(user);
    const writes = apiPostMock.mock.calls.length;
    await user.click(within(pat).getByRole("button", { name: "+1" }));
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Extrapunkt Ravens" }),
      ).getByRole("button", { name: "Schließen" }),
    );

    expect(
      within(pat).getByRole("button", { name: "nicht verwandelt" }),
    ).toBeInTheDocument();
    expect(apiPostMock.mock.calls.length).toBe(writes);
  });

  it("writes no entry for a missed try, but hands the ball over", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    const pat = await scoreTouchdown(user);
    const writes = sentWrites().length;
    await user.click(within(pat).getByRole("button", { name: "nicht verwandelt" }));

    expect(screen.queryByRole("group", { name: "Extrapunkt Ravens" })).toBeNull();
    expect(sentWrites().length).toBe(writes);
    // The miss writes no row; the possession change is its only record.
    await waitFor(() => expect(sentPossessions()).toEqual(["away"]));
  });

  it("locks the entries until the extra point is answered", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    const pat = await scoreTouchdown(user);

    // Nothing happens between the touchdown and the try, except a penalty: a
    // foul during the try is enforced on the try itself.
    expect(screen.getByRole("button", { name: "1st Down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Strafe" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Halbzeit" })).toBeDisabled();

    await user.click(within(pat).getByRole("button", { name: "nicht verwandelt" }));
    expect(screen.getByRole("button", { name: "1st Down" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Halbzeit" })).toBeEnabled();
  });

  it("holds the end of the game while an extra point is open", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    const onFinalize = vi.fn();
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onFinalize={onFinalize}
      />,
    );
    const user = userEvent.setup();

    const pat = await scoreTouchdown(user);
    await user.click(screen.getByRole("button", { name: "Spiel beenden" }));

    expect(onFinalize).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Extrapunkt");

    await user.click(within(pat).getByRole("button", { name: "nicht verwandelt" }));
    await user.click(screen.getByRole("button", { name: "Spiel beenden" }));
    expect(onFinalize).toHaveBeenCalledTimes(1);
  });
});

describe("Tracking on the sideline", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("has no footer: the log and the action bar own the screen", () => {
    renderTracking();

    expect(document.querySelector(".app-footer")).toBeNull();
  });

  it("keeps the screen on while the game is tracked", async () => {
    const request = vi.fn(async () => ({ release: vi.fn(async () => undefined) }));
    vi.stubGlobal("navigator", { ...navigator, wakeLock: { request } });

    renderTracking();
    await act(async () => undefined);

    expect(request).toHaveBeenCalledWith("screen");
  });

  it("does not hold the screen for a finished game", async () => {
    const request = vi.fn(async () => ({ release: vi.fn(async () => undefined) }));
    vi.stubGlobal("navigator", { ...navigator, wakeLock: { request } });

    renderTracking({ game: { ...GAME, status: "beendet" } });
    await act(async () => undefined);

    expect(request).not.toHaveBeenCalled();
  });

  it("vibrates once a saved entry lands", async () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal("navigator", { ...navigator, vibrate });
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    expect(vibrate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "1st Down" }));

    await waitFor(() => expect(vibrate).toHaveBeenCalledWith(15));
  });
});

describe("Tracking composer state", () => {
  it("disables the entry buttons for a finished game", () => {
    renderTracking({ game: { ...GAME, status: "beendet" } });

    expect(screen.getByRole("button", { name: /^Touchdown Ravens$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1st Down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Strafe" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Safety" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Overtime" })).toBeDisabled();
    expect(screen.getByText("Dieses Spiel ist beendet.")).toBeInTheDocument();
    // A finished game cannot be ended again: the footer action is gone (the
    // screen is also what the deep link opens for the organisation).
    expect(screen.queryByRole("button", { name: "Spiel beenden" })).toBeNull();
  });

  it("asks for possession before an entry can be recorded", () => {
    renderTracking({ log: makeLog({ inPossession: null }) });

    expect(screen.getByRole("button", { name: /^Touchdown$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Turnover" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Strafe" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Safety" })).toBeDisabled();
    expect(
      screen.getByText("Ballbesitz wählen, um Einträge zu erfassen."),
    ).toBeInTheDocument();
  });

  it("shows the team name when possession is stored as a pk", () => {
    renderTracking({ log: makeLog({ inPossession: "1" }) });

    expect(
      screen.getByRole("button", { name: "Touchdown Ravens" }),
    ).toBeInTheDocument();
  });

  it("offers the penalty and more-event tiles as entries", () => {
    renderTracking();

    expect(screen.getByRole("button", { name: "Strafe" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Safety" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Overtime" })).toBeEnabled();
    expect(
      screen.queryByTitle("Folgt in einem späteren Schritt."),
    ).not.toBeInTheDocument();
  });
});

describe("Tracking write guard", () => {
  it("credits an interception to the opponent", () => {
    expect(
      writeTeam([{ name: "Interception", player: 11 }], "Ravens", "Wolves"),
    ).toBe("Wolves");
  });

  it("credits every other event to the possessing team", () => {
    expect(
      writeTeam(
        [
          { name: "Touchdown", player: 23 },
          { name: "1-Extra-Punkt", player: 23 },
        ],
        "Ravens",
        "Wolves",
      ),
    ).toBe("Ravens");
  });

  it("rejects a write without possession with a message", () => {
    expect(() =>
      writeTeam([{ name: "Touchdown", player: 23 }], null, "Wolves"),
    ).toThrow("Kein Ballbesitz – bitte Team wählen.");
  });
});

describe("Tracking entry lifecycle", () => {
  it("moves focus to the extra point once the touchdown is saved", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 23);
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    // The touchdown tile gives way to the open try; the official lands on
    // its first answer instead of on a button that no longer exists.
    const pat = await screen.findByRole("group", { name: "Extrapunkt Ravens" });
    await waitFor(() =>
      expect(within(pat).getByRole("button", { name: "+1" })).toHaveFocus(),
    );
  });

  it("records a second touchdown after the first, for the new possession", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 23);
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    // The try is played: no conversion, so the touchdown tile comes back.
    await user.click(
      within(await screen.findByRole("group", { name: /^Extrapunkt/ })).getByRole(
        "button",
        { name: "nicht verwandelt" },
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [{ type: "possession", code: "away", side: "away" }],
      client_id: expect.any(String),
    });

    const tile = screen.getByRole("button", { name: /^Touchdown Wolves$/ });
    expect(tile).toBeEnabled();
    await user.click(tile);

    // "Ohne Nummer" is a valid entry now, so the save is ready immediately.
    expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
    await pickJersey(user, 11);
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(sentWrites()).toHaveLength(2));
    expect(sentWrites()[1]).toEqual({
      events: [
        { type: "score", code: "touchdown", side: "away", player: 11, period: 1 },
      ],
      client_id: expect.any(String),
    });
  });

  it("falls back to a typed number when the roster request fails", async () => {
    apiGetMock.mockRejectedValue(new ApiError(500, null, "Server weg"));
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    const input = await screen.findByRole("textbox", { name: /Trikotnummer/ });
    await user.type(input, "51");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [
        { type: "score", code: "touchdown", side: "home", player: 51, period: 1 },
      ],
      client_id: expect.any(String),
    });
  });

  it("disables the composer while a possession change is in flight", () => {
    answerPossession(() => new Promise(() => undefined));
    renderTracking();

    fireEvent.click(screen.getByRole("button", { name: /^Wolves/ }));

    expect(
      screen.getByRole("button", { name: /^Touchdown Wolves$/ }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "1st Down" })).toBeDisabled();
  });
});

describe("Possession flip rule", () => {
  const FLIPS = [
    "Turnover",
    "Interception",
    "Safety (+1)",
    "Safety (+2)",
    "Overtime",
    // The try's result ends the try: the kickoff hands the ball over.
    "1-Extra-Punkt",
    "2-Extra-Punkte",
  ];
  // A touchdown keeps the ball: the try belongs to the scoring team.
  const KEEPS = [
    "Strafe",
    "Spielzeit",
    "Auszeit",
    "First Down",
    "Touchdown",
    "Pass",
    "Pass unvollständig",
    "Run",
    "Sack",
  ];

  it.each(FLIPS)("hands the ball over after %s", (name) => {
    expect(flipsPossession([{ name }])).toBe(true);
  });

  it.each(KEEPS)("keeps the ball after %s", (name) => {
    expect(flipsPossession([{ name }])).toBe(false);
  });

  it("treats a touchdown and its conversion as one play", () => {
    expect(
      flipsPossession([
        { name: "Touchdown", player: 23 },
        { name: "1-Extra-Punkt", player: 23 },
      ]),
    ).toBe(true);
  });

  it("keeps the ball for a touchdown without a conversion", () => {
    expect(flipsPossession([{ name: "Touchdown", player: 23 }])).toBe(false);
  });
});

describe("Second-half possession rule", () => {
  it("gives the second half to the side that did not receive the kickoff", () => {
    expect(
      secondHalfPossession({ fhPossession: "home" }, "Ravens", "Wolves"),
    ).toBe("Wolves");
    expect(
      secondHalfPossession({ fhPossession: "away" }, "Ravens", "Wolves"),
    ).toBe("Ravens");
  });

  it("reads the team name an older setup stored", () => {
    expect(
      secondHalfPossession({ fhPossession: "Wolves" }, "Ravens", "Wolves"),
    ).toBe("Ravens");
    expect(
      secondHalfPossession({ fhPossession: "ravens" }, "Ravens", "Wolves"),
    ).toBe("Wolves");
  });

  it("returns null without a usable first possession", () => {
    expect(secondHalfPossession({}, "Ravens", "Wolves")).toBeNull();
    expect(secondHalfPossession(null, "Ravens", "Wolves")).toBeNull();
    expect(
      secondHalfPossession({ fhPossession: "Unbekannt" }, "Ravens", "Wolves"),
    ).toBeNull();
  });
});

describe("Tracking possession flip", () => {
  it("flips to the other team after a touchdown and repaints the tile", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 23);
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    // The try is played: no conversion, so the touchdown tile comes back.
    await user.click(
      within(await screen.findByRole("group", { name: /^Extrapunkt/ })).getByRole(
        "button",
        { name: "nicht verwandelt" },
      ),
    );

    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [{ type: "possession", code: "away", side: "away" }],
      client_id: expect.any(String),
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^Touchdown Wolves$/ }),
      ).toHaveClass("tdbtn", "away"),
    );
  });

  it("shows how many timeouts a side already took, and when", async () => {
    renderTracking({
      log: makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({
            id: 1,
            event: "Auszeit",
            team: "Ravens",
            half: 1,
            input: "08:12",
          }),
        ],
      }),
    });

    // the team's own row shows the budget as circles: filled = still left
    expect(
      screen.getByRole("button", { name: "Auszeit Ravens" }),
    ).toHaveTextContent("●○");
    expect(
      screen.getByRole("button", { name: "Auszeit Wolves" }),
    ).toHaveTextContent("●●");
  });

  it("does not flip after an Auszeit", async () => {
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Auszeit Ravens" }));
    await user.click(screen.getByRole("button", { name: "Auszeit nehmen" }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    expect(sentPossessions()).toEqual([]);
    expect(
      screen.getByRole("button", { name: /^Touchdown Ravens$/ }),
    ).toBeInTheDocument();
  });

  it("records the timeout with the remaining game time", async () => {
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Auszeit Ravens" }));
    await user.type(
      screen.getByRole("textbox", { name: "Minuten" }),
      "8",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Sekunden" }),
      "12",
    );
    await user.click(screen.getByRole("button", { name: "Auszeit nehmen" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "/api/game/42/events",
        expect.objectContaining({
          events: [
            expect.objectContaining({
              type: "timeout",
              code: "home",
              payload: { input: "08:12" },
            }),
          ],
        }),
      ),
    );
  });

  it("keeps the ball after a first down and after a penalty", async () => {
    answerAppend(makeLog({ inPossession: "Ravens" }));
    routeGets();
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "1st Down" }));
    await screen.findByRole("status", { name: "Gespeichert" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    await openSheet(user, /^Strafe$/);
    await user.click(
      await screen.findByRole("button", { name: /^Holding Defense/ }),
    );
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    expect(sentPossessions()).toEqual([]);
  });

  it("flips exactly once per event", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    // Let the mount's queue read settle first: a tap in the very first
    // milliseconds races it (the read republishes the log as authoritative).
    await renderTrackingReady();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Turnover" }));
    await waitFor(() => expect(sentPossessions()).toHaveLength(1));
    // The first write (and its flip) must settle before the next tap counts.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Turnover" })).toBeEnabled(),
    );

    // The turnover credits the possessing team and hands Ravens' ball to
    // Wolves; the second turnover is recorded by Wolves and flips it back.
    await user.click(screen.getByRole("button", { name: "Turnover" }));
    await waitFor(() => expect(sentPossessions()).toHaveLength(2));

    expect(sentPossessions()).toEqual(["away", "home"]);
    expect(
      screen.getByRole("button", { name: /^Touchdown Ravens$/ }),
    ).toBeInTheDocument();
  });

  it("keeps the log and shows the error when the flip fails", async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === "/api/gamelog/42") {
        return Promise.resolve(
          makeLog({
            inPossession: "Ravens",
            events: [
              logEvent({ id: 5, sequence: 1, event: "Touchdown", player: 23 }),
            ],
          }),
        );
      }
      return Promise.resolve(ROSTER);
    });
    answerAppend(
      makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({ id: 5, sequence: 1, event: "Touchdown", player: 23 }),
        ],
      }),
    );
    answerPossession(() =>
      Promise.reject(
        new ApiError(
          500,
          { detail: "Ballbesitz nicht änderbar" },
          "Ballbesitz nicht änderbar",
        ),
      ),
    );
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 23);
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    // The try is played: no conversion, so the touchdown tile comes back.
    await user.click(
      within(await screen.findByRole("group", { name: /^Extrapunkt/ })).getByRole(
        "button",
        { name: "nicht verwandelt" },
      ),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Ballbesitz nicht änderbar",
      ),
    );
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(
      "Touchdown Ravens",
    );
    expect(
      screen.getByRole("button", { name: /^Touchdown Ravens$/ }),
    ).toBeInTheDocument();
  });

  it("takes the possession from the log, not from a captured value, when the flip fails", async () => {
    // The server rejected the flip but reports the ball with Wolves anyway (a
    // second device may have changed it). The next entry must follow the
    // server, not the marker this screen remembered.
    let reads = 0;
    apiGetMock.mockImplementation((path: string) => {
      if (path === "/api/gamelog/42") {
        reads += 1;
        // The play's own read reports the ball where it was; the resync after
        // the rejected flip reports what another device did.
        return Promise.resolve(
          makeLog({ inPossession: reads === 1 ? "Ravens" : "Wolves" }),
        );
      }
      return Promise.resolve(ROSTER);
    });
    answerPossession(() =>
      Promise.reject(
        new ApiError(
          500,
          { detail: "Ballbesitz nicht änderbar" },
          "Ballbesitz nicht änderbar",
        ),
      ),
    );
    answerPossession(() =>
      Promise.reject(
        new ApiError(
          500,
          { detail: "Ballbesitz nicht änderbar" },
          "Ballbesitz nicht änderbar",
        ),
      ),
    );
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 23);
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    // The try is played: no conversion, so the touchdown tile comes back.
    await user.click(
      within(await screen.findByRole("group", { name: /^Extrapunkt/ })).getByRole(
        "button",
        { name: "nicht verwandelt" },
      ),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^Touchdown Wolves$/ }),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "1st Down" }));
    await screen.findByRole("status", { name: "Gespeichert" });

    // The play, the rejected flip and the next play: three appends.
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(3));
    expect(apiPostMock).toHaveBeenLastCalledWith("/api/game/42/events", {
      events: [
        {
          type: "series",
          code: "first_down",
          side: "away",
          player: null,
          period: 1,
        },
      ],
      client_id: expect.any(String),
    });
  });

  it("keeps the possession a play's log reports when the play does not flip it", async () => {
    // A play's read is authoritative too: a change another device made must
    // not be undone by this screen's remembered marker.
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Wolves" }));
    // Let the mount's queue read settle first: a tap in the very first
    // milliseconds races it (the read republishes the log as authoritative).
    await renderTrackingReady();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "1st Down" }));
    // One tap: no sheet closes to say the write is done, so wait for the
    // composer to come back (the write and its log read have settled).
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Auszeit Ravens" }),
      ).toBeEnabled(),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /^Touchdown Ravens$/ }),
    ).toBeInTheDocument();
    expect(sentPossessions()).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Auszeit Ravens" }));
    await user.click(screen.getByRole("button", { name: "Auszeit nehmen" }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    expect(apiPostMock).toHaveBeenLastCalledWith("/api/game/42/events", {
      events: [
        {
          type: "timeout",
          code: "home",
          side: "home",
          player: null,
          period: 1,
        },
      ],
      client_id: expect.any(String),
    });
  });

  it("shows the new possession while the flip is still in flight", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    answerPossession(() => new Promise(() => undefined));
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 23);
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    // The try is open; its miss is what moves the ball to Wolves.
    await user.click(
      within(await screen.findByRole("group", { name: /^Extrapunkt/ })).getByRole(
        "button",
        { name: "nicht verwandelt" },
      ),
    );

    const tile = await screen.findByRole("button", {
      name: /^Touchdown Wolves$/,
    });
    expect(tile).toBeDisabled();
    expect(screen.getByRole("button", { name: "Strafe" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Safety" })).toBeDisabled();
  });
});

describe("Tracking penalties", () => {
  it("records the picked penalty for the team the flag names", async () => {
    routeGets();
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    const dialog = await openSheet(user, /^Strafe$/);
    expect(dialog).toHaveAccessibleName("Strafe");
    await user.click(
      await screen.findByRole("button", { name: /^Holding Defense/ }),
    );
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [
        {
          type: "penalty",
          code: "Holding Defense",
          side: "away",
          player: null,
          period: 1,
          payload: { yardage: 10, nextDown: "loss_of_down" },
        },
      ],
      client_id: expect.any(String),
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Strafe gespeichert · Holding Defense",
    );
  });

  it("shows the earlier UNV of the charged team in the penalty sheet", async () => {
    const unsportsmanlike: Penalty = {
      name: "Unsportliches Verhalten Offense",
      subtext: "DB/10 Notiz",
      isPenaltyAgainstOpponent: false,
    };
    const log = makeLog({
      inPossession: "Ravens",
      events: [
        logEvent({
          id: 1,
          event: "Strafe",
          input: unsportsmanlike.name,
          payload: { unsportsmanlike: "12" },
        }),
      ],
    });
    routeGets({ penalties: [unsportsmanlike] });
    answerAppend(log);
    renderTracking({ log });
    const user = userEvent.setup();

    await openSheet(user, /^Strafe$/);
    await user.click(
      await screen.findByRole("button", {
        name: /^Unsportliches Verhalten Offense/,
      }),
    );

    expect(screen.getByText("Bisher für Ravens")).toBeInTheDocument();
    expect(screen.getByText(/Halbzeit 1: Nr\. 12/)).toBeInTheDocument();
  });
});

describe("Tracking safety and overtime", () => {
  it("records a safety for the opponent and hands them the ball", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    const dialog = await openSheet(user, /^Safety$/);
    expect(dialog).toHaveAccessibleName("Safety");
    expect(
      screen.queryByRole("button", { name: "Trikotnummer 23, Schulz" }),
    ).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", { name: "Trikotnummer 11, Wolf" }),
    );
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [
        {
          type: "score",
          code: "safety",
          side: "away",
          player: 11,
          period: 1,
          payload: { points: 2 },
        },
      ],
      client_id: expect.any(String),
    });
    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [{ type: "possession", code: "away", side: "away" }],
      client_id: expect.any(String),
    });
  });

  it("starts overtime on the second tap, without a score", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Overtime" }));
    await user.click(screen.getByRole("button", { name: "Overtime starten" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [
          { type: "period", code: "overtime", side: "home", player: null, period: 1 },
        ],
        client_id: expect.any(String),
      }),
    );
    expect(sentPossessions()).toEqual([]);
    expect(await screen.findByText("Overtime gestartet")).toBeInTheDocument();
  });

  it("shows why the overtime start was refused", async () => {
    apiPostMock.mockRejectedValueOnce(
      new ApiError(409, { detail: "Dieses Spiel ist beendet." }, "Dieses Spiel ist beendet."),
    );
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Overtime" }));
    await user.click(screen.getByRole("button", { name: "Overtime starten" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Dieses Spiel ist beendet.",
    );
  });

  it("offers +1 XP in overtime and records it with a jersey", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(
      makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({
            id: 9,
            event: "Overtime startet",
            team: null,
            half: 0,
          }),
        ],
      }),
    );
    renderTracking({
      log: makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({
            id: 9,
            event: "Overtime startet",
            team: null,
            half: 0,
          }),
        ],
      }),
    });
    const user = userEvent.setup();

    // The tile is the conversion now, not the start.
    expect(
      screen.queryByRole("button", { name: "Overtime" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "+1 XP" }));
    const sheet = screen.getByRole("dialog", { name: "Extrapunkt Ravens" });
    await user.click(
      await within(sheet).findByRole("button", { name: "Trikot 7, Meier" }),
    );
    await user.click(within(sheet).getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
        events: [
          // overtime is the third period; the row stays in the second half
          { type: "score", code: "pat1", side: "home", player: 7, period: 3 },
        ],
        client_id: expect.any(String),
      }),
    );
    // The overtime conversion ends the try: the other team gets its attempt.
    expect(sentPossessions()).toEqual(["away"]);
  });

  it("offers only the one-point try in overtime", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    const otLog = makeLog({
      inPossession: "Ravens",
      events: [
        logEvent({ id: 9, event: "Overtime startet", team: null, half: 0 }),
      ],
    });
    answerAppend(otLog);
    renderTracking({ log: otLog });
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 23);
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    const pat = await screen.findByRole("group", { name: "Extrapunkt Ravens" });

    expect(within(pat).getByRole("button", { name: "+1" })).toBeInTheDocument();
    expect(
      within(pat).queryByRole("button", { name: "+2" }),
    ).toBeNull();
  });
});

describe("Tracking half-time", () => {
  it("opens the half-time dialog with the score and the second-half facts", async () => {
    renderTracking();

    fireEvent.click(screen.getByRole("button", { name: "Halbzeit" }));

    const dialog = screen.getByRole("dialog", { name: "Halbzeit" });
    expect(within(dialog).getByText("0 : 0 · Ravens – Wolves")).toBeInTheDocument();
    expect(within(dialog).getByText("Ballbesitz 2. Halbzeit")).toBeInTheDocument();
    // Nothing is written until the dialog's button is tapped.
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(
      within(dialog).getByRole("button", { name: "Halbzeit starten" }),
    ).toBeInTheDocument();
  });

  it("shows the second-half possession and the flipped direction", async () => {
    routeGets({ setup: { fhPossession: "home", direction: "Nord" } });
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Halbzeit" }));
    const dialog = screen.getByRole("dialog", { name: "Halbzeit" });

    await waitFor(() => {
      expect(dialog).toHaveTextContent("Wolves");
      expect(dialog).toHaveTextContent("Süd");
    });
  });

  it("writes the half-time as an event, adopts the half and flips possession", async () => {
    routeGets({ log: markerLog() });
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Halbzeit" }));
    await user.click(screen.getByRole("button", { name: "Halbzeit starten" }));

    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [{ type: "period", code: "half_time", side: null }],
      client_id: expect.any(String),
    });
    // The possession write follows the append on its own await: wait for it
    // instead of assuming the microtasks flushed (flaked on CI, not locally).
    await waitFor(() => expect(sentPossessions()).toEqual(["away"]));
    await waitFor(() =>
      expect(screen.getByText("2. Halbzeit")).toBeInTheDocument(),
    );
    expect(apiGetMock).toHaveBeenCalledWith("/api/gamelog/42");
    expect(screen.getByText("2. Halbzeit gestartet")).toBeInTheDocument();
    // The second half has no half-time button any more.
    expect(screen.queryByRole("button", { name: "Halbzeit" })).toBeNull();
    // The break countdown starts with the half.
    expect(await screen.findByRole("timer")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pause beenden" }));
    expect(screen.queryByRole("timer")).toBeNull();
  });

  it("keeps counting a break that this device already started", () => {
    globalThis.localStorage.setItem(
      "scorecard:v2:break:42",
      String(Date.now() - 60_000),
    );

    renderTracking({ log: markerLog() });

    // the intermission is the definition's two minutes (IFAF R 3-2-1)
    expect(screen.getByRole("timer")).toHaveTextContent(/^0[01]:\d\d$/);
  });

  it("drops a break that is already over instead of showing 00:00", () => {
    globalThis.localStorage.setItem(
      "scorecard:v2:break:42",
      String(Date.now() - 10 * 60_000),
    );

    renderTracking({ log: markerLog() });

    expect(screen.queryByRole("timer")).toBeNull();
    expect(globalThis.localStorage.getItem("scorecard:v2:break:42")).toBeNull();
  });

  it("records the next entry in the second half for the new possession", async () => {
    routeGets({ log: markerLog() });
    answerAppend(markerLog());
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Halbzeit" }));
    await user.click(screen.getByRole("button", { name: "Halbzeit starten" }));
    await waitFor(() =>
      expect(screen.getByText("2. Halbzeit")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "1st Down" }));
    await screen.findByRole("status", { name: "Gespeichert" });

    expect(apiPostMock).toHaveBeenCalledWith("/api/game/42/events", {
      events: [
        {
          type: "series",
          code: "first_down",
          side: "away",
          player: null,
          period: 2,
        },
      ],
      client_id: expect.any(String),
    });
  });

  it("shows the server detail when the half-time transition is rejected", async () => {
    apiPostMock.mockRejectedValueOnce(
      new ApiError(
        409,
        { detail: "Dieser Spielstatus erlaubt keine Halbzeit." },
        "Dieser Spielstatus erlaubt keine Halbzeit.",
      ),
    );
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Halbzeit" }));
    await user.click(screen.getByRole("button", { name: "Halbzeit starten" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Dieser Spielstatus erlaubt keine Halbzeit.",
      ),
    );
    expect(sentPossessions()).toEqual([]);
    expect(screen.getByText("1. Halbzeit")).toBeInTheDocument();
  });

  it("keeps the composer closed while the half-time is being written", async () => {
    apiPostMock.mockReturnValue(new Promise(() => undefined));
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Halbzeit" }));
    await user.click(screen.getByRole("button", { name: "Halbzeit starten" }));

    expect(screen.getByRole("button", { name: /^Touchdown Ravens$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1st Down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Strafe" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Wolves/ })).toBeDisabled();
  });

  it("keeps the second half when the log reload fails", async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === "/api/game/42/roster") {
        return Promise.resolve(ROSTER);
      }
      return Promise.reject(new ApiError(500, null, "Server weg"));
    });
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Halbzeit" }));
    await user.click(screen.getByRole("button", { name: "Halbzeit starten" }));

    await waitFor(() =>
      expect(screen.getByText("2. Halbzeit")).toBeInTheDocument(),
    );
    // The half flips first; the possession event follows it, so the tile is
    // repainted a moment later.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^Touchdown Wolves$/ }),
      ).toBeInTheDocument(),
    );
  });
});

describe("Tracking half-time possession", () => {
  it("asks the setup instead of flipping the current possession", async () => {
    // Ravens received the opening kickoff, so the second half belongs to
    // Wolves — and Wolves still have the ball, so nothing changes. Flipping
    // the current possession would hand it to Ravens, which is the bug.
    routeGets({
      setup: { fhPossession: "home" },
      log: makeLog({ isFirstHalf: false, inPossession: "Wolves" }),
    });
    await renderTrackingReady({ log: makeLog({ inPossession: "Wolves" }) });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Halbzeit" }));
    await user.click(screen.getByRole("button", { name: "Halbzeit starten" }));

    await waitFor(() =>
      expect(screen.getByText("2. Halbzeit")).toBeInTheDocument(),
    );
    expect(apiGetMock).toHaveBeenCalledWith("/api/game/42/setup", {
      deviceId: expect.any(String),
    });
    expect(sentPossessions()).toEqual([]);
    expect(sentWrites()).toEqual([
      {
        events: [{ type: "period", code: "half_time", side: null }],
        client_id: expect.any(String),
      },
    ]);
    expect(
      screen.getByRole("button", { name: /^Touchdown Wolves$/ }),
    ).toBeInTheDocument();
  });

  it("hands the ball over when the kickoff team still has it", async () => {
    // Wolves received the opening kickoff and still have the ball, so the
    // second half belongs to Ravens — the one case where both rules agree,
    // kept so the switch is still written.
    routeGets({
      setup: { fhPossession: "away" },
      log: makeLog({ isFirstHalf: false, inPossession: "Ravens" }),
    });
    await renderTrackingReady({ log: makeLog({ inPossession: "Wolves" }) });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Halbzeit" }));
    await user.click(screen.getByRole("button", { name: "Halbzeit starten" }));

    await waitFor(() => expect(sentPossessions()).toEqual(["home"]));
    expect(
      screen.getByRole("button", { name: /^Touchdown Ravens$/ }),
    ).toBeInTheDocument();
  });

  it("falls back to flipping the current possession without a setup", async () => {
    routeGets({ setup: {}, log: markerLog() });
    await renderTrackingReady();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Halbzeit" }));
    await user.click(screen.getByRole("button", { name: "Halbzeit starten" }));

    await waitFor(() => expect(sentPossessions()).toEqual(["away"]));
  });

  it("falls back when the setup cannot be read", async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === "/api/game/42/setup") {
        return Promise.reject(new ApiError(500, null, "Server weg"));
      }
      if (path === "/api/gamelog/42") {
        return Promise.resolve(markerLog());
      }
      return Promise.resolve(ROSTER);
    });
    await renderTrackingReady();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Halbzeit" }));
    await user.click(screen.getByRole("button", { name: "Halbzeit starten" }));

    await waitFor(() => expect(sentPossessions()).toEqual(["away"]));
    expect(screen.getByText("2. Halbzeit")).toBeInTheDocument();
  });

  it("reads the setup once, when the screen opens", () => {
    routeGets();
    renderTracking();

    expect(apiGetMock).toHaveBeenCalledWith("/api/game/42/setup", {
      deviceId: expect.any(String),
    });
    expect(
      apiGetMock.mock.calls.filter(
        ([path]) => path === "/api/game/42/setup",
      ),
    ).toHaveLength(1);
  });

  it("appends the marker before the ball, each with its own log read", async () => {
    const order: string[] = [];
    apiGetMock.mockImplementation((path: string) => {
      order.push(`GET ${path}`);
      if (path === "/api/game/42/setup") {
        return Promise.resolve({ fhPossession: "home" });
      }
      if (path === "/api/gamelog/42") {
        return Promise.resolve(markerLog());
      }
      return Promise.resolve(ROSTER);
    });
    apiPostMock.mockImplementation((_path: string, body: unknown) => {
      const events = (body as { events: { type: string }[] }).events;
      order.push(`POST ${events[0].type}`);
      return Promise.resolve({ state: {}, cursor: 1 });
    });
    await renderTrackingReady();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Halbzeit" }));
    await user.click(screen.getByRole("button", { name: "Halbzeit starten" }));
    await waitFor(() =>
      expect(screen.getByText("2. Halbzeit")).toBeInTheDocument(),
    );

    // The marker comes first (it flips the half), then the ball; each write
    // reads the log it produced, so the screen never guesses.
    expect(order.slice(order.indexOf("POST period"))).toEqual([
      "POST period",
      "GET /api/gamelog/42",
      "POST possession",
      "GET /api/gamelog/42",
    ]);
  });

  it("does not start the half-time while a possession change is in flight", () => {
    answerPossession(() => new Promise(() => undefined));
    renderTracking();

    fireEvent.click(screen.getByRole("button", { name: /^Wolves/ }));

    expect(screen.getByRole("button", { name: "Halbzeit" })).toBeDisabled();
    expect(sentPossessions()).toEqual(["away"]);
  });

  it("does not start the half-time while an undo is in flight", () => {
    apiDeleteMock.mockReturnValue(new Promise(() => undefined));
    renderTracking({
      log: makeLog({
        inPossession: "Ravens",
        events: [logEvent({ id: 5, sequence: 3, event: "Touchdown" })],
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: /Rückgängig/ }));

    expect(screen.getByRole("button", { name: "Halbzeit" })).toBeDisabled();
  });

  it("keeps undo inert while the half-time is being written", () => {
    apiPostMock.mockReturnValue(new Promise(() => undefined));
    renderTracking({
      log: makeLog({
        inPossession: "Ravens",
        events: [logEvent({ id: 5, sequence: 3, event: "Touchdown" })],
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Halbzeit" }));
    fireEvent.click(screen.getByRole("button", { name: "Halbzeit starten" }));

    const undo = screen.getByRole("button", { name: /Rückgängig/ });
    expect(undo).toBeDisabled();
    fireEvent.click(undo);
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });
});

describe("Tracking confirmation text", () => {
  it("names a penalty and its jersey", () => {
    const events: GameLogEventInput[] = [
      { name: "Strafe", player: 23, input: "Holding Defense" },
    ];
    expect(describeSaved(events)).toBe("Strafe gespeichert · Holding Defense");
  });

  it("names a safety", () => {
    expect(describeSaved([{ name: "Safety (+2)", player: 11 }])).toBe(
      "Safety gespeichert · #11",
    );
  });
});

describe("Tracking confirmation wording", () => {
  it("says what happened even without a payload", () => {
    expect(describeSaved([])).toBe("Eintrag gespeichert");
  });

  it("falls back to the event name for a write it has no phrase for", () => {
    expect(describeSaved([{ name: "Kickoff" }])).toBe("Kickoff gespeichert");
    expect(describeSaved([{ name: "Kickoff", player: 7 }])).toBe(
      "Kickoff gespeichert · #7",
    );
  });
});

describe("Tracking sync state", () => {
  type Runtime = ReturnType<typeof getRuntime>;

  function stubStatus(
    runtime: Runtime,
    state: { pending: number; failed: number; paused: "offline" | "auth" | "device" | null },
  ): void {
    vi.spyOn(runtime.outbox, "pending").mockResolvedValue(
      Array.from({ length: state.pending }, (_, index) => ({
        id: `op-${index}`,
        gameId: 42,
        kind: "event" as const,
        payload: {},
        createdAt: index,
        attempts: 0,
        deviceId: "device-a",
        seq: index + 1,
        failed: false,
        failedReason: null,
        failedAt: null,
      })),
    );
    vi.spyOn(runtime.outbox, "failed").mockResolvedValue([]);
    vi.spyOn(runtime.sync, "counts").mockResolvedValue({
      pending: state.pending,
      failed: state.failed,
    });
    vi.spyOn(runtime.sync, "stateFor").mockReturnValue({
      pending: state.pending,
      failed: state.failed,
      syncing: false,
      paused: state.paused,
    });
  }

  it("names a single unsent entry in the singular", async () => {
    const runtime = getRuntime();
    stubStatus(runtime, { pending: 1, failed: 0, paused: null });

    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onFinalize={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(/1 Eintrag noch nicht übertragen/),
    ).toBeInTheDocument();
  });

  it("counts several unsent entries in the plural", async () => {
    const runtime = getRuntime();
    stubStatus(runtime, { pending: 3, failed: 0, paused: "offline" });

    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onFinalize={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(/3 Einträge noch nicht übertragen/),
    ).toBeInTheDocument();
  });

  it("explains a device lock and offers the retry", async () => {
    const runtime = getRuntime();
    stubStatus(runtime, { pending: 0, failed: 0, paused: "device" });
    const resume = vi.spyOn(runtime.sync, "resume").mockResolvedValue();
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onFinalize={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(
        "Nur lesen – das Spiel läuft auf einem anderen Gerät.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Erneut prüfen" }));

    expect(resume).toHaveBeenCalledWith(42);
  });

  it("says it once: one message for a device lock, not one per place", async () => {
    const runtime = getRuntime();
    stubStatus(runtime, { pending: 0, failed: 0, paused: "device" });
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onFinalize={vi.fn()}
      />,
    );

    await screen.findByText("Nur lesen – das Spiel läuft auf einem anderen Gerät.");
    const main = document.querySelector(".tracking") as HTMLElement;
    const mentions = (main.textContent ?? "").match(/anderen Gerät|anderes Gerät/g) ?? [];
    // The strip says it; the app-bar chip only carries the short state.
    expect(mentions).toHaveLength(1);
  });

  it("shows an offline strip with the waiting entries", async () => {
    const runtime = getRuntime();
    stubStatus(runtime, { pending: 2, failed: 0, paused: "offline" });
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onFinalize={vi.fn()}
      />,
    );

    const strip = await screen.findByRole("status", { name: "Übertragung" });
    expect(strip).toHaveTextContent("Offline");
    expect(strip).toHaveTextContent("2 Einträge noch nicht übertragen");
  });

  it("explains an expired session", async () => {
    const runtime = getRuntime();
    stubStatus(runtime, { pending: 0, failed: 0, paused: "auth" });

    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onFinalize={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("Schreiben gesperrt – bitte neu anmelden."),
    ).toBeInTheDocument();
  });
});

describe("Tracking header and action icons", () => {
  it("keeps the sync chip and the theme switch in the app bar", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onBack={vi.fn()}
        onFinalize={vi.fn()}
      />,
    );

    const header = screen.getByRole("banner");
    const slot = header.querySelector(".appbar-badge");
    expect(slot).not.toBeNull();
    expect(within(slot as HTMLElement).getByText("Synchron")).toBeInTheDocument();
    // One chip in the bar, no full-width row of its own below the header.
    expect(document.querySelector(".app-shell > .syncbar")).toBeNull();
    // The theme choice lives in the account menu; the bar keeps the trigger.
    expect(
      within(header).getByRole("button", { name: "Konto" }),
    ).toBeInTheDocument();
    const back = within(header).getByRole("button", { name: "Zurück" });
    expect(back.textContent).toBe("");
    expect(back).toHaveAttribute("title", "Zurück");
  });

  it("keeps a paused queue's details below the header, not in the bar", async () => {
    const runtime = getRuntime();
    vi.spyOn(runtime.sync, "counts").mockResolvedValue({
      pending: 0,
      failed: 0,
    });
    vi.spyOn(runtime.sync, "stateFor").mockReturnValue({
      pending: 0,
      failed: 0,
      syncing: false,
      paused: "auth",
    });

    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onFinalize={vi.fn()}
      />,
    );

    // The strip under the bar says why (once); the bar keeps the short chip.
    expect(
      await screen.findByText("Schreiben gesperrt – bitte neu anmelden."),
    ).toBeInTheDocument();
    expect(document.querySelector(".app-shell > .syncstrip")).not.toBeNull();
    expect(
      within(screen.getByRole("banner")).getByText("Pausiert · Anmeldung"),
    ).toBeInTheDocument();
  });

  it("names the field and round, with gameday and league as context", () => {
    render(
      <TrackingScreen
        game={GAME}
        gamedayName="Herbsttag"
        initialLog={makeLog({ inPossession: "Ravens" })}
        leagueLabel="Landesliga"
        onFinalize={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Feld 2 · Vorrunde" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Herbsttag · Landesliga")).toBeInTheDocument();
  });

  it("falls back from stage to standing to the field alone", () => {
    expect(trackingTitle(GAME)).toBe("Feld 2 · Vorrunde");
    expect(trackingTitle({ ...GAME, stage: "", standing: "Halbfinale" })).toBe(
      "Feld 2 · Halbfinale",
    );
    expect(trackingTitle({ ...GAME, stage: " ", standing: "" })).toBe("Feld 2");
    expect(trackingSubtitle()).toBeUndefined();
    expect(trackingSubtitle(" ", "")).toBeUndefined();
    expect(trackingSubtitle("Herbsttag")).toBe("Herbsttag");
  });

  it("puts an icon on the touchdown button, every tile and the footer", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({ inPossession: "Ravens" })}
        onFinalize={vi.fn()}
      />,
    );

    const touchdown = screen.getByRole("button", {
      name: /^Touchdown Ravens$/,
    });
    expect(touchdown.querySelector("svg")).not.toBeNull();
    // No tap-count hint: "3 Tipps" read as "3 hints" in German.
    expect(touchdown).toHaveTextContent(/^Touchdown Ravens$/);

    for (const name of [
      "1st Down",
      "Turnover",
      "Interception",
      "Spielzeit",
      "Strafe",
      "Safety",
      "Overtime",
    ]) {
      const tile = screen.getByRole("button", { name });
      expect(tile.querySelector("svg"), name).not.toBeNull();
    }

    expect(
      screen.getByRole("button", { name: "Halbzeit" }).querySelector("svg"),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Spiel beenden" })
        .querySelector("svg"),
    ).not.toBeNull();
  });

  it("uses kind icons in the log and an undo icon on the button", () => {
    render(
      <TrackingScreen
        game={GAME}
        initialLog={makeLog({
          inPossession: "Ravens",
          events: [logEvent({ id: 3, event: "Touchdown", player: 23 })],
        })}
        onFinalize={vi.fn()}
      />,
    );

    const row = document.querySelector(".row");
    expect(row?.querySelector(".ev svg")).not.toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Rückgängig: Touchdown Ravens" })
        .querySelector("svg"),
    ).not.toBeNull();
  });
});

describe("Tracking device lock on open", () => {
  function routeSetup(answer: object): void {
    apiGetMock.mockImplementation((path: string) =>
      path === "/api/game/42/setup"
        ? Promise.resolve(answer)
        : new Promise(() => undefined),
    );
  }

  it("goes read-only as soon as the setup read says another device holds it", async () => {
    routeSetup({ locked_elsewhere: true, can_release_lock: false });
    renderTracking();

    expect(
      await screen.findByText("Nur lesen – das Spiel läuft auf einem anderen Gerät."),
    ).toBeInTheDocument();
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "1st Down" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Spiel übernehmen" })).toBeNull();
    expect(
      screen.getByText("Die Turnierleitung kann die Gerätesperre aufheben."),
    ).toBeInTheDocument();
  });

  it("lets staff take the game over after a confirmation", async () => {
    routeSetup({ locked_elsewhere: true, can_release_lock: true });
    apiDeleteMock.mockResolvedValue(undefined);
    apiPutMock.mockResolvedValue({});
    const resume = vi.spyOn(getRuntime().sync, "resume").mockResolvedValue();
    renderTracking();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Spiel übernehmen" }));
    expect(apiDeleteMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Das andere Gerät kann danach nicht mehr schreiben/),
    ).toBeInTheDocument();
    // The same button asks a second time; there is no separate cancel.
    expect(screen.queryByRole("button", { name: "Abbrechen" })).toBeNull();
    expect(screen.getByRole("button", { name: "Übernehmen" })).toHaveClass("is-armed");
    await user.click(screen.getByRole("button", { name: "Übernehmen" }));

    await waitFor(() => expect(resume).toHaveBeenCalledWith(42));
    expect(apiDeleteMock).toHaveBeenCalledWith("/api/game/42/device");
    expect(apiPutMock).toHaveBeenCalledWith(
      "/api/game/42/setup",
      { device_id: expect.any(String) },
      { deviceId: expect.any(String) },
    );
  });
});

describe("SyncStrip", () => {
  function status(overrides: Partial<SyncStatus> = {}): SyncStatus {
    return {
      pending: 0,
      failed: 0,
      failedOps: [],
      pendingOps: [],
      syncing: false,
      paused: null,
      online: true,
      resume: vi.fn(async () => undefined),
      retry: vi.fn(async () => undefined),
      drop: vi.fn(async () => undefined),
      refresh: vi.fn(),
      ...overrides,
    };
  }

  it("stays out of the way while everything is sent", () => {
    const { container } = render(
      <SyncStrip
        deviceLog={makeLog()}
        drained={false}
        onResume={vi.fn()}
        serverLog={makeLog()}
        status={status()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("confirms a drained queue for a moment", () => {
    render(
      <SyncStrip
        deviceLog={makeLog()}
        drained
        onResume={vi.fn()}
        serverLog={makeLog()}
        status={status()}
      />,
    );
    expect(screen.getByRole("status", { name: "Übertragung" })).toHaveTextContent(
      "✓ Alles gesendet",
    );
  });

  it("names the provisional score while entries are on their way", () => {
    render(
      <SyncStrip
        deviceLog={makeLog()}
        drained={false}
        onResume={vi.fn()}
        serverLog={makeLog()}
        status={status({ pending: 1 })}
      />,
    );
    expect(screen.getByRole("status", { name: "Übertragung" })).toHaveTextContent(
      "Spielstand vorläufig · 1 Eintrag noch nicht übertragen",
    );
  });

  it("says offline even with nothing waiting", () => {
    render(
      <SyncStrip
        deviceLog={makeLog()}
        drained={false}
        onResume={vi.fn()}
        serverLog={makeLog()}
        status={status({ online: false })}
      />,
    );
    expect(screen.getByRole("status", { name: "Übertragung" })).toHaveTextContent(
      "Offline · Einträge werden hier gespeichert",
    );
  });

  it("names the stranded entries after the lock was lost", () => {
    render(
      <SyncStrip
        deviceLog={makeLog({ home: team({ score: 13 }) })}
        drained={false}
        onResume={vi.fn()}
        serverLog={makeLog({ home: team({ score: 7 }) })}
        status={status({ paused: "device", pending: 2 })}
      />,
    );

    const strip = screen.getByRole("status", { name: "Übertragung" });
    expect(strip).toHaveTextContent(
      "2 Einträge nicht übertragen – nicht im offiziellen Spielbericht.",
    );
    expect(strip).toHaveTextContent("13:0");
    expect(strip).toHaveTextContent("nicht offiziell");
  });
});

describe("the try is its own down", () => {
  it("shows the try and its spot instead of a down while the extra point is open", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 7);
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    // the try is snapped from B5 for one point, from B10 for two
    expect(await screen.findByText("Versuch · B5")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+2" }));
    expect(await screen.findByText("Versuch · B10")).toBeInTheDocument();
  });

  it("shows the enforced spot after a penalty during the try", async () => {
    routeGets();
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 7);
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(await screen.findByText("Versuch · B5")).toBeInTheDocument();

    // The log the server answers after the flag: the touchdown plus the
    // five-yard offence penalty. The try repeats from B10.
    answerAppend(
      makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({
            id: 2,
            sequence: 2,
            team: "Ravens",
            event: "Strafe",
            input: "Fehlstart",
            payload: { yardage: -5, nextDown: "repeat" },
          }),
          logEvent({
            id: 1,
            sequence: 1,
            team: "Ravens",
            event: "Touchdown",
            player: 7,
          }),
        ],
      }),
    );
    const dialog = await openSheet(user, /^Strafe$/);
    await user.click(
      await within(dialog).findByRole("button", { name: /^Fehlstart/ }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    expect(await screen.findByText("Versuch · B10")).toBeInTheDocument();
  });

  it("records two points for the defence that scored on the try", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 7);
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    await user.click(
      await screen.findByRole("button", { name: "Gegner +2" }),
    );

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "/api/game/42/events",
        expect.objectContaining({
          events: [
            expect.objectContaining({
              type: "score",
              code: "pat2",
              side: "away",
              payload: expect.objectContaining({ try_defense: true }),
            }),
          ],
        }),
      ),
    );
  });
});

describe("a failed entry during the try", () => {
  it("keeps the try open with the server's message when the +2 for the defence fails", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await openSheet(user, /^Touchdown Ravens$/);
    await pickJersey(user, 23);
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    const defence = await screen.findByRole("button", { name: "Gegner +2" });

    // the write is refused: the prompt must stay and say why
    apiPostMock.mockRejectedValueOnce(new ApiError(500, null, "Server weg"));
    await user.click(defence);

    expect(await screen.findByText("Server weg")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gegner +2" }),
    ).toBeInTheDocument();
  });
});

describe("a scoring play", () => {
  it("records the play and its touchdown, then asks for the try", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    // a remembered thrower: the pass sheet is ready without a second pick
    globalThis.localStorage.setItem("scorecard:v2:qb:42:home", "7");
    renderTracking();
    const user = userEvent.setup();

    const sheet = await openPlay(user, "Pass");
    await wizardNext(user); // type → result
    await user.click(within(sheet).getByRole("button", { name: "Touchdown" }));
    await wizardNext(user); // result → qb + receiver
    await user.click(
      await within(sheet).findByRole("button", { name: "Trikot 23, Schulz" }),
    );
    // A touchdown has no tackler: the field position is the last step.
    await wizardNext(user); // receiver → field position
    await user.click(
      within(sheet).getByRole("button", { name: "Spielzug speichern" }),
    );

    // one submission: the play row and the touchdown row share a sequence
    await waitFor(() => expect(apiPostMock).toHaveBeenCalled());
    const bodies = apiPostMock.mock.calls.map(
      (call) =>
        call[1] as {
          events?: { type: string; code?: string; player?: number }[];
        },
    );
    const append = bodies.find((body) =>
      body.events?.some((event) => event.code === "pass"),
    );
    expect(append?.events?.map((event) => event.code)).toEqual([
      "pass",
      "touchdown",
    ]);
    expect(append?.events?.[1].player).toBe(23);
    expect(await screen.findByText("Versuch · B5")).toBeInTheDocument();
  });
});

describe("plays that change hands", () => {
  it("writes an interception for the defence and moves the ball", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    globalThis.localStorage.setItem("scorecard:v2:qb:42:home", "7");
    renderTracking();
    const user = userEvent.setup();

    const sheet = await openPlay(user, "Interception");
    await wizardNext(user); // type → result
    await user.click(within(sheet).getByRole("button", { name: "Interception" }));
    await wizardNext(user, 2); // result → qb → interception
    await user.click(within(sheet).getByRole("button", { name: "Defense 11, Wolf" }));
    await user.click(
      within(sheet).getByRole("button", { name: "Spielzug speichern" }),
    );

    // The play stays with the offence; the interception is credited to Wolves.
    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "/api/game/42/events",
        expect.objectContaining({
          events: [
            expect.objectContaining({ type: "possession", code: "interception", side: "away" }),
          ],
        }),
      ),
    );
    await waitFor(() => expect(sentPossessions()).toEqual(["away"]));
  });

  it("asks the try for the defence after a pick six", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    globalThis.localStorage.setItem("scorecard:v2:qb:42:home", "7");
    renderTracking();
    const user = userEvent.setup();

    const sheet = await openPlay(user, "Interception");
    await wizardNext(user);
    await user.click(within(sheet).getByRole("button", { name: "Interception" }));
    await wizardNext(user, 2);
    await user.click(within(sheet).getByRole("button", { name: "Defense 11, Wolf" }));
    await user.click(
      within(sheet).getByRole("button", { name: "Pick six (Touchdown)" }),
    );
    await user.click(
      within(sheet).getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(
      await screen.findByRole("group", { name: "Extrapunkt Wolves" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Versuch · B5")).toBeInTheDocument();
  });

  it("scores a safety for the defence", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    const sheet = await openPlay(user, "Run");
    await wizardNext(user); // type → result
    await user.click(within(sheet).getByRole("button", { name: "Safety" }));
    await wizardNext(user); // result → player
    await user.click(
      await within(sheet).findByRole("button", { name: "Trikot 23, Schulz" }),
    );
    await wizardNext(user); // player → defender
    await wizardNext(user); // defender → field position
    await user.click(
      within(sheet).getByRole("button", { name: "Spielzug speichern" }),
    );

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "/api/game/42/events",
        expect.objectContaining({
          events: [
            expect.objectContaining({
              type: "score",
              code: "safety",
              side: "away",
              payload: expect.objectContaining({ points: 2, defense: true }),
            }),
          ],
        }),
      ),
    );
    await waitFor(() => expect(sentPossessions()).toEqual(["away"]));
  });
});

describe("editing a scoring play's group", () => {
  it("re-sends the touchdown when the play row is corrected", async () => {
    const original = makeLog({
      inPossession: "Ravens",
      events: [
        logEvent({
          id: 10,
          // its own event, the group of the play below
          seq: 10,
          sequence: 9,
          event: "Touchdown",
          team: "Ravens",
          player: 23,
          half: 1,
        }),
        logEvent({
          id: 9,
          seq: 9,
          sequence: 9,
          event: "Pass",
          team: "Ravens",
          player: 23,
          input: "8 Yards · QB #7",
          half: 1,
          payload: { yards: 8, complete: true, qb: 7 },
        }),
      ],
    });
    routeGets({ log: original });
    answerAppend(original);
    renderTracking({ log: original });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ändern: Touchdown Ravens" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Touchdown ändern" });
    await user.click(
      within(dialog).getByRole("button", { name: "Änderung speichern" }),
    );

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    // The correction names the group's sequence, so the group is removed:
    // sending only the corrected touchdown would delete the play with it.
    const body = apiPostMock.mock.calls[0]?.[1] as {
      events: { code?: string; player?: number; payload?: { yards?: number } }[];
    };
    expect(body.events.map((event) => event.code)).toEqual(["pass", "touchdown"]);
    expect(body.events[0].payload?.yards).toBe(8);
    expect(body.events[1].player).toBe(23);
  });
});

describe("undoing a scoring play", () => {
  it("puts the ball back when the play row is undone, not only its touchdown", async () => {
    const original = makeLog({
      inPossession: "Ravens",
      events: [
        logEvent({
          id: 10,
          // its own event, the group of the play below
          seq: 10,
          sequence: 9,
          event: "Touchdown",
          team: "Ravens",
          player: 23,
          half: 1,
        }),
        logEvent({
          id: 9,
          seq: 9,
          sequence: 9,
          event: "Pass",
          team: "Ravens",
          player: 23,
          half: 1,
          payload: { yards: 8, complete: true, qb: 7 },
        }),
      ],
    });
    routeGets({ log: original });
    answerAppend(original);
    renderTracking({ log: original });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /^Rückgängig: Pass/ }),
    );

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    const bodies = apiPostMock.mock.calls.map(
      (call) => call[1] as { events: { type: string; code?: string; payload?: unknown }[] },
    );
    expect(bodies[0].events[0]).toMatchObject({
      type: "correction",
      code: "undo",
      // the play row's own event (9), not its sibling's (10)
      payload: { undo_of: 9 },
    });
    // the ball comes back with the group, though the play row carried no flip
    expect(bodies[1].events[0]).toMatchObject({
      type: "possession",
      code: "home",
    });
  });
});

describe("a failed timeout", () => {
  it("says so instead of pretending the timeout landed", async () => {
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    apiPostMock.mockRejectedValueOnce(new ApiError(500, null, "Server weg"));
    await user.click(screen.getByRole("button", { name: "Auszeit Ravens" }));
    await user.click(screen.getByRole("button", { name: "Auszeit nehmen" }));

    expect(await screen.findByText("Server weg")).toBeInTheDocument();
    // the budget is unchanged: nothing was recorded
    expect(
      screen.getByRole("button", { name: "Auszeit Ravens" }),
    ).toHaveTextContent("●●");
  });
});

describe("the team timeout on a game that is over", () => {
  it("is disabled, like the rest of the composer", () => {
    renderTracking({
      game: { ...GAME, status: "beendet" },
      log: makeLog({ inPossession: "Ravens" }),
    });

    expect(
      screen.getByRole("button", { name: "Auszeit Ravens" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Auszeit Wolves" })).toBeDisabled();
  });
});

describe("a side without a name", () => {
  it("offers no timeout for a team the log cannot name", () => {
    // A bracket placeholder has no team yet: there is nobody to charge it to.
    renderTracking({
      log: makeLog({
        inPossession: "Ravens",
        away: team({ id: 2, name: null }),
      }),
    });

    expect(
      screen.getByRole("button", { name: "Auszeit Ravens" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Auszeit $/ })).toBeNull();
    // the unnamed side's possession button is disabled, so no timeout either
    expect(
      screen.getByRole("button", { name: /^–, 0 Punkte/ }),
    ).toBeDisabled();
  });
});

describe("a team's row", () => {
  it("puts possession and its timeout side by side, each a touch target", () => {
    renderTracking({ log: makeLog({ inPossession: "Ravens" }) });

    const board = screen.getByLabelText("Spielstand");
    const rows = Array.from(board.querySelectorAll<HTMLElement>(".team"));
    expect(rows).toHaveLength(2);

    const [home] = rows;
    const possession = within(home).getByRole("button", { name: /^Ravens, / });
    const timeout = within(home).getByRole("button", {
      name: "Auszeit Ravens",
    });
    expect(possession).toHaveTextContent("Ravens");
    expect(timeout).toHaveTextContent("●●");
    // the name has its own element so a long one can ellipsise in place
    expect(possession.querySelector(".tname")).toHaveTextContent("Ravens");
    // the keyboard hint survives the extra markup
    expect(possession.querySelector('kbd[data-key="B"]')).not.toBeNull();
  });

  it("keeps the used state on the timeout", () => {
    renderTracking({
      log: makeLog({
        inPossession: "Ravens",
        events: [
          logEvent({ id: 1, event: "Auszeit", team: "Ravens", half: 1 }),
          logEvent({ id: 2, event: "Auszeit", team: "Ravens", half: 1 }),
        ],
      }),
    });

    const timeout = screen.getByRole("button", { name: "Auszeit Ravens" });
    expect(timeout).toHaveClass("is-used");
    expect(timeout).toHaveTextContent("○○");
  });
});

describe("the team timeout during the half-time", () => {
  it("waits with the rest of the composer", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    renderTracking();
    const user = userEvent.setup();

    // the half-time write is in flight: every entry waits for it
    apiPostMock.mockImplementation(() => new Promise(() => undefined));
    await user.click(screen.getByRole("button", { name: "Halbzeit" }));
    await user.click(screen.getByRole("button", { name: "Halbzeit starten" }));

    expect(
      screen.getByRole("button", { name: "Auszeit Ravens" }),
    ).toBeDisabled();
  });
});

describe("a possession change in flight", () => {
  it("holds both timeouts until the ball settles", async () => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    answerPossession(() => new Promise(() => undefined));
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^Wolves, / }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Auszeit Ravens" }),
      ).toBeDisabled(),
    );
    expect(
      screen.getByRole("button", { name: "Auszeit Wolves" }),
    ).toBeDisabled();
  });
});

describe("Tracking pre-game quarterback", () => {
  it("seeds the setup's quarterbacks into this device", async () => {
    routeGets({ setup: { qbHome: 7, qbAway: 11 } });
    renderTracking();

    await waitFor(() => {
      expect(
        globalThis.localStorage.getItem("scorecard:v2:qb:42:home"),
      ).toBe("7");
      expect(
        globalThis.localStorage.getItem("scorecard:v2:qb:42:away"),
      ).toBe("11");
    });
  });

  it("keeps a quarterback this device already changed", async () => {
    globalThis.localStorage.setItem("scorecard:v2:qb:42:home", "23");
    routeGets({ setup: { qbHome: 7 } });
    renderTracking();

    await waitFor(() =>
      expect(screen.getByText(/1st & M/)).toBeInTheDocument(),
    );
    expect(
      globalThis.localStorage.getItem("scorecard:v2:qb:42:home"),
    ).toBe("23");
  });
});

describe("Tracking key shortcuts", () => {
  function desktopKeys(): void {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(min-width: 1280px)",
        media: query,
      })),
    );
  }

  it("opens every board sheet from its digit key", async () => {
    desktopKeys();
    routeGets();
    renderTracking();

    for (const [key, name] of [
      ["1", "Spielzug · Ravens"],
      ["2", "Spielzug · Ravens"],
      ["3", "Spielzug · Ravens"],
      ["4", "Spielzug · Ravens"],
      ["5", "Strafe"],
      ["6", "Spielzeit"],
      ["7", "Mehr"],
      ["0", "Safety"],
    ] as const) {
      fireEvent.keyDown(window, { key });
      const dialog = await screen.findByRole("dialog", { name });
      fireEvent.click(within(dialog).getByRole("button", { name: "Schließen" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
  });

  it("records a turnover from the 9 key", async () => {
    desktopKeys();
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();

    fireEvent.keyDown(window, { key: "9" });

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        "/api/game/42/events",
        expect.objectContaining({
          events: [
            expect.objectContaining({
              type: "possession",
              code: "turnover",
              side: "home",
            }),
          ],
        }),
      ),
    );
  });
});

describe("Tracking Mehr menu", () => {
  it.each([
    ["Turnover", "Turnover"],
    ["1st Down", "First Down"],
    ["Safety", "Safety"],
    ["Feldposition", "Feldposition · Ravens"],
    ["Touchdown (Kurzform)", "Wer hat gepunktet?"],
  ])("opens %s", async (item, title) => {
    apiGetMock.mockResolvedValue(ROSTER);
    answerAppend(makeLog({ inPossession: "Ravens" }));
    renderTracking();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Mehr" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Mehr" })).getByRole(
        "button",
        { name: item },
      ),
    );

    expect(
      await screen.findByRole("dialog", { name: title }),
    ).toBeInTheDocument();
  });
});

describe("editing a row in the shared bucket", () => {
  it("re-sends only that row, never the other sequence-0 rows", async () => {
    // Penalties, clocks and first downs all sit in group 0. Correcting one of
    // them must not resurrect or duplicate its neighbours.
    const original = makeLog({
      inPossession: "Ravens",
      events: [
        logEvent({
          id: 11,
          seq: 11,
          sequence: 0,
          event: "Strafe",
          team: "Ravens",
          input: "Holding Defense",
          half: 1,
          payload: { yardage: 10, nextDown: "first_down" },
        }),
        logEvent({
          id: 10,
          seq: 10,
          sequence: 0,
          event: "Auszeit",
          team: "Ravens",
          input: "08:12",
          half: 1,
        }),
      ],
    });
    routeGets({ log: original });
    answerAppend(original);
    renderTracking({ log: original });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /^Ändern: Strafe/ }),
    );
    const dialog = screen.getByRole("dialog", { name: "Strafe ändern" });
    await user.click(
      within(dialog).getByRole("button", { name: "Änderung speichern" }),
    );

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    const body = apiPostMock.mock.calls[0]?.[1] as {
      events: { type: string; code?: string }[];
    };
    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("penalty");
  });
});
