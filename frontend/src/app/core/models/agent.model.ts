export type AgentStatus = 'active' | 'inactive';

export interface CreatedBySummary {
  _id: string;
  name: string;
  role: { name: string } | string;
}

export interface Agent {
  _id: string;
  agentCode: string;
  name: string;
  mobile: string;
  email: string;
  area?: string;
  status: AgentStatus;
  linkedUser: string | null;
  organizationId?: { _id: string; name: string; code: string } | string | null;
  assignedCustomersCount?: number;
  createdBy?: CreatedBySummary | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentPayload {
  name: string;
  mobile: string;
  email: string;
  area?: string;
  status?: AgentStatus;
  password: string;
  confirmPassword: string;
  organizationId?: string;
}

export type UpdateAgentPayload = Partial<
  Pick<CreateAgentPayload, 'name' | 'mobile' | 'email' | 'area' | 'status'>
>;

export interface AgentPerformance {
  assignedCustomers: number;
  activeLoans: number;
  closedLoans: number;
  collectionCount: number;
  totalCollected: number;
}
