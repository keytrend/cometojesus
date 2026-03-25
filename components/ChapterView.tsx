import { useState, useEffect } from 'react'
import type { Chapter, Lang, Quiz } from '../lib/supabase'
import { getQuizzes, saveQuizProgress } from '../lib/supabase'

interface Props {
  chapter: Chapter
  lang: Lang
  bookName: string
  canonName: string
  activeSection?: string
  onSectionChange?: (id: string) => void
}

const SECTIONS = [
  { id: 's1',  icon: '💡', ko: '한 문장 핵심',    en: 'Key Sentence' },
  { id: 's2',  icon: '👥', ko: '등장인물 & 배경', en: 'Characters & Setting' },
  { id: 's3',  icon: '🗺️', ko: '지리적 배경',     en: 'Geography' },
  { id: 's4',  icon: '📖', ko: '내용 요약',        en: 'Summary' },
  { id: 's5',  icon: '🔑', ko: '핵심 사건',        en: 'Key Events' },
  { id: 's6',  icon: '📜', ko: '원문 말씀',        en: 'Original Text' },
  { id: 's7',  icon: '💬', ko: '현대어 번역',      en: 'Modern Translation' },
  { id: 's8',  icon: '✝️', ko: '하나님의 메시지',  en: "God's Message" },
  { id: 's9',  icon: '📅', ko: '역사·고고학 메모', en: 'Historical Notes' },
  { id: 's10', icon: '🔗', ko: '앞뒤 장 연결고리', en: 'Chapter Links' },
  { id: 's11', icon: '🔀', ko: '경전 간 연결',     en: 'Cross-Scripture' },
  { id: 's12', icon: '🙏', ko: '묵상 질문',        en: 'Reflection' },
  { id: 's13', icon: '📝', ko: '이해도 퀴즈',      en: 'Quiz', isQuiz: true },
  { id: 's14', icon: '📊', ko: '단원 통합 요약',   en: 'Unit Summary' },
]

export default function ChapterView({ chapter, lang, bookName, canonName, activeSection, onSectionChange }: Props) {
  const [internalActive, setInternalActive] = useState('s1')
  const active = activeSection ?? internalActive
  function setActive(id: string) {
    setInternalActive(id)
    onSectionChange?.(id)
  }
  const [revealed, setRevealed] = useState<boolean[]>([false,false,false,false,false])
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [quizState, setQuizState] = useState<{
    cur: number; answers: boolean[]; answered: boolean; done: boolean
  }>({ cur: 0, answers: [], answered: false, done: false })

  // ── 학습 완료 상태 ─────────────────────────────────────
  const [isCompleted, setIsCompleted] = useState(false)
  const [marking, setMarking]         = useState(false)

  // ── 북마크 상태 ───────────────────────────────────────
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarking, setBookmarking]   = useState(false)

  // ── Groq AI 묵상 답변 ────────────────────────────────
  async function askGroq(question: string) {
    setSelectedQuestion(question)
    setAiAnswer(null)
    setAiError(null)
    setAiLoading(true)
    try {
      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류가 발생했습니다.')
      setAiAnswer(data.answer)
    } catch (e: any) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  // ── 빈칸 공개 ─────────────────────────────────────────
  function revealBlank(idx: number) {
    const next = [...revealed]
    next[idx] = true
    setRevealed(next)
  }
  function resetBlanks() { setRevealed([false,false,false,false,false]) }

  // ── S1: 빈칸 문장 렌더 ────────────────────────────────
  function renderKeySentence() {
    const sentence = chapter.key_sentence_ko || ''
    const answers = ((chapter.key_answers as any[]) || []).map((a: any) =>
    typeof a === 'string' ? a : a.answer ?? a
  )
    const circled  = ['①','②','③','④','⑤']

    const parts = sentence.split(/(\[①\]|\[②\]|\[③\]|\[④\]|\[⑤\])/)
    return parts.map((part, i) => {
      const match = part.match(/\[(①|②|③|④|⑤)\]/)
      if (match) {
        const idx = circled.indexOf(match[1])
        return (
          <button
            key={i}
            className={`blank-btn ${revealed[idx] ? 'revealed' : ''}`}
            onClick={() => !revealed[idx] && revealBlank(idx)}
            disabled={revealed[idx]}
          >
            {revealed[idx] ? answers[idx] : match[1]}
          </button>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  // ── 장 변경 시 완료 여부 로드 ────────────────────────
  useEffect(() => {
    setIsCompleted(false)
    const userId = typeof window !== 'undefined'
      ? (localStorage.getItem('guest_user_id') || 'guest') : 'guest'
    fetch(`/api/progress?chapter_id=${chapter.id}`, {
      headers: { 'x-guest-id': userId },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.is_completed) setIsCompleted(true) })
      .catch(() => {})
  }, [chapter.id])

  // ── 장 변경 시 북마크 여부 로드 ─────────────────────
  useEffect(() => {
    setIsBookmarked(false)
    const userId = typeof window !== 'undefined'
      ? (localStorage.getItem('guest_user_id') || 'guest') : 'guest'
    fetch(`/api/bookmarks?chapter_id=${chapter.id}`, {
      headers: { 'x-guest-id': userId },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.bookmarked) setIsBookmarked(true) })
      .catch(() => {})
  }, [chapter.id])

  async function markComplete() {
    if (isCompleted || marking) return
    setMarking(true)
    const userId = typeof window !== 'undefined'
      ? (localStorage.getItem('guest_user_id') || 'guest') : 'guest'
    try {
      const requestBody = { chapter_id: chapter.id, is_completed: true }
      console.log('[markComplete] POST /api/progress body:', requestBody, '| x-guest-id:', userId)
      const res = await fetch('/api/progress', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-guest-id': userId },
        body:    JSON.stringify(requestBody),
      })
      console.log('[markComplete] 응답 status:', res.status)
      if (res.ok) setIsCompleted(true)
    } catch { /* silent */ } finally {
      setMarking(false)
    }
  }

  // ── 북마크 토글 ──────────────────────────────────────
  async function toggleBookmark() {
    if (bookmarking) return
    setBookmarking(true)
    const userId = typeof window !== 'undefined'
      ? (localStorage.getItem('guest_user_id') || 'guest') : 'guest'
    try {
      if (isBookmarked) {
        const res = await fetch('/api/bookmarks', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'x-guest-id': userId },
          body: JSON.stringify({ chapter_id: chapter.id }),
        })
        if (res.ok) setIsBookmarked(false)
      } else {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-guest-id': userId },
          body: JSON.stringify({
            chapter_id: chapter.id,
            book_name: bookName,
            canon_id: canonName,
            chapter_number: chapter.chapter_number,
          }),
        })
        if (res.ok) setIsBookmarked(true)
      }
    } catch { /* silent */ } finally {
      setBookmarking(false)
    }
  }

  // ── 퀴즈 데이터 로드 ─────────────────────────────────
  const [quiz, setQuiz] = useState<Quiz[]>([])

  useEffect(() => {
    setQuiz([])
    resetQuiz()
    getQuizzes(chapter.id).then(setQuiz).catch(() => setQuiz([]))
  }, [chapter.id])
  function pickAnswer(i: number) {
    if (quizState.answered || quizState.done) return
    const correct = i === quiz[quizState.cur]?.correct_answer
    setQuizState(s => ({ ...s, answered: true, answers: [...s.answers, correct] }))
  }
  function nextQuestion() {
    const next = quizState.cur + 1
    if (next >= quiz.length) {
      const finalAnswers = [...quizState.answers]
      const score = finalAnswers.filter(Boolean).length
      setQuizState(s => ({ ...s, done: true }))
      saveQuizProgress(chapter.id, score, quiz.length).catch(() => {})
    } else {
      setQuizState(s => ({ ...s, cur: next, answered: false }))
    }
  }
  function resetQuiz() {
    setQuizState({ cur: 0, answers: [], answered: false, done: false })
  }

  const scoreMessages = {
    ko: ['다시 한 번 읽어보세요 🙏','조금 더 집중하면 완벽합니다!','좋은 출발입니다!','거의 완벽합니다!','완벽합니다! 🎉'],
    en: ['Please read again 🙏','Almost there!','Good start!','Nearly perfect!','Perfect! 🎉'],
  }

  // ── 문장 단락 렌더 ────────────────────────────────────
  function renderParagraphs(text: string | null | undefined) {
    if (!text) return null
    return text.split(/\.\s+/).filter(s => s.trim()).map((s, i) => {
      const sentence = s.trim()
      const withPeriod = sentence.endsWith('.') || sentence.endsWith('?') || sentence.endsWith('!')
        ? sentence : sentence + '.'
      return <p key={i} style={{ margin: '0 0 0.6em 0', lineHeight: 1.8 }}>{withPeriod}</p>
    })
  }

  // ── jsonb 렌더 헬퍼 ───────────────────────────────────
  function renderJsonb(data: any) {
    if (!data) return null
    if (Array.isArray(data)) {
      return (
        <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
          {data.map((item, i) => (
            <li key={i}>
              {typeof item === 'string' ? item : JSON.stringify(item, null, 2)}
            </li>
          ))}
        </ul>
      )
    }
    return (
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    )
  }

  // ── lang에 따라 컬럼 선택 헬퍼 ───────────────────────
  function t(ko: string | null | undefined, en: string | null | undefined) {
    return lang === 'en' ? (en || ko) : ko
  }
  function tj(ko: any[] | null | undefined, en: any[] | null | undefined) {
    return lang === 'en' ? (en || ko) : ko
  }

  // ── 렌더 ─────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* 사이드바 */}
      <div className="section-sidebar">
        <div className="section-sidebar-header">
          {bookName} {chapter.chapter_number}{lang === 'ko' ? '장' : ''}
        </div>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`section-btn ${active === s.id ? 'active' : ''} ${s.isQuiz ? 'quiz-btn' : ''}`}
            onClick={() => { setActive(s.id); if (s.id === 's13') resetQuiz() }}
          >
            <span className="s-icon">{s.icon}</span>
            {lang === 'ko' ? s.ko : s.en}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="section-content">
        {/* 챕터 헤더 */}
        <div className="ch-header">
          <div className="ch-canon-label">{canonName} · {bookName}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div className="ch-title">
              {bookName} {chapter.chapter_number}{lang === 'ko' ? '장' : ''}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* ☆ 북마크 버튼 */}
              <button
                onClick={toggleBookmark}
                disabled={bookmarking}
                title={isBookmarked
                  ? (lang === 'ko' ? '북마크 해제' : 'Remove bookmark')
                  : (lang === 'ko' ? '북마크 추가' : 'Add bookmark')}
                style={{
                  flexShrink: 0,
                  background: 'none',
                  border: '0.5px solid var(--border)',
                  color: isBookmarked ? 'var(--gold)' : 'var(--text-muted)',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 16,
                  cursor: bookmarking ? 'default' : 'pointer',
                  opacity: bookmarking ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {isBookmarked ? '★' : '☆'}
              </button>

              {/* 학습 완료 버튼 */}
              <button
                onClick={markComplete}
                disabled={isCompleted || marking}
                style={{
                  flexShrink: 0,
                  background:   isCompleted ? 'var(--gold)' : 'none',
                  border:       '0.5px solid var(--gold)',
                  color:        isCompleted ? '#fff' : 'var(--gold)',
                  padding:      '5px 13px',
                  borderRadius: 'var(--radius-md)',
                  fontSize:     12,
                  fontWeight:   500,
                  fontFamily:   'var(--sans)',
                  cursor:       isCompleted ? 'default' : 'pointer',
                  opacity:      marking ? 0.6 : 1,
                  transition:   'all 0.2s',
                  whiteSpace:   'nowrap',
                }}
              >
                {isCompleted
                  ? '✓ ' + (lang === 'ko' ? '완료됨' : 'Completed')
                  : marking
                    ? '···'
                    : (lang === 'ko' ? '학습 완료' : 'Mark Complete')}
              </button>
            </div>
          </div>
        </div>

        {/* S1: 한 문장 핵심 */}
        {active === 's1' && (
          <div>
            <div className="s-label">💡 {lang === 'ko' ? '한 문장 핵심 — 빈칸을 하나씩 눌러 확인하세요' : 'Key Sentence — Tap each blank to reveal'}</div>
            <div className="blank-progress">
              {[0,1,2,3,4].map(i => (
                <div key={i} className={`blank-dot ${revealed[i] ? 'revealed' : ''}`}>
                  {['①','②','③','④','⑤'][i]}
                </div>
              ))}
              <button className="reset-btn" onClick={resetBlanks}>
                {lang === 'ko' ? '초기화' : 'Reset'}
              </button>
            </div>
            <div className="hook-sentence">{renderKeySentence()}</div>
            <div className="info-note">
              {lang === 'ko' ? '각 빈칸 번호를 누르면 정답이 공개됩니다.' : 'Tap each blank to reveal the answer.'}
            </div>
          </div>
        )}

        {/* S2: 등장인물 & 배경 */}
        {active === 's2' && (
          <div>
            <div className="s-label">👥 {lang === 'ko' ? '등장인물 & 시공간적 배경' : 'Characters & Setting'}</div>
            <div className="box box-left">
              {renderParagraphs(t(chapter.characters_ko, chapter.characters_en))}
            </div>
          </div>
        )}

        {/* S3: 지리 */}
        {active === 's3' && (
          <div>
            <div className="s-label">🗺️ {lang === 'ko' ? '지리적 배경' : 'Geographic Background'}</div>
            <div className="box box-left">
              {renderParagraphs(t(chapter.geography_ko, chapter.geography_en))}
            </div>
          </div>
        )}

        {/* S4: 내용 요약 */}
        {active === 's4' && (
          <div>
            <div className="s-label">📖 {lang === 'ko' ? '내용 요약' : 'Summary'}</div>
            <div className="box box-left">
              {renderParagraphs(t(chapter.summary_ko, chapter.summary_en))}
            </div>
          </div>
        )}

        {/* S5: 핵심 사건 */}
        {active === 's5' && (
          <div>
            <div className="s-label">🔑 {lang === 'ko' ? '핵심 사건' : 'Key Events'}</div>
            <div className="box box-left">
              {renderParagraphs(t(chapter.key_events_ko, chapter.key_events_en))}
            </div>
          </div>
        )}

        {/* S6: 원문 말씀 */}
        {active === 's6' && (
          <div>
            <div className="s-label">📜 {lang === 'ko' ? '원문 말씀' : 'Original Text'}</div>
            <div className="original-text">
              {renderParagraphs(chapter.original_text)}
            </div>
            <div className="info-note">{lang === 'ko' ? '개역개정 4판' : 'Korean Revised Version'}</div>
          </div>
        )}

        {/* S7: 현대어 번역 */}
        {active === 's7' && (
          <div>
            <div className="s-label">💬 {lang === 'ko' ? '현대어 번역' : 'Modern Translation'}</div>
            <div className="box box-left">
              {renderParagraphs(t(chapter.modern_translation_ko, chapter.modern_translation_en))}
            </div>
          </div>
        )}

        {/* S8: 하나님의 메시지 */}
        {active === 's8' && (
          <div>
            <div className="s-label">✝️ {lang === 'ko' ? '하나님의 핵심 메시지' : "God's Core Message"}</div>
            <div className="box box-left">
              {renderParagraphs(t(chapter.divine_message_ko, chapter.divine_message_en))}
            </div>
          </div>
        )}

        {/* S9: 역사 메모 */}
        {active === 's9' && (
          <div>
            <div className="s-label">📅 {lang === 'ko' ? '역사·고고학 메모' : 'Historical Notes'}</div>
            <div className="box box-left">
              {renderParagraphs(t(chapter.historical_notes_ko, chapter.historical_notes_en))}
            </div>
          </div>
        )}

        {/* S10: 앞뒤 장 연결고리 */}
        {active === 's10' && (
          <div>
            <div className="s-label">🔗 {lang === 'ko' ? '앞뒤 장 연결고리' : 'Chapter Links'}</div>
            <div className="box box-left">
              {renderParagraphs(t(chapter.chapter_links_ko, chapter.chapter_links_en))}
            </div>
          </div>
        )}

        {/* S11: 경전 간 연결 (jsonb) */}
        {active === 's11' && (
          <div>
            <div className="s-label">🔀 {lang === 'ko' ? '다른 경전과의 연결' : 'Cross-Scripture Connections'}</div>
            <div className="box box-left">
              {(() => {
                const refs = tj(chapter.cross_references_ko, chapter.cross_references_en)
                return Array.isArray(refs)
                  ? refs.map((ref: any, i: number) => (
                      <div key={i}>
                        {i > 0 && <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />}
                        <div style={{ fontWeight: 600, marginBottom: '0.4em' }}>📖 {ref.scripture}</div>
                        <div>{renderParagraphs(ref.content)}</div>
                      </div>
                    ))
                  : renderJsonb(refs)
              })()}
            </div>
          </div>
        )}

        {/* S12: 묵상 질문 */}
        {active === 's12' && (
          <div>
            <div className="s-label">🙏 {lang === 'ko' ? '묵상 질문' : 'Reflection Questions'}</div>
            <div className="info-note" style={{ marginBottom: '1rem' }}>
              {lang === 'ko' ? '질문을 클릭하면 AI가 묵상 답변을 드립니다.' : 'Click a question to receive an AI reflection.'}
            </div>
            <div className="box box-left" style={{ padding: 0, overflow: 'hidden' }}>
              {(() => {
                const questions = tj(chapter.meditation_questions_ko, chapter.meditation_questions_en)
                return Array.isArray(questions)
                  ? questions.map((q: any, i: number) => {
                      const text = typeof q === 'string' ? q : q.question ?? JSON.stringify(q)
                      const isSelected = selectedQuestion === text
                      return (
                        <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <button
                            onClick={() => askGroq(text)}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              background: isSelected ? 'var(--bg-secondary)' : 'none',
                              border: 'none', padding: '12px 16px', cursor: 'pointer',
                              color: 'var(--text)', fontFamily: 'var(--sans)',
                              fontSize: 14, lineHeight: 1.7,
                            }}
                          >
                            <span style={{ color: 'var(--gold)', fontWeight: 600, marginRight: 8 }}>{i + 1}.</span>
                            {text}
                          </button>
                          {isSelected && (
                            <div style={{ padding: '12px 16px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', fontSize: 14, lineHeight: 1.8 }}>
                              {aiLoading && (
                                <span style={{ color: 'var(--text-muted)' }}>
                                  ✨ {lang === 'ko' ? '묵상 중...' : 'Reflecting...'}
                                </span>
                              )}
                              {aiError && (
                                <span style={{ color: '#e55' }}>{aiError}</span>
                              )}
                              {aiAnswer && (
                                <div style={{ whiteSpace: 'pre-line' }}>{aiAnswer}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  : renderJsonb(questions)
              })()}
            </div>
          </div>
        )}

        {/* S13: 퀴즈 */}
        {active === 's13' && (
          <div>
            <div className="s-label">📝 {lang === 'ko' ? `이해도 퀴즈 — ${chapter.chapter_number}장 (5문항)` : `Quiz — Ch.${chapter.chapter_number} (5 questions)`}</div>
            {quiz.length === 0 ? (
              <div className="info-note">
                {lang === 'ko' ? '퀴즈 데이터가 아직 준비되지 않았습니다.' : 'Quiz data is not available yet.'}
              </div>
            ) : !quizState.done ? (
              <>
                <div className="quiz-progress">
                  {quiz.map((_: any, i: number) => (
                    <div key={i} className={`quiz-dot ${i < quizState.cur ? 'done' : ''}`} />
                  ))}
                </div>
                <div className="quiz-num">
                  {lang === 'ko' ? `문제 ${quizState.cur + 1} / ${quiz.length}` : `Q${quizState.cur + 1} / ${quiz.length}`}
                </div>
                <div className="quiz-question">
                  {lang === 'en'
                    ? (quiz[quizState.cur]?.question_en || quiz[quizState.cur]?.question_ko)
                    : quiz[quizState.cur]?.question_ko}
                </div>
                <div className="quiz-opts">
                  {((lang === 'en'
                    ? (quiz[quizState.cur]?.options_en || quiz[quizState.cur]?.options_ko)
                    : quiz[quizState.cur]?.options_ko) || []).map((opt: string, i: number) => {
                    let cls = 'quiz-opt'
                    if (quizState.answered) {
                      if (i === quiz[quizState.cur].correct_answer) cls += ' correct'
                      else if (i === (quizState.answers.length > 0 && !quizState.answers[quizState.answers.length-1]
                        ? quizState.answers.findIndex((_, j) => j === quizState.cur) : -1)) cls += ' wrong'
                    }
                    return (
                      <button
                        key={i}
                        className={cls}
                        disabled={quizState.answered}
                        onClick={() => pickAnswer(i)}
                      >
                        {String.fromCharCode(9312 + i)} {opt}
                      </button>
                    )
                  })}
                </div>
                {quizState.answered && (
                  <div className="quiz-feedback">
                    {quizState.answers[quizState.answers.length - 1]
                      ? (lang === 'ko' ? '✓ 정답입니다! ' : '✓ Correct! ')
                      : (lang === 'ko' ? '✗ 오답입니다. ' : '✗ Incorrect. ')}
                    {lang === 'en'
                      ? (quiz[quizState.cur]?.explanation_en || quiz[quizState.cur]?.explanation_ko)
                      : quiz[quizState.cur]?.explanation_ko}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="quiz-next"
                    style={{ display: quizState.answered ? 'block' : 'none' }}
                    onClick={nextQuestion}
                  >
                    {quizState.cur < quiz.length - 1
                      ? (lang === 'ko' ? '다음 문제 →' : 'Next →')
                      : (lang === 'ko' ? '결과 보기 →' : 'Results →')}
                  </button>
                </div>
              </>
            ) : (
              <div className="quiz-result">
                <div className="result-score">
                  {quizState.answers.filter(Boolean).length} / {quiz.length}
                </div>
                <div className="result-msg">
                  {scoreMessages[lang][quizState.answers.filter(Boolean).length]}
                </div>
                <div className="result-icons">
                  {quizState.answers.map((ok, i) => (
                    <div key={i} className={`result-icon ${ok ? 'ok' : 'no'}`}>
                      {ok ? '✓' : '✗'}
                    </div>
                  ))}
                </div>
                <button className="retry-btn" onClick={resetQuiz}>
                  {lang === 'ko' ? '다시 풀기' : 'Try Again'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* S14: 단원 통합 요약 */}
        {active === 's14' && (
          <div>
            <div className="s-label">📊 {lang === 'ko' ? '단원 통합 요약' : 'Unit Summary'}</div>
            <div className="box box-left">
              {renderParagraphs(t(chapter.unit_summary_ko, chapter.unit_summary_en))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
