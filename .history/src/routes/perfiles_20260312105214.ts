import { Router } from 'express';
import { getPerfil, updatePerfil } from '../controllers/perfilesController';

const router = Router();

router.get('/', getPerfil);
router.patch('/', updatePerfil);

export default router;
