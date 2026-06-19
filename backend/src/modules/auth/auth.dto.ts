import { z } from 'zod';
import { emailSchema, mobileSchema, strongPasswordSchema } from '../../utils/validators';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: strongPasswordSchema,
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: strongPasswordSchema,
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  mobile: mobileSchema.optional(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
