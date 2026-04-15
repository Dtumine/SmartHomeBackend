import { Router } from 'express';
import {
  createAdminVivienda,
  listAdminViviendas,
} from '../controllers/adminViviendasController';

const router = Router();

router.get('/', listAdminViviendas);
router.post('/', createAdminVivienda);

export default router;

