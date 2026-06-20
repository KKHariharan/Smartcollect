import type { ClientSession } from 'mongoose';
import { Counter } from '../models/Counter';

export async function nextSequence(name: string, session?: ClientSession): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session },
  );
  return counter.seq;
}

export async function generateCode(
  prefix: string,
  sequenceName: string,
  padLength = 6,
  session?: ClientSession,
): Promise<string> {
  const seq = await nextSequence(sequenceName, session);
  return `${prefix}-${String(seq).padStart(padLength, '0')}`;
}
