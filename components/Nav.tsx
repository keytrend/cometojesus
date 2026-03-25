import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import type { Lang } from '../lib/supabase'

interface NavProps {
  lang: Lang
  onLangChange: (l: Lang) => void
}

const labels = {
  ko: { home: '홈', scripture: '경전', chatbot: 'AI 묵상', about: '소개', progress: '진도', bookmarks: '책갈피' },
  en: { home: 'Home', scripture: 'Scripture', chatbot: 'AI Study', about: 'About', progress: 'Progress', bookmarks: 'Bookmarks' },
}

export default function Nav({ lang, onLangChange }: NavProps) {
  const router = useRouter()
  const t = labels[lang]
  const [menuOpen, setMenuOpen] = useState(false)

  function navigate(path: string) {
    router.push(path)
    setMenuOpen(false)
  }

  return (
    <>
      <nav className="topnav">
        <Link href="/" className="nav-logo">
          cometojesus<span>.co.kr</span>
        </Link>

        <div className="nav-right">
          {/* 데스크톱 메뉴 */}
          <div className="nav-center">
            <Link href="/scripture">
              <button className={`nav-btn ${router.pathname.startsWith('/scripture') ? 'active' : ''}`}>{t.scripture}</button>
            </Link>
            <Link href="/chatbot">
              <button className={`nav-btn ${router.pathname === '/chatbot' ? 'active' : ''}`}>{t.chatbot}</button>
            </Link>
            <Link href="/progress">
              <button className={`nav-btn ${router.pathname === '/progress' ? 'active' : ''}`}>{t.progress}</button>
            </Link>
            <Link href="/bookmarks">
              <button className={`nav-btn ${router.pathname === '/bookmarks' ? 'active' : ''}`}>{t.bookmarks}</button>
            </Link>
            <Link href="/about">
              <button className={`nav-btn ${router.pathname === '/about' ? 'active' : ''}`}>{t.about}</button>
            </Link>
          </div>

          {/* 언어 토글 */}
          <div className="lang-toggle">
            <button className={`lang-btn ${lang === 'ko' ? 'active' : ''}`} onClick={() => onLangChange('ko')}>한국어</button>
            <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => onLangChange('en')}>English</button>
          </div>

          {/* 모바일 햄버거 */}
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* 모바일 드로어 */}
      <div className={`mobile-nav-drawer ${menuOpen ? 'open' : ''}`}>
        <button className={`mobile-nav-item ${router.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>
          🏠 {t.home}
        </button>
        <button className={`mobile-nav-item ${router.pathname.startsWith('/scripture') ? 'active' : ''}`} onClick={() => navigate('/scripture')}>
          📖 {t.scripture}
        </button>
        <button className={`mobile-nav-item ${router.pathname === '/chatbot' ? 'active' : ''}`} onClick={() => navigate('/chatbot')}>
          🤖 {t.chatbot}
        </button>
        <button className={`mobile-nav-item ${router.pathname === '/progress' ? 'active' : ''}`} onClick={() => navigate('/progress')}>
          📊 {t.progress}
        </button>
        <button className={`mobile-nav-item ${router.pathname === '/bookmarks' ? 'active' : ''}`} onClick={() => navigate('/bookmarks')}>
          🔖 {t.bookmarks}
        </button>
        <button className={`mobile-nav-item ${router.pathname === '/about' ? 'active' : ''}`} onClick={() => navigate('/about')}>
          ℹ️ {t.about}
        </button>
        <div className="mobile-lang-row">
          <button
            className={`mobile-lang-btn ${lang === 'ko' ? 'active' : ''}`}
            onClick={() => { onLangChange('ko'); setMenuOpen(false) }}
          >한국어</button>
          <button
            className={`mobile-lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => { onLangChange('en'); setMenuOpen(false) }}
          >English</button>
        </div>
      </div>
    </>
  )
}
