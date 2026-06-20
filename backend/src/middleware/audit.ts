import type { Request } from 'express';
import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../config/logger';

interface RecordAuditParams {
  req: Request;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | string | null;
  actorId?: Types.ObjectId | string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAuditLog({
  req,
  action,
  entityType,
  entityId = null,
  actorId = null,
  metadata,
}: RecordAuditParams): Promise<void> {
  try {
    await AuditLog.create({
      actor: actorId ?? req.user?.sub ?? null,
      action,
      entityType,
      entityId,
      organizationId: req.user?.organizationId ?? null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata,
    });
  } catch (err) {
    logger.error('Failed to record audit log', { err, action, entityType });
  }
}
