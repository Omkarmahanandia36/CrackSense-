/**
 * Semantic Versioning comparison utilities for CrackSense in-app updates.
 * Robust against leading 'v', pre-release identifiers, uneven dot segments, and malformed inputs.
 */

export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  raw: string;
  isValid: boolean;
}

/**
 * Clean and parse a semantic version string.
 */
export function parseSemver(versionStr?: string | null): ParsedSemver {
  if (!versionStr || typeof versionStr !== 'string') {
    return { major: 0, minor: 0, patch: 0, raw: '', isValid: false };
  }

  const raw = versionStr.trim();
  const clean = raw.startsWith('v') || raw.startsWith('V') ? raw.slice(1) : raw;
  const [core, prerelease] = clean.split('-', 2);

  const parts = core.split('.').map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : Math.max(0, num);
  });

  const isValid = /^\d+(\.\d+)*(-[\w.-]+)?$/.test(clean);

  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
    prerelease: prerelease ? prerelease.trim() : undefined,
    raw,
    isValid,
  };
}

/**
 * Compare two semantic version strings.
 * Returns:
 *   1 if v1 > v2 (v1 is newer than v2)
 *  -1 if v1 < v2 (v1 is older than v2)
 *   0 if v1 == v2 (equal versions)
 */
export function compareSemver(v1?: string | null, v2?: string | null): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  // If one is completely invalid and the other is valid
  if (!p1.isValid && p2.isValid) return -1;
  if (p1.isValid && !p2.isValid) return 1;
  if (!p1.isValid && !p2.isValid) return 0;

  if (p1.major !== p2.major) return p1.major > p2.major ? 1 : -1;
  if (p1.minor !== p2.minor) return p1.minor > p2.minor ? 1 : -1;
  if (p1.patch !== p2.patch) return p1.patch > p2.patch ? 1 : -1;

  // Prerelease comparison: normal release is greater than prerelease (1.0.0 > 1.0.0-rc.1)
  if (!p1.prerelease && p2.prerelease) return 1;
  if (p1.prerelease && !p2.prerelease) return -1;
  if (p1.prerelease && p2.prerelease) {
    if (p1.prerelease === p2.prerelease) return 0;
    return p1.prerelease.localeCompare(p2.prerelease);
  }

  return 0;
}

/**
 * Returns true if installed version is strictly less than target version.
 */
export function isVersionOlder(installed?: string | null, target?: string | null): boolean {
  if (!target) return false;
  return compareSemver(installed, target) < 0;
}

/**
 * Returns true if installed version is strictly greater than target version.
 */
export function isVersionNewer(installed?: string | null, target?: string | null): boolean {
  if (!target) return false;
  return compareSemver(installed, target) > 0;
}

/**
 * Returns true if both versions are semantically identical.
 */
export function isVersionEqual(v1?: string | null, v2?: string | null): boolean {
  return compareSemver(v1, v2) === 0;
}
