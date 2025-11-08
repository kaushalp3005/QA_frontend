// Date formatting utilities to prevent hydration errors
// Use consistent formatting between server and client

export function formatDate(dateString: string | Date | null | undefined, options?: {
  includeTime?: boolean
  shortMonth?: boolean
  locale?: string
}): string {
  // Return fallback if date is null or undefined
  if (!dateString) {
    return 'N/A'
  }
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  
  // Check if date is invalid
  if (isNaN(date.getTime())) {
    return 'Invalid Date'
  }
  
  // Use consistent locale and options to prevent hydration mismatches
  const locale = options?.locale || 'en-US' // Use en-US for consistency
  
  if (options?.includeTime) {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: options.shortMonth ? 'short' : 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: options?.shortMonth ? 'short' : 'long',
    day: 'numeric'
  })
}

export function formatDateShort(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, { shortMonth: true })
}

export function formatDateTime(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, { includeTime: true, shortMonth: true })
}

export function formatDateISO(dateString: string | Date | null | undefined): string {
  if (!dateString) {
    return ''
  }
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toISOString().split('T')[0] // Returns YYYY-MM-DD format
}

// Relative time formatting (e.g., "2 hours ago")
export function formatRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)
  
  if (diffInMinutes < 1) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
  } else {
    return formatDateShort(date)
  }
}