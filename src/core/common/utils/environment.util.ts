export function envOrDefault<T>(
  value: string | undefined,
  fallback: T,
): string | T {
  return value === undefined || value === '' ? fallback : value;
}
