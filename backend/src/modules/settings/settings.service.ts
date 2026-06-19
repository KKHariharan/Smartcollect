import type { Request } from 'express';
import { Settings } from '../../models/Settings';
import { recordAuditLog } from '../../middleware/audit';
import type { UpdateSettingsDto } from './settings.dto';

const SETTINGS_ID = 'global';

export async function getSettings() {
  const settings = await Settings.findByIdAndUpdate(
    SETTINGS_ID,
    { $setOnInsert: { _id: SETTINGS_ID } },
    { upsert: true, new: true },
  );
  return settings;
}

export async function updateSettings(dto: UpdateSettingsDto, req: Request) {
  const settings = await getSettings();

  if (dto.company) Object.assign(settings.company, dto.company);
  if (dto.interest) Object.assign(settings.interest, dto.interest);
  if (dto.receipt) Object.assign(settings.receipt, dto.receipt);
  await settings.save();

  await recordAuditLog({
    req,
    action: 'settings.updated',
    entityType: 'Settings',
    metadata: { fields: Object.keys(dto) },
  });

  return settings;
}
