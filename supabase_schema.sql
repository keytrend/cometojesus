-- =============================================
-- cometojesus.co.kr — Supabase DB 스키마
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. 경전 테이블 (5개 경전 분류)
CREATE TABLE canons (
  id        TEXT PRIMARY KEY,       -- 'ot' | 'nt' | 'bom' | 'dc' | 'pgp'
  name_ko   TEXT NOT NULL,          -- 구약전서
  name_en   TEXT NOT NULL,          -- Old Testament
  order_num INTEGER NOT NULL
);

INSERT INTO canons VALUES
  ('ot',  '구약전서',    'Old Testament',        1),
  ('nt',  '신약전서',    'New Testament',         2),
  ('bom', '몰몬경',      'Book of Mormon',        3),
  ('dc',  '교리와 성약', 'Doctrine & Covenants',  4),
  ('pgp', '값진 진주',   'Pearl of Great Price',  5);

-- 2. 책(Book) 테이블
CREATE TABLE books (
  id             SERIAL PRIMARY KEY,
  canon_id       TEXT REFERENCES canons(id),
  name_ko        TEXT NOT NULL,    -- 창세기
  name_en        TEXT NOT NULL,    -- Genesis
  chapter_count  INTEGER NOT NULL,
  order_num      INTEGER NOT NULL
);

-- 3. 장(Chapter) 콘텐츠 테이블 — 핵심 테이블
CREATE TABLE chapters (
  id                    SERIAL PRIMARY KEY,
  book_id               INTEGER REFERENCES books(id),
  chapter_number        INTEGER NOT NULL,

  -- 항목 1: 한 문장 핵심
  key_sentence_ko       TEXT,    -- 빈칸 포함 문장 (①② 형식)
  key_sentence_en       TEXT,
  key_sentence_answers_ko  JSONB, -- ["기근","요셉","믿음","언약의 땅","다음 세대"]
  key_sentence_answers_en  JSONB, -- ["famine","Joseph","faith",...]

  -- 항목 2: 등장인물 & 배경
  characters_ko         JSONB,   -- [{"name":"요셉","role":"애굽 총리"}, ...]
  characters_en         JSONB,
  setting_ko            TEXT,    -- 공간·시간 설명
  setting_en            TEXT,

  -- 항목 3: 지리적 배경
  geography_ko          JSONB,   -- [{"place":"고센","modern":"이집트 나일강 삼각주 동부"}]
  geography_en          JSONB,

  -- 항목 4: 내용 요약
  summary_ko            TEXT,
  summary_en            TEXT,

  -- 항목 5: 핵심 사건
  key_events_ko         JSONB,   -- [{"num":1,"title":"...","desc":"..."}]
  key_events_en         JSONB,

  -- 항목 6: 원문 말씀
  original_text         TEXT,    -- 개역개정 (언어 무관, 원문 고정)

  -- 항목 7: 현대어 번역
  modern_translation_ko JSONB,   -- [{"subtitle":"요셉 가족...","text":"..."}]
  modern_translation_en JSONB,

  -- 항목 8: 하나님의 핵심 메시지
  divine_message_ko     JSONB,   -- {"theme":"고난 속에서도...","rows":[{"key":"섭리","val":"..."}]}
  divine_message_en     JSONB,

  -- 항목 9: 역사·고고학 메모
  historical_notes_ko   JSONB,   -- [{"title":"고센 땅","desc":"..."}]
  historical_notes_en   JSONB,

  -- 항목 10: 앞뒤 장 연결고리
  chapter_links_ko      JSONB,   -- {"prev":{"num":46,"desc":"..."},"next":{"num":48,"desc":"..."},"transition":"..."}
  chapter_links_en      JSONB,

  -- 항목 11: 다른 경전과의 연결
  cross_references_ko   JSONB,   -- [{"canon":"신약전서","ref":"사도행전 7:14","desc":"..."}]
  cross_references_en   JSONB,

  -- 항목 12: 묵상 질문
  meditation_questions_ko JSONB, -- ["질문1","질문2","질문3"]
  meditation_questions_en JSONB,

  -- 항목 13: 이해도 퀴즈
  quiz_ko               JSONB,   -- [{"q":"질문","opts":["①","②","③","④","⑤"],"ans":2,"exp":"해설"}]
  quiz_en               JSONB,

  -- 항목 14: 단원 통합 요약
  unit_summary_ko       JSONB,   -- {"range":"창 43-47장","chapters":[...],"message":"...","next_unit":"..."}
  unit_summary_en       JSONB,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(book_id, chapter_number)
);

-- 4. 인덱스 (빠른 조회용)
CREATE INDEX idx_chapters_book ON chapters(book_id);
CREATE INDEX idx_books_canon   ON books(canon_id);

-- 5. Row Level Security (읽기는 누구나 가능)
ALTER TABLE canons   ENABLE ROW LEVEL SECURITY;
ALTER TABLE books    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read canons"   ON canons   FOR SELECT USING (true);
CREATE POLICY "public read books"    ON books    FOR SELECT USING (true);
CREATE POLICY "public read chapters" ON chapters FOR SELECT USING (true);
