// X-Ray Detection Types and Utilities

export interface XRayRecord {
  id: string;
  date: string;
  time: string;
  productName: string;
  batchNo: string;
  ss316: boolean;
  ceramic: boolean;
  sodaLimeGlass: boolean;
  onXRay: string;
  onProductPassed: string;
  calibratedMonitoredBy: string;
  verifiedBy: string;
  remarks: string;
}

// Local storage utilities
const STORAGE_KEY = 'xray_records';

export function saveRecords(records: XRayRecord[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
}

export function loadRecords(): XRayRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading X-Ray records:', error);
    return [];
  }
}