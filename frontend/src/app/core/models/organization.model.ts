export type OrganizationStatus = 'active' | 'inactive';

export interface Organization {
  _id: string;
  name: string;
  code: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationPayload {
  name: string;
  status?: OrganizationStatus;
}

export type UpdateOrganizationPayload = Partial<CreateOrganizationPayload>;
