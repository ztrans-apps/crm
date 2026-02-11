// Translation API endpoint
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang = 'id' } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // For now, return a mock translation
    // In production, integrate with Google Translate API or similar
    const mockTranslation = `[Translated to ${targetLang}] ${text}`

    return NextResponse.json({
      translatedText: mockTranslation,
      sourceLang: 'auto',
      targetLang,
    })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    )
  }
}
