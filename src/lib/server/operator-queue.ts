import "server-only";

const shared = globalThis as typeof globalThis & { vibeOperatorQueue?: Promise<unknown> };

/** One Railway replica shares a transaction queue across commits and the keeper. */
export function serializeOperator<T>(work: () => Promise<T>): Promise<T> {
  const result = (shared.vibeOperatorQueue ?? Promise.resolve()).catch(() => undefined).then(work);
  shared.vibeOperatorQueue = result.then(() => undefined, () => undefined);
  return result;
}
