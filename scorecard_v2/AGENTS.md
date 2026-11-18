# scorecard_v2 — Agent Guide

React/TypeScript field-entry app. Run `npm ci`, then `npm run test:run`,
`npm run eslint` and `npm run build` from this directory.

## Wide layouts

- Below `900px`, Tracking keeps the original single-column layout; GameList
  keeps it below `1040px` (`WIDE_LIST_QUERY`).
- At `900px`, Tracking uses a two-pane log/controls grid capped by
  `--shell-width-track` (`1100px`). At `1040px` GameList uses its
  sidebar/timetable layout capped by `--shell-width-wide` (`1376px`): the 380px
  sidebar plus a two-field plan (568px) need that width. A one-field day keeps
  the plain list. The plan's time column is sticky when more fields scroll.
- Height is a breakpoint too. A phone on its side (`min-width: 640px`,
  `max-height: 520px`, landscape) gets the two-pane Tracking grid: board,
  possession and log on the left, every control plus the saved strip on the
  right. A short upright phone (`max-height: 760px`) compacts the board and
  tiles and puts Halbzeit beside Spiel beenden. Below `900px` the log never
  shrinks under two entries (`--log-min`); if the controls need the rest, the
  shell scrolls instead of clipping them.
- A log row is one touch target high: time, edit and undo sit on one line
  (the time moves above the buttons below `360px`). The saved strip sits below
  the log in the flow, never over its rows.
- `Sheet wide` (the penalty form) opens ~960px wide in two columns from
  `1280px`; every other dialog stays 680px.
- At `1280px`, Tracking adds the Spielinfo column and moves the log to the
  right. Fine-pointer desktops also show keyboard hints: **T**, **S**, **1–6**,
  **8–0**, **B** and **Ctrl/Cmd+Z**. `useTrackingShortcuts` guards dialogs, form
  fields and read-only games.
- The action tiles keep their own height (`--action-tile`, 104px / 116px) and
  only shrink on short windows; the free height of a tall screen stays below
  the controls instead of stretching them.
- Large desktops scale the whole app: `body` is zoomed by `--ui-scale`
  (1.25 / 1.5 / 1.75 / 2), stepped so the 1376×860 wide layout always fits.
  Zoom scales viewport units too, so every `vh`/`vw`/`dvh` in `app.css` must be
  divided by `var(--ui-scale)`. Breakpoints and `matchMedia` are unaffected.
- A team is one row: possession on the left (it takes the remaining width and
  shortens a long name with an ellipsis), its timeout on the right with the
  used budget (`1/2`). Both are at least `--touch` (44px) wide and high at every
  breakpoint; the timeout is one tap for either team and never a second row.
  The **Auszeit** tile in the action grid opens the same dialog (with a team
  switch inside) for officials who look for a labelled button, and carries the
  possession team's `used/perHalf` badge the Spielzeit tile used to show.
- Two-step buttons (`useArmed`, `ARM_MS` = 10s): the first tap arms a button in
  place (`.is-armed`: same box, the second action as its label, a draining
  bar), a second tap within the window runs it. The first tap follows what an
  entry needs: nothing more → save (Turnover); only an optional jersey → save,
  then "Nr. ergänzen" (1st Down, Interception; keys **1**/**3** twice); a
  required input → its sheet (touchdown, Spielzeit, Auszeit, Strafe, Safety,
  Overtime); a confirmation → arm (Halbzeit, staff "Spiel übernehmen"). A
  replacement keeps the replaced row's team and never moves the ball again.
  Undo is not a second tap: it stays in the log. While an extra point is open
  the tiles and Halbzeit are locked.
- The shell tokens live in `src/styles/tokens.css`; all visual rules use the
  existing light, sun and dark theme tokens. Responsive rules are at the end of
  `src/styles/app.css`.

## Offline writes

- A queued op can name the op whose action it completes (`originId`). A
  turnover/touchdown/interception writes the visible entry and then its
  possession flip; undo removes the entry and exactly that flip, never a
  manual possession change. The flip's `originId` is set at enqueue time from
  `GameSession.lastOpId()`.
- A queued op also remembers the signed-in username (`recordedBy`,
  `session/actor.ts`). The server keeps `request.user` as the author and stores
  a differing name as the unverified `offline_recorded_by` (plus the verified
  `offline_sent_by`) in the event payload; the log row shows
  "erfasst von X, gesendet von Y".
- A phone that lost the lock while holding entries is *stranded*: the strip
  names the count and says they are not in the official record, the list opens
  in one tap (`components/StrandedEntries.tsx`, kept on the device), and the
  main score is the server's while the device's own number is labelled as not
  official (`session/stranded.ts`). This is display only — delivering, retrying
  or dropping stranded entries is the open Q4 take-over decision.

## Offline scenario tests

`tests/e2e_scenarios/` drives two independent Chromium processes (own profile,
device id, IndexedDB queue and service worker) against one live server. It is
excluded from the default pytest run and from CI; run it locally:

```bash
scripts/run_scorecard_scenarios.sh            # SQLite, headless
scripts/run_scorecard_scenarios.sh --headed   # watch both phones
scripts/run_scorecard_scenarios.sh --mysql    # MariaDB in servyy-test
```

The script rebuilds the bundle first. A failure that names an invariant (I1–
I5) is a product finding, not a harness error; do not weaken it.
