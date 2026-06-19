import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/app';
import { connectDB } from '../src/config/db';

const app = createApp();

let dbConnection: Promise<unknown> | null = null;

function ensureDbConnected(): Promise<unknown> {
  if (!dbConnection) {
    dbConnection = connectDB();
  }
  return dbConnection;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await ensureDbConnected();
  app(req, res);
}
