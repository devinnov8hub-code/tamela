/**
 * @typedef {{ label: string, value: string, severity?: string, reason?: string }} CriticalField
 * @typedef {{ title: string, icon: string, rows: { label: string, value: string }[] }} InsightSection
 * @typedef {{ heading: string, html: string }} NoteBlock
 */

const INSIGHT_ICONS = ["stethoscope", "magnifying-glass", "clipboard-list"];
const INSIGHT_TITLES = ["Clinical Impression", "Differential Diagnosis", "Diagnostic Plan"];

/**
 * @param {CriticalField} field
 */
function formatCriticalValue(field) {
  const value = field.value?.trim() || "—";
  if (field.reason?.trim()) {
    return `${value} — ${field.reason.trim()}`;
  }
  return value;
}

/**
 * @param {CriticalField[]} fields
 * @param {InsightSection[]} fallback
 * @returns {InsightSection[]}
 */
export function criticalFieldsToInsightSections(fields, fallback) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return fallback;
  }

  if (fields.length <= 2) {
    return [
      {
        title: INSIGHT_TITLES[0],
        icon: INSIGHT_ICONS[0],
        rows: fields.map((f) => ({ label: f.label, value: formatCriticalValue(f) })),
      },
    ];
  }

  const perCard = Math.ceil(fields.length / 3);
  return INSIGHT_TITLES.map((title, index) => ({
    title,
    icon: INSIGHT_ICONS[index],
    rows: fields
      .slice(index * perCard, (index + 1) * perCard)
      .map((f) => ({ label: f.label, value: formatCriticalValue(f) })),
  })).filter((section) => section.rows.length > 0);
}

/**
 * @param {string} fragment
 */
function markdownFragmentToHtml(fragment) {
  if (!fragment?.trim()) return "";

  const lines = fragment.trim().split("\n");
  const parts = [];
  let listOpen = false;

  for (const line of lines) {
    const bullet = line.match(/^-\s+(.+)$/);
    if (bullet) {
      if (!listOpen) {
        parts.push('<ul class="transcript-list">');
        listOpen = true;
      }
      parts.push(`<li>${inlineMarkdownToHtml(bullet[1])}</li>`);
      continue;
    }

    if (listOpen) {
      parts.push("</ul>");
      listOpen = false;
    }

    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      parts.push(`<p>${inlineMarkdownToHtml(numbered[1])}</p>`);
      continue;
    }

    if (line.trim()) {
      parts.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
    }
  }

  if (listOpen) parts.push("</ul>");
  return parts.join("");
}

/**
 * @param {string} text
 */
function inlineMarkdownToHtml(text) {
  return String(text)
    .replace(/\*\*([^*]+)\*\*/g, '<span class="transcript-highlight">$1</span>')
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

/**
 * @param {string} templateText
 * @returns {NoteBlock[]}
 */
export function templateTextToBlocks(templateText) {
  const raw = (templateText || "").trim();
  if (!raw) return [];

  const chunks = raw.split(/\n(?=##\s)/).filter(Boolean);
  if (chunks.length === 0) {
    return [{ heading: "Clinical Consultation Note", html: markdownFragmentToHtml(raw) }];
  }

  return chunks.map((chunk) => {
    const lines = chunk.trim().split("\n");
    const first = lines[0] ?? "";
    const headingMatch = first.match(/^#{2,3}\s*\*?\*?(.+?)\*?\*?:?\s*$/);
    const heading = headingMatch
      ? headingMatch[1].replace(/\*\*/g, "").trim()
      : "Clinical Consultation Note";
    const bodyStart = headingMatch ? 1 : 0;
    const body = lines.slice(bodyStart).join("\n").trim();
    return {
      heading,
      html: markdownFragmentToHtml(body) || "<p>—</p>",
    };
  });
}

/**
 * @param {Record<string, unknown> | null | undefined} data
 */
export function normalizeReportFromTextResponse(data) {
  if (!data || typeof data !== "object") {
    return {
      templateText: "",
      criticalFields: [],
      caseTitle: "",
      sessionType: "",
    };
  }

  const criticalFields = Array.isArray(data.critical_fields)
    ? data.critical_fields.map((f) => ({
        label: String(f?.label ?? ""),
        value: String(f?.value ?? ""),
        severity: typeof f?.severity === "string" ? f.severity : "",
        reason: typeof f?.reason === "string" ? f.reason : "",
      }))
    : [];

  return {
    templateText: typeof data.template_text === "string" ? data.template_text : "",
    criticalFields,
    caseTitle: typeof data.case_title === "string" ? data.case_title.trim() : "",
    sessionType: typeof data.session_type === "string" ? data.session_type.trim() : "",
  };
}
