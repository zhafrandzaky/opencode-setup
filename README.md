# OpenCode Global Configuration

> Konfigurasi global **Everything Claude Code (ECC) 2.2.1** untuk **OpenCode** — agent orchestrasi, skill, command, hook/plugin, serta integrasi tooling global (Playwright, ast-grep, Browser Use, Strix, Superpowers, dan dotenv) yang siap pakai di mana pun OpenCode dijalankan.

> **Baru di mesin baru?** Ikuti panduan langkah-demi-langkah + checklist verifikasi di [`SETUP.md`](SETUP.md).

| Bagian | Isi |
|--------|-----|
| [Overview](#overview--pendahuluan) | Apa repository ini dan apa saja isinya |
| [Fitur Utama & Arsitektur Tooling](#fitur-utama--arsitektur-tooling) | Ringkasan fungsional setiap komponen terintegrasi |
| [Struktur Repositori](#struktur-repositori) | Peta folder `~/.config/opencode/` |
| [Prasyarat Sistem](#prasyarat-sistem) | Node.js, Python/uv, Docker, dll. |
| [Quick Start / Instalasi di Mesin Baru](#quick-start--instalasi-di-mesin-baru) | Langkah dari nol sampai siap pakai |
| [Konfigurasi Environment](#konfigurasi-environment) | `.env.example`, auto-load, variabel wajib vs opsional |
| [Alur Kerja & Contoh Prompt](#alur-kerja--contoh-prompt) | Contoh nyata coding, debugging, E2E, code graph, security audit |
| [Pemecahan Masalah](#pemecahan-masalah) | Masalah umum & perbaikannya |
| [**SETUP.md**](SETUP.md) | Panduan instalasi terpisah, dari nol sampai terverifikasi |

---

## Overview / Pendahuluan

Repository ini adalah **harness konfigurasi global** milik `~/.config/opencode/`. Saat sesi OpenCode dibuka di direktori proyek mana pun, OpenCode otomatis membaca `opencode.json` (dan `opencode.jsonc`) dari sini, lalu:

- memuat **26 agent** (1 primary + 25 subagent) untuk peran terkhusus (planner, code-reviewer, tdd-guide, dll.),
- memuat **26 slash command** yang memetakan prompt ke agent yang tepat (`/plan`, `/tdd`, `/code-review`, ...),
- memuat **11 skill ECC** sebagai instruction + **218 skill ECC** dan **13 Taste Skill** di `skills/` sebagai pustaka on-demand,
- menjalankan **plugin ECC hooks + 8 custom tools** (`./plugins`) dan **Obra Superpowers**,
- **meng-inject environment** dari `~/.config/opencode/.env` ke setiap sub-proses via plugin `plugins/dotenv.ts`,
- menyediakan **katalog MCP server** siap-pasang di `mcp-configs/mcp-servers.json`.

Hasilnya: sekumpulan aturan, peran, skill, dan tooling yang konsisten — tanpa perlu meng-copy konfigurasi per proyek.

---

## Fitur Utama & Arsitektur Tooling

### 1. Everything Claude Code (ECC) 2.2.1 — Core Harness

Fondasi dari seluruh setup. Terpasang via `node scripts/install-apply.js --target opencode --profile full` dan terdaftar sebagai plugin `./plugins` pada `opencode.json`.

| Komponen | Jumlah | Lokasi |
|----------|--------|--------|
| **Agents** | 26 (1 primary `build` + 25 subagent) | `agent` di `opencode.json`, prompt di `prompts/agents/` |
| **Commands** | 26 terdaftar (100 file shim di `commands/`) | `command` di `opencode.json` |
| **Skills** | 231 (218 ECC + 13 Taste Skill; 11 dimuat via `instructions`) | `skills/` |
| **Custom Tools** | 8 | plugin `./plugins` (`tools/`) |
| **Rules / Instructions** | 14 file instruction + `AGENTS.md` | lihat `instructions/INSTRUCTIONS.md` |

**Agent utama:** `build` (mode primary) dengan akses read/write/edit/bash + tool `changed-files`. Subagent lain dibatasi read-only (planner, architect, reviewer) untuk keamanan, atau read/write/edit untuk pekerjaan eksekusi (tdd-guide, build-error-resolver, e2e-runner, dll.).

**8 custom tools dari plugin:**
`run-tests` · `check-coverage` · `security-audit` · `format-code` · `lint-check` · `git-summary` · `changed-files` · `dependency-analyzer`

**Plugin hooks** (opt-in via `ECC_HOOK_PROFILE`, lihat [Konfigurasi Environment](#konfigurasi-environment)): auto-format Prettier, TypeScript check, peringatan `console.log`, notifikasi desktop, deteksi secret, pengingat git push, audit file doc, session context, compacting, todo progress, `shell.env` (inject environment), dan permission auto-approve. Profil: `minimal` / `standard` / `strict`, plus fitur nonaktif per-hook via `ECC_DISABLED_HOOKS`.

> Catatan: pemasangan dibuat dengan `--no-hooks`; hooks hanya aktif jika Anda sengaja mengatur `ECC_HOOK_PROFILE` di `.env`.

### 2. Obra Superpowers Plugin — Skill Tambahan

Plugin kedua di `opencode.json`: `superpowers@git+https://github.com/obra/superpowers.git`. Menambah **14 skill** yang memperkuat workflow harian:

- `using-superpowers`, `writing-plans`, `executing-plans` — planning & eksekusi terstruktur
- `test-driven-development`, `verification-before-completion` — TDD & verifikasi
- `systematic-debugging` — debugging sistematis (root cause, bukan tebak-tebakan)
- `brainstorming`, `writing-skills`, `subagent-driven-development`, `dispatching-parallel-agents`
- `using-git-worktrees`, `finishing-a-development-branch`
- `requesting-code-review`, `receiving-code-review`

### 3. Playwright CLI + Headless Browser

Install global (npm): `playwright` **1.63.0** dengan browser Chromium **1243** + headless shell di `~/.cache/ms-playwright`. Digunakan untuk:

- E2E testing (`/e2e`, agent `e2e-runner`, skill `e2e-testing`)
- Screenshot & snapshot halaman: `npx playwright screenshot <url> <file>`
- Codegen: `npx playwright codegen <url>`

### 4. Code Graph & AST Analyzer (ast-grep / sg)

`ast-grep` **0.45.3** (terpasang npm global, binari `sg`). Untuk pencarian & rewrite berbasis **struktur AST** — pengganti regex yang rapuh:

```bash
sg -p 'pattern' -l <lang> [dir]      # structural search
sg -p 'old_pat' -r 'new_pat' -l ts  # structural rewrite
sg -p '...' --json                   # output JSON untuk konsumsi programatik
```

Cocok untuk mapping dependency, menemukan seluruh pemanggilan fungsi, dan refactor massal yang aman.

### 5. Browser Automation — Browser Use (browser-harness)

`browser-use` **0.1.13** (browser-harness) terpasang sebagai **uv tool** di `~/.local/bin` (`bu`, `browser-use`). Otomasi navigasi browser interaktif dengan bantuan agent; daemon auto-start. Opsional auth cloud via `BROWSER_USE_API_KEY`, dan opt-in autospawn via `BU_AUTOSPAWN=1`.

### 6. Security Scanner — Strix

`strix` **1.6.2** (uv tool di `~/.local/bin`), statik/dinamik pentest terhadap code, web app, dan API. **Membutuhkan Docker daemon berjalan** + `STRIX_LLM` dan `LLM_API_KEY`. Konfigurasi persisten di `~/.strix/cli-config.json`.

```bash
strix --target <dir|url>          # interactive
strix -n --target <dir|url>       # headless (exit non-zero jika ada temuan)
```

### 7. Custom Dotenv Plugin (`plugins/dotenv.ts`)

OpenCode tidak membaca `.env` secara bawaan. Plugin kecil ini menambal kekurangan tersebut:

- Parse `~/.config/opencode/.env` saat OpenCode start (mendukung komentar `#`, `export`, kutip, value berisi spasi),
- **Inject** ke environment proses & ke setiap sub-proses shell/tool via hook `shell.env` (Strix, browser-use, Playwright, script ECC, MCP server — semuanya melihat nilai yang sama),
- Nilai environment asli shell **selalu menang** (tidak pernah menimpa),
- Terdaftar via export `dotenvPlugin` di `plugins/index.ts` (default + named export keduanya dimuat OpenCode).

### 8. Otomatisasi Komponen UI On-demand (shadcn/ui & Magic UI)

Dua jalur untuk menambah komponen UI tanpa menulis dari nol, sesuai kebutuhan sesi:

- **shadcn/ui** — CLI on-demand: `npx shadcn@latest add <komponen>` langsung di proyek, komponen ter-generate ke `components/ui/` dan siap dipakai dengan Tailwind.
- **Magic UI** — MCP server terdaftar di `mcp-configs/mcp-servers.json` (`@magicuidesign/mcp@latest`, deskripsi "Magic UI components"); aktifkan di `opencode.json` jika dibutuhkan, beri `mcp_*` permission = `ask`.

Keduanya berjalan on-demand sehingga tidak membebani context window saat tidak dipakai.

### 9. Taste Skill — 13 Skill Desain Frontend (Anti-Slop)

Kumpulan **13 Agent Skills** (SKILL.md, lisensi MIT, sumber: [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)) yang menaikkan kualitas UI hasil AI: design read, sistem layout/typography/motion, protokol redesign, dan pre-flight check anti-pola generik. Dipasang manual ke `~/.config/opencode/skills/<name>/` (satu folder dengan skill ECC; tidak dikelola ECC sehingga aman dari `ecc repair`).

| Kelompok | Skill |
|---|---|
| Inti | `design-taste-frontend` (v2), `design-taste-frontend-v1` (legacy) |
| Varian model | `gpt-taste` (atur untuk model GPT/Codex) |
| Redesign & audit | `redesign-existing-projects` |
| Gaya visual | `high-end-visual-design`, `minimalist-ui`, `industrial-brutalist-ui` |
| Pipeline | `image-to-code` |
| Enforcement output | `full-output-enforcement` |
| Design system export | `stitch-design-taste` |
| Image generation | `imagegen-frontend-web`, `imagegen-frontend-mobile`, `brandkit` |

Pemakaian: minta agent memakai skill terkait (mis. *"pakai skill design-taste-frontend untuk landing page ini"*), atau agent memilih otomatis saat tugas frontend. Update dari upstream: clone ulang repo lalu salin tiap folder `skills/<folder>` ke `~/.config/opencode/skills/<name>` sesuai `name:` frontmatter.

### Katalog MCP Server (opsional)

`mcp-configs/mcp-servers.json` berisi katalog siap-pasang (tidak otomatis aktif): `github`, `jira`, `firecrawl`, `context7`, `exa-web-search`, `playwright` (MCP), `browser-use` (MCP), `fal-ai`, `magic` (Magic UI), `supabase`, `clickhouse`, `parallel-search`, `memory`, `omega-memory`, `ecc-memory-vault`, `browserbase`, `filesystem`, `codescene`, `memxus`. Aktifkan dengan menambahkannya ke key `mcp` di `opencode.json` (default permission `mcp_*` = `ask`).

---

## Struktur Repositori

```
~/.config/opencode/
├── opencode.json            # Konfigurasi utama: agents, commands, instructions, plugin
├── opencode.jsonc           # Config user minimal (di-merge setelah opencode.json)
├── AGENTS.md                # Instruksi global (dibaca OpenCode & tool lain)
├── CONTRIBUTING.md          # Panduan kontribusi ECC
├── .env.example             # Template variabel environment (copy → .env)
├── .gitignore               # Proteksi .env, kredensial, cache, dist, log
├── instructions/
│   └── INSTRUCTIONS.md      # Rules terkonsolidasi: security, coding style, testing, git
├── prompts/agents/          # Prompt untuk 25 subagent
├── skills/                  # 231 skill (218 ECC + 13 Taste Skill)
├── commands/                # 100 file command shim (26 terdaftar di opencode.json)
├── plugins/                 # ECC hooks + tools + dotenv loader (entry: index.ts)
│   ├── ecc-hooks.ts         # Plugin hooks + 8 custom tools
│   ├── dotenv.ts            # Loader .env global (shell.env)
│   └── lib/changed-files-store.ts
├── tools/                   # Source TS 8 custom tool (dikompilasi ke plugins)
├── mcp-configs/
│   └── mcp-servers.json     # Katalog MCP server siap-pasang
├── scripts/                 # Utility ECC (auto-update, claw, dll.)
├── dist/                    # Output build plugin (parity dengan `./plugins`)
└── the-security-guide.md    # Referensi keamanan ECC
```

---

## Prasyarat Sistem

| Kebutuhan | Versi | Dipakai oleh |
|-----------|-------|--------------|
| **OpenCode CLI** | 1.18.29 (`/usr/bin/opencode`) | Harness utama |
| **Node.js** (>18, via fnm) | v24.20.0 | ECC plugin & tools, npm global (playwright, ast-grep) |
| **npm** (global bin dari fnm) | — | `@playwright/test`, `@ast-grep/cli` |
| **bun** | 1.4.0 | Tersedia sebagai alternatif package manager |
| **uv** | 0.12.14 (`~/.local/bin/uv`) | Tool Python: `browser-use`, `strix` |
| **Python** (env tool via uv) | 3.14 | browser-harness & strix runtime |
| **Docker daemon** | — | **Wajib** untuk Strix scan (`systemctl start docker`) |
| **Chromium / headless shell** | 1243 (`~/.cache/ms-playwright`) | Playwright di CLI & `/e2e` |
| **Git** | — | Plugin superpowers (git-based), ECC scripts |

Semua binary global ada di `PATH` melalui `~/.local/bin` dan profile shell (`.bashrc`/`.zshrc`/`.profile`) — login shell baru selalu menemukan `browser-use`, `strix`, `uv`, `sg`, `playwright`.

### Fish Shell — Environment Setup

Jika login shell memakai **Fish** (`/usr/bin/fish`, versi 4.x), pastikan `~/.config/fish/config.fish` berisi blok berikut (**urutan penting**: fnm sebelum `node`/`npm` dipanggil):

```fish
# -- OpenCode / global tooling environment --
# Local binaries: strix, browser-use, uv, dll. (idempotent)
fish_add_path ~/.local/bin

# Node version manager — WAJIB di-source sebelum node/npm di bawah
fnm env --use-on-cd | source

# Global npm modules path (dibutuhkan loader NODE_PATH)
set -gx NODE_PATH (npm root -g 2>/dev/null)
```

Penjelasan poin penting:

- **`fish_add_path ~/.local/bin`** — menambahkan direktori binary lokal (strix, browser-use, uv, script ECC). Idempotent: tidak menciptakan duplikat di `fish_user_paths` meski dijalankan berulang. Path ini juga ter-cover otomatis oleh universal variable `fish_user_paths` dan `~/.config/fish/conf.d/uv.env.fish` (`source "$HOME/.local/bin/env.fish"`).
- **`fnm env --use-on-cd | source`** — mengaktifkan Node version manager per-direktori. Tanpa ini, `node`/`npm` (hanya tersedia via fnm di mesin ini) tidak akan ditemukan dari Fish. Tidak ada konflik dengan `NODE_PATH` karena keduanya menunjuk versi node yang sama (mis. v24.20.0).
- **`set -gx NODE_PATH (npm root -g)`** — mengekspor path ke module global npm (mis. `~/.local/share/fnm/node-versions/v24.20.0/installation/lib/node_modules`), dibutuhkan tool yang meng-import paket global (Playwright, ast-grep) via loader `NODE_PATH`.

Verifikasi cepat dari sesi Fish:

```fish
which strix browser-use uv sg playwright   # semua harus ter-resolve
echo $NODE_PATH                            # path ke module global npm
fnm current                                # mis. v24.20.0
```

> **Catatan agnostik shell:** hook `shell.env` dari `plugins/dotenv.ts` bekerja di level OpenCode (men-spawn child process `bash`/`sh` untuk tool), sepenuhnya **tidak bergantung** pada login shell Anda. Nilai dari `~/.config/opencode/.env` tetap ter-inject ke setiap process child mana pun yang dipakai OpenCode.

---

## Quick Start / Instalasi di Mesin Baru

> Versi ringkas ada di bawah; panduan lengkap + checklist verifikasi: [`SETUP.md`](SETUP.md).

### 1. Install OpenCode

```bash
npm install -g opencode        # atau ikuti petunjuk resmi opencode.ai
opencode --version             # harapkan >= 1.18
```

### 2. Clone repository konfigurasi ke tempat global

```bash
git clone <url-repo-ini> ~/.config/opencode
```

> `opencode.json` di `~/.config/opencode/` otomatis dibaca sebagai config global; tidak perlu menyentuh config proyek.

### 3. Setup plugin lokal

Plugin `./plugins` butuh dependency lokal. OpenCode mengeksekusi source `*.ts` langsung — tidak perlu build:

```bash
cd ~/.config/opencode
npm install        # @opencode-ai/plugin + devDeps (typescript, @types/node, @types/bun)
npx tsc --noEmit   # opsional: quality gate typecheck — harus 0 error
```

### 4. Buat `.env` dari template

```bash
cp .env.example ~/.config/opencode/.env
# isi minimal: STRIX_LLM dan LLM_API_KEY (wajib untuk Strix)
```

### 5. Pasang dependensi global

```bash
# Node tooling (via npm global dari fnm)
npm install -g @ast-grep/cli playwright

# Browser runtime untuk Playwright
npx playwright install chromium            # opsional: --with-deps (butuh sudo)

# Python tooling (via uv)
uv tool install strix-agent                # binary: strix
uv tool install browser-use                # binary: browser-use / bu
```

### 6. (Opsional) Superpowers plugin

Plugin sudah tercantum di `opencode.json`; OpenCode akan mengunduhnya saat start pertama:

```json
"plugin": ["./plugins", "superpowers@git+https://github.com/obra/superpowers.git"]
```

### 7. Verifikasi

```bash
opencode run --print-logs "Echo hello and list installed commands"
```

Cek bahwa: log memuat plugin ECC (`service=ecc`), tidak ada error load; perintah `/plan`, `/tdd` tersedia; tool `changed-files`, `run-tests` dapat dipanggil agent.

---

## Konfigurasi Environment

### Bagaimana `.env` dimuat

OpenCode tidak membaca `.env` secara bawaan. Plugin **`plugins/dotenv.ts`** melakukannya untuk Anda:

1. Saat OpenCode start, plugin me-resolve `~/.config/opencode/.env` (atau `$OPENCODE_CONFIG_DIR/.env` jika diset).
2. Setiap baris `KEY=value` diparse (dukung `#` komentar, `export `, dan kutip `'`/`"`).
3. Nilai di-inject ke `process.env` **hanya jika belum ada** — nilai asli shell/daemon selalu menang.
4. Hook `shell.env` mengembalikan variabel yang ter-load sehingga **semua sub-proses** (Strix, browser-use, MCP server, script ECC) mendapatkannya.

> `.env` tidak di-commit: `~/.config/opencode/.gitignore` memblokir `.env`, `.env.*` (kecuali `.env.example`), `*.key`, kredensial, `dist/`, cache, dan log.

### Variabel WAJIB

| Variabel | Fungsi |
|----------|--------|
| `STRIX_LLM` | Model LLM untuk Strix (contoh: `openrouter/z-ai/glm-5.3`, `anthropic/claude-opus-4-7`, `openai/gpt-5`) |
| `LLM_API_KEY` | API key provider di atas (fallback diterima: `OPENAI_API_KEY`) |

### Variabel Opsional (yang lazim dipakai)

| Variabel | Fungsi |
|----------|--------|
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | Skill/command yang memanggil API LLM langsung |
| `LLM_API_BASE` | Base URL kustom untuk LLM (alias: `OPENAI_BASE_URL`, `OLLAMA_API_BASE`, dll.) |
| `BROWSER_USE_API_KEY`, `BU_AUTOSPAWN` | Auth cloud / opt-in autospawn browser-use |
| `ECC_HOOK_PROFILE` | `minimal` / `standard` / `strict` — mengaktifkan hooks ECC |
| `ECC_DISABLED_HOOKS` | Daftar hook yang dinonaktifkan (dipisah koma) |
| `GITHUB_PERSONAL_ACCESS_TOKEN`, `JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | Kredensial MCP github/jira |
| `FIRECRAWL_API_KEY`, `EXA_API_KEY`, `ITO_API_KEY` | Kredensial MCP firecrawl/exa/ito |
| `CLAW_MODEL`, `CLAW_SESSION`, `CLAW_SKILLS` | Helper X (claw) script ECC |

Daftar lengkap + komentar penjelasan ada di **`.env.example`**.

---

## Alur Kerja & Contoh Prompt

### 1. Fitur baru dengan ECC agent roles

Hop dari agent ke agent untuk alur yang terstruktur. Contoh di dalam sesi OpenCode:

```text
/plan Tambahkan pagination ke endpoint GET /api/users dengan cursor-based
```

```text
/tdd Implementasikan repository method berikut berdasar rencana /plan yang sudah dibuat. Pastikan coverage >= 80%
```

```text
/code-review Review perubahan di branch `feature/pagination` — fokus pada edge case & inisialisasi state
```

### 2. Debugging sistematis (Superpowers: systematic-debugging)

```text
Bugs: pagination ke-dua page mengembalikan data yang sama dengan page pertama.
Gunakan skill systematic-debugging. Jangan menebak perbaikan —
pertama reproduksi, cari root cause, baru usulkan fix beserta uji regresi.
```

### 3. E2E test via Playwright

```text
/e2e Buat test Playwright untuk flow login → lihat dashboard → logout,
pakai Page Object Model. Jalankan dan pastikan hijau.
```

Atau langsung dari terminal:

```bash
npx playwright test --project=chromium
npx playwright screenshot https://example.com /tmp/shot.png
```

### 4. Code graph query via ast-grep

```text
Gunakan ast-grep untuk menemukan semua pemanggilan fungsi `authenticate()` di
folder src, tampilkan file & baris, lalu usulkan rename yang aman ke `requireAuth()`.
Sertakan output struktural dari `sg` agar tidak ada yang terlewat oleh regex.
```

Contoh perintah yang diharapkan dijalankan agent:

```bash
sg -p 'authenticate($$$ARGS)' -l ts src --json
```

### 5. Security audit via Strix

```text
Jalankan Strix headless terhadap direktori proyek ini untuk memeriksa
kerentanan kode. Ringkas temuan CRITICAL/HIGH dan buat rencana mitigasi urut prioritas.
```

Perintah yang akan dieksekusi:

```bash
strix -n --target .
```

> Ingat: Docker daemon harus berjalan (`sudo systemctl start docker`) dan `STRIX_LLM` + `LLM_API_KEY` sudah terisi di `.env`.

### 6. Browser automation interaktif (Browser Use)

```text
Gunakan browser-use untuk membuka https://login.example.com, login dengan kredensial
yang ada di variabel env, dan catat daftar item di halaman dashboard.
```

### 7. Komponen UI on-demand (shadcn/ui + Magic UI)

```text
Tambah komponen shadcn/ui `dialog` dan `dropdown-menu`, lalu buat satu komponen
Magic UI (via MCP magic) untuk section hero yang animasi. Sesuaikan dengan
design system proyek setelah generate.
```

---

## Pemecahan Masalah

| Gejala | Solusi |
|--------|--------|
| Strix gagal/eror scan | Pastikan Docker daemon berjalan + `STRIX_LLM`/`LLM_API_KEY` ada di `~/.config/opencode/.env` |
| Plugin hooks tidak berjalan | Plugin di-install dengan `--no-hooks`; set `ECC_HOOK_PROFILE=standard` di `.env` lalu mulai sesi baru |
| Tool global tidak ketemu (`strix`, `browser-use`) | Buka shell login baru (PATH `~/.local/bin` baru di-load) |
| Playwright error "browser not installed" | `npx playwright install chromium` |
| Sub-proses tidak melihat variabel `.env` | Verifikasi `plugins/dotenv.ts` ter-load di log (`--print-logs`); nilai hanya di-inject bila belum ada di environment asli |
| `dist/` tertinggal dari edit `plugins/*.ts` | Source `./plugins/*.ts` adalah yang dieksekusi OpenCode; rebuild `dist/` hanya untuk parity, tidak wajib |
| `ecc repair` menimpa kustomisasi | **Jangan jalankan tanpa backup**: 3 file managed sengaja dimodifikasi (`README.md`, `opencode.json`, `plugins/index.ts`). Repair mengembalikannya ke versi asli ECC dan menghapus kustomisasi (README, entry plugin superpowers, registrasi dotenv). Restore dari repo git bila perlu |

---

## Lisensi

Repository konfigurasi pribadi; komponen di dalamnya mengikuti lisensi masing-masing (ECC: **MIT**; Superpowers: lihat lisensi obra/superpowers; sisanya tertulis di dokumentasi masing-masing tool).