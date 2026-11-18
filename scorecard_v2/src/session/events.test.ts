import { describe, expect, it } from "vitest";

import type { GameLog, GameLogTeam } from "../api/types";
import {
  coercePlayer,
  correctionEnvelope,
  displayOf,
  envelopesForWrite,
  eventOfRow,
  halftimeEnvelope,
  possessionEnvelope,
  sideOfName,
} from "./events";

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

const LOG: GameLog = {
  gameId: 42,
  isFirstHalf: true,
  home: team(),
  away: team({ id: 2, name: "Wolves" }),
};

function write(
  teamName: string,
  events: {
    name: string;
    player?: number;
    input?: string;
    payload?: Record<string, unknown>;
  }[],
  half: 1 | 2 = 1,
) {
  return { gameId: 42, team: teamName, half, event: events };
}

describe("envelopesForWrite", () => {
  // The table lives in gameevents/service/legacy.py; these are the same rows.
  it("translates every play the sheets can submit", () => {
    const envelopes = envelopesForWrite(
      write("Ravens", [
        { name: "Touchdown", player: 23 },
        { name: "1-Extra-Punkt", player: 23 },
        { name: "2-Extra-Punkte", player: 23 },
        { name: "Overtime", player: 7 },
        { name: "Safety (+1)", player: 11 },
        { name: "Safety (+2)", player: 11 },
        { name: "Turnover" },
        { name: "Interception", player: 11 },
        { name: "First Down", player: 4 },
        { name: "Strafe", input: "Holding Defense" },
        { name: "Spielzeit", input: "12:34" },
        { name: "Auszeit", input: "3:05" },
      ], 2),
      LOG,
    );

    expect(envelopes).toEqual([
      { type: "score", code: "touchdown", side: "home", player: 23, period: 2 },
      { type: "score", code: "pat1", side: "home", player: 23, period: 2 },
      { type: "score", code: "pat2", side: "home", player: 23, period: 2 },
      { type: "score", code: "overtime", side: "home", player: 7, period: 2 },
      {
        type: "score",
        code: "safety",
        side: "home",
        player: 11,
        period: 2,
        payload: { points: 1 },
      },
      {
        type: "score",
        code: "safety",
        side: "home",
        player: 11,
        period: 2,
        payload: { points: 2 },
      },
      { type: "possession", code: "turnover", side: "home", player: null, period: 2 },
      {
        type: "possession",
        code: "interception",
        side: "home",
        player: 11,
        period: 2,
      },
      { type: "series", code: "first_down", side: "home", player: 4, period: 2 },
      { type: "penalty", code: "Holding Defense", side: "home", player: null, period: 2 },
      {
        type: "time",
        code: "clock",
        side: "home",
        player: null,
        period: 2,
        payload: { input: "12:34" },
      },
      {
        type: "timeout",
        code: "home",
        side: "home",
        player: null,
        period: 2,
        payload: { input: "3:05" },
      },
    ]);
  });

  it("translates a play with its structured payload", () => {
    const [pass, incomplete, run, sack] = envelopesForWrite(
      write("Ravens", [
        {
          name: "Pass",
          player: 7,
          input: "8 Yards · QB #12",
          payload: { yards: 8, complete: true, qb: 12 },
        },
        {
          name: "Pass unvollständig",
          player: 7,
          input: "QB #12",
          payload: { yards: 0, complete: false, qb: 12 },
        },
        { name: "Run", player: 23, input: "14 Yards", payload: { yards: 14 } },
        {
          name: "Sack",
          player: 12,
          input: "5 Yards Verlust",
          payload: { yards: -5 },
        },
      ]),
      LOG,
    );

    expect(pass).toEqual({
      type: "play",
      code: "pass",
      side: "home",
      player: 7,
      period: 1,
      payload: { input: "8 Yards · QB #12", yards: 8, complete: true, qb: 12 },
    });
    expect(incomplete).toMatchObject({ type: "play", code: "pass" });
    expect(run).toMatchObject({ type: "play", code: "run", player: 23 });
    expect(sack).toMatchObject({ type: "play", code: "sack" });
  });

  it("translates a challenge with its optional text", () => {
    const [challenge] = envelopesForWrite(
      write("Ravens", [{ name: "Challenge", input: "Zuschauer zu viele" }]),
      LOG,
    );

    expect(challenge).toEqual({
      type: "challenge",
      code: "",
      side: "home",
      player: null,
      period: 1,
      payload: { input: "Zuschauer zu viele" },
    });
  });

  it("resolves the side from the team name the sheets know", () => {
    const [envelope] = envelopesForWrite(
      write("Wolves", [{ name: "Touchdown", player: 9 }]),
      LOG,
    );

    expect(envelope.side).toBe("away");
  });

  it("refuses a team that is not in the log", () => {
    expect(() =>
      envelopesForWrite(write("Fremde", [{ name: "Touchdown" }]), LOG),
    ).toThrow("gehört nicht zu diesem Spiel");
  });

  it("coerces the jersey before it leaves the device", () => {
    const [envelope] = envelopesForWrite(
      write("Ravens", [{ name: "Touchdown", player: 51.85 }]),
      LOG,
    );

    expect(envelope.player).toBe(51);

    const [dropped] = envelopesForWrite(
      write("Ravens", [{ name: "Touchdown", player: 40000 }]),
      LOG,
    );
    expect(dropped.player).toBeNull();
  });

  it("keeps an unknown play's name so the server can refuse it by name", () => {
    const [envelope] = envelopesForWrite(
      write("Ravens", [{ name: "Notiz", player: 5 }]),
      LOG,
    );

    expect(envelope).toEqual({
      type: "score",
      code: "Notiz",
      side: "home",
      player: 5,
      period: 1,
    });
  });
});

describe("the single-event envelopes", () => {
  it("builds possession, half-time and undo", () => {
    expect(possessionEnvelope("away")).toEqual({
      type: "possession",
      code: "away",
      side: "away",
    });
    expect(halftimeEnvelope()).toEqual({
      type: "period",
      code: "half_time",
      side: null,
    });
    expect(correctionEnvelope(7)).toEqual({
      type: "correction",
      code: "undo",
      payload: { undo_of: 7 },
    });
  });
});

describe("displayOf", () => {
  it("names the row and its points", () => {
    expect(displayOf({ type: "score", code: "touchdown" })).toMatchObject({
      event: "Touchdown",
      value: 6,
    });
    expect(
      displayOf({ type: "score", code: "safety", payload: { points: 2 } }),
    ).toMatchObject({ event: "Safety (+2)", value: 2 });
    expect(displayOf({ type: "possession", code: "turnover" })).toMatchObject({
      event: "Turnover",
      cop: true,
    });
    expect(displayOf({ type: "penalty", code: "Holding" })).toMatchObject({
      event: "Strafe",
      excluded: true,
    });
    expect(displayOf({ type: "period", code: "half_time" })).toMatchObject({
      event: "2. Halbzeit gestartet",
      marker: true,
      excluded: true,
    });
    // A plain possession change and a correction write no row.
    expect(displayOf({ type: "possession", code: "home" }).event).toBeNull();
    expect(displayOf({ type: "correction", code: "undo" }).event).toBeNull();
  });

  it("refuses a safety without points instead of inventing a value", () => {
    expect(displayOf({ type: "score", code: "safety" }).event).toBeNull();
  });

  it("keeps the missed try's name but promises no points", () => {
    // The row is worth 0 (the server reads `payload.missed`), so the
    // optimistic score must not add a point that never happened.
    expect(
      displayOf({ type: "score", code: "pat1", payload: { missed: true } }),
    ).toMatchObject({ event: "1-Extra-Punkt", value: 0 });
    expect(
      displayOf({ type: "score", code: "pat2", payload: { missed: true } }),
    ).toMatchObject({ event: "2-Extra-Punkte", value: 0 });
    // A converted try still scores.
    expect(displayOf({ type: "score", code: "pat1" })).toMatchObject({
      event: "1-Extra-Punkt",
      value: 1,
    });
  });

  it("names the remaining plays the sheets can submit", () => {
    expect(displayOf({ type: "possession", code: "interception" })).toMatchObject(
      { event: "Interception", cop: true, value: 0 },
    );
    expect(displayOf({ type: "time", code: "clock" })).toMatchObject({
      event: "Spielzeit",
      excluded: true,
    });
    expect(displayOf({ type: "timeout", code: "home" })).toMatchObject({
      event: "Auszeit",
      excluded: true,
    });
    expect(displayOf({ type: "series", code: "first_down" })).toMatchObject({
      event: "First Down",
      excluded: true,
    });
    expect(displayOf({ type: "period", code: "start" }).event).toBe(
      "Spiel gestartet",
    );
    expect(displayOf({ type: "period", code: "end" }).event).toBe(
      "Spiel beendet",
    );
    expect(displayOf({ type: "period", code: "overtime" })).toMatchObject({
      event: "Overtime startet",
      marker: true,
      excluded: true,
    });
  });

  it("names the scrimmage plays, with the incomplete pass as its own row", () => {
    expect(displayOf({ type: "play", code: "pass" })).toMatchObject({
      event: "Pass",
      value: 0,
    });
    expect(
      displayOf({ type: "play", code: "pass", payload: { complete: false } }),
    ).toMatchObject({ event: "Pass unvollständig" });
    expect(displayOf({ type: "play", code: "run" }).event).toBe("Run");
    expect(displayOf({ type: "play", code: "sack" }).event).toBe("Sack");
    expect(displayOf({ type: "challenge" })).toMatchObject({
      event: "Challenge",
      value: 0,
    });
    // Nothing to show beats a wrong row.
    expect(displayOf({ type: "play", code: "kick" }).event).toBeNull();
  });

  it("draws no row for a code it cannot render", () => {
    // Nothing to show beats a wrong row: the server refuses unknown codes.
    expect(displayOf({ type: "series", code: "second_down" }).event).toBeNull();
    expect(displayOf({ type: "period", code: "quarter" }).event).toBeNull();
    expect(displayOf({ type: "score", code: "tor" }).event).toBeNull();
    expect(displayOf({ type: "time", code: "clock" }).event).toBe("Spielzeit");
  });
});

describe("coercePlayer", () => {
  it("truncates, drops out-of-range and keeps an empty jersey empty", () => {
    expect(coercePlayer("51.85")).toBe(51);
    expect(coercePlayer(-1)).toBeNull();
    expect(coercePlayer(40000)).toBeNull();
    expect(coercePlayer("")).toBeNull();
    expect(coercePlayer(null)).toBeNull();
    expect(coercePlayer("keine")).toBeNull();
  });
});

describe("sideOfName", () => {
  it("matches the names in the log, case and space insensitive", () => {
    expect(sideOfName("  ravens ", LOG)).toBe("home");
    expect(sideOfName("Wolves", LOG)).toBe("away");
    expect(sideOfName("", LOG)).toBeNull();
    expect(sideOfName(undefined, LOG)).toBeNull();
    expect(sideOfName("Fremde", LOG)).toBeNull();
  });
});


describe("envelopesForWrite — the edges", () => {
  it("sends an empty code for a penalty without a name", () => {
    // The sheet always picks one; without it the server must refuse the event
    // (400) instead of writing a "Strafe" with no reason.
    const [envelope] = envelopesForWrite(write("Ravens", [{ name: "Strafe" }]), LOG);

    expect(envelope).toMatchObject({ type: "penalty", code: "" });
  });

  it("resolves a side even when the other team has no name", () => {
    const nameless: GameLog = {
      ...LOG,
      home: team({ name: null }),
    };

    expect(sideOfName("Wolves", nameless)).toBe("away");
    expect(sideOfName("Ravens", nameless)).toBeNull();
  });
});

describe("displayOf — an envelope without a code", () => {
  it("draws no row for a scored play, and still names a penalty", () => {
    expect(displayOf({ type: "score" }).event).toBeNull();
    // The penalty's *code* is its reason, shown as the row's detail; the row
    // itself is "Strafe" either way (the server refuses an empty code).
    expect(displayOf({ type: "penalty" }).event).toBe("Strafe");
  });
});

describe("a stored row as the event that wrote it", () => {
  it("keeps the number, the text and the detail", () => {
    expect(
      eventOfRow({
        key: "e1",
        teamLogId: 1,
        eventSeq: 3,
        groupSequence: 3,
        team: "Ravens",
        event: "Pass",
        player: 7,
        input: "8 Yards · QB #12",
        half: 1,
        cop: false,
        isDeleted: false,
        time: null,
        payload: { yards: 8, complete: true },
      }),
    ).toEqual({
      name: "Pass",
      player: 7,
      input: "8 Yards · QB #12",
      payload: { yards: 8, complete: true },
    });
  });

  it("adds nothing a bare row does not carry", () => {
    // A teammate row of the same group (a touchdown with no number, no text,
    // no detail) must not invent fields.
    expect(
      eventOfRow({
        key: "e2",
        teamLogId: 2,
        eventSeq: 3,
        groupSequence: 3,
        team: "Ravens",
        event: "Touchdown",
        player: null,
        input: null,
        half: 1,
        cop: false,
        isDeleted: false,
        time: null,
        payload: null,
      }),
    ).toEqual({ name: "Touchdown" });
  });
});

describe("a possession row that carries a detail", () => {
  it("sends the interception's text even without a legacy input mapping", () => {
    const [envelope] = envelopesForWrite(
      write("Ravens", [
        {
          name: "Interception",
          player: 11,
          input: "bis B20 · 15 Yards Return",
          payload: { deadBall: 30, returnYards: 15 },
        },
      ]),
      LOG,
    );

    expect(envelope).toMatchObject({
      type: "possession",
      code: "interception",
      side: "home",
      player: 11,
      payload: {
        input: "bis B20 · 15 Yards Return",
        deadBall: 30,
        returnYards: 15,
      },
    });
  });

  it("adds no empty input to a plain turnover", () => {
    const [envelope] = envelopesForWrite(
      write("Ravens", [{ name: "Turnover" }]),
      LOG,
    );

    expect(envelope.payload).toBeUndefined();
  });
});
