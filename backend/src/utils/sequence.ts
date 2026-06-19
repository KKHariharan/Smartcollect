import { Counter } from '../models/Counter';

export async function nextSequence(name: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return counter.seq;
}

export async function generateCode(
  prefix: string,
  sequenceName: string,
  padLength = 6,
): Promise<string> {
  const seq = await nextSequence(sequenceName);
  return `${prefix}-${String(seq).padStart(padLength, '0')}`;
}
