import { vi } from 'vitest';

export interface FakeStore {
  data: Record<string, unknown>;
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
}

function dotGet(data: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }

    return undefined;
  }, data);
}

function dotSet(
  data: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  const parts = key.split('.');
  const last = parts.pop()!;
  const target = parts.reduce<Record<string, unknown>>((acc, part) => {
    if (!acc[part] || typeof acc[part] !== 'object') {
      acc[part] = {};
    }

    return acc[part] as Record<string, unknown>;
  }, data);

  target[last] = value;
}

export function makeStore(initial: Record<string, unknown> = {}): FakeStore {
  const data: Record<string, unknown> = structuredClone(initial);

  return {
    data,
    get: (key) => dotGet(data, key),
    set: (key, value) => dotSet(data, key, value),
  };
}

export interface FakeEvent {
  reply: ReturnType<typeof vi.fn>;
  replies: { channel: string; args: unknown[] }[];
}

export function makeEvent(): FakeEvent {
  const replies: { channel: string; args: unknown[] }[] = [];
  const reply = vi.fn((channel: string, ...args: unknown[]) => {
    replies.push({ channel, args });
  });

  return { reply, replies };
}

export function lastReply(event: FakeEvent, channel: string) {
  const matching = event.replies.filter((r) => r.channel === channel);

  return matching[matching.length - 1];
}
