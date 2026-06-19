import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import * as collectionsService from './collections.service';
import type {
  CreateCollectionDto,
  ListCollectionsQueryDto,
  ListPendingQueryDto,
} from './collections.dto';

export const listCollections = asyncHandler(async (req: Request, res: Response) => {
  const result = await collectionsService.listCollections(
    req.query as unknown as ListCollectionsQueryDto,
    req,
  );
  sendSuccess(res, result, 'Collections retrieved');
});

export const getCollection = asyncHandler(async (req: Request, res: Response) => {
  const collection = await collectionsService.getCollectionById(req.params.id as string, req);
  sendSuccess(res, collection, 'Collection retrieved');
});

export const createCollection = asyncHandler(async (req: Request, res: Response) => {
  const collection = await collectionsService.createCollection(
    req.body as CreateCollectionDto,
    req,
  );
  sendSuccess(res, collection, 'Collection recorded', 201);
});

export const listPendingCollections = asyncHandler(async (req: Request, res: Response) => {
  const result = await collectionsService.listPendingCollections(
    req.query as unknown as ListPendingQueryDto,
    req,
  );
  sendSuccess(res, result, 'Pending collections retrieved');
});
