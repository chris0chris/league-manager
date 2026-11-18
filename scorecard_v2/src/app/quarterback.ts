/**
 * Who threw: the quarterback of a team, remembered per game on this device.
 *
 * The play sheet asks for the thrower on every pass. Nine times out of ten it
 * is the same person, so the remembered one is pre-selected; a change only
 * costs one tap. It lives in `localStorage` — like the half-time break it is a
 * typing aid, not game data (the thrower travels in the event's payload).
 *
 * What is remembered is the team's **default**, not the last thrower: the
 * pre-game setup sets it, and a single play that another player threw (a trick
 * play, a wildcat snap) must not replace it — the next pass preselects the
 * default again. The first stored number therefore wins for the game.
 */

const PREFIX = "scorecard:v2:qb:";

type Side = "home" | "away";

function key(gameId: number, side: Side): string {
  return `${PREFIX}${gameId}:${side}`;
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The team's default quarterback, or `null` before the first pass. */
export function readQuarterback(gameId: number, side: Side): number | null {
  const raw = storage()?.getItem(key(gameId, side));
  if (raw === null || raw === undefined || raw.trim() === "") {
    return null;
  }
  const jersey = Number(raw);
  return Number.isFinite(jersey) ? jersey : null;
}

/**
 * Remember the team's default quarterback for the next pass of this side.
 *
 * A number that is already stored stays: a per-play change is not a new
 * default, and the sheet's preselection must survive it.
 */
export function rememberQuarterback(
  gameId: number,
  side: Side,
  jersey: number,
): void {
  if (readQuarterback(gameId, side) !== null) {
    return;
  }
  storage()?.setItem(key(gameId, side), String(jersey));
}

/** Drop both sides (the game is over). */
export function forgetQuarterbacks(gameId: number): void {
  storage()?.removeItem(key(gameId, "home"));
  storage()?.removeItem(key(gameId, "away"));
}
