import { Router } from 'express';
import { systemController } from '../controllers/system.controller';

const router = Router();

router.get('/info', (req, res) => systemController.getInfo(req, res));
router.get('/health', (req, res) => systemController.health(req, res));

export default router;
