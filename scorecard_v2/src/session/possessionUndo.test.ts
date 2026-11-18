// Undoing an entry that handed the ball over must put it back where the entry
// found it. The rule lives here so the screen only has to pass the row.
import { describe, expect, it } from "vitest";

import type { GameLog } from "../api/types";
import type { LogRow } from "../components/EventLog";
import { undoPossessionTeam, undoPossessionTeamOfGroup, undoGroup, undoneTouchdown, undoneTry } from "./possessionUndo";

function log(): GameLog {
  const team = (id: number, name: string) => ({
    id,
    name,
    score: 0,
    firsthalf: { score: 0, entries: [] },
    secondhalf: { score: 0, entries: [] },
  });
  return {
    gameId: 42,
    isFirstHalf: true,
    inPossession: "Ravens",
    events: [],
    home: team(1, "Ravens"),
    away: team(2, "Wolves"),
  };
}

function row(overrides: Partial<LogRow> = {}): LogRow {
  return {
    key: "e1",
    teamLogId: 1,
    eventSeq: 1,
    groupSequence: 1,
    team: "Ravens",
    event: "Turnover",
    player: null,
    input: null,
    half: 1,
    cop: false,
    isDeleted: false,
    time: null,
    payload: null,
    ...overrides,
  };
}

describe("undoPossessionTeam", () => {
  it("returns the ball to the team that had it before a turnover", () => {
    expect(undoPossessionTeam(row(), log())).toBe("Ravens");
  });

  it("leaves the ball alone after a touchdown: only the try moves it", () => {
    // The six points do not hand the ball over; the try's result does. So
    // undoing a touchdown must not pull the ball to the team that scored it —
    // the kickoff may already have given it to the opponent.
    expect(undoPossessionTeam(row({ event: "Touchdown" }), log())).toBeNull();
  });

  it("leaves the ball alone after a pick-six touchdown", () => {
    // The interception moved the ball; the defensive touchdown did not.
    expect(
      undoPossessionTeam(
        row({ event: "Touchdown", team: "Wolves", payload: { defense: true } }),
        log(),
      ),
    ).toBeNull();
  });

  it("returns the ball to the opponent after an interception", () => {
    // The interception row names the *new* offence (the interceptor).
    expect(
      undoPossessionTeam(row({ event: "Interception" }), log()),
    ).toBe("Wolves");
  });

  it("returns the ball to the opponent after a safety", () => {
    expect(
      undoPossessionTeam(row({ event: "Safety (+2)" }), log()),
    ).toBe("Wolves");
  });

  it("puts the ball back with the try's team after a conversion", () => {
    expect(
      undoPossessionTeam(row({ event: "1-Extra-Punkt" }), log()),
    ).toBe("Ravens");
    // A defensive two-point try is credited to the defence; the scoring team
    // had the ball during the try.
    expect(
      undoPossessionTeam(
        row({
          event: "2-Extra-Punkte",
          team: "Wolves",
          payload: { try_defense: true },
        }),
        log(),
      ),
    ).toBe("Ravens");
  });

  it("changes nothing for an entry that keeps the ball", () => {
    expect(undoPossessionTeam(row({ event: "Pass" }), log())).toBeNull();
  });

  it("changes nothing for a row already deleted", () => {
    expect(undoPossessionTeam(row({ isDeleted: true }), log())).toBeNull();
  });

  it("changes nothing when the row names no team of this game", () => {
    expect(undoPossessionTeam(row({ team: "Fremde" }), log())).toBeNull();
  });
});

describe("a group written by one submission", () => {
  it("takes the flip from the turnover row when the play row is undone", () => {
    // A failed fourth down writes the play and its Turnover row as one
    // **submission**: the play wrote its own event and the turnover another, so
    // their event ids differ while the group id matches. Only the turnover row
    // moved the ball, so undoing the play row (the one with the yards) must
    // still put it back.
    const play = row({
      key: "p",
      eventSeq: 9,
      groupSequence: 9,
      team: "Wolves",
      event: "Pass",
    });
    const turnover = row({
      key: "t",
      eventSeq: 10,
      groupSequence: 9,
      team: "Ravens",
      event: "Turnover",
    });

    expect(undoPossessionTeam(play, log())).toBeNull();
    expect(undoPossessionTeamOfGroup(play, [turnover, play], log())).toBe(
      "Ravens",
    );
  });

  it("leaves the ball alone when the group only scored", () => {
    // The play and its touchdown are one submission, but neither hands the ball
    // over: the try does that later, in its own submission.
    const play = row({
      key: "p",
      eventSeq: 9,
      groupSequence: 9,
      team: "Ravens",
      event: "Pass",
    });
    const touchdown = row({
      key: "t",
      eventSeq: 10,
      groupSequence: 9,
      team: "Ravens",
      event: "Touchdown",
    });

    expect(undoPossessionTeamOfGroup(play, [touchdown, play], log())).toBeNull();
  });

  it("finds the touchdown and the try one undo removes", () => {
    const play = row({
      key: "p",
      eventSeq: 9,
      groupSequence: 9,
      team: "Ravens",
      event: "Pass",
    });
    const touchdown = row({
      key: "t",
      eventSeq: 10,
      groupSequence: 9,
      team: "Ravens",
      event: "Touchdown",
    });
    const conversion = row({
      key: "c",
      eventSeq: 12,
      groupSequence: 12,
      event: "1-Extra-Punkt",
    });

    expect(undoneTouchdown(play, [touchdown, play, conversion])?.key).toBe("t");
    expect(undoneTouchdown(conversion, [touchdown, play, conversion])).toBeNull();
    expect(undoneTry(conversion, [touchdown, play, conversion])?.key).toBe("c");
    expect(undoneTry(play, [touchdown, play, conversion])).toBeNull();
  });

  it("does not read a deleted row's group", () => {
    const play = row({
      key: "p",
      eventSeq: 9,
      groupSequence: 9,
      team: "Wolves",
      event: "Pass",
    });
    const turnover = row({
      key: "t",
      eventSeq: 10,
      groupSequence: 9,
      team: "Ravens",
      event: "Turnover",
      isDeleted: true,
    });

    expect(undoGroup(play, [turnover, play]).map((entry) => entry.key)).toEqual([
      "p",
    ]);
  });

  it("does not group rows of different submissions", () => {
    // 9 is already used by the scoring group: a row of group 6 must not borrow
    // its answer just because the numbers look close.
    const pass = row({
      key: "p",
      eventSeq: 6,
      groupSequence: 6,
      team: "Ravens",
      event: "Pass",
    });
    const touchdown = row({
      key: "t",
      eventSeq: 10,
      groupSequence: 9,
      team: "Ravens",
      event: "Touchdown",
    });

    expect(undoPossessionTeamOfGroup(pass, [touchdown, pass], log())).toBeNull();
  });

  it("does not let a deleted sibling answer for the group", () => {
    const play = row({
      key: "p",
      eventSeq: 9,
      groupSequence: 9,
      team: "Ravens",
      event: "Pass",
    });
    const touchdown = row({
      key: "t",
      eventSeq: 10,
      groupSequence: 9,
      team: "Ravens",
      event: "Touchdown",
      isDeleted: true,
    });

    expect(undoPossessionTeamOfGroup(play, [touchdown, play], log())).toBeNull();
  });

  it("never groups rows of the shared bucket", () => {
    // Penalties, clocks and first downs all carry group 0; two of them are not
    // one submission, and none of them moved the ball.
    const penalty = row({
      key: "s",
      eventSeq: 11,
      groupSequence: 0,
      team: "Ravens",
      event: "Strafe",
    });
    const clock = row({
      key: "z",
      eventSeq: 12,
      groupSequence: 0,
      team: "Ravens",
      event: "Touchdown",
    });

    expect(undoPossessionTeamOfGroup(penalty, [clock, penalty], log())).toBeNull();
  });
});
