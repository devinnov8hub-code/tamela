import { storeToRefs } from "pinia";
import { useAuthStore } from "../stores/auth.js";

export function useAuth() {
  const store = useAuthStore();
  const {
    user,
    profile,
    ready,
    profileLoading,
    authError,
    isAuthenticated,
    role,
    isAdmin,
    isClinician,
    hospitalName,
    hospitalLogoUrl,
    hospitalId,
    displayName,
    dashboardPath,
  } = storeToRefs(store);

  return {
    user,
    profile,
    ready,
    profileLoading,
    authError,
    isAuthenticated,
    role,
    isAdmin,
    isClinician,
    hospitalName,
    hospitalLogoUrl,
    hospitalId,
    displayName,
    dashboardPath,
    signInWithPassword: store.signInWithPassword,
    signUpHospitalAdmin: store.signUpHospitalAdmin,
    signOut: store.signOut,
    hydrateSession: store.hydrateSession,
    ensureBootstrapped: store.ensureBootstrapped,
    loadProfile: store.loadProfile,
    consumeSessionExpiredMessage: store.consumeSessionExpiredMessage,
  };
}
