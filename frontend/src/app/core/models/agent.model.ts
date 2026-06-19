export type AgentStatus = 'active' | 'inactive';

export interface Agent {
  _id: string;
  agentCode: string;
  name: string;
  mobile: string;
  email?: string;
  area?: string;
  status: AgentStatus;
  linkedUser: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentPayload {
  name: string;
  mobile: string;
  email?: string;
  area?: string;
  status?: AgentStatus;
  linkedUser?: string;
}

export type UpdateAgentPayload = Partial<CreateAgentPayload>;

export interface AgentPerformance {
  assignedCustomers: number;
  activeLoans: number;
  closedLoans: number;
  collectionCount: number;
  totalCollected: number;
}
