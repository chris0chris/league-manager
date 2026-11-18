/**
 * Wire types for the scorecard v2 API.
 *
 * Each type mirrors the serializer that produces it; field names are the JSON
 * keys, not the Django model attributes. Keep them honest: a field the API
 * does not send stays out, even if a later screen would find it convenient.
 */

/**
 * `GET /api/gameday/list/` and `GET /api/gameday/<pk>/` (`GamedaySerializer`,
 * all model fields). The list endpoint is not paginated and already filters to
 * one day server-side.
 */
export interface Gameday {
  id: number;
  name: string;
  /** Season pk, not a display name. */
  season: number;
  /** League pk, not a display name. */
  league: number;
  /** `league.name` — read-only display field added for the mobile clients. */
  league_display: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM` — the serializer formats the TimeField. */
  start: string;
  format: string;
  /** User pk of the gameday author. */
  author: number;
  address: string;
  status: GamedayStatus;
  published_at: string | null;
  updated_at: string;
  resource_urls: ResourceUrl[];
}

/** Gameday lifecycle (`Gameday.STATUS_CHOICES`), not the per-game status. */
export type GamedayStatus = "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "COMPLETED";

/** Nested in {@link Gameday} (`ResourceUrlSerializer`). */
export interface ResourceUrl {
  id: number;
  url: string;
  description: string;
}

/**
 * One row of `GET /api/gameday/<pk>/officials/<team>` (`GamesToWhistleAPIView`,
 * team `*` for all games). Columns come from `GamedayService.get_games_to_whistle`.
 *
 * Beware: `id_home`/`id_away` are the primary keys of the two `Gameresult`
 * rows, **not** the `Team` ids — the pandas wrapper renames `Gameresult.id`
 * (the `id_y` merge column) to them. Do not compare them against `team_id`.
 */
export interface Game {
  /** `Gameinfo` pk — the id every game endpoint takes. */
  id: number;
  /** `HH:MM:SS` — pandas serialises the raw TimeField. */
  scheduled: string;
  field: number;
  /** Name of the officials team (the wrapper renames `officials__name`). */
  officials: string;
  /** Officials team pk (the wrapper renames `officials`). */
  officialsId: number;
  stage: string;
  standing: string;
  /** Team descriptions; `null` while a bracket placeholder is unresolved. */
  home: string | null;
  away: string | null;
  /** Regular-time score, `null` until the game has results. */
  points_home: number | null;
  points_away: number | null;
  status: GameStatus;
  /** `Gameresult` pk of the home row (see the warning above). */
  id_home: string;
  /** `Gameresult` pk of the away row (see the warning above). */
  id_away: string;
  /**
   * True only when both teams of the game passed the passcheck. Optional for
   * version skew/rollback only — the endpoint always sends it now. `undefined`
   * means "unknown" (render no chip), which is not the same as `false`.
   */
  passcheck?: boolean;
}

/**
 * `Gameinfo.status` values the app reads. The start flow writes `Geplant` →
 * `1. Halbzeit` → `2. Halbzeit` → `beendet`; `Gestartet` is still written by
 * the designer's result entry (`GameResultUpdateAPIView`), and designer-built
 * rows can carry an empty status.
 */
export type GameStatus =
  | ""
  | "Geplant"
  | "Gestartet"
  | "1. Halbzeit"
  | "2. Halbzeit"
  | "beendet";

/**
 * One crew slot of `GET/PUT /api/game/<pk>/officials/` (`GameOfficialSerializer`).
 * `official` is the linked officials-directory pk when one was picked, `name`
 * the free-text fallback (games imported without a licence row).
 */
export interface Official {
  id: number;
  official: number | null;
  name: string | null;
  position: string;
}

/** The full crew of one game — the GET answers a (possibly empty) list. */
export type Officials = Official[];

/**
 * One crew slot of `GET /api/officials/crew-positions/game/<gameId>`
 * (`CrewPositionScorecardSerializer`), configured per league.
 *
 * `position` is the exact `GameOfficial.position` wire value and is written
 * back verbatim; `label` is only what the operator reads. `required` decides
 * whether an empty slot counts against the completeness chip. The server sends
 * the league's overrides merged onto the built-in defaults, so the list always
 * holds at least the five standard slots and is never empty.
 */
export interface CrewPosition {
  position: string;
  label: string;
  order: number;
  required: boolean;
}

/**
 * `GET/PUT /api/game/<pk>/setup/` (`GameSetupSerializer`). The GET answers
 * `{}` until the game has been prepared, so every field is optional. `PUT`
 * starts the game when it creates the row, and rejects the transition when the
 * game is already running.
 *
 * v2 writes `ctResult`/`fhPossession` as `home`/`away` and `direction` as
 * `Ost`/`West`. The old app wrote team names and `directionLeft`/`Right`, so
 * reads normalise those legacy values.
 */
export interface GameSetup {
  ctResult?: string;
  direction?: string;
  fhPossession?: string;
  /**
   * The quarterback each team starts with (jersey number). A typing aid: the
   * Tracking screen remembers it per device and pre-selects it on every pass
   * and try. `null`/omitted means "not chosen".
   */
  qbHome?: number | null;
  qbAway?: number | null;
  /**
   * The device lock (Task 16). Write-only: `PUT` names the device that takes
   * the lock, `GET` never sends it back. A read that names its own device
   * learns the answer from {@link locked_elsewhere} instead.
   */
  device_id?: string;
  /**
   * Answered by a `GET` that carries this device's id: another device already
   * holds the game. Absent from a server that does not know the flag.
   */
  locked_elsewhere?: boolean;
  /** Staff may lift the lock (`DELETE /api/game/<id>/device`). */
  can_release_lock?: boolean;
}

/**
 * One entry of `GET /api/officials/team/<teamId>/list/`
 * (`OfficialTeamListScorecardSerializer`). `license` is the licence label
 * (`null` when the person has none) and `valid_until` is `YYYY-MM-DD`.
 */
export interface TeamOfficial {
  id: number;
  first_name: string;
  last_name: string;
  team: string;
  license: string | null;
  valid_until: string | null;
  is_valid: boolean;
}

/**
 * One rendered play in `GET /api/gamelog/<gameId>/` (`GameLogSerializer`).
 *
 * The serializer flattens `TeamLog` rows into one object per `sequence`:
 * a touchdown and its conversion share a sequence, so `td`/`pat1`/`pat2` can
 * appear together. Turnover-like events set `cop` plus `name`/`player`. Every
 * other event (First Down, Strafe, Safety, Spielzeit, Auszeit, …) is keyed by
 * its own German event name with the jersey (or `null`) as value.
 */
export interface LogEntry {
  sequence: number;
  /** ISO-8601 UTC; omitted when the row has no submit time. */
  time?: string;
  /** Undone entries stay in the log, struck through. */
  isDeleted?: boolean;
  /** Change-of-possession marker; pairs with `name` and `player`. */
  cop?: boolean;
  /** Event name of a `cop` entry (Turnover, Interception). */
  name?: string;
  /** Jersey of the player of a `cop` entry. */
  player?: number | null;
  /** Touchdown jersey. */
  td?: number | null;
  /** Jersey of the 1-point conversion. */
  pat1?: number | null;
  /** Jersey of the 2-point conversion. */
  pat2?: number | null;
  /** Overtime jersey. */
  OT?: number | null;
  /** Any other event name; the value is the jersey or `null`. */
  [event: string]: unknown;
}

/** `GET /api/gamelog/<gameId>/` (`GameLogSerializer`). */
export interface GameLog {
  gameId: number;
  /** False once the halftime marker exists. */
  isFirstHalf: boolean;
  /** Team *name* currently in possession, `null` before/without one. */
  inPossession?: string | null;
  /**
   * Every raw `TeamLog` row, newest first — including the non-scoring events
   * (penalties, timeouts, first downs, time) the per-half `entries` omit.
   * Optional for version skew: an older server sends only the scoring entries.
   */
  events?: GameLogEvent[];
  home: GameLogTeam;
  away: GameLogTeam;
}

/**
 * One raw `TeamLog` row of {@link GameLog.events}.
 *
 * Unlike {@link LogEntry} (a rendered play), this is one database row: a
 * touchdown and its conversion are two events, and a penalty is visible.
 */
export interface GameLogEvent {
  /** `TeamLog` pk — the identity a per-row undo sends as `team_log_id`. */
  id: number;
  sequence: number;
  /**
   * The event `seq` that wrote this row's group (slice 2). A correction names
   * it (`payload.undo_of`). `null` for a game the old app wrote (no events) and
   * for sequence 0, where many submissions share one sequence — those rows are
   * still undone by `team_log_id`.
   */
  seq?: number | null;
  /** Team name, `null` for a game-level marker (start, halftime, end). */
  team: string | null;
  /** Wire event name ("Touchdown", "Strafe", "First Down", …). */
  event: string;
  player: number | null;
  /** Free text: the penalty name, the time, a kickoff note, … */
  input: string | null;
  /**
   * The structured record the event wrote (yards, quarterback, complete,
   * defence), or `null` for a row no event wrote. Additive: older servers
   * simply omit it.
   *
   * A `Strafe` row carries `yardage` (signed from the offence's view) and
   * `nextDown` (`repeat` | `first_down` | `loss_of_down`); the drive engine
   * applies both to the spot. An unsportsmanlike-conduct row may also carry
   * `unsportsmanlike` (the free-text jersey number list); a disqualification
   * names the player in `player`.
   */
  payload?: Record<string, unknown> | null;
  half: number;
  cop: boolean;
  isDeleted: boolean;
  /** ISO-8601 UTC; anchors the row's local `HH:MM`. */
  time: string;
}

/** One side of a {@link GameLog}, split by half. */
export interface GameLogTeam {
  /** Team pk, `null` for an unresolved bracket placeholder. */
  id: number | null;
  /** Team name (`Team.name`), or the resolved placeholder name. */
  name: string | null;
  /** Total score (`firsthalf.score + secondhalf.score`). */
  score: number;
  firsthalf: GameLogHalf;
  secondhalf: GameLogHalf;
}

/** One half of a {@link GameLogTeam}. */
export interface GameLogHalf {
  score: number;
  entries: LogEntry[];
}

/**
 * `GET /api/game/<gameId>/roster` — jersey plus surname for both teams.
 * Pass numbers never leave the server. `name` is `null` when the person has
 * neither a surname nor a first name, and for a team whose passcheck was never
 * recorded for this gameday: only a confirmed roster ties a number to a name,
 * so the pad shows plain numbers rather than a surname that may belong to
 * another jersey.
 */
export interface RosterPlayer {
  side: "home" | "away";
  jersey: number;
  name: string | null;
}

/**
 * One item of `GET /api/config/scorecard/penalties/`. `isPenaltyAgainstOpponent`
 * decides which team a `Strafe` is charged to; the picker must default from it.
 * `subtext` also encodes the suggested yardage and down rule (`1st 10`,
 * `LoD 5`, …); the sheet prefills from it, the official can correct both.
 */
export interface Penalty {
  name: string;
  subtext: string;
  isPenaltyAgainstOpponent: boolean;
  /**
   * The structured rules from `GET /api/config/scorecard/rules`. Absent when
   * only the legacy `/penalties` list answered: the sheet then parses
   * `subtext`, which is what it always did.
   */
  yards?: number;
  down?: "repeat" | "first" | "loss";
  enforcement?: "BS" | "SF" | "DB" | "SL" | null;
  /** Rule reference (`7-1-3f`), shown in the sheet's summary. */
  rule?: string;
}

/**
 * One play as the entry sheets produce it — the shape the screens speak, not
 * the wire. `session/events.ts` translates it into the event envelopes
 * `POST /api/game/<id>/events` stores (one `TeamLog` row per event, scoring
 * value resolved from the code).
 *
 * `player` is the jersey (never a name or a pk). A scoring event counts only
 * when `player` is set: the server stores value 0 otherwise, so a touchdown
 * without a jersey scores nothing. `input` is the free text a row shows —
 * the time for `Spielzeit`/`Auszeit`, the penalty name for `Strafe`.
 */
export interface GameLogEventInput {
  name: string;
  player?: number;
  input?: string;
  /**
   * Structured detail the event store keeps for later statistics (yards, the
   * quarterback, whether a pass was complete). The visible text travels in
   * `input`; this is never rendered by the log itself.
   */
  payload?: Record<string, unknown>;
}

/**
 * One submission of the entry sheets. A touchdown and its conversion are two
 * entries of one submission, so they share one sequence.
 */
export interface GameLogWrite {
  gameId: number;
  /** Team *name* (the backend also resolves a pk); the possessing team. */
  team: string;
  /**
   * The period the entry belongs to: 1 or 2 for the halves, 3 in overtime.
   * Never derived from the current time. The server keeps `TeamLog.half` at
   * 1/2 and stores 3 only on the event, so every existing consumer is
   * unaffected.
   */
  half: 1 | 2 | 3;
  event: GameLogEventInput[];
}

// `PendingOp` (the outbox record) is deliberately deferred to the outbox task.
