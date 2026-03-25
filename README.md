# cometojesus.co.kr

경전 해석과 이해를 위한 Next.js 웹사이트

## 기술 스택
- **프론트엔드**: Next.js 14 + TypeScript
- **DB**: Supabase (PostgreSQL)
- **AI 챗봇**: Anthropic Claude Sonnet API
- **배포**: Vercel
- **도메인**: cometojesus.co.kr

## 파일 구조
```
cometojesus/
├── pages/
│   ├── index.tsx          # 랜딩 페이지
│   ├── scripture.tsx      # 경전 탐색
│   ├── chatbot.tsx        # AI 묵상 챗봇
│   ├── about.tsx          # 소개
│   └── api/
│       └── chat.ts        # Claude API 라우트
├── components/
│   ├── Nav.tsx            # 네비게이션
│   └── ChapterView.tsx    # 14개 항목 뷰어
├── lib/
│   └── supabase.ts        # DB 클라이언트 & 타입
├── styles/
│   └── globals.css        # 전체 스타일
└── supabase_schema.sql    # DB 스키마 (Supabase에서 실행)
```

## 설치 & 실행

### 1. 저장소 클론
```bash
git clone https://github.com/YOUR_USERNAME/cometojesus.git
cd cometojesus
npm install
```

### 2. 환경변수 설정
```bash
cp .env.local.example .env.local
# .env.local 파일을 열어 Supabase URL, ANON KEY, Anthropic API Key 입력
```

### 3. Supabase DB 초기화
- Supabase 대시보드 → SQL Editor
- `supabase_schema.sql` 전체 내용을 붙여넣고 실행

### 4. 로컬 개발 서버
```bash
npm run dev
# http://localhost:3000 에서 확인
```

## Vercel 배포
1. GitHub에 push
2. [vercel.com](https://vercel.com) → New Project → GitHub 저장소 선택
3. Environment Variables에 `.env.local` 내용 입력
4. Deploy
5. Vercel 대시보드 → Settings → Domains → `cometojesus.co.kr` 추가

## 콘텐츠 업로드 (각 장 데이터 입력)
프롬프트로 생성된 14개 항목 콘텐츠를 Supabase `chapters` 테이블에 insert:
```sql
INSERT INTO chapters (book_id, chapter_number, summary_ko, summary_en, ...)
VALUES (1, 47, '요셉은 가족을 이끌고...', 'Joseph led his family...', ...);
```
또는 Supabase 대시보드의 Table Editor에서 직접 입력 가능.
