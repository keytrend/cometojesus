import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, resolveUserId } from '../../../lib/supabase-server'

// ─────────────────────────────────────────────────────────
// GET /api/progress?chapter_id=42   단일 장 진도 조회
// GET /api/progress                 유저 전체 진도 조회
// ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const chapterIdParam = req.nextUrl.searchParams.get('chapter_id')

  let query = supabaseAdmin
    .from('user_progress')
    .select('chapter_id, is_completed, completed_at, quiz_score, quiz_total, memo, updated_at')
    .eq('user_id', userId)

  if (chapterIdParam) {
    query = query.eq('chapter_id', Number(chapterIdParam))
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 단일 장 요청이면 객체 반환, 없으면 null
  if (chapterIdParam) {
    return NextResponse.json(data?.[0] ?? null)
  }

  return NextResponse.json(data ?? [])
}

// ─────────────────────────────────────────────────────────
// POST /api/progress
// body: {
//   chapter_id: number       (필수)
//   is_completed?: boolean
//   quiz_score?:  number
//   quiz_total?:  number
//   memo?:        string
// }
// ─────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // UUID 형식이 아니면 DB 쿼리 없이 빈 성공 응답 반환
  if (!UUID_RE.test(userId)) {
    return NextResponse.json({})
  }

  let body: {
    chapter_id?: number
    is_completed?: boolean
    quiz_score?: number
    quiz_total?: number
    memo?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  console.log('[POST /api/progress] userId:', userId, '| body:', body)

  const { chapter_id, is_completed, quiz_score, quiz_total, memo } = body

  if (!chapter_id) {
    return NextResponse.json({ error: 'chapter_id가 필요합니다.' }, { status: 400 })
  }

  // chapter_id로 book_id 조회
  const { data: chapter } = await supabaseAdmin
    .from('chapters')
    .select('book_id')
    .eq('id', chapter_id)
    .single()

  if (!chapter?.book_id) {
    return NextResponse.json({ error: '유효하지 않은 chapter_id입니다.' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    user_id:    userId,
    chapter_id,
    book_id:    chapter.book_id,
    updated_at: new Date().toISOString(),
  }

  if (is_completed !== undefined) {
    payload.is_completed = is_completed
    payload.completed_at = is_completed ? new Date().toISOString() : null
  }
  if (quiz_score !== undefined) payload.quiz_score = quiz_score
  if (quiz_total !== undefined) payload.quiz_total = quiz_total
  if (memo       !== undefined) payload.memo       = memo

  const { data, error } = await supabaseAdmin
    .from('user_progress')
    .upsert(payload, { onConflict: 'user_id,chapter_id' })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/progress] DB 에러:', error)
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json(data)
}
