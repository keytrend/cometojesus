'use client'

import { useState, useEffect, useRef } from 'react'

interface SearchResult {
  canon: string
  book: string
  chapter_num: number
  preview: string
}

interface SearchBarProps {
  lang?: 'ko' | 'en'
  onSelect?: (result: SearchResult) => void
}

// 검색 키워드를 <mark>로 감쌉니다 (dangerouslySetInnerHTML용)
function highlight(text: string, keyword: string): string {
  if (!keyword || !text) return text
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
}

export default function SearchBar({ lang = 'ko', onSelect }: SearchBarProps) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [open, setOpen]       = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  const T = {
    placeholder: lang === 'ko' ? '경전 검색 (2자 이상)...' : 'Search scriptures...',
    noResult:    lang === 'ko' ? '검색 결과가 없습니다.'     : 'No results found.',
    errMsg:      lang === 'ko' ? '검색 중 오류가 발생했습니다.' : 'Search failed.',
    chapter:     lang === 'ko' ? '장'                       : '',
  }

  // ── 디바운스 검색 ──────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setStatus('idle')
      setOpen(false)
      return
    }

    setStatus('loading')
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) throw new Error()
        const json = await res.json()
        setResults(json.results ?? [])
        setStatus('done')
        setOpen(true)
      } catch {
        setStatus('error')
        setResults([])
        setOpen(true)
      }
    }, 300)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  // ── 외부 클릭 시 닫기 ─────────────────────────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setQuery('')
      setResults([])
      setOpen(false)
      setStatus('idle')
    }
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setOpen(false)
    setStatus('idle')
    inputRef.current?.focus()
  }

  function handleSelect(r: SearchResult) {
    setOpen(false)
    onSelect?.(r)
  }

  const showDropdown =
    open &&
    status !== 'idle' &&
    status !== 'loading' &&
    query.trim().length >= 2

  return (
    <div className="sb-wrap" ref={containerRef}>

      {/* ── 입력창 ── */}
      <div className="sb-input-row">
        <span className="sb-icon" aria-hidden>
          {status === 'loading' ? (
            <span className="sb-spinner" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </span>

        <input
          ref={inputRef}
          className="sb-input"
          type="search"
          placeholder={T.placeholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          autoComplete="off"
          spellCheck={false}
          aria-label={T.placeholder}
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
        />

        {query && (
          <button className="sb-clear" onClick={handleClear} aria-label="검색어 지우기">
            ✕
          </button>
        )}
      </div>

      {/* ── 결과 드롭다운 ── */}
      {showDropdown && (
        <div className="sb-dropdown" role="listbox">

          {status === 'error' ? (
            <p className="sb-state sb-error">{T.errMsg}</p>

          ) : results.length === 0 ? (
            <p className="sb-state sb-empty">{T.noResult}</p>

          ) : (
            results.map((r, i) => (
              <button
                key={i}
                className="sb-card"
                role="option"
                onClick={() => handleSelect(r)}
              >
                <div className="sb-card-top">
                  <span className="sb-canon">{r.canon}</span>
                  <span className="sb-ref">
                    {r.book}&nbsp;{r.chapter_num}{T.chapter}
                  </span>
                </div>

                {r.preview && (
                  <p
                    className="sb-preview"
                    // 키워드 하이라이트 — 서버에서 온 텍스트이므로 안전
                    dangerouslySetInnerHTML={{
                      __html: highlight(r.preview, query.trim()),
                    }}
                  />
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* ── 스타일 ── */}
      <style jsx>{`
        /* 컨테이너 */
        .sb-wrap {
          position: relative;
          width: 100%;
          max-width: 540px;
        }

        /* 입력 행 */
        .sb-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 42px;
          padding: 0 12px;
          background: var(--bg);
          border: 0.5px solid var(--border-mid);
          border-radius: var(--radius-lg);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .sb-input-row:focus-within {
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(184, 134, 11, 0.1);
        }

        /* 검색 아이콘 / 스피너 */
        .sb-icon {
          display: flex;
          align-items: center;
          color: var(--text-hint);
          flex-shrink: 0;
        }
        .sb-spinner {
          display: block;
          width: 14px;
          height: 14px;
          border: 1.5px solid var(--border-mid);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: sb-spin 0.55s linear infinite;
        }
        @keyframes sb-spin {
          to { transform: rotate(360deg); }
        }

        /* 텍스트 입력 */
        .sb-input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          font-family: var(--sans);
          font-size: 14px;
          color: var(--text);
        }
        .sb-input::placeholder { color: var(--text-hint); }
        /* 브라우저 기본 ✕ 제거 */
        .sb-input::-webkit-search-cancel-button,
        .sb-input::-webkit-search-decoration { display: none; }

        /* 지우기 버튼 */
        .sb-clear {
          flex-shrink: 0;
          background: none;
          border: none;
          padding: 2px 4px;
          font-size: 11px;
          color: var(--text-hint);
          line-height: 1;
          transition: color 0.12s;
        }
        .sb-clear:hover { color: var(--text); }

        /* ── 드롭다운 ── */
        .sb-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          z-index: 200;
          background: var(--bg);
          border: 0.5px solid var(--border-mid);
          border-radius: var(--radius-lg);
          box-shadow: 0 8px 28px rgba(26, 20, 16, 0.11);
          max-height: 420px;
          overflow-y: auto;
          padding: 4px;
          scrollbar-width: thin;
          scrollbar-color: var(--border-mid) transparent;
        }
        .sb-dropdown::-webkit-scrollbar { width: 4px; }
        .sb-dropdown::-webkit-scrollbar-thumb {
          background: var(--border-mid);
          border-radius: 2px;
        }

        /* 상태 메시지 */
        .sb-state {
          padding: 16px 12px;
          font-size: 13px;
          text-align: center;
        }
        .sb-empty { color: var(--text-hint); }
        .sb-error { color: #c0392b; }

        /* ── 결과 카드 ── */
        .sb-card {
          display: block;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          border-radius: var(--radius-md);
          padding: 10px 12px;
          cursor: pointer;
          transition: background 0.1s;
        }
        .sb-card:hover { background: var(--bg-secondary); }
        .sb-card + .sb-card {
          border-top: 0.5px solid var(--border);
        }

        /* 카드 상단: 경전 뱃지 + 참조 */
        .sb-card-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 5px;
        }
        .sb-canon {
          font-size: 10px;
          font-weight: 500;
          color: var(--gold);
          background: rgba(184, 134, 11, 0.08);
          border: 0.5px solid rgba(184, 134, 11, 0.25);
          border-radius: 20px;
          padding: 2px 8px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .sb-ref {
          font-family: var(--serif);
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* 미리보기 텍스트 */
        .sb-preview {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.75;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* 모바일 */
        @media (max-width: 768px) {
          .sb-dropdown { max-height: 320px; }
          .sb-input { font-size: 16px; /* iOS 자동 확대 방지 */ }
        }
      `}</style>

      {/* mark 태그는 dangerouslySetInnerHTML로 주입되므로 global 스코프 필요 */}
      <style jsx global>{`
        .sb-preview mark {
          background: rgba(184, 134, 11, 0.18);
          color: var(--text);
          border-radius: 2px;
          padding: 0 1px;
          font-style: normal;
        }
      `}</style>
    </div>
  )
}
