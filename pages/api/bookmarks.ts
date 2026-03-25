import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const guestId = req.headers['x-guest-id'] as string
  if (!guestId) return res.status(400).json({ error: 'guest id required' })

  // GET: 특정 챕터 북마크 여부 확인
  if (req.method === 'GET') {
    const { chapter_id } = req.query
    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', guestId)
      .eq('chapter_id', chapter_id)
      .maybeSingle()
    return res.status(200).json({ bookmarked: !!data })
  }

  // POST: 북마크 추가
  if (req.method === 'POST') {
    const { chapter_id } = req.body
    const { error } = await supabase
      .from('bookmarks')
      .upsert(
        { user_id: guestId, chapter_id },
        { onConflict: 'user_id,chapter_id' }
      )
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // DELETE: 북마크 제거
  if (req.method === 'DELETE') {
    const { chapter_id } = req.body
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', guestId)
      .eq('chapter_id', chapter_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
