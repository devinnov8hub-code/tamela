/**
 * @typedef {{ label: string, value: string, severity?: string, reason?: string }} CriticalField
 * @typedef {{ title: string, icon: string, rows: { label: string, value: string }[] }} InsightSection
 * @typedef {{ heading: string, html: string }} NoteBlock
 */

const INSIGHT_ICONS = ["stethoscope", "magnifying-glass", "clipboard-list"];
const INSIGHT_TITLES = ["Clinical Impression", "Differential Diagnosis", "Diagnostic Plan"];

/** Design placeholder cards when the API sends no critical_fields. */
export const DEFAULT_INSIGHT_SECTIONS = [
  {
    title: INSIGHT_TITLES[0],
    icon: INSIGHT_ICONS[0],
    rows: [
      { label: "Localized Pain Location", value: "" },
      { label: "Pain Radiation Point", value: "" },
    ],
  },
  {
    title: INSIGHT_TITLES[1],
    icon: INSIGHT_ICONS[1],
    rows: [
      { label: "Vitals", value: "" },
      { label: "Risk Level", value: "" },
    ],
  },
  {
    title: INSIGHT_TITLES[2],
    icon: INSIGHT_ICONS[2],
    rows: [
      { label: "Orders", value: "" },
      { label: "Status", value: "" },
    ],
  },
];

/**
 * @param {InsightSection[]} sections
 * @returns {InsightSection[]}
 */
function cloneInsightSections(sections) {
  return sections.map((section) => ({
    ...section,
    rows: section.rows.map((row) => ({ ...row })),
  }));
}

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
 * @param {InsightSection[]} [fallback]
 * @returns {InsightSection[]}
 */
export function criticalFieldsToInsightSections(fields, fallback = DEFAULT_INSIGHT_SECTIONS) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return cloneInsightSections(fallback);
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
 * Unwrap common API envelopes so template_text / critical_fields are at the top level.
 * @param {unknown} data
 * @returns {Record<string, unknown>}
 */
export function unwrapReportApiPayload(data) {
  if (!data || typeof data !== "object") {
    return {};
  }

  /** @type {Record<string, unknown>} */
  const root = /** @type {Record<string, unknown>} */ (data);

  const hasReportShape = (obj) =>
    typeof obj.template_text === "string" ||
    Array.isArray(obj.critical_fields) ||
    typeof obj.case_title === "string";

  if (hasReportShape(root)) {
    return root;
  }

  const nestedKeys = ["data", "result", "report", "payload", "response", "output"];
  for (const key of nestedKeys) {
    const nested = root[key];
    if (nested && typeof nested === "object" && hasReportShape(/** @type {Record<string, unknown>} */ (nested))) {
      return /** @type {Record<string, unknown>} */ (nested);
    }
  }

  return root;
}

/**
 * @param {Record<string, unknown> | null | undefined} data
 */
export function normalizeReportFromTextResponse(data) {
  const payload = unwrapReportApiPayload(data);
  if (!payload || typeof payload !== "object") {
    return {
      templateText: "",
      criticalFields: [],
      caseTitle: "",
      sessionType: "",
    };
  }

  const criticalFields = Array.isArray(payload.critical_fields)
    ? payload.critical_fields.map((f) => ({
        label: String(f?.label ?? ""),
        value: String(f?.value ?? ""),
        severity: typeof f?.severity === "string" ? f.severity : "",
        reason: typeof f?.reason === "string" ? f.reason : "",
      }))
    : [];

  return {
    templateText: typeof payload.template_text === "string" ? payload.template_text : "",
    criticalFields,
    caseTitle: typeof payload.case_title === "string" ? payload.case_title.trim() : "",
    sessionType: typeof payload.session_type === "string" ? payload.session_type.trim() : "",
  };
}

/**
 * @param {Array<{ heading: string, html: string }>} blocks
 * @param {InsightSection[]} insightSections
 * @param {CriticalField[]} [criticalFields]
 */
export function buildFormattedReportPayload(blocks, insightSections, criticalFields = []) {
  return {
    blocks: blocks.map((block) => ({
      heading: block.heading,
      html: block.html,
    })),
    sections: insightSections,
    criticalFields,
    templateText: blocks
      .map((block) => {
        const body = htmlToPlainTextForExport(block.html);
        return block.heading ? `## ${block.heading}\n${body}` : body;
      })
      .filter(Boolean)
      .join("\n\n"),
  };
}

/**
 * @param {string} html
 */
function htmlToPlainTextForExport(html) {
  if (!html?.trim()) return "";
  if (typeof document !== "undefined") {
    const container = document.createElement("div");
    container.innerHTML = html;
    return (container.textContent || container.innerText || "").replace(/\u00a0/g, " ").trim();
  }
  return html.replace(/<[^>]+>/g, "").trim();
}

/**
 * @param {unknown} formatted
 * @returns {{ blocks: NoteBlock[], insightSections: InsightSection[], criticalFields: CriticalField[] } | null}
 */
export function parseSavedFormattedReport(formatted) {
  if (!formatted || typeof formatted !== "object") {
    return null;
  }

  /** @type {Record<string, unknown>} */
  const raw = /** @type {Record<string, unknown>} */ (formatted);

  if (Array.isArray(raw.blocks) && raw.blocks.length) {
    const blocks = raw.blocks.map((block) => {
      const row = /** @type {Record<string, unknown>} */ (block ?? {});
      return {
        heading: String(row.heading ?? "Section"),
        html: String(row.html ?? row.body ?? ""),
      };
    });

    const insightSections =
      Array.isArray(raw.sections) && raw.sections.length
        ? /** @type {InsightSection[]} */ (raw.sections)
        : criticalFieldsToInsightSections(
            Array.isArray(raw.criticalFields) ? /** @type {CriticalField[]} */ (raw.criticalFields) : []
          );

    const criticalFields = Array.isArray(raw.criticalFields)
      ? /** @type {CriticalField[]} */ (raw.criticalFields)
      : [];

    return { blocks, insightSections, criticalFields };
  }

  if (typeof raw.templateText === "string" && raw.templateText.trim()) {
    const normalized = normalizeReportFromTextResponse({
      template_text: raw.templateText,
      critical_fields: raw.criticalFields ?? [],
      case_title: raw.caseTitle,
      session_type: raw.sessionType,
    });
    return {
      blocks: templateTextToBlocks(normalized.templateText),
      insightSections: criticalFieldsToInsightSections(normalized.criticalFields),
      criticalFields: normalized.criticalFields,
    };
  }

  return null;
}
