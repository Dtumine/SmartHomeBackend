import { Router } from 'express';
import {
  getAmbientes,
  getAmbienteById,
  createAmbiente,
  updateAmbiente,
} from '../controllers/ambientesController';

const router = Router();

router.get('/', getAmbientes);
router.get('/:id', getAmbienteById);
router.post('/', createAmbiente);
router.patch('/:id', updateAmbiente);

export default router;
