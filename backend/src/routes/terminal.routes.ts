import { Router } from 'express';
import { terminalController } from '../controllers/terminal.controller';

const router = Router();

router.get('/sessions', (req, res) => terminalController.getSessions(req, res));
router.get('/default-shell', (req, res) => terminalController.getDefaultShell(req, res));

export default router;
