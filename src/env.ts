export function requireBooleanEnv(
  name: string,
  defaultValue = false
): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === "true";
}
