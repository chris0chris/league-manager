import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import Sheet from "./Sheet";

/** Opens the sheet from a real button, so focus restoration is observable. */
function Opener({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Öffnen
      </button>
      {open ? (
        <Sheet
          footer={
            <button className="startbtn" type="button">
              Speichern
            </button>
          }
          onClose={() => {
            onClose();
            setOpen(false);
          }}
          title="Wer hat gepunktet?"
        >
          <p>Inhalt</p>
        </Sheet>
      ) : null}
    </>
  );
}

async function open(): Promise<HTMLElement> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Öffnen" }));
  return screen.getByRole("dialog");
}

describe("Sheet", () => {
  it("is a modal dialog named by its title", () => {
    render(<Opener />);
    return open().then((dialog) => {
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAccessibleName("Wer hat gepunktet?");
      expect(dialog).toHaveTextContent("Inhalt");
      expect(
        screen.getByRole("button", { name: "Speichern" }),
      ).toBeInTheDocument();
    });
  });

  it("keeps the default width unless a sheet asks for the wide dialog", () => {
    const { rerender } = render(
      <Sheet onClose={vi.fn()} title="Schmal">
        <p>Inhalt</p>
      </Sheet>,
    );
    expect(screen.getByRole("dialog")).not.toHaveClass("sheet-wide");

    rerender(
      <Sheet onClose={vi.fn()} title="Breit" wide>
        <p>Inhalt</p>
      </Sheet>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("sheet", "sheet-wide");
  });

  it("moves focus into the sheet and returns it to the opener", async () => {
    const onClose = vi.fn();
    render(<Opener onClose={onClose} />);

    const dialog = await open();
    expect(dialog).toHaveFocus();

    await userEvent.setup().keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Öffnen" })).toHaveFocus();
  });

  it("closes on Escape", async () => {
    render(<Opener />);
    await open();

    await userEvent.setup().keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on a click on the scrim but not inside the sheet", async () => {
    render(<Opener />);
    const user = userEvent.setup();
    const dialog = await open();
    const scrim = dialog.parentElement;

    expect(scrim).not.toBeNull();
    await user.click(dialog);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(scrim as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on the close button", async () => {
    render(<Opener />);
    const user = userEvent.setup();
    await open();

    await user.click(screen.getByRole("button", { name: "Schließen" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps Tab inside the sheet", async () => {
    render(<Opener />);
    const user = userEvent.setup();
    await open();

    const close = screen.getByRole("button", { name: "Schließen" });
    const save = screen.getByRole("button", { name: "Speichern" });

    await user.click(save);
    await user.tab();
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(save).toHaveFocus();
  });

  it("cannot be dismissed while a write is in flight", async () => {
    const onClose = vi.fn();
    render(
      <Sheet
        busy
        footer={<button type="button">Speichern …</button>}
        onClose={onClose}
        title="Titel"
      >
        <p>Inhalt</p>
      </Sheet>,
    );
    const user = userEvent.setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-busy", "true");

    await user.keyboard("{Escape}");
    await user.click(dialog.parentElement as HTMLElement);
    const close = screen.getByRole("button", { name: "Schließen" });
    expect(close).toHaveAttribute("aria-disabled", "true");
    await user.click(close);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not close when a press starts inside and ends on the scrim", async () => {
    render(<Opener />);
    const dialog = await open();
    const scrim = dialog.parentElement as HTMLElement;

    fireEvent.pointerDown(screen.getByText("Inhalt"));
    fireEvent.pointerUp(scrim);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on the backdrop without firing the control underneath", async () => {
    // The event log's Ändern/Rückgängig buttons sit under the scrim. A tap
    // outside the sheet closes it and must not also trigger that button.
    const onClose = vi.fn();
    const underneath = vi.fn();
    render(
      <>
        <button onClick={underneath} type="button">
          Ändern
        </button>
        <Sheet onClose={onClose} title="Titel">
          <p>Inhalt</p>
        </Sheet>
      </>,
    );
    const user = userEvent.setup();
    const scrim = screen.getByRole("dialog").parentElement as HTMLElement;

    await user.click(scrim);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(underneath).not.toHaveBeenCalled();
  });

  it("does not close when the press started inside the sheet", () => {
    render(
      <Sheet onClose={vi.fn()} title="Titel">
        <p>Inhalt</p>
      </Sheet>,
    );
    const scrim = screen.getByRole("dialog").parentElement as HTMLElement;

    fireEvent.pointerDown(screen.getByText("Inhalt"));
    fireEvent.click(scrim);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not close when a drag crosses the scrim", () => {
    render(
      <Sheet onClose={vi.fn()} title="Titel">
        <p>Inhalt</p>
      </Sheet>,
    );
    const scrim = screen.getByRole("dialog").parentElement as HTMLElement;

    fireEvent.pointerDown(scrim);
    fireEvent.pointerUp(screen.getByText("Inhalt"));
    fireEvent.click(scrim);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("focuses the dialog without scrolling the page behind it", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    render(
      <Sheet onClose={vi.fn()} title="Titel">
        <p>Inhalt</p>
      </Sheet>,
    );

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    focus.mockRestore();
  });

  it("restores the page scroll position when it closes", async () => {
    const scroller = document.createElement("div");
    scroller.style.overflow = "auto";
    document.body.appendChild(scroller);
    const { unmount } = render(<Opener />, { container: scroller });
    scroller.scrollTop = 140;
    await open();

    // The mobile keyboard can push the page while the sheet is open; closing
    // must leave the official where they were, looking at the score.
    scroller.scrollTop = 0;
    unmount();

    expect(scroller.scrollTop).toBe(140);
    scroller.remove();
  });

  it("restores the document scroll position when it closes", async () => {
    // jsdom has no layout and no `document.scrollingElement`; a real browser
    // scrolls that element while the keyboard opens.
    const page = document.createElement("div");
    page.scrollTop = 90;
    Object.defineProperty(document, "scrollingElement", {
      configurable: true,
      get: () => page,
    });
    try {
      const { unmount } = render(<Opener />);
      await open();
      page.scrollTop = 0;
      unmount();

      expect(page.scrollTop).toBe(90);
    } finally {
      Reflect.deleteProperty(document, "scrollingElement");
    }
  });

  it("locks the page scroll while open and releases it on close", async () => {
    const { unmount } = render(<Opener />);
    await open();
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("shows the failure without closing", async () => {
    render(
      <Sheet error="Keine Berechtigung." onClose={vi.fn()} title="Titel">
        <p>Inhalt</p>
      </Sheet>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Keine Berechtigung.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("Sheet defaults", () => {
  it("is dismissable when the caller does not say it is busy", async () => {
    const onClose = vi.fn();
    render(
      <Sheet onClose={onClose} title="Ohne busy">
        <p>Inhalt</p>
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-busy", "false");

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });

  it("restores nothing when no element had focus", () => {
    const spy = vi
      .spyOn(document, "activeElement", "get")
      .mockReturnValue(null as unknown as Element);
    const { unmount } = render(
      <Sheet onClose={vi.fn()} title="Ohne Fokus">
        <p>Inhalt</p>
      </Sheet>,
    );

    expect(() => unmount()).not.toThrow();
    spy.mockRestore();
  });
});
