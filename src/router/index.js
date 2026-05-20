import { createRouter, createWebHistory } from "vue-router";
import { runNavigationGuards } from "./guards.js";

const ClinicianLoginView = () => import("../views/ClinicianLoginView.vue");
const AdminRegisterView = () => import("../views/AdminRegisterView.vue");
const DashboardView = () => import("../views/DashboardView.vue");
const FreshRecordingView = () => import("../views/FreshRecordingView.vue");
const ActiveRecordingView = () => import("../views/ActiveRecordingView.vue");
const TranscriptionView = () => import("../views/TranscriptionView.vue");
const PatientLibraryView = () => import("../views/PatientLibraryView.vue");
const PatientDetailView = () => import("../views/PatientDetailView.vue");
const AdminDashboardView = () => import("../views/AdminDashboardView.vue");
const AdminUserManagementView = () => import("../views/AdminUserManagementView.vue");
const AdminClinicianDetailView = () => import("../views/AdminClinicianDetailView.vue");
const AdminReportsView = () => import("../views/AdminReportsView.vue");
const AdminReportTranscriptionView = () => import("../views/AdminReportTranscriptionView.vue");
const AdminSettingsView = () => import("../views/AdminSettingsView.vue");
const AdminProfileView = () => import("../views/AdminProfileView.vue");

const routes = [
  { path: "/", redirect: "/auth/login" },

  {
    path: "/auth",
    children: [
      { path: "", redirect: { name: "auth-login" } },
      {
        path: "login",
        name: "auth-login",
        component: ClinicianLoginView,
        meta: { public: true },
      },
      {
        path: "admin/register",
        name: "auth-admin-register",
        component: AdminRegisterView,
        meta: { public: true },
      },
    ],
  },

  { path: "/login", redirect: { name: "auth-login" } },
  { path: "/register", redirect: { name: "auth-admin-register" } },

  {
    path: "/clinician",
    children: [
      { path: "", redirect: { name: "clinician-dashboard" } },
      {
        path: "dashboard",
        name: "clinician-dashboard",
        component: DashboardView,
        meta: { role: "clinician" },
      },
      {
        path: "recording",
        redirect: { name: "clinician-recording-fresh" },
      },
      {
        path: "recording/fresh",
        name: "clinician-recording-fresh",
        component: FreshRecordingView,
        meta: { role: "clinician" },
      },
      {
        path: "recording/active",
        name: "clinician-recording-active",
        component: ActiveRecordingView,
        meta: { role: "clinician" },
      },
      {
        path: "recording/transcription",
        name: "clinician-transcription",
        component: TranscriptionView,
        meta: { role: "clinician" },
      },
      {
        path: "patients",
        redirect: { name: "clinician-patient-library" },
      },
      {
        path: "patients/library",
        name: "clinician-patient-library",
        component: PatientLibraryView,
        meta: { role: "clinician" },
      },
      {
        path: "patients/details",
        name: "clinician-patient-details",
        component: PatientDetailView,
        meta: { role: "clinician" },
      },
    ],
  },

  {
    path: "/admin",
    children: [
      { path: "", redirect: { name: "admin-dashboard" } },
      {
        path: "dashboard",
        name: "admin-dashboard",
        component: AdminDashboardView,
        meta: { role: "admin" },
      },
      {
        path: "users",
        name: "admin-users",
        component: AdminUserManagementView,
        meta: { role: "admin" },
      },
      {
        path: "users/:clinicianId",
        name: "admin-clinician-detail",
        component: AdminClinicianDetailView,
        meta: { role: "admin" },
      },
      {
        path: "reports",
        name: "admin-reports",
        component: AdminReportsView,
        meta: { role: "admin" },
      },
      {
        path: "reports/:reportId/transcription",
        name: "admin-report-transcription",
        component: AdminReportTranscriptionView,
        meta: { role: "admin" },
      },
      {
        path: "profile",
        name: "admin-profile",
        component: AdminProfileView,
        meta: { role: "admin" },
      },
      {
        path: "settings",
        name: "admin-settings",
        component: AdminSettingsView,
        meta: { role: "admin" },
      },
    ],
  },

  // Legacy clinician paths → new structure
  { path: "/dashboard", redirect: "/clinician/dashboard" },
  { path: "/recording/fresh", redirect: "/clinician/recording/fresh" },
  { path: "/recording/active", redirect: "/clinician/recording/active" },
  { path: "/recording/transcription", redirect: "/clinician/recording/transcription" },
  { path: "/recording", redirect: "/clinician/recording/fresh" },
  { path: "/patients/library", redirect: "/clinician/patients/library" },
  { path: "/patients/details", redirect: "/clinician/patients/details" },
  { path: "/patients", redirect: "/clinician/patients/library" },

  { path: "/:pathMatch(.*)*", redirect: "/auth/login" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from) => runNavigationGuards(to, from));

export default router;
