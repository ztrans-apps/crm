'use client'

import { useEffect, useRef } from 'react'

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load Swagger UI from CDN
    const loadSwaggerUI = async () => {
      // Load CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css'
      document.head.appendChild(link)

      // Load JS
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js'
      script.onload = () => {
        // @ts-ignore
        if (window.SwaggerUIBundle && containerRef.current) {
          // @ts-ignore
          window.SwaggerUIBundle({
            url: '/api/docs',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              // @ts-ignore
              window.SwaggerUIBundle.presets.apis,
              // @ts-ignore
              window.SwaggerUIBundle.SwaggerUIStandalonePreset
            ],
            layout: 'BaseLayout',
            defaultModelsExpandDepth: 1,
            defaultModelExpandDepth: 1,
            docExpansion: 'list',
            filter: true,
            showRequestHeaders: true,
            tryItOutEnabled: true,
          })
        }
      }
      document.body.appendChild(script)
    }

    loadSwaggerUI()
  }, [])

  return (
    <div className="min-h-screen bg-vx-surface">
      <div className="border-b border-vx-border bg-vx-surface px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-vx-text">API Documentation</h1>
          <p className="mt-1 text-sm text-vx-text-muted">
            Complete API reference for WhatsApp CRM Platform
          </p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div id="swagger-ui" ref={containerRef}></div>
      </div>
    </div>
  )
}

