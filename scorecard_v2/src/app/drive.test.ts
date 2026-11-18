import { describe, expect, it } from "vitest";

import type { LogRow } from "../components/EventLog";
import {
  advance,
  applyPenalty,
  DEFAULT_GEOMETRY,
  driveAfter,
  driveSpotText,
  driveText,
  FIRST_AND_TEN,
  enforceSpot,
  firstDownDistance,
  geometryOf,
  pastMiddle,
  type Geometry,
  isTurnoverOnDowns,
  interceptionReturnSpot,
  mirror,
  seriesAt,
  seriesToGoal,
  spotText,
  tryAt,
  yardsOf,
} from "./drive";

function row(overrides: Partial<LogRow> = {}): LogRow {
  return {
    key: "e1",
    teamLogId: 1,
    eventSeq: 1,
    groupSequence: 1,
    team: "Ravens",
    event: "Run",
    player: null,
    input: null,
    half: 1,
    cop: false,
    isDeleted: false,
    time: "2026-11-04T12:00:00Z",
    payload: { yards: 0 },
    ...overrides,
  };
}

function run(yards: number, team = "Ravens"): LogRow {
  return row({ team, payload: { yards } });
}

function penalty(
  yardage: number,
  nextDown = "repeat",
  team = "Ravens",
): LogRow {
  return row({
    team,
    event: "Strafe",
    payload: { yardage, nextDown },
  });
}

describe("the 50-yard field", () => {
  it("starts every series at A5 with midfield as the line to gain", () => {
    expect(FIRST_AND_TEN).toEqual({
      down: 1,
      toGo: 20,
      ballOn: 5,
      goal: false,
    });
    expect(driveText(FIRST_AND_TEN)).toBe("1st & M");
    expect(spotText(FIRST_AND_TEN.ballOn)).toBe("A5");
  });

  it("names A, midfield and B as the officials call them", () => {
    expect(spotText(0)).toBe("A0");
    expect(spotText(5)).toBe("A5");
    expect(spotText(12)).toBe("A12");
    expect(spotText(25)).toBe("M");
    expect(spotText(30)).toBe("B20");
    expect(spotText(36)).toBe("B14");
    expect(spotText(50)).toBe("B0");
    expect(spotText(4.5)).toBe("A4,5");
    expect(spotText(null)).toBeNull();
  });
});

describe("pastMiddle", () => {
  it("needs a spot before it can be reached", () => {
    expect(pastMiddle(null)).toBe(false);
  });
});

describe("advance", () => {
  it("counts the yards up to midfield and keeps M as the line to gain", () => {
    expect(advance(FIRST_AND_TEN, 7)).toEqual({
      down: 2,
      toGo: 13,
      ballOn: 12,
      goal: false,
    });
    expect(driveText(advance(FIRST_AND_TEN, 7))).toBe("2nd & M");
  });

  it("awards a first down when the play reaches midfield", () => {
    // The definition's default (`middle_reached: "on"`, operator call on game
    // 9316): reaching the line earns the new series and makes it goal to go.
    expect(advance(FIRST_AND_TEN, 20)).toEqual({
      down: 1,
      toGo: 25,
      ballOn: 25,
      goal: true,
    });
    expect(driveText(advance(FIRST_AND_TEN, 20))).toBe("1st & G");
    expect(spotText(advance(FIRST_AND_TEN, 20).ballOn)).toBe("M");
    expect(advance(FIRST_AND_TEN, 20.5)).toEqual({
      down: 1,
      toGo: 24.5,
      ballOn: 25.5,
      goal: true,
    });
    expect(spotText(advance(FIRST_AND_TEN, 20.5).ballOn)).toBe("B24,5");
  });

  it("crosses into B territory and counts the B yards down to the goal", () => {
    const crossed = advance(FIRST_AND_TEN, 25);

    expect(crossed).toEqual({ down: 1, toGo: 20, ballOn: 30, goal: true });
    expect(driveText(crossed)).toBe("1st & G");
    expect(spotText(crossed.ballOn)).toBe("B20");

    const next = advance(crossed, 6);

    expect(next).toEqual({ down: 2, toGo: 14, ballOn: 36, goal: true });
    expect(driveText(next)).toBe("2nd & G");
    expect(spotText(next.ballOn)).toBe("B14");
  });

  it("keeps goal-to-go when a play loses yards back across midfield", () => {
    const lost = advance(seriesAt(30), -8);

    expect(lost).toEqual({ down: 2, toGo: 28, ballOn: 22, goal: true });
    expect(driveText(lost)).toBe("2nd & G");
    expect(spotText(lost.ballOn)).toBe("A22");
  });

  it("counts a negative gain backwards", () => {
    expect(advance(FIRST_AND_TEN, -4)).toEqual({
      down: 2,
      toGo: 24,
      ballOn: 1,
      goal: false,
    });
  });

  it("ends the series on a fourth down short of the line", () => {
    expect(advance({ down: 4, toGo: 5, ballOn: 20, goal: false }, 3)).toEqual(
      FIRST_AND_TEN,
    );
    // exactly on the middle reaches the line to gain, so fourth down converts
    expect(advance({ down: 4, toGo: 5, ballOn: 20, goal: false }, 5)).toEqual(
      seriesAt(25),
    );
    expect(advance({ down: 4, toGo: 8, ballOn: 42, goal: true }, 3)).toEqual(
      FIRST_AND_TEN,
    );
  });

  it("sets the spot on a fresh series", () => {
    expect(seriesAt(20)).toEqual({
      down: 1,
      toGo: 5,
      ballOn: 20,
      goal: false,
    });
  });
});

describe("isTurnoverOnDowns", () => {
  it("is only true on fourth down short of the line to gain", () => {
    expect(
      isTurnoverOnDowns({ down: 4, toGo: 5, ballOn: 20, goal: false }, 3),
    ).toBe(true);
    // exactly on the middle reaches the line to gain: not a turnover
    expect(
      isTurnoverOnDowns({ down: 4, toGo: 5, ballOn: 20, goal: false }, 5),
    ).toBe(false);
    expect(
      isTurnoverOnDowns({ down: 4, toGo: 5, ballOn: 20, goal: false }, 5.5),
    ).toBe(false);
    expect(
      isTurnoverOnDowns({ down: 3, toGo: 5, ballOn: 20, goal: false }, 3),
    ).toBe(false);
    expect(
      isTurnoverOnDowns({ down: 4, toGo: 8, ballOn: 42, goal: true }, 3),
    ).toBe(true);
  });
});

describe("applyPenalty", () => {
  it("moves the spot with a signed yardage", () => {
    expect(applyPenalty(seriesAt(20), -5, "repeat")).toEqual({
      down: 1,
      toGo: 10,
      ballOn: 15,
      goal: false,
    });
  });

  it("applies the next-down choice", () => {
    const state = { down: 2, toGo: 10, ballOn: 15, goal: false };

    expect(applyPenalty(state, -5, "repeat").down).toBe(2);
    expect(applyPenalty(state, 5, "first_down").down).toBe(1);
    expect(applyPenalty(state, -5, "loss_of_down").down).toBe(3);
  });

  it("never moves closer than half the distance to the own goal", () => {
    expect(applyPenalty(seriesAt(9), -5, "repeat")).toEqual({
      down: 1,
      toGo: 20.5,
      ballOn: 4.5,
      goal: false,
    });
    expect(applyPenalty(seriesAt(11), -5, "repeat")).toEqual({
      down: 1,
      toGo: 19,
      ballOn: 6,
      goal: false,
    });
  });

  it("never moves closer than half the distance to the opponent's goal", () => {
    const state = seriesAt(45);

    expect(applyPenalty(state, 10, "repeat")).toEqual({
      down: 1,
      toGo: 2.5,
      ballOn: 47.5,
      goal: true,
    });
  });

  it("crossing midfield makes it a new 1st & G, whatever nextDown says", () => {
    expect(applyPenalty(seriesAt(20), 10, "loss_of_down")).toEqual({
      down: 1,
      toGo: 20,
      ballOn: 30,
      goal: true,
    });
  });

  it("ends a goal-to-go series on a loss of down on fourth down", () => {
    expect(
      applyPenalty(
        { down: 4, toGo: 3, ballOn: 47, goal: true },
        -5,
        "loss_of_down",
      ),
    ).toEqual(FIRST_AND_TEN);
  });

  it("below midfield the next-down choice applies", () => {
    const state = { down: 2, toGo: 10, ballOn: 15, goal: false };

    expect(applyPenalty(state, -10, "loss_of_down")).toEqual({
      down: 3,
      toGo: 17.5,
      ballOn: 7.5,
      goal: false,
    });
  });

  it("ends the series when a loss of down happens on fourth down", () => {
    expect(
      applyPenalty(
        { down: 4, toGo: 5, ballOn: 20, goal: false },
        -5,
        "loss_of_down",
      ),
    ).toEqual(FIRST_AND_TEN);
  });

  it("keeps goal-to-go when a penalty moves the ball (game 9316)", () => {
    // 1st & G at B22, offence penalty 5: the line to gain stays the goal line.
    const own = applyPenalty(
      { down: 1, toGo: 22, ballOn: 28, goal: true },
      -5,
    );

    expect(own).toEqual({ down: 1, toGo: 27, ballOn: 23, goal: true });
    expect(driveText(own)).toBe("1st & G");
    expect(spotText(own.ballOn)).toBe("A23");

    // A defence penalty in a goal-to-go series stays `& G` too.
    const defence = applyPenalty(
      { down: 2, toGo: 5, ballOn: 45, goal: true },
      5,
    );

    expect(defence).toEqual({ down: 2, toGo: 2.5, ballOn: 47.5, goal: true });
    expect(driveText(defence)).toBe("2nd & G");
  });
});

describe("driveAfter", () => {
  it("starts at A5 without plays", () => {
    expect(driveAfter([])).toEqual(FIRST_AND_TEN);
  });

  it("walks the plays from oldest to newest", () => {
    // The log is newest first: a 4-yard run, then a 3-yard run.
    const drive = driveAfter([run(3), run(4)]);

    expect(drive).toEqual({ down: 3, toGo: 13, ballOn: 12, goal: false });
  });

  it("ignores a deleted play, so an undo rewinds the series", () => {
    const deleted = run(4);
    deleted.isDeleted = true;

    expect(driveAfter([run(3), deleted])).toEqual({
      down: 2,
      toGo: 17,
      ballOn: 8,
      goal: false,
    });
  });

  it("starts over at A5 when the team changes", () => {
    const drive = driveAfter([
      run(4, "Wolves"),
      run(3, "Ravens"),
      row({ key: "spot", event: "Feldposition", payload: { ballOn: 20 } }),
    ]);

    expect(drive).toEqual({ down: 2, toGo: 16, ballOn: 9, goal: false });
  });

  it("starts over at A5 after a turnover", () => {
    expect(
      driveAfter([row({ key: "to", event: "Turnover", cop: true }), run(8)]),
    ).toEqual(FIRST_AND_TEN);
  });

  it("starts over at A5 after a safety for the defence", () => {
    expect(
      driveAfter([
        row({
          key: "safety",
          event: "Safety (+2)",
          team: "Wolves",
          payload: { defense: true },
        }),
        run(8),
      ]),
    ).toEqual(FIRST_AND_TEN);
  });

  it("starts the try after a touchdown", () => {
    expect(
      driveAfter([
        row({ key: "td", event: "Touchdown", payload: { yards: 6 } }),
        run(6),
      ]),
    ).toEqual(tryAt(45));
  });

  it("starts over at half-time", () => {
    expect(
      driveAfter([row({ key: "m", event: "2. Halbzeit gestartet", team: null }), run(5)]),
    ).toEqual(FIRST_AND_TEN);
  });

  it("starts overtime on the middle with the goal to gain", () => {
    expect(
      driveAfter([row({ key: "m", event: "Overtime startet", team: "Wolves" })]),
    ).toEqual(seriesToGoal(25));
  });

  it("reads the yards from the structured payload", () => {
    expect(yardsOf(row({ payload: { yards: 8 } }))).toBe(8);
    expect(yardsOf(row({ payload: { yards: -5 } }))).toBe(-5);
    expect(yardsOf(row({ payload: null }))).toBe(0);
    expect(yardsOf(row({ payload: { yards: "8" } }))).toBe(0);
  });

  it("counts a pass and a sack like any other play", () => {
    // Newest first: a 6-yard pass, then a 5-yard sack.
    const drive = driveAfter([
      row({ key: "sack", event: "Sack", payload: { yards: -5 } }),
      row({ key: "pass", event: "Pass", payload: { yards: 6 } }),
    ]);

    expect(drive).toEqual({ down: 3, toGo: 19, ballOn: 6, goal: false });
  });

  it("sets the spot from a Feldposition row", () => {
    const drive = driveAfter([
      run(-2),
      row({ key: "spot", event: "Feldposition", payload: { ballOn: 20 } }),
    ]);

    expect(drive).toEqual({ down: 2, toGo: 7, ballOn: 18, goal: false });
  });

  it("takes the down and the line to gain from the spot row", () => {
    const drive = driveAfter([
      row({
        key: "spot",
        event: "Feldposition",
        payload: { ballOn: 20, down: 3, goal: true },
      }),
    ]);

    expect(drive).toEqual({ down: 3, toGo: 30, ballOn: 20, goal: true });
  });

  it("moves the spot of a running series and keeps its down", () => {
    // 2nd & M at A10, then the officials correct the spot to A15.
    const drive = driveAfter([
      row({ key: "spot", event: "Feldposition", payload: { ballOn: 15 } }),
      run(5),
    ]);

    expect(drive).toEqual({ down: 2, toGo: 10, ballOn: 15, goal: false });
  });

  it("keeps the down even when the corrected spot goes backwards", () => {
    // 4th & M at A10; the correction puts the ball back on A12.
    const drive = driveAfter([
      row({ key: "spot", event: "Feldposition", payload: { ballOn: 12 } }),
      run(5),
      run(0),
      run(0),
    ]);

    expect(drive).toEqual({ down: 4, toGo: 13, ballOn: 12, goal: false });
  });

  it("starts a first down when the corrected spot is beyond the line to gain", () => {
    const onTheLine = driveAfter([
      row({ key: "spot", event: "Feldposition", payload: { ballOn: 25 } }),
      run(5),
    ]);
    const beyond = driveAfter([
      row({ key: "spot", event: "Feldposition", payload: { ballOn: 25.5 } }),
      run(5),
    ]);

    // 2nd & M at A10, corrected exactly onto midfield: reaching the line is
    // the new series and goal to go (the definition's "on" default).
    expect(onTheLine).toEqual({ down: 1, toGo: 25, ballOn: 25, goal: true });
    expect(beyond).toEqual({ down: 1, toGo: 24.5, ballOn: 25.5, goal: true });
  });

  it("keeps the goal-to-go line and the down for a spot inside B", () => {
    const drive = driveAfter([
      row({ key: "spot", event: "Feldposition", payload: { ballOn: 45 } }),
      run(5),
      run(30),
    ]);

    // A 30-yard run reaches B15 (1st & G), 5 more reach B10 (2nd & G); the
    // correction to B5 must not grant a fresh series.
    expect(drive).toEqual({ down: 2, toGo: 5, ballOn: 45, goal: true });
  });

  it("applies a penalty row to the spot and the down", () => {
    const drive = driveAfter([penalty(5, "first_down"), run(3)]);

    // 3-yard run to A8, then +5 and a first down at A13.
    expect(drive).toEqual({ down: 1, toGo: 12, ballOn: 13, goal: false });
  });

  it("a manual field position after a penalty wins", () => {
    const drive = driveAfter([
      run(3),
      row({ key: "spot", event: "Feldposition", payload: { ballOn: 12 } }),
      penalty(10, "first_down"),
      run(3),
    ]);

    expect(drive).toEqual({ down: 2, toGo: 10, ballOn: 15, goal: false });
  });

  it("ignores a penalty without a structured yardage", () => {
    expect(
      driveAfter([row({ key: "pen", event: "Strafe", payload: {} })]),
    ).toEqual(FIRST_AND_TEN);
  });

  it("mirrors the spot for code that still asks for it", () => {
    expect(mirror(5)).toBe(45);
    expect(mirror(null)).toBeNull();
  });
});

describe("the try after a touchdown (IFAF R 8-3-2)", () => {
  it("keeps the ball with the scoring team until the try is answered", () => {
    const state = driveAfter([row({ event: "Touchdown", team: "Ravens" })]);

    expect(state).toEqual(tryAt(45));
    expect(driveText(state)).toBe("Versuch");
    expect(spotText(state.ballOn)).toBe("B5");
  });

  it("ends with +1/+2 and starts the next series at the own 5", () => {
    expect(
      driveAfter([
        row({ event: "1-Extra-Punkt", team: "Ravens" }),
        row({ event: "Touchdown", team: "Ravens" }),
      ]),
    ).toEqual(FIRST_AND_TEN);
    expect(
      driveAfter([
        row({ event: "2-Extra-Punkte", team: "Ravens" }),
        row({ event: "Touchdown", team: "Ravens" }),
      ]),
    ).toEqual(FIRST_AND_TEN);
  });

  it("repeats from the enforced spot when a penalty lands during the try", () => {
    const state = driveAfter([
      penalty(5),
      row({ event: "Touchdown", team: "Ravens" }),
    ]);

    expect(state).toEqual({
      down: 1,
      toGo: 2.5,
      ballOn: 47.5,
      goal: true,
      phase: "try",
    });
    expect(spotText(state.ballOn)).toBe("B2,5");
  });

  it("a missed try ends on the possession change, not on a row", () => {
    // The miss writes no row; the ball moving to the other team is the end.
    expect(
      driveAfter([row({ event: "Touchdown", team: "Ravens" })], DEFAULT_GEOMETRY, "Wolves"),
    ).toEqual(FIRST_AND_TEN);
    // While the scoring team still has it, the try stays open.
    expect(
      driveAfter([row({ event: "Touchdown", team: "Ravens" })], DEFAULT_GEOMETRY, "Ravens"),
    ).toEqual(tryAt(45));
  });

  it("replays an old log (touchdown, conversion, next play) unchanged", () => {
    const state = driveAfter([
      run(5, "Wolves"),
      row({ event: "1-Extra-Punkt", team: "Ravens" }),
      row({ event: "Touchdown", team: "Ravens" }),
    ]);

    expect(state).toEqual({ down: 2, toGo: 15, ballOn: 10, goal: false });
  });

  it("a Feldposition row ends an open try", () => {
    const state = driveAfter([
      row({ event: "Feldposition", payload: { ballOn: 20 } }),
      row({ event: "Touchdown", team: "Ravens" }),
    ]);

    expect(state).toEqual({ down: 1, toGo: 5, ballOn: 20, goal: false });
  });
});

describe("driveText", () => {
  it("uses the officials' shorthand", () => {
    expect(driveText(FIRST_AND_TEN)).toBe("1st & M");
    expect(driveText({ down: 2, toGo: 13, ballOn: 12, goal: false })).toBe(
      "2nd & M",
    );
    expect(driveText({ down: 3, toGo: 14, ballOn: 36, goal: true })).toBe(
      "3rd & G",
    );
    expect(driveText({ down: 4, toGo: 1, ballOn: 49, goal: true })).toBe(
      "4th & G",
    );
  });
});

describe("the geometry comes from the sport definition", () => {
  it("maps the served definition onto the engine", () => {
    const rules = {
      field: { length: 40, middle: 20 },
      series: { start: 5, downs: 4 },
    } as unknown as Parameters<typeof geometryOf>[0];

    expect(geometryOf(rules)).toEqual({
      fieldLength: 40,
      middle: 20,
      seriesStart: 5,
      downs: 4,
      middleReached: "on",
    });
  });

  it("falls back to the 50-yard field while the definition is missing", () => {
    expect(geometryOf(null)).toEqual(DEFAULT_GEOMETRY);
    expect(geometryOf(undefined)).toEqual(DEFAULT_GEOMETRY);
    expect(DEFAULT_GEOMETRY).toEqual({
      fieldLength: 50,
      middle: 25,
      seriesStart: 5,
      downs: 4,
      middleReached: "on",
    });
  });

  it("moves the line to gain to the middle of a shorter field", () => {
    const g = { fieldLength: 40, middle: 20, seriesStart: 5, downs: 4 };

    // own 15 on the 40-yard field: the line to gain is the middle, 5 yards away
    expect(firstDownDistance(15, g)).toBe(5);
    // a play across the middle starts a fresh series with the goal to go
    expect(advance(seriesAt(18, g), 3, g)).toMatchObject({
      down: 1,
      goal: true,
      ballOn: 21,
    });
  });

  it("honours a different down count", () => {
    const beach = { fieldLength: 25, middle: 12.5, seriesStart: 5, downs: 3 };

    // third down on the beach field: a stop ends the series
    const state = { down: 3, toGo: 7, ballOn: 5, goal: false };
    expect(advance(state, 1, beach).down).toBe(1);
    expect(isTurnoverOnDowns(state, 1, beach)).toBe(true);
  });

  it("draws the spot from the definition's field", () => {
    const g = { fieldLength: 40, middle: 20, seriesStart: 5, downs: 4 };

    expect(spotText(20, g)).toBe("M");
    expect(spotText(30, g)).toBe("B10");
    expect(spotText(10, g)).toBe("A10");
  });
});

describe("a definition that is not a definition", () => {
  it("falls back instead of white-screening the field app", () => {
    const garbage = { field: undefined, series: undefined } as unknown as Parameters<
      typeof geometryOf
    >[0];
    const halfField = {
      field: { length: 50, middle: 20 },
      series: { start: 5, downs: 4 },
    } as unknown as Parameters<typeof geometryOf>[0];

    expect(geometryOf(garbage)).toEqual(DEFAULT_GEOMETRY);
    // the middle must be half the field
    expect(geometryOf(halfField)).toEqual(DEFAULT_GEOMETRY);
  });
});

describe("R 3-1-3c: overtime starts at the middle, goal to go", () => {
  it("starts the series on M with four downs to score", () => {
    // newest first, like the log hands them over
    const state = driveAfter([
      row({ event: "Overtime startet", team: "Wolves" }),
      row({ event: "Touchdown", team: "Ravens" }),
    ]);

    expect(state).toEqual({ down: 1, toGo: 25, ballOn: 25, goal: true });
  });

  it("does not award a new series when a play crosses the middle", () => {
    const state = driveAfter([
      row({ event: "Run", team: "Wolves", payload: { yards: 3 } }),
      row({ event: "Overtime startet", team: "Wolves" }),
    ]);

    expect(state).toMatchObject({ down: 2, goal: true, ballOn: 28 });
  });
});

describe("R 5-1-1: an interception starts at the dead-ball spot", () => {
  it("uses the spot the sheet recorded", () => {
    const state = driveAfter([
      row({
        event: "Interception",
        team: "Wolves",
        payload: { deadBall: 30 },
      }),
      row({ event: "Pass", team: "Ravens", payload: { yards: 5 } }),
    ]);

    expect(state).toEqual({ down: 1, toGo: 20, ballOn: 30, goal: true });
  });

  it("falls back to the own 5 for a row without a spot (a touchback)", () => {
    const state = driveAfter([
      row({ event: "Interception", team: "Wolves", payload: null }),
      row({ event: "Pass", team: "Ravens", payload: { yards: 5 } }),
    ]);

    expect(state).toEqual(FIRST_AND_TEN);
  });
});

describe("the interception is entered before the field turns (R 5-1-1)", () => {
  // The catch and the return are entered in the pre-turnover orientation: A is
  // the throwing offence's own half, B the half it was attacking. The new
  // offence reads the same dead ball from the mirror side.
  it("starts the new series on the own 9 after a catch at B4 and a 5-yard return", () => {
    // B4 = 46 from the throwing offence's own goal line; the return gains the
    // other way, to B9 = 41. The intercepting team's own 9 is A9.
    const deadBall = interceptionReturnSpot(46, 5);

    expect(deadBall).toBe(9);
    expect(spotText(deadBall)).toBe("A9");

    const state = driveAfter(
      [
        row({ event: "Interception", team: "Wolves", payload: { deadBall } }),
        row({ event: "Pass", team: "Ravens", payload: { yards: 5 } }),
      ],
      DEFAULT_GEOMETRY,
      "Wolves",
    );

    expect(state).toEqual({ down: 1, toGo: 16, ballOn: 9, goal: false });
    expect(driveText(state)).toBe("1st & M");
  });

  it("keeps the catch spot when no return yards are entered", () => {
    // caught at B4 and immediately downed: the new offence starts on A4
    expect(interceptionReturnSpot(46, null)).toBe(4);
    expect(spotText(interceptionReturnSpot(46, 0))).toBe("A4");
  });

  it("has no dead-ball spot without a catch spot (a touchback)", () => {
    expect(interceptionReturnSpot(null, 5)).toBeNull();
  });

  it("clamps a return that would leave the field behind the new goal line", () => {
    // caught at B30 and carried 20 yards the other way: the ball is dead in
    // the end zone the throwing offence defended — a pick six the sheet
    // records as a touchdown, not as a spot
    expect(interceptionReturnSpot(20, 20)).toBe(50);
    expect(spotText(interceptionReturnSpot(20, 20))).toBe("B0");
    expect(interceptionReturnSpot(20, 30)).toBe(50);
  });

  it("turns the field only after a pick six's touchdown", () => {
    const state = driveAfter([
      row({ event: "Touchdown", team: "Wolves", payload: { defense: true } }),
      row({ event: "Interception", team: "Wolves", payload: { deadBall: 50 } }),
      row({ event: "Pass", team: "Ravens", payload: { yards: 5 } }),
    ]);

    // the scoring defence's try, still from the same orientation
    expect(state).toEqual(tryAt(45));
    expect(driveText(state)).toBe("Versuch");
  });

  it("starts a goal-to-go series when the return crosses midfield", () => {
    // caught at B20 (30 from the throwing offence's goal line), returned 20
    // yards the other way to B10 (10) — A10 for the new offence, past midfield
    const deadBall = interceptionReturnSpot(30, 20);

    expect(deadBall).toBe(40);
    expect(spotText(deadBall)).toBe("B10");

    const state = driveAfter([
      row({ event: "Interception", team: "Wolves", payload: { deadBall } }),
      row({ event: "Pass", team: "Ravens", payload: { yards: 5 } }),
    ]);

    expect(state).toEqual({ down: 1, toGo: 10, ballOn: 40, goal: true });
    expect(driveText(state)).toBe("1st & G");
  });
});

describe("the spot in a play row's text", () => {
  it("appends the spot with the row's separator", () => {
    expect(driveSpotText({ down: 3, toGo: 10, ballOn: 11, goal: false })).toBe(
      " · A11",
    );
    expect(driveSpotText({ down: 1, toGo: 10, ballOn: 25, goal: false })).toBe(
      " · M",
    );
  });

  it("shows half yards the German way", () => {
    expect(driveSpotText({ down: 2, toGo: 5, ballOn: 4.5, goal: false })).toBe(
      " · A4,5",
    );
  });

  it("adds nothing while the spot is unknown", () => {
    expect(driveSpotText({ down: 1, toGo: 20, ballOn: null, goal: false })).toBe(
      "",
    );
  });
});

describe("a tapped First Down resets the series", () => {
  it("moves the down back to one on the current spot", () => {
    const state = driveAfter([
      row({ event: "First Down", team: "Ravens" }),
      row({ event: "Run", team: "Ravens", payload: { yards: 3 } }),
      row({ event: "Run", team: "Ravens", payload: { yards: 3 } }),
    ]);

    expect(state).toMatchObject({ down: 1, ballOn: 11, goal: false });
  });

  it("does nothing when the row was undone", () => {
    const state = driveAfter([
      row({ event: "First Down", team: "Ravens", isDeleted: true }),
      row({ event: "Run", team: "Ravens", payload: { yards: 3 } }),
    ]);

    expect(state).toMatchObject({ down: 2, ballOn: 8 });
  });
});

describe("the middle line as a definition value", () => {
  const beyond: Geometry = { ...DEFAULT_GEOMETRY, middleReached: "beyond" };

  it('"beyond" keeps the series alive on the line (IFAF R 5-1-1a)', () => {
    const onTheLine = advance(seriesAt(20, beyond), 5, beyond);

    expect(onTheLine).toMatchObject({ down: 2, ballOn: 25, goal: false });
    expect(onTheLine.toGo).toBe(0);
    expect(advance(seriesAt(25, beyond), 0.5, beyond)).toMatchObject({
      down: 1,
      ballOn: 25.5,
      goal: true,
    });
  });

  it('"on" awards the new series when the ball reaches the line', () => {
    const onTheLine = advance(seriesAt(20), 5);

    expect(onTheLine).toEqual({ down: 1, toGo: 25, ballOn: 25, goal: true });
  });

  it('a penalty that lands on the middle is a new 1st & G under "on"', () => {
    const state = applyPenalty(
      { down: 2, toGo: 10, ballOn: 20, goal: false },
      5,
    );

    expect(state).toEqual({ down: 1, toGo: 25, ballOn: 25, goal: true });
    expect(
      applyPenalty({ down: 2, toGo: 10, ballOn: 20, goal: false }, 5, "repeat", beyond),
    ).toMatchObject({ down: 2, ballOn: 25, goal: false });
  });
});

describe("the edges of the geometry-aware engine", () => {
  it("measures a fresh series from the start spot when the spot is unknown", () => {
    // before the first Feldposition a series has no spot: the line to gain is
    // still middle minus the series start
    expect(firstDownDistance(null)).toBe(20);
    expect(firstDownDistance(null, { ...DEFAULT_GEOMETRY, middle: 20, seriesStart: 5 })).toBe(15);
  });

  it("starts a new series when a goal-to-go play reaches the goal line", () => {
    const state = advance({ down: 2, toGo: 3, ballOn: 47, goal: true }, 3);

    expect(state).toEqual(seriesAt(50));
    expect(state.toGo).toBe(0);
  });
});

describe("the penalty's effective spot", () => {
  it("halves the distance at A5 (R 10-3-3)", () => {
    // 5 yards back from A5 is A2,5, never the goal line
    expect(enforceSpot(5, -5)).toBe(2.5);
    expect(spotText(enforceSpot(5, -5))).toBe("A2,5");
  });

  it("halves toward the opponent's goal for a defence foul", () => {
    // 15 yards from B5 would pass the goal line: B7,5 is half the distance
    expect(enforceSpot(45, 15)).toBe(47.5);
    expect(spotText(enforceSpot(45, 15))).toBe("B2,5");
  });

  it("leaves a zero-yard foul on the spot", () => {
    expect(enforceSpot(20, 0)).toBe(20);
  });
});
