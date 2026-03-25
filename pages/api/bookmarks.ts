import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const guestId = req.headers['x-guest-id'] as string
  if (!guestId) return res.status(400).json({ error: 'guest id required' })

  if (req.method === 'GET') {
    const { chapter_id } = req.query
    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', guestId)
      .eq('chapter_id', Number(chapter_id))
      .maybeSingle()
    return res.status(200).json({ bookmarked: !!data })
  }

  if (req.method === 'POST') {
    const { chapter_id } = req.body
    // 이미 있으면 무시, 없으면 추가
    const { data: existing } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', guestId)
      .eq('chapter_id', Number(chapter_id))
      .maybeSingle()

    if (!existing) {
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: guestId, chapter_id: Number(chapter_id) })
      if (error) return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { chapter_id } = req.body
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', guestId)
      .eq('chapter_id', Number(chapter_id))
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
