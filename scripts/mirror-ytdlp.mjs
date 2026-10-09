#!/usr/bin/env node
// Mirrors an official yt-dlp release into a release of this repo (ytdlp-<version>), together with
// its signed checksums, the license texts and the source code GPL/MPL require next to the exe,
// then records the newest version in ytdlp/latest.json (read by the ClippingHunter app).
// Runs daily from .github/workflows/ytdlp.yml. Try it locally without uploading anything:
//   node scripts/mirror-ytdlp.mjs --dry-run [--tag 2026.08.19] [--out <folder>]
// Log & error messages are Indonesian: they end up in the Actions page and failure emails.

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  appendFileSync,
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const UPSTREAM = 'yt-dlp/yt-dlp'
export const OURS = 'officialgercepai/clippinghunter-files'
export const RELEASE_PREFIX = 'ytdlp-'
/** Fingerprint of yt-dlp's release signing key; a copy of the key is in ytdlp/yt-dlp-signing-key.asc. */
export const SIGNING_KEY = 'AC0CBBE6848D6A873464AF4E57CF65933B5A7581'
/** Files copied from the official release; both are listed in the signed SHA2-256SUMS. */
export const OFFICIAL_FILES = ['yt-dlp.exe', 'yt-dlp.tar.gz']
/** GitHub turns off the schedule of a public repo after 60 days without activity. */
export const KEEPALIVE_DAYS = 45
/** Version of the ytdlp/latest.json layout (the app checks it). */
export const LATEST_FORMAT = 1
export const LATEST_FILE = 'ytdlp/latest.json'
const KEY_FILE = 'ytdlp/yt-dlp-signing-key.asc'
const KEEPALIVE_FILE = 'ytdlp/keepalive.txt'
const VERSION = /^\d{4}\.\d{2}\.\d{2}(\.\d+)?$/

/**
 * Copyleft components named in yt-dlp's THIRD_PARTY_LICENSES.txt (that file covers every platform build).
 * `pypi`: bundled in yt-dlp.exe → its source is mirrored next to the exe.
 * `absent`: only in the Linux/macOS builds → this name must not show up inside yt-dlp.exe.
 * A copyleft component missing from this list stops the mirror until someone checks it.
 */
export const COPYLEFT = {
  mutagen: { pypi: 'mutagen' },
  certifi: { pypi: 'certifi' },
  'GNU Readline': { absent: 'readline' },
  'libstdc++': { absent: 'libstdc++' },
  libgcc: { absent: 'libgcc' },
  libintl: { absent: 'libintl' },
  libidn2: { absent: 'libidn2' },
  libunistring: { absent: 'libunistring' },
}
const COPYLEFT_LICENSE = /\b(A?GPL|LGPL|MPL|EPL|EUPL|CDDL|OSL|CC-BY-SA)/i

/** `SHA2-256SUMS` → file name → sha256. */
export function parseSums(text) {
  const sums = new Map()
  for (const line of text.split(/\r?\n/)) {
    const m = /^([0-9a-f]{64})\s+\*?(.+?)\s*$/i.exec(line)
    if (m) sums.set(m[2], m[1].toLowerCase())
  }
  return sums
}

/** Component headers of THIRD_PARTY_LICENSES.txt: a line of 80 dashes, then "name | license". */
export function parseComponents(text) {
  const lines = text.split(/\r?\n/)
  const found = []
  for (let i = 1; i < lines.length; i++) {
    if (!/^-{80}$/.test(lines[i - 1])) continue
    const m = /^(.+?) \| (.+)$/.exec(lines[i])
    if (m) found.push({ name: m[1].trim(), license: m[2].trim() })
  }
  return found
}

/** PEP 503 package name: lower case, runs of "-", "_" and "." become one dash. */
export const packageName = (name) => name.toLowerCase().replace(/[-_.]+/g, '-')

/** Pinned packages of a pip requirements file with hashes (`name==version \` + `--hash=sha256:…` lines). */
export function parsePins(text) {
  const pins = []
  for (const line of text.replace(/\\\r?\n/g, ' ').split(/\r?\n/)) {
    const m = /^([A-Za-z0-9][A-Za-z0-9_.-]*)==([^\s;]+)/.exec(line.trim())
    if (!m) continue
    const hashes = [...line.matchAll(/--hash=sha256:([0-9a-f]{64})/g)].map((h) => h[1])
    pins.push({ name: packageName(m[1]), version: m[2], hashes })
  }
  return pins
}

/** Every pinned version of `pkg` (+ its allowed hashes) in the build's requirement files. */
export function findPins(requirementTexts, pkg) {
  const found = new Map()
  for (const text of requirementTexts) {
    for (const pin of parsePins(text)) {
      if (pin.name !== packageName(pkg)) continue
      const hashes = found.get(pin.version) ?? new Set()
      for (const h of pin.hashes) hashes.add(h)
      found.set(pin.version, hashes)
    }
  }
  return [...found].map(([version, hashes]) => ({ version, hashes: [...hashes] }))
}

/** Orders yt-dlp versions like 2026.08.19 and 2026.08.19.1. */
export function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return Math.sign(d)
  }
  return 0
}

/**
 * What the copyleft licenses need for this exe: `sources` to mirror, and `problems` = reasons to stop
 * (an unknown copyleft component, or a "Linux/macOS only" one that is inside the exe after all).
 * `exe` = the bytes of yt-dlp.exe (PyInstaller keeps bundled file names readable).
 */
export function copyleftPlan(components, exe) {
  const inside = exe.toString('latin1').toLowerCase()
  const sources = []
  const problems = []
  for (const c of components) {
    if (!COPYLEFT_LICENSE.test(c.license)) continue
    const rule = COPYLEFT[c.name]
    if (!rule) {
      problems.push(
        `Ada komponen copyleft baru di THIRD_PARTY_LICENSES.txt: ${c.name} (${c.license}). ` +
          'Cek dulu dibundel di yt-dlp.exe atau gak, terus tambahin ke COPYLEFT di scripts/mirror-ytdlp.mjs.',
      )
    } else if (rule.absent && inside.includes(rule.absent.toLowerCase())) {
      problems.push(
        `${c.name} (${c.license}) ternyata ada di yt-dlp.exe ("${rule.absent}"), padahal dicatat cuma ada di ` +
          'versi Linux/macOS. Source-nya perlu ikut disalin: cek dulu, terus ubah COPYLEFT di scripts/mirror-ytdlp.mjs.',
      )
    } else if (rule.pypi) {
      sources.push({ component: c.name, license: c.license, pypi: packageName(rule.pypi) })
    }
  }
  return { sources, problems }
}

/** ytdlp/latest.json: the newest mirrored version, read by the app. */
export function latestRecord({ tag, publishedAt, exe, now }) {
  return {
    format: LATEST_FORMAT,
    version: tag,
    publishedAt,
    mirroredAt: now,
    release: `https://github.com/${OURS}/releases/tag/${RELEASE_PREFIX}${tag}`,
    officialRelease: `https://github.com/${UPSTREAM}/releases/tag/${tag}`,
    signingKey: SIGNING_KEY,
    exe: {
      name: 'yt-dlp.exe',
      bytes: exe.bytes,
      sha256: exe.sha256,
      url: `https://github.com/${OURS}/releases/download/${RELEASE_PREFIX}${tag}/yt-dlp.exe`,
      officialUrl: `https://github.com/${UPSTREAM}/releases/download/${tag}/yt-dlp.exe`,
    },
  }
}

/** Release notes (Indonesian, shown on the release page). */
export function releaseNotes({ tag, publishedAt, files, sources }) {
  const key = SIGNING_KEY.replace(/(.{4})/g, '$1 ').trim()
  const repoArchive = `yt-dlp-${tag}-repo.tar.gz`
  return [
    `Salinan otomatis **yt-dlp ${tag}** buat app ClippingHunter, dari rilis resmi`,
    `https://github.com/${UPSTREAM}/releases/tag/${tag} (dirilis ${publishedAt.slice(0, 10)}).`,
    'File dari rilis resmi gak diubah sama sekali.',
    '',
    `**Dicek sebelum disalin:** tanda tangan GPG \`SHA2-256SUMS\` cocok sama kunci rilis yt-dlp (\`${key}\`),`,
    'SHA-256 `yt-dlp.exe` & `yt-dlp.tar.gz` sama persis kayak di `SHA2-256SUMS` itu, dan source library copyleft',
    'dicocokin sama hash di `bundle/requirements/*.txt` build yt-dlp.',
    '',
    '| File | Isi | SHA-256 |',
    '|---|---|---|',
    ...files.map((f) => `| \`${f.name}\` | ${f.about} | \`${f.sha256}\` |`),
    '',
    `**Lisensi:** yt-dlp sendiri berlisensi [Unlicense](https://github.com/${UPSTREAM}/blob/${tag}/LICENSE).`,
    '`yt-dlp.exe` dibikin pakai PyInstaller dan ngebundel komponen lain (Python, curl_cffi, mutagen, certifi, dll.),',
    'sebagian berlisensi GPL, jadi `yt-dlp.exe` secara keseluruhan berlisensi **GPLv3+** (lihat README yt-dlp',
    '& `THIRD_PARTY_LICENSES.txt`). Source code-nya:',
    '- yt-dlp: `yt-dlp.tar.gz` (rilis resmi) atau `' + repoArchive + '`',
    '- cara build + versi pasti tiap library yang dibundel: `' + repoArchive + '` (`bundle/`, `.github/workflows/build.yml`)',
    ...(sources.length
      ? [`- library copyleft yang dibundel: ${sources.map((s) => `\`${s.name}\` (${s.license})`).join(', ')}`]
      : []),
    '- library lain (lisensi permisif): di project aslinya, link-nya ada di `THIRD_PARTY_LICENSES.txt`',
    '',
    `Source yang kamu butuh gak ketemu? Buka issue di https://github.com/${OURS}/issues.`,
    '',
    '_Dibikin otomatis oleh GitHub Actions (`.github/workflows/ytdlp.yml`)._',
    '',
  ].join('\n')
}

// ---- network & programs (the parts above are pure and tested) ----

const token = () => process.env.GH_TOKEN || process.env.GITHUB_TOKEN || ''
// The token only ever goes to the GitHub API, never to download hosts.
const headersFor = (url) => ({
  'User-Agent': 'clippinghunter-files-mirror',
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

/** Downloads `url` to `file` (3 tries); `bytes` = expected size when known. */
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
      await sleep(attempt * 3000)
    }
  }
}

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

function run(cmd, args, { cwd, allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64 << 20 })
  if (r.error) throw new Error(`Gagal jalanin ${cmd}: ${r.error.message}`)
  if (r.status !== 0 && !allowFail) {
    throw new Error(`${cmd} ${args[0]} gagal (kode ${r.status}): ${(r.stderr || r.stdout || '').trim()}`)
  }
  return r
}

/** Checks that SHA2-256SUMS.sig (in `work`) is a good signature of SHA2-256SUMS by yt-dlp's release key. */
export function verifySignature(work, keyFile, expected = SIGNING_KEY) {
  // gpgv checks against exactly this one key (no agent, no trust database). Relative paths only:
  // Git for Windows' gpg misreads "C:\…" paths, and gpgv wants "./" for a keyring outside its home.
  mkdirSync(join(work, 'gnupg'), { recursive: true, mode: 0o700 })
  copyFileSync(keyFile, join(work, 'signing-key.asc'))
  run('gpg', ['--homedir', 'gnupg', '--batch', '--yes', '--dearmor', '-o', 'signing-key.gpg', 'signing-key.asc'], { cwd: work })
  const r = run('gpgv', ['--keyring', './signing-key.gpg', '--status-fd', '1', 'SHA2-256SUMS.sig', 'SHA2-256SUMS'], {
    cwd: work,
    allowFail: true,
  })
  // VALIDSIG <signing key fpr> … [<primary key fpr>]
  const line = /^\[GNUPG:\] VALIDSIG (.+)$/m.exec(r.stdout ?? '')
  const fields = line ? line[1].trim().split(/\s+/) : []
  const primary = fields[9] ?? fields[0]
  if (r.status !== 0 || primary !== expected) {
    throw new Error(
      `Tanda tangan SHA2-256SUMS gak valid atau bukan dari kunci rilis yt-dlp (${expected}), jadi GAK disalin. ` +
        (r.stderr ?? '').trim(),
    )
  }
}

function readLatest(repoDir) {
  try {
    return JSON.parse(readFileSync(join(repoDir, LATEST_FILE), 'utf8'))
  } catch {
    return null
  }
}

function commitAndPush(repoDir, files, message) {
  if (process.env.GITHUB_ACTIONS) {
    run('git', ['config', 'user.name', 'github-actions[bot]'], { cwd: repoDir })
    run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], { cwd: repoDir })
  }
  run('git', ['add', ...files], { cwd: repoDir })
  run('git', ['commit', '-q', '-m', message], { cwd: repoDir })
  if (run('git', ['push', '-q'], { cwd: repoDir, allowFail: true }).status !== 0) {
    // Someone pushed in between (e.g. a README edit): put ours on top and try once more.
    run('git', ['pull', '-q', '--rebase'], { cwd: repoDir })
    run('git', ['push', '-q'], { cwd: repoDir })
  }
}

function parseArgs(argv) {
  const opts = { dryRun: false, tag: '', out: '' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') opts.dryRun = true
    else if (a === '--tag') opts.tag = argv[++i] ?? ''
    else if (a === '--out') opts.out = argv[++i] ?? ''
    else throw new Error(`Opsi gak dikenal: ${a}`)
  }
  return opts
}

async function main(argv) {
  const opts = parseArgs(argv)
  const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const report = []
  const say = (text) => {
    console.log(text)
    report.push(text)
  }
  const finish = () => {
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Salin yt-dlp\n\n${report.map((l) => `- ${l}`).join('\n')}\n`)
    }
  }
  if (opts.dryRun) say('Mode coba (--dry-run): gak ada yang di-upload atau di-commit.')

  // 1. Which version, and is anything missing on our side?
  const wanted = (opts.tag || process.env.INPUT_TAG || '').trim()
  const upstream = await getJson(
    `https://api.github.com/repos/${UPSTREAM}/releases/${wanted ? `tags/${encodeURIComponent(wanted)}` : 'latest'}`,
  )
  const tag = upstream.tag_name
  if (!VERSION.test(tag)) throw new Error(`Versi yt-dlp "${tag}" formatnya gak biasa, gak disalin.`)
  if (upstream.draft || upstream.prerelease) throw new Error(`yt-dlp ${tag} bukan rilis stabil, gak disalin.`)
  const releaseTag = RELEASE_PREFIX + tag
  const ours = await getJson(`https://api.github.com/repos/${OURS}/releases/tags/${releaseTag}`, { allow404: true })
  const current = readLatest(repoDir)
  const behind = !current || current.format !== LATEST_FORMAT || compareVersions(tag, current.version) > 0
  say(`yt-dlp ${wanted ? 'yang diminta' : 'terbaru'}: ${tag} (dirilis ${upstream.published_at.slice(0, 10)}).`)
  say(`Salinan kita: ${ours ? `udah ada (${releaseTag})` : 'belum ada'}; ${LATEST_FILE}: ${current?.version ?? 'belum ada'}.`)

  let committed = false
  if (!ours || behind) {
    const work = opts.out ? resolve(opts.out) : mkdtempSync(join(tmpdir(), 'ytdlp-mirror-'))
    mkdirSync(work, { recursive: true })
    const asset = (name) => {
      const a = upstream.assets.find((x) => x.name === name)
      if (!a) throw new Error(`File ${name} gak ada di rilis resmi yt-dlp ${tag}.`)
      return a
    }

    // 2. Official files + signed checksums.
    for (const name of [...OFFICIAL_FILES, 'SHA2-256SUMS', 'SHA2-256SUMS.sig']) {
      const a = asset(name)
      await download(a.browser_download_url, join(work, name), a.size)
    }
    verifySignature(work, join(repoDir, KEY_FILE))
    const sums = parseSums(readFileSync(join(work, 'SHA2-256SUMS'), 'utf8'))
    for (const name of OFFICIAL_FILES) {
      if (sums.get(name) !== sha256(join(work, name))) {
        throw new Error(`SHA-256 ${name} gak sama kayak di SHA2-256SUMS resmi, jadi GAK disalin.`)
      }
    }
    say(`Tanda tangan GPG SHA2-256SUMS cocok (kunci ${SIGNING_KEY}) + SHA-256 ${OFFICIAL_FILES.join(' & ')} cocok.`)

    // 3. The repo at this tag: build scripts, pinned library versions, license texts.
    const repoArchive = `yt-dlp-${tag}-repo.tar.gz`
    await download(`https://codeload.github.com/${UPSTREAM}/tar.gz/refs/tags/${tag}`, join(work, repoArchive))
    const unpacked = join(work, 'repo')
    mkdirSync(unpacked, { recursive: true })
    // Relative path with "/" so GNU tar (Linux, Git for Windows) and Windows' own tar both take it.
    run('tar', ['-xzf', `../${repoArchive}`], { cwd: unpacked })
    const top = readdirSync(unpacked).find((d) => statSync(join(unpacked, d)).isDirectory())
    const source = join(unpacked, top ?? '')
    const licenses = join(source, 'THIRD_PARTY_LICENSES.txt')
    const requirements = join(source, 'bundle', 'requirements')
    if (!top || !existsSync(licenses) || !existsSync(requirements)) {
      throw new Error(`Isi repo yt-dlp di tag ${tag} beda dari biasanya (THIRD_PARTY_LICENSES.txt / bundle/requirements gak ada). Cek dulu.`)
    }
    copyFileSync(licenses, join(work, 'THIRD_PARTY_LICENSES.txt'))

    // 4. Sources the copyleft licenses want next to the exe.
    const plan = copyleftPlan(parseComponents(readFileSync(licenses, 'utf8')), readFileSync(join(work, 'yt-dlp.exe')))
    if (plan.problems.length) throw new Error(plan.problems.join('\n'))
    const pinTexts = readdirSync(requirements)
      .filter((f) => f.endsWith('.txt'))
      .map((f) => readFileSync(join(requirements, f), 'utf8'))
    const sdists = []
    for (const s of plan.sources) {
      const pins = findPins(pinTexts, s.pypi)
      if (!pins.length) throw new Error(`Versi ${s.pypi} gak ketemu di bundle/requirements yt-dlp ${tag}. Cek dulu.`)
      for (const pin of pins) {
        const info = await getJson(`https://pypi.org/pypi/${s.pypi}/${pin.version}/json`)
        const sdist = info.urls.find((u) => u.packagetype === 'sdist')
        if (!sdist) throw new Error(`Source ${s.pypi} ${pin.version} gak ada di PyPI.`)
        if (pin.hashes.length && !pin.hashes.includes(sdist.digests.sha256)) {
          throw new Error(`SHA-256 source ${s.pypi} ${pin.version} di PyPI gak ada di daftar hash build yt-dlp.`)
        }
        await download(sdist.url, join(work, sdist.filename), sdist.size)
        if (sha256(join(work, sdist.filename)) !== sdist.digests.sha256) {
          throw new Error(`SHA-256 ${sdist.filename} dari PyPI gak cocok.`)
        }
        sdists.push({ name: sdist.filename, license: s.license, component: s.component, version: pin.version })
      }
    }
    say(`Source library copyleft: ${sdists.map((s) => `${s.name} (${s.license})`).join(', ') || 'gak ada'}.`)

    const describe = {
      'yt-dlp.exe': 'program yt-dlp buat Windows (yang dipakai app ClippingHunter)',
      'yt-dlp.tar.gz': 'source code yt-dlp versi ini (dari rilis resmi)',
      'SHA2-256SUMS': 'daftar SHA-256 resmi semua file rilis yt-dlp ini',
      'SHA2-256SUMS.sig': 'tanda tangan GPG resmi buat `SHA2-256SUMS`',
      'THIRD_PARTY_LICENSES.txt': 'teks lisensi semua komponen yang dibundel di `yt-dlp.exe`',
      [repoArchive]: `isi repo yt-dlp di tag \`${tag}\`: script build + versi pasti tiap library yang dibundel`,
    }
    for (const s of sdists) describe[s.name] = `source ${s.component} ${s.version} (${s.license}), dibundel di \`yt-dlp.exe\``
    const files = Object.entries(describe).map(([name, about]) => {
      const path = join(work, name)
      return { name, about, path, bytes: statSync(path).size, sha256: sha256(path) }
    })
    const notes = releaseNotes({ tag, publishedAt: upstream.published_at, files, sources: sdists })
    writeFileSync(join(work, 'release-notes.md'), notes)
    const exe = files.find((f) => f.name === 'yt-dlp.exe')

    // 5. Our release (published only after every file is uploaded; never marked "Latest").
    if (!ours) {
      if (opts.dryRun) {
        say(`[coba] Bakal bikin rilis ${releaseTag} (bukan Latest) isi ${files.length} file: ${files.map((f) => f.name).join(', ')}.`)
      } else {
        const all = await getJson(`https://api.github.com/repos/${OURS}/releases?per_page=100`)
        for (const r of all.filter((r) => r.draft && r.tag_name === releaseTag)) {
          run('gh', ['api', '-X', 'DELETE', `repos/${OURS}/releases/${r.id}`]) // leftover of a failed upload
        }
        const notesFile = join(work, 'release-notes.md')
        run('gh', ['release', 'create', releaseTag, ...files.map((f) => f.path), '--repo', OURS,
          '--title', `yt-dlp ${tag}`, '--notes-file', notesFile, '--latest=false'])
        say(`Rilis ${releaseTag} dibikin (${files.length} file, bukan Latest).`)
      }
    }
    if (!opts.dryRun) {
      // What GitHub serves must be exactly what was checked.
      const published = await getJson(`https://api.github.com/repos/${OURS}/releases/tags/${releaseTag}`)
      for (const f of files) {
        const a = published.assets.find((x) => x.name === f.name)
        if (!a) throw new Error(`File ${f.name} gak ada di rilis ${releaseTag}.`)
        if (a.size !== f.bytes || (a.digest && a.digest !== `sha256:${f.sha256}`)) {
          throw new Error(`File ${f.name} di rilis ${releaseTag} beda sama yang dicek (ukuran/SHA-256).`)
        }
      }
      say(`Isi rilis ${releaseTag} dicek: ukuran & SHA-256 semua file sama.`)
    }

    // 6. The version list the app reads.
    if (behind) {
      const record = latestRecord({ tag, publishedAt: upstream.published_at, exe, now: new Date().toISOString() })
      const text = `${JSON.stringify(record, null, 2)}\n`
      if (opts.dryRun) {
        writeFileSync(join(work, 'latest.json'), text)
        say(`[coba] Bakal nulis ${LATEST_FILE} → versi ${tag}.`)
      } else {
        mkdirSync(dirname(join(repoDir, LATEST_FILE)), { recursive: true })
        writeFileSync(join(repoDir, LATEST_FILE), text)
        commitAndPush(repoDir, [LATEST_FILE], `yt-dlp ${tag}: salinan baru (${releaseTag})`)
        committed = true
        say(`${LATEST_FILE} → versi ${tag} (di-commit).`)
      }
    }
    say(`File kerja: ${work}`)
  } else {
    say('Udah paling baru, gak ada yang perlu disalin.')
  }

  // 7. Keep the daily schedule alive when yt-dlp is quiet for a long time.
  if (!committed) {
    const last = Number(run('git', ['log', '-1', '--format=%ct'], { cwd: repoDir }).stdout.trim())
    const days = (Date.now() / 1000 - last) / 86400
    if (days > KEEPALIVE_DAYS) {
      const text =
        `Terakhir dicek: ${new Date().toISOString()}\n` +
        'File ini cuma biar jadwal GitHub Actions gak dimatiin (repo publik tanpa aktivitas 60 hari).\n'
      if (opts.dryRun) say(`[coba] Commit terakhir ${Math.floor(days)} hari lalu → bakal nulis ${KEEPALIVE_FILE}.`)
      else {
        mkdirSync(dirname(join(repoDir, KEEPALIVE_FILE)), { recursive: true })
        writeFileSync(join(repoDir, KEEPALIVE_FILE), text)
        commitAndPush(repoDir, [KEEPALIVE_FILE], 'yt-dlp: jaga jadwal harian tetap nyala')
        say(`Commit terakhir ${Math.floor(days)} hari lalu → ${KEEPALIVE_FILE} di-commit biar jadwalnya gak dimatiin.`)
      }
    }
  }
  finish()
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(`GAGAL: ${e.message}`)
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Salin yt-dlp GAGAL\n\n${e.message}\n`)
    process.exit(1)
  })
}
