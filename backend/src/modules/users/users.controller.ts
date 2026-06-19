import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import * as usersService from './users.service';
import type { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from './users.dto';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await usersService.listUsers(req.query as unknown as ListUsersQueryDto);
  sendSuccess(res, result, 'Users retrieved');
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getUserById(req.params.id as string);
  sendSuccess(res, user, 'User retrieved');
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.createUser(req.body as CreateUserDto, req);
  sendSuccess(res, user, 'User created', 201);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.updateUser(
    req.params.id as string,
    req.body as UpdateUserDto,
    req,
  );
  sendSuccess(res, user, 'User updated');
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await usersService.deleteUser(req.params.id as string, req);
  sendSuccess(res, null, 'User deleted');
});
