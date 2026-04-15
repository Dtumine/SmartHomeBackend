// Debe ser la primera importación: carga .env antes de cualquier otro módulo que lea process.env
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import viviendaRoutes from './routes/viviendas';
import ambienteRoutes from './routes/ambientes';
import dispositivoRoutes from './routes/dispositivos';
import perfilRoutes from './routes/perfiles';
import authRoutes from './routes/auth';
import adminUsersRoutes from './routes/adminUsers';
import adminViviendasRoutes from './routes/adminViviendas';
import adminPerfilesRoutes from './routes/adminPerfiles';
import { errorHandler } from './middlewares/errorHandler';
import { authenticate } from './middlewares/authMiddleware';
import { requireAdminKey } from './middlewares/adminAuthMiddleware';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

/** CORS: en Render puedes fijar CORS_ORIGIN (coma-separado). Vacío = '*' (útil para Flutter Web en dev). */
const corsOriginEnv = process.env.CORS_ORIGIN?.trim();
const corsOrigin =
  corsOriginEnv && corsOriginEnv !== '*'
    ? corsOriginEnv.split(',').map((o) => o.trim()).filter(Boolean)
    : '*';

// Middlewares
app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'],
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes); // No protegido para permitir login
// Gestión de usuarios (Supabase Auth Admin): requiere X-Admin-Key y SUPABASE_SERVICE_ROLE_KEY en servidor
app.use('/api/admin/users', requireAdminKey, adminUsersRoutes);
app.use('/api/admin/perfiles', requireAdminKey, adminPerfilesRoutes);
app.use('/api/admin/viviendas', requireAdminKey, adminViviendasRoutes);
app.use('/api/viviendas', authenticate, viviendaRoutes);
app.use('/api/ambientes', authenticate, ambienteRoutes);
app.use('/api/dispositivos', authenticate, dispositivoRoutes);
app.use('/api/perfiles', authenticate, perfilRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido al backend de Smarthome' });
});

/** Health check para Render (y monitoreo). No requiere auth. */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime_s: Math.round(process.uptime()),
    ts: new Date().toISOString(),
  });
});

// Middleware de manejo de errores (siempre al final de las rutas)
app.use(errorHandler);

// 0.0.0.0: obligatorio en PaaS (Render, Fly, etc.) para aceptar tráfico externo; PORT lo inyecta Render.
app.listen(PORT, '0.0.0.0', () => {
  const publicUrl = process.env.RENDER_EXTERNAL_URL;
  console.log(
    `Servidor escuchando en 0.0.0.0:${PORT}${publicUrl ? ` | público: ${publicUrl}` : ''}`
  );
});
