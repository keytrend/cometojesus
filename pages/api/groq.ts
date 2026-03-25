import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { question } = req.body
  if (!question) return res.status(400).json({ error: 'question is required' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' })

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: '당신은 경전 묵상을 돕는 AI입니다. 반드시 순수한 한국어로만 답변하세요. 영어, 한자, 일본어 등 외국어를 절대 사용하지 마세요. 마크다운 기호(**,##,- 등)를 절대 사용하지 마세요. 번호 목록은 숫자와 마침표만 사용하세요. 생각 과정을 출력하지 마세요. 바로 답변만 작성하세요.',
          },
          {
            role: 'user',
            content: question,
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Groq API error' })
    }

    const raw = data.choices?.[0]?.message?.content ?? ''
    const answer = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    return res.status(200).json({ answer })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' })
  }
}
