'use client'

import { Droplets, Flame, Fuel, Gauge, Sun, Thermometer, Zap } from 'lucide-react'
import { PageHeader } from '@/components/maintenance/ui'
import { ReadingTile } from '@/components/maintenance/utilities/fields'
import { useMtSession } from '@/lib/maintenance/hooks'
import { canonicalPlant } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { A185_PLANT, W202_PLANT } from '@/lib/maintenance/api/readings'

/** Legacy floor-meter "Electric Consumption" round (not in the MT route table). */
const ELECTRIC_CONSUMPTION = MT.electricConsumption

/**
 * Daily Reading utility chooser (DailyReadingHubScreen). A-185 users get the
 * HT / Cold Room / UV card, W-202 users the Main / Solar meters; a HEAD sees
 * both because only a HEAD can delete a day, whichever plant it is.
 */
export default function DailyReadingHubPage() {
  const session = useMtSession()
  if (!session) return null
  const plant = canonicalPlant(session.plantId)
  const isHead = session.role === 'HEAD'
  const showA185 = plant === A185_PLANT || isHead
  const showW202 = plant === W202_PLANT || isHead

  return (
    <>
      <PageHeader title="Daily Reading" back={MT.dashboard} />
      <div className="grid gap-3 sm:grid-cols-2">
        <ReadingTile icon={Fuel} title="Diesel consumption" href={MT.utilityHistory('diesel')} />
        <ReadingTile icon={Flame} title="Gas consumption" href={MT.utilityHistory('gas')} />
        {/* Electricity is the legacy floor-meter round (with W-202's AC readings);
            the new utility electricity form is parked, as in the app. */}
        <ReadingTile icon={Zap} title="Electricity consumption" href={ELECTRIC_CONSUMPTION} />
        <ReadingTile icon={Droplets} title="Water consumption" href={MT.utilityHistory('water')} />
        {showW202 && (
          <>
            <ReadingTile icon={Gauge} title="Main meter reading" href={MT.w202Readings('main')} />
            <ReadingTile icon={Sun} title="Solar reading" href={MT.w202Readings('solar')} />
          </>
        )}
        {showA185 && <ReadingTile icon={Thermometer} title="HT / Cold Room / UV readings" href={MT.a185Readings} />}
      </div>
    </>
  )
}
