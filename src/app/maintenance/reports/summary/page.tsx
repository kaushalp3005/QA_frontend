'use client'

/**
 * Consolidated Summary Report as a print-friendly page — the web stand-in for
 * util/pdf/SummaryPdfRenderer.kt (Candor controlled-copy format). Content comes
 * from summaryPrintContent(), a port of SummaryPdfModel.kt. Print / "Save as PDF"
 * prints only the document, not the app chrome.
 */

import { Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import { Button, ErrorBanner, LoadingBlock, PageHeader } from '@/components/maintenance/ui'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { summaryPrintContent, summaryReport, type PrintTable } from '@/lib/maintenance/api/reports'
import { defaultRange } from '@/components/maintenance/reports/ReportFilters'

const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  body * { visibility: hidden !important; }
  #mt-print, #mt-print * { visibility: visible !important; }
  #mt-print { position: absolute; left: 0; top: 0; width: 100%; color: #000; background: #fff; }
  #mt-print .no-break { break-inside: avoid; }
}
`

function SummaryPrint() {
  const params = useSearchParams()
  const def = defaultRange()
  const from = params.get('from') || def.from
  const to = params.get('to') || def.to
  const back = params.get('back') === MT.headReports ? MT.headReports : MT.reports

  const { data, error, loading, reload } = useMtQuery(() => summaryReport({ from, to }), [from, to])
  const content = data ? summaryPrintContent(data) : null

  // "Download" on Android opens the finished PDF; open the print dialog once it's ready.
  const printed = useRef(false)
  useEffect(() => {
    if (content && !printed.current) {
      printed.current = true
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [content])

  return (
    <>
      <style>{PRINT_CSS}</style>
      <PageHeader
        title="Summary Report"
        subtitle={`${from} to ${to}`}
        back={back}
        actions={
          content && (
            <Button icon={Printer} onClick={() => window.print()}>
              Print / Save as PDF
            </Button>
          )
        }
      />
      <ErrorBanner error={error} onRetry={reload} />
      {loading && <LoadingBlock label="Building the report…" />}

      {content && data && (
        <div className="overflow-x-auto">
          <article
            id="mt-print"
            className="mx-auto min-w-[640px] max-w-[820px] bg-[#FFFFFF] p-6 text-[11px] leading-snug text-[#000000] shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700"
          >
            {/* Controlled-copy header block */}
            <table className="w-full border-collapse border border-[#000000]">
              <tbody>
                <tr>
                  <td className="w-[110px] border border-[#000000] p-2 align-middle">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/candor-logo.jpg" alt="Candor Foods" className="mx-auto max-h-10 object-contain" />
                  </td>
                  <td className="border border-[#000000] px-2 py-1 align-top">
                    <p className="font-bold">CANDOR FOODS PVT LTD</p>
                    <p>Format: Maintenance Summary Report</p>
                    <p>Document No: CFPL.MAINT.SUMMARY</p>
                  </td>
                  <td className="w-[170px] border border-[#000000] px-2 py-1 align-top text-[10px] text-[#444444]">
                    <p>Issue Date: {data.period_from}</p>
                    <p>Issue No: 01</p>
                    <p>Revision Date: {data.period_to}</p>
                    <p>Revision No: 00</p>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-3">
              <p className="font-bold">{content.title}</p>
              <p>{content.subtitle}</p>
            </div>

            <Banner>At a glance</Banner>
            <table className="w-full border-collapse">
              <tbody>
                {chunk(content.kpis, 2).map((pair, i) => (
                  <tr key={i}>
                    {[0, 1].map((j) => (
                      <KpiCells key={j} kpi={pair[j]} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {content.sections.map((sec) => (
              <section key={sec.title} className="mt-3">
                <Banner>{sec.title}</Banner>
                {sec.lines.map((l) => (
                  <p key={l}>{l}</p>
                ))}
                {sec.tables.map((t) =>
                  t.rows.length === 0 ? (
                    <p key={t.caption}>{t.caption}: none</p>
                  ) : (
                    <PrintGrid key={t.caption} table={t} />
                  ),
                )}
              </section>
            ))}

            {content.notes.length > 0 && (
              <section className="mt-3">
                <Banner>Notes</Banner>
                {content.notes.map((n) => (
                  <p key={n}>• {n}</p>
                ))}
              </section>
            )}

            <div className="mt-6 flex justify-between border-t border-[#999999] pt-1 text-[10px] text-[#444444]">
              <span>Prepared By: FST</span>
              <span>CONTROLLED COPY</span>
              <span>Approved By: FSTL</span>
            </div>
          </article>
        </div>
      )}
    </>
  )
}

function chunk<T>(list: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n))
  return out
}

function Banner({ children }: { children: React.ReactNode }) {
  return <p className="no-break mb-1 mt-3 bg-[#E5E5E5] px-2 py-1 font-bold">{children}</p>
}

function KpiCells({ kpi }: { kpi?: { label: string; value: string } }) {
  return (
    <>
      <td className="w-1/3 border border-[#000000] px-2 py-1">{kpi?.label ?? ''}</td>
      <td className="w-1/6 border border-[#000000] px-2 py-1 font-bold">{kpi?.value ?? ''}</td>
    </>
  )
}

function PrintGrid({ table }: { table: PrintTable }) {
  const total = table.weights.reduce((a, b) => a + b, 0)
  return (
    <div className="mt-2">
      <p className="font-bold">{table.caption}</p>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          {table.weights.map((w, i) => (
            <col key={i} style={{ width: `${(w / total) * 100}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-[#F0F0F0]">
            {table.headers.map((h) => (
              <th key={h} className="border border-[#000000] px-1.5 py-1 text-left font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i} className="no-break">
              {r.map((c, j) => (
                <td key={j} className="break-words border border-[#000000] px-1.5 py-1 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SummaryReportPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <SummaryPrint />
    </Suspense>
  )
}
