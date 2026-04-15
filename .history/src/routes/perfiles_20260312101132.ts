import { Router } from 'express';
import { getPerfil, updatePerfil } from '../controllers/perfilesController';

const router = Router();

router.get('/:id', getPerfil);
router.patch('/:id', updatePerfil);

export default router;
