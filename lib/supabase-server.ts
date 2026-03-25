import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!serviceKey) {
  console.warn(
    '\n⚠️  [supabase-server] SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다.' +
    '\n    anon key 로 대체 실행합니다 (RLS 정책이 그대로 적용됩니다).' +
    '\n    user_progress / bookmarks API가 정상 동작하려면 .env.local 에 다음을 추가하세요:' +
    '\n    SUPABASE_SERVICE_ROLE_KEY=eyJ...\n'
  )
}

// Service role key 가 있으면 RLS 우회, 없으면 anon key 로 fallback
export const supabaseAdmin = createClient(supabaseUrl, serviceKey ?? anonKey)

/**
 * 요청에서 user_id를 해석합니다.
 *
 * 우선순위:
 *   1. Authorization: Bearer <jwt>  → Supabase Auth 사용자
 *   2. x-guest-id: <string>         → localStorage 게스트 ID (fallback)
 */
export async function resolveUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(auth.slice(7))
    if (user) return user.id
  }
  return req.headers.get('x-guest-id')
}
