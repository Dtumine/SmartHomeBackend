# Despliegue en Render (Smarthome_backend)

Node/Express + TypeScript. El código escucha en `0.0.0.0` y usa `process.env.PORT` (Render lo inyecta). No subir secretos al repo: usar solo el dashboard de Render (o variables del servicio).

## Comandos sugeridos en Render

| Campo | Valor |
|--------|--------|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

### Por qué `npm install` completo en el build

`typescript` está en **devDependencies** y el script `build` ejecuta `tsc`. Si el pipeline hiciera `npm install --production` o `npm ci --omit=dev` **antes** del build, `tsc` no estaría disponible y el build fallaría.

- En Render, deja el build como **`npm install && npm run build`** (instalación normal, con devDependencies), luego `npm start` en runtime.
- En runtime, Render suele ejecutar `npm start` sin omitir dev por defecto en muchos casos; si en algún plan usaras solo dependencias de producción en el **start**, basta con que `dist/` ya exista del paso de build (el artefacto desplegado incluye `dist`).

## Variables de entorno (dashboard Render)

Cargar en **Environment** del Web Service (no commitear en `.env` al repo).

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `SUPABASE_URL` | Sí (API útil) | URL del proyecto Supabase. |
| `SUPABASE_ANON_KEY` | Sí | Cliente anon: auth (`getUser` con JWT del cliente), rutas que usan `lib/supabase.ts`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí para BD/admin | Cliente servidor, bypass RLS; rutas que usan `supabaseServer` / admin. Sin esto, el servidor arranca pero responde **503** en esas rutas (ver logs al arrancar). |
| `ADMIN_API_KEY` | Solo si usás rutas admin con `X-Admin-Key` | `adminAuthMiddleware`. |
| `NODE_ENV` | Recomendado: `production` | Morgan en formato `combined`; el `errorHandler` no envía stack al cliente. |
| `CORS_ORIGIN` | No | Orígenes permitidos separados por coma. Si no se define, CORS usa `*` (válido para Flutter Web en desarrollo; en producción podés restringir al dominio de tu app). |
| `PORT` | No (Render lo inyecta) | Puerto HTTP. Localmente por defecto `3000`. |

**No configurar manualmente:** `RENDER_EXTERNAL_URL` — Render lo define en el servicio; solo se usa en logs si existe.

**JWT:** no hay variable `JWT_SECRET` propia; la validación de sesión pasa por Supabase con la anon key en el servidor.

## Health checks

- `GET /` — JSON de bienvenida (200).
- `GET /health` — `{ status, uptime_s, ts }` (200), adecuado para **Health Check Path** en Render: `/health`.

## CORS y Flutter

Con URL pública `https://*.onrender.com`, si definís `CORS_ORIGIN`, incluí el origen desde el que sirve Flutter Web (por ejemplo `https://tu-dominio.com`) y, si aplica, `http://localhost:xxxx` para desarrollo. APK nativo no usa CORS del navegador; el origen `*` o lista explícita no afecta igual que en web.

## Comprobación local (sin tocar Render)

```powershell
cd Smarthome_backend
npm run build
$env:NODE_ENV="production"
$env:PORT="3999"
# Sin .env: el proceso arranca; rutas Supabase fallarán hasta cargar las tres variables de Supabase.
node dist/index.js
```

Luego abrir `http://127.0.0.1:3999/health`.

**Mínimo para que la API sea funcional (no solo “vivo”):** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Flutter

Tras el deploy, usar la URL pública del servicio, por ejemplo:

`--dart-define=API_BASE_URL=https://tu-servicio.onrender.com`

(Ajustar al path real si montás la API bajo prefijo; hoy las rutas están en la raíz del host, p. ej. `/api/...`.)
