import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ComponentType,
  type ReactNode,
} from "react";

import type { PlayResult, PlayType } from "./PlaySheet";
import {
  ArrowRight,
  Football,
  Interception,
  Play,
  PlusCircle,
  Shield,
  SwapArrows,
  Whistle,
  type IconProps,
} from "../icons";
import Sheet from "./Sheet";

/** The entries behind the old **Mehr** menu: the plays live beside them. */
export type SpielzugPick =
  | "first"
  | "turnover"
  | "challenge"
  | "fieldpos"
  | "safety"
  | "overtime"
  | "touchdown";

interface Tile {
  /** Number key that picks the tile, as shown in the label's hint. */
  key: string;
  label: string;
  Icon: ComponentType<IconProps>;
  /** A play tile opens the play wizard on this type. */
  play?: { type: PlayType; result?: PlayResult };
  /** Every other tile runs the handler the old menu row ran. */
  pick?: SpielzugPick;
}

/**
 * The sheet's entries, in the order the number keys pick them.
 *
 * The plays come first because they are the entry an official makes on almost
 * every snap; the rarer scores and the game phases follow. "1st Down" stays
 * here although the board has its own tile: that tile saves on the tap and
 * offers the jersey afterwards, while this row opens the form with the jersey
 * picker, so neither replaces the other.
 */
const PLAYS: Tile[] = [
  { key: "1", label: "Pass", Icon: Play, play: { type: "pass" } },
  { key: "2", label: "Run", Icon: ArrowRight, play: { type: "run" } },
  { key: "3", label: "Sack", Icon: Shield, play: { type: "sack" } },
  {
    key: "4",
    label: "Interception",
    Icon: Interception,
    play: { type: "pass", result: "interception" },
  },
];

const OTHERS: Tile[] = [
  {
    key: "5",
    label: "Touchdown (Kurzform)",
    Icon: Football,
    pick: "touchdown",
  },
  { key: "6", label: "Turnover", Icon: SwapArrows, pick: "turnover" },
  { key: "7", label: "1st Down", Icon: ArrowRight, pick: "first" },
  { key: "8", label: "Safety", Icon: Shield, pick: "safety" },
  { key: "9", label: "Challenge", Icon: Whistle, pick: "challenge" },
];

const PHASE: Tile[] = [
  { key: "0", label: "Overtime", Icon: PlusCircle, pick: "overtime" },
  { key: "", label: "Feldposition", Icon: Football, pick: "fieldpos" },
];

const TILES = [...PLAYS, ...OTHERS, ...PHASE];

/**
 * **Spielzug**: the one tile for the snap's entry.
 *
 * It replaces the four play tiles and the **Mehr** menu of the board: the
 * plays open the play wizard they always opened, the rarer entries (short-form
 * touchdown, turnover, first down, safety, challenge) and the game phases
 * (overtime, the spot) run the handlers the menu rows ran. The number keys
 * pick a tile, so a desktop official keeps the same speed as before.
 */
export default function SpielzugSheet({
  disabled = false,
  onClose,
  onPick,
  onPlay,
}: {
  disabled?: boolean;
  onClose: () => void;
  onPick: (pick: SpielzugPick) => void;
  onPlay: (type: PlayType, result?: PlayResult) => void;
}) {
  // The keydown listener stays subscribed and reads the latest handlers, as
  // `useTrackingShortcuts` does: re-subscribing while the sheet is open kept
  // the previous listener live for a render.
  const handlers = useRef({ disabled, onPick, onPlay });
  useLayoutEffect(() => {
    handlers.current = { disabled, onPick, onPlay };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }
      const tile = TILES.find((entry) => entry.key === event.key);
      if (tile === undefined) {
        return;
      }
      event.preventDefault();
      const latest = handlers.current;
      if (latest.disabled) {
        return;
      }
      if (tile.play !== undefined) {
        latest.onPlay(tile.play.type, tile.play.result);
      } else if (tile.pick !== undefined) {
        latest.onPick(tile.pick);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activate = (tile: Tile): void => {
    if (tile.play !== undefined) {
      onPlay(tile.play.type, tile.play.result);
      return;
    }
    if (tile.pick !== undefined) {
      onPick(tile.pick);
    }
  };

  const group = (aria: string, tiles: Tile[]): ReactNode => (
    <div aria-label={aria} className="spielzuggrid" role="group">
      {tiles.map((tile) => (
        <button
          className="action"
          disabled={disabled}
          key={tile.label}
          onClick={() => activate(tile)}
          type="button"
        >
          <tile.Icon className="action-icon" size={22} />
          <span>{tile.label}</span>
          {tile.key === "" ? null : (
            <span aria-hidden="true" className="spielzugkey">
              {tile.key}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <Sheet onClose={onClose} title="Spielzug">
      <p className="sheetnote">
        Pass, Run, Sack und Interception öffnen den Spielzug-Assistenten. Am
        Rechner wählen die Ziffern einen Eintrag.
      </p>
      {group("Spielzug", PLAYS)}
      <h3 className="sheetsection">Weitere Einträge</h3>
      {group("Weitere Einträge", OTHERS)}
      <h3 className="sheetsection">Spielphase</h3>
      {group("Spielphase", PHASE)}
    </Sheet>
  );
}
