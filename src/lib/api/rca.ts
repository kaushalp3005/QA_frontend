/**
 * RCA/CAPA API Service
 * Handles all API calls for Root Cause Analysis and Corrective/Preventive Actions
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export interface ActionPlanItem {
  srNo: number
  challenges: string
  actionPoints: string
  responsibility: string
  trafficLightStatus: 'completed' | 'on_schedule' | 'delayed'
  startDate: string
  completionDate: string
}

export interface RCAData {
  // Basic Information
  rcaNumber: string
  complaintId: string
  dateOfReport?: string
  dateInitiated?: string
  initiatedBy?: string
  itemCategory?: string
  itemSubcategory?: string
  itemDescription?: string
  
  // Incident Details
  summaryOfIncident?: string
  dateOfPacking?: string
  batchCode?: string
  
  // Customer Information
  nameOfCustomer?: string
  nameOfCustomerOther?: string
  phoneNoOfCustomer?: string
  emailOfCustomer?: string
  
  // Injury Information
  customerSustainInjury?: 'yes' | 'no'
  descriptionOfInjury?: string
  
  // Food Product Details
  productPreparedAtCandor?: 'yes' | 'no'
  otherDetailsForInvestigation?: string
  
  // Problem Definition
  problemCategory?: 'quality' | 'safety' | 'process' | 'equipment' | 'environmental' | 'other'
  severity?: 'low' | 'medium' | 'high' | 'critical'
  
  // Investigation Team
  teamLeader?: string
  teamMembers?: string[]
  
  // Problem Analysis
  immediateActions?: string
  problemDescription?: string
  whenDiscovered?: string
  whereDiscovered?: string
  whoDiscovered?: string
  
  // Root Cause Analysis (5 Whys Method)
  problemStatement?: string
  why1?: string
  why1CauseCategory?: string
  why1CauseDetails?: string
  why1CauseDetailsOther?: string
  why1StandardExists?: string
  why1Applied?: string
  why2?: string
  why2CauseCategory?: string
  why2CauseDetails?: string
  why2CauseDetailsOther?: string
  why2StandardExists?: string
  why2Applied?: string
  why3?: string
  why3CauseCategory?: string
  why3CauseDetails?: string
  why3CauseDetailsOther?: string
  why3StandardExists?: string
  why3Applied?: string
  why4?: string
  why4CauseCategory?: string
  why4CauseDetails?: string
  why4CauseDetailsOther?: string
  why4StandardExists?: string
  why4Applied?: string
  why5?: string
  why5CauseCategory?: string
  why5CauseDetails?: string
  why5CauseDetailsOther?: string
  why5StandardExists?: string
  why5Applied?: string
  
  // Summary and Corrective Actions
  source?: string
  possibleCause?: string
  rootCauseDescription?: string
  
  // Action Plan - Corrective Actions
  actionPlan?: ActionPlanItem[]
  
  // Preventive Action Plan
  preventiveActionPlan?: ActionPlanItem[]
  
  // Approval
  preparedBy?: string
  capaPreparedBy?: string
  approvedBy?: string
  dateApproved?: string
  
  // Control Sample Photos
  controlSamplePhotos?: string[]
}

export interface RCAResponse extends RCAData {
  id: number
  createdAt?: string
  updatedAt?: string
}

export interface RCAListResponse {
  data: RCAResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Generate next RCA number in format RCA-YYYY-MM-0001
 */
export async function generateRCANumber(company: string): Promise<{ rcaNumber: string }> {
  const response = await fetch(`${API_BASE_URL}/rca/generate-number?company=${company}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to generate RCA number')
  }
  
  return response.json()
}

/**
 * Create a new RCA/CAPA record
 */
export async function createRCA(data: RCAData, company: string): Promise<RCAResponse> {
  const response = await fetch(`${API_BASE_URL}/rca/?company=${company}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to create RCA/CAPA')
  }
  
  return response.json()
}

/**
 * Get all RCA/CAPA records with pagination and filters
 */
export async function getRCAList(params: {
  company: string
  page?: number
  limit?: number
  search?: string
  severity?: string
}): Promise<RCAListResponse> {
  const queryParams = new URLSearchParams({
    company: params.company,
    page: String(params.page || 1),
    limit: String(params.limit || 10),
  })
  
  if (params.search) {
    queryParams.append('search', params.search)
  }
  
  if (params.severity) {
    queryParams.append('severity', params.severity)
  }
  
  const response = await fetch(`${API_BASE_URL}/rca/?${queryParams.toString()}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to fetch RCA/CAPA list')
  }
  
  return response.json()
}

/**
 * Get a specific RCA/CAPA record by ID
 */
export async function getRCAById(id: number, company: string): Promise<RCAResponse> {
  const response = await fetch(`${API_BASE_URL}/rca/${id}?company=${company}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to fetch RCA/CAPA')
  }
  
  return response.json()
}

/**
 * Update an existing RCA/CAPA record
 */
export async function updateRCA(id: number, data: Partial<RCAData>, company: string): Promise<RCAResponse> {
  const response = await fetch(`${API_BASE_URL}/rca/${id}?company=${company}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to update RCA/CAPA')
  }
  
  return response.json()
}

/**
 * Delete an RCA/CAPA record
 */
export async function deleteRCA(id: number, company: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/rca/${id}?company=${company}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to delete RCA/CAPA')
  }
  
  return response.json()
}
