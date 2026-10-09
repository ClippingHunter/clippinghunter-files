// Tests for mirror-ytdlp.mjs: `node --test scripts/mirror-ytdlp.test.mjs`
// The signature tests need gpg + gpgv (GitHub's Ubuntu runners and Git for Windows have both).
import assert from 'node:assert/strict'
import { appendFileSync, copyFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  LATEST_FORMAT,
  SIGNING_KEY,
  compareVersions,
  copyleftPlan,
  findPins,
  latestRecord,
  packageName,
  parseComponents,
  parsePins,
  parseSums,
  releaseNotes,
  verifySignature,
} from './mirror-ytdlp.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const keyFile = join(here, '..', 'ytdlp', 'yt-dlp-signing-key.asc')

/** A folder with the real, signed SHA2-256SUMS of yt-dlp 2026.08.19. */
function signedFolder() {
  const work = mkdtempSync(join(tmpdir(), 'ytdlp-sig-'))
  for (const f of ['SHA2-256SUMS', 'SHA2-256SUMS.sig']) copyFileSync(join(here, 'test-fixtures', f), join(work, f))
  return work
}

test('verifySignature accepts the real signed checksums', () => {
  verifySignature(signedFolder(), keyFile)
})

test('verifySignature rejects checksums changed after signing', () => {
  const work = signedFolder()
  appendFileSync(join(work, 'SHA2-256SUMS'), `${'0'.repeat(64)}  evil.exe\n`)
  assert.throws(() => verifySignature(work, keyFile), /gak valid/)
})

test('verifySignature rejects a signature by another key than the pinned one', () => {
  assert.throws(() => verifySignature(signedFolder(), keyFile, 'F'.repeat(40)), /gak valid/)
})

const dashes = '-'.repeat(80)
const licenses = [
  'THIRD-PARTY LICENSES',
  '',
  dashes,
  'Python | PSF-2.0',
  'URL: https://www.python.org/',
  dashes,
  'some text | not a header',
  dashes,
  'GNU Readline | GPL-3.0-or-later',
  dashes,
  'libgcc | GPL-3.0-with-GCC-exception',
  dashes,
  'libidn2 (Unicode character data files) | Unicode-TOU AND Unicode-DFS-2016',
  dashes,
  'mutagen | GPL-2.0-or-later',
  dashes,
  'certifi | MPL-2.0',
  dashes,
  'requests | Apache-2.0',
  dashes,
].join('\n')

test('parseSums reads "hash  name" lines, also with "*"', () => {
  const sums = parseSums(`${'a'.repeat(64)}  yt-dlp.exe\r\n${'B'.repeat(64)} *yt-dlp.tar.gz\nnonsense\n`)
  assert.equal(sums.get('yt-dlp.exe'), 'a'.repeat(64))
  assert.equal(sums.get('yt-dlp.tar.gz'), 'b'.repeat(64))
  assert.equal(sums.size, 2)
})

test('parseComponents takes "name | license" right after a line of dashes', () => {
  const found = parseComponents(licenses)
  assert.deepEqual(
    found.map((c) => c.name),
    ['Python', 'some text', 'GNU Readline', 'libgcc', 'libidn2 (Unicode character data files)', 'mutagen', 'certifi', 'requests'],
  )
  assert.equal(found.find((c) => c.name === 'certifi').license, 'MPL-2.0')
})

test('parsePins joins continued lines and keeps every hash', () => {
  const text = [
    'brotli==1.2.0 ; implementation_name == \'cpython\' \\',
    '    --hash=sha256:' + '1'.repeat(64) + ' \\',
    '    --hash=sha256:' + '2'.repeat(64),
    '    # via yt-dlp',
    'Mutagen==1.48.1 \\',
    '    --hash=sha256:' + '3'.repeat(64),
    'websockets==16.1.1 ; python_full_version < \'3.11\' \\',
    '    --hash=sha256:' + '4'.repeat(64),
    'websockets==17.0.1 ; python_full_version >= \'3.11\' \\',
    '    --hash=sha256:' + '5'.repeat(64),
  ].join('\r\n')
  const pins = parsePins(text)
  assert.deepEqual(pins.map((p) => `${p.name}==${p.version}`), [
    'brotli==1.2.0',
    'mutagen==1.48.1',
    'websockets==16.1.1',
    'websockets==17.0.1',
  ])
  assert.deepEqual(pins[0].hashes, ['1'.repeat(64), '2'.repeat(64)])
  assert.equal(packageName('PyCryptodome_X.tools'), 'pycryptodome-x-tools')
})

test('findPins merges the same version from several files', () => {
  const a = `mutagen==1.48.1 \\\n    --hash=sha256:${'a'.repeat(64)}\n`
  const b = `mutagen==1.48.1 \\\n    --hash=sha256:${'b'.repeat(64)}\ncertifi==2026.7.22\n`
  assert.deepEqual(findPins([a, b], 'mutagen'), [{ version: '1.48.1', hashes: ['a'.repeat(64), 'b'.repeat(64)] }])
  assert.deepEqual(findPins([a, b], 'certifi'), [{ version: '2026.7.22', hashes: [] }])
  assert.deepEqual(findPins([a], 'requests'), [])
})

test('compareVersions orders dated versions and hotfix suffixes', () => {
  assert.equal(compareVersions('2026.08.19', '2026.08.19'), 0)
  assert.equal(compareVersions('2026.08.19.1', '2026.08.19'), 1)
  assert.equal(compareVersions('2026.08.19', '2026.10.01'), -1)
  assert.equal(compareVersions('2027.01.02', '2026.12.31'), 1)
})

test('copyleftPlan mirrors bundled copyleft sources and ignores permissive ones', () => {
  const exe = Buffer.from('...PYZ mutagen._file certifi.core cacert.pem libcrypto-1_1.dll...', 'latin1')
  const plan = copyleftPlan(parseComponents(licenses), exe)
  assert.deepEqual(plan.problems, [])
  assert.deepEqual(plan.sources.map((s) => `${s.pypi} (${s.license})`), ['mutagen (GPL-2.0-or-later)', 'certifi (MPL-2.0)'])
})

test('copyleftPlan stops on an unknown copyleft component', () => {
  const text = `${licenses}\nnewlib | LGPL-2.1-or-later\n${dashes}\n`
  const plan = copyleftPlan(parseComponents(text), Buffer.from('nothing'))
  assert.equal(plan.problems.length, 1)
  assert.match(plan.problems[0], /newlib \(LGPL-2\.1-or-later\)/)
})

test('copyleftPlan stops when a "Linux only" component is inside the exe', () => {
  const plan = copyleftPlan(parseComponents(licenses), Buffer.from('... LIBGCC_S_SEH-1.DLL ...', 'latin1'))
  assert.equal(plan.problems.length, 1)
  assert.match(plan.problems[0], /^libgcc/)
})

test('latestRecord points at our copy and the official one', () => {
  const record = latestRecord({
    tag: '2026.08.19',
    publishedAt: '2026-08-19T23:48:43Z',
    exe: { bytes: 17840399, sha256: 'f'.repeat(64) },
    now: '2026-10-09T00:00:00.000Z',
  })
  assert.equal(record.format, LATEST_FORMAT)
  assert.equal(record.version, '2026.08.19')
  assert.equal(record.signingKey, SIGNING_KEY)
  assert.equal(
    record.exe.url,
    'https://github.com/officialgercepai/clippinghunter-files/releases/download/ytdlp-2026.08.19/yt-dlp.exe',
  )
  assert.equal(record.exe.officialUrl, 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19/yt-dlp.exe')
  assert.equal(record.exe.sha256, 'f'.repeat(64))
})

test('releaseNotes lists every file with its SHA-256 and the source directions', () => {
  const notes = releaseNotes({
    tag: '2026.08.19',
    publishedAt: '2026-08-19T23:48:43Z',
    files: [
      { name: 'yt-dlp.exe', about: 'program', sha256: '1'.repeat(64) },
      { name: 'mutagen-1.48.1.tar.gz', about: 'source', sha256: '2'.repeat(64) },
    ],
    sources: [{ name: 'mutagen-1.48.1.tar.gz', license: 'GPL-2.0-or-later' }],
  })
  assert.match(notes, /\| `yt-dlp\.exe` \| program \| `1{64}` \|/)
  assert.match(notes, /`mutagen-1\.48\.1\.tar\.gz` \(GPL-2\.0-or-later\)/)
  assert.match(notes, /AC0C BBE6 848D 6A87 3464 AF4E 57CF 6593 3B5A 7581/)
  assert.match(notes, /yt-dlp-2026\.08\.19-repo\.tar\.gz/)
  assert.match(notes, /dirilis 2026-08-19/)
})
