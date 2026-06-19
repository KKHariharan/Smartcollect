import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../utils/app-error';
import * as customersService from './customers.service';
import type {
  AddCustomerNoteDto,
  CreateCustomerDto,
  DOCUMENT_SLOTS,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from './customers.dto';

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const result = await customersService.listCustomers(
    req.query as unknown as ListCustomersQueryDto,
    req,
  );
  sendSuccess(res, result, 'Customers retrieved');
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customersService.getCustomerById(req.params.id as string, req);
  sendSuccess(res, customer, 'Customer retrieved');
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customersService.createCustomer(req.body as CreateCustomerDto, req);
  sendSuccess(res, customer, 'Customer created', 201);
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customersService.updateCustomer(
    req.params.id as string,
    req.body as UpdateCustomerDto,
    req,
  );
  sendSuccess(res, customer, 'Customer updated');
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  await customersService.deleteCustomer(req.params.id as string, req);
  sendSuccess(res, null, 'Customer deleted');
});

export const addCustomerNote = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customersService.addCustomerNote(
    req.params.id as string,
    req.body as AddCustomerNoteDto,
    req,
  );
  sendSuccess(res, customer, 'Note added', 201);
});

export const uploadCustomerDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw AppError.badRequest('A file is required');
  }
  const slot = req.params.slot as (typeof DOCUMENT_SLOTS)[number];
  const customer = await customersService.uploadCustomerDocument(
    req.params.id as string,
    slot,
    {
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    },
    req,
  );
  sendSuccess(res, customer, 'Document uploaded');
});
