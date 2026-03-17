import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Nav from '../components/Nav'
import ChapterView from '../components/ChapterView'
import { supabase, getBooks, getChapter } from '../lib/supabase'
import type { Lang, Book, Chapter } from '../lib/supabase'

const CANONS = [
  { id: 'ot',  ko: '구약전서',    en: 'Old Testament' },
  { id: 'nt',  ko: '신약전서',    en: 'New Testament' },
  { id: 'bom', ko: '몰몬경',      en: 'Book of Mormon' },
  { id: 'dc',  ko: '교리와 성약', en: 'Doctrine & Covenants' },
  { id: 'pgp', ko: '값진 진주',   en: 'Pearl of Great Price' },
]

export default function Scripture() {
  const [lang, setLang]         = useState<Lang>('ko')
  const [canonId, setCanonId]   = useState('ot')
  const [books, setBooks]       = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const [chapterData, setChapterData] = useState<Chapter | null>(null)
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')
  const router = useRouter()

  // 경전 탭 변경 시 책 목록 로드
  useEffect(() => {
    setSelectedBook(null)
    setSelectedChapter(null)
    setChapterData(null)
    loadBooks(canonId)
  }, [canonId])

  // URL 파라미터에서 canon 초기화
  useEffect(() => {
    if (router.query.canon) setCanonId(router.query.canon as string)
  }, [router.query.canon])

  async function loadBooks(cid: string) {
    setLoading(true)
    try {
      const data = await getBooks(cid)
      setBooks(data)
    } catch {
      setBooks([])
    }
    setLoading(false)
  }

  async function loadChapter(book: Book, chNum: number) {
    setLoading(true)
    try {
      const data = await getChapter(book.id, chNum)
      setChapterData(data)
    } catch {
      setChapterData(null)
    }
    setLoading(false)
  }

  function selectBook(book: Book) {
    setSelectedBook(book)
    setSelectedChapter(null)
    setChapterData(null)
  }

  function selectChapter(n: number) {
    setSelectedChapter(n)
    if (selectedBook) loadChapter(selectedBook, n)
  }

  const filteredBooks = books.filter(b =>
    (lang === 'ko' ? b.name_ko : b.name_en)
      .toLowerCase().includes(search.toLowerCase())
  )

  const currentCanon = CANONS.find(c => c.id === canonId)
  const canonName = currentCanon ? (lang === 'ko' ? currentCanon.ko : currentCanon.en) : ''
  const bookName  = selectedBook ? (lang === 'ko' ? selectedBook.name_ko : selectedBook.name_en) : ''

  return (
    <div className="page-wrap">
      <Nav lang={lang} onLangChange={setLang} />

      <div className="scripture-page">
        {/* 좌측: 경전 탭 + 책 목록 */}
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
            {loading && !selectedBook ? (
              <div className="loading">{lang === 'ko' ? '불러오는 중...' : 'Loading...'}</div>
            ) : filteredBooks.map(book => (
              <button
                key={book.id}
                className={`book-item ${selectedBook?.id === book.id ? 'active' : ''}`}
                onClick={() => selectBook(book)}
              >
                <span className="book-item-name">
                  {lang === 'ko' ? book.name_ko : book.name_en}
                </span>
                <span className="book-item-count">
                  {book.chapter_count}{lang === 'ko' ? '장' : ' ch.'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 가운데: 장 번호 목록 */}
        {selectedBook && (
          <div className="chapter-panel">
            <div className="chapter-panel-title">
              {lang === 'ko' ? '장' : 'Ch.'}
            </div>
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

        {/* 우측: 14개 항목 뷰 */}
        <div className="content-panel">
          {loading && selectedBook ? (
            <div className="loading">{lang === 'ko' ? '말씀을 불러오는 중...' : 'Loading...'}</div>
          ) : chapterData ? (
            <ChapterView
              chapter={chapterData}
              lang={lang}
              bookName={bookName}
              canonName={canonName}
            />
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-hint)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📖</div>
              <div style={{ fontSize: 14 }}>
                {lang === 'ko'
                  ? selectedBook ? '장을 선택해주세요.' : '왼쪽에서 책을 선택해주세요.'
                  : selectedBook ? 'Select a chapter.' : 'Select a book from the left.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
