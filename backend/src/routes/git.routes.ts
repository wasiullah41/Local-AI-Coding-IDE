import { Router } from 'express';
import { gitController } from '../controllers/git.controller';

const router = Router();

router.get('/status', (req, res, next) => gitController.getStatus(req, res, next));
router.post('/stage', (req, res, next) => gitController.stage(req, res, next));
router.post('/unstage', (req, res, next) => gitController.unstage(req, res, next));
router.post('/commit', (req, res, next) => gitController.commit(req, res, next));

export default router;
