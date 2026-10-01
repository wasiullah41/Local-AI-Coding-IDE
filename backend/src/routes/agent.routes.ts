import { Router } from 'express';
import { agentController } from '../controllers/AgentController';

const router = Router();

router.get('/status', (req, res, next) => agentController.getStatus(req, res, next));
router.get('/permissions', (req, res, next) => agentController.getPermissions(req, res, next));
router.put('/permissions', (req, res, next) => agentController.setPermission(req, res, next));
router.post('/task', (req, res, next) => agentController.runTask(req, res, next));
router.post('/cancel', (req, res, next) => agentController.cancelTask(req, res, next));
router.post('/permission/respond', (req, res, next) => agentController.respondPermission(req, res, next));
router.get('/task/:taskId', (req, res, next) => agentController.getTask(req, res, next));

export default router;
