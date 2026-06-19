export interface Settings {
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
  updatedAt: string;
}

export type UpdateSettingsPayload = Partial<{
  company: Partial<Settings['company']>;
  interest: Partial<Settings['interest']>;
  receipt: Partial<Settings['receipt']>;
}>;
