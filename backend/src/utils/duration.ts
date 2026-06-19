const UNIT_TO_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
} as const;

type DurationUnit = keyof typeof UNIT_TO_MS;

export function parseDurationToMs(input: string): number {
  const match = /^(\d+)\s*(s|m|h|d|w)$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration string: ${input}`);
  }
  const amount = Number(match[1]);
  const unit = match[2] as DurationUnit;
  return amount * UNIT_TO_MS[unit];
}
