import { Router } from 'express';
import {
  getAmbientes,
  getAmbienteById,
  createAmbiente,
  updateAmbiente,
  deleteAmbiente,
} from '../controllers/ambientesController';

const router = Router();

router.get('/', getAmbientes);
router.get('/:id', getAmbienteById);
router.post('/', createAmbiente);
router.patch('/:id', updateAmbiente);
router.delete('/:id', deleteAmbiente);

export default router;
