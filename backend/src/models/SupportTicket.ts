import { Schema, model, Types, type Document, type Model } from 'mongoose';

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface ITicketMessage {
  author: Types.ObjectId;
  message: string;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  ticketNumber: string;
  customer: Types.ObjectId;
  raisedBy: Types.ObjectId;
  subject: string;
  description: string;
  status: TicketStatus;
  messages: ITicketMessage[];
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ticketMessageSchema = new Schema<ITicketMessage>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: { type: String, required: true, unique: true, trim: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: TICKET_STATUSES, default: 'open', index: true },
    messages: { type: [ticketMessageSchema], default: [] },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const SupportTicket: Model<ISupportTicket> = model<ISupportTicket>(
  'SupportTicket',
  supportTicketSchema,
);
