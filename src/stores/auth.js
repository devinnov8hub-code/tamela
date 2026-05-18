import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { isAppRole, ROLE_ADMIN, ROLE_CLINICIAN, roleDashboardPath } from "../constants/roles.js";
import { USER_STATUS_SUSPENDED } from "../constants/userStatus.js";
import { logLoginActivity } from "../services/authActivityService.js";
import { fetchProfileByUserId, waitForProfileByUserId } from "../services/profileService.js";
import { isSupabaseConfigured, supabase } from "../services/supabase.js";
import { profileDisplayName, profileHospitalLogoUrl, profileHospitalName } from "../utils/profileDisplay.js";
import { withTimeout } from "../utils/withTimeout.js";

export const UNAUTHORIZED_MESSAGE = "Unauthorized access";

const AUTH_SESSION_TIMEOUT_MS = 8000;
const AUTH_PROFILE_TIMEOUT_MS = 10000;
const AUTH_BOOTSTRAP_TIMEOUT_MS = 15000;

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const profile = ref(null);
  const ready = ref(!isSupabaseConfigured);
  const profileLoading = ref(false);
  const authError = ref("");
  /** Shown on login after invalid session was cleared */
  const sessionExpiredMessage = ref("");

  let bootstrapped = false;
  let bootstrapPromise = null;
  let isBootstrapping = false;

  const role = computed(() => {
    const value = profile.value?.role;
    if (typeof value === "string") {
      const normalized = value.toUpperCase();
      if (isAppRole(normalized)) return normalized;
    }
    return null;
  });

  /** Valid session + profile + role (not just a JWT in localStorage) */
  const isAuthenticated = computed(() => Boolean(user.value && profile.value && role.value));

  const isAdmin = computed(() => role.value === ROLE_ADMIN);
  const isClinician = computed(() => role.value === ROLE_CLINICIAN);
  const dashboardPath = computed(() => roleDashboardPath(role.value));
  const hospitalName = computed(() => profileHospitalName(profile.value));
  const hospitalLogoUrl = computed(() => profileHospitalLogoUrl(profile.value));
  const hospitalId = computed(() => profile.value?.hospital_id ?? null);
  const displayName = computed(() =>
    profileDisplayName(profile.value, isAdmin.value ? "Administrator" : "Clinician")
  );

  function clearAuthState() {
    user.value = null;
    profile.value = null;
  }

  /**
   * @param {import('../services/profileService.js').UserProfile | null} row
   */
  function validateProfileRow(row) {
    if (!row) {
      return "No profile found for this account. Contact your administrator.";
    }

    const normalizedRole = typeof row.role === "string" ? row.role.toUpperCase() : "";
    if (!isAppRole(normalizedRole)) {
      return UNAUTHORIZED_MESSAGE;
    }

    if (row.status === USER_STATUS_SUSPENDED) {
      return "Your account has been suspended. Contact your hospital administrator.";
    }

    if (normalizedRole === ROLE_ADMIN && !row.hospital_id) {
      return "Administrator account is not linked to a hospital.";
    }

    if (normalizedRole === ROLE_CLINICIAN && !row.hospital_id) {
      return "Clinician account is not linked to a hospital.";
    }

    return null;
  }

  /**
   * @param {import('../services/profileService.js').UserProfile} row
   */
  function applyProfileRow(row) {
    const normalizedRole = row.role?.toUpperCase();
    profile.value = {
      ...row,
      role: isAppRole(normalizedRole) ? normalizedRole : row.role,
    };
  }

  /**
   * @returns {Promise<boolean>}
   */
  async function loadProfile(options = {}) {
    const { waitForTrigger = false } = options;

    if (!supabase || !user.value?.id) {
      profile.value = null;
      return false;
    }

    profileLoading.value = true;

    try {
      const { profile: row, error } = waitForTrigger
        ? await waitForProfileByUserId(user.value.id)
        : await fetchProfileByUserId(user.value.id);

      if (error) {
        console.error("[auth] profile fetch failed", error);
        return false;
      }

      const validationError = validateProfileRow(row);
      if (validationError) {
        authError.value = validationError;
        return false;
      }

      applyProfileRow(/** @type {import('../services/profileService.js').UserProfile} */ (row));
      return true;
    } finally {
      profileLoading.value = false;
    }
  }

  /**
   * Clear invalid sessions and local storage token.
   * @param {string} [message]
   */
  async function forceLogout(message = "") {
    clearAuthState();
    authError.value = "";

    if (message) {
      sessionExpiredMessage.value = message;
    }

    if (supabase) {
      try {
        await withTimeout(
          supabase.auth.signOut({ scope: "local" }),
          5000,
          "Sign out timed out"
        );
      } catch (err) {
        console.warn("[auth] signOut failed", err);
      }
    }
  }

  function finishBootstrap() {
    bootstrapped = true;
    ready.value = true;
    isBootstrapping = false;
  }

  /**
   * Validate JWT with Supabase, load profile, or clear stale session.
   */
  async function bootstrapAuth() {
    if (!supabase) {
      finishBootstrap();
      return;
    }

    isBootstrapping = true;

    try {
      await withTimeout(
        (async () => {
          const {
            data: { session },
          } = await withTimeout(
            supabase.auth.getSession(),
            AUTH_SESSION_TIMEOUT_MS,
            "Session check timed out"
          );

          if (!session?.user) {
            clearAuthState();
            return;
          }

          const {
            data: { user: validatedUser },
            error: userError,
          } = await withTimeout(
            supabase.auth.getUser(),
            AUTH_SESSION_TIMEOUT_MS,
            "Session validation timed out"
          );

          if (userError || !validatedUser) {
            console.warn("[auth] getUser failed — clearing stale session", userError?.message);
            await forceLogout("Your session expired or is invalid. Please sign in again.");
            return;
          }

          user.value = validatedUser;

          const profileOk = await withTimeout(
            loadProfile(),
            AUTH_PROFILE_TIMEOUT_MS,
            "Profile load timed out"
          );

          if (!profileOk) {
            await forceLogout(
              authError.value ||
                sessionExpiredMessage.value ||
                "Unable to load your profile. Please sign in again."
            );
          }
        })(),
        AUTH_BOOTSTRAP_TIMEOUT_MS,
        "Authentication startup timed out"
      );
    } catch (err) {
      console.error("[auth] bootstrap failed", err);
      await forceLogout(
        err instanceof Error ? err.message : "Could not restore your session. Please sign in again."
      );
    } finally {
      finishBootstrap();
    }
  }

  function ensureBootstrapped() {
    if (bootstrapped) return Promise.resolve();
    if (!bootstrapPromise) {
      bootstrapPromise = bootstrapAuth().finally(() => {
        bootstrapPromise = null;
      });
    }
    return bootstrapPromise;
  }

  /** Safety valve if bootstrap hangs (e.g. bad network or corrupted storage). */
  function forceReady() {
    if (!ready.value) {
      console.warn("[auth] forceReady() — unblocking app shell");
      finishBootstrap();
    }
  }

  async function hydrateSession() {
    await ensureBootstrapped();
  }

  /**
   * @param {{ email: string, password: string }} credentials
   */
  async function signInWithPassword(credentials) {
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured." };
    }

    sessionExpiredMessage.value = "";
    authError.value = "";

    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email.trim(),
      password: credentials.password,
    });

    if (error) {
      authError.value = error.message;
      return { ok: false, error: error.message };
    }

    user.value = data.user;

    const valid = await loadProfile({ waitForTrigger: true });
    if (!valid) {
      const message = authError.value || UNAUTHORIZED_MESSAGE;
      await forceLogout(message);
      return { ok: false, error: message };
    }

    await logLoginActivity();
    return { ok: true };
  }

  async function signUpHospitalAdmin(payload) {
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured." };
    }

    sessionExpiredMessage.value = "";
    authError.value = "";

    const email = payload.email.trim();
    const hospitalName = payload.hospitalName.trim();
    const firstname = payload.firstname.trim();
    const lastname = payload.lastname.trim();

    if (!hospitalName) {
      return { ok: false, error: "Enter your hospital name." };
    }

    if (!firstname || !lastname) {
      return { ok: false, error: "Enter administrator first and last name." };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: payload.password,
      options: {
        data: {
          role: ROLE_ADMIN,
          hospital_name: hospitalName,
          firstname,
          lastname,
        },
      },
    });

    if (error) {
      authError.value = error.message;
      return { ok: false, error: error.message };
    }

    if (data.session?.user) {
      user.value = data.session.user;
      const valid = await loadProfile({ waitForTrigger: true });
      if (!valid) {
        const message = authError.value || UNAUTHORIZED_MESSAGE;
        await forceLogout(message);
        return { ok: false, error: message };
      }
      await logLoginActivity();
      return { ok: true, needsEmailConfirmation: false };
    }

    return { ok: true, needsEmailConfirmation: true };
  }

  async function signOut() {
    sessionExpiredMessage.value = "";
    authError.value = "";
    clearAuthState();

    if (supabase) {
      await supabase.auth.signOut({ scope: "local" });
    }
  }

  function consumeSessionExpiredMessage() {
    const message = sessionExpiredMessage.value;
    sessionExpiredMessage.value = "";
    return message;
  }

  function initAuthListener() {
    if (!supabase) {
      ready.value = true;
      bootstrapped = true;
      return () => {};
    }

    ensureBootstrapped();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION" || isBootstrapping) {
        return;
      }

      if (!session?.user) {
        clearAuthState();
        return;
      }

      if (event === "SIGNED_IN") {
        user.value = session.user;
        const ok = await loadProfile({ waitForTrigger: true });
        if (!ok) {
          await forceLogout(authError.value || UNAUTHORIZED_MESSAGE);
        }
        return;
      }

      if (event === "TOKEN_REFRESHED" && user.value?.id === session.user.id && profile.value) {
        return;
      }

      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        user.value = session.user;
        await loadProfile();
      }
    });

    return () => subscription.unsubscribe();
  }

  return {
    user,
    profile,
    ready,
    profileLoading,
    authError,
    sessionExpiredMessage,
    isAuthenticated,
    role,
    isAdmin,
    isClinician,
    hospitalName,
    hospitalLogoUrl,
    hospitalId,
    displayName,
    dashboardPath,
    clearAuthState,
    loadProfile,
    hydrateSession,
    ensureBootstrapped,
    forceReady,
    signInWithPassword,
    signUpHospitalAdmin,
    forceLogout,
    signOut,
    consumeSessionExpiredMessage,
    initAuthListener,
  };
});
