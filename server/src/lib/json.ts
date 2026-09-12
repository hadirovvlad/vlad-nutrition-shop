/**
 * SQLite stores our list/object columns as JSON text. These helpers keep the
 * parsing in one place so a malformed row can never crash a request.
 */

export function parseStringList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export type Spec = { label: string; value: string };

export function parseSpecs(raw: string | null | undefined): Spec[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is Spec =>
          !!item && typeof item.label === 'string' && typeof item.value === 'string',
      )
      .map((item) => ({ label: item.label, value: item.value }));
  } catch {
    return [];
  }
}

export function stringifyList(list: unknown): string {
  return JSON.stringify(Array.isArray(list) ? list : []);
}
