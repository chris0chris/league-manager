import { describe, expect, it } from "vitest";

import type { GameLog, GameLogEvent, GameLogTeam } from "../api/types";
import type { StoredOp } from "../offline/types";
import { envelopesOf, replayOps } from "./optimistic";

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

function event(overrides: Partial<GameLogEvent> = {}): GameLogEvent {
  return {
    id: 10,
    sequence: 1,
    seq: 1,
    team: "Ravens",
    event: "Touchdown",
    player: 7,
    input: null,
    half: 1,
    cop: false,
    isDeleted: false,
    time: "2026-10-26T12:00:00Z",
    ...overrides,
  };
}

function op(overrides: Partial<StoredOp> = {}): StoredOp {
  return {
    id: `op-${overrides.seq ?? 1}`,
    gameId: 42,
    kind: "event",
    payload: { events: [] },
    createdAt: 1_000,
    attempts: 0,
    deviceId: "device-a",
    seq: 1,
    failed: false,
    failedReason: null,
    failedAt: null,
    ...overrides,
  };
}

/** A queued play: one submission of envelopes. */
function play(
  events: unknown[],
  overrides: Partial<StoredOp> = {},
): StoredOp {
  return op({ payload: { events }, ...overrides });
}

describe("replayOps", () => {
  it("adds a touchdown and its conversion to the server score", () => {
    const base = log({
      home: team({ score: 7, firsthalf: { score: 7, entries: [] } }),
    });

    const { log: shown } = replayOps(base, [
      play([
        { type: "score", code: "touchdown", side: "home", player: 23, period: 1 },
        { type: "score", code: "pat1", side: "home", player: 23, period: 1 },
      ]),
    ]);

    expect(shown.home.score).toBe(14);
    expect(shown.home.firsthalf.score).toBe(14);
    expect(shown.away.score).toBe(0);
    // Newest first, like the server: a conversion has the higher pk.
    expect(shown.events?.slice(0, 2).map((entry) => entry.event)).toEqual([
      "1-Extra-Punkt",
      "Touchdown",
    ]);
    expect(shown.events?.[0].id).toBeLessThan(0);
    // The base is never mutated.
    expect(base.home.score).toBe(7);
    expect(base.events).toEqual([]);
  });

  it("scores a touchdown without a jersey for the team, like the server", () => {
    const { log: shown } = replayOps(log(), [
      play([{ type: "score", code: "touchdown", side: "home", period: 1 }]),
    ]);

    expect(shown.home.score).toBe(6);
    expect(shown.events?.[0].player).toBeNull();
  });

  it("mirrors the server's jersey coercion without losing the points", () => {
    // The server truncates a decimal string and drops anything outside
    // 0..32767 to `None`. The *number* is dropped; the team still scores.
    const { log: shown } = replayOps(log(), [
      play([
        { type: "score", code: "touchdown", side: "home", player: 51.85, period: 1 },
        { type: "score", code: "touchdown", side: "home", player: 40000, period: 1 },
        { type: "score", code: "touchdown", side: "home", player: -1, period: 1 },
        { type: "score", code: "touchdown", side: "home", player: "23", period: 1 },
      ]),
    ]);

    // 51.85 -> 51, "23" -> 23, 40000 and -1 drop the number but keep 6 points
    // each: a score belongs to the team (IFAF R 8-1-1).
    expect(shown.home.score).toBe(24);
    expect((shown.events ?? []).map((entry) => entry.player)).toEqual([
      23,
      null,
      null,
      51,
    ]);
  });

  it("marks a pending correction's whole group deleted and takes its points back", () => {
    const base = log({
      events: [
        event({ id: 11, sequence: 2, seq: 2, event: "1-Extra-Punkt", player: 23 }),
        event({ id: 10, sequence: 2, seq: 2, player: 23 }),
      ],
      home: team({ score: 7, firsthalf: { score: 7, entries: [] } }),
    });

    const { log: shown } = replayOps(base, [
      play(
        [{ type: "correction", code: "undo", payload: { undo_of: 2 } }],
        { kind: "correction" },
      ),
    ]);

    expect(shown.events?.every((entry) => entry.isDeleted === true)).toBe(true);
    expect(shown.home.score).toBe(0);
  });

  it("does not take a point back when a missed try is corrected", () => {
    // The miss is on the board as a row worth nothing (the server stored value
    // 0); undoing it must leave the six points of the touchdown alone.
    const base = log({
      events: [
        event({
          id: 11,
          sequence: 2,
          seq: 2,
          event: "1-Extra-Punkt",
          player: 23,
          input: "nicht verwandelt",
          payload: { missed: true },
        }),
        event({ id: 10, sequence: 1, seq: 1, player: 23 }),
      ],
      home: team({ score: 6, firsthalf: { score: 6, entries: [] } }),
    });

    const { log: shown } = replayOps(base, [
      play(
        [{ type: "correction", code: "undo", payload: { undo_of: 2 } }],
        { kind: "correction" },
      ),
    ]);

    expect(shown.home.score).toBe(6);
    expect(shown.events?.find((entry) => entry.seq === 2)?.isDeleted).toBe(true);
  });

  it("ignores a correction whose target is not in the base log", () => {
    const base = log({ home: team({ score: 6 }) });

    const { log: shown } = replayOps(base, [
      play(
        [{ type: "correction", code: "undo", payload: { undo_of: 99 } }],
        { kind: "correction" },
      ),
    ]);

    expect(shown.home.score).toBe(6);
    expect(shown.events).toEqual([]);
  });

  it("applies the last queued possession and the half-time marker", () => {
    const { log: shown } = replayOps(log({ isFirstHalf: true }), [
      op({ seq: 1, kind: "possession", payload: { events: [{ type: "possession", code: "away", side: "away" }] } }),
      op({ seq: 2, kind: "halftime", payload: { events: [{ type: "period", code: "half_time", side: null }] } }),
    ]);

    expect(shown.inPossession).toBe("Wolves");
    expect(shown.isFirstHalf).toBe(false);
    expect(shown.events?.[0].event).toBe("2. Halbzeit gestartet");
  });

  it("maps every synthetic row back to its op for a local undo", () => {
    const { log: shown, opByEventId } = replayOps(log(), [
      play(
        [
          { type: "score", code: "touchdown", side: "home", player: 7, period: 1 },
          { type: "score", code: "pat2", side: "home", player: 7, period: 1 },
        ],
        { id: "queued-1" },
      ),
    ]);

    for (const entry of shown.events ?? []) {
      expect(opByEventId.get(entry.id)).toBe("queued-1");
    }
  });

  it("returns the base unchanged when the server sent no events list", () => {
    const base: GameLog = {
      gameId: 42,
      isFirstHalf: true,
      home: team(),
      away: team(),
    };

    const { log: shown } = replayOps(base, [
      play([{ type: "series", code: "first_down", side: "home", period: 1 }]),
    ]);

    expect(shown).toBe(base);
  });
});

describe("replayOps edge payloads", () => {
  it("drops a jersey that is not a finite number but keeps the points", () => {
    const { log: shown } = replayOps(log(), [
      play([
        { type: "score", code: "touchdown", side: "home", player: "keine", period: 1 },
      ]),
    ]);

    expect(shown.home.score).toBe(6);
    expect(shown.events?.[0].player).toBeNull();
  });

  it("scores nothing for a code it does not know", () => {
    const { log: shown } = replayOps(log(), [
      play([{ type: "score", code: "tor", side: "home", player: 5, period: 1 }]),
    ]);

    expect(shown.home.score).toBe(0);
    expect(shown.events).toEqual([]);
  });

  it("adds no score when the envelope names no side", () => {
    const { log: shown } = replayOps(log(), [
      play([{ type: "score", code: "touchdown", player: 23, period: 2 }]),
    ]);

    expect(shown.home.score).toBe(0);
    expect(shown.away.score).toBe(0);
    // The row is still shown, credited to no team.
    expect(shown.events?.[0].team).toBeNull();
    expect(shown.events?.[0].half).toBe(2);
  });

  it("gives the ball to either team and clears it", () => {
    const toWolves = replayOps(log(), [
      op({ kind: "possession", payload: { events: [{ type: "possession", code: "away", side: "away" }] } }),
    ]);
    expect(toWolves.log.inPossession).toBe("Wolves");

    const cleared = replayOps(log(), [
      op({ kind: "possession", payload: { events: [{ type: "possession", code: "" }] } }),
    ]);
    expect(cleared.log.inPossession).toBeNull();
  });

  it("replays a legacy delete by team_log_id and skips rows that are already gone", () => {
    const base = log({
      home: team({
        score: 6,
        firsthalf: { score: 6, entries: [] },
      }),
      events: [
        event({ id: 10, isDeleted: true, player: 7 }),
        event({ id: 11, sequence: 2, seq: 2, event: "Touchdown", player: 7 }),
      ],
    });
    const { log: shown } = replayOps(base, [
      op({ kind: "delete", payload: { team_log_id: 10 } }),
      op({ seq: 2, kind: "delete", payload: { team_log_id: 11 } }),
    ]);

    const rows = shown.events ?? [];
    expect(rows.find((row) => row.id === 10)?.isDeleted).toBe(true);
    expect(rows.find((row) => row.id === 11)?.isDeleted).toBe(true);
    // Only the live row's touchdown came back off the score.
    expect(shown.home.score).toBe(0);
  });

  it("ignores a delete for a row of no team", () => {
    const base = log({
      events: [
        event({ id: 5, team: null, sequence: 0, seq: null, event: "Spiel gestartet" }),
      ],
    });
    const { log: shown } = replayOps(base, [
      op({ kind: "delete", payload: { team_log_id: 5 } }),
    ]);

    expect(shown.events?.[0].isDeleted).toBe(true);
    expect(shown.home.score).toBe(0);
    expect(shown.away.score).toBe(0);
  });

  it("does not replay a half-time into the second half twice", () => {
    const base = log({ isFirstHalf: false });
    const { log: shown } = replayOps(base, [
      op({ kind: "halftime", payload: { events: [{ type: "period", code: "half_time" }] } }),
    ]);

    expect(shown.isFirstHalf).toBe(false);
    expect(shown.events).toEqual([]);
  });

  it("replays a first-half half-time with the marker row", () => {
    const { log: shown, opByEventId } = replayOps(log(), [
      op({ kind: "halftime", payload: { events: [{ type: "period", code: "half_time" }] } }),
    ]);

    expect(shown.isFirstHalf).toBe(false);
    expect(shown.events?.[0].event).toBe("2. Halbzeit gestartet");
    expect(opByEventId.size).toBe(1);
  });

  it("translates a queue entry written before slice 2", () => {
    // A tab that was open across the update still holds the old play shape; a
    // reload must not lose those taps or show them differently.
    const { log: shown } = replayOps(log(), [
      op({
        payload: {
          gameId: 42,
          team: "Ravens",
          half: 1,
          event: [{ name: "Touchdown", player: 23 }],
        },
      }),
    ]);

    expect(shown.home.score).toBe(6);
    expect(shown.events?.[0].event).toBe("Touchdown");
  });

  it("translates a legacy possession entry (team name) with the log", () => {
    const { log: shown } = replayOps(log(), [
      op({ kind: "possession", payload: { team: "Wolves" } }),
    ]);

    expect(shown.inPossession).toBe("Wolves");
  });
});

describe("replayOps team resolution", () => {
  it("credits the away team and ignores a side-free play", () => {
    const { log: shown } = replayOps(log(), [
      play(
        [{ type: "score", code: "touchdown", side: "away", player: 11, period: 2 }],
        { seq: 1 },
      ),
      play(
        [{ type: "score", code: "touchdown", player: 12, period: 1 }],
        { seq: 2, id: "op-unbekannt" },
      ),
    ]);

    expect(shown.away.score).toBe(6);
    expect(shown.away.secondhalf.score).toBe(6);
    expect(shown.home.score).toBe(0);
    expect(shown.events).toHaveLength(2);
  });
});


describe("replayOps — legacy queue shapes", () => {
  it("translates a legacy half-time op (empty payload)", () => {
    const { log: shown } = replayOps(log({ isFirstHalf: true }), [
      op({ kind: "halftime", payload: {} }),
    ]);

    expect(shown.isFirstHalf).toBe(false);
    expect(shown.events?.[0].event).toBe("2. Halbzeit gestartet");
  });

  it("translates a legacy correction op naming a target seq", () => {
    const base = log({
      events: [event({ id: 11, sequence: 2, seq: 2, player: 23 })],
      home: team({ score: 6 }),
    });

    const { log: shown } = replayOps(base, [
      op({ kind: "correction", payload: { undo_of: 2 } }),
    ]);

    expect(shown.events?.[0].isDeleted).toBe(true);
    expect(shown.home.score).toBe(0);
  });

  it("ignores a legacy correction op without a target", () => {
    const base = log({ home: team({ score: 6 }) });

    const { log: shown } = replayOps(base, [
      op({ kind: "correction", payload: {} }),
    ]);

    expect(shown.home.score).toBe(6);
    expect(shown.events).toEqual([]);
  });

  it("cannot translate a legacy play whose team is not in this log", () => {
    const { log: shown } = replayOps(log(), [
      op({
        payload: { team: "Fremde", half: 1, event: [{ name: "Touchdown" }] },
      }),
    ]);

    expect(shown.events).toEqual([]);
    expect(shown.home.score).toBe(0);
  });

  it("cannot translate a legacy possession of a team not in this log", () => {
    const { log: shown } = replayOps(log(), [
      op({ kind: "possession", payload: { team: "Fremde" } }),
    ]);

    expect(shown.inPossession).toBe("Ravens");
  });
});

describe("replayOps — a queued penalty and a correction of one", () => {
  it("shows the penalty's code as its detail", () => {
    const { log: shown } = replayOps(log(), [
      play([
        {
          type: "penalty",
          code: "Holding Defense",
          side: "home",
          player: 23,
          period: 1,
        },
      ]),
    ]);

    expect(shown.events?.[0]).toMatchObject({
      event: "Strafe",
      input: "Holding Defense",
      player: 23,
      sequence: 0,
    });
  });

  it("ignores a correction without a numeric target", () => {
    const base = log({ home: team({ score: 6 }) });

    const { log: shown } = replayOps(base, [
      play([{ type: "correction", code: "undo", payload: {} }], {
        kind: "correction",
      }),
    ]);

    expect(shown.home.score).toBe(6);
  });

  it("skips rows that are already deleted and rows of another group", () => {
    const base = log({
      events: [
        event({ id: 11, sequence: 2, seq: 2, isDeleted: true, player: 23 }),
        event({ id: 12, sequence: 3, seq: 3, player: 23 }),
      ],
      home: team({ score: 6 }),
    });

    const { log: shown } = replayOps(base, [
      play([{ type: "correction", code: "undo", payload: { undo_of: 2 } }], {
        kind: "correction",
      }),
    ]);

    // The already-deleted row stays deleted and is not subtracted twice; the
    // row of another group is untouched.
    expect(shown.events?.find((row) => row.id === 11)?.isDeleted).toBe(true);
    expect(shown.events?.find((row) => row.id === 12)?.isDeleted).toBe(false);
    expect(shown.home.score).toBe(6);
  });

  it("takes the points back from a scoring row without a jersey", () => {
    const base = log({
      events: [event({ id: 10, sequence: 1, seq: 1, player: null })],
      home: team({ score: 6 }),
    });

    const { log: shown } = replayOps(base, [
      play([{ type: "correction", code: "undo", payload: { undo_of: 1 } }], {
        kind: "correction",
      }),
    ]);

    expect(shown.home.score).toBe(0);
    expect(shown.events?.[0].isDeleted).toBe(true);
  });

  it("marks a team-less row deleted without touching a score", () => {
    const base = log({
      events: [
        event({ id: 9, sequence: 0, seq: 9, team: null, event: "Spiel gestartet" }),
      ],
    });

    const { log: shown } = replayOps(base, [
      play([{ type: "correction", code: "undo", payload: { undo_of: 9 } }], {
        kind: "correction",
      }),
    ]);

    expect(shown.events?.[0].isDeleted).toBe(true);
    expect(shown.home.score).toBe(0);
    expect(shown.away.score).toBe(0);
  });
});


describe("replayOps — the remaining queue shapes", () => {
  it("translates a legacy play from the second half", () => {
    const { log: shown } = replayOps(log(), [
      op({
        payload: {
          team: "Wolves",
          half: 2,
          event: [{ name: "Touchdown", player: 11 }],
        },
      }),
    ]);

    expect(shown.away.secondhalf.score).toBe(6);
    expect(shown.events?.[0].half).toBe(2);
  });

  it("cannot translate an op kind it does not know", () => {
    // A row of some future/removed kind must vanish from the optimistic view
    // instead of being guessed (the transport refuses it loudly).
    expect(envelopesOf(op({ kind: "delete", payload: {} }), log())).toBeNull();
  });

  it("deletes a legacy scoring group by sequence", () => {
    const base = log({
      events: [
        event({ id: 11, sequence: 2, seq: 2, event: "1-Extra-Punkt", player: 23 }),
        event({ id: 10, sequence: 2, seq: 2, player: 23 }),
      ],
      home: team({ score: 7, firsthalf: { score: 7, entries: [] } }),
    });

    const { log: shown } = replayOps(base, [
      op({ kind: "delete", payload: { sequence: 2 } }),
    ]);

    // Both rows of the group are gone and the group's points come back off.
    expect(shown.events?.every((row) => row.isDeleted)).toBe(true);
    expect(shown.home.score).toBe(0);
  });

  it("leaves a penalty without a name without a detail", () => {
    const { log: shown } = replayOps(log(), [
      play([{ type: "penalty", side: "home", period: 1 }]),
    ]);

    expect(shown.events?.[0]).toMatchObject({ event: "Strafe", input: null });
  });

  it("shows the clock's input", () => {
    const { log: shown } = replayOps(log(), [
      play([
        {
          type: "time",
          code: "clock",
          side: "home",
          period: 2,
          payload: { input: "12:34" },
        },
      ]),
    ]);

    expect(shown.events?.[0]).toMatchObject({
      event: "Spielzeit",
      input: "12:34",
      half: 2,
    });
  });

  it("takes nothing off the score for a non-scoring row's correction", () => {
    const base = log({
      events: [
        event({ id: 12, sequence: 0, seq: 12, event: "Strafe", player: 23 }),
      ],
    });

    const { log: shown } = replayOps(base, [
      play([{ type: "correction", code: "undo", payload: { undo_of: 12 } }], {
        kind: "correction",
      }),
    ]);

    expect(shown.events?.[0].isDeleted).toBe(true);
    expect(shown.home.score).toBe(0);
  });
});

describe("overtime entries", () => {
  it("stay in the second half's block of the log", () => {
    const { log: shown } = replayOps(log(), [
      play([{ type: "score", code: "touchdown", side: "home", period: 3 }]),
    ]);

    // the row is grouped with the second half, so every reader keeps 1/2;
    // the server stores period 3 on the event itself
    expect(shown.events?.[0].half).toBe(2);
    expect(shown.home.score).toBe(6);
  });
});

describe("envelopes without a period", () => {
  it("fall back to the first half instead of dropping the entry", () => {
    // A possession or correction op carries no period; the row still belongs
    // to the half the screen is in rather than to none.
    const { log: shown } = replayOps(log(), [
      // an envelope from a client that did not send `period`
      play([{ type: "score", code: "touchdown", side: "home" }]),
    ]);

    expect(shown.events?.length).toBe(1);
    expect(shown.events?.[0].half).toBe(1);
    expect(shown.home.score).toBe(6);
  });

  it("read a legacy op's missing half as the first half", () => {
    const ops = envelopesOf(
      {
        kind: "event",
        payload: {
          team: "Ravens",
          // a queued write from before the half field existed
          event: [{ name: "Touchdown", player: 7 }],
        },
      },
      log(),
    );

    expect(ops).not.toBeNull();
    expect(ops?.every((envelope) => envelope.period === 1)).toBe(true);
  });
});
