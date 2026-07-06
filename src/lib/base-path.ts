export const BASE_PATH = "/demo/b2b-ecommerce";

export function stripBasePath(pathname: string): string {
  if (pathname === BASE_PATH) {
    return "/";
  }

  if (pathname.startsWith(`${BASE_PATH}/`)) {
    return pathname.slice(BASE_PATH.length) || "/";
  }

  return pathname;
}

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

export function assetPath(path: string | null | undefined): string {
  if (!path) {
    return withBasePath("/products/not-available.png");
  }

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  if (path.startsWith(BASE_PATH)) {
    return path;
  }

  return withBasePath(path.startsWith("/") ? path : `/${path}`);
}
