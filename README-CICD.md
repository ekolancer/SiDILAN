# CI/CD GitHub Actions → Google Apps Script

Setiap `git push` ke branch `main` akan otomatis:
1. Push kode ke project Apps Script (`clasp push`)
2. Membuat versi baru + deploy ke Web App (`clasp deploy`)

## Yang perlu kamu set sekali saja

### 1. Buat file `~/.clasprc.json` (kredensial clasp)

Di komputer lokal kamu, login clasp:

```bash
clasp login
```

Ini membuat file `~/.clasprc.json`. Isinya kira-kira:

```json
{
  "tokens": {
    "default": {
      "access_token": "...",
      "refresh_token": "...",
      "scope": "...",
      "token_type": "Bearer",
      "expiry_date": 1234567890
    }
  },
  "oauth2ClientSettings": {
    "clientId": "...",
    "clientSecret": "...",
    "redirectUri": "http://localhost"
  },
  "isLocalCreds": false
}
```

Lihat isinya:

```bash
cat ~/.clasprc.json
```

### 2. Set GitHub Secrets

Buka: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

Buat 2 secret:

| Nama Secret | Isi |
|-------------|-----|
| `CLASPRC_JSON` | Seluruh isi file `~/.clasprc.json` (paste apa adanya) |
| `DEPLOYMENT_ID` | `AKfycbz-bdXUWk0txWhgB2uwubKYbFLtqAjEdaaq1ZkINySaZo0OZcHCKXaJOZm0xbSsrNer` |

> `DEPLOYMENT_ID` adalah ID deployment Web App kamu yang sekarang (`SiDILAN v1`).
> Dengan menyetel ini, setiap deploy akan **update deployment yang sama** sehingga
> **URL Web App tidak berubah**.

Kalau kamu punya beberapa project sebaiknya buat Secret per repo (level repo), bukan level org.

### 3. Push workflow-nya

```bash
git add .github .gitignore
git commit -m "ci: add GitHub Actions deploy to Apps Script"
git push origin main
```

Setelah push, buka tab **Actions** di GitHub. Kamu akan lihat workflow
**"Deploy to Apps Script"** berjalan.

## Cara kerja

- Trigger: `push` ke `main`, plus tombol manual (`workflow_dispatch`).
- Kredensial clasp ditulis ke `~/.clasprc.json` dari secret `CLASPRC_JSON`.
- `clasp push --force` mengirim kode.
- `clasp deploy --deploymentId "$DEPLOYMENT_ID"` membuat versi baru pada
  deployment yang sama → URL web app tetap.
- Deskripsi versi mencantumkan commit SHA + user yang trigger, biar mudah dilacak.

## Catatan penting

- **Appsscript.json native credentials / OAuth scopes**: kalau project kamu
  butuh scope tambahan, pastikan sudah ada di `appsscript.json`.
- **Refresh token bisa kadaluarsa**. Kalau workflow error
  `invalid_grant`, jalankan `clasp login` ulang di lokal, lalu update secret
  `CLASPRC_JSON` dengan isi baru.
- **Jangan commit** `~/.clasprc.json` (sudah masuk `.gitignore`).
- `scriptId` di `.clasp.json` bukan rahasia — aman di-commit (dan memang sudah
  ke-track), supaya CI tahu target project.

## Troubleshooting

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `invalid_rapt` / `invalid_grant` | Refresh token kadaluarsa | `clasp login` ulang, update secret `CLASPRC_JSON` |
| `Script ID is missing` | `.clasp.json` tidak ada / tidak ter-push | Pastikan `.clasp.json` ada di repo |
| `Deployment not found` | `DEPLOYMENT_ID` salah | Cek `clasp deployments`, update secret |
| `PERMISSION_DENIED` | Akun tidak punya akses ke script | Login pakai akun yang punya akses edit |
| URL Web App berubah | Tidak set `DEPLOYMENT_ID` | Set secret `DEPLOYMENT_ID` |
