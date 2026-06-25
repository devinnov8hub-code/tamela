import { requireSupabase } from "./supabase.js";

const LOGO_BUCKET = "hospital-logo";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

/**
 * @typedef {Object} Hospital
 * @property {string} id
 * @property {string} name
 * @property {string | null} [logo_url]
 * @property {string | null} [created_by]
 * @property {string | null} [created_at]
 * @property {string | null} [updated_at]
 */

/**
 * @param {string} mime
 */
function logoExtensionForMime(mime) {
  const normalized = (mime || "").toLowerCase();
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "jpg";
  return null;
}

/**
 * @param {File} file
 */
export function validateHospitalLogoFile(file) {
  if (!file) {
    return "Choose a logo image to upload.";
  }
  if (!ALLOWED_LOGO_TYPES.has((file.type || "").toLowerCase())) {
    return "Logo must be PNG or JPG (max 2MB).";
  }
  if (file.size > MAX_LOGO_BYTES) {
    return "Logo must be 2MB or smaller.";
  }
  if (!logoExtensionForMime(file.type)) {
    return "Unsupported image type.";
  }
  return null;
}

/**
 * @param {string} hospitalId
 */
export async function fetchHospitalById(hospitalId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("hospitals")
    .select("id, name, logo_url, created_by, created_at, updated_at")
    .eq("id", hospitalId)
    .maybeSingle();

  return { hospital: data ? /** @type {Hospital} */ (data) : null, error };
}

/**
 * @param {string} hospitalId
 * @param {{ name?: string, logoUrl?: string | null }} payload
 */
export async function updateHospitalIdentity(hospitalId, payload) {
  const client = requireSupabase();
  /** @type {Record<string, string | null>} */
  const patch = {};

  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      return { hospital: null, error: { message: "Hospital name is required." } };
    }
    patch.name = trimmed;
  }

  if (payload.logoUrl !== undefined) {
    patch.logo_url = payload.logoUrl;
  }

  if (!Object.keys(patch).length) {
    return { hospital: null, error: { message: "No changes to save." } };
  }

  const { data, error } = await client
    .from("hospitals")
    .update(patch)
    .eq("id", hospitalId)
    .select("id, name, logo_url, created_by, created_at, updated_at")
    .single();

  return { hospital: data ? /** @type {Hospital} */ (data) : null, error };
}

/**
 * @param {string} hospitalId
 * @param {File} file
 */
export async function uploadHospitalLogo(hospitalId, file) {
  const validationError = validateHospitalLogoFile(file);
  if (validationError) {
    return { logoUrl: null, error: { message: validationError } };
  }

  const ext = logoExtensionForMime(file.type);
  if (!ext) {
    return { logoUrl: null, error: { message: "Unsupported image type." } };
  }

  const client = requireSupabase();
  const objectPath = `${hospitalId}/logo.${ext}`;

  const { error: uploadError } = await client.storage.from(LOGO_BUCKET).upload(objectPath, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type,
  });

  if (uploadError) {
    return { logoUrl: null, error: uploadError };
  }

  const { data: publicData } = client.storage.from(LOGO_BUCKET).getPublicUrl(objectPath);
  const baseUrl = publicData?.publicUrl?.trim();
  if (!baseUrl) {
    return { logoUrl: null, error: { message: "Could not resolve public logo URL." } };
  }

  const logoUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
  const { hospital, error } = await updateHospitalIdentity(hospitalId, { logoUrl });

  if (error) {
    return { logoUrl: null, error };
  }

  return { logoUrl: hospital?.logo_url ?? logoUrl, error: null };
}
