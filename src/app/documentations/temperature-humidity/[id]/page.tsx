'use client'
import DocViewPage from '@/components/documentations/DocViewPage'
import TemperatureHumidityReadings from '@/components/documentations/TemperatureHumidityReadings'
import { DOC_FORMS } from '@/config/doc-forms'

export default function Page() {
  return (
    <DocViewPage
      config={DOC_FORMS['temperature-humidity']}
      // `readings` is a nested jsonb (per-area grids + notes); the generic
      // renderer can only dump it as raw JSON.
      renderJsonField={(key, _value, record) =>
        key === 'readings' ? <TemperatureHumidityReadings record={record} /> : null
      }
    />
  )
}
