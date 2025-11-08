import { NextRequest, NextResponse } from 'next/server';

// Server-side API route
// Since localStorage is client-only, we return instructions for client-side fetch
// The actual data will be fetched from client-side code

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Since this is a server-side route and mockDB uses localStorage (client-only),
  // we need to return a placeholder or redirect to client-side handling
  
  // For now, return a message indicating client-side fetch is needed
  return NextResponse.json({
    success: false,
    error: { 
      code: 'CLIENT_SIDE_ONLY', 
      message: 'This endpoint requires client-side access. Use direct mockDB access instead.' 
    }
  }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Since this is a server-side route and mockDB uses localStorage (client-only),
  // we need to return a placeholder or redirect to client-side handling
  
  // For now, return a message indicating client-side update is needed
  return NextResponse.json({
    success: false,
    error: { 
      code: 'CLIENT_SIDE_ONLY', 
      message: 'This endpoint requires client-side access. Use direct mockDB.updateComplaint() instead.' 
    }
  }, { status: 400 });
}