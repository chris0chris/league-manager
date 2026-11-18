import { useId } from "react";

import type { RosterPlayer } from "../api/types";

/** One grid button: a jersey and the surname shown under it. */
export interface JerseyOption {
  jersey: number;
  name: string | null;
}

/** The two teams of a game; the picker colours itself by the one it serves. */
type Side = RosterPlayer["side"];

/**
 * The side whose jerseys are on offer.
 *
 * The picker is reused for the offence, the defender, an interception and a
 * penalty, so the side cannot come from ball possession: every caller filters
 * the roster to the team the number belongs to, and the roster itself says
 * which one that is. A roster that mixes both sides (or none) has no side and
 * stays neutral rather than colouring the pad wrong.
 */
export function rosterSide(players: RosterPlayer[]): Side | null {
  const [first] = players;
  if (first === undefined) {
    return null;
  }
  return players.every((player) => player.side === first.side)
    ? first.side
    : null;
}

/**
 * The class list of one number control: its own class, an extra state class
 * and the team tone (`"choice choice-home sel"`). Without a side the control
 * keeps the neutral styling.
 */
function sideClass({
  base,
  extra,
  side,
  tone,
}: {
  base: string;
  extra?: string;
  side: Side | null;
  tone: string;
}): string {
  return [base, extra, side === null ? null : `${tone}-${side}`]
    .filter((name): name is string => Boolean(name))
    .join(" ");
}

/**
 * One option per jersey number.
 *
 * `GET /api/game/<id>/roster` deliberately returns duplicate numbers as they
 * are (the passcheck flags that data problem instead of hiding it), but the
 * write payload only carries the number — two buttons with the same number
 * would be indistinguishable, so the first one wins here.
 */
export function jerseyOptions(players: RosterPlayer[]): JerseyOption[] {
  const seen = new Set<number>();
  const options: JerseyOption[] = [];
  for (const player of players) {
    if (seen.has(player.jersey)) {
      continue;
    }
    seen.add(player.jersey);
    options.push({ jersey: player.jersey, name: player.name });
  }
  return options.sort((left, right) => left.jersey - right.jersey);
}

/** Digits only, at most two of them: the field accepts 0–99. */
export function jerseyDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 2);
}

/**
 * Above this many players the tile grid stops fitting a phone screen (a
 * tackle roster runs to 45+), and typing the two digits the referee saw is
 * faster than scrolling for the tile.
 */
export const KEYPAD_ABOVE = 24;

/** Whether `jersey` may be saved: a checked roster only takes its own numbers. */
export function jerseyAllowed(
  players: RosterPlayer[],
  jersey: number | null,
  strict: boolean,
): boolean {
  if (jersey === null) {
    return false;
  }
  return !strict || players.length === 0 || players.some((player) => player.jersey === jersey);
}

interface JerseyPickerProps {
  /** Roster of one side, already filtered by the caller. */
  players: RosterPlayer[];
  value: number | null;
  onChange: (jersey: number | null) => void;
  disabled?: boolean;
  /**
   * Prefix of a tile's accessible name ("Trikot 23, Schulz") and the group
   * name when {@link JerseyPickerProps.groupLabel} is not given.
   */
  label?: string;
  /**
   * Accessible name of the whole group, when the entries name a role
   * ("Trikotnummer Verteidiger (optional)").
   */
  groupLabel?: string;
  /**
   * The roster is a passed passcheck: the keypad refuses a number outside it
   * (the grid only offers roster numbers anyway).
   */
  strict?: boolean;
  /**
   * The entry may name nobody ("Ohne Nummer", "Ganzes Team"). The label
   * leads the grid as a tile of its own and selects `null`.
   */
  optionalLabel?: string;
  /**
   * Overrides whether the leading "nobody" tile reads as chosen. A sheet with
   * two "nobody" tiles (Ohne Nummer / Ganzes Team) uses this and
   * {@link JerseyPickerProps.trailing} to keep exactly one of them pressed.
   */
  optionalSelected?: boolean;
  /**
   * A second "nobody" tile at the end of the choices, e.g. "Ganzes Team".
   * It selects the same `null`; the sheet decides which label is shown as
   * pressed.
   */
  trailing?: {
    label: string;
    selected: boolean;
    onSelect: () => void;
  };
  /**
   * One wrapping row instead of the grid — the "Zuletzt" shortcuts keep the
   * tile shape at a smaller size.
   */
  compact?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "Löschen"];

/**
 * The "nobody" tile: same shape as a jersey tile, a label instead of a
 * number. It is the only way back to an empty choice once a number is picked.
 */
function OptionalChoice({
  label,
  value,
  onChange,
  disabled,
  selected: selectedOverride,
}: {
  label: string;
  value: number | null;
  onChange: (jersey: number | null) => void;
  disabled: boolean;
  /** Defaults to "is nothing picked"; a second tile passes its own state. */
  selected?: boolean;
}) {
  const selected = selectedOverride ?? value === null;
  return (
    <button
      aria-label={label}
      aria-pressed={selected}
      className={selected ? "choice sel" : "choice"}
      disabled={disabled}
      onClick={() => onChange(null)}
      type="button"
    >
      <span className="choice-label">{label}</span>
    </button>
  );
}

/** Two-digit entry for a large roster; the roster name confirms the number. */
function JerseyKeypad({
  options,
  value,
  onChange,
  disabled,
  label,
  groupLabel,
  strict,
  optionalLabel,
  optionalSelected,
  trailing,
  side,
}: {
  options: JerseyOption[];
  value: number | null;
  onChange: (jersey: number | null) => void;
  disabled: boolean;
  label: string;
  groupLabel: string;
  strict: boolean;
  optionalLabel?: string;
  optionalSelected?: boolean;
  trailing?: JerseyPickerProps["trailing"];
  side: Side | null;
}) {
  const digits = value === null ? "" : String(value);
  const match = options.find((option) => option.jersey === value) ?? null;
  const press = (key: string): void => {
    const next = key === "Löschen" ? digits.slice(0, -1) : jerseyDigits(digits + key);
    onChange(next === "" ? null : Number(next));
  };
  let note: string | null = null;
  let tone = "";
  if (value !== null && match === null) {
    note = strict ? "nicht im bestätigten Kader" : "nicht im Kader";
    tone = strict ? "bad" : "warn";
  }
  const displayClass = [
    "keypaddisp",
    side === null ? null : `keypad-${side}`,
    tone === "" ? null : tone,
  ]
    .filter((name): name is string => name !== null)
    .join(" ");

  return (
    <div className="keypadwrap">
      {optionalLabel === undefined ? null : (
        <div aria-label={groupLabel} className="choicerow" role="group">
          <OptionalChoice
            disabled={disabled}
            label={optionalLabel}
            onChange={onChange}
            selected={optionalSelected}
            value={value}
          />
        </div>
      )}
      <p aria-label={label} className={displayClass} role="status">
        <span className="keypadnum">{digits === "" ? "–" : digits}</span>
        {match?.name?.trim() ? (
          <span className="keypadname">{match.name.trim()}</span>
        ) : null}
        {note === null ? null : <span className="keypadnote">{note}</span>}
      </p>
      <div aria-label="Ziffern" className="keypad" role="group">
        {KEYS.map((key, index) =>
          key === "" ? (
            <span aria-hidden="true" key={`gap${index}`} />
          ) : (
            <button
              aria-label={key}
              className={sideClass({ base: "keypadkey", side, tone: "keypad" })}
              disabled={disabled || (key === "Löschen" ? digits === "" : digits.length >= 2)}
              key={key}
              onClick={() => press(key)}
              type="button"
            >
              {key === "Löschen" ? "⌫" : key}
            </button>
          ),
        )}
      </div>
      {trailing === undefined ? null : (
        <OptionalChoice
          disabled={disabled}
          label={trailing.label}
          onChange={() => trailing.onSelect()}
          selected={trailing.selected}
          value={null}
        />
      )}
    </div>
  );
}

/**
 * The one jersey choice of the field app: a grid of the roster (a keypad
 * above {@link KEYPAD_ABOVE} players), or a plain number field when there is
 * no roster to show.
 *
 * Every sheet picks its number here — touchdown, safety/overtime, first down,
 * interception and penalty — so a number always looks and behaves the same.
 * A sheet whose entry may name nobody passes `optionalLabel`, which leads the
 * choice as a tile of the same shape.
 *
 * The roster endpoint is the only source for the grid — the app never invents
 * numbers. A game whose passcheck never ran (or whose roster request failed)
 * still gets a numeric field, otherwise the touchdown could not be recorded at
 * all and the game would need a paper sheet.
 *
 * The number buttons carry the colour of the side whose number is entered
 * (home red, guest green) — the referee sees which team he is typing for
 * without reading the sheet, which matters most on the defender picker where
 * the numbers belong to the team *without* the ball.
 */
export default function JerseyPicker({
  players,
  value,
  onChange,
  disabled = false,
  label = "Trikotnummer",
  groupLabel,
  strict = false,
  optionalLabel,
  optionalSelected,
  trailing,
  compact = false,
}: JerseyPickerProps) {
  const inputId = useId();
  const options = jerseyOptions(players);
  const group = groupLabel ?? label;
  const side = rosterSide(players);

  if (options.length > KEYPAD_ABOVE) {
    return (
      <JerseyKeypad
        disabled={disabled}
        groupLabel={group}
        label={label}
        onChange={onChange}
        optionalLabel={optionalLabel}
        optionalSelected={optionalSelected}
        options={options}
        side={side}
        strict={strict}
        trailing={trailing}
        value={value}
      />
    );
  }

  if (options.length === 0) {
    return (
      <div className="sheetfield">
        <label className="sheetlabel" htmlFor={inputId}>
          {label} (0–99)
        </label>
        <input
          autoComplete="off"
          className="sheetinput sheetinput-num"
          disabled={disabled}
          id={inputId}
          inputMode="numeric"
          onChange={(event) => {
            const digits = jerseyDigits(event.target.value);
            onChange(digits === "" ? null : Number(digits));
          }}
          pattern="[0-9]*"
          placeholder="z. B. 23"
          type="text"
          value={value === null ? "" : String(value)}
        />
        <p className="sheetnote">
          Kein Kader geladen – Nummer manuell eingeben.
        </p>
      </div>
    );
  }

  return (
    <div
      aria-label={group}
      className={compact ? "choicerow" : "choicegrid"}
      role="group"
    >
      {optionalLabel === undefined ? null : (
        <OptionalChoice
          disabled={disabled}
          label={optionalLabel}
          onChange={onChange}
          selected={optionalSelected}
          value={value}
        />
      )}
      {options.map((option) => {
        const selected = option.jersey === value;
        const name = option.name?.trim() || null;
        return (
          <button
            aria-label={
              name === null
                ? `${label} ${option.jersey}`
                : `${label} ${option.jersey}, ${name}`
            }
            aria-pressed={selected}
            className={sideClass({
              base: "choice",
              extra: selected ? "sel" : undefined,
              side,
              tone: "choice",
            })}
            disabled={disabled}
            key={option.jersey}
            onClick={() => onChange(option.jersey)}
            type="button"
          >
            <span className="choice-num">{option.jersey}</span>
            {name === null ? null : <span className="choice-name">{name}</span>}
          </button>
        );
      })}
      {trailing === undefined ? null : (
        <OptionalChoice
          disabled={disabled}
          label={trailing.label}
          onChange={() => trailing.onSelect()}
          selected={trailing.selected}
          value={null}
        />
      )}
    </div>
  );
}
