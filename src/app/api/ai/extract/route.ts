import { NextRequest, NextResponse } from 'next/server';
import { AIExtractionPayload, AIExtractionResult, ComplaintCreate } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const payload: AIExtractionPayload = await request.json();

    // TODO: Implement actual AI extraction service call
    return NextResponse.json(
      { error: { code: 'NOT_IMPLEMENTED', message: 'AI extraction service not yet implemented' } },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in AI extraction:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process AI extraction' } },
      { status: 500 }
    );
  }
}