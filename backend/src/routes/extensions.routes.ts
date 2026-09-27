import { Router } from 'express';
import { extensionsController } from '../controllers/extensions.controller';

const router = Router();

router.get('/', (req, res) => extensionsController.getAll(req, res));
router.get('/:id', (req, res) => extensionsController.getById(req, res));
router.post('/:id/enable', (req, res) => extensionsController.enable(req, res));
router.post('/:id/disable', (req, res) => extensionsController.disable(req, res));

export default router;
