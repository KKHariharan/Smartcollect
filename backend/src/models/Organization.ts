import { Schema, model, Types, type Document, type Model } from 'mongoose';
import {
  softDeletePlugin,
  type SoftDeleteFields,
  type SoftDeleteMethods,
} from './plugins/soft-delete.plugin';

export const ORGANIZATION_STATUSES = ['active', 'inactive'] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export interface IOrganization extends Document, SoftDeleteFields, SoftDeleteMethods {
  name: string;
  code: string;
  status: OrganizationStatus;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    code: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: ORGANIZATION_STATUSES, default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

organizationSchema.plugin(softDeletePlugin);

export const Organization: Model<IOrganization> = model<IOrganization>(
  'Organization',
  organizationSchema,
);
