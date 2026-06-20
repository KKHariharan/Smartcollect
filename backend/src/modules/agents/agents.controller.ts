import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import * as agentsService from './agents.service';
import type {
  AgentPerformanceQueryDto,
  AssignCustomersDto,
  CreateAgentDto,
  ListAgentsQueryDto,
  UpdateAgentDto,
} from './agents.dto';

export const listAgents = asyncHandler(async (req: Request, res: Response) => {
  const result = await agentsService.listAgents(req.query as unknown as ListAgentsQueryDto, req);
  sendSuccess(res, result, 'Agents retrieved');
});

export const getAgent = asyncHandler(async (req: Request, res: Response) => {
  const agent = await agentsService.getAgentById(req.params.id as string, req);
  sendSuccess(res, agent, 'Agent retrieved');
});

export const createAgent = asyncHandler(async (req: Request, res: Response) => {
  const agent = await agentsService.createAgent(req.body as CreateAgentDto, req);
  sendSuccess(res, agent, 'Agent created', 201);
});

export const updateAgent = asyncHandler(async (req: Request, res: Response) => {
  const agent = await agentsService.updateAgent(
    req.params.id as string,
    req.body as UpdateAgentDto,
    req,
  );
  sendSuccess(res, agent, 'Agent updated');
});

export const deleteAgent = asyncHandler(async (req: Request, res: Response) => {
  await agentsService.deleteAgent(req.params.id as string, req);
  sendSuccess(res, null, 'Agent deleted');
});

export const getAgentCustomers = asyncHandler(async (req: Request, res: Response) => {
  const customers = await agentsService.getAgentCustomers(req.params.id as string, req);
  sendSuccess(res, customers, 'Assigned customers retrieved');
});

export const assignCustomers = asyncHandler(async (req: Request, res: Response) => {
  const result = await agentsService.assignCustomers(
    req.params.id as string,
    req.body as AssignCustomersDto,
    req,
  );
  sendSuccess(res, result, 'Customers assigned');
});

export const unassignCustomers = asyncHandler(async (req: Request, res: Response) => {
  const result = await agentsService.unassignCustomers(
    req.params.id as string,
    req.body as AssignCustomersDto,
    req,
  );
  sendSuccess(res, result, 'Customers unassigned');
});

export const getAgentPerformance = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as unknown as AgentPerformanceQueryDto;
  const performance = await agentsService.getAgentPerformance(
    req.params.id as string,
    req,
    from,
    to,
  );
  sendSuccess(res, performance, 'Agent performance retrieved');
});
