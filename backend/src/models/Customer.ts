import { Schema, model, Types, type Document, type Model } from 'mongoose';
import {
  softDeletePlugin,
  type SoftDeleteFields,
  type SoftDeleteMethods,
} from './plugins/soft-delete.plugin';

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export interface ICustomerDocumentFile {
  name: string;
  url: string;
  publicId: string;
  uploadedAt: Date;
}

export interface ICustomerNote {
  author: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface ICustomer extends Document, SoftDeleteFields, SoftDeleteMethods {
  customerCode: string;
  name: string;
  mobile: string;
  email?: string;
  dob?: Date;
  gender?: Gender;
  aadhaarNumber?: string;
  panNumber?: string;
  address: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  occupation?: string;
  monthlyIncome?: number;
  nominee?: {
    name?: string;
    relation?: string;
    mobile?: string;
  };
  documents: {
    photo?: ICustomerDocumentFile;
    aadhaarCopy?: ICustomerDocumentFile;
    panCopy?: ICustomerDocumentFile;
    other: ICustomerDocumentFile[];
  };
  notes: ICustomerNote[];
  assignedAgent: Types.ObjectId | null;
  linkedUser: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const documentFileSchema = new Schema<ICustomerDocumentFile>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const customerSchema = new Schema<ICustomer>(
  {
    customerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    mobile: { type: String, required: true, unique: true, trim: true, maxlength: 15 },
    email: { type: String, trim: true, lowercase: true, maxlength: 150 },
    dob: { type: Date },
    gender: { type: String, enum: GENDERS },
    aadhaarNumber: { type: String, trim: true, sparse: true, unique: true },
    panNumber: { type: String, trim: true, uppercase: true, sparse: true, unique: true },
    address: {
      line1: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    occupation: { type: String, trim: true },
    monthlyIncome: { type: Number, min: 0 },
    nominee: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      mobile: { type: String, trim: true },
    },
    documents: {
      photo: { type: documentFileSchema, default: undefined },
      aadhaarCopy: { type: documentFileSchema, default: undefined },
      panCopy: { type: documentFileSchema, default: undefined },
      other: { type: [documentFileSchema], default: [] },
    },
    notes: {
      type: [
        new Schema<ICustomerNote>(
          {
            author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            text: { type: String, required: true, trim: true, maxlength: 1000 },
            createdAt: { type: Date, default: () => new Date() },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    assignedAgent: { type: Schema.Types.ObjectId, ref: 'Agent', default: null },
    linkedUser: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

customerSchema.index({ assignedAgent: 1 });
customerSchema.index({ linkedUser: 1 });
customerSchema.index({ name: 'text', mobile: 'text', customerCode: 'text' });

customerSchema.plugin(softDeletePlugin);

export const Customer: Model<ICustomer> = model<ICustomer>('Customer', customerSchema);
