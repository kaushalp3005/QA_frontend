/**
 * Set-point master for the Puffer CCP (CFPLB.C2.F.62, A185).
 *
 * Each product is puffed at a fixed temperature, contact time and drum speed,
 * so picking the product on the form fills in the three "Set …" fields rather
 * than leaving them to be typed. Values are the controlled ones from the
 * process document — change them here and every new record follows.
 */

/** Boilerplate printed on the format — shown on the form, printed on the sheet. */
export const FREQUENCY_NOTE = 'Hourly'
export const FREQUENCY_FOOTNOTE =
  '*Start and End of Every batch & 1. After repair, maintenance or adjustment to the time & temperature 2. At the restart of production after significant unplanned downtime.'

export interface PufferProduct {
  /** Product name as it appears on the record. */
  name: string
  /** Set Temperature for Product, e.g. "150°C ± 2". */
  temperature: string
  /** Set Product Contact Time, e.g. "7 Min". */
  contactTime: string
  /** Set Drum Speed, e.g. "2.8 Hz". */
  drumSpeed: string
}

export const PUFFER_PRODUCTS: PufferProduct[] = [
  { name: 'Pista',           temperature: '150°C ± 2', contactTime: '7 Min', drumSpeed: '2.8 Hz' },
  { name: 'Almond',          temperature: '150°C ± 2', contactTime: '9 Min', drumSpeed: '2.7 Hz' },
  { name: 'Roasted Makhana', temperature: '185°C ± 2', contactTime: '9 Min', drumSpeed: '2.7 Hz' },
  { name: 'Pumpkin seed',    temperature: '145°C ± 2', contactTime: '7 Min', drumSpeed: '4.5 Hz' },
  { name: 'Sunflower Seed',  temperature: '145°C ± 2', contactTime: '7 Min', drumSpeed: '4.5 Hz' },
  { name: 'Watermelon seed', temperature: '140°C ± 2', contactTime: '6 Min', drumSpeed: '4.5 Hz' },
  { name: 'Salted Almond',   temperature: '150°C ± 2', contactTime: '9 Min', drumSpeed: '2.7 Hz' },
  { name: 'Coated Peanut',   temperature: '210°C ± 2', contactTime: '6 Min', drumSpeed: '4.6 Hz' },
]

/** The set-points for a product name, or undefined when it isn't in the master. */
export function findPufferProduct(name: string): PufferProduct | undefined {
  if (!name) return undefined
  const n = name.trim().toLowerCase()
  return PUFFER_PRODUCTS.find((p) => p.name.toLowerCase() === n)
}
