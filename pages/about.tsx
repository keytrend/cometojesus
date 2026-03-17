import { useState } from 'react'
import Nav from '../components/Nav'
import type { Lang } from '../lib/supabase'

export default function About() {
  const [lang, setLang] = useState<Lang>('ko')

  return (
    <div className="page-wrap">
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{ maxWidth: 720, margin: '2.5rem auto', padding: '0 2rem' }}>

        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 24, marginBottom: '0.5rem' }}>
          {lang === 'ko' ? 'cometojesus.co.kr 에 대하여' : 'About cometojesus.co.kr'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '0.5px solid var(--border)' }}>
          {lang === 'ko' ? '경전 해석과 이해를 위한 플랫폼' : 'A platform for scripture study and understanding'}
        </p>

        {[
          {
            title: lang === 'ko' ? '사이트 소개' : 'About This Site',
            body: lang === 'ko'
              ? 'cometojesus.co.kr은 다섯 경전의 모든 장을 현대어로 풀어 누구나 쉽게 이해하고 깊이 묵상할 수 있도록 돕는 플랫폼입니다. 원전의 의미를 훼손하지 않으면서도 오늘의 독자가 자신의 언어로 말씀과 만날 수 있도록 정성껏 번역하고 해석합니다.'
              : 'cometojesus.co.kr helps anyone understand and meditate on scripture by presenting all five collections of scripture in modern language. Each chapter is carefully translated and interpreted without losing the original meaning.',
          },
          {
            title: lang === 'ko' ? '수록 경전' : 'Scriptures Included',
            body: null,
            badges: lang === 'ko'
              ? ['구약전서', '신약전서', '몰몬경', '교리와 성약', '값진 진주']
              : ['Old Testament', 'New Testament', 'Book of Mormon', 'D&C', 'Pearl of Great Price'],
          },
          {
            title: lang === 'ko' ? '각 장의 구성 (14개 항목)' : '14-Item Chapter Structure',
            body: lang === 'ko'
              ? '모든 장은 동일한 14개 항목 구조로 제공됩니다: 한 문장 핵심 · 등장인물 & 배경 · 지리적 배경 지도 · 내용 요약 · 핵심 사건 · 원문 말씀 · 현대어 번역 · 하나님의 메시지 · 역사·고고학 메모 · 앞뒤 장 연결고리 · 경전 간 연결 · 묵상 질문 · 이해도 퀴즈 · 단원 통합 요약.'
              : 'Every chapter follows the same 14-item structure: Key Sentence · Characters & Setting · Geography · Summary · Key Events · Original Text · Modern Translation · God\'s Message · Historical Notes · Chapter Links · Cross-Scripture · Reflection · Quiz · Unit Summary.',
          },
          {
            title: lang === 'ko' ? 'AI 묵상 챗봇' : 'AI Study Chatbot',
            body: lang === 'ko'
              ? '경전 데이터를 기반으로 사용자가 궁금한 구절이나 교리적 질문을 자유롭게 나눌 수 있는 AI 챗봇이 제공됩니다. Claude Sonnet 모델을 활용하여 신뢰할 수 있는 경전 중심의 답변을 제공합니다.'
              : 'An AI chatbot powered by Claude Sonnet allows users to ask any question about scriptures or doctrine and receive thoughtful, scripture-based answers.',
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 16, marginBottom: 10, paddingBottom: 6, borderBottom: '0.5px solid var(--border)' }}>
              {section.title}
            </h3>
            {section.body && (
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.9 }}>{section.body}</p>
            )}
            {section.badges && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {section.badges.map(b => (
                  <span key={b} style={{ border: '0.5px solid var(--border-mid)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 500 }}>
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
