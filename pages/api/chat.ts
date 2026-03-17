import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { question, lang } = req.body
  if (!question) return res.status(400).json({ error: 'No question' })

  const systemPrompt = lang === 'ko'
    ? `당신은 구약전서, 신약전서, 몰몬경, 교리와 성약, 값진 진주 등 경전에 정통한 신앙 상담사입니다.
사용자의 질문에 대해 경전 구절을 근거로 친절하고 깊이 있게 답변하세요.
답변은 한국어로, 200자 이내로 간결하게 작성하세요.`
    : `You are a scripture scholar knowledgeable in the Old Testament, New Testament, Book of Mormon, Doctrine & Covenants, and Pearl of Great Price.
Answer user questions with scriptural references, kindly and thoughtfully.
Keep responses under 200 words in English.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
      }),
    })

    const data = await response.json()
    const answer = data.content?.[0]?.text || (lang === 'ko' ? '답변을 생성하지 못했습니다.' : 'Unable to generate a response.')
    res.json({ answer })
  } catch (err) {
    res.status(500).json({ answer: lang === 'ko' ? '서버 오류가 발생했습니다.' : 'Server error occurred.' })
  }
}
