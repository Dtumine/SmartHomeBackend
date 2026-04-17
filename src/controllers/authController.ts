import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

export const login = async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const email = (body as { email?: unknown }).email;
    const password = (body as { password?: unknown }).password;

    const emailStr = typeof email === 'string' ? email.trim() : '';
    const passwordStr = typeof password === 'string' ? password : '';

    if (!emailStr || !passwordStr) {
      return res.status(400).json({
        status: 'error',
        message:
          'Email y contraseña son requeridos. Enviá JSON con Content-Type: application/json (p. ej. {"email":"...","password":"..."}).',
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailStr,
      password: passwordStr,
    });

    if (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciales inválidas o error de autenticación'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: data.user,
        session: data.session
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error en el servidor durante el login'
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ status: 'success', message: 'Sesión cerrada' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
