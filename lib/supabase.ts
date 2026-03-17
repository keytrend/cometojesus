import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnon)

// ── 타입 정의 ──────────────────────────────────────────

export type Lang = 'ko' | 'en'

export interface Canon {
  id: string
  name_ko: string
  name_en: string
  order_num: number
}

export interface Book {
  id: number
  canon_id: string
  name_ko: string
  name_en: string
  chapter_count: number
  order_num: number
}

export interface Chapter {
  id: number
  book_id: number
  chapter_number: number
  key_sentence_ko: string
  key_sentence_en: string
  key_sentence_answers_ko: string[]
  key_sentence_answers_en: string[]
  characters_ko: { name: string; role: string }[]
  characters_en: { name: string; role: string }[]
  setting_ko: string
  setting_en: string
  geography_ko: { place: string; modern: string }[]
  geography_en: { place: string; modern: string }[]
  summary_ko: string
  summary_en: string
  key_events_ko: { num: number; title: string; desc: string }[]
  key_events_en: { num: number; title: string; desc: string }[]
  original_text: string
  modern_translation_ko: { subtitle: string; text: string }[]
  modern_translation_en: { subtitle: string; text: string }[]
  divine_message_ko: { theme: string; rows: { key: string; val: string }[] }
  divine_message_en: { theme: string; rows: { key: string; val: string }[] }
  historical_notes_ko: { title: string; desc: string }[]
  historical_notes_en: { title: string; desc: string }[]
  chapter_links_ko: { prev: { num: number; desc: string }; next: { num: number; desc: string }; transition: string }
  chapter_links_en: { prev: { num: number; desc: string }; next: { num: number; desc: string }; transition: string }
  cross_references_ko: { canon: string; ref: string; desc: string }[]
  cross_references_en: { canon: string; ref: string; desc: string }[]
  meditation_questions_ko: string[]
  meditation_questions_en: string[]
  quiz_ko: { q: string; opts: string[]; ans: number; exp: string }[]
  quiz_en: { q: string; opts: string[]; ans: number; exp: string }[]
  unit_summary_ko: { range: string; chapters: string[]; message: string; next_unit: string }
  unit_summary_en: { range: string; chapters: string[]; message: string; next_unit: string }
}

// ── 조회 함수 ──────────────────────────────────────────

export async function getCanons(): Promise<Canon[]> {
  const { data, error } = await supabase
    .from('canons')
    .select('*')
    .order('order_num')
  if (error) throw error
  return data
}

export async function getBooks(canonId: string): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('canon_id', canonId)
    .order('order_num')
  if (error) throw error
  return data
}

export async function getChapter(bookId: number, chapterNumber: number): Promise<Chapter | null> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', bookId)
    .eq('chapter_number', chapterNumber)
    .single()
  if (error) return null
  return data
}
