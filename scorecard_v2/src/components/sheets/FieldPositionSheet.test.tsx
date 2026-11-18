import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import FieldPositionSheet, {
  fieldPositionEvent,
  spotValue,
} from "./FieldPositionSheet";

function renderSheet(
  overrides: Partial<Parameters<typeof FieldPositionSheet>[0]> = {},
): { onSubmit: ReturnType<typeof vi.fn>; onClose: ReturnType<typeof vi.fn> } {
  const onSubmit = vi.fn(async () => undefined);
  const onClose = vi.fn();
  render(
    <FieldPositionSheet
      ballOn={null}
      onClose={onClose}
      onSubmit={onSubmit}
      teamName="Ravens"
      {...overrides}
    />,
  );
  return { onClose, onSubmit };
}

describe("fieldPositionEvent", () => {
  it("stores the A half as the machine value", () => {
    expect(fieldPositionEvent("A", 12)).toEqual({
      name: "Feldposition",
      input: "A12",
      payload: { ballOn: 12, input: "A12" },
    });
  });

  it("mirrors the B half", () => {
    expect(fieldPositionEvent("B", 20)).toEqual({
      name: "Feldposition",
      input: "B20",
      payload: { ballOn: 30, input: "B20" },
    });
  });

  it("keeps a half yard from a half-distance penalty", () => {
    expect(fieldPositionEvent("A", 4.5)).toEqual({
      name: "Feldposition",
      input: "A4,5",
      payload: { ballOn: 4.5, input: "A4,5" },
    });
  });

  it("writes the down and the spot officials see into the text", () => {
    expect(fieldPositionEvent("A", 4, { down: 1, goal: false })).toEqual({
      name: "Feldposition",
      input: "1st & M · A4",
      payload: { ballOn: 4, input: "1st & M · A4", down: 1, goal: false },
    });
    expect(fieldPositionEvent("B", 20, { down: 3, goal: true })).toEqual({
      name: "Feldposition",
      input: "3rd & G · B20",
      payload: { ballOn: 30, input: "3rd & G · B20", down: 3, goal: true },
    });
  });

  it("defaults a partially given situation to the first down", () => {
    expect(fieldPositionEvent("A", 12, { goal: true })).toEqual({
      name: "Feldposition",
      input: "1st & G · A12",
      payload: { ballOn: 12, input: "1st & G · A12", goal: true },
    });
  });

  it("derives the line to gain from the spot when it is not set", () => {
    expect(fieldPositionEvent("A", 12, { down: 2 })).toEqual({
      name: "Feldposition",
      input: "2nd & M · A12",
      payload: { ballOn: 12, input: "2nd & M · A12", down: 2 },
    });
    expect(fieldPositionEvent("B", 20, { down: 2 })).toEqual({
      name: "Feldposition",
      input: "2nd & G · B20",
      payload: { ballOn: 30, input: "2nd & G · B20", down: 2 },
    });
  });

  it("reads a German or English decimal", () => {
    expect(spotValue("4,5")).toBe(4.5);
    expect(spotValue("4.5")).toBe(4.5);
    expect(spotValue("4")).toBe(4);
    expect(spotValue("")).toBeNull();
    expect(spotValue("x")).toBeNull();
  });
});

describe("FieldPositionSheet", () => {
  it("saves A5 with one tap before a spot was set", async () => {
    const user = userEvent.setup();
    const { onSubmit, onClose } = renderSheet();

    await user.click(
      screen.getByRole("button", { name: "Feldposition speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Feldposition",
      input: "1st & M · A5",
      payload: { ballOn: 5, input: "1st & M · A5", down: 1, goal: false },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stores the down and the line to gain the officials set by hand", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ ballOn: 20, down: 2, goal: false });

    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "G · Endzone" }));
    await user.click(
      screen.getByRole("button", { name: "Feldposition speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Feldposition",
      input: "3rd & G · A20",
      payload: { ballOn: 20, input: "3rd & G · A20", down: 3, goal: true },
    });
  });

  it("prefills the current spot on the B half", () => {
    renderSheet({ ballOn: 30 });

    expect(screen.getByRole("button", { name: /B ·/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "Yardlinie (0–25)" })).toHaveValue(
      "20",
    );
  });

  it("prefills the current spot on the A half", () => {
    renderSheet({ ballOn: 12 });

    expect(screen.getByRole("button", { name: /A ·/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "Yardlinie (0–25)" })).toHaveValue(
      "12",
    );
  });

  it("prefills and saves a half-yard spot", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet({ ballOn: 4.5 });

    expect(screen.getByRole("textbox", { name: "Yardlinie (0–25)" })).toHaveValue(
      "4,5",
    );
    await user.click(
      screen.getByRole("button", { name: "Feldposition speichern" }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Feldposition",
      input: "1st & M · A4,5",
      payload: { ballOn: 4.5, input: "1st & M · A4,5", down: 1, goal: false },
    });
  });

  it("refuses a yard line beyond the 25", async () => {
    const user = userEvent.setup();
    renderSheet();

    const yards = screen.getByRole("textbox", { name: "Yardlinie (0–25)" });
    await user.clear(yards);
    await user.type(yards, "30");

    expect(
      screen.getByRole("button", { name: "Feldposition speichern" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Die Yardlinie liegt zwischen 0 und 25.",
    );
  });

  it("keeps the sheet open with the reason when the write fails", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {
      throw new Error("kaputt");
    });
    renderSheet({ onSubmit });

    await user.click(
      screen.getByRole("button", { name: "Feldposition speichern" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Die Feldposition konnte nicht gespeichert werden",
    );
  });
});
