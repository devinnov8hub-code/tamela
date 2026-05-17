export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  RECORDING: '/recording',
  RECORDING_FRESH: '/recording/fresh',
  RECORDING_ACTIVE: '/recording/active',
  RECORDING_TRANSCRIPTION: '/recording/transcription',
  REPORTS: '/reports',
  REPORT_DETAIL: '/reports/:id',
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_CLINICIANS: '/admin/clinicians',
  ADMIN_CLINICIAN_DETAIL: '/admin/clinicians/:id',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_REPORT_DETAIL: '/admin/reports/:id',
  ADMIN_DEPARTMENTS: '/admin/departments',
  ADMIN_SPECIALTIES: '/admin/specialties',
  ADMIN_SETTINGS: '/admin/settings',
}

export const USER_ROLES = {
  ADMIN: 'admin',
  CLINICIAN: 'clinician',
}

export const STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ARCHIVED: 'archived',
}

export const SESSION_TYPES = [
  { label: 'Consultation', value: 'consultation' },
  { label: 'Diagnosis', value: 'diagnosis' },
  { label: 'Treatment Plan', value: 'treatment_plan' },
  { label: 'Follow-up', value: 'follow_up' },
  { label: 'Procedure', value: 'procedure' },
  { label: 'Assessment', value: 'assessment' },
  { label: 'Other', value: 'other' },
]

export const DEPARTMENTS = [
  { label: 'Cardiology', value: 'cardiology' },
  { label: 'Dermatology', value: 'dermatology' },
  { label: 'Neurology', value: 'neurology' },
  { label: 'Orthopedics', value: 'orthopedics' },
  { label: 'Pediatrics', value: 'pediatrics' },
  { label: 'Psychiatry', value: 'psychiatry' },
  { label: 'Surgery', value: 'surgery' },
  { label: 'Internal Medicine', value: 'internal_medicine' },
]

export const SPECIALTIES = [
  { label: 'General Practice', value: 'general_practice' },
  { label: 'Specialist', value: 'specialist' },
  { label: 'Surgeon', value: 'surgeon' },
  { label: 'Consultant', value: 'consultant' },
  { label: 'Resident', value: 'resident' },
]

export const PAGINATION_LIMITS = {
  SMALL: 10,
  MEDIUM: 25,
  LARGE: 50,
  XLARGE: 100,
}

export const API_ERRORS = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Unauthorized. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
}

export const TOAST_DURATION = {
  SHORT: 2000,
  NORMAL: 3000,
  LONG: 5000,
}

export const DEBOUNCE_DELAY = {
  SHORT: 300,
  NORMAL: 500,
  LONG: 1000,
}
