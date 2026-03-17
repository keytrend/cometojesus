import { useState } from 'react'
import { useRouter } from 'next/router'
import Nav from '../components/Nav'
import type { Lang } from '../lib/supabase'

const CANONS = [
  { id: 'ot',  icon: '📜', ko: '구약전서',    en: 'Old Testament',        count: '39권 929장' },
  { id: 'nt',  icon: '✝️', ko: '신약전서',    en: 'New Testament',         count: '27권 260장' },
  { id: 'bom', icon: '📖', ko: '몰몬경',      en: 'Book of Mormon',        count: '15권 239장' },
  { id: 'dc',  icon: '⚖️', ko: '교리와 성약', en: 'Doctrine & Covenants',  count: '138편' },
  { id: 'pgp', icon: '💎', ko: '값진 진주',   en: 'Pearl of Great Price',  count: '5편' },
]

const labels = {
  ko: {
    eyebrow: 'cometojesus.co.kr · 경전 해석과 이해',
    title1: '말씀을 오늘의', title2: '언어로', title3: '만나다',
    sub: '구약·신약·몰몬경·교리와 성약·값진 진주 —\n다섯 경전의 모든 장을 현대어로 풀어, AI와 함께 깊이 묵상합니다.',
    btn1: '경전 살펴보기', btn2: 'AI 묵상 시작',
    chapters: '해석된 장', scriptures: '경전 전집', ai: 'AI 챗봇', free: '전체 무료',
    f1t: '📋 현대어 번역', f1d: '원전의 의미를 살리되 누구나 이해하기 쉬운 오늘의 언어로 풀어냅니다.',
    f2t: '🔑 핵심 사건 분석', f2d: '각 장의 중심 사건을 구조화하여 빠르게 파악할 수 있습니다.',
    f3t: '🙏 묵상 질문', f3d: '삶에 적용하는 세 가지 질문으로 말씀이 내 이야기가 됩니다.',
    f4t: '🤖 AI 챗봇', f4d: '궁금한 구절, 교리적 질문을 AI와 대화하며 깊이 탐구합니다.',
  },
  en: {
    eyebrow: 'cometojesus.co.kr · Scripture Study & Understanding',
    title1: 'Meet the Word in', title2: "Today's", title3: 'Language',
    sub: 'Old Testament · New Testament · Book of Mormon · D&C · Pearl of Great Price —\nAll chapters explained in modern language, deepened with AI.',
    btn1: 'Browse Scriptures', btn2: 'Start AI Study',
    chapters: 'Chapters', scriptures: 'Scriptures', ai: 'AI Chat', free: 'Free',
    f1t: '📋 Modern Translation', f1d: 'Faithful to the original, written in language anyone can understand.',
    f2t: '🔑 Key Events', f2d: 'Structured analysis of each chapter\'s central events.',
    f3t: '🙏 Reflection', f3d: 'Three questions to help apply the word to your life.',
    f4t: '🤖 AI Chatbot', f4d: 'Explore questions about any verse or doctrine with AI.',
  }
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('ko')
  const router = useRouter()
  const t = labels[lang]

  return (
    <div className="page-wrap">
      <Nav lang={lang} onLangChange={setLang} />

      <div className="landing-hero">
        <div className="hero-eyebrow">{t.eyebrow}</div>
        <h1 className="hero-title">
          {t.title1}<br /><em>{t.title2}</em> {t.title3}
        </h1>
        <p className="hero-sub" style={{ whiteSpace: 'pre-line' }}>{t.sub}</p>
        <div className="hero-btns">
          <button className="btn-primary" onClick={() => router.push('/scripture')}>
            {t.btn1}
          </button>
          <button className="btn-outline" onClick={() => router.push('/chatbot')}>
            {t.btn2}
          </button>
        </div>
      </div>

      <div className="canon-grid">
        {CANONS.map(c => (
          <button
            key={c.id}
            className="canon-card"
            onClick={() => router.push(`/scripture?canon=${c.id}`)}
          >
            <div className="canon-icon">{c.icon}</div>
            <div className="canon-name">{lang === 'ko' ? c.ko : c.en}</div>
            <div className="canon-count">{c.count}</div>
          </button>
        ))}
      </div>

      <div className="stats-row">
        <div className="stat"><div className="stat-n">1,579+</div><div className="stat-l">{t.chapters}</div></div>
        <div className="stat"><div className="stat-n">5</div><div className="stat-l">{t.scriptures}</div></div>
        <div className="stat"><div className="stat-n">AI</div><div className="stat-l">{t.ai}</div></div>
        <div className="stat"><div className="stat-n">{t.free}</div><div className="stat-l"> </div></div>
      </div>

      <div className="features">
        <div className="feature"><div className="feature-title">{t.f1t}</div><div className="feature-desc">{t.f1d}</div></div>
        <div className="feature"><div className="feature-title">{t.f2t}</div><div className="feature-desc">{t.f2d}</div></div>
        <div className="feature"><div className="feature-title">{t.f3t}</div><div className="feature-desc">{t.f3d}</div></div>
        <div className="feature"><div className="feature-title">{t.f4t}</div><div className="feature-desc">{t.f4d}</div></div>
      </div>
    </div>
  )
}
