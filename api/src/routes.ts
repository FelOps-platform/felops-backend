import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { workspacesRouter } from './modules/workspaces/workspaces.routes.js';

export const clientRouter = Router();

clientRouter.use('/auth', authRouter);
clientRouter.use('/workspaces', workspacesRouter);
