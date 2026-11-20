import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSemver,
  compareSemver,
  isVersionOlder,
  isVersionNewer,
  isVersionEqual,
} from './semver.ts';

test('Semver Parsing', async (t) => {
  await t.test('parses clean 3-part semver', () => {
    const res = parseSemver('1.2.3');
    assert.equal(res.major, 1);
    assert.equal(res.minor, 2);
    assert.equal(res.patch, 3);
    assert.equal(res.isValid, true);
  });

  await t.test('handles leading v or V prefix', () => {
    const res1 = parseSemver('v2.0.4');
    assert.equal(res1.major, 2);
    assert.equal(res1.minor, 0);
    assert.equal(res1.patch, 4);
    assert.equal(res1.isValid, true);

    const res2 = parseSemver('V3.1.0');
    assert.equal(res2.major, 3);
    assert.equal(res2.isValid, true);
  });

  await t.test('handles missing patch segment gracefully', () => {
    const res = parseSemver('1.5');
    assert.equal(res.major, 1);
    assert.equal(res.minor, 5);
    assert.equal(res.patch, 0);
    assert.equal(res.isValid, true);
  });

  await t.test('parses prerelease tags', () => {
    const res = parseSemver('1.0.0-rc.2');
    assert.equal(res.major, 1);
    assert.equal(res.prerelease, 'rc.2');
  });

  await t.test('handles malformed or non-string inputs safely without throwing', () => {
    const res1 = parseSemver('malformed');
    assert.equal(res1.isValid, false);
    assert.equal(res1.major, 0);

    const res2 = parseSemver('');
    assert.equal(res2.isValid, false);

    const res3 = parseSemver(null);
    assert.equal(res3.isValid, false);

    const res4 = parseSemver(undefined as any);
    assert.equal(res4.isValid, false);
  });
});

test('Semver Equal Comparisons', async (t) => {
  await t.test('identical versions are equal', () => {
    assert.equal(compareSemver('1.0.0', '1.0.0'), 0);
    assert.equal(isVersionEqual('1.0.0', '1.0.0'), true);
  });

  await t.test('leading v matches non-v', () => {
    assert.equal(compareSemver('v1.0.0', '1.0.0'), 0);
    assert.equal(compareSemver('1.2.3', 'V1.2.3'), 0);
    assert.equal(isVersionEqual('v1.0.0', '1.0.0'), true);
  });

  await t.test('two-part version matches three-part with zero patch', () => {
    assert.equal(compareSemver('1.2', '1.2.0'), 0);
    assert.equal(isVersionEqual('1.2', '1.2.0'), true);
  });
});

test('Semver Newer and Older Comparisons', async (t) => {
  await t.test('major version differences', () => {
    assert.equal(compareSemver('2.0.0', '1.9.9'), 1);
    assert.equal(compareSemver('1.9.9', '2.0.0'), -1);
    assert.equal(isVersionNewer('2.0.0', '1.9.9'), true);
    assert.equal(isVersionOlder('1.9.9', '2.0.0'), true);
  });

  await t.test('minor version differences', () => {
    assert.equal(compareSemver('1.1.0', '1.0.9'), 1);
    assert.equal(compareSemver('1.0.0', '1.1.0'), -1);
    assert.equal(isVersionOlder('1.0.0', '1.1.0'), true);
    assert.equal(isVersionNewer('1.1.0', '1.0.0'), true);
  });

  await t.test('patch version differences', () => {
    assert.equal(compareSemver('1.0.1', '1.0.0'), 1);
    assert.equal(compareSemver('1.0.0', '1.0.1'), -1);
    assert.equal(isVersionOlder('1.0.0', '1.0.1'), true);
  });

  await t.test('full release is newer than pre-release of same core version', () => {
    assert.equal(compareSemver('1.0.0', '1.0.0-beta.1'), 1);
    assert.equal(compareSemver('1.0.0-beta.1', '1.0.0'), -1);
  });
});

test('Missing Rows, Nulls, and Malformed Versions (Edge Cases)', async (t) => {
  await t.test('null target does not trigger update', () => {
    assert.equal(isVersionOlder('1.0.0', null), false);
    assert.equal(isVersionOlder('1.0.0', undefined), false);
    assert.equal(isVersionOlder('1.0.0', ''), false);
  });

  await t.test('null installed with valid target treats installed as older', () => {
    assert.equal(isVersionOlder(null, '1.0.0'), true);
    assert.equal(isVersionOlder('', '1.0.0'), true);
  });

  await t.test('both inputs null or malformed', () => {
    assert.equal(compareSemver(null, null), 0);
    assert.equal(compareSemver('invalid', 'garbage'), 0);
    assert.equal(isVersionOlder('invalid', 'garbage'), false);
    assert.equal(isVersionNewer('invalid', 'garbage'), false);
  });

  await t.test('malformed target against valid installed', () => {
    assert.equal(isVersionOlder('1.0.0', 'invalid-version'), false);
    assert.equal(compareSemver('1.0.0', 'invalid-version'), 1);
  });
});

test('In-App Update Workflow Scenarios', async (t) => {
  await t.test('Scenario 1: Update Available (installed < latest, installed >= min)', () => {
    const installed = '1.0.0';
    const latest = '1.2.0';
    const minSupported = '1.0.0';

    const hasUpdate = isVersionOlder(installed, latest);
    const isBlocking = isVersionOlder(installed, minSupported);

    assert.equal(hasUpdate, true, 'User should see update available icon');
    assert.equal(isBlocking, false, 'User should NOT be blocked from using the app');
  });

  await t.test('Scenario 2: Blocking Update Required (installed < min_supported)', () => {
    const installed = '0.9.0';
    const latest = '2.0.0';
    const minSupported = '1.0.0';

    const hasUpdate = isVersionOlder(installed, latest);
    const isBlocking = isVersionOlder(installed, minSupported);

    assert.equal(hasUpdate, true);
    assert.equal(isBlocking, true, 'User MUST be blocked with mandatory update screen');
  });

  await t.test('Scenario 3: App Up to Date (installed == latest)', () => {
    const installed = '1.2.0';
    const latest = '1.2.0';
    const minSupported = '1.0.0';

    const hasUpdate = isVersionOlder(installed, latest);
    const isBlocking = isVersionOlder(installed, minSupported);

    assert.equal(hasUpdate, false, 'App should show up-to-date state');
    assert.equal(isBlocking, false);
  });

  await t.test('Scenario 4: Missing Database Row / Offline (null returned)', () => {
    const installed = '1.0.0';
    const row = null; // Supabase returned no data

    const latest = (row as any)?.latest_version;
    const minSupported = (row as any)?.min_supported_version;

    const hasUpdate = Boolean(latest && isVersionOlder(installed, latest));
    const isBlocking = Boolean(minSupported && isVersionOlder(installed, minSupported));

    assert.equal(hasUpdate, false, 'Offline/missing row must not trigger fake update');
    assert.equal(isBlocking, false, 'Offline/missing row must not block user');
  });
});
