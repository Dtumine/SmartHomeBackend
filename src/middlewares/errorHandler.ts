import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('--- Error Detectado ---');
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // Solo enviamos el stack si estamos en desarrollo
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
