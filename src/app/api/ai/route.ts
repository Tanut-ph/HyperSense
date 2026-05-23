import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                'คุณคือ AI Clinical Decision Support ด้านข้อมูลผู้ป่วยและพันธุกรรม',
            },
            {
              role: 'user',
              content: body.message,
            },
          ],
        }),
      }
    )

    const data = await response.json()

    return NextResponse.json({
      result: data.choices?.[0]?.message?.content || 'No response',
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'AI request failed' },
      { status: 500 }
    )
  }
}