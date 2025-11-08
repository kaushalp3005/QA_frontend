import { NextRequest, NextResponse } from 'next/server';
import { AIExtractionPayload, AIExtractionResult, ComplaintCreate } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const payload: AIExtractionPayload = await request.json();

    // Mock AI extraction - in a real app, this would call an AI service
    const mockExtraction: AIExtractionResult = {
      extracted_data: {
        source: payload.source_hint as any,
        customer: {
          name: "John Doe",
          phone: "+1234567890",
          email: "john.doe@email.com",
          company: null,
          address: "123 Main St, City, State 12345"
        },
        items: [
          {
            sku: "PROD-001",
            item_description: "Sample Product",
            qty: 1,
            uom: "pcs",
            unit_price: 1000,
            currency: payload.optional_context?.currency_default || "USD",
            line_total: 1000,
            issue_type: "defect",
            problem_description: "Product has issues"
          }
        ],
        summary: "Extracted complaint summary from: " + payload.raw_text.substring(0, 100) + "...",
        attachments: [],
        priority: "medium"
      },
      confidence_scores: {
        "customer.name": 0.9,
        "customer.phone": 0.8,
        "customer.email": 0.85,
        "items[0].item_description": 0.7,
        "items[0].qty": 0.95,
        "items[0].issue_type": 0.6,
        "summary": 0.8
      },
      unresolved_fields: ["customer.address", "items[0].sku"],
      suggestions: [
        "Consider verifying the customer phone number",
        "Product SKU could not be determined from the text",
        "Address information is incomplete"
      ],
      warnings: [
        "Low confidence on issue type classification",
        "Multiple products mentioned but only one extracted"
      ]
    };

    return NextResponse.json(mockExtraction);
  } catch (error) {
    console.error('Error in AI extraction:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process AI extraction' } },
      { status: 500 }
    );
  }
}