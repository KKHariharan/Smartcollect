import { Schema, model, Types, type Document, type Model } from 'mongoose';
import {
  softDeletePlugin,
  type SoftDeleteFields,
  type SoftDeleteMethods,
} from './plugins/soft-delete.plugin';

export const ACCOUNT_TYPES = ['super_admin', 'admin', 'agent', 'customer'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface IUser extends Document, SoftDeleteFields, SoftDeleteMethods {
  name: string;
  email: string;
  mobile: string;
  passwordHash: string;
  role: Types.ObjectId;
  accountType: AccountType;
  organizationId: Types.ObjectId | null;
  createdBy?: Types.ObjectId;
  isActive: boolean;
  tokenVersion: number;
  refreshTokenHash: string | null;
  refreshTokenExpiresAt: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 15,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
    },
    accountType: {
      type: String,
      enum: ACCOUNT_TYPES,
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    refreshTokenExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        delete ret.refreshTokenExpiresAt;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ role: 1 });
userSchema.index({ accountType: 1 });
userSchema.index({ organizationId: 1 });

userSchema.plugin(softDeletePlugin);

export const User: Model<IUser> = model<IUser>('User', userSchema);
