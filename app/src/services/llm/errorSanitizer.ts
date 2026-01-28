/**
 * Error Sanitizer
 * 
 * Redacts sensitive information from error messages before logging or displaying.
 * Prevents accidental exposure of API keys in console output or UI.
 */

// OpenAI key patterns
// Old format: sk-[alphanumeric]{48}
// New project format: sk-proj-[alphanumeric-_]{48+}
const OPENAI_KEY_PATTERN = /sk-(?:proj-)?[a-zA-Z0-9\-_]{20,}/g

// Anthropic key pattern: sk-ant-[alphanumeric-_]{48+}
const ANTHROPIC_KEY_PATTERN = /sk-ant-[a-zA-Z0-9\-_]{20,}/g

// Generic Bearer token pattern (catches most auth headers)
const BEARER_TOKEN_PATTERN = /Bearer\s+[a-zA-Z0-9\-_.]{20,}/gi

// Maximum length for error messages
const MAX_ERROR_LENGTH = 500

/**
 * Redact sensitive patterns from a string
 */
function redactPatterns(message: string): string {
  return message
    .replace(OPENAI_KEY_PATTERN, '[REDACTED_API_KEY]')
    .replace(ANTHROPIC_KEY_PATTERN, '[REDACTED_API_KEY]')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [REDACTED]')
}

/**
 * Truncate a message to maximum length
 */
function truncateMessage(message: string, maxLength: number = MAX_ERROR_LENGTH): string {
  if (message.length <= maxLength) {
    return message
  }
  return message.slice(0, maxLength) + '... [truncated]'
}

/**
 * Sanitize an error message for safe logging or display
 * 
 * - Redacts API keys and tokens
 * - Truncates to reasonable length
 * - Preserves useful error information
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return 'An unknown error occurred'
  }

  const redacted = redactPatterns(message)
  return truncateMessage(redacted)
}

/**
 * Sanitize an Error object, returning a safe message string
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message)
  }
  
  if (typeof error === 'string') {
    return sanitizeErrorMessage(error)
  }
  
  // For objects, try to extract a message property
  if (error && typeof error === 'object' && 'message' in error) {
    return sanitizeErrorMessage(String((error as { message: unknown }).message))
  }
  
  return 'An unknown error occurred'
}

/**
 * Create a sanitized Error object
 */
export function createSanitizedError(error: unknown): Error {
  return new Error(sanitizeError(error))
}
