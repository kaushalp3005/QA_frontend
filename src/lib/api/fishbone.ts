// ============================================
// FISHBONE ANALYSIS API FUNCTIONS
// ============================================
// Base URL for API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================
// TYPES
// ============================================

export interface FishboneFormData {
  complaintId?: string;
  itemCategory?: string;
  itemSubcategory?: string;
  itemDescription?: string;
  problemStatement: string;
  customerName?: string;
  otherCustomerName?: string;
  issueDescription?: string;
  dateOccurred?: string;
  impactLevel?: 'low' | 'medium' | 'high';
  analysisDate?: string;
  createdBy?: string;
  peopleCauses?: string[];
  processCauses?: string[];
  equipmentCauses?: string[];
  materialsCauses?: string[];
  environmentCauses?: string[];
  managementCauses?: string[];
  actionPlan?: ActionPlanItem[];
  status?: 'draft' | 'in-progress' | 'completed' | 'archived';
}

export interface ActionPlanItem {
  id: number;
  action: string;
  responsible: string;
  deadline: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  challenges?: string;
  preventiveAction?: string;
  startDate?: string;
}

export interface FishboneCategory {
  id: string;
  name: string;
  causes: string[];
}

export interface FishboneCreatePayload {
  complaint_id?: string;
  item_category?: string;
  item_subcategory?: string;
  item_description?: string;
  problem_statement: string;
  customer_name?: string;
  other_customer_name?: string;
  issue_description?: string;
  date_occurred?: string;
  impact_level?: string;
  analysis_date?: string;
  created_by?: string;
  people_causes?: string[];
  process_causes?: string[];
  equipment_causes?: string[];
  materials_causes?: string[];
  environment_causes?: string[];
  management_causes?: string[];
  action_plan?: any[];
  preventive_action_plan?: any[];
  status?: string;
}

export interface FishboneListItem {
  id: number;
  fishbone_number: string;
  complaint_id: string;
  item_category: string;
  problem_statement: string;
  customer_name: string;
  impact_level: string;
  status: string;
  created_by: string;
  analysis_date: string;
  created_at: string;
}

export interface FishboneDetail extends FishboneListItem {
  item_subcategory: string;
  item_description: string;
  other_customer_name: string;
  issue_description: string;
  date_occurred: string;
  people_causes: string[];
  process_causes: string[];
  equipment_causes: string[];
  materials_causes: string[];
  environment_causes: string[];
  management_causes: string[];
  action_plan: ActionPlanItem[];
  updated_at: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all fishbone analyses with pagination and filters
 */
export async function getFishboneAnalyses(params: {
  company: string;
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<{
  data: FishboneListItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const { company, page = 1, limit = 10, status, search } = params;
  
  const queryParams = new URLSearchParams({
    company,
    page: page.toString(),
    limit: limit.toString(),
  });

  if (status) {
    queryParams.append('status', status);
  }

  if (search) {
    queryParams.append('search', search);
  }

  const response = await fetch(`${API_BASE}/fishbone/?${queryParams.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch fishbone analyses: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get single fishbone analysis by ID
 */
export async function getFishboneById(
  id: number,
  company: string
): Promise<FishboneDetail> {
  const response = await fetch(
    `${API_BASE}/fishbone/${id}?company=${company}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Fishbone analysis not found');
    }
    throw new Error(`Failed to fetch fishbone: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create new fishbone analysis
 */
export async function createFishbone(
  data: FishboneCreatePayload,
  company: string
): Promise<{
  message: string;
  id: number;
  fishbone_number: string;
}> {
  const response = await fetch(
    `${API_BASE}/fishbone/?company=${company}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to create fishbone: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update existing fishbone analysis
 */
export async function updateFishbone(
  id: number,
  data: Partial<FishboneCreatePayload>,
  company: string
): Promise<{
  message: string;
  id: number;
}> {
  const response = await fetch(
    `${API_BASE}/fishbone/${id}?company=${company}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to update fishbone: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete fishbone analysis
 */
export async function deleteFishbone(
  id: number,
  company: string
): Promise<{
  message: string;
  id: number;
}> {
  const response = await fetch(
    `${API_BASE}/fishbone/${id}?company=${company}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to delete fishbone: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get fishbone analyses by complaint ID
 */
export async function getFishboneByComplaint(
  complaintId: string,
  company: string
): Promise<{
  data: FishboneDetail[];
  total: number;
}> {
  const response = await fetch(
    `${API_BASE}/fishbone/by-complaint/${complaintId}?company=${company}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch fishbone by complaint: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Helper function to transform frontend form data to API payload
 */
export function transformFishboneDataToPayload(
  formData: any,
  categories: FishboneCategory[],
  actionPlan: ActionPlanItem[],
  preventiveActionPlan?: ActionPlanItem[]
): FishboneCreatePayload {
  return {
    complaint_id: formData.complaintId || undefined,
    item_category: formData.itemCategory || undefined,
    item_subcategory: formData.itemSubcategory || undefined,
    item_description: formData.itemDescription || undefined,
    problem_statement: formData.problemStatement,
    customer_name: formData.customerName || undefined,
    other_customer_name: formData.otherCustomerName || undefined,
    issue_description: formData.issueDescription || undefined,
    date_occurred: formData.dateOccurred || undefined,
    impact_level: formData.impactLevel || 'medium',
    analysis_date: formData.analysisDate || undefined,
    created_by: formData.createdBy || undefined,
    people_causes: categories.find(c => c.id === 'people')?.causes.filter(c => c.trim()) || [],
    process_causes: categories.find(c => c.id === 'process')?.causes.filter(c => c.trim()) || [],
    equipment_causes: categories.find(c => c.id === 'equipment')?.causes.filter(c => c.trim()) || [],
    materials_causes: categories.find(c => c.id === 'materials')?.causes.filter(c => c.trim()) || [],
    environment_causes: categories.find(c => c.id === 'environment')?.causes.filter(c => c.trim()) || [],
    management_causes: categories.find(c => c.id === 'management')?.causes.filter(c => c.trim()) || [],
    action_plan: actionPlan.filter(item => item.action.trim()),
    preventive_action_plan: preventiveActionPlan?.filter(item => item.action.trim()) || [],
    status: formData.status || 'draft',
  };
}
