# 03 · DEVOPS & QA

## Comandos
- `npm run dev` · servidor local Vite
- `npm test` · Vitest (motor fiscal + import/export)
- `npm run build` · `tsc -b && vite build` → `dist/`
- `npm run deploy` · build + `wrangler deploy` (requiere `wrangler login` o `CLOUDFLARE_API_TOKEN`)

## Cloudflare
- `WORKER_NAME`: `isr-calc`
- `CONFIG`: `wrangler.jsonc` → `assets.directory=./dist`, `not_found_handling=single-page-application`
- `URL`: pendiente (workers.dev tras primer deploy)

## QA
- `R-QA-01`: Toda regla fiscal nueva requiere prueba en `src/lib/tax.test.ts`
- `R-QA-02`: Import debe reportar filas inválidas sin abortar el resto
