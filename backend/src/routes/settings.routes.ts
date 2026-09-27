import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';

const router = Router();

router.get('/', (req, res, next) => settingsController.get(req, res, next));
router.put('/', (req, res, next) => settingsController.update(req, res, next));
router.get('/defaults', (req, res) => settingsController.getDefaults(req, res));

export default router;
