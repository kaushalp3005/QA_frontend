/**
 * OpenAI API integration for AI-powered features
 */

const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY

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
 */
export async function generateRootCauseDescription(data: GenerateRootCauseRequest): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured')
  }

  const prompt = `You are a quality assurance expert analyzing a root cause investigation using the 5 Whys methodology. Based on the following information, provide a comprehensive and professional Root Cause Description summary.

Problem Statement: ${data.problemStatement}

5 Whys Analysis:
1. Why #1: ${data.why1}${data.why1CauseCategory ? ` (Category: ${data.why1CauseCategory})` : ''}
2. Why #2: ${data.why2}${data.why2CauseCategory ? ` (Category: ${data.why2CauseCategory})` : ''}
3. Why #3: ${data.why3}${data.why3CauseCategory ? ` (Category: ${data.why3CauseCategory})` : ''}
4. Why #4: ${data.why4}${data.why4CauseCategory ? ` (Category: ${data.why4CauseCategory})` : ''}
5. Why #5: ${data.why5}${data.why5CauseCategory ? ` (Category: ${data.why5CauseCategory})` : ''}

Please provide a clear, concise root cause description that:
1. Summarizes the progression from the initial problem to the fundamental root cause
2. Highlights the key factors identified in the analysis
3. Is written in professional quality assurance language
4. Is between 100-200 words
5. Focuses on the actionable root cause rather than symptoms

Root Cause Description:`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a quality assurance expert specializing in root cause analysis and the 5 Whys methodology.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to generate root cause description')
    }

    const result = await response.json()
    return result.choices[0].message.content.trim()
  } catch (error) {
    console.error('OpenAI API Error:', error)
    throw error
  }
}
