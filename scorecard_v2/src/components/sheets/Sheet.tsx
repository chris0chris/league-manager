import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Focusable descendants in DOM order. `[tabindex="-1"]` is excluded on
 * purpose: the sheet container itself is focusable that way, and Tab from it
 * should reach the first real control, not loop back to the container.
 */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export interface SheetProps {
  /** Sheet heading; also the dialog's accessible name. */
  title: string;
  /** Close request — scrim, the close button and Escape all end up here. */
  onClose: () => void;
  /**
   * A write is in flight. Dismissing the sheet now would hide a failure and
   * invite a duplicate score, so Escape, the scrim and the close button are
   * all inert until the write settles.
   */
  busy?: boolean;
  /** Failure shown above the footer; the sheet stays open until it is fixed. */
  error?: string | null;
  /** Sticky footer, one full-width primary action per sheet. */
  footer?: ReactNode;
  /**
   * A long form that should use a desktop's width: from 1280px the dialog is
   * ~960px wide instead of 680px, and the sheet lays its content out in two
   * columns. Phones and tablets are unaffected.
   */
  wide?: boolean;
  children: ReactNode;
}

/**
 * Bottom sheet: a modal dialog anchored to the bottom of the phone.
 *
 * On a tablet in landscape (≥900px) the same component is a centred dialog
 * card instead — one CSS media query in app.css, no separate component and no
 * different content.
 *
 * Portalled to `document.body` so the app shell's `overflow: clip` cannot cut
 * it and no ancestor stacking context can hide it. Focus moves into the sheet
 * on open (the dialog itself, which announces its title) and returns to the
 * element that opened it — an official who cancels lands back on the tile they
 * tapped. Escape, a tap on the scrim and the close button all close it, except
 * while {@link SheetProps.busy | busy}.
 *
 * The background cannot scroll while the sheet is open: the app shell is a
 * fixed-height column with its own scrollers, but iOS still moves the page
 * behind a fixed overlay without an explicit lock.
 */
export default function Sheet({
  title,
  onClose,
  busy = false,
  error = null,
  footer,
  wide = false,
  children,
}: SheetProps) {
  const titleId = useId();
  const sheet = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  /** Element the pointer went down on; a drag must not close the sheet. */
  const pressedOn = useRef<EventTarget | null>(null);
  /** Element the pointer came up on; a drag across the scrim is no dismissal. */
  const releasedOn = useRef<EventTarget | null>(null);
  /** Scroll offsets of the page behind the sheet, restored on close. */
  const scrolled = useRef<{ element: Element; top: number }[]>([]);

  useEffect(() => {
    const active = document.activeElement;
    restoreTo.current = active instanceof HTMLElement ? active : null;
    scrolled.current = [];
    for (
      let node = active instanceof HTMLElement ? active.parentElement : null;
      node !== null;
      node = node.parentElement
    ) {
      scrolled.current.push({ element: node, top: node.scrollTop });
    }
    const page = document.scrollingElement;
    if (page != null) {
      scrolled.current.push({ element: page, top: page.scrollTop });
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // A sheet with its own autofocus (the clock's minutes field) has already
    // focused a child, so do not steal it. `preventScroll` keeps the phone from
    // scrolling the board out of view while the keyboard opens.
    if (!sheet.current?.contains(document.activeElement)) {
      sheet.current?.focus({ preventScroll: true });
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      const target = restoreTo.current;
      if (
        target !== null &&
        target !== document.body &&
        target.isConnected
      ) {
        target.focus({ preventScroll: true });
      }
      // The focus above must not leave the page scrolled: put the official
      // back exactly where they opened the sheet.
      for (const { element, top } of scrolled.current) {
        element.scrollTop = top;
      }
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (!busy) {
        onClose();
      }
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const nodes = sheet.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (nodes === undefined || nodes.length === 0) {
      event.preventDefault();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === sheet.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onScrimPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    pressedOn.current = event.target;
  };

  const onScrimPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    releasedOn.current = event.target;
  };

  /**
   * Close on the backdrop's **click**, never on pointerup.
   *
   * Closing at pointerup removes the scrim before the browser's own click
   * arrives, so a touch tap outside the sheet would then fire the event log's
   * Ändern/Rückgängig button that the scrim was covering. The click still
   * targets the scrim (the sheet only unmounts inside this handler), so the
   * dismissal can never leak through.
   */
  const onScrimClick = (event: MouseEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    // Both ends on the scrim itself: a press started inside the sheet and
    // released outside (or a drag across it) is not a dismissal.
    const startedHere = pressedOn.current === event.currentTarget;
    const endedHere = releasedOn.current === event.currentTarget;
    pressedOn.current = null;
    releasedOn.current = null;
    if (
      !busy &&
      startedHere &&
      endedHere &&
      event.target === event.currentTarget
    ) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="sheetoverlay"
      onClick={onScrimClick}
      onPointerDown={onScrimPointerDown}
      onPointerUp={onScrimPointerUp}
    >
      <div
        aria-busy={busy}
        aria-labelledby={titleId}
        aria-modal="true"
        className={wide ? "sheet sheet-wide" : "sheet"}
        onKeyDown={onKeyDown}
        ref={sheet}
        role="dialog"
        tabIndex={-1}
      >
        <div className="sheethead">
          <h2 className="sheettitle" id={titleId}>
            {title}
          </h2>
          <button
            aria-disabled={busy}
            className="sheetclose"
            onClick={busy ? undefined : onClose}
            type="button"
          >
            Schließen
          </button>
        </div>
        <div className="sheetbody">
          {children}
          {error === null ? null : (
            <p className="sheeterror" role="alert">
              {error}
            </p>
          )}
        </div>
        {footer === undefined ? null : (
          <div className="sheetfoot">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
