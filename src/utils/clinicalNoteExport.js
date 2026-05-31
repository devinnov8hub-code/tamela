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
 * @param {string} value
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

/**
 * Copy HTML to the clipboard so paste targets (Word, email, etc.) keep formatting.
 * @param {string} html
 * @param {string} [plainText]
 */
export async function copyRichTextToClipboard(html, plainText) {
  const htmlContent = html?.trim();
  const plain = (plainText ?? htmlToPlainText(htmlContent)).trim();

  if (!htmlContent && !plain) {
    throw new Error("Nothing to copy yet.");
  }

  const wrappedHtml = htmlContent.startsWith("<")
    ? htmlContent
    : `<div>${escapeHtml(htmlContent)}</div>`;

  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    try {
      const htmlBlob = new Blob([wrappedHtml], { type: "text/html" });
      const textBlob = new Blob([plain], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": htmlBlob,
          "text/plain": textBlob,
        }),
      ]);
      return;
    } catch {
      // Fall through to selection-based copy.
    }
  }

  copyRichTextWithSelection(wrappedHtml);
}

/**
 * @param {string} html
 */
function copyRichTextWithSelection(html) {
  const container = document.createElement("div");
  container.innerHTML = html;
  container.setAttribute("contenteditable", "true");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const ok = document.execCommand("copy");
  selection?.removeAllRanges();
  document.body.removeChild(container);

  if (!ok) {
    throw new Error("Could not copy to clipboard.");
  }
}

/**
 * @returns {Promise<(options: object) => { from: (el: HTMLElement) => { save: () => Promise<void> } }>}
 */
async function loadHtml2Pdf() {
  if (typeof window === "undefined") {
    throw new Error("PDF export is only available in the browser.");
  }

  if (window.html2pdf) {
    return window.html2pdf;
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-tamela-html2pdf="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.html2pdf));
      existing.addEventListener("error", () => reject(new Error("Could not load PDF library.")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js";
    script.async = true;
    script.dataset.tamelaHtml2pdf = "1";
    script.onload = () => {
      if (window.html2pdf) {
        resolve(window.html2pdf);
      } else {
        reject(new Error("PDF library loaded but is unavailable."));
      }
    };
    script.onerror = () => reject(new Error("Could not load PDF library. Check your network."));
    document.head.appendChild(script);
  });
}

const PDF_NOTE_STYLES = `
  .tamela-pdf-note {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1e293b;
  }
  .tamela-pdf-note h2 {
    font-size: 18pt;
    font-weight: 700;
    margin: 0 0 8px;
    color: #0f172a;
  }
  .tamela-pdf-note h3,
  .tamela-pdf-note h4 {
    font-size: 13pt;
    font-weight: 700;
    margin: 16px 0 6px;
    color: #0f172a;
  }
  .tamela-pdf-note h4 {
    font-size: 12pt;
  }
  .tamela-pdf-note p {
    margin: 0 0 8px;
  }
  .tamela-pdf-note ul,
  .tamela-pdf-note ol {
    margin: 0 0 10px 20px;
    padding: 0;
  }
  .tamela-pdf-note li {
    margin-bottom: 4px;
  }
  .tamela-pdf-note strong,
  .tamela-pdf-note b {
    font-weight: 700;
  }
  .tamela-pdf-note em,
  .tamela-pdf-note i {
    font-style: italic;
  }
  .tamela-pdf-note u {
    text-decoration: underline;
  }
  .tamela-pdf-note .transcript-highlight {
    font-weight: 600;
    color: #1d4ed8;
  }
`;

/**
 * @param {string} html
 * @returns {HTMLDivElement}
 */
function buildPdfRenderContainer(html) {
  const wrapper = document.createElement("div");
  wrapper.className = "tamela-pdf-note";
  wrapper.style.width = "180mm";
  wrapper.style.boxSizing = "border-box";
  wrapper.innerHTML = html.startsWith("<") ? html : `<p>${escapeHtml(html)}</p>`;

  const root = document.createElement("div");
  const style = document.createElement("style");
  style.textContent = PDF_NOTE_STYLES;
  root.appendChild(style);
  root.appendChild(wrapper);
  return root;
}

/**
 * Export formatted HTML as PDF (preserves bold, lists, headings, etc.).
 * @param {string} html
 * @param {string} [filename]
 * @param {string} [plainFallback]
 */
export async function downloadHtmlAsPdf(html, filename = "clinical-note.pdf", plainFallback) {
  const htmlContent = html?.trim();
  if (!htmlContent) {
    if (plainFallback?.trim()) {
      return downloadTextAsPdf(plainFallback, filename);
    }
    throw new Error("Nothing to export yet.");
  }

  const html2pdf = await loadHtml2Pdf();
  const container = buildPdfRenderContainer(htmlContent);
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  document.body.appendChild(container);

  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

  try {
    await html2pdf()
      .set({
        margin: [14, 14, 14, 14],
        filename: safeName,
        pagebreak: { mode: ["css", "legacy"] },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Plain-text PDF export (fallback when HTML is unavailable).
 * @param {string} text
 * @param {string} [filename]
 */
export async function downloadTextAsPdf(text, filename = "clinical-note.pdf") {
  if (!text?.trim()) {
    throw new Error("Nothing to export yet.");
  }

  const jsPDF = await loadJsPDF();
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

  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(safeName);
}

/**
 * @param {string} html
 */
export function htmlToPlainText(html) {
  if (!html?.trim()) return "";

  if (typeof document !== "undefined") {
    const container = document.createElement("div");
    container.innerHTML = html;
    return (container.textContent || container.innerText || "").replace(/\u00a0/g, " ").trim();
  }

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .trim();
}

/**
 * @param {{
 *   title?: string,
 *   caseRef?: string,
 *   transcript?: string,
 *   error?: string,
 *   includeTranscript?: boolean,
 *   sections?: Array<{ title: string, items: string[] }>,
 *   blocks?: Array<{ heading: string, body: string }>,
 * }} parts
 */
export function buildClinicalNotePlainText(parts) {
  const lines = [parts.title || "Clinical Consultation Note"];

  if (parts.caseRef) {
    lines.push(parts.caseRef);
  }

  lines.push("");

  if (parts.error?.trim()) {
    lines.push("Report Error", parts.error.trim());
    return lines.join("\n");
  }

  const blocks = parts.blocks ?? [];
  if (blocks.length) {
    for (const block of blocks) {
      if (block.heading?.trim()) {
        lines.push(block.heading.trim());
      }
      const body = htmlToPlainText(block.body);
      if (body) lines.push(body);
      lines.push("");
    }
  } else if (parts.transcript?.trim()) {
    lines.push(parts.transcript.trim());
    lines.push("");
  } else {
    lines.push("(No report content available)");
    lines.push("");
  }

  for (const section of parts.sections ?? []) {
    lines.push(section.title);
    for (const item of section.items) {
      lines.push(`• ${item}`);
    }
    lines.push("");
  }

  if (parts.includeTranscript && parts.transcript?.trim()) {
    lines.push("Source Transcript", parts.transcript.trim());
  }

  return lines.join("\n").trim();
}

/**
 * @param {{
 *   title?: string,
 *   caseRef?: string,
 *   transcript?: string,
 *   error?: string,
 *   includeTranscript?: boolean,
 *   sections?: Array<{ title: string, items: string[] }>,
 *   blocks?: Array<{ heading: string, body: string }>,
 * }} parts
 */
export function buildClinicalNoteHtml(parts) {
  const chunks = [];

  chunks.push(`<h2>${escapeHtml(parts.title || "Clinical Consultation Note")}</h2>`);

  if (parts.caseRef) {
    chunks.push(`<p>${escapeHtml(parts.caseRef)}</p>`);
  }

  if (parts.error?.trim()) {
    chunks.push(`<h3>${escapeHtml("Report Error")}</h3>`);
    chunks.push(`<p>${escapeHtml(parts.error.trim())}</p>`);
    return chunks.join("");
  }

  const blocks = parts.blocks ?? [];
  if (blocks.length) {
    for (const block of blocks) {
      if (block.heading?.trim()) {
        chunks.push(`<h3>${escapeHtml(block.heading.trim())}</h3>`);
      }
      const body = block.body?.trim();
      if (body) {
        chunks.push(`<div>${body}</div>`);
      }
    }
  } else if (parts.transcript?.trim()) {
    chunks.push(`<p>${escapeHtml(parts.transcript.trim()).replace(/\n/g, "<br>")}</p>`);
  } else {
    chunks.push(`<p>${escapeHtml("(No report content available)")}</p>`);
  }

  for (const section of parts.sections ?? []) {
    chunks.push(`<h3>${escapeHtml(section.title)}</h3>`);
    chunks.push("<ul>");
    for (const item of section.items) {
      chunks.push(`<li>${escapeHtml(item)}</li>`);
    }
    chunks.push("</ul>");
  }

  if (parts.includeTranscript && parts.transcript?.trim()) {
    chunks.push(`<h3>${escapeHtml("Source Transcript")}</h3>`);
    chunks.push(`<p>${escapeHtml(parts.transcript.trim()).replace(/\n/g, "<br>")}</p>`);
  }

  return chunks.join("");
}
