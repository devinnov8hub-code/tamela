/**
 * @param {{ firstname?: string | null, lastname?: string | null, email?: string | null } | null | undefined} profile
 * @param {string} [fallback]
 */
export function profileDisplayName(profile, fallback = "User") {
  if (!profile) return fallback;

  const parts = [profile.firstname, profile.lastname]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);

  if (parts.length) return parts.join(" ");

  if (profile.email?.includes("@")) {
    return profile.email.split("@")[0];
  }

  return fallback;
}

/**
 * Hospital display name from joined `hospitals` row.
 * @param {{ hospitals?: { name?: string | null } | null } | null | undefined} profile
 */
export function profileHospitalName(profile) {
  const name = profile?.hospitals?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/**
 * @param {{ hospitals?: { logo_url?: string | null } | null } | null | undefined} profile
 */
export function profileHospitalLogoUrl(profile) {
  const url = profile?.hospitals?.logo_url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}
