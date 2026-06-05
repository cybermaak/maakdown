export interface AssetReference {
  id: string;
  rawPath: string;
  url?: string;
  error?: string;
}

export function shouldResolveAsset(rawPath: string): boolean {
  return rawPath.length > 0 && !rawPath.startsWith('http://') && !rawPath.startsWith('https://');
}
