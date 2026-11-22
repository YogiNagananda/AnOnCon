import { z } from 'zod';
import { MAX_BIO_LENGTH } from './constants';

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  dob: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val);
        const today = new Date();
        const age = today.getFullYear() - date.getFullYear();
        const monthDiff = today.getMonth() - date.getMonth();
        const dayDiff = today.getDate() - date.getDate();
        const actualAge =
          monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)
            ? age - 1
            : age;
        return actualAge >= 18;
      },
      { message: 'You must be at least 18 years old' }
    ),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const profileSchema = z.object({
  display_name: z
    .string()
    .min(3, 'Display name must be at least 3 characters')
    .max(30, 'Display name must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Display name can only contain letters, numbers, and underscores'
    ),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']),
  bio: z
    .string()
    .max(MAX_BIO_LENGTH, `Bio must be at most ${MAX_BIO_LENGTH} characters`)
    .optional()
    .or(z.literal('')),
  interests: z
    .array(z.string())
    .min(1, 'Select at least one interest')
    .max(10, 'Select at most 10 interests'),
  languages: z
    .array(z.string())
    .min(1, 'Select at least one language'),
});

export const displayNameSchema = z.object({
  display_name: z
    .string()
    .min(3, 'Display name must be at least 3 characters')
    .max(30, 'Display name must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Display name can only contain letters, numbers, and underscores'
    ),
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type DisplayNameFormData = z.infer<typeof displayNameSchema>;
