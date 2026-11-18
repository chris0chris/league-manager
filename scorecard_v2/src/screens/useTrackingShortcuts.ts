import { useEffect, useLayoutEffect, useRef } from "react";

import type { PlayResult, PlayType } from "../components/sheets/PlaySheet";

interface TrackingShortcutHandlers {
  onTouchdown: () => void;
  /** Open the Spielzug sheet (keys S). */
  onSpielzug: () => void;
  /** A play entry straight from its key: 1–4, P for a pass. */
  onPlay: (type: PlayType, result?: PlayResult) => void;
  /** Strafe (5). */
  onPenalty: () => void;
  /** Spielzeit (6). */
  onTime: () => void;
  /** 1st Down (8). */
  onFirstDown: () => void;
  /** Turnover (9). */
  onTurnover: () => void;
  /** Safety (0). */
  onSafety: () => void;
  onSwitchPossession: () => void;
  onUndo: () => void;
  readOnly: boolean;
  sheetOpen: boolean;
}

function editing(element: Element | null): boolean {
  return (
    element !== null &&
    element.closest('input, textarea, select, [contenteditable="true"]') !== null
  );
}

/**
 * Desktop keys for the tracking cockpit; buttons remain the accessible path.
 *
 * 1–4 still open the play wizard on Pass/Run/Sack/Interception without the
 * Spielzug sheet, because that is the entry of almost every snap; S opens the
 * sheet for everything else. 5, 6, 8, 9 and 0 keep the tiles they always had —
 * only the 7 that opened the old Mehr menu is gone, since the Spielzug sheet
 * replaced it.
 *
 * The listener stays subscribed and reads the handlers of the latest render
 * from a ref, updated during the commit. Re-subscribing with each render's
 * handlers left the previous listener live until the effect ran, so a key
 * pressed right after a render (an armed tile's second press) could reach
 * handlers that had not seen it yet.
 */
export function useTrackingShortcuts({
  onTouchdown,
  onSpielzug,
  onPlay,
  onPenalty,
  onTime,
  onFirstDown,
  onTurnover,
  onSafety,
  onSwitchPossession,
  onUndo,
  readOnly,
  sheetOpen,
}: TrackingShortcutHandlers): void {
  const handlers = useRef({
    onTouchdown,
    onSpielzug,
    onPlay,
    onPenalty,
    onTime,
    onFirstDown,
    onTurnover,
    onSafety,
    onSwitchPossession,
    onUndo,
  });
  useLayoutEffect(() => {
    handlers.current = {
      onTouchdown,
      onSpielzug,
      onPlay,
      onPenalty,
      onTime,
      onFirstDown,
      onTurnover,
      onSafety,
      onSwitchPossession,
      onUndo,
    };
  });

  useEffect(() => {
    if (readOnly || sheetOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      // A browser without matchMedia (a locked-down webview, a test double)
      // simply has no desktop shortcuts.
      const wide =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(min-width: 1280px)").matches;
      if (
        event.defaultPrevented ||
        event.repeat ||
        !wide ||
        document.querySelector('[role="dialog"]') !== null
      ) {
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      if (editing(target) || editing(document.activeElement)) {
        return;
      }

      const {
        onTouchdown,
        onSpielzug,
        onPlay,
        onPenalty,
        onTime,
        onFirstDown,
        onTurnover,
        onSafety,
        onSwitchPossession,
        onUndo,
      } = handlers.current;
      const key = event.key.toLowerCase();
      let handled = true;
      if ((event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey) {
        onUndo();
      } else if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      } else if (key === "t") {
        onTouchdown();
      } else if (key === "s") {
        onSpielzug();
      } else if (key === "p") {
        onPlay("pass");
      } else if (key === "b") {
        onSwitchPossession();
      } else if (key === "1") {
        onPlay("pass");
      } else if (key === "2") {
        onPlay("run");
      } else if (key === "3") {
        onPlay("sack");
      } else if (key === "4") {
        onPlay("pass", "interception");
      } else if (key === "5") {
        onPenalty();
      } else if (key === "6") {
        onTime();
      } else if (key === "8") {
        onFirstDown();
      } else if (key === "9") {
        onTurnover();
      } else if (key === "0") {
        onSafety();
      } else {
        handled = false;
      }

      if (handled) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readOnly, sheetOpen]);
}
