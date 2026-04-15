import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

// Extendemos la interfaz de Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No se proporcionó un token de autenticación válido'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verificar el token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        status: 'error',
        message: 'Token inválido o expirado'
      });
    }

    // Guardar el usuario en la request para usarlo en los controladores
    req.user = { id: user.id };
    if (user.email !== undefined) {
      req.user.email = user.email;
    }

    next();
  } catch (error) {
    next(error);
  }
};
