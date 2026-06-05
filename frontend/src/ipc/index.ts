import type { AppConfig } from '../stores/configStore';

type GoMethod = (...args: unknown[]) => Promise<unknown>;
type GoService = Record<string, GoMethod>;
type GoPackage = Record<string, GoService>;
type GoNamespace = Record<string, GoPackage>;

function goNamespace(): GoNamespace {
  return (window.go ?? {}) as GoNamespace;
}

function requireMethod(namespace: string, service: string, method: string) {
  const fn = goNamespace()[namespace]?.[service]?.[method];
  if (!fn) {
    throw new Error(`Wails binding ${namespace}.${service}.${method} is unavailable`);
  }
  return fn;
}

export async function openDocumentAt(path: string) {
  return requireMethod('main', 'Service', 'OpenDocumentAt')(path);
}

export async function getConfig(): Promise<AppConfig> {
  return requireMethod('config', 'Service', 'GetConfig')() as Promise<AppConfig>;
}

export async function setConfig(config: AppConfig): Promise<AppConfig> {
  return requireMethod('config', 'Service', 'SetConfig')(config) as Promise<AppConfig>;
}
