import { Router } from 'express';
import workspaceRoutes from './workspace.routes';
import filesystemRoutes from './filesystem.routes';
import searchRoutes from './search.routes';
import terminalRoutes from './terminal.routes';
import gitRoutes from './git.routes';
import settingsRoutes from './settings.routes';
import extensionsRoutes from './extensions.routes';
import systemRoutes from './system.routes';
import agentRoutes from './agent.routes';

const router = Router();

router.use('/workspace', workspaceRoutes);
router.use('/fs', filesystemRoutes);
router.use('/search', searchRoutes);
router.use('/terminal', terminalRoutes);
router.use('/git', gitRoutes);
router.use('/settings', settingsRoutes);
router.use('/extensions', extensionsRoutes);
router.use('/system', systemRoutes);
router.use('/agent', agentRoutes);

export default router;
