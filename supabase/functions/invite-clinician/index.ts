/**
 * Admin-only: create a clinician auth user + profile for the caller's hospital.
 *
 * Deploy (from repo root, with Supabase CLI linked to your project):
 *   supabase functions deploy invite-clinician
 *
 * Secrets are provided automatically: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InviteBody = {
  email?: string;
  password?: string;
  role?: string;
  firstname?: string;
  lastname?: string;
  hospital_id?: string;
  created_by?: string;
  title?: string | null;
  department_id?: string | null;
  specialty_id?: string | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing authorization" }, 401);
  }

  let body: InviteBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const firstname = body.firstname?.trim();
  const lastname = body.lastname?.trim();
  const hospitalId = body.hospital_id;
  const createdBy = body.created_by;
  const role = (body.role ?? "CLINICIAN").toUpperCase();

  if (!email || !password || !firstname || !lastname || !hospitalId || !createdBy) {
    return jsonResponse({ error: "Missing required fields" }, 400);
  }

  if (role !== "CLINICIAN") {
    return jsonResponse({ error: "Only clinician accounts can be created here" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await userClient.auth.getUser();

  if (callerError || !caller) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (caller.id !== createdBy) {
    return jsonResponse({ error: "Invalid created_by" }, 403);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: adminProfile, error: adminProfileError } = await admin
    .from("profiles")
    .select("role, hospital_id, status")
    .eq("id", caller.id)
    .maybeSingle();

  if (adminProfileError || !adminProfile) {
    return jsonResponse({ error: "Could not verify administrator" }, 403);
  }

  if (adminProfile.role !== "ADMIN" || adminProfile.status !== "ACTIVE") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  if (adminProfile.hospital_id !== hospitalId) {
    return jsonResponse({ error: "Hospital mismatch" }, 403);
  }

  const departmentId = body.department_id || null;
  const specialtyId = body.specialty_id || null;

  if (departmentId) {
    const { data: department, error: deptError } = await admin
      .from("departments")
      .select("id")
      .eq("id", departmentId)
      .eq("hospital_id", hospitalId)
      .maybeSingle();

    if (deptError || !department) {
      return jsonResponse({ error: "Invalid department for this hospital" }, 400);
    }
  }

  if (specialtyId) {
    const { data: specialty, error: specError } = await admin
      .from("specialties")
      .select("id")
      .eq("id", specialtyId)
      .eq("hospital_id", hospitalId)
      .maybeSingle();

    if (specError || !specialty) {
      return jsonResponse({ error: "Invalid specialty for this hospital" }, 400);
    }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "CLINICIAN",
      hospital_id: hospitalId,
      firstname,
      lastname,
      title: body.title ?? null,
      department_id: departmentId,
      specialty_id: specialtyId,
      created_by: createdBy,
    },
  });

  if (createError) {
    return jsonResponse({ error: createError.message }, 400);
  }

  const userId = created.user?.id;
  if (!userId) {
    return jsonResponse({ error: "User was not created" }, 500);
  }

  const profilePatch = {
    role: "CLINICIAN",
    hospital_id: hospitalId,
    firstname,
    lastname,
    email,
    title: body.title ?? null,
    department_id: departmentId,
    specialty_id: specialtyId,
    created_by: createdBy,
    updated_by: createdBy,
    status: "ACTIVE",
  };

  // Trigger may create the profile row slightly after createUser returns.
  let profileError: { message: string } | null = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data: updated, error } = await admin
      .from("profiles")
      .update(profilePatch)
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (!error && updated) {
      profileError = null;
      break;
    }

    profileError = error;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  if (profileError) {
    const { error: upsertError } = await admin.from("profiles").upsert(
      { id: userId, ...profilePatch },
      { onConflict: "id" }
    );

    if (upsertError) {
      console.error("[invite-clinician] profile upsert failed", upsertError.message);
      return jsonResponse({ error: upsertError.message }, 500);
    }
  }

  return jsonResponse({ ok: true, user_id: userId });
});
