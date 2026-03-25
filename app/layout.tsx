import '../styles/globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'cometojesus.co.kr',
  description: '경전 해석과 이해',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
