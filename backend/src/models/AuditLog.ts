import { Schema, model, Types, type Document, type Model } from 'mongoose';

export interface IAuditLog extends Document {
  actor: Types.ObjectId | null;
  action: string;
  entityType: string;
  entityId: Types.ObjectId | null;
  organizationId: Types.ObjectId | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const AuditLog: Model<IAuditLog> = model<IAuditLog>('AuditLog', auditLogSchema);
