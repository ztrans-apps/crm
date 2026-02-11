// Quick replies utility functions

/**
 * Replace variables in quick reply content
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
 * Parse variables from quick reply content
 */
export function parseVariables(content: string): string[] {
  const pattern = /\{([^}]+)\}/g
  const matches = content.matchAll(pattern)
  const variables = new Set<string>()

  for (const match of matches) {
    variables.add(match[1])
  }

  return Array.from(variables)
}
