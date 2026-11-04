# SNS trend dashboard

GitHub Pages serves only the dashboard HTML and JavaScript. A separate Vercel project rooted at server/ serves private dataset chunks and allowlisted Hugging Face images.

## Server deployment
Deploy server/ directly using the Vercel CLI. Do not upload private/ to GitHub. Set HF_READ_TOKEN as a server-side Vercel secret, and ALLOWED_ORIGIN=https://gayoung7-fnf.github.io. The original .env must never be deployed.

The five compressed datasets are bundled inside the server function, not exposed as static files. Responses are split into 2 MiB chunks. Only exact Hugging Face image URLs present in the two SNS datasets are accepted; arbitrary proxy requests are rejected. CORS limits browser access to the Pages origin, but is not authentication. As requested, data is accessible through the shared dashboard without a login.

## Pages deployment
Put the production Vercel origin in config.js apiBase. Enable Settings → Pages → GitHub Actions. Deploy the main branch with the included workflow. No token or private data belongs in the Pages artifact.

Original HTML, JSON, XLSX, and .env files are unchanged. Dataset compression preserves all original bytes; downloaded data still requires browser memory to decode and analyze.
