// Tests for mirror-components.mjs: `node --test scripts/mirror-components.test.mjs`
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkManifest, crc32, readZipEntry, releaseNotes, sha256Of, writeZip, zipEntries } from './mirror-components.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const folder = () => mkdtempSync(join(tmpdir(), 'components-test-'))

test('crc32 matches the zip standard', () => {
  assert.equal(crc32(Buffer.from('The quick brown fox jumps over the lazy dog')), 0x414fa339)
  assert.equal(crc32(Buffer.alloc(0)), 0)
})

test('writeZip → zipEntries/readZipEntry gives back every file exactly', () => {
  const file = join(folder(), 'test.zip')
  const random = Buffer.alloc(5000)
  for (let i = 0; i < random.length; i++) random[i] = (i * 2654435761) >>> 24
  const files = [
    { name: 'a.dll', data: Buffer.from('x'.repeat(100000)) }, // compresses: deflate
    { name: 'b.bin', data: random }, // doesn't: stored
    { name: 'LICENSE.txt', data: Buffer.from('MIT\n') },
  ]
  writeZip(file, files)
  const entries = zipEntries(file)
  assert.deepEqual(entries.map((e) => e.name), ['a.dll', 'b.bin', 'LICENSE.txt'])
  assert.equal(entries[0].method, 8)
  assert.ok(entries[0].compressedBytes < 1000)
  for (const [i, f] of files.entries()) assert.equal(sha256Of(readZipEntry(file, entries[i])), sha256Of(f.data))
})

test('writeZip gives the same bytes for the same files', () => {
  const dir = folder()
  const files = [{ name: 'x.txt', data: Buffer.from('hello hello hello') }]
  writeZip(join(dir, '1.zip'), files)
  writeZip(join(dir, '2.zip'), files)
  assert.equal(sha256Of(readFileSync(join(dir, '1.zip'))), sha256Of(readFileSync(join(dir, '2.zip'))))
})

test('readZipEntry notices a damaged entry', () => {
  const file = join(folder(), 'bad.zip')
  writeZip(file, [{ name: 'a.txt', data: Buffer.from('abcdefgh'.repeat(10)) }])
  const bytes = readFileSync(file)
  bytes[40] ^= 0xff // inside the compressed data
  writeFileSync(file, bytes)
  assert.throws(() => readZipEntry(file, zipEntries(file)[0]))
})

test('the v1 manifest is valid', () => {
  const manifest = JSON.parse(readFileSync(join(here, '..', 'components', 'components-v1.json'), 'utf8'))
  checkManifest(manifest)
  assert.equal(manifest.release, 'components-v1')
})

test('checkManifest says what is wrong', () => {
  assert.throws(
    () =>
      checkManifest({
        release: 'v1',
        assets: [
          { name: 'a.zip', about: 'x', license: 'MIT', from: { url: 'http://x', bytes: 1, sha256: 'z' }, pack: [] },
          { name: 'a.zip', about: 'x', license: 'MIT', from: { url: 'https://x', bytes: 1, sha256: '0'.repeat(64) } },
        ],
      }),
    (e) => /components-v1/.test(e.message) && /https/.test(e.message) && /dobel/.test(e.message) && /pack/.test(e.message),
  )
})

test('releaseNotes lists each asset with size and SHA-256', () => {
  const manifest = {
    release: 'components-v1',
    assets: [{ name: 'm.bin', from: { url: 'https://huggingface.co/x/m.bin' } }],
  }
  const lock = { assets: [{ name: 'm.bin', about: 'model', license: 'MIT', bytes: 487601967, sha256: 'a'.repeat(64) }] }
  const notes = releaseNotes(manifest, lock)
  assert.match(notes, /\| `m\.bin` \| model \| MIT \| 488 MB \| `a{64}` \|/)
  assert.match(notes, /components-v1\.lock\.json/)
  assert.match(notes, /- https:\/\/huggingface\.co\/x\/m\.bin/)
})
