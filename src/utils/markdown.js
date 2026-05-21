/**
 * Escape HTML entities before injecting into v-html.
 * @param {string} text
 */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Minimal markdown → HTML for clinical notes (headings, bold, lists, paragraphs).
 * @param {string} markdown
 */
export function markdownToHtml(markdown) {
  const source = (markdown || "").trim();
  if (!source) return "";

  const lines = source.split(/\r?\n/);
  const parts = [];
  let listOpen = false;

  function closeList() {
    if (listOpen) {
      parts.push("</ul>");
      listOpen = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    const h4 = trimmed.match(/^####\s+(.+)$/);
    const h3 = trimmed.match(/^###\s+(.+)$/);
    const h2 = trimmed.match(/^##\s+(.+)$/);
    const h1 = trimmed.match(/^#\s+(.+)$/);
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);

    if (h4) {
      closeList();
      parts.push(`<h4>${inlineMarkdown(h4[1])}</h4>`);
      continue;
    }
    if (h3) {
      closeList();
      parts.push(`<h4>${inlineMarkdown(h3[1])}</h4>`);
      continue;
    }
    if (h2) {
      closeList();
      parts.push(`<h3>${inlineMarkdown(h2[1])}</h3>`);
      continue;
    }
    if (h1) {
      closeList();
      parts.push(`<h2>${inlineMarkdown(h1[1])}</h2>`);
      continue;
    }
    if (bullet) {
      if (!listOpen) {
        parts.push("<ul>");
        listOpen = true;
      }
      parts.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      continue;
    }

    closeList();
    parts.push(`<p>${inlineMarkdown(trimmed)}</p>`);
  }

  closeList();
  return parts.join("");
}

/**
 * @param {string} text
 */
function inlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong class=\"md-highlight\">$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");
  return html;
}

/**
 * Readable plain text matching the on-screen preview (no markdown syntax).
 * @param {string} markdown
 */
export function markdownToPlainPreview(markdown) {
  const source = (markdown || "").trim();
  if (!source) return "";

  const lines = source.split(/\r?\n/);
  const out = [];
  let listOpen = false;

  function closeList() {
    listOpen = false;
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      closeList();
      out.push("");
      continue;
    }

    const heading = trimmed.match(/^#{1,4}\s+(.+)$/);
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);

    if (heading) {
      closeList();
      out.push(stripInlineMarkdown(heading[1]));
      continue;
    }
    if (bullet) {
      out.push(`• ${stripInlineMarkdown(bullet[1])}`);
      listOpen = true;
      continue;
    }

    closeList();
    out.push(stripInlineMarkdown(trimmed));
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * @param {string} text
 */
function stripInlineMarkdown(text) {
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}
