import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RosterPlayer } from "../../api/types";
import { FIRST_AND_TEN, seriesAt } from "../../app/drive";
import PlaySheet, {
  playEvent,
  playEvents,
  playInput,
  playName,
  resultOptions,
  stepsFor,
} from "./PlaySheet";
import { yardsValue } from "./yards";

const ROSTER: RosterPlayer[] = [
  { side: "home", jersey: 7, name: "Meier" },
  { side: "home", jersey: 12, name: "Kern" },
  { side: "home", jersey: 23, name: "Schulz" },
  { side: "away", jersey: 11, name: "Wolf" },
];

function renderSheet(
  overrides: Partial<Parameters<typeof PlaySheet>[0]> = {},
): { onSubmit: ReturnType<typeof vi.fn>; onClose: ReturnType<typeof vi.fn> } {
  const onSubmit = vi.fn(async () => undefined);
  const onClose = vi.fn();
  render(
    <PlaySheet
      onClose={onClose}
      onSubmit={onSubmit}
      roster={ROSTER}
      side="home"
      teamName="Ravens"
      {...overrides}
    />,
  );
  return { onClose, onSubmit };
}

type User = ReturnType<typeof userEvent.setup>;

async function next(user: User, times = 1): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await user.click(screen.getByRole("button", { name: "Weiter" }));
  }
}

async function setYards(user: User, value: string): Promise<void> {
  const yards = screen.getByRole("textbox", { name: /Raumgewinn|Raumverlust/ });
  await user.clear(yards);
  await user.type(yards, value);
}

describe("PlaySheet helpers", () => {
  it("names the row by play type and pass result", () => {
    expect(playName("pass", true)).toBe("Pass");
    expect(playName("pass", false)).toBe("Pass unvollständig");
    expect(playName("run", true)).toBe("Run");
    expect(playName("sack", true)).toBe("Sack");
  });

  it("writes the visible text of a complete pass", () => {
    expect(playInput({ type: "pass", complete: true, yards: 8, qb: 12 })).toBe(
      "8 Yards · QB #12",
    );
  });

  it("drops the yards of an incomplete pass but keeps the thrower", () => {
    expect(
      playInput({ type: "pass", complete: false, yards: 0, qb: 12 }),
    ).toBe("QB #12");
  });

  it("writes the loss of a sack as words", () => {
    expect(playInput({ type: "sack", complete: true, yards: 5, qb: null })).toBe(
      "5 Yards Verlust",
    );
  });

  it("stores the yards signed, so a sack is a loss", () => {
    const sack = playEvent({
      type: "sack",
      complete: true,
      yards: 5,
      qb: null,
      player: 12,
    });
    expect(sack).toEqual({
      name: "Sack",
      player: 12,
      input: "5 Yards Verlust",
      payload: { yards: -5 },
    });

    const pass = playEvent({
      type: "pass",
      complete: true,
      yards: 8,
      qb: 12,
      player: 7,
    });
    expect(pass).toEqual({
      name: "Pass",
      player: 7,
      input: "8 Yards · QB #12",
      payload: { yards: 8, complete: true, qb: 12 },
    });
  });

  it("keeps the payload free of details that do not apply", () => {
    expect(
      playEvent({ type: "run", complete: true, yards: 14, qb: 12, player: 23 }),
    ).toEqual({
      name: "Run",
      player: 23,
      input: "14 Yards",
      payload: { yards: 14 },
    });
  });

  it("appends a safety for the defence", () => {
    expect(
      playEvents({
        type: "run",
        complete: true,
        yards: -5,
        qb: null,
        player: 23,
        safety: true,
      }),
    ).toEqual([
      expect.objectContaining({ name: "Run", payload: { yards: -5 } }),
      { name: "Safety (+2)", payload: { defense: true } },
    ]);
  });

  it("appends the interception and an optional pick six", () => {
    const events = playEvents({
      type: "pass",
      complete: false,
      yards: 0,
      qb: 12,
      player: null,
      defender: 11,
      interception: { deadBall: 30, returnYards: 5, pickSix: true },
    });

    expect(events[0]).toMatchObject({ name: "Pass unvollständig" });
    expect(events[1]).toMatchObject({
      name: "Interception",
      player: 11,
      input: "bis B20 · 5 Yards Return",
      payload: { deadBall: 30, returnYards: 5, defense: true },
    });
    expect(events[2]).toEqual({
      name: "Touchdown",
      player: 11,
      payload: { defense: true },
    });
  });

  it("knows which results a type can produce", () => {
    expect(resultOptions("pass").map((option) => option.label)).toEqual([
      "Complete",
      "Incomplete",
      "Touchdown",
      "Safety",
      "Interception",
    ]);
    expect(resultOptions("sack").map((option) => option.label)).toEqual([
      "Sack",
      "Safety",
    ]);
  });

  it("skips the steps that do not apply", () => {
    // The field position is the last step: numbers first, then the spot.
    expect(stepsFor("run", "gain")).toEqual([
      "type",
      "result",
      "player",
      "defender",
      "distance",
    ]);
    expect(stepsFor("sack", "gain")).toEqual([
      "type",
      "result",
      "player",
      "distance",
    ]);
    expect(stepsFor("pass", "interception")).toEqual([
      "type",
      "result",
      "qb",
      "interception",
    ]);
    // A touchdown has no tackler: the player carrying the ball scored.
    expect(stepsFor("run", "touchdown")).toEqual([
      "type",
      "result",
      "player",
      "distance",
    ]);
    expect(stepsFor("pass", "touchdown")).toEqual([
      "type",
      "result",
      "qbplayer",
      "distance",
    ]);
    expect(stepsFor("pass", "gain")).toEqual([
      "type",
      "result",
      "qbplayer",
      "defender",
      "distance",
    ]);
    expect(stepsFor("pass", "incomplete")).toEqual([
      "type",
      "result",
      "qbplayer",
      "defender",
    ]);
  });

  it("reads the yards field as a signed two-digit number", () => {
    expect(yardsValue("8")).toBe(8);
    expect(yardsValue("-5")).toBe(-5);
    expect(yardsValue("")).toBeNull();
    expect(yardsValue("-")).toBeNull();
    expect(yardsValue("1a2")).toBe(12);
    expect(yardsValue("123")).toBe(12);
  });
});

describe("PlaySheet wizard", () => {
  it("records a pass with receiver, yards and thrower", async () => {
    const user = userEvent.setup();
    const { onSubmit, onClose } = renderSheet({ lastQuarterback: 12 });

    await next(user); // type → result
    await next(user); // result → qb + receiver
    await user.click(screen.getByRole("button", { name: "Trikot 7, Meier" }));
    await next(user); // receiver → defender
    await next(user); // defender → field position
    await setYards(user, "8");
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      {
        name: "Pass",
        player: 7,
        input: "8 Yards · QB #12",
        payload: { yards: 8, complete: true, qb: 12 },
      },
    ]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the remembered thrower as a number with ändern", async () => {
    const user = userEvent.setup();
    renderSheet({ lastQuarterback: 12 });

    await next(user, 2); // type → result → qb + receiver

    expect(screen.getByText("#12")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ändern" }),
    ).toBeInTheDocument();
  });

  it("refuses to leave the QB step before a quarterback is picked", async () => {
    const user = userEvent.setup();
    renderSheet();

    await next(user, 2); // type → result → qb

    expect(screen.getByText("Bitte den Quarterback wählen.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weiter" })).toBeDisabled();
  });

  it("records a negative gain for a short pass carried backwards", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ lastQuarterback: 12 });

    await next(user, 2); // type → result → qb + receiver
    await user.click(screen.getByRole("button", { name: "Trikot 7, Meier" }));
    await next(user); // receiver → defender
    await next(user); // defender → field position
    await setYards(user, "4");
    await user.click(screen.getByRole("button", { name: "Verlust" }));
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      {
        name: "Pass",
        player: 7,
        input: "4 Yards Verlust · QB #12",
        payload: { yards: -4, complete: true, qb: 12 },
      },
    ]);
  });

  it("records a run without a quarterback or a pass result", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet();

    await user.click(screen.getByRole("button", { name: "Run" }));
    await next(user); // type → result
    await next(user); // result → player
    await user.click(screen.getByRole("button", { name: "Trikot 23, Schulz" }));
    await next(user); // player → defender
    await next(user); // defender → field position
    await setYards(user, "14");
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      {
        name: "Run",
        player: 23,
        input: "14 Yards",
        payload: { yards: 14 },
      },
    ]);
  });

  it("records an incomplete pass towards a receiver", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ lastQuarterback: 12 });

    await next(user); // type
    await user.click(screen.getByRole("button", { name: "Incomplete" }));
    await next(user); // result → qb + receiver
    await user.click(screen.getByRole("button", { name: "Trikot 7, Meier" }));
    await next(user); // receiver → defender
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      {
        name: "Pass unvollständig",
        player: 7,
        input: "QB #12",
        payload: { yards: 0, complete: false, qb: 12 },
      },
    ]);
  });

  it("records a sack as a loss", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet();

    await user.click(screen.getByRole("button", { name: "Sack" }));
    await next(user); // type → result
    await next(user); // result → player (no QB, no defender)
    await user.click(screen.getByRole("button", { name: "Trikot 12, Kern" }));
    await next(user); // player → field position
    await setYards(user, "5");
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      {
        name: "Sack",
        player: 12,
        input: "5 Yards Verlust",
        payload: { yards: -5 },
      },
    ]);
  });

  it("lists the defender who made the tackle, from the other team", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ lastQuarterback: 12 });

    await next(user); // type → result
    await next(user); // result → qb + receiver
    await user.click(
      await screen.findByRole("button", { name: "Trikot 7, Meier" }),
    );
    await next(user); // receiver → defender
    await user.click(screen.getByRole("button", { name: "Defense 11, Wolf" }));
    await next(user); // defender → field position
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      {
        name: "Pass",
        player: 7,
        input: "0 Yards · QB #12 · Tackle #11",
        payload: {
          yards: 0,
          complete: true,
          qb: 12,
          defense: { player: 11 },
        },
      },
    ]);
  });

  it("records a deflection on an incomplete pass", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ lastQuarterback: 12 });

    await next(user);
    await user.click(screen.getByRole("button", { name: "Incomplete" }));
    await next(user); // result → qb + receiver
    await next(user); // receiver → defender
    await user.click(screen.getByRole("button", { name: "Deflection" }));
    await user.click(
      await screen.findByRole("button", { name: "Defense 11, Wolf" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      {
        name: "Pass unvollständig",
        input: "QB #12 · Deflection #11",
        payload: {
          yards: 0,
          complete: false,
          qb: 12,
          defense: { player: 11, deflection: true },
        },
      },
    ]);
  });

  it("offers no defender on a sack", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Sack" }));
    await next(user, 2); // type → result → player

    expect(screen.queryByRole("group", { name: "Deflection" })).toBeNull();
    expect(
      screen.queryByRole("group", { name: "Trikotnummer Defense" }),
    ).toBeNull();
  });

  it("previews the next down & distance from the play", async () => {
    const user = userEvent.setup();
    renderSheet({ drive: FIRST_AND_TEN });

    await user.click(screen.getByRole("button", { name: "Run" }));
    await next(user); // type → result
    await next(user); // result → player
    await next(user); // player → defender
    await next(user); // defender → field position
    await setYards(user, "14");

    expect(screen.getByRole("status")).toHaveTextContent("2nd & M · A19");
  });

  it("takes the end spot instead of the yards", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ drive: FIRST_AND_TEN });

    await user.click(screen.getByRole("button", { name: "Run" }));
    await next(user); // type → result
    await next(user); // result → player
    await user.click(screen.getByRole("button", { name: "Trikot 23, Schulz" }));
    await next(user); // player → defender
    await next(user); // defender → field position
    await user.click(screen.getByRole("button", { name: "Feldposition" }));
    await user.click(screen.getByRole("button", { name: "B · gegnerische" }));
    await user.type(screen.getByRole("textbox", { name: /Feldposition/ }), "20");

    expect(screen.getByRole("status")).toHaveTextContent("1st & G · B20");

    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Run",
        player: 23,
        payload: { yards: 25 },
      }),
    ]);
  });

  it("prefills the distance to the end zone on a touchdown", async () => {
    const user = userEvent.setup();
    renderSheet({ drive: seriesAt(45) });

    await user.click(screen.getByRole("button", { name: "Run" }));
    await next(user);
    await user.click(screen.getByRole("button", { name: "Touchdown" }));
    await next(user); // result → player
    await next(user); // player → field position

    expect(
      screen.getByRole("textbox", { name: /Raumgewinn/ }),
    ).toHaveValue("5");
    // T4: no loss switch on a touchdown.
    expect(screen.queryByRole("button", { name: "Verlust" })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Touchdown");
  });

  it("previews a failed fourth down as a turnover", async () => {
    const user = userEvent.setup();
    renderSheet({ drive: { down: 4, toGo: 5, ballOn: 20, goal: false } });

    await user.click(screen.getByRole("button", { name: "Run" }));
    await next(user); // type → result
    await next(user); // result → player
    await next(user); // player → defender
    await next(user); // defender → field position
    await setYards(user, "3");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Turnover on downs",
    );
  });

  it("prefills the run to the own goal line on a safety", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ drive: seriesAt(5) });

    await user.click(screen.getByRole("button", { name: "Run" }));
    await next(user);
    await user.click(screen.getByRole("button", { name: "Safety" }));
    await next(user); // result → player
    await user.click(screen.getByRole("button", { name: "Trikot 23, Schulz" }));
    await next(user); // player → defender
    await next(user); // defender → field position
    expect(screen.getByRole("textbox", { name: /Raumverlust/ })).toHaveValue(
      "5",
    );
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({ name: "Run", payload: { yards: -5 } }),
      { name: "Safety (+2)", payload: { defense: true } },
    ]);
  });

  it("offers safety on a pass too (any play can end in one)", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({
      drive: seriesAt(5),
      lastQuarterback: 12,
    });

    await next(user); // type → result
    await user.click(screen.getByRole("button", { name: "Safety" }));
    await next(user); // result → qb + receiver
    await user.click(screen.getByRole("button", { name: "Trikot 23, Schulz" }));
    await next(user); // receiver → defender
    await next(user); // defender → field position
    expect(screen.getByRole("textbox", { name: /Raumverlust/ })).toHaveValue(
      "5",
    );
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Pass",
        payload: expect.objectContaining({ yards: -5 }),
      }),
      { name: "Safety (+2)", payload: { defense: true } },
    ]);
  });

  it("drops the pick six when the return yards are typed afterwards", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ lastQuarterback: 12 });

    await next(user); // type
    await user.click(screen.getByRole("button", { name: "Interception" }));
    await next(user, 2); // result → qb → interception
    await user.click(
      screen.getByRole("button", { name: "Pick six (Touchdown)" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: /Return-Yards/ }),
      "12",
    );
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    // Typing yards means the defender was tackled: the play is no touchdown.
    expect(
      screen.queryByRole("button", { name: "Pick six (Touchdown)" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({ name: "Pass unvollständig" }),
      expect.objectContaining({
        name: "Interception",
        payload: expect.objectContaining({ returnYards: 12, defense: true }),
      }),
    ]);
  });

  it("selects the prefilled zero so the next number replaces it", async () => {
    const user = userEvent.setup();
    renderSheet({ drive: FIRST_AND_TEN, lastQuarterback: 12 });

    await next(user); // type → result
    await next(user); // result → qb + receiver
    await next(user); // receiver → defender
    await next(user); // defender → field position
    const yards = screen.getByRole("textbox", {
      name: /Raumgewinn \/ Verlust/,
    });

    await user.click(yards);

    expect(yards).toHaveValue("0");
    expect(yards).toHaveProperty("selectionStart", 0);
    expect(yards).toHaveProperty("selectionEnd", 1);
  });

  it("records an interception with the catch spot and the return", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ lastQuarterback: 12 });

    await next(user); // type
    await user.click(screen.getByRole("button", { name: "Interception" }));
    await next(user, 2); // result → qb → interception
    expect(screen.getByText("Trikotnummer Verteidiger (optional)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Defense 11, Wolf" }));
    // Caught at B4 — in the throwing offence's orientation — and carried 5
    // yards the other way, to B9. The new offence starts on its own 9.
    await user.click(screen.getByRole("button", { name: "B · gegnerische" }));
    await user.type(
      screen.getByRole("textbox", { name: /Feldposition/ }),
      "4",
    );
    await user.type(
      screen.getByRole("textbox", { name: /Return-Yards/ }),
      "5",
    );

    expect(screen.getByText(/Ballbesitz ab A9/)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({ name: "Pass unvollständig" }),
      expect.objectContaining({
        name: "Interception",
        player: 11,
        payload: expect.objectContaining({
          deadBall: 9,
          returnYards: 5,
          defense: true,
        }),
      }),
    ]);
  });

  it("lists the interception's spot from the new offence's side", async () => {
    const user = userEvent.setup();
    renderSheet({ lastQuarterback: 12 });

    await next(user); // type
    await user.click(screen.getByRole("button", { name: "Interception" }));
    await next(user, 2); // result → qb → interception
    await user.click(screen.getByRole("button", { name: "B · gegnerische" }));
    await user.type(
      screen.getByRole("textbox", { name: /Feldposition/ }),
      "20",
    );

    // caught at B20 (the half the throwing offence was attacking) and downed
    // there: the intercepting team's own 20 is A20
    expect(screen.getByText(/Ballbesitz ab A20/)).toBeInTheDocument();
  });

  it("records a pick six without a dead-ball spot", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ lastQuarterback: 12 });

    await next(user); // type
    await user.click(screen.getByRole("button", { name: "Interception" }));
    await next(user, 2); // result → qb → interception
    await user.click(screen.getByRole("button", { name: "Defense 11, Wolf" }));
    await user.click(
      screen.getByRole("button", { name: "Pick six (Touchdown)" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({ name: "Pass unvollständig" }),
      expect.objectContaining({
        name: "Interception",
        player: 11,
        payload: { defense: true },
      }),
      { name: "Touchdown", player: 11, payload: { defense: true } },
    ]);
  });

  it("goes back a step without losing the entry", async () => {
    const user = userEvent.setup();
    renderSheet({ lastQuarterback: 12 });

    await next(user); // type → result
    expect(screen.getByText(/Schritt 2 von/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Zurück" }));

    expect(screen.getByText(/Schritt 1 von/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pass" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to Raumgewinn when a type cannot produce the result", async () => {
    const user = userEvent.setup();
    renderSheet({ lastQuarterback: 12 });

    await next(user); // type → result
    await user.click(screen.getByRole("button", { name: "Interception" }));
    await user.click(screen.getByRole("button", { name: "Zurück" }));
    await user.click(screen.getByRole("button", { name: "Run" }));
    await next(user); // type → result

    expect(
      screen.getByRole("button", { name: "Raumgewinn" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("switches back from the end spot to yards and between halves", async () => {
    const user = userEvent.setup();
    renderSheet({ drive: FIRST_AND_TEN, lastQuarterback: 12 });

    await next(user); // type → result
    await next(user); // result → qb + receiver
    await next(user); // receiver → defender
    await next(user); // defender → field position
    await user.click(screen.getByRole("button", { name: "Feldposition" }));
    await user.click(screen.getByRole("button", { name: "B · gegnerische" }));
    await user.click(screen.getByRole("button", { name: "A · eigene" }));
    await user.click(screen.getByRole("button", { name: "Yards" }));

    expect(
      screen.getByRole("textbox", { name: /Raumgewinn/ }),
    ).toBeInTheDocument();
  });

  it("switches the loss back to a gain", async () => {
    const user = userEvent.setup();
    renderSheet({ lastQuarterback: 12 });

    await next(user); // type → result
    await next(user); // result → qb + receiver
    await next(user); // receiver → defender
    await next(user); // defender → field position
    await user.click(screen.getByRole("button", { name: "Verlust" }));
    await user.click(screen.getByRole("button", { name: "Gewinn" }));

    expect(
      screen.getByRole("button", { name: "Gewinn" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the sheet open with the reason when the write fails", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {
      throw new Error("kaputt");
    });
    renderSheet({ lastQuarterback: 12, onSubmit });

    await next(user); // type → result
    await next(user); // result → qb + receiver
    await user.click(screen.getByRole("button", { name: "Trikot 7, Meier" }));
    await next(user); // receiver → defender
    await next(user); // defender → field position
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Der Spielzug konnte nicht gespeichert werden",
    );
  });

  it("calls the distance step Feldposition without saying Spielfeldlinie", async () => {
    const user = userEvent.setup();
    renderSheet({ lastQuarterback: 12 });

    await next(user); // type → result
    await next(user); // result → qb + receiver
    await next(user); // receiver → defender
    await next(user); // defender → field position

    expect(
      screen.getByRole("button", { name: "Feldposition" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Spielfeldlinie/)).toBeNull();
  });

  it("preselects the half the ball is on for the field position", async () => {
    const user = userEvent.setup();
    renderSheet({ drive: seriesAt(30), lastQuarterback: 12 });

    await next(user); // type → result
    await next(user); // result → qb + receiver
    await next(user); // receiver → defender
    await next(user); // defender → field position
    await user.click(screen.getByRole("button", { name: "Feldposition" }));

    expect(
      screen.getByRole("button", { name: "B · gegnerische" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("preselects the own half for a ball in the own half, and A on midfield", async () => {
    const user = userEvent.setup();
    renderSheet({ drive: seriesAt(10), lastQuarterback: 12 });

    await next(user); // type → result
    await next(user); // result → qb + receiver
    await next(user); // receiver → defender
    await next(user); // defender → field position
    await user.click(screen.getByRole("button", { name: "Feldposition" }));

    expect(screen.getByRole("button", { name: "A · eigene" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps A on exactly midfield", async () => {
    const user = userEvent.setup();
    renderSheet({ drive: seriesAt(25), lastQuarterback: 12 });

    await next(user); // type → result
    await next(user); // result → qb + receiver
    await next(user); // receiver → defender
    await next(user); // defender → field position
    await user.click(screen.getByRole("button", { name: "Feldposition" }));

    expect(screen.getByRole("button", { name: "A · eigene" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("the touchdown is the play's result", () => {
  it("records the play and its touchdown in one submission", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ lastQuarterback: 12 });

    await next(user); // type
    await user.click(screen.getByRole("button", { name: "Touchdown" }));
    await next(user); // result → qb + receiver
    await user.click(screen.getByRole("button", { name: "Trikot 7, Meier" }));
    await next(user); // receiver → field position
    // The field position is the last step: it saves.
    expect(
      screen.queryByRole("button", { name: "Weiter" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({ name: "Pass", player: 7 }),
      { name: "Touchdown", player: 7 },
    ]);
  });

  it("keeps the touchdown when no number is picked — a team score", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ lastQuarterback: 12 });

    await user.click(screen.getByRole("button", { name: "Run" }));
    await next(user); // type
    await user.click(screen.getByRole("button", { name: "Touchdown" }));
    await next(user, 2); // result → player → field position
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    // IFAF R 8-1-1: the points are the team's, the jersey is detail.
    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({ name: "Run" }),
      { name: "Touchdown" },
    ]);
  });

  it("takes the touchdown back when the official changes their mind", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ lastQuarterback: 12 });

    await next(user);
    await user.click(screen.getByRole("button", { name: "Touchdown" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));
    await next(user); // result → qb + receiver
    await user.click(screen.getByRole("button", { name: "Trikot 7, Meier" }));
    await next(user); // receiver → defender
    await next(user); // defender → field position
    await user.click(
      screen.getByRole("button", { name: "Spielzug speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({ name: "Pass" }),
    ]);
    expect(onSubmit.mock.calls[0][0]).toHaveLength(1);
  });

  it("offers no touchdown for a sack", async () => {
    const user = userEvent.setup();
    renderSheet({});

    await user.click(screen.getByRole("button", { name: "Sack" }));
    await next(user);

    expect(screen.queryByRole("button", { name: "Touchdown" })).toBeNull();
  });
});
