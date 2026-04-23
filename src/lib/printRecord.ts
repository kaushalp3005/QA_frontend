import {
  SENSORY_PARAMS,
  LABEL_CHECK_PARAMS,
  getPhysicalParams,
} from "@/lib/constant";

interface Article {
  floor?: string;
  item_description: string;
  customer: string;
  batch_number: string;
  physical_category: string;
  sensory_evaluation: any[];
  physical_parameters: any[];
  label_check: any[];
  seal_check: boolean;
  verdict: string;
  overall_remark: string;
}

interface PrintRecord {
  ipqc_no: string;
  check_date: string;
  factory_code: string;
  floor: string;
  articles?: Article[];
  item_description: string;
  customer: string;
  batch_number: string;
  physical_category: string;
  sensory_evaluation: any[];
  physical_parameters: any[];
  label_check: any[];
  seal_check: boolean;
  verdict: string;
  overall_remark: string;
  checked_by: string;
  approved_by?:string;
}

function getLabel(params: any[], key: string): string {
  return params.find((p) => p.key === key)?.label || key;
}

function esc(str: any): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function check(val: any): string {
  return val ? "&#10003;" : "";
}

function buildArticleRows(article: any, record: PrintRecord): string {
  const sensory = article.sensory_evaluation || [];
  const physical = article.physical_parameters || [];
  const labels = article.label_check || [];
  const physicalParams = getPhysicalParams(article.physical_category || "other");
  const sealText = article.seal_check ? "OK" : "NOT OK";
  const verdictText = article.verdict === "accept" ? "Accept" : "Reject";

  const checkedSensory = sensory.filter((i: any) => i.checked);
  const checkedPhysical = physical.filter((i: any) => i.checked);
  const checkedLabels = labels.filter((i: any) => i.checked);

  // Pair label checks 2-per-row to reduce height
  const pairedLabels: any[] = [];
  for (let i = 0; i < checkedLabels.length; i += 2) {
    pairedLabels.push([checkedLabels[i], checkedLabels[i + 1] || null]);
  }

  const maxRows = Math.max(checkedSensory.length, checkedPhysical.length, pairedLabels.length, 1);
  let rows = "";
  for (let r = 0; r < maxRows; r++) {
    const s = checkedSensory[r];
    const p = checkedPhysical[r];
    const lPair = pairedLabels[r];
    rows += "<tr>";
    if (r === 0) {
      rows += `<td class="mc" rowspan="${maxRows}">${esc(article.item_description)}</td>`;
      rows += `<td class="mc" rowspan="${maxRows}">${esc(article.customer)}</td>`;
      rows += `<td class="mc" rowspan="${maxRows}">${esc(article.batch_number)}</td>`;
    }
    if (s) {
      let sLabel = getLabel(SENSORY_PARAMS, s.parameter);
      let sRemark = s.remark || "";
      if (s.parameter === "other" && sRemark) {
        const idx = sRemark.indexOf(": ");
        sLabel = idx > -1 ? sRemark.slice(0, idx) : sRemark;
        sRemark = idx > -1 ? sRemark.slice(idx + 2) : "";
      }
      rows += `<td>&#10003; ${esc(sLabel)}${sRemark && sRemark !== "OK" ? "<br>Remark: " + esc(sRemark) : ""}</td>`;
    } else {
      rows += "<td></td>";
    }
    if (p) {
      const pLabel = getLabel(physicalParams, p.parameter) || p.parameter;
      const pRemark = p.remark || "";
      rows += `<td>&#10003; ${esc(pLabel)}${p.value ? ": " + esc(p.value) + "%" : ""}${pRemark && pRemark !== "OK" ? "<br>Remark: " + esc(pRemark) : ""}</td>`;
    } else {
      rows += "<td></td>";
    }
    // Label check: two items per cell with a vertical separator
    if (lPair) {
      const l1 = lPair[0];
      const l2 = lPair[1];
      const formatLabel = (l: any): string => {
        if (!l) return "";
        const lbl = getLabel(LABEL_CHECK_PARAMS, l.parameter);
        const rm = l.remark || "";
        return `&#10003; ${esc(lbl)}${rm && rm !== "OK" ? " <span class='lc-rm'>(" + esc(rm) + ")</span>" : ""}`;
      };
      if (l2) {
        rows += `<td class="lc-pair"><table class="lc-inner"><tr><td>${formatLabel(l1)}</td><td>${formatLabel(l2)}</td></tr></table></td>`;
      } else {
        rows += `<td>${formatLabel(l1)}</td>`;
      }
    } else {
      rows += "<td></td>";
    }
    if (r === 0) {
      rows += `<td class="mc" rowspan="${maxRows}" style="text-align:center;font-weight:bold">${sealText}</td>`;
      rows += `<td class="mc" rowspan="${maxRows}" style="text-align:center;font-weight:bold">${verdictText}</td>`;
      rows += `<td class="mc" rowspan="${maxRows}">${esc(article.overall_remark)}</td>`;
      rows += `<td class="mc" rowspan="${maxRows}">${esc(record.checked_by)}</td>`;
      rows += `<td class="mc" rowspan="${maxRows}">${esc(record.approved_by)}</td>`;
    }
    rows += "</tr>";
  }
  return rows;
}

function buildPageHtml(
  floorName: string,
  floorArticles: Article[],
  record: PrintRecord,
  logoUrl: string,
): string {
  let bodyTableRows = "";
  for (let ai = 0; ai < floorArticles.length; ai++) {
    if (ai > 0) {
      bodyTableRows += '<tr class="art-sep"><td colspan="11"></td></tr>';
    }
    bodyTableRows += buildArticleRows(floorArticles[ai], record);
  }

  return `
  <table class="mt">
    <thead>
      <tr class="hdr-row">
        <td class="logo" rowspan="4"><img src="${logoUrl}" alt="Candor Foods" /></td>
        <td class="co co-name" colspan="7" rowspan="2">CANDOR FOODS PRIVATE LIMITED</td>
        <td class="il" colspan="2">Issue Date:</td>
        <td class="iv">01/11/2017</td>
      </tr>
      <tr class="hdr-row">
        <td class="il" colspan="2">Issue No:</td>
        <td class="iv">03</td>
      </tr>
      <tr class="hdr-row">
        <td class="co co-fmt" colspan="7">Format:&nbsp; In-process quality check record</td>
        <td class="il" colspan="2">Revision Date:</td>
        <td class="iv">01/10/2025</td>
      </tr>
      <tr class="hdr-row">
        <td class="co co-doc" colspan="7">Document No: CFPLA.C6.F.18</td>
        <td class="il" colspan="2">Revision No.:</td>
        <td class="iv">02</td>
      </tr>
      <tr class="info-row">
        <td colspan="11">
          <b>Date:</b> ${esc(record.check_date)} &nbsp;&nbsp;&nbsp;
          <b>Factory:</b> ${esc(record.factory_code)} &nbsp;&nbsp;&nbsp;
          <b>Floor:</b> ${esc(floorName)}
        </td>
      </tr>
      <tr class="col-hdr">
        <th>SKU Name</th>
        <th>Customer</th>
        <th>Batch No.</th>
        <th>Sensory evaluation</th>
        <th>Physical parameter</th>
        <th>Label Check</th>
        <th>Seal Check</th>
        <th>Accept /Reject</th>
        <th>Remarks</th>
        <th>Checked By</th>
        <th>Verified By</th>
      </tr>
    </thead>
    <tfoot>
      <tr class="ft-spacer"><td colspan="11"></td></tr>
    </tfoot>
    <tbody>
      ${bodyTableRows}
    </tbody>
  </table>`;
}

function buildHtml(record: PrintRecord): string {
  const logoUrl = window.location.origin + "/candor-logo.jpg";
  const stampUrl = window.location.origin + "/controlled-copy-stamp.png";

  const allArticles: Article[] = record.articles?.length
    ? record.articles
    : [{
        floor: record.floor,
        item_description: record.item_description,
        customer: record.customer,
        batch_number: record.batch_number,
        physical_category: record.physical_category,
        sensory_evaluation: record.sensory_evaluation,
        physical_parameters: record.physical_parameters,
        label_check: record.label_check,
        seal_check: record.seal_check,
        verdict: record.verdict,
        overall_remark: record.overall_remark,
      }];

  // Group articles by floor, preserving insertion order
  const floorMap = new Map<string, Article[]>();
  for (const a of allArticles) {
    const fl = a.floor || record.floor || "";
    if (!floorMap.has(fl)) floorMap.set(fl, []);
    floorMap.get(fl)!.push(a);
  }

  const floorGroups = Array.from(floorMap.entries());
  const pages = floorGroups.map(([floorName, floorArticles], idx) => {
    const isLast = idx === floorGroups.length - 1;
    return `<div class="print-page" style="page-break-after:${isLast ? "auto" : "always"};break-after:${isLast ? "auto" : "page"};">
      ${buildPageHtml(floorName, floorArticles, record, logoUrl)}
    </div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<title>IPQC - ${esc(record.ipqc_no)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; }

  /* ── per-floor page wrapper ── */
  .print-page { width: 100%; }

  /* ── table per floor ── */
  .mt { width: 100%; border-collapse: collapse; }
  .mt > thead { display: table-header-group; }
  .mt > tfoot { display: table-footer-group; }
  .mt > tbody > tr > td { border: 1pt solid #000; padding: 2pt 4pt; font-size: 8pt; vertical-align: top; text-align: left; }

  /* ── header rows ── */
  .hdr-row > td { border: 1pt solid #000; padding: 3pt 6pt; vertical-align: middle; }
  .logo { width: 100px; text-align: center; padding: 4pt; }
  .logo img { height: 50px; }
  .co { text-align: center; font-weight: bold; }
  .co-name { font-size: 15pt; }
  .co-fmt  { font-size: 12pt; }
  .co-doc  { font-size: 12pt; }
  .il { font-size: 12pt; font-weight: normal; white-space: nowrap; }
  .iv { font-size: 12pt; white-space: nowrap; }
  .info-row > td { border: none; padding: 2pt 6pt; font-size: 10pt; }

  /* ── column header row ── */
  .col-hdr > th { border: 1pt solid #000; padding: 2pt 4pt; font-size: 8pt; background: #f0f0f0; font-weight: bold; text-align: center; }

  /* ── data rows ── */
  .mc { vertical-align: middle; text-align: center; }
  .art-sep td { border-left: none; border-right: none; height: 3pt; background: #000; padding: 0; }

  /* ── label check: two items per cell ── */
  .lc-pair { padding: 0 !important; }
  .lc-inner { width: 100%; border-collapse: collapse; }
  .lc-inner td { padding: 2pt 4pt; vertical-align: top; width: 50%; font-size: 8pt; }
  .lc-inner td + td { border-left: 1pt solid #000; }
  .lc-rm { font-size: 7pt; color: #444; }

  /* ── spacer in tfoot reserves footer space on every page ── */
  .ft-spacer td { height: 50px; border: none !important; padding: 0 !important; }

  /* ── footer: fixed to bottom of every printed page ── */
  .page-footer { position: fixed; bottom: 0; left: 0; width: 100%; display: flex; justify-content: space-between; align-items: flex-end; padding: 4pt 8pt; }
  .ft-text { font-family: Cambria, serif; font-size: 12pt; font-weight: bold; }
  img.cc-stamp { height: 40px; }
</style>
</head>
<body>

${pages}

<!-- ═══ FOOTER: pinned to the bottom of every printed page ═══ -->
<div class="page-footer">
  <span class="ft-text">Prepared By:FST</span>
  <img class="cc-stamp" src="${stampUrl}" alt="CONTROLLED COPY" />
  <span class="ft-text">Approved By:FSTL</span>
</div>

</body>
</html>`;
}

export function printRecord(record: PrintRecord): void {
  const html = buildHtml(record);

  // Use a hidden iframe to trigger print dialog directly (no preview page)
  let iframe = document.getElementById("__print_iframe") as HTMLIFrameElement | null;
  if (iframe) iframe.remove();
  iframe = document.createElement("iframe");
  iframe.id = "__print_iframe";
  iframe.style.cssText = "position:fixed;width:0;height:0;border:none;left:-9999px;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    if (iframe.contentWindow) {
      iframe.contentWindow.onload = function () {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        iframe.contentWindow!.onafterprint = function () { iframe?.remove(); };
      };
    }
  }
}

export async function downloadRecord(record: PrintRecord): Promise<void> {
  const html = buildHtml(record);

  // Render in a hidden container so html2pdf can capture it
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:1123px;"; // A4 landscape width in px
  const bodyStart = html.indexOf("<body");
  const bodyTagEnd = html.indexOf(">", bodyStart) + 1;
  const bodyEnd = html.indexOf("</body>");
  container.innerHTML = html.slice(bodyTagEnd, bodyEnd);

  // Inject the print styles inline so html2pdf sees them
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  if (styleMatch) {
    const style = document.createElement("style");
    style.textContent = styleMatch[1];
    container.prepend(style);
  }

  document.body.appendChild(container);

  const html2pdf = (await import("html2pdf.js")).default;
  await html2pdf()
    .set({
      margin: [8, 8, 8, 8],
      filename: `IPQC-${record.ipqc_no}.pdf`,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    })
    .from(container)
    .save();

  container.remove();
}
