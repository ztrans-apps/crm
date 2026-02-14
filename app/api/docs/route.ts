import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * Serve OpenAPI specification
 * GET /api/docs
 */
export async function GET(request: NextRequest) {
  try {
    const openApiPath = path.join(process.cwd(), 'lib/swagger/openapi.json')
    const openApiSpec = JSON.parse(fs.readFileSync(openApiPath, 'utf-8'))

    return NextResponse.json(openApiSpec)
  } catch (error: any) {
    console.error('[API] Error serving OpenAPI spec:', error)
    return NextResponse.json(
      { error: 'Failed to load API documentation' },
      { status: 500 }
    )
  }
}

