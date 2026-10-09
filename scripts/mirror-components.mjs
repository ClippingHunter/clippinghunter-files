#!/usr/bin/env node
// Builds a release of the components the ClippingHunter app downloads on its Setup screen
// (components-vN) from official files. Each asset is either an unchanged copy (the AI models) or a
// zip of chosen files from an official zip (whisper.cpp: only what the app runs, plus license texts).
// Everything is checked against the SHA-256 pinned in the manifest. Sizes + SHA-256 of every asset
// and of every file inside the zips go into <release>.lock.json, uploaded with the release (the app
// pins those) and committed next to the manifest.
// Runs from .github/workflows/components.yml (started by hand). Locally, without uploading anything:
//   node scripts/mirror-components.mjs components/components-v1.json --dry-run [--only a.zip,b.bin] [--out <folder>]
// Log & error messages are Indonesian: they end up in the Actions page and failure emails.

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  appendFileSync,
  closeSync,
  copyFileSync,
  createWriteStream,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import zlib from 'node:zlib'

export const OURS = 'officialgercepai/clippinghunter-files'
export const LOCK_FORMAT = 1
/** Every file in our zips gets this date (2026-01-01 00:00), so the same files always give the same zip. */
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1
const DOS_TIME = 0
const ZIP_LIMIT = 0xffffffff // no zip64: every size and offset must fit in 32 bits

// ---- pure parts (tested) ----

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

/** CRC-32 of a zip entry (Node's own when it has one). */
export function crc32(data) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(data) >>> 0
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export const sha256Of = (data) => createHash('sha256').update(data).digest('hex')

/** Checks the manifest and fills defaults; throws with what's wrong. */
export function checkManifest(manifest) {
  const problems = []
  if (!/^components-v\d+$/.test(manifest.release ?? '')) problems.push('"release" harus kayak "components-v1".')
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) problems.push('"assets" kosong.')
  const names = new Set()
  for (const [i, a] of (manifest.assets ?? []).entries()) {
    const at = `assets[${i}] (${a.name ?? '?'})`
    if (!/^[\w.+-]+$/.test(a.name ?? '')) problems.push(`${at}: "name" cuma boleh huruf, angka, titik, strip.`)
    if (names.has(a.name)) problems.push(`${at}: nama dobel.`)
    names.add(a.name)
    if (!a.about || !a.license) problems.push(`${at}: "about" & "license" wajib diisi.`)
    const from = a.from ?? {}
    if (!/^https:\/\//.test(from.url ?? '') || !Number.isInteger(from.bytes) || !/^[0-9a-f]{64}$/.test(from.sha256 ?? '')) {
      problems.push(`${at}: "from" butuh url https, bytes & sha256.`)
    }
    if (a.pack !== undefined) {
      if (!a.name.endsWith('.zip')) problems.push(`${at}: aset "pack" namanya harus .zip.`)
      if (!Array.isArray(a.pack) || a.pack.length === 0 || a.pack.some((f) => !/^[\w.+-]+$/.test(f))) {
        problems.push(`${at}: "pack" = daftar nama file di zip resmi.`)
      }
      for (const e of a.extra ?? []) {
        if (!/^[\w.+-]+$/.test(e.name ?? '')) problems.push(`${at}: extra "${e.name}" namanya salah.`)
        if (e.text === undefined && !(/^https:\/\//.test(e.url ?? '') && /^[0-9a-f]{64}$/.test(e.sha256 ?? ''))) {
          problems.push(`${at}: extra "${e.name}" butuh "text", atau "url" + "sha256".`)
        }
      }
    } else if (a.extra) {
      problems.push(`${at}: "extra" cuma buat aset "pack".`)
    }
  }
  if (problems.length) throw new Error(`Manifest komponen salah:\n- ${problems.join('\n- ')}`)
  return manifest
}

/** Reads the entries of a zip file (its central directory). */
export function zipEntries(file) {
  const fd = openSync(file, 'r')
  try {
    const size = statSync(file).size
    const tailSize = Math.min(size, 65557)
    const tail = Buffer.alloc(tailSize)
    readSync(fd, tail, 0, tailSize, size - tailSize)
    let eocd = -1
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === 0x06054b50) {
        eocd = i
        break
      }
    }
    if (eocd < 0) throw new Error(`${basename(file)} bukan file zip.`)
    const count = tail.readUInt16LE(eocd + 10)
    const cdSize = tail.readUInt32LE(eocd + 12)
    const cdOffset = tail.readUInt32LE(eocd + 16)
    const cd = Buffer.alloc(cdSize)
    readSync(fd, cd, 0, cdSize, cdOffset)
    const entries = []
    let p = 0
    for (let n = 0; n < count; n++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) throw new Error(`Daftar isi ${basename(file)} rusak.`)
      const nameLength = cd.readUInt16LE(p + 28)
      entries.push({
        name: cd.toString('utf8', p + 46, p + 46 + nameLength),
        method: cd.readUInt16LE(p + 10),
        crc: cd.readUInt32LE(p + 16),
        compressedBytes: cd.readUInt32LE(p + 20),
        bytes: cd.readUInt32LE(p + 24),
        offset: cd.readUInt32LE(p + 42),
      })
      p += 46 + nameLength + cd.readUInt16LE(p + 30) + cd.readUInt16LE(p + 32)
    }
    return entries
  } finally {
    closeSync(fd)
  }
}

/** The bytes of one zip entry, checked against its CRC-32 and size. */
export function readZipEntry(file, entry) {
  const fd = openSync(file, 'r')
  try {
    const header = Buffer.alloc(30)
    readSync(fd, header, 0, 30, entry.offset)
    if (header.readUInt32LE(0) !== 0x04034b50) throw new Error(`Isi ${entry.name} di ${basename(file)} rusak.`)
    const start = entry.offset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28)
    const packed = Buffer.alloc(entry.compressedBytes)
    readSync(fd, packed, 0, entry.compressedBytes, start)
    const data = entry.method === 0 ? packed : entry.method === 8 ? zlib.inflateRawSync(packed) : null
    if (!data) throw new Error(`${entry.name}: cara kompres zip ${entry.method} gak dikenal.`)
    if (data.length !== entry.bytes || crc32(data) !== entry.crc) throw new Error(`${entry.name} di ${basename(file)} rusak (CRC).`)
    return data
  } finally {
    closeSync(fd)
  }
}

/**
 * Writes a zip of `entries` ([{ name, data }], in that order) to `file`: deflate (or stored when
 * that's not smaller), a fixed date and no extras, so the same files always give the same bytes.
 */
export function writeZip(file, entries) {
  const fd = openSync(file, 'w')
  const central = []
  let offset = 0
  const put = (buffer) => {
    writeSync(fd, buffer)
    offset += buffer.length
  }
  try {
    for (const { name, data } of entries) {
      const nameBytes = Buffer.from(name, 'utf8')
      const deflated = zlib.deflateRawSync(data, { level: 9 })
      const stored = deflated.length >= data.length
      const body = stored ? data : deflated
      const crc = crc32(data)
      if (data.length > ZIP_LIMIT || offset + body.length > ZIP_LIMIT) throw new Error(`${basename(file)} kegedean buat zip biasa (maks 4 GB).`)
      const local = Buffer.alloc(30)
      local.writeUInt32LE(0x04034b50, 0)
      local.writeUInt16LE(20, 4)
      local.writeUInt16LE(0x0800, 6) // UTF-8 names
      local.writeUInt16LE(stored ? 0 : 8, 8)
      local.writeUInt16LE(DOS_TIME, 10)
      local.writeUInt16LE(DOS_DATE, 12)
      local.writeUInt32LE(crc, 14)
      local.writeUInt32LE(body.length, 18)
      local.writeUInt32LE(data.length, 22)
      local.writeUInt16LE(nameBytes.length, 26)
      local.writeUInt16LE(0, 28)
      const entryOffset = offset
      put(local)
      put(nameBytes)
      put(body)
      const record = Buffer.alloc(46)
      record.writeUInt32LE(0x02014b50, 0)
      record.writeUInt16LE(20, 4)
      record.writeUInt16LE(20, 6)
      record.writeUInt16LE(0x0800, 8)
      record.writeUInt16LE(stored ? 0 : 8, 10)
      record.writeUInt16LE(DOS_TIME, 12)
      record.writeUInt16LE(DOS_DATE, 14)
      record.writeUInt32LE(crc, 16)
      record.writeUInt32LE(body.length, 20)
      record.writeUInt32LE(data.length, 24)
      record.writeUInt16LE(nameBytes.length, 28)
      record.writeUInt32LE(entryOffset, 42)
      central.push(record, nameBytes)
    }
    const cdOffset = offset
    for (const part of central) put(part)
    const end = Buffer.alloc(22)
    end.writeUInt32LE(0x06054b50, 0)
    end.writeUInt16LE(entries.length, 8)
    end.writeUInt16LE(entries.length, 10)
    end.writeUInt32LE(offset - cdOffset, 12)
    end.writeUInt32LE(cdOffset, 16)
    put(end)
  } finally {
    closeSync(fd)
  }
}

const mb = (bytes) => `${(bytes / 1e6).toFixed(bytes < 10e6 ? 1 : 0)} MB`

/** Release notes (Indonesian, shown on the release page). */
export function releaseNotes(manifest, lock) {
  const lockName = `${manifest.release}.lock.json`
  const rows = lock.assets.map(
    (a) => `| \`${a.name}\` | ${a.about} | ${a.license} | ${mb(a.bytes)} | \`${a.sha256}\` |`,
  )
  const sources = [...new Set(manifest.assets.map((a) => a.from.url))].map((url) => `- ${url}`)
  return [
    `Komponen yang didownload app ClippingHunter di layar Setup (**${manifest.release}**). File di sini cuma`,
    'salinan: file resmi dicek dulu SHA-256-nya, terus disalin apa adanya (model AI) atau diambil file yang',
    'dipakai app aja dari zip resmi + teks lisensinya (whisper.cpp). Ukuran & SHA-256 tiap file di dalam zip:',
    `\`${lockName}\` (app ngecek pakai angka-angka itu).`,
    '',
    '| File | Isi | Lisensi | Ukuran | SHA-256 |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    'Sumber resmi:',
    ...sources,
    '',
    '_Dibikin otomatis oleh GitHub Actions (`.github/workflows/components.yml`). Isi rilis ini gak pernah',
    'diubah: komponen baru = rilis baru._',
    '',
  ].join('\n')
}

// ---- network & programs ----

const token = () => process.env.GH_TOKEN || process.env.GITHUB_TOKEN || ''
// The token only ever goes to the GitHub API, never to download hosts.
const headersFor = (url) => ({
  'User-Agent': 'clippinghunter-files-components',
  ...(token() && new URL(url).hostname === 'api.github.com' ? { Authorization: `Bearer ${token()}` } : {}),
})
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

async function getJson(url, { allow404 = false } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json', ...headersFor(url) } })
      if (res.status === 404 && allow404) return null
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return await res.json()
    } catch (e) {
      if (attempt >= 3) throw new Error(`Gagal baca ${url}: ${e.message}`)
      await sleep(attempt * 3000)
    }
  }
}

async function download(url, file, bytes) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: headersFor(url) })
      if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText}`)
      await pipeline(Readable.fromWeb(res.body), createWriteStream(file))
      const size = statSync(file).size
      if (bytes != null && size !== bytes) throw new Error(`ukurannya ${size} byte, harusnya ${bytes}`)
      return
    } catch (e) {
      if (attempt >= 3) throw new Error(`Gagal download ${url}: ${e.message}`)
      await sleep(attempt * 5000)
    }
  }
}

function sha256File(file) {
  const hash = createHash('sha256')
  const fd = openSync(file, 'r')
  try {
    const chunk = Buffer.alloc(8 << 20)
    let n
    while ((n = readSync(fd, chunk, 0, chunk.length, null)) > 0) hash.update(chunk.subarray(0, n))
  } finally {
    closeSync(fd)
  }
  return hash.digest('hex')
}

function run(cmd, args, { cwd, allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64 << 20 })
  if (r.error) throw new Error(`Gagal jalanin ${cmd}: ${r.error.message}`)
  if (r.status !== 0 && !allowFail) throw new Error(`${cmd} ${args[0]} gagal (kode ${r.status}): ${(r.stderr || r.stdout || '').trim()}`)
  return r
}

function commitAndPush(repoDir, files, message) {
  if (process.env.GITHUB_ACTIONS) {
    run('git', ['config', 'user.name', 'github-actions[bot]'], { cwd: repoDir })
    run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], { cwd: repoDir })
  }
  run('git', ['add', ...files], { cwd: repoDir })
  if (run('git', ['diff', '--cached', '--quiet'], { cwd: repoDir, allowFail: true }).status === 0) return false
  run('git', ['commit', '-q', '-m', message], { cwd: repoDir })
  if (run('git', ['push', '-q'], { cwd: repoDir, allowFail: true }).status !== 0) {
    run('git', ['pull', '-q', '--rebase'], { cwd: repoDir })
    run('git', ['push', '-q'], { cwd: repoDir })
  }
  return true
}

function parseArgs(argv) {
  const opts = { manifest: '', dryRun: false, only: null, out: '' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') opts.dryRun = true
    else if (a === '--only') opts.only = new Set((argv[++i] ?? '').split(',').filter(Boolean))
    else if (a === '--out') opts.out = argv[++i] ?? ''
    else if (!a.startsWith('--') && !opts.manifest) opts.manifest = a
    else throw new Error(`Opsi gak dikenal: ${a}`)
  }
  if (!opts.manifest) throw new Error('Cara pakai: node scripts/mirror-components.mjs components/components-vN.json [--dry-run]')
  return opts
}

async function main(argv) {
  const opts = parseArgs(argv)
  const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const manifestFile = resolve(repoDir, opts.manifest)
  const manifest = checkManifest(JSON.parse(readFileSync(manifestFile, 'utf8')))
  const lockName = `${manifest.release}.lock.json`
  const lockInRepo = join(dirname(manifestFile), lockName)
  const report = []
  const say = (text) => {
    console.log(text)
    report.push(text)
  }
  const finish = () => {
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Rilis ${manifest.release}\n\n${report.map((l) => `- ${l}`).join('\n')}\n`)
    }
  }
  if (opts.dryRun) say('Mode coba (--dry-run): gak ada yang di-upload atau di-commit.')

  // A published release never changes (the app pins its SHA-256): only its lock may still need committing.
  const existing = await getJson(`https://api.github.com/repos/${OURS}/releases/tags/${manifest.release}`, { allow404: true })
  if (existing) {
    const lockAsset = existing.assets.find((a) => a.name === lockName)
    if (!lockAsset) throw new Error(`Rilis ${manifest.release} udah ada tapi gak lengkap (gak ada ${lockName}). Cek manual.`)
    if (!opts.dryRun) {
      await download(lockAsset.browser_download_url, lockInRepo, lockAsset.size)
      const changed = commitAndPush(repoDir, [lockInRepo], `${manifest.release}: catat isi rilis`)
      say(changed ? `${lockName} dicatat di repo.` : 'Udah ada & udah dicatat, gak ada yang perlu dikerjain.')
    } else say(`Rilis ${manifest.release} udah ada (isinya gak pernah diubah).`)
    finish()
    return
  }

  const work = opts.out ? resolve(opts.out) : mkdtempSync(join(tmpdir(), 'components-'))
  const out = join(work, 'release')
  mkdirSync(out, { recursive: true })
  const wanted = manifest.assets.filter((a) => !opts.only || opts.only.has(a.name))

  // 1. Official files, each downloaded once and checked.
  const downloaded = new Map()
  for (const a of wanted) {
    if (downloaded.has(a.from.url)) continue
    const file = join(work, `from-${downloaded.size}-${basename(new URL(a.from.url).pathname)}`)
    const started = Date.now()
    await download(a.from.url, file, a.from.bytes)
    if (sha256File(file) !== a.from.sha256) throw new Error(`SHA-256 ${a.from.url} gak sama kayak yang dipatok, jadi GAK disalin.`)
    downloaded.set(a.from.url, file)
    say(`Resmi: ${basename(file)} (${mb(a.from.bytes)}, ${Math.round((Date.now() - started) / 1000)} dtk) SHA-256 cocok.`)
  }

  // 2. Our assets: unchanged copies, or zips of the files the app uses (+ license texts).
  const lock = { format: LOCK_FORMAT, release: manifest.release, builtAt: new Date().toISOString(), assets: [] }
  for (const a of wanted) {
    const source = downloaded.get(a.from.url)
    const target = join(out, a.name)
    let files
    if (a.pack) {
      const entries = zipEntries(source)
      files = []
      const contents = []
      for (const name of a.pack) {
        const found = entries.filter((e) => basename(e.name) === name)
        if (found.length !== 1) throw new Error(`${name} ${found.length ? 'ada lebih dari 1' : 'gak ada'} di ${basename(source)}.`)
        const data = readZipEntry(source, found[0])
        files.push({ name, bytes: data.length, sha256: sha256Of(data) })
        contents.push({ name, data })
      }
      for (const e of a.extra ?? []) {
        let data
        if (e.text !== undefined) data = Buffer.from(e.text, 'utf8')
        else {
          const extraFile = join(work, `extra-${e.name}`)
          await download(e.url, extraFile)
          data = readFileSync(extraFile)
          if (sha256Of(data) !== e.sha256) throw new Error(`SHA-256 ${e.url} gak sama kayak yang dipatok.`)
        }
        contents.push({ name: e.name, data })
      }
      writeZip(target, contents)
      // Read back: every file must come out exactly as it went in.
      const check = zipEntries(target)
      for (const f of files) {
        const data = readZipEntry(target, check.find((e) => e.name === f.name))
        if (sha256Of(data) !== f.sha256) throw new Error(`${f.name} di ${a.name} beda pas dibaca ulang.`)
      }
    } else {
      copyFileSync(source, target)
    }
    const asset = {
      name: a.name,
      about: a.about,
      license: a.license,
      url: `https://github.com/${OURS}/releases/download/${manifest.release}/${a.name}`,
      bytes: statSync(target).size,
      sha256: sha256File(target),
      from: a.from,
      ...(files && { files }),
    }
    lock.assets.push(asset)
    say(`${a.name}: ${mb(asset.bytes)}${files ? ` (${files.length} file dari zip resmi)` : ' (salinan persis)'}.`)
  }
  const lockText = `${JSON.stringify(lock, null, 2)}\n`
  writeFileSync(join(out, lockName), lockText)
  const notesFile = join(work, 'release-notes.md')
  writeFileSync(notesFile, releaseNotes({ ...manifest, assets: wanted }, lock))

  // 3. Publish (only after every file is uploaded; never "Latest"), check what GitHub serves, record.
  if (opts.dryRun || opts.only) {
    say(`[coba] Bakal bikin rilis ${manifest.release} (bukan Latest) isi ${lock.assets.length + 1} file. Hasilnya di ${out}`)
    finish()
    return
  }
  const all = await getJson(`https://api.github.com/repos/${OURS}/releases?per_page=100`)
  for (const r of all.filter((r) => r.draft && r.tag_name === manifest.release)) {
    run('gh', ['api', '-X', 'DELETE', `repos/${OURS}/releases/${r.id}`]) // leftover of a failed upload
  }
  const uploads = [...lock.assets.map((a) => join(out, a.name)), join(out, lockName)]
  run('gh', ['release', 'create', manifest.release, ...uploads, '--repo', OURS, '--title', manifest.title, '--notes-file', notesFile, '--latest=false'])
  const published = await getJson(`https://api.github.com/repos/${OURS}/releases/tags/${manifest.release}`)
  for (const a of lock.assets) {
    const got = published.assets.find((x) => x.name === a.name)
    if (!got || got.size !== a.bytes || (got.digest && got.digest !== `sha256:${a.sha256}`)) {
      throw new Error(`File ${a.name} di rilis ${manifest.release} beda sama yang dicek (ukuran/SHA-256).`)
    }
  }
  say(`Rilis ${manifest.release} dibikin & isinya dicek (${uploads.length} file, bukan Latest).`)
  writeFileSync(lockInRepo, lockText)
  commitAndPush(repoDir, [lockInRepo], `${manifest.release}: catat isi rilis`)
  say(`${lockName} dicatat di repo.`)
  finish()
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(`GAGAL: ${e.message}`)
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Rilis komponen GAGAL\n\n${e.message}\n`)
    process.exit(1)
  })
}
