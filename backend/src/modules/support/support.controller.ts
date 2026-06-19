import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import * as supportService from './support.service';
import type {
  AddTicketMessageDto,
  CreateTicketDto,
  ListTicketsQueryDto,
  UpdateTicketStatusDto,
} from './support.dto';

export const listTickets = asyncHandler(async (req: Request, res: Response) => {
  const result = await supportService.listTickets(req.query as unknown as ListTicketsQueryDto, req);
  sendSuccess(res, result, 'Support tickets retrieved');
});

export const getTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await supportService.getTicketById(req.params.id as string, req);
  sendSuccess(res, ticket, 'Support ticket retrieved');
});

export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await supportService.createTicket(req.body as CreateTicketDto, req);
  sendSuccess(res, ticket, 'Support ticket created', 201);
});

export const updateTicketStatus = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await supportService.updateTicketStatus(
    req.params.id as string,
    req.body as UpdateTicketStatusDto,
    req,
  );
  sendSuccess(res, ticket, 'Support ticket status updated');
});

export const addTicketMessage = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await supportService.addTicketMessage(
    req.params.id as string,
    req.body as AddTicketMessageDto,
    req,
  );
  sendSuccess(res, ticket, 'Message added', 201);
});
