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
    const authHeader = req.headers.authorization?.trim();
    const bearerMatch = authHeader ? /^Bearer\s+(.+)$/i.exec(authHeader) : null;

    if (!bearerMatch) {
      return res.status(401).json({
        status: 'error',
        message:
          'No se proporcionó un token de autenticación válido. Usá el header Authorization: Bearer <access_token> (token JWT del login).',
      });
    }

    const token = bearerMatch[1]!.trim();

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
