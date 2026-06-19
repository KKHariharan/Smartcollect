import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import * as settingsService from './settings.service';
import type { UpdateSettingsDto } from './settings.dto';

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await settingsService.getSettings();
  sendSuccess(res, settings, 'Settings retrieved');
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.updateSettings(req.body as UpdateSettingsDto, req);
  sendSuccess(res, settings, 'Settings updated');
});
