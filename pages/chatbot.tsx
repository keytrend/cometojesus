import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import Nav from '../components/Nav'
import type { Lang } from '../lib/supabase'

interface Message { role: 'user' | 'ai'; text: string }

const QUICK = {
  ko: ['창세기 47장의 핵심 메시지는?', '요셉의 삶에서 배울 교훈은?', '몰몬경과 구약의 연결점은?', '야곱이 가나안에 묻히길 원한 이유는?'],
  en: ['What is the key message of Genesis 47?', 'What can we learn from Joseph?', 'How do the OT and Book of Mormon connect?', 'Why did Jacob want to be buried in Canaan?'],
}

export default function Chatbot() {
  const [lang, setLang] = useState<Lang>('ko')
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: lang === 'ko' ? '안녕하세요. 오늘은 어떤 말씀에 대해 이야기 나눌까요?' : 'Hello! Which scripture would you like to study today?' }
  ])
  const [input, setInput] = useState('')

  useEffect(() => {
    const q = router.query.q as string
    if (q) {
      send(q)
    }
  }, [router.query.q])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const q = text || input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: q }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, lang }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'ai', text: data.answer }])
    } catch {
      setMessages(m => [...m, { role: 'ai', text: lang === 'ko' ? '오류가 발생했습니다. 다시 시도해주세요.' : 'An error occurred. Please try again.' }])
    }
    setLoading(false)
  }

  return (
    <div className="page-wrap">
      <Nav lang={lang} onLangChange={setLang} />

      <div style={{ maxWidth: 680, margin: '2rem auto', padding: '0 1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 6 }}>
            {lang === 'ko' ? 'AI 묵상 챗봇' : 'AI Scripture Study'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            {lang === 'ko'
              ? '경전의 어떤 구절이든, 어떤 질문이든 — 함께 탐구해 드립니다.'
              : 'Ask about any verse or doctrine — explore together.'}
          </p>
        </div>

        {/* 채팅창 */}
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: 380, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  maxWidth: '80%',
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  background: m.role === 'user' ? 'var(--text)' : 'var(--bg-secondary)',
                  color: m.role === 'user' ? 'var(--bg)' : 'var(--text)',
                  padding: '9px 13px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--bg-secondary)', padding: '9px 13px', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-hint)' }}>
                {lang === 'ko' ? '생각하는 중...' : 'Thinking...'}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div style={{ display: 'flex', borderTop: '0.5px solid var(--border)' }}>
            <input
              style={{ flex: 1, border: 'none', padding: '12px 16px', fontSize: 13, background: 'transparent', color: 'var(--text)', outline: 'none', fontFamily: 'var(--sans)' }}
              placeholder={lang === 'ko' ? '질문을 입력하세요...' : 'Ask a question...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button
              style={{ border: 'none', borderLeft: '0.5px solid var(--border)', padding: '12px 16px', background: 'transparent', fontSize: 13, color: 'var(--text-muted)' }}
              onClick={() => send()}
            >
              {lang === 'ko' ? '전송 →' : 'Send →'}
            </button>
          </div>
        </div>

        {/* 빠른 질문 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUICK[lang].map((q, i) => (
            <button
              key={i}
              style={{ background: 'none', border: '0.5px solid var(--border)', padding: '5px 12px', borderRadius: 20, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => send(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
