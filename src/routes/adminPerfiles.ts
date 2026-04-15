import { Router } from 'express';
import { upsertAdminPerfil } from '../controllers/adminPerfilesController';

const router = Router();

router.patch('/:id', upsertAdminPerfil);

export default router;

