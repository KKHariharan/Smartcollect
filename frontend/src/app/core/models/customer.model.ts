export type Gender = 'male' | 'female' | 'other';

export interface CustomerAddress {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface CustomerNominee {
  name?: string;
  relation?: string;
  mobile?: string;
}

export interface CustomerDocumentFile {
  name: string;
  url: string;
  publicId: string;
  uploadedAt: string;
}

export interface CustomerNote {
  author: string;
  text: string;
  createdAt: string;
}

export interface Customer {
  _id: string;
  customerCode: string;
  name: string;
  mobile: string;
  email?: string;
  dob?: string;
  gender?: Gender;
  aadhaarNumber?: string;
  panNumber?: string;
  address?: CustomerAddress;
  occupation?: string;
  monthlyIncome?: number;
  nominee?: CustomerNominee;
  documents: {
    photo?: CustomerDocumentFile;
    aadhaarCopy?: CustomerDocumentFile;
    panCopy?: CustomerDocumentFile;
    other: CustomerDocumentFile[];
  };
  notes: CustomerNote[];
  assignedAgent: { _id: string; name: string; agentCode: string } | string | null;
  linkedUser: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  name: string;
  mobile: string;
  email?: string;
  dob?: string;
  gender?: Gender;
  aadhaarNumber?: string;
  panNumber?: string;
  address?: CustomerAddress;
  occupation?: string;
  monthlyIncome?: number;
  nominee?: CustomerNominee;
  assignedAgent?: string;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload> & { isActive?: boolean };

export type DocumentSlot = 'photo' | 'aadhaarCopy' | 'panCopy' | 'other';
