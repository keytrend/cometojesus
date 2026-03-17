import { useRouter } from 'next/router'
import Link from 'next/link'

interface NavProps {
  lang: 'ko' | 'en'
  onLangChange: (l: 'ko' | 'en') => void
}

const labels = {
  ko: { scripture: '경전', chatbot: 'AI 묵상', about: '소개' },
  en: { scripture: 'Scripture', chatbot: 'AI Study', about: 'About' },
}

export default function Nav({ lang, onLangChange }: NavProps) {
  const router = useRouter()
  const t = labels[lang]

  return (
    <nav className="topnav">
      <Link href="/" className="nav-logo">
        cometojesus<span>.co.kr</span>
      </Link>

      <div className="nav-center">
        <Link href="/scripture">
          <button className={`nav-btn ${router.pathname.startsWith('/scripture') ? 'active' : ''}`}>
            {t.scripture}
          </button>
        </Link>
        <Link href="/chatbot">
          <button className={`nav-btn ${router.pathname === '/chatbot' ? 'active' : ''}`}>
            {t.chatbot}
          </button>
        </Link>
        <Link href="/about">
          <button className={`nav-btn ${router.pathname === '/about' ? 'active' : ''}`}>
            {t.about}
          </button>
        </Link>
      </div>

      <div className="lang-toggle">
        <button
          className={`lang-btn ${lang === 'ko' ? 'active' : ''}`}
          onClick={() => onLangChange('ko')}
        >
          한국어
        </button>
        <button
          className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
          onClick={() => onLangChange('en')}
        >
          English
        </button>
      </div>
    </nav>
  )
}
