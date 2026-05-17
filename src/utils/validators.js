import { z } from 'zod'

export const emailSchema = z.string().email('Invalid email address')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export const resetPasswordSchema = z.object({
  email: emailSchema,
})

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export const clinicianSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  title: z.string().min(1, 'Title is required'),
  email: emailSchema,
  specialty: z.string().min(1, 'Specialty is required'),
  department: z.string().min(1, 'Department is required'),
  password: passwordSchema.optional(),
})

export const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  code: z.string().min(1, 'Department code is required'),
  description: z.string().optional(),
})

export const specialtySchema = z.object({
  name: z.string().min(1, 'Specialty name is required'),
  code: z.string().min(1, 'Specialty code is required'),
  description: z.string().optional(),
})

export const transcriptionSchema = z.object({
  caseTitle: z.string().min(1, 'Case title is required'),
  sessionType: z.string().min(1, 'Session type is required'),
  transcription: z.string().min(1, 'Transcription is required'),
})

export const validateForm = (schema, data) => {
  try {
    schema.parse(data)
    return { valid: true, errors: {} }
  } catch (error) {
    const errors = {}
    error.errors?.forEach((err) => {
      const path = err.path.join('.')
      errors[path] = err.message
    })
    return { valid: false, errors }
  }
}

export const getFieldError = (errors, field) => {
  return errors[field] || null
}

export const hasFieldError = (errors, field) => {
  return !!errors[field]
}
