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

    // Use Google Translate via translate.googleapis.com (no API key needed for basic usage)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      })

      if (!response.ok) {
        throw new Error('Translation service error')
      }

      const data = await response.json()

      // Parse Google Translate response
      // Format: [[[translated_text, original_text, null, null, 0]], null, source_lang]
      let translatedText = ''
      if (data && data[0]) {
        for (const item of data[0]) {
          if (item[0]) {
            translatedText += item[0]
          }
        }
      }

      if (!translatedText) {
        throw new Error('No translation result')
      }

      return NextResponse.json({
        translatedText,
        sourceLang: data[2] || 'auto',
        targetLang,
      })
    } catch (translationError: any) {
      console.error('Translation service error:', translationError)
      
      // Return error instead of fallback
      return NextResponse.json(
        { 
          error: 'Translation service unavailable',
          translatedText: text 
        },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    )
  }
}
