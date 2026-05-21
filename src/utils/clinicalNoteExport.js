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
 * @param {{
 *   title?: string,
 *   caseRef?: string,
 *   transcript?: string,
 *   error?: string,
 *   sections?: Array<{ title: string, items: string[] }>,
 * }} parts
 */
export function buildClinicalNotePlainText(parts) {
  const lines = [parts.title || "Clinical Consultation Note"];

  if (parts.caseRef) {
    lines.push(parts.caseRef);
  }

  lines.push("");

  if (parts.error?.trim()) {
    lines.push("Transcription Error", parts.error.trim());
  } else if (parts.transcript?.trim()) {
    lines.push(parts.transcript.trim());
  } else {
    lines.push("(No clinical note available)");
  }

  for (const section of parts.sections ?? []) {
    lines.push("", section.title);
    for (const item of section.items) {
      lines.push(`• ${item}`);
    }
  }

  return lines.join("\n");
}
