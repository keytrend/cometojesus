import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, resolveUserId } from '../../../../lib/supabase-server'

// ─────────────────────────────────────────────────────────
// GET /api/progress/stats?year=2026&month=3
//
// 응답:
// {
//   calendar:    { year, month, completed_days: number[] }
//   streak:      number          // 연속 학습일
//   canon_stats: CanonStat[]     // 경전별 완료율
// }
// ─────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const params = req.nextUrl.searchParams
  const now    = new Date()
  const year   = Number(params.get('year')  ?? now.getFullYear())
  const month  = Number(params.get('month') ?? now.getMonth() + 1)

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: 'month는 1~12 사이여야 합니다.' }, { status: 400 })
  }

  // UUID 형식이 아니면 빈 데이터 즉시 반환 (게스트 ID 등)
  if (!UUID_RE.test(userId)) {
    return NextResponse.json({
      calendar:    { year, month, completed_days: [] },
      streak:      0,
      canon_stats: [],
    })
  }

  // 월 범위 (ISO string)
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextYear   = month === 12 ? year + 1 : year
  const nextMonth  = month === 12 ? 1 : month + 1
  const monthEnd   = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  // 4개 쿼리 병렬 실행
  const [calRes, streakRes, completedRes, chaptersRes] = await Promise.all([

    // 1. 해당 월의 완료 기록 (캘린더용)
    supabaseAdmin
      .from('user_progress')
      .select('completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('completed_at', monthStart)
      .lt('completed_at', monthEnd),

    // 2. 전체 완료 날짜 (streak용)
    supabaseAdmin
      .from('user_progress')
      .select('updated_at')
      .eq('user_id', userId)
      .eq('completed', true)
      .not('updated_at', 'is', null)
      .order('updated_at', { ascending: false }),

    // 3. 유저가 완료한 chapter_id 목록 (경전별 완료율용)
    supabaseAdmin
      .from('user_progress')
      .select('chapter_id')
      .eq('user_id', userId)
      .not('completed_at', 'is', null),

    // 4. 전체 chapter 목록 + 경전 정보 (경전별 완료율용)
    supabaseAdmin
      .from('chapters')
      .select('id, books!inner(canon_id, canons!inner(id, name_ko, name_en, order_num))'),
  ])

  if (calRes.error)       return NextResponse.json({ error: calRes.error.message,       code: calRes.error.code },       { status: 500 })
  if (streakRes.error)    return NextResponse.json({ error: streakRes.error.message,    code: streakRes.error.code },    { status: 500 })
  if (completedRes.error) return NextResponse.json({ error: completedRes.error.message, code: completedRes.error.code }, { status: 500 })
  if (chaptersRes.error)  return NextResponse.json({ error: chaptersRes.error.message,  code: chaptersRes.error.code },  { status: 500 })

  // ── 1. 캘린더 ──────────────────────────────────────────
  const completedDays = Array.from(
    new Set(
      (calRes.data ?? []).map(r => new Date(r.completed_at!).getDate())
    )
  ).sort((a, b) => a - b)

  // ── 2. 연속 학습일 (streak) ────────────────────────────
  const uniqueDates = Array.from(
    new Set(
      (streakRes.data ?? []).map(r =>
        new Date(r.updated_at!).toISOString().slice(0, 10)
      )
    )
  ).sort().reverse()

  let streak = 0
  if (uniqueDates.length > 0) {
    const todayStr     = new Date().toISOString().slice(0, 10)
    const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

    if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
      streak = 1
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev    = new Date(uniqueDates[i - 1]).getTime()
        const curr    = new Date(uniqueDates[i]).getTime()
        const diffDay = Math.round((prev - curr) / 86_400_000)
        if (diffDay === 1) streak++
        else break
      }
    }
  }

  // ── 3. 경전별 완료율 ───────────────────────────────────
  const completedSet = new Set((completedRes.data ?? []).map(r => r.chapter_id))

  type CanonEntry = {
    id: string; name_ko: string; name_en: string
    order_num: number; total: number; completed: number
  }
  const canonMap: Record<string, CanonEntry> = {}

  for (const row of (chaptersRes.data ?? []) as any[]) {
    const canon = row.books?.canons
    if (!canon) continue
    if (!canonMap[canon.id]) {
      canonMap[canon.id] = {
        id: canon.id, name_ko: canon.name_ko, name_en: canon.name_en,
        order_num: canon.order_num, total: 0, completed: 0,
      }
    }
    canonMap[canon.id].total++
    if (completedSet.has(row.id)) canonMap[canon.id].completed++
  }

  const canon_stats = Object.values(canonMap)
    .sort((a, b) => a.order_num - b.order_num)
    .map(({ id, name_ko, name_en, total, completed }) => ({
      canon_id: id, name_ko, name_en, total, completed,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    }))

  return NextResponse.json({
    calendar: { year, month, completed_days: completedDays },
    streak,
    canon_stats,
  })
}
