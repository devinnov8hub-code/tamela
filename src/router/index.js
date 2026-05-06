import { createRouter, createWebHistory } from "vue-router";
import { isSupabaseConfigured, supabase } from "../services/supabase";
import ClinicianLoginView from "../views/ClinicianLoginView.vue";
import RegisterView from "../views/RegisterView.vue";
import DashboardView from "../views/DashboardView.vue";
import FreshRecordingView from "../views/FreshRecordingView.vue";
import ActiveRecordingView from "../views/ActiveRecordingView.vue";
import TranscriptionView from "../views/TranscriptionView.vue";
import PatientLibraryView from "../views/PatientLibraryView.vue";
import PatientDetailView from "../views/PatientDetailView.vue";
import AdminDashboardView from "../views/AdminDashboardView.vue";
import AdminUserManagementView from "../views/AdminUserManagementView.vue";
import AdminClinicianDetailView from "../views/AdminClinicianDetailView.vue";
import AdminReportsView from "../views/AdminReportsView.vue";
import AdminReportTranscriptionView from "../views/AdminReportTranscriptionView.vue";
import AdminSettingsView from "../views/AdminSettingsView.vue";

const routes = [
  {
    path: "/login",
    name: "login",
    component: ClinicianLoginView,
  },
  {
    path: "/register",
    name: "register",
    component: RegisterView,
  },
  {
    path: "/",
    redirect: "/dashboard",
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: DashboardView,
  },
  {
    path: "/recording/fresh",
    name: "fresh-recording",
    component: FreshRecordingView,
  },
  {
    path: "/recording",
    redirect: "/recording/fresh",
  },
  {
    path: "/recording/active",
    name: "active-recording",
    component: ActiveRecordingView,
  },
  {
    path: "/recording/transcription",
    name: "transcription",
    component: TranscriptionView,
  },
  {
    path: "/patients/library",
    name: "patient-library",
    component: PatientLibraryView,
  },
  {
    path: "/patients",
    redirect: "/patients/library",
  },
  {
    path: "/patients/details",
    name: "patient-details",
    component: PatientDetailView,
  },
  {
    path: "/admin",
    redirect: "/admin/dashboard",
  },
  {
    path: "/admin/dashboard",
    name: "admin-dashboard",
    component: AdminDashboardView,
  },
  {
    path: "/admin/users",
    name: "admin-users",
    component: AdminUserManagementView,
  },
  {
    path: "/admin/users/:clinicianId",
    name: "admin-clinician-detail",
    component: AdminClinicianDetailView,
  },
  {
    path: "/admin/reports",
    name: "admin-reports",
    component: AdminReportsView,
  },
  {
    path: "/admin/reports/:reportId/transcription",
    name: "admin-report-transcription",
    component: AdminReportTranscriptionView,
  },
  {
    path: "/admin/settings",
    name: "admin-settings",
    component: AdminSettingsView,
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const PUBLIC_ROUTE_NAMES = new Set(["login", "register"]);

router.beforeEach(async (to) => {
  if (!isSupabaseConfigured || !supabase) return true;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (PUBLIC_ROUTE_NAMES.has(to.name)) {
    if (session) return { path: "/dashboard" };
    return true;
  }

  if (session) return true;
  return { name: "login", query: { redirect: to.fullPath } };
});

export default router;
