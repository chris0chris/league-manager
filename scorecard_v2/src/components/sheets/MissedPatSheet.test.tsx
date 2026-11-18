import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../../api/client";
import type { GameLogEventInput, RosterPlayer } from "../../api/types";
import MissedPatSheet, { missedPatEvent } from "./MissedPatSheet";

const ROSTER: RosterPlayer[] = [
  { side: "home", jersey: 7, name: "Meier" },
  { side: "home", jersey: 23, name: "Schulz" },
  { side: "away", jersey: 11, name: "Wolf" },
];

type Submit = (events: GameLogEventInput[]) => Promise<void>;

function renderSheet(
  overrides: {
    roster?: RosterPlayer[] | null;
    initialJersey?: number | null;
    onSubmit?: Submit;
  } = {},
) {
  const onSubmit = overrides.onSubmit ?? vi.fn<Submit>(async () => undefined);
  const onClose = vi.fn();
  render(
    <MissedPatSheet
      initialJersey={overrides.initialJersey}
      lastQuarterback={7}
      onClose={onClose}
      onSubmit={onSubmit}
      opponentName="Wolves"
      roster={overrides.roster === undefined ? ROSTER : overrides.roster}
      side="home"
      teamName="Ravens"
    />,
  );
  return { onClose, onSubmit };
}

function saveButton(): HTMLElement {
  return screen.getByRole("button", { name: /Nicht verwandelt speichern/ });
}

describe("missedPatEvent", () => {
  it("keeps the try's name and marks the row as worth nothing", () => {
    expect(missedPatEvent({ points: 1 })).toEqual({
      name: "1-Extra-Punkt",
      input: "nicht verwandelt",
      payload: { missed: true },
    });
    expect(missedPatEvent({ points: 2 })).toMatchObject({
      name: "2-Extra-Punkte",
    });
  });

  it("carries the thrower, the intended receiver and the defender", () => {
    expect(
      missedPatEvent({
        points: 1,
        jersey: 23,
        qb: 7,
        defender: 11,
        deflection: true,
      }),
    ).toEqual({
      name: "1-Extra-Punkt",
      player: 23,
      input: "nicht verwandelt · QB #7 · Deflection #11",
      payload: {
        missed: true,
        qb: 7,
        defense: { player: 11, deflection: true },
      },
    });
  });

  it("says Tackle when the defender made the stop", () => {
    const event = missedPatEvent({ points: 2, defender: 11 });
    expect(event.input).toBe("nicht verwandelt · Tackle #11");
    expect(event.payload).toEqual({
      missed: true,
      defense: { player: 11, deflection: false },
    });
  });
});

describe("MissedPatSheet", () => {
  it("saves the bare miss in one tap, one point by default", async () => {
    const { onClose, onSubmit } = renderSheet();
    const user = userEvent.setup();

    expect(saveButton()).toBeEnabled();
    await user.click(saveButton());

    // The remembered quarterback is a default, not a requirement: the plain
    // miss is the row the official gets without touching anything.
    expect(onSubmit).toHaveBeenCalledWith([
      {
        name: "1-Extra-Punkt",
        input: "nicht verwandelt · QB #7",
        payload: { missed: true, qb: 7 },
      },
    ]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("records the two-point attempt the official picked", async () => {
    const onSubmit = vi.fn<Submit>(async () => undefined);
    renderSheet({ onSubmit });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "2 Punkte" }));
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({ name: "2-Extra-Punkte" }),
    ]);
  });

  it("pre-selects the touchdown's scorer as the intended receiver", async () => {
    const onSubmit = vi.fn<Submit>(async () => undefined);
    renderSheet({ initialJersey: 23, onSubmit });
    const user = userEvent.setup();

    expect(
      screen.getByRole("button", { name: /^Trikot 23, Schulz/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({ player: 23 }),
    ]);
  });

  it("offers the scoring side's jerseys and the defender's side", async () => {
    const onSubmit = vi.fn<Submit>(async () => undefined);
    renderSheet({ onSubmit });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /^Trikot 23, Schulz/ }),
    );
    await user.click(
      within(screen.getByRole("group", { name: "Deflection" })).getByRole(
        "button",
        { name: "Deflection" },
      ),
    );
    expect(
      screen.getByText(/Deflection Wolves \(optional\)/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /^Defense 11, Wolf/ }),
    );
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([
      {
        name: "1-Extra-Punkt",
        player: 23,
        input: "nicht verwandelt · QB #7 · Deflection #11",
        payload: {
          missed: true,
          qb: 7,
          defense: { player: 11, deflection: true },
        },
      },
    ]);
  });

  it("keeps the sheet open with the server detail when the write fails", async () => {
    const onSubmit = vi.fn<Submit>(async () => {
      throw new ApiError(500, { detail: "Server weg" }, "Server weg");
    });
    const { onClose } = renderSheet({ onSubmit });

    await userEvent.setup().click(saveButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Server weg");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("waits for the roster instead of guessing it is empty", () => {
    renderSheet({ roster: null });

    // The jersey grids are empty until the roster lands; the save still works.
    expect(
      screen.queryByRole("button", { name: /^Trikotnummer 23/ }),
    ).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });
});
