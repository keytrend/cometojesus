import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, resolveUserId } from '../../../lib/supabase-server'

// ─────────────────────────────────────────────────────────
// GET /api/bookmarks
// GET /api/bookmarks?chapter_id=42   단일 북마크 존재 여부 확인
//
// 전체 조회 응답:
// [{ id, chapter_id, note, created_at, chapter: { chapter_number, books: { name_ko, canons: { name_ko } } } }]
// ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const chapterIdParam = req.nextUrl.searchParams.get('chapter_id')

  let query = supabaseAdmin
    .from('bookmarks')
    .select(`
      id,
      chapter_id,
      note,
      created_at,
      chapters!inner (
        chapter_number,
        books!inner (
          name_ko,
          name_en,
          canons!inner (
            id,
            name_ko,
            name_en
          )
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (chapterIdParam) {
    query = query.eq('chapter_id', Number(chapterIdParam))
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 단일 장 요청이면 객체 반환 (없으면 null)
  if (chapterIdParam) {
    return NextResponse.json(data?.[0] ?? null)
  }

  return NextResponse.json(data ?? [])
}

// ─────────────────────────────────────────────────────────
// POST /api/bookmarks   북마크 추가
// body: { chapter_id: number, note?: string }
//
// 이미 북마크된 장이면 409 반환
// ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  let body: { chapter_id?: number; note?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const { chapter_id, note } = body

  if (!chapter_id) {
    return NextResponse.json({ error: 'chapter_id가 필요합니다.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('bookmarks')
    .insert({ user_id: userId, chapter_id, note: note ?? null })
    .select('id, chapter_id, note, created_at')
    .single()

  if (error) {
    // PostgreSQL unique violation
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 북마크된 장입니다.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// ─────────────────────────────────────────────────────────
// PATCH /api/bookmarks?chapter_id=42   메모 수정
// body: { note: string | null }
// ─────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const chapterIdParam = req.nextUrl.searchParams.get('chapter_id')
  if (!chapterIdParam) {
    return NextResponse.json({ error: 'chapter_id가 필요합니다.' }, { status: 400 })
  }

  let body: { note?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  if (!('note' in body)) {
    return NextResponse.json({ error: 'note 필드가 필요합니다.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('bookmarks')
    .update({ note: body.note ?? null })
    .eq('user_id', userId)
    .eq('chapter_id', Number(chapterIdParam))
    .select('id, chapter_id, note, created_at')
    .single()

  if (error) {
    // PGRST116: 일치하는 행 없음
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: '북마크를 찾을 수 없습니다.' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// ─────────────────────────────────────────────────────────
// DELETE /api/bookmarks?chapter_id=42   북마크 삭제
// ─────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const chapterIdParam = req.nextUrl.searchParams.get('chapter_id')
  if (!chapterIdParam) {
    return NextResponse.json({ error: 'chapter_id가 필요합니다.' }, { status: 400 })
  }

  const { error, count } = await supabaseAdmin
    .from('bookmarks')
    .delete({ count: 'exact' })
    .eq('user_id', userId)
    .eq('chapter_id', Number(chapterIdParam))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (count === 0) {
    return NextResponse.json({ error: '북마크를 찾을 수 없습니다.' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
