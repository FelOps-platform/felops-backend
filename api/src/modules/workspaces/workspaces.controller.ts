import type { Request, Response } from 'express';
import { getAuthUser } from '../../middleware/authenticate.js';
import { getValidated } from '../../middleware/validate.js';
import type { CreateWorkspaceInput, WorkspaceParamsInput } from './workspaces.schemas.js';
import { createWorkspace, getWorkspace, listWorkspaces } from './workspaces.service.js';

export async function listWorkspacesHandler(_req: Request, res: Response): Promise<void> {
  const { userId } = getAuthUser(res);
  const workspaces = await listWorkspaces(userId);
  res.status(200).json({ data: workspaces });
}

export async function createWorkspaceHandler(_req: Request, res: Response): Promise<void> {
  const { userId } = getAuthUser(res);
  const { body } = getValidated<CreateWorkspaceInput>(res);
  const workspace = await createWorkspace({ userId, name: body.name });
  res.status(201).json({ data: workspace });
}

export async function getWorkspaceByIdHandler(_req: Request, res: Response): Promise<void> {
  const { userId } = getAuthUser(res);
  const { params } = getValidated<unknown, unknown, WorkspaceParamsInput>(res);
  const workspace = await getWorkspace({ userId, workspaceId: params.workspaceId });
  res.status(200).json({ data: workspace });
}
