export const BASE_PATH = "/demo/b2b-ecommerce";

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) {
    return `${BASE_PATH}/${path}`;
  }

  return `${BASE_PATH}${path}`;
}

export function apiPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return withBasePath(normalized.startsWith("/api") ? normalized : `/api${normalized}`);
}
