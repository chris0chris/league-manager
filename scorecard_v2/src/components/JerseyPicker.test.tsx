import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { RosterPlayer } from "../api/types";
import JerseyPicker, {
  jerseyDigits,
  jerseyOptions,
  rosterSide,
} from "./JerseyPicker";

const ROSTER: RosterPlayer[] = [
  { side: "home", jersey: 23, name: "Schulz" },
  { side: "home", jersey: 7, name: "Meier" },
  { side: "home", jersey: 23, name: "Doppelt" },
  { side: "home", jersey: 42, name: null },
];

/** The same numbers, but the guests' side: the defender picker on a home pass. */
const AWAY_ROSTER: RosterPlayer[] = [
  { side: "away", jersey: 7, name: "Meier" },
  { side: "away", jersey: 42, name: null },
];

/** A checked roster never sends a name twice, but a broken one may: no name then. */
const NAMELESS_ROSTER: RosterPlayer[] = [
  { side: "home", jersey: 7, name: null },
  { side: "home", jersey: 9, name: null },
];

/** Controlled wrapper: the number field only works with a live `value`. */
function Harness({
  players,
  initial = null,
  onChange = vi.fn(),
}: {
  players: RosterPlayer[];
  initial?: number | null;
  onChange?: (jersey: number | null) => void;
}) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <JerseyPicker
      onChange={(jersey) => {
        setValue(jersey);
        onChange(jersey);
      }}
      players={players}
      value={value}
    />
  );
}

describe("JerseyPicker", () => {
  it("shows one button per jersey, sorted, with the surname", () => {
    render(
      <JerseyPicker onChange={vi.fn()} players={ROSTER} value={null} />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "7Meier",
      "23Schulz",
      "42",
    ]);
    expect(
      screen.getByRole("button", { name: "Trikotnummer 23, Schulz" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the picked jersey and marks it pressed", async () => {
    const onChange = vi.fn();
    render(<JerseyPicker onChange={onChange} players={ROSTER} value={23} />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Trikotnummer 7, Meier" }));

    expect(onChange).toHaveBeenCalledWith(7);
    expect(
      screen.getByRole("button", { name: "Trikotnummer 23, Schulz" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to a number field when there is no roster", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} players={[]} />);

    const input = screen.getByRole("textbox", { name: /Trikotnummer/ });
    await userEvent.setup().type(input, "51");

    expect(onChange).toHaveBeenLastCalledWith(51);
    expect(input).toHaveValue("51");
  });

  it("accepts digits only and clears to null", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} players={[]} />);

    const input = screen.getByRole("textbox", { name: /Trikotnummer/ });
    fireEvent.change(input, { target: { value: "1a2" } });
    expect(onChange).toHaveBeenLastCalledWith(12);

    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("disables the grid while disabled", () => {
    render(
      <JerseyPicker
        disabled
        onChange={vi.fn()}
        players={ROSTER}
        value={null}
      />,
    );

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });

  it("leads with the optional no-number tile and clears the choice with it", async () => {
    const onChange = vi.fn();
    render(
      <JerseyPicker
        onChange={onChange}
        optionalLabel="Ohne Nummer"
        players={ROSTER}
        value={7}
      />,
    );

    const none = screen.getByRole("button", { name: "Ohne Nummer" });
    expect(screen.getAllByRole("button")[0]).toBe(none);
    expect(none).toHaveAttribute("aria-pressed", "false");

    await userEvent.setup().click(none);

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("marks the optional tile pressed while no number is picked", () => {
    render(
      <JerseyPicker
        onChange={vi.fn()}
        optionalLabel="Ganzes Team"
        players={ROSTER}
        value={null}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Ganzes Team" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("renders a trailing nobody tile last and lets the sheet drive its state", async () => {
    const onSelect = vi.fn();
    render(
      <JerseyPicker
        onChange={vi.fn()}
        optionalLabel="Ohne Nummer"
        optionalSelected
        players={ROSTER}
        trailing={{ label: "Ganzes Team", selected: false, onSelect }}
        value={null}
      />,
    );

    const group = screen.getByRole("group", { name: "Trikotnummer" });
    const team = within(group).getByRole("button", { name: "Ganzes Team" });
    expect(group.lastElementChild).toBe(team);
    expect(team).toHaveAttribute("aria-pressed", "false");
    expect(
      within(group).getByRole("button", { name: "Ohne Nummer" }),
    ).toHaveAttribute("aria-pressed", "true");

    await userEvent.setup().click(team);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("names the group separately from the button prefix", () => {
    render(
      <JerseyPicker
        groupLabel="Trikotnummer (optional)"
        label="Trikot"
        onChange={vi.fn()}
        players={ROSTER}
        value={null}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Trikotnummer (optional)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Trikot 23, Schulz" }),
    ).toBeInTheDocument();
  });

  it("renders the compact variant as one wrapping row of the same tiles", () => {
    render(
      <JerseyPicker
        compact
        onChange={vi.fn()}
        players={ROSTER}
        value={23}
      />,
    );

    const row = screen.getByRole("group", { name: "Trikotnummer" });
    expect(row).toHaveClass("choicerow");
    expect(
      within(row).getByRole("button", { name: "Trikotnummer 23, Schulz" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("colours the number tiles with the home team", () => {
    render(<JerseyPicker onChange={vi.fn()} players={ROSTER} value={23} />);

    const tile = screen.getByRole("button", { name: "Trikotnummer 23, Schulz" });
    expect(tile).toHaveClass("choice-home");
    // The picked number fills the surface, so colour is not the only signal.
    expect(tile).toHaveClass("sel");
    expect(
      screen.getByRole("button", { name: "Trikotnummer 7, Meier" }),
    ).toHaveClass("choice-home");
  });

  it("colours the number tiles with the guests' team", () => {
    // The defender picker on a pass by the home side: the numbers belong to
    // the away team, so the pad must read green even though home has the ball.
    render(
      <JerseyPicker onChange={vi.fn()} players={AWAY_ROSTER} value={null} />,
    );

    expect(
      screen.getByRole("button", { name: "Trikotnummer 7, Meier" }),
    ).toHaveClass("choice-away");
    expect(
      screen.getByRole("button", { name: "Trikotnummer 42" }),
    ).toHaveClass("choice-away");
  });

  it("keeps the nobody tile neutral: it names no jersey", () => {
    render(
      <JerseyPicker
        onChange={vi.fn()}
        optionalLabel="Ohne Nummer"
        players={ROSTER}
        value={null}
      />,
    );

    const none = screen.getByRole("button", { name: "Ohne Nummer" });
    expect(none).not.toHaveClass("choice-home");
    expect(none).not.toHaveClass("choice-away");
  });

  it("colours the keypad with the side as well", () => {
    const big: RosterPlayer[] = Array.from({ length: 30 }, (_, index) => ({
      side: "away" as const,
      jersey: index + 1,
      name: `Spieler${index + 1}`,
    }));
    render(
      <JerseyPicker onChange={vi.fn()} players={big} value={null} />,
    );

    const keys = within(screen.getByRole("group", { name: "Ziffern" }));
    expect(keys.getByRole("button", { name: "7" })).toHaveClass("keypad-away");
  });

  it("stays neutral when the roster names no single side", () => {
    render(
      <JerseyPicker
        onChange={vi.fn()}
        players={[{ side: "home", jersey: 7, name: "Meier" }, ...AWAY_ROSTER]}
        value={null}
      />,
    );

    const tile = screen.getByRole("button", { name: "Trikotnummer 7, Meier" });
    expect(tile).not.toHaveClass("choice-home");
    expect(tile).not.toHaveClass("choice-away");
  });

  it("shows a number without a name when the passcheck has none for it", () => {
    // A roster without a passcheck comes back without names (the server sends
    // `name: null`): the pad shows the plain numbers and never a borrowed name.
    render(
      <JerseyPicker onChange={vi.fn()} players={NAMELESS_ROSTER} value={7} />,
    );

    const tile = screen.getByRole("button", { name: "Trikotnummer 7" });
    expect(tile).toHaveTextContent(/^7$/);
    expect(tile).toHaveClass("sel");
  });

  it("offers the optional choice in keypad mode too", async () => {
    const big: RosterPlayer[] = Array.from({ length: 30 }, (_, index) => ({
      side: "home" as const,
      jersey: index + 1,
      name: `Spieler${index + 1}`,
    }));
    const onChange = vi.fn();
    render(
      <JerseyPicker
        onChange={onChange}
        optionalLabel="Ohne Nummer"
        players={big}
        value={12}
      />,
    );

    const none = screen.getByRole("button", { name: "Ohne Nummer" });
    expect(none).toHaveAttribute("aria-pressed", "false");
    await userEvent.setup().click(none);

    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe("jerseyOptions", () => {  it("keeps the first row of a duplicated number", () => {
    expect(jerseyOptions(ROSTER)).toEqual([
      { jersey: 7, name: "Meier" },
      { jersey: 23, name: "Schulz" },
      { jersey: 42, name: null },
    ]);
  });

  it("strips anything that is not a jersey digit", () => {
    expect(jerseyDigits("5a1")).toBe("51");
    expect(jerseyDigits("123")).toBe("12");
    expect(jerseyDigits("")).toBe("");
  });
});

describe("rosterSide", () => {
  it("reads the side off the roster the caller already filtered", () => {
    expect(rosterSide(ROSTER)).toBe("home");
    expect(rosterSide(AWAY_ROSTER)).toBe("away");
  });

  it("has no side without players, or with a roster of both teams", () => {
    expect(rosterSide([])).toBeNull();
    expect(rosterSide([...ROSTER, ...AWAY_ROSTER])).toBeNull();
  });
});
