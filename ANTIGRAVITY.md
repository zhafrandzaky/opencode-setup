# ANTIGRAVITY.md — Port Konfigurasi ke Antigravity IDE

> Status: terpasang & terverifikasi struktur (2026-10-06).
> Dokumen ini mencatat **apa yang dipindahkan** dari konfigurasi OpenCode (`~/.config/opencode/`)
> ke **Antigravity global config** (`~/.gemini/`), apa yang tidak portabel, dan cara re-sync.

## Ringkasan hasil

| Komponen | Lokasi Antigravity | Jumlah | Catatan |
|---|---|---|---|
| **Skills** | `~/.gemini/config/skills/` | **232** | 218 ECC + 13 Taste + 1 `impeccable` (milik user). Nama folder disamakan dengan `name:` frontmatter (5 skill ECC lama di-rename: `scientific-*` → `pubmed-database`, `uspto-database`, `gget`, `literature-review`, `scholar-evaluation`) |
| **Rules global** | `~/.gemini/config/AGENTS.md` | 1 | Salinan `AGENTS.md` repo (always-on) |
| **Rules modular** | `~/.gemini/config/rules/ecc-instructions.md` | 1 | Dari `instructions/INSTRUCTIONS.md` + frontmatter `trigger: always_on` |
| **Agents** | `~/.gemini/config/agents/` | **25** | Subagent ECC; tool dimapping resmi (`Read→view_file`, `Edit→replace_file_content`, `Bash→run_command`, dst.), `model: inherit`, `subagent: true` |
| **Workflows** | `~/.gemini/config/global_workflows/` | **26** | Slash command: `/plan`, `/tdd`, `/code-review`, `/security`, ... (dari `command` di `opencode.json`) |
| **Plugin** | `~/.gemini/config/plugins/superpowers/` | 15 skill | Bundle manual (`plugin.json` + `skills/`) karena CLI `agy` belum ada di sistem |
| **MCP servers** | `~/.gemini/config/mcp_config.json` | **4 aktif** | `context7`, `memory`, `parallel-search`, `playwright`. 29 server lain → `~/.gemini/config/mcp_catalog.reference.json` (referensi, tidak dibaca IDE) |

## Pemetaan komponen

| OpenCode | Antigravity | Mekanisme |
|---|---|---|
| `skills/*/SKILL.md` (231) | `~/.gemini/config/skills/*/SKILL.md` | Salin folder; folder = `name:` frontmatter |
| `AGENTS.md` | `~/.gemini/config/AGENTS.md` | Rules global (always-on) |
| `instructions/INSTRUCTIONS.md` | `~/.gemini/config/rules/ecc-instructions.md` | Rules modular (`trigger: always_on`) |
| `prompts/agents/*.txt` + `agent` di `opencode.json` | `~/.gemini/config/agents/*.md` | Konversi frontmatter (mapping tool dari installer resmi ECC) |
| `command` di `opencode.json` (26) | `~/.gemini/config/global_workflows/*.md` | Workflow = markdown (slash command dari nama file) |
| Plugin `superpowers@git+...` | `~/.gemini/config/plugins/superpowers/` | Bundle plugin (plugin.json + skills) |
| `mcp-configs/mcp-servers.json` | `~/.gemini/config/mcp_config.json` | `mcpServers`; `type:http`+`url` → `serverUrl` |

## Yang TIDAK portabel + padanannya

1. **Plugin hooks ECC** (`plugins/ecc-hooks.ts`, `lib/ecc-hooks-v2.ts`) — API plugin spesifik OpenCode.
   Antigravity punya `hooks.json` sendiri (belum diport). Fungsi kunci tetap terjaga lewat:
   rules global (panduan), plugin Superpowers (session-start hook), dan kebiasaan TDD/verifikasi.
2. **8 custom tools ECC** — tidak ada padanan registrasi tool. Padanan operasional via `run_command`:

   | Tool OpenCode | Padanan di Antigravity |
   |---|---|
   | `run-tests` | `npm test` / `pytest` / `go test` |
   | `check-coverage` | `npm run coverage` / `pytest --cov` |
   | `security-audit` | `npm audit`, `gitleaks`, atau `strix -n --target .` |
   | `format-code` | `npx prettier --write <file>` / `biome format --write` |
   | `lint-check` | `npx eslint <target>` / `ruff check` |
   | `git-summary` | `git status -sb && git log --oneline -5` |
   | `changed-files` | `git status --short` / diff panel Antigravity |
   | `dependency-analyzer` | `npm outdated && npm audit` |

3. **Plugin `dotenv.ts`** — Antigravity tidak memuat `.env` kita. Kredensial MCP ditaruh di blok
   `env` per-server pada `mcp_config.json` (file ini **tidak** masuk repo). Untuk env umum:
   GUI app tidak membaca `~/.bashrc`; gunakan `systemctl --user set-environment KEY=...` +
   restart IDE, atau jalankan IDE dari terminal.

## Antigravity CLI (`agy` 1.3.0) — terverifikasi 2026-10-06

| Cek | Hasil |
|---|---|
| `agy mcp list` | ✅ 4 server (context7, memory, parallel-search, playwright) — enabled |
| Skills | ✅ terbaca dari `~/.gemini/config/skills/` (satu-satunya path yang dikenali AGY+CLI+IDE) |
| Rules | ✅ `user_global` (`config/AGENTS.md`) + `config/rules/ecc-instructions.md` |
| Agents | ✅ 25 subagent global terlihat (`~/.gemini/config/agents/`) |
| Workflows | ✅ 26 slash command (`/plan`, `/tdd`, ... `/projects`) |
| Plugin superpowers | ✅ terdaftar — `agy plugins list` mencatat `skills: 15 processed` |

**Registrasi plugin ke CLI** — `agy plugin install <target>` butuh **path direktori**, dan tujuan install = `~/.gemini/config/plugins/` (lokasi global yang sama). Jika bundle sudah ada di tujuan, install langsung gagal ("source and destination are the same directory"). Prosedur yang terbukti:

```bash
cp -r ~/.gemini/config/plugins/superpowers /tmp/sp-plugin
rm -rf ~/.gemini/config/plugins/superpowers
agy plugin install /tmp/sp-plugin     # menyalin balik + register (skills: 15 processed)
rm -rf /tmp/sp-plugin
```

Pada versi CLI yang lebih baru, cara resmi Superpowers: `agy plugin install https://github.com/obra/superpowers` (bundle manual tidak diperlukan).

**Verifikasi cepat CLI:**

```bash
agy mcp list                          # daftar MCP
agy plugins list                      # plugin terdaftar
agy -p "Sebutkan 3 skill dan nama workflow global" --print-timeout 120s
# prompt headless yang butuh tool: tambahkan --dangerously-skip-permissions (hati-hati)
```

## Cara re-sync (mesin baru / update)

Jalankan dari `~/.config/opencode/` (semua idempoten, aman diulang):

```bash
# 1. Skills (normalisasi 5 nama legacy ECC)
for src in skills/*/; do cp -r "$src" ~/.gemini/config/skills/; done
cd ~/.gemini/config/skills
mv scientific-db-pubmed-database pubmed-database 2>/dev/null; mv scientific-db-uspto-database uspto-database 2>/dev/null
mv scientific-pkg-gget gget 2>/dev/null; mv scientific-thinking-literature-review literature-review 2>/dev/null
mv scientific-thinking-scholar-evaluation scholar-evaluation 2>/dev/null; cd -

# 2. Rules
mkdir -p ~/.gemini/config/rules && cp AGENTS.md ~/.gemini/config/AGENTS.md
{ printf -- '---\ntrigger: always_on\ndescription: "ECC core rules"\n---\n\n'; sed 's/^# ECC - OpenCode Instructions$/# ECC - Core Instructions/' instructions/INSTRUCTIONS.md; } > ~/.gemini/config/rules/ecc-instructions.md

# 3. Workflows
mkdir -p ~/.gemini/config/global_workflows
python3 - <<'PY'
import json, os, re, shutil
d=json.load(open('opencode.json')); out=os.path.expanduser('~/.gemini/config/global_workflows')
for name,cfg in d['command'].items():
    m=re.search(r'\{file:([^}]+)\}', cfg.get('template',''))
    if m and os.path.isfile(m.group(1)): shutil.copyfile(m.group(1), os.path.join(out, f'{name}.md'))
PY

# 4. Agents (sumber: paket ECC; cari otomatis)
ECC=$(find ~/.npm/_npx -type d -path "*ecc-universal" 2>/dev/null | head -1)
# (script konversi: lihat riwayat commit / minta AI menjalankan ulang langkah "Fase 3")
```

- **Plugin Superpowers:** copy `~/.cache/opencode/**/node_modules/superpowers/skills/*` → `~/.gemini/config/plugins/superpowers/skills/`.
  Jika CLI `agy` tersedia: `agy plugin install https://github.com/obra/superpowers` (lalu hapus bundle manual).
- **MCP:** regenerasi dari `mcp-configs/mcp-servers.json`. **PENTING:** Antigravity IDE mengabaikan `disabled: true` — hanya cantumkan server yang benar-benar siap di `mcp_config.json`; server lain simpan di `mcp_catalog.reference.json` dan salin masuk saat diperlukan.

## Verifikasi

- [x] 232 skill: folder = `name:` frontmatter, tidak ada duplikat
- [x] 25 agen: frontmatter valid (`name`, `description`, `tools`, `model: inherit`, `subagent: true`)
- [x] 26 workflow & 2 rules terpasang
- [x] `plugin.json` + `mcp_config.json` (4 aktif) + `mcp_catalog.reference.json` (29) valid JSON

## Catatan penting: MCP & `disabled`

Temuan saat verifikasi (2026-10-06): **Antigravity IDE tetap menjalankan semua server di `mcp_config.json` meskipun `disabled: true`** (terbukti dari log: jira hang 30s, browser-use gagal OAuth 404, github/firecrawl ikut berjalan). Karena itu:

- `mcp_config.json` **hanya** berisi server yang siap pakai (4 server).
- Server lain ada di `mcp_catalog.reference.json` (file ini **tidak** dibaca Antigravity).
- Untuk mengaktifkan server tertentu: salin entri-nya dari file referensi ke `mcp_config.json`, isi kredensial di blok `env`/`headers`, lalu reload MCP dari UI.
- Setelah mengubah `mcp_config.json`, lakukan **reload MCP** lewat panel: `… → MCP Servers → Manage MCP Servers` (atau restart IDE) agar instance lama dihentikan.
- [ ] Cek di UI Antigravity IDE: panel **Customizations** (rules/workflows), `/` (workflows), **MCP Store → View raw config**, dan daftar skills
- [x] CLI `agy`: MCP list ✔ · rules ✔ · agents ✔ · 26 workflow ✔ · plugin superpowers terdaftar ✔
