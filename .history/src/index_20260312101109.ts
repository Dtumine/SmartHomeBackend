import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import viviendaRoutes from './routes/viviendas';
import dispositivoRoutes from './routes/dispositivos';

// Configuración de variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Rutas
app.use('/api/viviendas', viviendaRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido al backend de Smarthome' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
