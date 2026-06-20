import type { ClientSession, Types } from 'mongoose';
import { Agent, type AgentStatus, type IAgent } from '../models/Agent';
import { Customer, type Gender, type ICustomer } from '../models/Customer';
import { generateCode } from './sequence';

interface AgentProfileInput {
  name: string;
  mobile: string;
  email: string;
  area?: string;
  status?: AgentStatus;
  linkedUser: Types.ObjectId;
  createdBy: string;
  organizationId: string | null;
}

export async function createAgentProfile(
  session: ClientSession,
  input: AgentProfileInput,
): Promise<IAgent> {
  const agentCode = await generateCode('AGT', 'agent_seq', undefined, session);
  const [agent] = await Agent.create(
    [
      {
        name: input.name,
        mobile: input.mobile,
        email: input.email,
        area: input.area,
        status: input.status,
        agentCode,
        linkedUser: input.linkedUser,
        createdBy: input.createdBy,
        organizationId: input.organizationId,
      },
    ],
    { session },
  );
  if (!agent) throw new Error('Failed to create agent profile');
  return agent;
}

interface CustomerProfileInput {
  name: string;
  mobile: string;
  email: string;
  dob?: Date;
  gender?: Gender;
  aadhaarNumber?: string;
  panNumber?: string;
  address?: { line1?: string; city?: string; state?: string; pincode?: string };
  occupation?: string;
  monthlyIncome?: number;
  nominee?: { name?: string; relation?: string; mobile?: string };
  assignedAgent?: string;
  linkedUser: Types.ObjectId;
  createdBy: string;
  organizationId: string | null;
}

export async function createCustomerProfile(
  session: ClientSession,
  input: CustomerProfileInput,
): Promise<ICustomer> {
  const customerCode = await generateCode('CUST', 'customer_seq', undefined, session);
  const [customer] = await Customer.create(
    [
      {
        name: input.name,
        mobile: input.mobile,
        email: input.email,
        dob: input.dob,
        gender: input.gender,
        aadhaarNumber: input.aadhaarNumber,
        panNumber: input.panNumber,
        address: input.address,
        occupation: input.occupation,
        monthlyIncome: input.monthlyIncome,
        nominee: input.nominee,
        assignedAgent: input.assignedAgent,
        customerCode,
        linkedUser: input.linkedUser,
        createdBy: input.createdBy,
        organizationId: input.organizationId,
      },
    ],
    { session },
  );
  if (!customer) throw new Error('Failed to create customer profile');
  return customer;
}
