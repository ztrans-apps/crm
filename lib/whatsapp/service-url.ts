export function getWhatsAppServiceUrl() {
  return (
    process.env.WHATSAPP_SERVICE_URL ||
    process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL ||
    'http://localhost:3001'
  )
}

export function isLocalWhatsAppServiceUrl(url: string) {
  return /localhost|127\.0\.0\.1/i.test(url)
}
