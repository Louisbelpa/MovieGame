export function parseAttempts<T>(raw: string): T[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('not an array');
    return parsed as T[];
  } catch {
    throw Object.assign(new Error('Corrupted session data'), { status: 500 });
  }
}
