/**
 * OpenAI API integration for AI-powered features
 */

interface GenerateRootCauseRequest {
  problemStatement: string
  why1: string
  why2: string
  why3: string
  why4: string
  why5: string
  why1CauseCategory?: string
  why2CauseCategory?: string
  why3CauseCategory?: string
  why4CauseCategory?: string
  why5CauseCategory?: string
}

/**
 * Generate Root Cause Description using OpenAI based on 5 Whys analysis
 * Now calls server-side API route to keep API key secure
 */
export async function generateRootCauseDescription(data: GenerateRootCauseRequest): Promise<string> {
  try {
    const response = await fetch('/api/openai/generate-root-cause', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error occurred' }))
      console.error('OpenAI API Error Details:', error)
      const errorMessage = error.error || error.message || 'Failed to generate root cause description'
      throw new Error(errorMessage)
    }

    const result = await response.json()
    return result.rootCauseDescription
  } catch (error) {
    console.error('OpenAI API Error:', error)
    throw error
  }
}
