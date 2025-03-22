export function getParamName(path: string): string {
  const match = path.match(/\[([^\]]+)\]/);
  return match ? match[1] : "";
}

export function interpolatePath(
  path: string,
  params: Record<string, string>
): string {
  return path.replace(/\[([^\]]+)\]/g, (_, key) => {
    if (!params[key]) {
      throw new Error(`Missing path parameter: ${key}`);
    }
    return params[key];
  });
}
