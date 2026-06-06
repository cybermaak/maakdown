const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export function formatMetadata(value: unknown): string {
  if (value instanceof Date) return dateFormatter.format(value);
  if (Array.isArray(value)) return value.map(formatMetadata).join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value == null) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) return dateFormatter.format(date);
  }
  return String(value);
}

export function metadataTone(key: string, value: unknown): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (key.toLowerCase() !== 'status') return 'neutral';
  const normalized = String(value).toLowerCase();
  if (['done', 'complete', 'approved', 'active'].includes(normalized)) return 'success';
  if (['blocked', 'failed', 'rejected'].includes(normalized)) return 'danger';
  if (['draft', 'review', 'pending'].includes(normalized)) return 'warning';
  return 'info';
}
