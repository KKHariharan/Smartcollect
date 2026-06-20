import { Schema, model, Types, type Document, type Model } from 'mongoose';
import {
  softDeletePlugin,
  type SoftDeleteFields,
  type SoftDeleteMethods,
} from './plugins/soft-delete.plugin';

export const AGENT_STATUSES = ['active', 'inactive'] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export interface IAgent extends Document, SoftDeleteFields, SoftDeleteMethods {
  agentCode: string;
  name: string;
  mobile: string;
  email: string;
  area?: string;
  status: AgentStatus;
  linkedUser: Types.ObjectId | null;
  organizationId: Types.ObjectId | null;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const agentSchema = new Schema<IAgent>(
  {
    agentCode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    mobile: { type: String, required: true, unique: true, trim: true, maxlength: 15 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 150 },
    area: { type: String, trim: true, maxlength: 100 },
    status: { type: String, enum: AGENT_STATUSES, default: 'active' },
    linkedUser: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

agentSchema.index(
  { linkedUser: 1 },
  { unique: true, partialFilterExpression: { linkedUser: { $type: 'objectId' } } },
);
agentSchema.index({ organizationId: 1 });

agentSchema.plugin(softDeletePlugin);

export const Agent: Model<IAgent> = model<IAgent>('Agent', agentSchema);
