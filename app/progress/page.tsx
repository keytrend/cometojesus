'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ── 타입 ────────────────────────────────────────────────
interface StatsData {
  calendar: {
    year: number
    month: number
    completed_days: number[]
  }
  streak: number
  canon_stats: {
    canon_id: string
    name_ko: string
    name_en: string
    total: number
    completed: number
    pct: number
  }[]
}

type Lang = 'ko' | 'en'

// ── 상수 ────────────────────────────────────────────────
const WEEKDAYS: Record<Lang, string[]> = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}

const T: Record<Lang, Record<string, string>> = {
  ko: {
    back:        '← 경전으로',
    title:       '학습 진도',
    calSection:  '월별 학습 기록',
    streakTitle: '연속 학습일',
    streakUnit:  '일',
    streakNone:  '오늘 학습을 시작해 보세요',
    barSection:  '경전별 완료율',
    chUnit:      '장',
    legendLabel: '학습 완료',
    errMsg:      '데이터를 불러오지 못했습니다.',
    retry:       '다시 시도',
  },
  en: {
    back:        '← Scripture',
    title:       'Study Progress',
    calSection:  'Monthly Record',
    streakTitle: 'Day Streak',
    streakUnit:  ' days',
    streakNone:  'Start studying today',
    barSection:  'Completion by Scripture',
    chUnit:      'ch',
    legendLabel: 'Completed',
    errMsg:      'Failed to load data.',
    retry:       'Retry',
  },
}

// ── 캘린더 셀 생성 ──────────────────────────────────────
interface CalCell { day: number | null; completed: boolean; isToday: boolean }

function buildCalendar(year: number, month: number, completedSet: Set<number>): CalCell[] {
  const today    = new Date()
  const firstDay = new Date(year, month - 1, 1).getDay()   // 0=일
  const lastDay  = new Date(year, month, 0).getDate()
  const cells: CalCell[] = []

  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, completed: false, isToday: false })
  }
  for (let d = 1; d <= lastDay; d++) {
    cells.push({
      day:       d,
      completed: completedSet.has(d),
      isToday:
        today.getFullYear() === year &&
        today.getMonth() + 1 === month &&
        today.getDate() === d,
    })
  }
  return cells
}

// ── 컴포넌트 ────────────────────────────────────────────
export default function ProgressPage() {
  const now = new Date()
  const [lang, setLang]     = useState<Lang>('ko')
  const [year, setYear]     = useState(now.getFullYear())
  const [month, setMonth]   = useState(now.getMonth() + 1)
  const [data, setData]     = useState<StatsData | null>(null)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [guestId, setGuestId] = useState<string>('')

  // localStorage는 클라이언트에서만 읽음
  useEffect(() => {
    if (!localStorage.getItem('guest_user_id')) {
      localStorage.setItem('guest_user_id', crypto.randomUUID())
    }
    setGuestId(localStorage.getItem('guest_user_id') ?? 'guest')
  }, [])

  const fetchStats = useCallback(() => {
    if (!guestId) return
    setStatus('loading')
    fetch(`/api/progress/stats?year=${year}&month=${month}`, {
      headers: { 'x-guest-id': guestId },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: StatsData) => { setData(d); setStatus('done') })
      .catch(() => setStatus('error'))
  }, [year, month, guestId])

  useEffect(() => { fetchStats() }, [fetchStats])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const t          = T[lang]
  const completedSet = new Set(data?.calendar.completed_days ?? [])
  const cells      = buildCalendar(year, month, completedSet)
  const weekdays   = WEEKDAYS[lang]

  // 이번 달인지 (미래 달로 이동 제한)
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1
  const isFuture =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1)

  return (
    <div className="pg-root">

      {/* ── 헤더 ── */}
      <header className="pg-header">
        <Link href="/scripture" className="pg-back">{t.back}</Link>
        <h1 className="pg-title">{t.title}</h1>
        <div className="pg-lang-toggle">
          <button
            className={`pg-lang-btn ${lang === 'ko' ? 'active' : ''}`}
            onClick={() => setLang('ko')}
          >한국어</button>
          <button
            className={`pg-lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >English</button>
        </div>
      </header>

      <main className="pg-main">

        {/* ── 로딩 ── */}
        {status === 'loading' && (
          <div className="pg-center">
            <span className="pg-spinner" />
          </div>
        )}

        {/* ── 에러 ── */}
        {status === 'error' && (
          <div className="pg-center pg-error-wrap">
            <p className="pg-error-msg">{t.errMsg}</p>
            <button className="pg-retry-btn" onClick={fetchStats}>{t.retry}</button>
          </div>
        )}

        {/* ── 데이터 ── */}
        {status === 'done' && data && (
          <>

            {/* ══ Section 1: 연속 학습일 ══ */}
            <section className="pg-section">
              <div className="streak-card">
                <span className="streak-flame" aria-hidden>🔥</span>
                <div className="streak-body">
                  <span className="streak-num">{data.streak}</span>
                  <span className="streak-unit">{t.streakUnit}</span>
                </div>
                <p className="streak-label">{t.streakTitle}</p>
                {data.streak === 0 && (
                  <p className="streak-hint">{t.streakNone}</p>
                )}
              </div>
            </section>

            {/* ══ Section 2: 월별 캘린더 ══ */}
            <section className="pg-section">
              <div className="sec-head">
                <h2 className="sec-title">{t.calSection}</h2>

                {/* 월 네비게이션 */}
                <div className="cal-nav">
                  <button className="cal-nav-btn" onClick={prevMonth} aria-label="이전 달">
                    ‹
                  </button>
                  <span className="cal-month">
                    {year}.{String(month).padStart(2, '0')}
                  </span>
                  <button
                    className="cal-nav-btn"
                    onClick={nextMonth}
                    disabled={isFuture}
                    aria-label="다음 달"
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* 캘린더 그리드 */}
              <div className="cal-grid">
                {/* 요일 헤더 */}
                {weekdays.map(d => (
                  <div key={d} className={`cal-wd ${d === '일' || d === 'Sun' ? 'sun' : ''}`}>
                    {d}
                  </div>
                ))}

                {/* 날짜 셀 */}
                {cells.map((cell, i) => (
                  <div
                    key={i}
                    className={[
                      'cal-cell',
                      !cell.day      ? 'cal-cell--empty' : '',
                      cell.completed ? 'cal-cell--done'  : '',
                      cell.isToday   ? 'cal-cell--today' : '',
                    ].filter(Boolean).join(' ')}
                    aria-label={
                      cell.day
                        ? `${month}월 ${cell.day}일${cell.completed ? ' (학습 완료)' : ''}`
                        : undefined
                    }
                  >
                    {cell.day && (
                      <>
                        <span className="cal-day">{cell.day}</span>
                        {cell.completed && (
                          <span className="cal-dot" aria-hidden />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* 범례 */}
              <div className="cal-legend">
                <span className="cal-legend-dot" aria-hidden />
                <span className="cal-legend-text">{t.legendLabel}</span>
                <span className="cal-legend-count">
                  {completedSet.size}
                  {lang === 'ko' ? '일' : ' days'}
                </span>
              </div>
            </section>

            {/* ══ Section 3: 경전별 완료율 ══ */}
            <section className="pg-section">
              <h2 className="sec-title">{t.barSection}</h2>

              <div className="bar-list">
                {data.canon_stats.map(c => (
                  <div key={c.canon_id} className="bar-item">
                    <div className="bar-meta">
                      <span className="bar-name">
                        {lang === 'ko' ? c.name_ko : c.name_en}
                      </span>
                      <span className="bar-stat">
                        {c.completed.toLocaleString()}
                        <span className="bar-stat-sep"> / </span>
                        {c.total.toLocaleString()} {t.chUnit}
                        <span className="bar-pct">{c.pct}%</span>
                      </span>
                    </div>
                    <div className="bar-track" aria-hidden>
                      <div
                        className="bar-fill"
                        style={{ '--pct': `${c.pct}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </>
        )}
      </main>

      {/* ── 스타일 ── */}
      <style jsx>{`
        /* ── 레이아웃 ── */
        .pg-root {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          flex-direction: column;
        }

        /* ── 헤더 ── */
        .pg-header {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 1.5rem;
          height: var(--nav-height);
          background: var(--bg);
          border-bottom: 0.5px solid var(--border);
        }
        .pg-back {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          flex-shrink: 0;
          transition: color 0.15s;
        }
        .pg-back:hover { color: var(--text); }
        .pg-title {
          flex: 1;
          font-family: var(--serif);
          font-size: 16px;
          font-weight: 600;
          text-align: center;
        }
        .pg-lang-toggle {
          display: flex;
          border: 0.5px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
          flex-shrink: 0;
        }
        .pg-lang-btn {
          background: none;
          border: none;
          padding: 4px 9px;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
        }
        .pg-lang-btn.active {
          background: var(--text);
          color: var(--bg);
        }

        /* ── 메인 ── */
        .pg-main {
          flex: 1;
          padding: 1.5rem 1.5rem 3rem;
          max-width: 600px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* ── 로딩 / 에러 ── */
        .pg-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 0;
          gap: 12px;
        }
        .pg-spinner {
          display: block;
          width: 28px;
          height: 28px;
          border: 2px solid var(--border-mid);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pg-error-msg {
          font-size: 14px;
          color: var(--text-muted);
        }
        .pg-retry-btn {
          background: none;
          border: 0.5px solid var(--border-mid);
          padding: 7px 18px;
          border-radius: var(--radius-md);
          font-size: 13px;
          color: var(--text);
        }
        .pg-retry-btn:hover { background: var(--bg-secondary); }

        /* ── 섹션 공통 ── */
        .pg-section {
          background: var(--bg);
          border: 0.5px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
        }
        .sec-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .sec-title {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gold);
        }

        /* ══ Section 1: Streak ══ */
        .streak-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.5rem 0 0.25rem;
          gap: 2px;
        }
        .streak-flame { font-size: 32px; line-height: 1; margin-bottom: 4px; }
        .streak-body  { display: flex; align-items: baseline; gap: 4px; }
        .streak-num {
          font-family: var(--serif);
          font-size: 56px;
          font-weight: 600;
          color: var(--gold);
          line-height: 1;
        }
        .streak-unit {
          font-size: 18px;
          color: var(--gold);
          font-weight: 500;
        }
        .streak-label {
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .streak-hint {
          font-size: 12px;
          color: var(--text-hint);
          margin-top: 6px;
        }

        /* ══ Section 2: Calendar ══ */
        .cal-nav {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cal-nav-btn {
          background: none;
          border: 0.5px solid var(--border);
          width: 28px;
          height: 28px;
          border-radius: var(--radius-md);
          font-size: 16px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          padding: 0;
          transition: background 0.12s, color 0.12s;
        }
        .cal-nav-btn:hover:not(:disabled) {
          background: var(--bg-secondary);
          color: var(--text);
        }
        .cal-nav-btn:disabled { opacity: 0.3; cursor: default; }
        .cal-month {
          font-size: 14px;
          font-weight: 500;
          min-width: 60px;
          text-align: center;
        }

        /* 7-열 그리드 */
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 10px;
        }

        /* 요일 헤더 */
        .cal-wd {
          text-align: center;
          font-size: 10px;
          font-weight: 500;
          color: var(--text-hint);
          padding: 4px 0;
          letter-spacing: 0.04em;
        }
        .cal-wd.sun { color: #c0392b; }

        /* 날짜 셀 */
        .cal-cell {
          position: relative;
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          gap: 3px;
          min-height: 40px;
        }
        .cal-cell--empty  { pointer-events: none; }
        .cal-cell--today  {
          background: var(--bg-secondary);
          border: 0.5px solid var(--border-mid);
        }
        .cal-cell--done   { background: rgba(184, 134, 11, 0.07); }

        .cal-day {
          font-size: 12px;
          color: var(--text);
          line-height: 1;
        }
        .cal-cell--today .cal-day { font-weight: 600; }

        /* 골드 점 */
        .cal-dot {
          display: block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--gold);
          flex-shrink: 0;
        }

        /* 범례 */
        .cal-legend {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-top: 6px;
          border-top: 0.5px solid var(--border);
        }
        .cal-legend-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--gold);
          flex-shrink: 0;
        }
        .cal-legend-text {
          font-size: 11px;
          color: var(--text-muted);
          flex: 1;
        }
        .cal-legend-count {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
        }

        /* ══ Section 3: 막대 그래프 ══ */
        .bar-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 6px;
        }
        .bar-item {}
        .bar-meta {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 6px;
          gap: 8px;
        }
        .bar-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }
        .bar-stat {
          font-size: 11px;
          color: var(--text-hint);
          white-space: nowrap;
        }
        .bar-stat-sep { color: var(--border-mid); }
        .bar-pct {
          margin-left: 6px;
          font-weight: 600;
          color: var(--gold);
        }

        /* 트랙 */
        .bar-track {
          height: 7px;
          background: var(--bg-secondary);
          border-radius: 99px;
          overflow: hidden;
        }
        /* 채우기 — CSS custom property로 애니메이션 */
        .bar-fill {
          height: 100%;
          width: 0;
          background: linear-gradient(90deg, var(--gold) 0%, #d4a017 100%);
          border-radius: 99px;
          animation: bar-grow 0.7s ease forwards;
        }
        @keyframes bar-grow {
          from { width: 0; }
          to   { width: var(--pct); }
        }

        /* ── 모바일 ── */
        @media (max-width: 768px) {
          .pg-main { padding: 1rem 1rem 4rem; }
          .pg-section { padding: 1rem; }

          .streak-num   { font-size: 44px; }
          .streak-flame { font-size: 26px; }

          .cal-cell  { min-height: 34px; }
          .cal-day   { font-size: 11px; }
          .cal-grid  { gap: 3px; }
        }

        @media (max-width: 375px) {
          .pg-header  { padding: 0 1rem; }
          .pg-title   { font-size: 14px; }
          .cal-cell   { min-height: 30px; }
        }
      `}</style>
    </div>
  )
}
