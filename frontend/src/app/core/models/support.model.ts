export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface TicketMessage {
  author: { _id: string; name: string } | string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  ticketNumber: string;
  customer: { _id: string; name: string; customerCode: string } | string;
  raisedBy: { _id: string; name: string } | string;
  subject: string;
  description: string;
  status: TicketStatus;
  messages: TicketMessage[];
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketPayload {
  customer: string;
  subject: string;
  description: string;
}
