import { Router } from 'express';
import { filesystemController } from '../controllers/filesystem.controller';
import { validatePath, validateRequired } from '../middleware/validation.middleware';
import { validateWorkspaceBoundary } from '../middleware/security.middleware';

const router = Router();

router.get('/directory', validatePath, validateWorkspaceBoundary, (req, res, next) => filesystemController.readDirectory(req, res, next));
router.get('/file', validatePath, validateWorkspaceBoundary, (req, res, next) => filesystemController.readFile(req, res, next));
router.put('/file', validatePath, validateRequired('path'), validateWorkspaceBoundary, (req, res, next) => filesystemController.writeFile(req, res, next));
router.post('/file', validatePath, validateRequired('path'), validateWorkspaceBoundary, (req, res, next) => filesystemController.createFile(req, res, next));
router.post('/directory', validatePath, validateRequired('path'), validateWorkspaceBoundary, (req, res, next) => filesystemController.createDirectory(req, res, next));
router.put('/rename', validateRequired('oldPath', 'newPath'), validateWorkspaceBoundary, (req, res, next) => filesystemController.rename(req, res, next));
router.delete('/delete', validateRequired('path'), validateWorkspaceBoundary, (req, res, next) => filesystemController.delete(req, res, next));
router.get('/stats', validatePath, validateWorkspaceBoundary, (req, res, next) => filesystemController.getStats(req, res, next));

export default router;
