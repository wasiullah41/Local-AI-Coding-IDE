import { Router } from 'express';
import { workspaceController } from '../controllers/workspace.controller';
import { validateRequired } from '../middleware/validation.middleware';

const router = Router();

router.post('/open', validateRequired('path'), (req, res, next) => workspaceController.open(req, res, next));
router.get('/current', (req, res) => workspaceController.getCurrent(req, res));
router.get('/recent', (req, res, next) => workspaceController.getRecent(req, res, next));

export default router;
