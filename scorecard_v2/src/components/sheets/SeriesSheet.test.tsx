import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../../api/client";
import type { GameLogEventInput, RosterPlayer } from "../../api/types";
import SeriesSheet, {
  interceptionEvent,
  isTimeMode,
  maxMinutes,
  timeError,
  type SeriesMode,
  type TimeoutRecord,
} from "./SeriesSheet";

const ROSTER: RosterPlayer[] = [
  { side: "home", jersey: 7, name: "Meier" },
  { side: "home", jersey: 23, name: "Schulz" },
  { side: "away", jersey: 11, name: "Wolf" },
];

type Submit = (events: GameLogEventInput[]) => Promise<void>;

function renderSheet(
  mode: SeriesMode,
  onSubmit?: Submit,
  roster: RosterPlayer[] | null = ROSTER,
  timeouts: TimeoutRecord[] = [],
) {
  const submit = onSubmit ?? vi.fn<Submit>(async () => undefined);
  const onClose = vi.fn();
  render(
    <SeriesSheet
      mode={mode}
      onClose={onClose}
      onSubmit={submit}
      opponentName="Wolves"
      roster={roster}
      side="home"
      teamName="Ravens"
      timeouts={timeouts}
    />,
  );
  return { onClose, onSubmit: submit };
}

function saveButton(): HTMLElement {
  return screen.getByRole("button", { name: /^(Speichern|Speichern …)$/ });
}

describe("SeriesSheet", () => {
  it("records a first down with the yards that moved the chains", async () => {
    const { onSubmit } = renderSheet("first");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Trikot 23, Schulz" }));
    await user.type(
      screen.getByRole("textbox", { name: /Raumgewinn/ }),
      "6",
    );
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([
      {
        name: "First Down",
        player: 23,
        input: "6 Yards",
        payload: { yards: 6 },
      },
    ]);
  });

  it("keeps the yards out of the payload when the field is empty", async () => {
    const { onSubmit } = renderSheet("first");
    const user = userEvent.setup();

    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([{ name: "First Down" }]);
  });

  it("records a first down with a jersey", async () => {
    const { onSubmit } = renderSheet("first");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Trikot 23, Schulz" }));
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([
      { name: "First Down", player: 23 },
    ]);
  });

  it("records a first down without a jersey", async () => {
    const { onSubmit } = renderSheet("first");

    await userEvent.setup().click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([{ name: "First Down" }]);
  });

  it("records a turnover without a player", async () => {
    const { onSubmit } = renderSheet("turnover");

    expect(
      screen.queryByRole("group", { name: "Trikotnummer (optional)" }),
    ).not.toBeInTheDocument();
    await userEvent.setup().click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([{ name: "Turnover" }]);
    expect(screen.getByText(/im Spielverlauf/)).toBeInTheDocument();
  });

  it("records an interception for the defender with the defender's jersey", async () => {
    const { onSubmit } = renderSheet("interception");
    const user = userEvent.setup();

    expect(
      screen.getByRole("group", {
        name: "Trikotnummer Verteidiger (optional)",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Trikot 7, Meier" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Trikot 11, Wolf" }));
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([
      { name: "Interception", player: 11 },
    ]);
    expect(screen.getByText(/Interception durch Wolves/)).toBeInTheDocument();
    expect(
      screen.getByText(/Ballbesitz wechselt im Spielverlauf zu Wolves/),
    ).toBeInTheDocument();
  });

  it("records an interception without a jersey", async () => {
    const { onSubmit } = renderSheet("interception");

    await userEvent.setup().click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([{ name: "Interception" }]);
  });

  it("opens the Spielzeit with the minutes field focused", () => {
    renderSheet("time");

    expect(screen.getByRole("textbox", { name: "Minuten" })).toHaveFocus();
  });

  it("jumps to the seconds field after two minute digits", async () => {
    renderSheet("time");
    const user = userEvent.setup();
    const minutes = screen.getByRole("textbox", { name: "Minuten" });
    const seconds = screen.getByRole("textbox", { name: "Sekunden" });

    await user.type(minutes, "12");

    expect(seconds).toHaveFocus();
  });

  it("selects the whole field on a click so a correction replaces it", async () => {
    renderSheet("time");
    const user = userEvent.setup();
    const minutes = screen.getByRole("textbox", {
      name: "Minuten",
    }) as HTMLInputElement;

    await user.type(minutes, "12");
    await user.type(screen.getByRole("textbox", { name: "Sekunden" }), "34");

    // Re-editing the minutes: the tap marks the two digits ...
    await user.click(minutes);
    expect(minutes).toHaveFocus();
    expect(minutes.selectionStart).toBe(0);
    expect(minutes.selectionEnd).toBe(2);

    // ... so a new entry replaces them and the cursor moves on again.
    await user.keyboard("07");
    expect(minutes).toHaveValue("07");
    expect(screen.getByRole("textbox", { name: "Sekunden" })).toHaveFocus();
  });

  it("records the remaining Spielzeit as mm:ss", async () => {
    const { onSubmit } = renderSheet("time");
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Minuten" }), "12");
    await user.type(screen.getByRole("textbox", { name: "Sekunden" }), "34");
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([
      { name: "Spielzeit", input: "12:34" },
    ]);
  });

  it("pads a short Spielzeit to mm:ss", async () => {
    const { onSubmit } = renderSheet("time");
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Minuten" }), "5");
    await user.type(screen.getByRole("textbox", { name: "Sekunden" }), "4");
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([
      { name: "Spielzeit", input: "05:04" },
    ]);
    expect(screen.getByText(/Restliche Spielzeit/)).toBeInTheDocument();
  });

  it("records an Auszeit with the game time it was taken", async () => {
    const { onSubmit } = renderSheet("timeout");
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Minuten" }), "3");
    await user.type(screen.getByRole("textbox", { name: "Sekunden" }), "5");
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([{ name: "Auszeit", input: "03:05" }]);
    expect(
      screen.getByText(/Restliche Spielzeit, als die Auszeit genommen wurde/),
    ).toBeInTheDocument();
  });

  it("lists the timeouts both teams already took", () => {
    renderSheet("timeout", undefined, ROSTER, [
      { team: "Ravens", half: 1, time: "08:12" },
      { team: "Ravens", half: 2, time: "03:40" },
      { team: "Wolves", half: 1, time: "12:05" },
    ]);

    const history = screen.getByRole("region", { name: "Bisherige Auszeiten" });
    expect(history).toHaveTextContent(
      "Ravens 1. HZ 08:12 · 2. HZ 03:40 (2 Auszeiten)",
    );
    expect(history).toHaveTextContent("Wolves 1. HZ 12:05 (1 Auszeit)");
  });

  it("says so when neither team has taken a timeout", () => {
    renderSheet("timeout");

    const history = screen.getByRole("region", { name: "Bisherige Auszeiten" });
    expect(history).toHaveTextContent("Ravens – noch keine");
    expect(history).toHaveTextContent("Wolves – noch keine");
  });

  it("rejects seconds above 59", async () => {
    renderSheet("time");
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Minuten" }), "12");
    await user.type(screen.getByRole("textbox", { name: "Sekunden" }), "60");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sekunden müssen zwischen 0 und 59 liegen.",
    );
    expect(saveButton()).toBeDisabled();
  });

  it("counts an empty minutes field as zero", async () => {
    const { onSubmit } = renderSheet("time");
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Sekunden" }), "5");

    expect(screen.queryByRole("alert")).toBeNull();
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([
      { name: "Spielzeit", input: "00:05" },
    ]);
  });

  it("refuses a time with both fields empty", async () => {
    renderSheet("time");

    await userEvent
      .setup()
      .type(screen.getByRole("textbox", { name: "Sekunden" }), "5");
    await userEvent
      .setup()
      .clear(screen.getByRole("textbox", { name: "Sekunden" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bitte Minuten und Sekunden angeben.",
    );
    expect(saveButton()).toBeDisabled();
  });

  it("rejects a Spielzeit above 59 minutes", async () => {
    renderSheet("time");
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Minuten" }), "60");
    await user.type(screen.getByRole("textbox", { name: "Sekunden" }), "00");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Die Spielzeit muss zwischen 00:00 und 59:59 liegen.",
    );
  });

  it("disables the sheet while the request is in flight", async () => {
    const onSubmit = vi.fn<Submit>(() => new Promise<void>(() => undefined));
    renderSheet("first", onSubmit);

    await userEvent.setup().click(saveButton());

    expect(saveButton()).toBeDisabled();
    expect(saveButton()).toHaveTextContent("Speichern …");
  });

  it("omits the jersey picker when the roster is empty", () => {
    renderSheet("first", undefined, []);

    expect(
      screen.queryByRole("group", { name: "Trikotnummer (optional)" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Kein Kader geladen/)).toBeInTheDocument();
  });

  it("waits for the roster instead of showing the empty note", () => {
    renderSheet("interception", undefined, null);

    expect(screen.getByText("Kader lädt …")).toBeInTheDocument();
    expect(screen.queryByText(/Kein Kader geladen/)).not.toBeInTheDocument();
  });
});

describe("SeriesSheet validation helpers", () => {
  it("knows which modes take a clock", () => {
    expect(isTimeMode("time")).toBe(true);
    expect(isTimeMode("timeout")).toBe(true);
    expect(isTimeMode("first")).toBe(false);
  });

  it("keeps both clocks within the remaining game time", () => {
    expect(maxMinutes()).toBe(59);
    expect(timeError("timeout", "60", "00")).toBe(
      "Die Auszeit muss zwischen 00:00 und 59:59 liegen.",
    );
    expect(timeError("time", "60", "00")).toBe(
      "Die Spielzeit muss zwischen 00:00 und 59:59 liegen.",
    );
    expect(timeError("timeout", "59", "59")).toBeNull();
  });
});

describe("SeriesSheet edge inputs", () => {
  it("ignores a second tap in the same tick", async () => {
    let release: () => void = () => undefined;
    const submit = vi.fn<Submit>(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    renderSheet("first", submit);

    fireEvent.click(saveButton());
    fireEvent.click(saveButton());

    expect(submit).toHaveBeenCalledTimes(1);
    release();
  });

  it("keeps the sheet open with the failure and re-enables save", async () => {
    const submit = vi.fn<Submit>(async () => {
      throw new ApiError(400, { detail: "Ungültig." }, "Ungültig.");
    });
    const { onClose } = renderSheet("first", submit);

    await userEvent.setup().click(saveButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Ungültig.");
    expect(onClose).not.toHaveBeenCalled();
    expect(saveButton()).toBeEnabled();
  });

  it("drops a picked jersey with 'Ohne Nummer'", async () => {
    const { onSubmit } = renderSheet("first");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Trikot 23, Schulz" }));
    await user.click(screen.getByRole("button", { name: "Ohne Nummer" }));
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([{ name: "First Down" }]);
  });

  it("offers a nameless jersey without an invented name", async () => {
    const { onSubmit } = renderSheet("first", undefined, [
      { side: "home", jersey: 9, name: null },
    ]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Trikot 9" }));
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith([{ name: "First Down", player: 9 }]);
  });
});

describe("the interception carries its return in one entry", () => {
  it("records where the return ended and the return yards", () => {
    const event = interceptionEvent(12, 30, 15);

    expect(event).toEqual({
      name: "Interception",
      player: 12,
      input: "bis B20 · 15 Yards Return",
      payload: { deadBall: 30, returnYards: 15 },
    });
  });

  it("stays a usable entry without the optional detail", () => {
    expect(interceptionEvent(null, null, null)).toEqual({
      name: "Interception",
    });
  });

  it("names the spot the way the officials call it", () => {
    expect(interceptionEvent(7, 25, null).input).toBe("bis M");
    expect(interceptionEvent(7, 12.5, null).input).toBe("bis A12,5");
  });
});

describe("the interception sheet takes the spot and the return", () => {
  it("sends one event with the number, the spot and the return yards", async () => {
    const onSubmit = vi.fn<Submit>(async () => undefined);
    renderSheet("interception", onSubmit);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Trikot 11, Wolf" }),
    );
    await user.click(screen.getByRole("button", { name: "B · gegnerische" }));
    await user.type(
      screen.getByRole("textbox", { name: /Yardlinie, wo der Return endete/ }),
      "20",
    );
    await user.type(
      screen.getByRole("textbox", { name: /Return-Yards/ }),
      "15",
    );
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(onSubmit).toHaveBeenCalledWith([
      {
        name: "Interception",
        player: 11,
        input: "bis B20 · 15 Yards Return",
        payload: { deadBall: 30, returnYards: 15 },
      },
    ]);
  });
});

describe("the interception spot can change sides", () => {
  it("keeps the own half when the official switches back from B to A", async () => {
    const onSubmit = vi.fn<Submit>(async () => undefined);
    renderSheet("interception", onSubmit);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "B · gegnerische" }));
    await user.click(screen.getByRole("button", { name: "A · eigene" }));
    await user.type(
      screen.getByRole("textbox", { name: /Yardlinie, wo der Return endete/ }),
      "20",
    );
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({ payload: { deadBall: 20 } }),
    ]);
  });
});
