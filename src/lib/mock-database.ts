// Mock Database for Complaints
export type Company = 'CDPL' | 'CFPL'

export interface ComplaintRecord {
  id: string
  company: Company
  customerName: string
  customerEmail?: string
  customerCompany?: string
  customerAddress?: string
  complaintCategory: 'food_safety' | 'non_food_safety'
  complaintSubcategory: string
  complaintReceiveDate: string
  problemStatement: string
  measuresToResolve?: string
  remarks?: string
  communicationMethod: string
  proofImages?: string[]
  articles: Array<{
    name: string
    category: string
    subcategory: string
    subcategoryOther?: string
    itemDescription: string
    quantity: number
    defectDescription?: string
  }>
  status: 'pending' | 'open' | 'in_progress' | 'resolved' | 'closed'
  createdAt: string
  estimatedLoss?: number
}

class MockDatabase {
  private static instance: MockDatabase
  private complaints: Record<Company, ComplaintRecord[]> = {
    CDPL: [],
    CFPL: []
  }

  private constructor() {
    this.loadFromStorage()
  }

  static getInstance(): MockDatabase {
    if (!MockDatabase.instance) {
      MockDatabase.instance = new MockDatabase()
    }
    return MockDatabase.instance
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mock_complaints_db')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          // Handle both old format (array) and new format (object with companies)
          if (Array.isArray(data)) {
            // Migrate old data to CFPL (default company)
            this.complaints = {
              CDPL: [],
              CFPL: data.map(complaint => ({ ...complaint, company: 'CFPL' as Company }))
            }
            this.saveToStorage() // Save in new format
          } else {
            this.complaints = data
          }
        } catch (error) {
          console.error('Error loading complaints from storage:', error)
          this.complaints = { CDPL: [], CFPL: [] }
        }
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_complaints_db', JSON.stringify(this.complaints))
    }
  }

  // Generate next sequence number for complaint ID
  getNextSequenceNumber(category: 'food_safety' | 'non_food_safety', company: Company): number {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const yearMonth = `${year}-${month}`
    
    const prefix = category === 'food_safety' ? 'CCFS' : 'CCNFS'
    const pattern = `${prefix}-${yearMonth}`
    
    // Filter complaints for current month only
    const currentMonthComplaints = this.complaints[company].filter(c => 
      c.id.startsWith(pattern)
    )
    
    if (currentMonthComplaints.length === 0) {
      return 1
    }
    
    // Extract sequence numbers and find max
    const lastNumber = Math.max(
      ...currentMonthComplaints.map(c => {
        const match = c.id.match(/-(\d{3})$/)
        return match ? parseInt(match[1], 10) : 0
      })
    )
    
    return lastNumber + 1
  }

  // Create a new complaint
  createComplaint(complaintData: Omit<ComplaintRecord, 'id' | 'status' | 'createdAt' | 'estimatedLoss'>, company: Company): ComplaintRecord {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const yearMonth = `${year}-${month}`
    
    const sequenceNumber = this.getNextSequenceNumber(complaintData.complaintCategory, company)
    const prefix = complaintData.complaintCategory === 'food_safety' ? 'CCFS' : 'CCNFS'
    const paddedNumber = String(sequenceNumber).padStart(3, '0')
    
    // New Format: CCFS-2025-10-001
    const id = `${prefix}-${yearMonth}-${paddedNumber}`

    // Calculate estimated loss based on articles
    const estimatedLoss = complaintData.articles.reduce((total, article) => {
      // Rough estimation: quantity * 100 (assuming average value per item)
      return total + (article.quantity * 100)
    }, 0)

    const newComplaint: ComplaintRecord = {
      ...complaintData,
      id,
      company,
      status: 'pending',
      createdAt: new Date().toISOString(),
      estimatedLoss
    }

    this.complaints[company].unshift(newComplaint) // Add to beginning of array (most recent first)
    this.saveToStorage()
    
    return newComplaint
  }

  // Get all complaints for a specific company
  getAllComplaints(company: Company): ComplaintRecord[] {
    return [...this.complaints[company]]
  }

  // Get complaint by ID (search across all companies)
  getComplaintById(id: string): ComplaintRecord | null {
    for (const company of ['CDPL', 'CFPL'] as Company[]) {
      const complaint = this.complaints[company].find(c => c.id === id)
      if (complaint) return complaint
    }
    return null
  }

  // Update complaint status
  updateComplaintStatus(id: string, status: ComplaintRecord['status']): boolean {
    for (const company of ['CDPL', 'CFPL'] as Company[]) {
      const index = this.complaints[company].findIndex(c => c.id === id)
      if (index !== -1) {
        this.complaints[company][index].status = status
        this.saveToStorage()
        return true
      }
    }
    return false
  }

  // Update complaint data
  updateComplaint(id: string, updateData: Partial<Omit<ComplaintRecord, 'id' | 'createdAt'>>): boolean {
    for (const company of ['CDPL', 'CFPL'] as Company[]) {
      const index = this.complaints[company].findIndex(c => c.id === id)
      if (index !== -1) {
        this.complaints[company][index] = {
          ...this.complaints[company][index],
          ...updateData
        }
        this.saveToStorage()
        return true
      }
    }
    return false
  }



  // Get complaints statistics for a specific company
  getStats(company: Company) {
    const complaints = this.complaints[company]
    const total = complaints.length
    const pending = complaints.filter(c => c.status === 'pending').length
    const open = complaints.filter(c => c.status === 'open').length
    const inProgress = complaints.filter(c => c.status === 'in_progress').length
    const resolved = complaints.filter(c => c.status === 'resolved').length
    
    return {
      total,
      pending,
      open,
      inProgress,
      resolved
    }
  }

  // Clear all data (for testing)
  clearAll(): void {
    this.complaints = { CDPL: [], CFPL: [] }
    this.saveToStorage()
  }
}

export const mockDB = MockDatabase.getInstance()