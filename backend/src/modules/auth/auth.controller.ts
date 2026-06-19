import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../utils/app-error';
import * as authService from './auth.service';
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './auth.dto';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginDto;
  const result = await authService.login(email, password, req);
  sendSuccess(res, result, 'Login successful');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as RefreshTokenDto;
  const result = await authService.refresh(refreshToken, req);
  sendSuccess(res, result, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await authService.logout(req.user.sub, req);
  sendSuccess(res, null, 'Logged out successfully');
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as ForgotPasswordDto;
  await authService.forgotPassword(email, req);
  sendSuccess(res, null, 'If that email exists, a reset link has been sent');
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as ResetPasswordDto;
  await authService.resetPassword(token, newPassword, req);
  sendSuccess(res, null, 'Password has been reset successfully');
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = req.body as ChangePasswordDto;
  const result = await authService.changePassword(req.user.sub, dto, req);
  sendSuccess(res, result, 'Password changed successfully');
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const profile = await authService.getProfile(req.user.sub);
  sendSuccess(res, profile, 'Profile retrieved');
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = req.body as UpdateProfileDto;
  const profile = await authService.updateProfile(req.user.sub, dto, req);
  sendSuccess(res, profile, 'Profile updated');
});
