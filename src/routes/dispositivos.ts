import { Router } from 'express';
import {
  getDispositivos,
  getDispositivoById,
  createDispositivo,
  updateDispositivo,
  deleteDispositivo,
} from '../controllers/dispositivosController';

const router = Router();

router.get('/', getDispositivos);
router.get('/:id', getDispositivoById);
router.post('/', createDispositivo);
router.patch('/:id', updateDispositivo);
router.delete('/:id', deleteDispositivo);

export default router;
