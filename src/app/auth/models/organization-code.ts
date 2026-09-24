/** 3-30 chars: lowercase letters, digits and hyphens, no leading/trailing hyphen. */
export const ORGANIZATION_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export function normalizeOrganizationCode(code: string): string {
  return code.trim().toLowerCase();
}
