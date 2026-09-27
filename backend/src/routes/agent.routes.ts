import { Router } from 'express';
import { agentController } from '../controllers/AgentController';

const router = Router();

router.post('/task', agentController.runTask.bind(agentController));
router.post('/cancel', agentController.cancelTask.bind(agentController));

export default router;
