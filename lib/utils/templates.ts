// Template processing utilities
import type { QuickReplyVariables } from '@/lib/types/chat'

/**
 * Parse variables from template content
 */
export function parseTemplateVariables(content: string): string[] {
  const pattern = /\{([^}]+)\}/g
  const matches = content.matchAll(pattern)
  const variables = new Set<string>()

  for (const match of matches) {
    variables.add(match[1])
  }

  return Array.from(variables)
}

/**
 * Replace variables in template content
 */
export function replaceVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content

  // Replace all {variable} patterns
  Object.entries(variables).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{${key}\\}`, 'g')
    result = result.replace(pattern, value)
  })

  return result
}

/**
 * Get default variable values from contact and conversation
 */
export function getDefaultVariables(
  contact: { name?: string | null; phone_number: string },
  conversation?: { created_at: string }
): QuickReplyVariables {
  const now = new Date()
  
  return {
    name: contact.name || contact.phone_number,
    phone: contact.phone_number,
    date: now.toLocaleDateString('id-ID'),
    time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    day: now.toLocaleDateString('id-ID', { weekday: 'long' }),
  }
}

/**
 * Validate template content
 */
export function validateTemplate(content: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check if content is empty
  if (!content || content.trim().length === 0) {
    errors.push('Template content cannot be empty')
  }

  // Check content length (max 4096 characters for WhatsApp)
  if (content.length > 4096) {
    errors.push('Template content exceeds 4096 characters limit')
  }

  // Check for unclosed variables
  const openBraces = (content.match(/\{/g) || []).length
  const closeBraces = (content.match(/\}/g) || []).length
  if (openBraces !== closeBraces) {
    errors.push('Template has unclosed variables')
  }

  // Check for nested variables
  if (/\{[^}]*\{/.test(content)) {
    errors.push('Template has nested variables (not supported)')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get missing variables
 */
export function getMissingVariables(
  content: string,
  providedVariables: Record<string, string>
): string[] {
  const requiredVariables = parseTemplateVariables(content)
  const providedKeys = Object.keys(providedVariables)
  
  return requiredVariables.filter(
    (variable) => !providedKeys.includes(variable)
  )
}

/**
 * Preview template with variables
 */
export function previewTemplate(
  content: string,
  variables: Record<string, string>
): string {
  const missingVariables = getMissingVariables(content, variables)
  
  // Replace provided variables
  let preview = replaceVariables(content, variables)
  
  // Replace missing variables with placeholder
  missingVariables.forEach((variable) => {
    const pattern = new RegExp(`\\{${variable}\\}`, 'g')
    preview = preview.replace(pattern, `[${variable}]`)
  })
  
  return preview
}

/**
 * Escape special characters in template
 */
export function escapeTemplate(content: string): string {
  return content
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

/**
 * Unescape special characters in template
 */
export function unescapeTemplate(content: string): string {
  return content
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
}

/**
 * Format template for display
 */
export function formatTemplateForDisplay(content: string): string {
  // Highlight variables
  return content.replace(/\{([^}]+)\}/g, '<span class="variable">{$1}</span>')
}

/**
 * Get variable description
 */
export function getVariableDescription(variable: string): string {
  const descriptions: Record<string, string> = {
    name: 'Customer name',
    phone: 'Customer phone number',
    date: 'Current date',
    time: 'Current time',
    day: 'Current day of week',
  }
  
  return descriptions[variable] || `Custom variable: ${variable}`
}

/**
 * Get all supported variables
 */
export function getSupportedVariables(): Array<{
  key: string
  description: string
  example: string
}> {
  return [
    { key: 'name', description: 'Customer name', example: 'John Doe' },
    { key: 'phone', description: 'Customer phone number', example: '+628123456789' },
    { key: 'date', description: 'Current date', example: '08/02/2026' },
    { key: 'time', description: 'Current time', example: '14:30' },
    { key: 'day', description: 'Current day', example: 'Sunday' },
  ]
}
