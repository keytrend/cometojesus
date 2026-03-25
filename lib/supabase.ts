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
  // S1
  key_sentence_ko: string
  key_answers: any[]
  // S2
  characters_ko: string
  characters_en: string
  // S3
  geography_ko: string
  geography_en: string
  // S4
  summary_ko: string
  summary_en: string
  // S5
  key_events_ko: string
  key_events_en: string
  // S6
  original_text: string
  // S7
  modern_translation_ko: string
  modern_translation_en: string
  // S8
  divine_message_ko: string
  divine_message_en: string
  // S9
  historical_notes_ko: string
  historical_notes_en: string
  // S10
  chapter_links_ko: string
  chapter_links_en: string
  // S11
  cross_references_ko: any[]
  cross_references_en: any[]
  // S12
  meditation_questions_ko: any[]
  meditation_questions_en: any[]
  // S14
  unit_summary_ko: string
  unit_summary_en: string
}

export interface Quiz {
  id: number
  chapter_id: number
  question_number: number
  question_ko: string
  question_en?: string
  options_ko: string[]
  options_en?: string[]
  correct_answer: number
  explanation_ko: string
  explanation_en?: string
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

export async function saveQuizProgress(chapterId: number, score: number, total: number): Promise<void> {
  const userId = typeof window !== 'undefined'
    ? (localStorage.getItem('guest_user_id') || 'guest')
    : 'guest'
  const { error } = await supabase
    .from('user_progress')
    .upsert(
      { user_id: userId, chapter_id: chapterId, quiz_score: score, quiz_total: total },
      { onConflict: 'user_id,chapter_id' }
    )
  if (error) throw error
}

export async function getQuizzes(chapterId: number): Promise<Quiz[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('question_number')
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
