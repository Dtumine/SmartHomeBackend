import { Router } from 'express';
import { getViviendas, getViviendaById, createVivienda } from '../controllers/viviendasController';

const router = Router();

router.get('/', getViviendas);
router.get('/:id', getViviendaById);
router.post('/', createVivienda);

export default router;
