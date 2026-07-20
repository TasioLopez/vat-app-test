# Gotenberg setup (DOCX → PDF for vision extraction)

Gotenberg converts Word intake uploads (`.doc`, `.docx`, `.docm`) to PDF before OpenAI vision extraction. PDF uploads skip Gotenberg entirely.

## Cost

Fly.io always-on deployment (1 GB, `ams`): **~$5.70–7/month**. Set a **$10 billing alert** in the Fly dashboard.

## Production (Fly.io)

### 1. Prerequisites

- [Fly.io](https://fly.io) account with payment method
- [flyctl](https://fly.io/docs/hands-on/install-flyctl/) installed

### 2. Deploy

```bash
cd infra/gotenberg
fly auth login
fly launch --no-deploy --name vat-gotenberg --region ams
fly deploy
fly status
curl https://vat-gotenberg.fly.dev/health
```

Replace `vat-gotenberg` if you choose another app name; update `GOTENBERG_URL` accordingly.

### 3. Smoke-test DOCX conversion

```bash
curl -X POST https://vat-gotenberg.fly.dev/forms/libreoffice/convert \
  -F "files=@path/to/intake.docx" \
  --output test.pdf
```

Open `test.pdf` and confirm checkboxes (e.g. sectie 17 opleiding) are visible.

### 4. Vercel

1. Project → **Settings → Environment Variables**
2. Add `GOTENBERG_URL` = `https://vat-gotenberg.fly.dev` (no trailing slash)
3. Apply to Production (and Preview if needed)
4. **Redeploy** the app

## Local development

```bash
docker run --rm -p 3000:3000 gotenberg/gotenberg:8
```

In `.env.local`:

```env
GOTENBERG_URL=http://localhost:3000
```

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `GOTENBERG_URL is not configured` | Env var missing on Vercel or locally |
| `Documentconverter tijdelijk niet beschikbaar` | Fly machine down or `/health` failing |
| Autofill timeout | Vercel function limit; worker-profile autofill uses `maxDuration = 180` |
| Empty autofill on DOCX | Gotenberg unreachable; check Fly logs: `fly logs` |

## Optional: API key (v2)

The app supports `GOTENBERG_API_KEY` if you add basic auth in front of Gotenberg later. Not required for v1.
