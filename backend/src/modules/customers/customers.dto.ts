import { z } from 'zod';
import { GENDERS } from '../../models/Customer';
import { emailSchema, mobileSchema, objectIdSchema } from '../../utils/validators';

const addressSchema = z.object({
  line1: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, 'Pincode must be exactly 6 digits')
    .optional(),
});

const nomineeSchema = z.object({
  name: z.string().trim().max(100).optional(),
  relation: z.string().trim().max(50).optional(),
  mobile: mobileSchema.optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  mobile: mobileSchema,
  email: emailSchema.optional(),
  dob: z.coerce.date().optional(),
  gender: z.enum(GENDERS).optional(),
  aadhaarNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{12}$/, 'Aadhaar number must be exactly 12 digits')
    .optional(),
  panNumber: z
    .string()
    .trim()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, 'Invalid PAN format')
    .optional(),
  address: addressSchema.optional(),
  occupation: z.string().trim().max(100).optional(),
  monthlyIncome: z.coerce.number().min(0).optional(),
  nominee: nomineeSchema.optional(),
  assignedAgent: objectIdSchema.optional(),
  linkedUser: objectIdSchema.optional(),
});
export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;

export const customerIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  assignedAgent: objectIdSchema.optional(),
  isActive: z.coerce.boolean().optional(),
});
export type ListCustomersQueryDto = z.infer<typeof listCustomersQuerySchema>;

export const addCustomerNoteSchema = z.object({
  text: z.string().trim().min(1).max(1000),
});
export type AddCustomerNoteDto = z.infer<typeof addCustomerNoteSchema>;

export const DOCUMENT_SLOTS = ['photo', 'aadhaarCopy', 'panCopy', 'other'] as const;
export const documentSlotParamSchema = z.object({
  id: objectIdSchema,
  slot: z.enum(DOCUMENT_SLOTS),
});
