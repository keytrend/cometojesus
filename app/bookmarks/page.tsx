'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

// ── 타입 ────────────────────────────────────────────────
interface Bookmark {
  id: number
  chapter_id: number
  note: string | null
  created_at: string
  chapters: {
    chapter_number: number
    books: {
      name_ko: string
      name_en: string
      canons: {
        id: string
        name_ko: string
        name_en: string
      }
    }
  }
}

type Lang = 'ko' | 'en'

// ── 텍스트 상수 ──────────────────────────────────────────
const T: Record<Lang, Record<string, string>> = {
  ko: {
    back:          '← 경전으로',
    title:         '책갈피',
    count:         '개',
    empty:         '저장된 책갈피가 없습니다.',
    emptyHint:     '경전 읽기 중 ☆ 버튼을 눌러 책갈피를 추가하세요.',
    errLoad:       '목록을 불러오지 못했습니다.',
    retry:         '다시 시도',
    goChapter:     '장으로 이동 →',
    memoPlaceholder: '메모를 남겨보세요...',
    save:          '저장',
    saving:        '저장 중...',
    cancel:        '취소',
    errSave:       '저장에 실패했습니다.',
    delete:        '삭제',
    deleteConfirm: '정말 삭제?',
    deleteCancel:  '취소',
    chapter:       '장',
  },
  en: {
    back:          '← Scripture',
    title:         'Bookmarks',
    count:         '',
    empty:         'No bookmarks saved yet.',
    emptyHint:     'Tap ☆ while reading to add a bookmark.',
    errLoad:       'Failed to load bookmarks.',
    retry:         'Retry',
    goChapter:     'Go to chapter →',
    memoPlaceholder: 'Add a note...',
    save:          'Save',
    saving:        'Saving...',
    cancel:        'Cancel',
    errSave:       'Failed to save.',
    delete:        'Delete',
    deleteConfirm: 'Sure?',
    deleteCancel:  'No',
    chapter:       '',
  },
}

// ── 북마크 카드 ──────────────────────────────────────────
interface CardProps {
  bm:     Bookmark
  lang:   Lang
  guestId: string
  onDelete:    (chapterId: number) => void
  onMemoSaved: (chapterId: number, note: string) => void
}

function BookmarkCard({ bm, lang, guestId, onDelete, onMemoSaved }: CardProps) {
  const t = T[lang]

  const [editing, setEditing]             = useState(false)
  const [draft, setDraft]                 = useState(bm.note ?? '')
  const [saveStatus, setSaveStatus]       = useState<'idle' | 'saving' | 'error'>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 편집 모드 진입 시 textarea 포커스
  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  function startEdit() {
    setDraft(bm.note ?? '')
    setEditing(true)
    setSaveStatus('idle')
  }
  function cancelEdit() {
    setEditing(false)
    setDraft(bm.note ?? '')
    setSaveStatus('idle')
  }

  async function saveMemo() {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/bookmarks?chapter_id=${bm.chapter_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-guest-id': guestId },
        body:    JSON.stringify({ note: draft.trim() || null }),
      })
      if (!res.ok) throw new Error()
      setSaveStatus('idle')
      setEditing(false)
      onMemoSaved(bm.chapter_id, draft.trim())
    } catch {
      setSaveStatus('error')
    }
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') { cancelEdit(); return }
    // Ctrl+Enter / Cmd+Enter → 저장
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { saveMemo() }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/bookmarks?chapter_id=${bm.chapter_id}`, {
        method:  'DELETE',
        headers: { 'x-guest-id': guestId },
      })
      if (!res.ok && res.status !== 404) throw new Error()
      onDelete(bm.chapter_id)
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const canon  = bm.chapters.books.canons
  const book   = bm.chapters.books
  const chNum  = bm.chapters.chapter_number
  const bookName = lang === 'ko' ? book.name_ko  : book.name_en
  const canonName = lang === 'ko' ? canon.name_ko : canon.name_en

  // 경전 페이지 URL
  const scriptureHref = `/scripture?canon=${canon.id}`

  return (
    <article className="bm-card">
      {/* ── 카드 상단: 경전 뱃지 + 참조 + 날짜 ── */}
      <div className="bm-card-head">
        <div className="bm-refs">
          <span className="bm-canon">{canonName}</span>
          <span className="bm-title">
            {bookName}&nbsp;{chNum}{lang === 'ko' ? t.chapter : ''}
          </span>
        </div>
        <span className="bm-date">
          {new Date(bm.created_at).toLocaleDateString(
            lang === 'ko' ? 'ko-KR' : 'en-US',
            { month: 'short', day: 'numeric' }
          )}
        </span>
      </div>

      {/* ── 메모 영역 ── */}
      <div className="bm-memo-wrap">
        {editing ? (
          <>
            <textarea
              ref={textareaRef}
              className="bm-textarea"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder={t.memoPlaceholder}
              rows={3}
            />
            <div className="bm-edit-actions">
              {saveStatus === 'error' && (
                <span className="bm-save-err">{t.errSave}</span>
              )}
              <button
                className="bm-cancel-btn"
                onClick={cancelEdit}
                disabled={saveStatus === 'saving'}
              >
                {t.cancel}
              </button>
              <button
                className="bm-save-btn"
                onClick={saveMemo}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? t.saving : t.save}
              </button>
            </div>
          </>
        ) : (
          <button
            className={`bm-memo-display ${!bm.note ? 'bm-memo-empty' : ''}`}
            onClick={startEdit}
            aria-label="메모 편집"
          >
            <span className="bm-memo-icon" aria-hidden>✏️</span>
            <span className="bm-memo-text">
              {bm.note || t.memoPlaceholder}
            </span>
          </button>
        )}
      </div>

      {/* ── 카드 하단: 이동 버튼 + 삭제 버튼 ── */}
      <div className="bm-card-foot">
        <Link href={scriptureHref} className="bm-go-btn">
          {t.goChapter}
        </Link>

        <div className="bm-delete-wrap">
          {confirmDelete ? (
            <>
              <button
                className="bm-delete-cancel"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                {t.deleteCancel}
              </button>
              <button
                className="bm-delete-confirm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? '···' : t.deleteConfirm}
              </button>
            </>
          ) : (
            <button
              className="bm-delete-btn"
              onClick={() => setConfirmDelete(true)}
              aria-label="북마크 삭제"
            >
              {t.delete}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .bm-card {
          border: 0.5px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--bg);
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .bm-card:hover { border-color: var(--border-mid); }

        /* 상단 */
        .bm-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          padding: 12px 14px 8px;
        }
        .bm-refs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .bm-canon {
          font-size: 10px;
          font-weight: 500;
          color: var(--gold);
          background: rgba(184,134,11,0.08);
          border: 0.5px solid rgba(184,134,11,0.25);
          border-radius: 20px;
          padding: 2px 8px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .bm-title {
          font-family: var(--serif);
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
        }
        .bm-date {
          font-size: 10px;
          color: var(--text-hint);
          white-space: nowrap;
          flex-shrink: 0;
          padding-top: 2px;
        }

        /* 메모 */
        .bm-memo-wrap { padding: 0 14px 10px; }

        .bm-memo-display {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          width: 100%;
          background: var(--bg-secondary);
          border: 0.5px solid transparent;
          border-radius: var(--radius-md);
          padding: 9px 10px;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.12s;
          min-height: 40px;
        }
        .bm-memo-display:hover { border-color: var(--border-mid); }
        .bm-memo-icon { font-size: 11px; flex-shrink: 0; opacity: 0.6; margin-top: 1px; }
        .bm-memo-text {
          font-size: 13px;
          color: var(--text);
          line-height: 1.6;
          flex: 1;
          word-break: break-all;
        }
        .bm-memo-empty .bm-memo-text { color: var(--text-hint); }

        .bm-textarea {
          width: 100%;
          border: 0.5px solid var(--gold);
          border-radius: var(--radius-md);
          padding: 9px 10px;
          font-family: var(--sans);
          font-size: 13px;
          color: var(--text);
          background: var(--bg);
          resize: vertical;
          outline: none;
          line-height: 1.6;
          box-shadow: 0 0 0 3px rgba(184,134,11,0.08);
        }
        .bm-edit-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          justify-content: flex-end;
        }
        .bm-save-err {
          font-size: 11px;
          color: #c0392b;
          flex: 1;
        }
        .bm-cancel-btn {
          background: none;
          border: 0.5px solid var(--border);
          padding: 4px 12px;
          border-radius: var(--radius-md);
          font-size: 12px;
          color: var(--text-muted);
        }
        .bm-cancel-btn:hover:not(:disabled) { background: var(--bg-secondary); }
        .bm-save-btn {
          background: var(--text);
          color: var(--bg);
          border: none;
          padding: 4px 14px;
          border-radius: var(--radius-md);
          font-size: 12px;
          font-weight: 500;
        }
        .bm-save-btn:hover:not(:disabled) { opacity: 0.8; }
        .bm-save-btn:disabled,
        .bm-cancel-btn:disabled { opacity: 0.5; cursor: default; }

        /* 하단 */
        .bm-card-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px 12px;
          border-top: 0.5px solid var(--border);
        }
        .bm-go-btn {
          font-size: 12px;
          font-weight: 500;
          color: var(--gold);
          transition: opacity 0.12s;
        }
        .bm-go-btn:hover { opacity: 0.75; }

        /* 삭제 버튼 */
        .bm-delete-wrap { display: flex; align-items: center; gap: 6px; }
        .bm-delete-btn {
          background: none;
          border: none;
          font-size: 12px;
          color: var(--text-hint);
          padding: 2px 4px;
          transition: color 0.12s;
        }
        .bm-delete-btn:hover { color: #c0392b; }
        .bm-delete-cancel {
          background: none;
          border: 0.5px solid var(--border);
          padding: 3px 10px;
          border-radius: var(--radius-md);
          font-size: 11px;
          color: var(--text-muted);
        }
        .bm-delete-cancel:hover:not(:disabled) { background: var(--bg-secondary); }
        .bm-delete-confirm {
          background: #c0392b;
          color: #fff;
          border: none;
          padding: 3px 10px;
          border-radius: var(--radius-md);
          font-size: 11px;
          font-weight: 500;
        }
        .bm-delete-confirm:hover:not(:disabled) { opacity: 0.85; }
        .bm-delete-confirm:disabled,
        .bm-delete-cancel:disabled { opacity: 0.5; cursor: default; }
      `}</style>
    </article>
  )
}

// ── 페이지 ───────────────────────────────────────────────
export default function BookmarksPage() {
  const [lang, setLang]         = useState<Lang>('ko')
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [status, setStatus]     = useState<'loading' | 'done' | 'error'>('loading')
  const [guestId, setGuestId]   = useState<string>('')

  useEffect(() => {
    setGuestId(localStorage.getItem('guest_user_id') ?? 'guest')
  }, [])

  const fetchBookmarks = useCallback(() => {
    if (!guestId) return
    setStatus('loading')
    fetch('/api/bookmarks', { headers: { 'x-guest-id': guestId } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: Bookmark[]) => { setBookmarks(data); setStatus('done') })
      .catch(() => setStatus('error'))
  }, [guestId])

  useEffect(() => { fetchBookmarks() }, [fetchBookmarks])

  // 삭제 후 목록에서 제거
  function handleDelete(chapterId: number) {
    setBookmarks(prev => prev.filter(b => b.chapter_id !== chapterId))
  }

  // 메모 저장 후 목록 갱신 (리페치 없이)
  function handleMemoSaved(chapterId: number, note: string) {
    setBookmarks(prev =>
      prev.map(b => b.chapter_id === chapterId ? { ...b, note: note || null } : b)
    )
  }

  const t = T[lang]

  return (
    <div className="bmp-root">

      {/* ── 헤더 ── */}
      <header className="bmp-header">
        <Link href="/scripture" className="bmp-back">{t.back}</Link>
        <h1 className="bmp-title">
          {t.title}
          {status === 'done' && bookmarks.length > 0 && (
            <span className="bmp-count">
              {bookmarks.length}{t.count}
            </span>
          )}
        </h1>
        <div className="bmp-lang-toggle">
          <button
            className={`bmp-lang-btn ${lang === 'ko' ? 'active' : ''}`}
            onClick={() => setLang('ko')}
          >한국어</button>
          <button
            className={`bmp-lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >English</button>
        </div>
      </header>

      <main className="bmp-main">

        {/* ── 로딩 ── */}
        {status === 'loading' && (
          <div className="bmp-center">
            <span className="bmp-spinner" />
          </div>
        )}

        {/* ── 에러 ── */}
        {status === 'error' && (
          <div className="bmp-center">
            <p className="bmp-err-msg">{t.errLoad}</p>
            <button className="bmp-retry" onClick={fetchBookmarks}>{t.retry}</button>
          </div>
        )}

        {/* ── 빈 상태 ── */}
        {status === 'done' && bookmarks.length === 0 && (
          <div className="bmp-empty">
            <span className="bmp-empty-icon" aria-hidden>🔖</span>
            <p className="bmp-empty-title">{t.empty}</p>
            <p className="bmp-empty-hint">{t.emptyHint}</p>
            <Link href="/scripture" className="bmp-empty-btn">
              {lang === 'ko' ? '경전 읽기 시작 →' : 'Start Reading →'}
            </Link>
          </div>
        )}

        {/* ── 목록 ── */}
        {status === 'done' && bookmarks.length > 0 && (
          <ul className="bmp-list" role="list">
            {bookmarks.map(bm => (
              <li key={bm.id}>
                <BookmarkCard
                  bm={bm}
                  lang={lang}
                  guestId={guestId}
                  onDelete={handleDelete}
                  onMemoSaved={handleMemoSaved}
                />
              </li>
            ))}
          </ul>
        )}

      </main>

      <style jsx>{`
        .bmp-root {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          flex-direction: column;
        }

        /* ── 헤더 ── */
        .bmp-header {
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
        .bmp-back {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          flex-shrink: 0;
          transition: color 0.15s;
        }
        .bmp-back:hover { color: var(--text); }
        .bmp-title {
          flex: 1;
          font-family: var(--serif);
          font-size: 16px;
          font-weight: 600;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .bmp-count {
          font-family: var(--sans);
          font-size: 11px;
          font-weight: 400;
          color: var(--text-hint);
          background: var(--bg-secondary);
          border: 0.5px solid var(--border);
          border-radius: 20px;
          padding: 1px 8px;
        }
        .bmp-lang-toggle {
          display: flex;
          border: 0.5px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
          flex-shrink: 0;
        }
        .bmp-lang-btn {
          background: none;
          border: none;
          padding: 4px 9px;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
        }
        .bmp-lang-btn.active {
          background: var(--text);
          color: var(--bg);
        }

        /* ── 메인 ── */
        .bmp-main {
          flex: 1;
          padding: 1.25rem 1.5rem 3rem;
          max-width: 600px;
          width: 100%;
          margin: 0 auto;
        }

        /* ── 로딩 / 에러 ── */
        .bmp-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 0;
          gap: 12px;
        }
        .bmp-spinner {
          display: block;
          width: 28px;
          height: 28px;
          border: 2px solid var(--border-mid);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: bmp-spin 0.6s linear infinite;
        }
        @keyframes bmp-spin { to { transform: rotate(360deg); } }
        .bmp-err-msg {
          font-size: 14px;
          color: var(--text-muted);
        }
        .bmp-retry {
          background: none;
          border: 0.5px solid var(--border-mid);
          padding: 7px 18px;
          border-radius: var(--radius-md);
          font-size: 13px;
          color: var(--text);
        }
        .bmp-retry:hover { background: var(--bg-secondary); }

        /* ── 빈 상태 ── */
        .bmp-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4rem 1rem;
          gap: 8px;
          text-align: center;
        }
        .bmp-empty-icon { font-size: 40px; margin-bottom: 4px; }
        .bmp-empty-title {
          font-size: 15px;
          font-weight: 500;
          color: var(--text);
        }
        .bmp-empty-hint {
          font-size: 13px;
          color: var(--text-hint);
          line-height: 1.7;
          max-width: 280px;
        }
        .bmp-empty-btn {
          margin-top: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--gold);
          border: 0.5px solid rgba(184,134,11,0.35);
          padding: 8px 20px;
          border-radius: var(--radius-md);
          transition: background 0.12s;
        }
        .bmp-empty-btn:hover { background: rgba(184,134,11,0.06); }

        /* ── 목록 ── */
        .bmp-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* ── 모바일 ── */
        @media (max-width: 768px) {
          .bmp-main   { padding: 1rem 1rem 4rem; }
        }
        @media (max-width: 375px) {
          .bmp-header { padding: 0 1rem; }
          .bmp-title  { font-size: 14px; }
        }
      `}</style>
    </div>
  )
}
