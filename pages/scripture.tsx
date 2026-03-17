import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Nav from '../components/Nav'
import ChapterView from '../components/ChapterView'
import { getBooks, getChapter } from '../lib/supabase'
import type { Lang, Book, Chapter } from '../lib/supabase'

const CANONS = [
  { id: 'ot',  ko: '구약전서',    en: 'Old Testament' },
  { id: 'nt',  ko: '신약전서',    en: 'New Testament' },
  { id: 'bom', ko: '몰몬경',      en: 'Book of Mormon' },
  { id: 'dc',  ko: '교리와 성약', en: 'Doctrine & Covenants' },
  { id: 'pgp', ko: '값진 진주',   en: 'Pearl of Great Price' },
]

const SECTIONS = [
  { id: 's1',  icon: '💡', ko: '한 문장 핵심',    en: 'Key Sentence' },
  { id: 's2',  icon: '👥', ko: '등장인물 & 배경', en: 'Characters' },
  { id: 's3',  icon: '🗺️', ko: '지리적 배경',     en: 'Geography' },
  { id: 's4',  icon: '📖', ko: '내용 요약',        en: 'Summary' },
  { id: 's5',  icon: '🔑', ko: '핵심 사건',        en: 'Key Events' },
  { id: 's7',  icon: '💬', ko: '현대어 번역',      en: 'Translation' },
  { id: 's8',  icon: '✝️', ko: '하나님의 메시지',  en: "God's Message" },
  { id: 's9',  icon: '📅', ko: '역사 메모',        en: 'History' },
  { id: 's10', icon: '🔗', ko: '앞뒤 연결',        en: 'Links' },
  { id: 's11', icon: '🔀', ko: '경전 간 연결',     en: 'Cross-Ref' },
  { id: 's12', icon: '🙏', ko: '묵상 질문',        en: 'Reflection' },
  { id: 's13', icon: '📝', ko: '퀴즈',             en: 'Quiz', isQuiz: true },
  { id: 's14', icon: '📊', ko: '단원 요약',        en: 'Unit Summary' },
]

export default function Scripture() {
  const [lang, setLang]               = useState<Lang>('ko')
  const [canonId, setCanonId]         = useState('ot')
  const [books, setBooks]             = useState<Book[]>([])
  const [selectedBook, setSelectedBook]     = useState<Book | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const [chapterData, setChapterData] = useState<Chapter | null>(null)
  const [loading, setLoading]         = useState(false)
  const [search, setSearch]           = useState('')
  const [activeSection, setActiveSection] = useState('s1')

  // 모바일 드로어 상태
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [drawerStep, setDrawerStep]   = useState<'canon'|'book'|'chapter'>('canon')

  const router = useRouter()

  useEffect(() => {
    if (router.query.canon) setCanonId(router.query.canon as string)
  }, [router.query.canon])

  useEffect(() => {
    setSelectedBook(null)
    setSelectedChapter(null)
    setChapterData(null)
    loadBooks(canonId)
  }, [canonId])

  async function loadBooks(cid: string) {
    setLoading(true)
    try {
      const data = await getBooks(cid)
      setBooks(data)
    } catch { setBooks([]) }
    setLoading(false)
  }

  async function loadChapter(book: Book, chNum: number) {
    setLoading(true)
    try {
      const data = await getChapter(book.id, chNum)
      setChapterData(data)
    } catch { setChapterData(null) }
    setLoading(false)
  }

  function selectBook(book: Book) {
    setSelectedBook(book)
    setSelectedChapter(null)
    setChapterData(null)
    setDrawerStep('chapter')
  }

  function selectChapter(n: number) {
    setSelectedChapter(n)
    if (selectedBook) loadChapter(selectedBook, n)
    setDrawerOpen(false)
    setDrawerStep('canon')
  }

  function openDrawer() {
    setDrawerStep('canon')
    setDrawerOpen(true)
  }

  const filteredBooks = books.filter(b =>
    (lang === 'ko' ? b.name_ko : b.name_en).toLowerCase().includes(search.toLowerCase())
  )

  const currentCanon = CANONS.find(c => c.id === canonId)
  const canonName = currentCanon ? (lang === 'ko' ? currentCanon.ko : currentCanon.en) : ''
  const bookName  = selectedBook ? (lang === 'ko' ? selectedBook.name_ko : selectedBook.name_en) : ''

  const mobileBarLabel = chapterData && selectedBook
    ? `${bookName} ${selectedChapter}${lang === 'ko' ? '장' : ''}`
    : lang === 'ko' ? '경전 선택' : 'Select Scripture'

  return (
    <div className="page-wrap">
      <Nav lang={lang} onLangChange={setLang} />

      {/* ── 모바일 상단 경전 선택 바 ── */}
      <div className="mobile-scripture-bar">
        <button className="mobile-select-btn" onClick={openDrawer}>
          <span>{mobileBarLabel}</span>
          <span className="mobile-select-arrow">▼</span>
        </button>
      </div>

      <div className="scripture-page">

        {/* ── 데스크톱 좌측 패널 ── */}
        <div className="left-panel">
          <div className="panel-tabs">
            {CANONS.map(c => (
              <button
                key={c.id}
                className={`panel-tab ${canonId === c.id ? 'active' : ''}`}
                onClick={() => setCanonId(c.id)}
              >
                {lang === 'ko' ? c.ko : c.en}
              </button>
            ))}
          </div>
          <div className="panel-search">
            <input
              placeholder={lang === 'ko' ? '책 이름 검색...' : 'Search book...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="book-list">
            {loading && !selectedBook
              ? <div className="loading">{lang === 'ko' ? '불러오는 중...' : 'Loading...'}</div>
              : filteredBooks.map(book => (
                <button
                  key={book.id}
                  className={`book-item ${selectedBook?.id === book.id ? 'active' : ''}`}
                  onClick={() => { setSelectedBook(book); setSelectedChapter(null); setChapterData(null) }}
                >
                  <span className="book-item-name">{lang === 'ko' ? book.name_ko : book.name_en}</span>
                  <span className="book-item-count">{book.chapter_count}{lang === 'ko' ? '장' : ' ch.'}</span>
                </button>
              ))}
          </div>
        </div>

        {/* ── 데스크톱 장 번호 패널 ── */}
        {selectedBook && (
          <div className="chapter-panel">
            <div className="chapter-panel-title">{lang === 'ko' ? '장' : 'Ch.'}</div>
            {Array.from({ length: selectedBook.chapter_count }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className={`chapter-num-btn ${selectedChapter === n ? 'active' : ''}`}
                onClick={() => selectChapter(n)}
              >
                {n}{lang === 'ko' ? '장' : ''}
              </button>
            ))}
          </div>
        )}

        {/* ── 콘텐츠 패널 ── */}
        <div className="content-panel">
          {loading && selectedBook ? (
            <div className="loading">{lang === 'ko' ? '말씀을 불러오는 중...' : 'Loading...'}</div>
          ) : chapterData ? (
            <>
              {/* 데스크톱: 사이드바 포함 ChapterView */}
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }} className="desktop-chapter-wrap">
                <div className="section-sidebar">
                  <div className="section-sidebar-header">
                    {bookName} {selectedChapter}{lang === 'ko' ? '장' : ''}
                  </div>
                  {SECTIONS.map(s => (
                    <button
                      key={s.id}
                      className={`section-btn ${activeSection === s.id ? 'active' : ''} ${s.isQuiz ? 'quiz-btn' : ''}`}
                      onClick={() => setActiveSection(s.id)}
                    >
                      <span className="s-icon">{s.icon}</span>
                      {lang === 'ko' ? s.ko : s.en}
                    </button>
                  ))}
                </div>
                <ChapterView
                  chapter={chapterData}
                  lang={lang}
                  bookName={bookName}
                  canonName={canonName}
                  activeSection={activeSection}
                  onSectionChange={setActiveSection}
                />
              </div>

              {/* 모바일: 하단 탭바 */}
              <div className="mobile-bottom-tabs">
                {SECTIONS.map(s => (
                  <button
                    key={s.id}
                    className={`mobile-bottom-tab ${activeSection === s.id ? 'active' : ''}`}
                    onClick={() => setActiveSection(s.id)}
                  >
                    <span className="tab-icon">{s.icon}</span>
                    {lang === 'ko' ? s.ko : s.en}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-hint)', width: '100%' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📖</div>
              <div style={{ fontSize: 14 }}>
                {lang === 'ko'
                  ? selectedBook ? '장을 선택해주세요.' : '경전과 책을 선택해주세요.'
                  : selectedBook ? 'Select a chapter.' : 'Select a scripture and book.'}
              </div>
              {/* 모바일에서 선택 버튼 표시 */}
              <button
                className="btn-primary"
                style={{ marginTop: '1.5rem', display: 'none' }}
                id="mobile-open-btn"
                onClick={openDrawer}
              >
                {lang === 'ko' ? '경전 선택하기' : 'Select Scripture'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 모바일 드로어 오버레이 ── */}
      <div
        className={`mobile-drawer-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false) }}
      >
        <div className="mobile-drawer">
          <div className="mobile-drawer-header">
            <span className="mobile-drawer-title">
              {drawerStep === 'canon' && (lang === 'ko' ? '경전 선택' : 'Select Scripture')}
              {drawerStep === 'book'  && (lang === 'ko' ? '책 선택' : 'Select Book')}
              {drawerStep === 'chapter' && (lang === 'ko' ? '장 선택' : 'Select Chapter')}
            </span>
            <button className="mobile-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
          </div>

          {/* 경전 선택 */}
          {drawerStep === 'canon' && (
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
              {CANONS.map(c => (
                <button
                  key={c.id}
                  style={{
                    display: 'block', width: '100%', padding: '13px 16px',
                    background: canonId === c.id ? 'var(--bg-secondary)' : 'none',
                    border: 'none', textAlign: 'left', fontSize: 14,
                    color: canonId === c.id ? 'var(--gold)' : 'var(--text)',
                    fontWeight: canonId === c.id ? 500 : 400,
                    borderLeft: canonId === c.id ? '3px solid var(--gold)' : '3px solid transparent',
                    fontFamily: 'var(--sans)',
                  }}
                  onClick={() => { setCanonId(c.id); setDrawerStep('book') }}
                >
                  {lang === 'ko' ? c.ko : c.en}
                </button>
              ))}
            </div>
          )}

          {/* 책 선택 */}
          {drawerStep === 'book' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
                <button
                  style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-muted)', padding: '4px 0' }}
                  onClick={() => setDrawerStep('canon')}
                >
                  ← {lang === 'ko' ? '경전으로 돌아가기' : 'Back to Canon'}
                </button>
              </div>
              <div style={{ padding: '6px 10px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
                <input
                  style={{ width: '100%', border: '0.5px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, background: 'var(--bg-secondary)', fontFamily: 'var(--sans)', outline: 'none' }}
                  placeholder={lang === 'ko' ? '책 이름 검색...' : 'Search...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {loading
                  ? <div className="loading">{lang === 'ko' ? '불러오는 중...' : 'Loading...'}</div>
                  : filteredBooks.map(book => (
                    <button
                      key={book.id}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        width: '100%', padding: '11px 16px', background: selectedBook?.id === book.id ? 'var(--bg-secondary)' : 'none',
                        border: 'none', textAlign: 'left', fontFamily: 'var(--sans)',
                        borderBottom: '0.5px solid var(--border)',
                      }}
                      onClick={() => selectBook(book)}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                        {lang === 'ko' ? book.name_ko : book.name_en}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>
                        {book.chapter_count}{lang === 'ko' ? '장' : ' ch.'}
                      </span>
                    </button>
                  ))
                }
              </div>
            </div>
          )}

          {/* 장 선택 */}
          {drawerStep === 'chapter' && selectedBook && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
                <button
                  style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-muted)', padding: '4px 0' }}
                  onClick={() => setDrawerStep('book')}
                >
                  ← {lang === 'ko' ? '책으로 돌아가기' : 'Back to Books'}
                </button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, padding: 12 }}>
                {Array.from({ length: selectedBook.chapter_count }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    style={{
                      padding: '10px 4px', borderRadius: 8, fontSize: 13, fontFamily: 'var(--sans)',
                      background: selectedChapter === n ? 'var(--text)' : 'var(--bg-secondary)',
                      color: selectedChapter === n ? 'var(--bg)' : 'var(--text)',
                      border: selectedChapter === n ? 'none' : '0.5px solid var(--border)',
                      fontWeight: selectedChapter === n ? 500 : 400,
                    }}
                    onClick={() => selectChapter(n)}
                  >
                    {n}{lang === 'ko' ? '장' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 모바일 CSS 보조 */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-chapter-wrap { display: flex !important; }
          .desktop-chapter-wrap .section-sidebar { display: none; }
          #mobile-open-btn { display: inline-block !important; }
        }
      `}</style>
    </div>
  )
}
