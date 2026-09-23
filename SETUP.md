# SETUP — Panduan Instalasi dari Nol

> Panduan praktis untuk **laptop baru / siapa pun yang ingin mereplikasi konfigurasi ini**.
> Repo ini adalah isi dari `~/.config/opencode/`; `README.md` menjelaskan arsitektur & fitur,
> dokumen ini fokus pada langkah instalasi + verifikasi agar semuanya benar.

## Yang akan Anda dapatkan

- OpenCode dengan **26 agent**, **26 slash command**, dan **14 file instruction**
- **231 skill**: 218 ECC + 13 Taste Skill, plus 14 skill Superpowers
- **Plugin**: ECC hooks + 8 custom tools (`run-tests`, `security-audit`, `changed-files`, ...) + dotenv loader
- **Integrasi tool global**: Playwright, ast-grep (`sg`), Browser Use, Strix

---

## 0. Prasyarat Sistem

| Kebutuhan | Versi teruji | Catatan |
|---|---|---|
| Linux / macOS | CachyOS (Arch-based) | Windows: gunakan WSL |
| Git | — | Clone repo + plugin Superpowers (git-based) |
| Node.js + npm | v24.20.0 (fnm) | Minimal ≥18 |
| OpenCode CLI | 1.18.29 | `npm install -g opencode` |
| Docker | — | **Hanya diperlukan untuk Strix** |
| uv | 0.12.14 | Untuk `strix` & `browser-use` (Python tools) |
| Fish shell | 4.9.3 | Opsional — konfigurasi di Lampiran |

```bash
# Contoh Arch Linux (sesuaikan untuk distro/OS Anda)
sudo pacman -S git docker nodejs npm
npm install -g opencode
curl -LsSf https://astral.sh/uv/install.sh | sh   # uv
```

---

## 1. Clone ke Lokasi yang Benar

```bash
git clone https://github.com/zhafrandzaky/opencode-setup.git ~/.config/opencode
cd ~/.config/opencode
```

> **Penting:** path harus persis `~/.config/opencode/` — OpenCode membaca config global dari sana.

## 2. Dependensi Plugin

```bash
npm install
npx tsc --noEmit     # quality gate: harus 0 error
```

## 3. Autentikasi Provider Model

```bash
opencode auth login
```

Kredensial disimpan di store lokal OpenCode (**tidak pernah** masuk repo ini).

## 4. Environment `.env` (Secrets)

```bash
cp .env.example ~/.config/opencode/.env
$EDITOR ~/.config/opencode/.env
```

**Wajib** (untuk Strix):

| Variabel | Isi |
|---|---|
| `STRIX_LLM` | Model LLM, mis. `anthropic/claude-opus-4-7` / `openai/gpt-5` |
| `LLM_API_KEY` | API key provider di atas |

**Opsional umum:** `BROWSER_USE_API_KEY`, `GITHUB_PERSONAL_ACCESS_TOKEN`, `JIRA_*`, `FIRECRAWL_API_KEY`, `EXA_API_KEY`, `ECC_HOOK_PROFILE` — daftar lengkap + penjelasan ada sebagai komentar di `.env.example`.

Cara kerja: `plugins/dotenv.ts` memuat `.env` saat OpenCode start dan meng-inject-nya ke **semua sub-proses** via hook `shell.env`. Nilai dari shell asli selalu menang, dan `.env` tidak pernah ter-commit (`.gitignore`).

## 5. Tool Global

```bash
# Node tooling
npm install -g @ast-grep/cli playwright
npx playwright install chromium          # opsional: --with-deps (butuh sudo)

# Python tooling (via uv)
uv tool install strix-agent              # binary: strix
uv tool install browser-use              # binary: browser-use / bu

# Strix butuh Docker daemon berjalan
sudo systemctl enable --now docker
```

Pastikan `~/.local/bin` ada di `PATH` (binary `strix`, `browser-use`, `uv` dipasang di sana).

## 6. Shell (pilih sesuai shell Anda)

**Bash** (`~/.bashrc`) / **Zsh** (`~/.zshrc`):

```bash
export PATH="$HOME/.local/bin:$PATH"
eval "$(fnm env --use-on-cd)"    # bila memakai fnm
export NODE_PATH="$(npm root -g)"
```

**Fish** (`~/.config/fish/config.fish`): lihat Lampiran di bawah.

## 7. Verifikasi (wajib lulus semua)

```bash
# 1. Biner & versi
opencode --version
which strix browser-use uv sg playwright
npx tsc --noEmit                       # → exit 0

# 2. Smoke test runtime (plugin + skill + shell)
opencode run "Jalankan: echo READY. Lalu sebutkan apakah skill tdd-workflow,
design-taste-frontend, dan systematic-debugging tersedia."
```

Checklist:
- [ ] Semua binary ter-resolve (tidak ada "command not found")
- [ ] `tsc --noEmit` = 0 error
- [ ] Sesi OpenCode jalan **tanpa** `failed to load plugin` / `level=ERROR`
- [ ] Ketiga keluarga skill terdeteksi (ECC, Taste, Superpowers)
- [ ] `.env` terbaca: jalankan `opencode run "run: echo $STRIX_LLM"` (isi dulu `.env`)

---

## 8. Catatan ECC

- **Semua katalog ECC sudah ada di repo ini** (skills, commands, prompts, instructions) — tidak perlu menjalankan installer ECC untuk pemakaian normal.
- Paket ECC (`ecc-universal`) hanya diperlukan jika Anda ingin `ecc doctor` / `ecc update`.
- **Jangan jalankan `ecc repair` pada setup ini**: 3 file sengaja dimodifikasi (`README.md`, `opencode.json`, `plugins/index.ts`) dan akan ditimpa versi asli ECC. Detail: tabel Pemecahan Masalah di `README.md`.
- `ecc-install-state.json` tidak disertakan (berisi path machine-specific) — mesin baru akan melaporkan "no install-state" pada ECC CLI; **tidak memengaruhi runtime OpenCode**.

## 9. Update

```bash
cd ~/.config/opencode
git pull
npm install          # jika package.json/lock berubah
npx tsc --noEmit     # pastikan masih 0 error
```

- **Superpowers**: otomatis (plugin git, di-resolve saat start).
- **Taste Skill**: salin ulang dari upstream `Leonxlnx/taste-skill` sesuai `name:` frontmatter (lihat README bagian "Taste Skill").
- **ECC**: `git pull` sudah cukup untuk file katalog; hindari `ecc repair`.

## 10. Keamanan

- Secrets hanya di `~/.config/opencode/.env` (gitignored) dan di credential store OpenCode.
- Rotate API key jika pernah ter-expose.
- Jangan commit `auth.json`, `*.key`, `*credentials*` — pola sudah diblokir `.gitignore`.

## 11. Troubleshooting

Lihat tabel **Pemecahan Masalah** di [`README.md`](README.md#pemecahan-masalah). Kasus tersering:

| Gejala | Solusi |
|---|---|
| `strix`/`browser-use` tidak ditemukan | Buka shell login baru (`~/.local/bin` belum ter-load) |
| Strix gagal scan | Docker daemon belum jalan + pastikan `STRIX_LLM`/`LLM_API_KEY` terisi |
| Editor merah di `*.ts` | Jalankan `npm install` lalu restart TS server editor |
| Warning `skill path not found` | Tidak ada di versi ini (sudah dibersihkan); pastikan config terbaru |

---

## Lampiran — Fish Shell

Jika login shell **Fish**, tambahkan ke `~/.config/fish/config.fish` (**urutan penting**):

```fish
# -- OpenCode / global tooling environment --
fish_add_path ~/.local/bin
fnm env --use-on-cd | source
set -gx NODE_PATH (npm root -g 2>/dev/null)
```

Verifikasi:

```fish
which strix browser-use uv sg playwright
echo $NODE_PATH
fnm current
```

## Lingkungan Acuan (yang diuji)

CachyOS · OpenCode 1.18.29 · Node v24.20.0 (fnm) · npm 11.19.0 · bun 1.4.0 · uv 0.12.14 ·
Playwright 1.63.0 (Chromium 1243) · ast-grep 0.45.3 · Strix 1.6.2 · browser-use 0.1.13 · Fish 4.9.3

Versi lebih baru umumnya kompatibel; jika ada perbedaan perilaku, cek `README.md` dan changelog masing-masing tool.
