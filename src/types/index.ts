export type ComplaintSource = 'email' | 'whatsapp' | 'voice' | 'call' | 'webform' | 'other';
export type ComplaintStatus = 'open' | 'acknowledged' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type IssueType = 'defect' | 'missing_qty' | 'wrong_item' | 'damaged' | 'billing' | 'delivery_delay' | 'other';
export type Currency = string; // ISO 4217 codes like 'INR', 'USD', etc.

export interface Customer {
  name: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  address?: string | null;
}

export interface ArticleItem {
  sku: string;
  item_description: string;
  qty: number;
  uom: string;
  unit_price: number;
  currency: Currency;
  line_total?: number; // Calculated field
  issue_type: IssueType;
  problem_description: string;
}

export interface ChannelMetadata {
  message_id?: string;
  phone?: string;
  email_msg_id?: string;
  timestamps?: Record<string, any>;
  [key: string]: any;
}

export interface FileUpload {
  url: string;
  filename: string;
  type: string;
}

export interface Complaint {
  id: string;
  source: ComplaintSource;
  channel_metadata?: ChannelMetadata | null;
  customer: Customer;
  items: ArticleItem[];
  summary: string;
  attachments: FileUpload[];
  priority: Priority;
  status: ComplaintStatus;
  assignee?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintCreate {
  source: ComplaintSource;
  channel_metadata?: ChannelMetadata | null;
  customer: Customer;
  items: ArticleItem[];
  summary: string;
  attachments?: FileUpload[];
  priority?: Priority;
}

export interface ComplaintUpdate {
  status?: ComplaintStatus;
  assignee?: string | null;
  items?: ArticleItem[];
  priority?: Priority;
  summary?: string;
  customer?: Customer;
}

export interface AIExtractionPayload {
  raw_text: string;
  source_hint: 'email' | 'whatsapp' | 'voice' | 'other';
  optional_context?: {
    known_skus?: string[];
    currency_default?: Currency;
    default_uom?: string;
  };
}

export interface AIExtractionResult {
  extracted_data: ComplaintCreate;
  confidence_scores: Record<string, number>; // Field path -> confidence (0-1)
  unresolved_fields: string[]; // Field paths that couldn't be extracted
  suggestions: string[];
  warnings: string[];
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export interface ListResponse<T> {
  items: T[];
  next_cursor?: string | null;
  has_more: boolean;
}

// Form state types
export interface ComplaintFormData {
  // Customer Information
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCompany?: string;
  customerAddress?: string;
  
  // Complaint Details
  complaintType: 'physical_contamination' | 'microbial_contamination' | 'packaging_issue' | 'printing_issue' | 'physical_defects' | 'infestation' | 'ovality_issue';
  complaintReceiveDate: string;
  measuresToResolve?: 'rtv' | 'rca_capa' | 'replacement' | 'refund';
  
  // Communication Method
  communicationMethod: 'email' | 'whatsapp' | 'phone' | 'other';
  
  // Articles/Products
  articles: Array<{
    name: string;
    category: string;
    quantity: number;
    defectDescription?: string;
  }>;
  
  // Additional UI state
  _draft?: boolean;
  _aiApplied?: Record<string, number>; // Field path -> confidence
}

// Status transition rules
export const STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  open: ['acknowledged'],
  acknowledged: ['in_progress'],
  in_progress: ['waiting_customer', 'resolved'],
  waiting_customer: ['in_progress', 'resolved'],
  resolved: ['closed'],
  closed: [], // Terminal state
};

// Issue type labels
export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  defect: 'Product Defect',
  missing_qty: 'Missing Quantity',
  wrong_item: 'Wrong Item',
  damaged: 'Damaged Item',
  billing: 'Billing Issue',
  delivery_delay: 'Delivery Delay',
  other: 'Other',
};

// Priority labels and colors
export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-600 bg-gray-100' },
  medium: { label: 'Medium', color: 'text-blue-600 bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600 bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-100' },
};

// Status labels and colors
export const STATUS_CONFIG: Record<ComplaintStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'text-gray-600 bg-gray-100' },
  acknowledged: { label: 'Acknowledged', color: 'text-blue-600 bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-yellow-600 bg-yellow-100' },
  waiting_customer: { label: 'Waiting Customer', color: 'text-purple-600 bg-purple-100' },
  resolved: { label: 'Resolved', color: 'text-green-600 bg-green-100' },
  closed: { label: 'Closed', color: 'text-gray-800 bg-gray-200' },
};

// Confidence level helpers
export const getConfidenceLevel = (score: number): 'high' | 'medium' | 'low' => {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
};

export const getConfidenceColor = (score: number): string => {
  const level = getConfidenceLevel(score);
  return {
    high: 'text-confidence-high border-confidence-high',
    medium: 'text-confidence-medium border-confidence-medium',
    low: 'text-confidence-low border-confidence-low',
  }[level];
};