import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import * as organizationsService from './organizations.service';
import type {
  CreateOrganizationDto,
  ListOrganizationsQueryDto,
  UpdateOrganizationDto,
} from './organizations.dto';

export const listOrganizations = asyncHandler(async (req: Request, res: Response) => {
  const result = await organizationsService.listOrganizations(
    req.query as unknown as ListOrganizationsQueryDto,
    req,
  );
  sendSuccess(res, result, 'Organizations retrieved');
});

export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  const organization = await organizationsService.getOrganizationById(
    req.params.id as string,
    req,
  );
  sendSuccess(res, organization, 'Organization retrieved');
});

export const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  const organization = await organizationsService.createOrganization(
    req.body as CreateOrganizationDto,
    req,
  );
  sendSuccess(res, organization, 'Organization created', 201);
});

export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const organization = await organizationsService.updateOrganization(
    req.params.id as string,
    req.body as UpdateOrganizationDto,
    req,
  );
  sendSuccess(res, organization, 'Organization updated');
});

export const deleteOrganization = asyncHandler(async (req: Request, res: Response) => {
  await organizationsService.deleteOrganization(req.params.id as string, req);
  sendSuccess(res, null, 'Organization deleted');
});
