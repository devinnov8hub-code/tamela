/**
 * @param {string | null | undefined} iso
 * @param {"all" | "today" | "7d"} dateFilter
 */
export function matchesDateFilter(iso, dateFilter) {
  if (!dateFilter || dateFilter === "all") return true;
  if (!iso) return false;

  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return false;

  const now = new Date();

  if (dateFilter === "today") {
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate()
    );
  }

  if (dateFilter === "7d") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return created >= start;
  }

  return true;
}

/**
 * UI status from mapReportStatusUi: completed | processing | pending (draft).
 * @param {string} status
 * @param {"all" | "needs_review" | "processing" | "completed"} statusFilter
 */
export function matchesStatusFilter(status, statusFilter) {
  if (!statusFilter || statusFilter === "all") return true;
  if (statusFilter === "needs_review") {
    return status !== "completed" && status !== "processing";
  }
  return status === statusFilter;
}
