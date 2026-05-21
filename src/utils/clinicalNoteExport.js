import { escapeHtml, markdownToHtml, markdownToPlainPreview } from "./markdown.js";

const EXPORT_STYLES = `
  .clinical-note-export {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 7pt;
    line-height: 1.55;
    color: #334155;
  }
  .clinical-note-export h2 {
    margin: 0 0 6px;
    font-size: 10pt;
    color: #0f172a;
  }
  .clinical-note-export .case-ref {
    margin: 0 0 16px;
    font-size: 8pt;
    color: #64748b;
  }
  .clinical-note-export h3,
  .clinical-note-export h4 {
    margin: 14px 0 6px;
    font-size: 8pt;
    font-weight: 700;
    color: #0f172a;
  }
  .clinical-note-export p {
    margin: 0 0 10px;
  }
  .clinical-note-export ul {
    margin: 0 0 10px 18px;
    padding: 0;
  }
  .clinical-note-export li {
    margin-bottom: 4px;
  }
  .clinical-note-export strong,
  .clinical-note-export .md-highlight {
    color: #ea580c;
    font-weight: 600;
  }
  .clinical-note-export .insight-block {
    margin-top: 18px;
    padding: 12px 14px;
    background: #fff7ed;
    border-radius: 8px;
    border: 1px solid #fed7aa;
  }
  .clinical-note-export .insight-block h4 {
    margin-top: 0;
    text-transform: uppercase;
    font-size: 7pt;
    letter-spacing: 0.04em;
    color: #9a3412;
  }
  .clinical-note-export .insight-block p {
    margin: 0 0 6px;
    font-size: 10pt;
  }
`;

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
 * Export rendered HTML preview as PDF (matches on-screen note styling).
 * @param {{ html: string, plainText: string }} noteDocument
 * @param {string} [filename]
 */
export async function downloadClinicalNotePdf(noteDocument, filename = "clinical-note.pdf") {
  if (!noteDocument?.plainText?.trim()) {
    throw new Error("Nothing to export yet.");
  }

  const [jsPDF] = await Promise.all([loadJsPDF(), loadHtml2Canvas()]);
  const host = window.document.createElement("div");
  host.innerHTML = noteDocument.html;
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;background:#fff;pointer-events:none;";
  window.document.body.appendChild(host);

  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const article = host.querySelector(".clinical-note-export") || host;

  try {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("PDF export timed out."));
      }, 60000);

      doc.html(article, {
        callback: (pdf) => {
          window.clearTimeout(timeout);
          pdf.save(safeName);
          resolve();
        },
        margin: [12, 12, 12, 12],
        autoPaging: "text",
        width: 186,
        windowWidth: 794,
        html2canvas: { scale: 0.75, useCORS: true },
      });
    });
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
  const lineHeight = 6;
  const lines = doc.splitTextToSize(text, maxWidth);

  let y = margin;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

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
