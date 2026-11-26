import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import {
  createWorkspaceHandler,
  getWorkspaceByIdHandler,
  listWorkspacesHandler,
} from './workspaces.controller.js';
import { createWorkspaceSchema, workspaceParamsSchema } from './workspaces.schemas.js';

export const workspacesRouter = Router();

workspacesRouter.use(authenticate);
workspacesRouter.get('/', listWorkspacesHandler);
workspacesRouter.post('/', validate({ body: createWorkspaceSchema }), createWorkspaceHandler);
workspacesRouter.get(
  '/:workspaceId',
  validate({ params: workspaceParamsSchema }),
  getWorkspaceByIdHandler,
);
