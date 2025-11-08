import { NextRequest, NextResponse } from 'next/server';
import { Complaint, ComplaintCreate, ListResponse } from '@/types';

// Mock data with new complaint ID format: CCFS-YYYY-MM-001
// Empty array - complaints will be generated with new format
const mockComplaints: Complaint[] = [];

// In-memory storage for new complaints (in a real app, this would be a database)
let complaints = [...mockComplaints];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const q = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    let filteredComplaints = [...complaints];

    // Filter by status
    if (status) {
      filteredComplaints = filteredComplaints.filter(c => c.status === status);
    }

    // Filter by source
    if (source) {
      filteredComplaints = filteredComplaints.filter(c => c.source === source);
    }

    // Search functionality
    if (q) {
      const query = q.toLowerCase();
      filteredComplaints = filteredComplaints.filter(c => 
        c.summary.toLowerCase().includes(query) ||
        c.customer.name.toLowerCase().includes(query) ||
        c.items.some(item => 
          item.item_description.toLowerCase().includes(query) ||
          item.problem_description.toLowerCase().includes(query)
        )
      );
    }

    // Apply limit
    const paginatedComplaints = filteredComplaints.slice(0, limit);

    const response: ListResponse<Complaint> = {
      items: paginatedComplaints,
      next_cursor: null,
      has_more: filteredComplaints.length > limit
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch complaints' } },
      { status: 500 }
    );
  }
}

// Generate complaint ID in new format: CCFS-YYYY-MM-001 (for CDPL) or CCNFS-YYYY-MM-001 (for CFPL)
// This matches the PostgreSQL function format
function generateComplaintId(company: string = 'CDPL'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}-${month}`;
  
  // Determine prefix based on company
  const prefix = company === 'CDPL' ? 'CCFS' : 'CCNFS';
  const pattern = `${prefix}-${yearMonth}`;
  
  // Find all complaints for current month
  const currentMonthComplaints = complaints.filter(c => 
    c.id && c.id.startsWith(pattern)
  );
  
  // Get the highest sequence number
  let maxSequence = 0;
  currentMonthComplaints.forEach(complaint => {
    const match = complaint.id.match(/-(\d{3})$/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSequence) {
        maxSequence = seq;
      }
    }
  });
  
  // Increment sequence and format with 3 digits
  const newSequence = String(maxSequence + 1).padStart(3, '0');
  
  return `${prefix}-${yearMonth}-${newSequence}`;
}


export async function POST(request: NextRequest) {
  try {
    const body: ComplaintCreate & { id?: string; company?: string } = await request.json();

    // Get company from body, default to CDPL
    const company = body.company || 'CDPL';
    
    // Use provided ID or generate new one based on company
    const complaintId = body.id || generateComplaintId(company);

    // Generate new complaint with ID and timestamps
    const newComplaint: Complaint = {
      id: complaintId,
      source: body.source,
      channel_metadata: body.channel_metadata || null,
      customer: body.customer,
      items: body.items,
      summary: body.summary,
      attachments: body.attachments || [],
      priority: body.priority || 'medium',
      status: 'open',
      assignee: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add to our in-memory store
    complaints.unshift(newComplaint);

    return NextResponse.json(newComplaint, { status: 201 });
  } catch (error) {
    console.error('Error creating complaint:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create complaint' } },
      { status: 500 }
    );
  }
}