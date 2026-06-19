import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import * as rolesService from './roles.service';
import type { CreateRoleDto, ListRolesQueryDto, UpdateRoleDto } from './roles.dto';

export const listRoles = asyncHandler(async (req: Request, res: Response) => {
  const result = await rolesService.listRoles(req.query as unknown as ListRolesQueryDto);
  sendSuccess(res, result, 'Roles retrieved');
});

export const getRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await rolesService.getRoleById(req.params.id as string);
  sendSuccess(res, role, 'Role retrieved');
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await rolesService.createRole(req.body as CreateRoleDto, req);
  sendSuccess(res, role, 'Role created', 201);
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await rolesService.updateRole(
    req.params.id as string,
    req.body as UpdateRoleDto,
    req,
  );
  sendSuccess(res, role, 'Role updated');
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  await rolesService.deleteRole(req.params.id as string, req);
  sendSuccess(res, null, 'Role deleted');
});
