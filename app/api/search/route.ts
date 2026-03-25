import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

const SEARCH_FIELDS = [
  'summary_ko', 'summary_en',
  'key_events_ko', 'key_events_en',
  'divine_message_ko', 'divine_message_en',
  'modern_translation_ko', 'modern_translation_en',
] as const

function extractPreview(row: Record<string, any>, keyword: string): string {
  for (const field of SEARCH_FIELDS) {
    const text: string = row[field] ?? ''
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
    if (idx !== -1) {
      const start = Math.max(0, idx - 40)
      const end = Math.min(text.length, idx + keyword.length + 60)
      const snippet = text.slice(start, end)
      return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '')
    }
  }
  return ''
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ error: '검색어는 2자 이상이어야 합니다.' }, { status: 400 })
  }

  const orFilter = SEARCH_FIELDS.map(f => `${f}.ilike.%${q}%`).join(',')

  const { data, error } = await supabase
    .from('chapters')
    .select(`
      id,
      chapter_number,
      summary_ko, summary_en,
      key_events_ko, key_events_en,
      divine_message_ko, divine_message_en,
      modern_translation_ko, modern_translation_en,
      books (
        name_ko,
        name_en,
        canons (
          name_ko,
          name_en
        )
      )
    `)
    .or(orFilter)
    .limit(30)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = (data ?? []).map((row: any) => ({
    canon:       row.books?.canons?.name_ko ?? '',
    book:        row.books?.name_ko ?? '',
    chapter_num: row.chapter_number,
    preview:     extractPreview(row, q),
  }))

  return NextResponse.json({ results })
}
