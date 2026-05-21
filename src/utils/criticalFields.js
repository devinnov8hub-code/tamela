/**
 * @typedef {Object} CriticalField
 * @property {string} label
 * @property {string} value
 * @property {string} [severity]
 * @property {string} [reason]
 */

/**
 * @typedef {{ title: string, items: string[] }} InsightSection
 */

const SECTION_RULES = [
  {
    title: "Clinical Impression",
    match: /impression|pain|location|radiation|condition|certainty|murphy/i,
  },
  {
    title: "Differential Diagnosis",
    match: /differential|vitals|risk|diagnosis/i,
  },
  {
    title: "Diagnostic Plan",
    match: /plan|order|diagnostic|status|ultrasound|cbc|lft/i,
  },
];

/**
 * @param {unknown} raw
 * @returns {CriticalField[]}
 */
export function normalizeCriticalFields(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        label: String(item.label ?? "").trim(),
        value: String(item.value ?? "").trim(),
        severity: item.severity ? String(item.severity) : "",
        reason: item.reason ? String(item.reason) : "",
      }))
      .filter((item) => item.label || item.value);
  }

  if (typeof raw === "object" && Array.isArray(raw.critical_fields)) {
    return normalizeCriticalFields(raw.critical_fields);
  }

  return [];
}

/**
 * @param {CriticalField} field
 */
function fieldToLine(field) {
  const label = field.label || "Field";
  const value = field.value || "—";
  if (field.reason?.trim()) {
    return `${label}: ${value} (${field.reason.trim()})`;
  }
  return `${label}: ${value}`;
}

/**
 * Group flat API critical fields into sidebar cards (matches design mock).
 * @param {CriticalField[]} fields
 * @returns {InsightSection[]}
 */
export function groupCriticalFieldsForDisplay(fields) {
  const list = normalizeCriticalFields(fields);
  if (!list.length) return [];

  const buckets = SECTION_RULES.map((rule) => ({ title: rule.title, items: [] }));
  const overflow = { title: "Additional findings", items: [] };

  for (const field of list) {
    const haystack = `${field.label} ${field.reason || ""}`;
    const rule = SECTION_RULES.find((r) => r.match.test(haystack));
    const line = fieldToLine(field);

    if (rule) {
      const bucket = buckets.find((b) => b.title === rule.title);
      bucket?.items.push(line);
    } else {
      overflow.items.push(line);
    }
  }

  const sections = buckets.filter((b) => b.items.length);
  if (overflow.items.length) sections.push(overflow);
  return sections;
}

/**
 * Read critical fields from a report_transcriptions row (new or legacy JSON).
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {InsightSection[]}
 */
export function insightSectionsFromTranscriptionRow(row) {
  if (!row) return [];

  const direct = normalizeCriticalFields(row.critical_fields);
  if (direct.length) {
    return groupCriticalFieldsForDisplay(direct);
  }

  const formatted = row.formatted_transcription;
  if (!formatted || typeof formatted !== "object") return [];

  if (Array.isArray(formatted)) {
    return formatted
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        title: String(item.title ?? "Section"),
        items: Array.isArray(item.items) ? item.items.map(String) : [String(item.text ?? "")],
      }));
  }

  const fromLegacyFields = normalizeCriticalFields(
    /** @type {{ critical_fields?: unknown }} */ (formatted).critical_fields
  );
  if (fromLegacyFields.length) {
    return groupCriticalFieldsForDisplay(fromLegacyFields);
  }

  if (Array.isArray(formatted.sections)) {
    return formatted.sections
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        title: String(item.title ?? "Section"),
        items: Array.isArray(item.items) ? item.items.map(String) : [],
      }))
      .filter((s) => s.items.length);
  }

  return Object.entries(formatted).map(([title, value]) => ({
    title,
    items: Array.isArray(value) ? value.map(String) : [String(value)],
  }));
}
