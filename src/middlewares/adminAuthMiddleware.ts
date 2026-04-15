import { Request, Response, NextFunction } from 'express';

/**
 * Protege rutas de administración con una clave compartida (ADMIN_API_KEY en .env).
 * El front-end debe enviar el header: X-Admin-Key: <tu_clave>
 */
export const requireAdminKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const configured = process.env.ADMIN_API_KEY?.trim();
  if (!configured || configured.length < 12) {
    res.status(503).json({
      status: 'error',
      message:
        'Panel de administración no configurado: define ADMIN_API_KEY (mín. 12 caracteres) en el servidor.',
    });
    return;
  }

  const key = req.headers['x-admin-key'];
  if (typeof key !== 'string' || key !== configured) {
    res.status(403).json({
      status: 'error',
      message: 'Clave de administrador inválida o ausente (header X-Admin-Key).',
    });
    return;
  }

  next();
};
