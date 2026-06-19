export interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissions: string[];
}

export type UpdateRolePayload = Partial<CreateRolePayload>;
