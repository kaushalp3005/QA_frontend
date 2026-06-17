// Single source of truth for the metal-detector machines (CCP-2).
// Used by both the entry form and the edit modal so the two never drift.

export interface MetalDetectorOption {
  identificationNo: string
  srNo: string
  location: string
  sensitivityFE: string
  sensitivityNFE: string
  sensitivitySS: string
  mode: string
  /** Plant the detector belongs to. Omitted = A185 (default warehouse). */
  warehouse?: string
}

export const METAL_DETECTOR_OPTIONS: MetalDetectorOption[] = [
  { identificationNo: 'CCP 1',  srNo: '(MineBeaIntec-42110011)',  location: 'PFS Machine(FG Storage)', sensitivityFE: 'Fe-1.5 mm', sensitivityNFE: 'NFe-2 mm',   sensitivitySS: 'SS-2.5 mm', mode: 'Online' },
  { identificationNo: 'CCP 1A', srNo: '(MineBeaIntec-38470963)',  location: 'FSS Machine(FG Storage)', sensitivityFE: 'Fe-1.5 mm', sensitivityNFE: 'NFe-2 mm',   sensitivitySS: 'SS-2.5 mm', mode: 'Online' },
  { identificationNo: 'CCP 1B', srNo: '(Technofour-ARM 1386/18)', location: 'FSS Machine(FG Storage)', sensitivityFE: 'Fe-1.5 mm', sensitivityNFE: 'NFe-2 mm',   sensitivitySS: 'SS-2.5 mm', mode: 'Online' },
  { identificationNo: 'CCP 1C', srNo: '(Technofour-ARM 1517/18)', location: 'Outer seeds section',     sensitivityFE: 'Fe-1.0mm',  sensitivityNFE: 'NFe-1.5mm',  sensitivitySS: 'SS-2mm',    mode: 'Offline' },
  { identificationNo: 'CCP 1D', srNo: '(Das-2021081027-AMD)',     location: 'Inner seeds section',     sensitivityFE: 'Fe-1.0mm',  sensitivityNFE: 'NFe-1.2mm',  sensitivitySS: 'SS-1.7mm',  mode: 'Offline' },
  { identificationNo: 'CCP 1E', srNo: '(Das-2025082322)',         location: 'Packing area',            sensitivityFE: 'Fe-2.0 mm', sensitivityNFE: 'NFe-2.5 mm', sensitivitySS: 'SS-3 mm',   mode: 'Offline' },
  { identificationNo: 'CCP-1',  srNo: '(Technofour-ARM 831-17)',  location: 'Upper Basement',          sensitivityFE: 'Fe-2mm',    sensitivityNFE: 'NFe-2.5mm',  sensitivitySS: 'SS-3mm',    mode: 'Offline', warehouse: 'W202' },
  { identificationNo: 'CCP-1A', srNo: '(Das-20211121140)',        location: 'First floor',             sensitivityFE: 'Fe-1.0mm',  sensitivityNFE: 'NFe-1.2mm',  sensitivitySS: 'SS-1.7mm',  mode: 'Offline', warehouse: 'W202' },
  { identificationNo: 'CCP-1B', srNo: '(Technofour-ARM 769-17)',  location: 'FFS machine',             sensitivityFE: 'Fe-1.5mm',  sensitivityNFE: 'NFe-2mm',    sensitivitySS: 'SS-2.5mm',  mode: 'Online',  warehouse: 'W202' },
  { identificationNo: 'CCP-1C', srNo: '(Technofour-ARM 2134-20)', location: 'first floor mezzanine',   sensitivityFE: 'Fe-1.5mm',  sensitivityNFE: 'NFe-2mm',    sensitivitySS: 'SS-2.5mm',  mode: 'Offline', warehouse: 'W202' },
]

/** Detectors available in the given warehouse (W202 → its own; anything else → A185 default). */
export function detectorsForWarehouse(warehouse: string): MetalDetectorOption[] {
  return METAL_DETECTOR_OPTIONS.filter(opt =>
    warehouse === 'W202' ? opt.warehouse === 'W202' : !opt.warehouse
  )
}

/** Look up a detector by its identification number within a warehouse. */
export function findDetector(identificationNo: string, warehouse: string): MetalDetectorOption | undefined {
  return detectorsForWarehouse(warehouse).find(o => o.identificationNo === identificationNo)
}
