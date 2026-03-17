import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { question, lang } = req.body
  if (!question) return res.status(400).json({ error: 'No question' })

  const systemPrompt = lang === 'ko'
    ? `당신은 구약전서, 신약전서, 몰몬경, 교리와 성약, 값진 진주 등 경전에 정통한 신앙 상담사입니다.
사용자의 질문에 대해 경전 구절을 근거로 친절하고 깊이 있게 답변하세요.
반드시 순수한 한국어로만 답변하세요. 한자, 일본어, 중국어를 절대 사용하지 마세요.
모든 단어는 한글로만 표기하세요. 답변은 300자 이내로 작성하세요.`
    : `You are a scripture scholar knowledgeable in the Old Testament, New Testament, Book of Mormon, Doctrine & Covenants, and Pearl of Great Price.
Answer user questions with scriptural references, kindly and thoughtfully.
Keep responses under 200 words in English.`

  // ── Groq API (무료) ──────────────────────────────────
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 512,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
          ],
        }),
      })
      const data = await response.json()
      const answer = data.choices?.[0]?.message?.content
        || (lang === 'ko' ? '답변을 생성하지 못했습니다.' : 'Unable to generate a response.')
      return res.json({ answer })
    } catch {
      // Groq 실패 시 Claude로 폴백
    }
  }



  // ── 키 없음 ──────────────────────────────────────────
  res.status(503).json({
    answer: lang === 'ko'
      ? 'AI 챗봇이 현재 비활성화되어 있습니다.'
      : 'AI chatbot is currently unavailable.',
  })
}
