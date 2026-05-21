import { escapeHtml, markdownToHtml, markdownToPlainPreview } from "./markdown.js";

/** Screen / clipboard — matches app preview */
const EXPORT_STYLES = `
  .clinical-note-export {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.55;
    color: #334155;
  }
  .clinical-note-export h2 {
    margin: 0 0 6px;
    font-size: 18px;
    color: #0f172a;
  }
  .clinical-note-export .case-ref {
    margin: 0 0 12px;
    font-size: 12px;
    color: #64748b;
  }
  .clinical-note-export h3,
  .clinical-note-export h4 {
    margin: 12px 0 4px;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }
  .clinical-note-export p {
    margin: 0 0 8px;
    font-size: 14px;
  }
  .clinical-note-export ul {
    margin: 0 0 8px 16px;
    padding: 0;
    font-size: 14px;
  }
  .clinical-note-export li {
    margin-bottom: 3px;
  }
  .clinical-note-export strong,
  .clinical-note-export .md-highlight {
    color: #ea580c;
    font-weight: 600;
  }
  .clinical-note-export .insight-block {
    margin-top: 14px;
    padding: 10px 12px;
    background: #fff7ed;
    border-radius: 8px;
    border: 1px solid #fed7aa;
  }
  .clinical-note-export .insight-block h4 {
    margin-top: 0;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.04em;
    color: #9a3412;
  }
  .clinical-note-export .insight-block p {
    margin: 0 0 4px;
    font-size: 12px;
  }
`;

/** PDF only — fixed width + wrap so lines are not clipped on the right */
const PDF_EXPORT_STYLES = `
  .clinical-note-export,
  .clinical-note-export * {
    box-sizing: border-box !important;
    max-width: 100% !important;
  }
  .clinical-note-export {
    width: 100% !important;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 8px !important;
    line-height: 1.35 !important;
    color: #334155;
    overflow-wrap: anywhere !important;
    word-wrap: break-word !important;
    word-break: break-word !important;
  }
  .clinical-note-export h2 {
    margin: 0 0 3px !important;
    font-size: 11px !important;
    line-height: 1.25 !important;
    color: #0f172a;
  }
  .clinical-note-export .case-ref {
    margin: 0 0 6px !important;
    font-size: 7px !important;
    color: #64748b;
  }
  .clinical-note-export h3,
  .clinical-note-export h4 {
    margin: 6px 0 2px !important;
    font-size: 9px !important;
    font-weight: 700;
    color: #0f172a;
  }
  .clinical-note-export p,
  .clinical-note-export li {
    font-size: 8px !important;
    margin: 0 0 4px !important;
    line-height: 1.35 !important;
  }
  .clinical-note-export ul {
    margin: 0 0 5px 10px !important;
    padding: 0;
  }
  .clinical-note-export strong,
  .clinical-note-export .md-highlight {
    color: #ea580c;
    font-weight: 600;
  }
  .clinical-note-export .insight-block {
    margin-top: 8px !important;
    padding: 5px 6px !important;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    width: 100% !important;
  }
  .clinical-note-export .insight-block h4 {
    font-size: 7px !important;
    color: #9a3412;
  }
  .clinical-note-export .insight-block p {
    font-size: 7px !important;
  }
`;

/** ~A4 printable width at 96dpi (210mm − margins) */
const PDF_RENDER_WIDTH_PX = 494;
const PDF_PAGE_MARGIN_MM = 10;

/**
 * @param {{
 *   title?: string,
 *   caseRef?: string,
 *   transcript?: string,
 *   error?: string,
 *   sections?: Array<{ title: string, items: string[] }>,
 * }} parts
 * @returns {{ html: string, plainText: string }}
 */
export function buildClinicalNoteDocument(parts) {
  const title = parts.title || "Clinical Consultation Note";
  const caseRef = parts.caseRef || "";

  let bodyHtml = "";
  let bodyPlain = "";

  if (parts.error?.trim()) {
    bodyHtml = `<p>${escapeHtml(parts.error.trim())}</p>`;
    bodyPlain = parts.error.trim();
  } else if (parts.transcript?.trim()) {
    bodyHtml = markdownToHtml(parts.transcript);
    bodyPlain = markdownToPlainPreview(parts.transcript);
  } else {
    bodyHtml = "<p>(No clinical note available)</p>";
    bodyPlain = "(No clinical note available)";
  }

  const insightHtml = (parts.sections ?? [])
    .filter((section) => section.items?.length)
    .map(
      (section) => `
        <section class="insight-block">
          <h4>${escapeHtml(section.title)}</h4>
          ${section.items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </section>`
    )
    .join("");

  const insightPlain = (parts.sections ?? [])
    .filter((section) => section.items?.length)
    .flatMap((section) => [
      "",
      section.title.toUpperCase(),
      ...section.items.map((item) => `• ${item}`),
    ])
    .join("\n");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${EXPORT_STYLES}</style></head><body>
    <article class="clinical-note-export">
      <h2>${escapeHtml(title)}</h2>
      ${caseRef ? `<p class="case-ref">${escapeHtml(caseRef)}</p>` : ""}
      <div class="note-body">${bodyHtml}</div>
      ${insightHtml ? `<aside class="insights">${insightHtml}</aside>` : ""}
    </article>
  </body></html>`;

  const plainLines = [title];
  if (caseRef) plainLines.push(caseRef);
  plainLines.push("", bodyPlain);
  if (insightPlain) plainLines.push(insightPlain);

  return {
    html,
    plainText: plainLines.join("\n").trim(),
  };
}

/** @deprecated Use buildClinicalNoteDocument — plain text only */
export function buildClinicalNotePlainText(parts) {
  return buildClinicalNoteDocument(parts).plainText;
}

/**
 * Copy rendered preview (HTML + plain text) to clipboard.
 * @param {{ html: string, plainText: string }} noteDocument
 */
export async function copyClinicalNotePreview(noteDocument) {
  if (!noteDocument?.plainText?.trim()) {
    throw new Error("Nothing to copy yet.");
  }

  const html = noteDocument.html;
  const plain = noteDocument.plainText;

  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    try {
      const blobHtml = new Blob([html], { type: "text/html" });
      const blobText = new Blob([plain], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
        }),
      ]);
      return;
    } catch {
      /* fall through */
    }
  }

  await copyTextToClipboard(plain);
}

/**
 * @param {string} text
 */
export async function copyTextToClipboard(text) {
  if (!text?.trim()) {
    throw new Error("Nothing to copy yet.");
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!ok) {
    throw new Error("Could not copy to clipboard.");
  }
}

/** @returns {Promise<typeof import('html2canvas')>} */
async function loadHtml2Canvas() {
  if (typeof window === "undefined") {
    throw new Error("PDF export is only available in the browser.");
  }
  if (window.html2canvas) {
    return window.html2canvas;
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-tamela-html2canvas="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.html2canvas));
      existing.addEventListener("error", () => reject(new Error("Could not load html2canvas.")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    script.async = true;
    script.dataset.tamelaHtml2canvas = "1";
    script.onload = () => {
      if (window.html2canvas) {
        resolve(window.html2canvas);
      } else {
        reject(new Error("html2canvas loaded but is unavailable."));
      }
    };
    script.onerror = () => reject(new Error("Could not load html2canvas."));
    document.head.appendChild(script);
  });
}

/** @returns {Promise<typeof import('jspdf').jsPDF>} */
async function loadJsPDF() {
  if (typeof window === "undefined") {
    throw new Error("PDF export is only available in the browser.");
  }

  if (window.jspdf?.jsPDF) {
    return window.jspdf.jsPDF;
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-tamela-jspdf="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.jspdf.jsPDF));
      existing.addEventListener("error", () => reject(new Error("Could not load PDF library.")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";
    script.async = true;
    script.dataset.tamelaJspdf = "1";
    script.onload = () => {
      if (window.jspdf?.jsPDF) {
        resolve(window.jspdf.jsPDF);
      } else {
        reject(new Error("PDF library loaded but is unavailable."));
      }
    };
    script.onerror = () => reject(new Error("Could not load PDF library. Check your network."));
    document.head.appendChild(script);
  });
}

/**
 * HTML tuned for PDF (smaller type, fixed width, word wrap).
 * @param {{ html: string, plainText: string }} noteDocument
 */
function buildPdfRenderHtml(noteDocument) {
  const styleBlock = `<style>${PDF_EXPORT_STYLES}</style>`;
  if (noteDocument.html.includes("<style>")) {
    return noteDocument.html.replace(/<style>[\s\S]*?<\/style>/, styleBlock);
  }
  return noteDocument.html.replace("<head>", `<head>${styleBlock}`);
}

/**
 * @param {HTMLElement} article
 * @param {number} widthPx
 */
async function renderNoteToCanvas(article, widthPx) {
  const html2canvas = await loadHtml2Canvas();

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  return html2canvas(article, {
    scale: 2,
    width: widthPx,
    windowWidth: widthPx,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (_doc, node) => {
      if (node instanceof HTMLElement) {
        node.style.width = `${widthPx}px`;
        node.style.maxWidth = `${widthPx}px`;
        node.style.boxSizing = "border-box";
      }
    },
  });
}

/**
 * Slice a tall canvas across A4 pages (no clipped right edge).
 * @param {import('jspdf').jsPDF} doc
 * @param {HTMLCanvasElement} canvas
 * @param {number} marginMm
 */
function addCanvasToPdfPages(doc, canvas, marginMm) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const printableW = pageWidth - marginMm * 2;
  const printableH = pageHeight - marginMm * 2;

  const imgW = printableW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  let heightLeft = imgH;
  let position = marginMm;

  doc.addImage(imgData, "JPEG", marginMm, position, imgW, imgH);
  heightLeft -= printableH;

  while (heightLeft > 0) {
    position = heightLeft - imgH + marginMm;
    doc.addPage();
    doc.addImage(imgData, "JPEG", marginMm, position, imgW, imgH);
    heightLeft -= printableH;
  }
}

/**
 * Export rendered preview as PDF via html2canvas (reliable layout).
 * @param {{ html: string, plainText: string }} noteDocument
 * @param {string} [filename]
 */
export async function downloadClinicalNotePdf(noteDocument, filename = "clinical-note.pdf") {
  if (!noteDocument?.plainText?.trim()) {
    throw new Error("Nothing to export yet.");
  }

  const [jsPDF] = await Promise.all([loadJsPDF(), loadHtml2Canvas()]);
  const host = window.document.createElement("div");
  host.innerHTML = buildPdfRenderHtml(noteDocument);
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${PDF_RENDER_WIDTH_PX}px;max-width:${PDF_RENDER_WIDTH_PX}px;padding:0;background:#fff;overflow:visible;`;
  window.document.body.appendChild(host);

  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const article = host.querySelector(".clinical-note-export");
  if (!(article instanceof HTMLElement)) {
    window.document.body.removeChild(host);
    throw new Error("Could not prepare note for PDF export.");
  }

  article.style.width = `${PDF_RENDER_WIDTH_PX}px`;
  article.style.maxWidth = `${PDF_RENDER_WIDTH_PX}px`;

  try {
    const canvas = await renderNoteToCanvas(article, PDF_RENDER_WIDTH_PX);
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    addCanvasToPdfPages(doc, canvas, PDF_PAGE_MARGIN_MM);
    doc.save(safeName);
  } catch {
    await downloadPlainTextPdfFallback(noteDocument.plainText, safeName, jsPDF);
  } finally {
    window.document.body.removeChild(host);
  }
}

/**
 * @param {string} text
 * @param {string} filename
 * @param {typeof import('jspdf').jsPDF} jsPDF
 */
async function downloadPlainTextPdfFallback(text, filename, jsPDF) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 4.5;
  const fontSize = 9;
  const lines = doc.splitTextToSize(text, maxWidth);

  let y = margin;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  for (const line of lines) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }

  doc.save(filename);
}

/** @deprecated Use downloadClinicalNotePdf */
export async function downloadTextAsPdf(text, filename = "clinical-note.pdf") {
  return downloadClinicalNotePdf({ html: "", plainText: text }, filename);
}
