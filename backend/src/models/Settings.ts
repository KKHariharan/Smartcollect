import { Schema, model, type Document, type Model } from 'mongoose';

export interface ISettings extends Document<string> {
  _id: string;
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  };
  interest: {
    defaultInterestRate: number;
    defaultPenaltyChargePerDay: number;
  };
  receipt: {
    prefix: string;
    footerNote?: string;
  };
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    _id: { type: String, default: 'global' },
    company: {
      name: { type: String, default: 'My Finance Company' },
      address: { type: String },
      phone: { type: String },
      email: { type: String },
      logoUrl: { type: String },
    },
    interest: {
      defaultInterestRate: { type: Number, default: 0 },
      defaultPenaltyChargePerDay: { type: Number, default: 0 },
    },
    receipt: {
      prefix: { type: String, default: 'RCPT' },
      footerNote: { type: String },
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const Settings: Model<ISettings> = model<ISettings>('Settings', settingsSchema);
