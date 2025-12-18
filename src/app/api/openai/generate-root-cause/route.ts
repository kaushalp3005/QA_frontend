import { NextRequest, NextResponse } from 'next/server'

// Prefer server-only secret; fallback to NEXT_PUBLIC for compatibility (not recommended)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY
if (!process.env.OPENAI_API_KEY && process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
  console.warn('[openai] Using NEXT_PUBLIC_OPENAI_API_KEY as fallback. Prefer server-only OPENAI_API_KEY.')
}

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

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured')
      console.error('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set (hidden)' : 'Not set')
      console.error('NEXT_PUBLIC_OPENAI_API_KEY:', process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'Set (hidden)' : 'Not set')
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please check your environment variables.' },
        { status: 500 }
      )
    }
    
    // Log that we're using an API key (but not the actual key)
    console.log('Using OpenAI API key:', OPENAI_API_KEY.substring(0, 10) + '...' + OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4))

    const data: GenerateRootCauseRequest = await request.json()

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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a quality assurance expert specialized in root cause analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('OpenAI API error:', errorData)
      console.error('Response status:', response.status)
      console.error('Response statusText:', response.statusText)
      
      // Return more detailed error message
      const errorMessage = errorData.error?.message || errorData.error || 'Failed to generate root cause description'
      return NextResponse.json(
        { error: errorMessage, details: errorData },
        { status: response.status }
      )
    }

    const responseData = await response.json()
    const generatedText = responseData.choices[0]?.message?.content?.trim()

    if (!generatedText) {
      return NextResponse.json(
        { error: 'No response generated from OpenAI' },
        { status: 500 }
      )
    }

    return NextResponse.json({ rootCauseDescription: generatedText })
  } catch (error) {
    console.error('Error generating root cause description:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
