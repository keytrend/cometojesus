import { useState } from 'react'
import type { Chapter, Lang } from '../lib/supabase'

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
  const [quizState, setQuizState] = useState<{
    cur: number; answers: boolean[]; answered: boolean; done: boolean
  }>({ cur: 0, answers: [], answered: false, done: false })

  const n = (field: string) => `${field}_${lang}` as keyof Chapter

  // ── 빈칸 공개 ─────────────────────────────────────────
  function revealBlank(idx: number) {
    const next = [...revealed]
    next[idx] = true
    setRevealed(next)
  }
  function resetBlanks() { setRevealed([false,false,false,false,false]) }

  // ── 퀴즈 ─────────────────────────────────────────────
  const quiz = (chapter[n('quiz')] as any[]) || []
  function pickAnswer(i: number) {
    if (quizState.answered || quizState.done) return
    const correct = i === quiz[quizState.cur]?.ans
    setQuizState(s => ({ ...s, answered: true, answers: [...s.answers, correct] }))
  }
  function nextQuestion() {
    const next = quizState.cur + 1
    if (next >= quiz.length) {
      setQuizState(s => ({ ...s, done: true }))
    } else {
      setQuizState(s => ({ ...s, cur: next, answered: false }))
    }
  }
  function resetQuiz() {
    setQuizState({ cur: 0, answers: [], answered: false, done: false })
  }

  // ── 빈칸 문장 렌더 ────────────────────────────────────
  function renderKeySentence() {
    const sentence = (chapter[n('key_sentence')] as string) || ''
    const answers  = (chapter[n('key_sentence_answers')] as string[]) || []
    const circled  = ['①','②','③','④','⑤']

    // [①] 패턴을 찾아 버튼으로 대체
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

  // ── 퀴즈 점수 메시지 ──────────────────────────────────
  const scoreMessages = {
    ko: ['다시 한 번 읽어보세요 🙏','조금 더 집중하면 완벽합니다!','좋은 출발입니다!','거의 완벽합니다!','완벽합니다! 🎉'],
    en: ['Please read again 🙏','Almost there!','Good start!','Nearly perfect!','Perfect! 🎉'],
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
          <div className="ch-title">
            {bookName} {chapter.chapter_number}{lang === 'ko' ? '장' : ''}
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
            {((chapter[n('characters')] as any[]) || []).map((c: any, i: number) => (
              <div className="person-row" key={i}>
                <div className="person-tag">{c.name}</div>
                <div className="person-desc">{c.role}</div>
              </div>
            ))}
            <div className="divider" />
            <div className="person-row">
              <div className="person-tag">{lang === 'ko' ? '배경' : 'Setting'}</div>
              <div className="person-desc">{chapter[n('setting')] as string}</div>
            </div>
          </div>
        )}

        {/* S3: 지리 */}
        {active === 's3' && (
          <div>
            <div className="s-label">🗺️ {lang === 'ko' ? '지리적 배경' : 'Geographic Background'}</div>
            {((chapter[n('geography')] as any[]) || []).map((g: any, i: number) => (
              <div className="hist-card" key={i}>
                <div className="hist-title">{g.place}</div>
                <div className="hist-desc">{g.modern}</div>
              </div>
            ))}
          </div>
        )}

        {/* S4: 내용 요약 */}
        {active === 's4' && (
          <div>
            <div className="s-label">📖 {lang === 'ko' ? '내용 요약' : 'Summary'}</div>
            <div className="box box-left">{chapter[n('summary')] as string}</div>
          </div>
        )}

        {/* S5: 핵심 사건 */}
        {active === 's5' && (
          <div>
            <div className="s-label">🔑 {lang === 'ko' ? '핵심 사건' : 'Key Events'}</div>
            {((chapter[n('key_events')] as any[]) || []).map((e: any, i: number) => (
              <div className="event-card" key={i}>
                <div className="event-num">{lang === 'ko' ? `사건 ${e.num}` : `Event ${e.num}`}</div>
                <div className="event-title">{e.title}</div>
                <div className="event-desc">{e.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* S6: 원문 말씀 */}
        {active === 's6' && (
          <div>
            <div className="s-label">📜 {lang === 'ko' ? '원문 말씀' : 'Original Text'}</div>
            <div className="original-text" style={{ whiteSpace: 'pre-line' }}>
              {chapter.original_text}
            </div>
            <div className="info-note">{lang === 'ko' ? '개역개정 4판' : 'Korean Revised Version'}</div>
          </div>
        )}

        {/* S7: 현대어 번역 */}
        {active === 's7' && (
          <div>
            <div className="s-label">💬 {lang === 'ko' ? '현대어 번역' : 'Modern Translation'}</div>
            {((chapter[n('modern_translation')] as any[]) || []).map((t: any, i: number) => (
              <div key={i}>
                <div className="trans-head">{t.subtitle}</div>
                <div className="trans-body">{t.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* S8: 하나님의 메시지 */}
        {active === 's8' && (() => {
          const dm = chapter[n('divine_message')] as any
          if (!dm) return null
          return (
            <div>
              <div className="s-label">✝️ {lang === 'ko' ? '하나님의 핵심 메시지' : "God's Core Message"}</div>
              <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: 12 }}>
                "{dm.theme}"
              </div>
              {(dm.rows || []).map((r: any, i: number) => (
                <div className="msg-row" key={i} style={{ borderBottom: i < dm.rows.length - 1 ? undefined : 'none' }}>
                  <div className="msg-key">{r.key}</div>
                  <div className="msg-val">{r.val}</div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* S9: 역사 메모 */}
        {active === 's9' && (
          <div>
            <div className="s-label">📅 {lang === 'ko' ? '역사·고고학 메모' : 'Historical Notes'}</div>
            {((chapter[n('historical_notes')] as any[]) || []).map((h: any, i: number) => (
              <div className="hist-card" key={i}>
                <div className="hist-title">{h.title}</div>
                <div className="hist-desc">{h.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* S10: 앞뒤 장 */}
        {active === 's10' && (() => {
          const cl = chapter[n('chapter_links')] as any
          if (!cl) return null
          return (
            <div>
              <div className="s-label">🔗 {lang === 'ko' ? '앞뒤 장 연결고리' : 'Chapter Links'}</div>
              <div className="link-row">
                <div>
                  <div className="link-ref">← {lang === 'ko' ? `${cl.prev?.num}장` : `Ch.${cl.prev?.num}`}</div>
                  <div className="link-desc">{cl.prev?.desc}</div>
                </div>
              </div>
              <div className="link-row current">
                <div>
                  <div className="link-ref gold">● {lang === 'ko' ? `${chapter.chapter_number}장 (현재)` : `Ch.${chapter.chapter_number} (current)`}</div>
                  <div className="link-desc">{cl.current}</div>
                </div>
              </div>
              <div className="link-row">
                <div>
                  <div className="link-ref">→ {lang === 'ko' ? `${cl.next?.num}장` : `Ch.${cl.next?.num}`}</div>
                  <div className="link-desc">{cl.next?.desc}</div>
                </div>
              </div>
              {cl.transition && <div className="info-note">{cl.transition}</div>}
            </div>
          )
        })()}

        {/* S11: 경전 간 연결 */}
        {active === 's11' && (
          <div>
            <div className="s-label">🔀 {lang === 'ko' ? '다른 경전과의 연결' : 'Cross-Scripture Connections'}</div>
            {((chapter[n('cross_references')] as any[]) || []).map((c: any, i: number) => (
              <div className="cross-card" key={i}>
                <div className="cross-canon">{c.canon}</div>
                <div className="cross-ref">{c.ref}</div>
                <div className="cross-desc">{c.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* S12: 묵상 질문 */}
        {active === 's12' && (
          <div>
            <div className="s-label">🙏 {lang === 'ko' ? '묵상 질문' : 'Reflection Questions'}</div>
            {((chapter[n('meditation_questions')] as string[]) || []).map((q, i) => (
              <div className="med-q" key={i}>
                {['①','②','③'][i]} {q}
              </div>
            ))}
            <div className="info-note">
              {lang === 'ko' ? '질문을 클릭하면 AI 묵상 챗봇으로 연결됩니다.' : 'Click a question to open the AI chat.'}
            </div>
          </div>
        )}

        {/* S13: 퀴즈 */}
        {active === 's13' && (
          <div>
            <div className="s-label">📝 {lang === 'ko' ? `이해도 퀴즈 — ${chapter.chapter_number}장 (5문항)` : `Quiz — Ch.${chapter.chapter_number} (5 questions)`}</div>
            {!quizState.done ? (
              <>
                <div className="quiz-progress">
                  {quiz.map((_: any, i: number) => (
                    <div key={i} className={`quiz-dot ${i < quizState.cur ? 'done' : ''}`} />
                  ))}
                </div>
                <div className="quiz-num">
                  {lang === 'ko' ? `문제 ${quizState.cur + 1} / ${quiz.length}` : `Q${quizState.cur + 1} / ${quiz.length}`}
                </div>
                <div className="quiz-question">{quiz[quizState.cur]?.q}</div>
                <div className="quiz-opts">
                  {(quiz[quizState.cur]?.opts || []).map((opt: string, i: number) => {
                    let cls = 'quiz-opt'
                    if (quizState.answered) {
                      if (i === quiz[quizState.cur].ans) cls += ' correct'
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
                    {quiz[quizState.cur]?.exp}
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
        {active === 's14' && (() => {
          const us = chapter[n('unit_summary')] as any
          if (!us) return null
          return (
            <div>
              <div className="s-label">📊 {lang === 'ko' ? '단원 통합 요약' : 'Unit Summary'}</div>
              {us.chapters && (
                <div className="unit-badges">
                  {us.chapters.map((c: string, i: number) => (
                    <div key={i} className={`unit-badge ${i === us.chapters.length - 1 ? 'current' : ''}`}>
                      {c}
                    </div>
                  ))}
                </div>
              )}
              <div className="box" style={{ marginBottom: 8 }}>
                <strong>{lang === 'ko' ? `이 단원(${us.range})의 큰 흐름` : `Overview of ${us.range}`}</strong>
                <br /><br />
                {us.message}
              </div>
              {us.next_unit && (
                <div className="info-note">
                  {lang === 'ko' ? '다음 단원 예고: ' : 'Next unit: '}{us.next_unit}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
