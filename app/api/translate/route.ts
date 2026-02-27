// Translation API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const POST = withAuth(async (req, ctx) => {
  const { text, targetLang = 'id' } = await req.json()

  if (!text) {
    return NextResponse.json(
      { error: 'Text is required' },
      { status: 400 }
    )
  }

  // Use Google Translate via translate.googleapis.com (no API key needed for basic usage)
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
})
