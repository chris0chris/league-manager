import React, { useEffect, useMemo, useState } from 'react';
import { JourneySession, JourneySessionsResponse } from '../types';
import { fetchJourneySessions } from '../utils/api';
import './UserJourneys.css';

export const CAT_LABEL: Record<string, string> = {
  discover: 'Discover',
  create: 'Create',
  edit: 'Edit',
  live: 'Live/Match',
  publish: 'Publish',
  other: 'Other',
};

export const CAT_ORDER = ['discover', 'create', 'edit', 'live', 'publish', 'other'];

function fmtDuration(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m ${rem}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

function fmtWhen(ts: string): string {
  const d = new Date(ts.replace(' ', 'T'));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${months[d.getMonth()]} ${d.getDate()}, ${hh}:${mm}`;
}

function fmtClock(ts: string): string {
  const d = new Date(ts.replace(' ', 'T'));
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function mergeCatCounts(sessionsArr: JourneySession[]): Record<string, number> {
  const out: Record<string, number> = {};
  sessionsArr.forEach((s) => {
    Object.entries(s.cat_counts).forEach(([cat, n]) => {
      out[cat] = (out[cat] || 0) + n;
    });
  });
  return out;
}

export const UserJourneys: React.FC = () => {
  const [data, setData] = useState<JourneySessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const report = await fetchJourneySessions(7);
        setData(report);
        setError(null);
      } catch (err) {
        console.error('Failed to load journey sessions:', err);
        setError('Failed to load user journeys.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const users = useMemo(() => {
    if (!data) return [];
    const byUser = new Map<string, JourneySession[]>();
    data.sessions.forEach((s) => {
      const list = byUser.get(s.user) || [];
      list.push(s);
      byUser.set(s.user, list);
    });
    return Array.from(byUser.entries())
      .map(([user, sessions]) => ({
        user,
        sessions: sessions.slice().sort((a, b) => (a.started_at < b.started_at ? 1 : -1)),
      }))
      .sort((a, b) => (a.sessions[0].started_at < b.sessions[0].started_at ? 1 : -1));
  }, [data]);

  const sessionMatches = (s: JourneySession): boolean => {
    if (cats.size) {
      const has = s.events.some((e) => cats.has(e.category));
      if (!has) return false;
    }
    if (query) {
      const hay = s.events.map((e) => `${e.name} ${JSON.stringify(e.meta)}`).join(' ').toLowerCase();
      if (hay.indexOf(query) === -1) return false;
    }
    return true;
  };

  const filteredUsers = users
    .map((u) => ({ ...u, sessions: u.sessions.filter(sessionMatches) }))
    .filter((u) => u.sessions.length > 0);

  const currentUser = filteredUsers.find((u) => u.user === selectedUser) || filteredUsers[0];

  const activeSession =
    currentUser?.sessions.find((s) => s.id === selectedSession) || currentUser?.sessions[0];

  const toggleCategory = (cat: string) => {
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (loading) {
    return <div className="user-journeys" data-testid="user-journeys">Loading user journeys...</div>;
  }

  if (error) {
    return <div className="user-journeys" data-testid="user-journeys">{error}</div>;
  }

  if (!data || !currentUser) {
    return <div className="user-journeys" data-testid="user-journeys">No journey sessions in this window.</div>;
  }

  const { summary } = data;
  const maxTopCount = summary.top_events.length ? summary.top_events[0][1] : 1;
  const totalMatchingSessions = filteredUsers.reduce((acc, u) => acc + u.sessions.length, 0);

  const usedCats = CAT_ORDER.filter((cat) =>
    data.sessions.some((s) => s.events.some((e) => e.category === cat))
  );

  return (
    <div className="user-journeys" data-testid="user-journeys">
      <div className="uj-summary">
        <div className="uj-stat">
          <div className="uj-stat-n">{summary.n_sessions}</div>
          <div className="uj-stat-l">Sessions</div>
        </div>
        <div className="uj-stat">
          <div className="uj-stat-n">{summary.n_users}</div>
          <div className="uj-stat-l">Users</div>
        </div>
        <div className="uj-stat">
          <div className="uj-stat-n">{summary.n_events}</div>
          <div className="uj-stat-l">Events</div>
        </div>
        <div className="uj-stat">
          <div className="uj-stat-n">
            {summary.n_sessions ? (summary.n_events / summary.n_sessions).toFixed(1) : '0'}
          </div>
          <div className="uj-stat-l">Events / session</div>
        </div>
        <div className="uj-stat uj-freq">
          <div className="uj-stat-l">Top events (window)</div>
          <div className="uj-freq-bars">
            {summary.top_events.slice(0, 5).map(([name, count]) => (
              <div className="uj-freq-row" key={name}>
                <span className="uj-freq-name">{name}</span>
                <span className="uj-freq-track">
                  <span className="uj-freq-fill" style={{ width: `${Math.round((count / maxTopCount) * 100)}%` }} />
                </span>
                <span className="uj-freq-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="uj-controls">
        <input
          type="search"
          className="uj-search"
          placeholder="Search by event name, gameday id…"
          aria-label="Search events"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="uj-chip-group">
          {usedCats.map((cat) => (
            <button
              key={cat}
              type="button"
              className="uj-chip"
              style={{ color: `var(--cat-${cat})` }}
              aria-pressed={cats.has(cat)}
              onClick={() => toggleCategory(cat)}
            >
              <span className="uj-dot" style={{ background: 'currentColor' }} />
              {CAT_LABEL[cat]}
            </button>
          ))}
        </div>
        <span className="uj-result-count">
          {totalMatchingSessions} of {data.sessions.length} sessions · {filteredUsers.length} of {users.length} users
        </span>
      </div>

      <div className="uj-layout">
        <div className="uj-session-list">
          {filteredUsers.map((u) => {
            const totalEvents = u.sessions.reduce((acc, s) => acc + s.event_count, 0);
            const catsForFlow = mergeCatCounts(u.sessions);
            return (
              <button
                key={u.user}
                type="button"
                className="uj-session-card"
                aria-current={u.user === currentUser.user}
                onClick={() => {
                  setSelectedUser(u.user);
                  setSelectedSession(null);
                }}
              >
                <div className="uj-card-row1">
                  <span className="uj-card-user">{u.user}</span>
                  <span className="uj-card-when">{fmtWhen(u.sessions[0].started_at)}</span>
                </div>
                <div className="uj-cat-flow">
                  {CAT_ORDER.filter((cat) => catsForFlow[cat]).map((cat) => (
                    <span
                      key={cat}
                      style={{ background: `var(--cat-${cat})` }}
                      title={`${CAT_LABEL[cat]}: ${catsForFlow[cat]}`}
                    />
                  ))}
                </div>
                <div className="uj-card-row2">
                  <span>
                    {u.sessions.length} session{u.sessions.length === 1 ? '' : 's'} · {totalEvents} events
                  </span>
                  <span>last active</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="uj-detail">
          <div className="uj-strip">
            <div className="uj-strip-label">
              Sessions — <b>{currentUser.user}</b>
              <span>{currentUser.sessions.length} shown</span>
            </div>
            <div className="uj-pill-row">
              {currentUser.sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="uj-session-pill"
                  data-session-id={s.id}
                  aria-current={s.id === activeSession?.id}
                  onClick={() => setSelectedSession(s.id)}
                >
                  <span className="uj-pill-date">{fmtWhen(s.started_at)}</span>
                  <div className="uj-cat-flow">
                    {CAT_ORDER.filter((cat) => s.cat_counts[cat]).map((cat) => (
                      <span key={cat} style={{ background: `var(--cat-${cat})` }} />
                    ))}
                  </div>
                  <span className="uj-pill-bottom">
                    <span>{s.event_count} ev</span>
                    <span>{s.ongoing ? 'ongoing' : fmtDuration(s.duration_s)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {activeSession && (
            <div className="uj-detail-body">
              <div className="uj-detail-header">
                <div>
                  <h3>
                    {activeSession.user} — session #{activeSession.id}
                  </h3>
                  <div className="uj-meta">
                    <span>
                      Started <b>{activeSession.started_at}</b>
                    </span>
                    <span>
                      {activeSession.ongoing ? (
                        <b className="uj-ongoing">still ongoing</b>
                      ) : (
                        <>Ended <b>{activeSession.ended_at || activeSession.events[activeSession.events.length - 1].at}</b></>
                      )}
                    </span>
                    <span>
                      Duration <b>{fmtDuration(activeSession.duration_s)}</b>
                    </span>
                    <span>
                      <b>{activeSession.event_count}</b> events
                    </span>
                  </div>
                </div>
                <div className="uj-legend">
                  {CAT_ORDER.filter((cat) => activeSession.cat_counts[cat]).map((cat) => (
                    <span key={cat}>
                      <span className="uj-dot" style={{ background: `var(--cat-${cat})` }} />
                      {CAT_LABEL[cat]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="uj-timeline">
                {activeSession.events.map((e, idx) => {
                  const metaKeys = Object.keys(e.meta || {});
                  return (
                    <div className="uj-tl-item" key={`${e.at}-${idx}`}>
                      <span className="uj-tl-dot" style={{ background: `var(--cat-${e.category})` }} />
                      <div className="uj-tl-row">
                        <span className="uj-tl-time">{fmtClock(e.at)}</span>
                        <span className="uj-tl-name">{e.name}</span>
                        <span className="uj-tl-cat" style={{ color: `var(--cat-${e.category})`, background: `var(--cat-${e.category}-bg)` }}>
                          {CAT_LABEL[e.category]}
                        </span>
                      </div>
                      {metaKeys.length > 0 && (
                        <div className="uj-tl-meta">
                          {metaKeys.map((k) => (
                            <code key={k}>
                              {k}={String(e.meta[k])}
                            </code>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserJourneys;
