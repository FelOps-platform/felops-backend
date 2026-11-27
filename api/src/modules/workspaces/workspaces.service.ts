import { getDb } from '../../config/db.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../errors/app-error.js';
import { toWorkspaceDto } from './workspaces.mapper.js';
import type { WorkspaceDto } from './workspaces.mapper.js';
import {
  countOwnedWorkspaces,
  findOwnedWorkspaceById,
  insertWorkspace,
  listWorkspacesByOwner,
  lockWorkspaceOwner,
} from './workspaces.repository.js';

export const MAX_OWNED_WORKSPACES = 10;
const WORKSPACE_RESOURCE_NAME = 'workspace';

export async function listWorkspaces(userId: number): Promise<WorkspaceDto[]> {
  const rows = await listWorkspacesByOwner(userId);
  return rows.map(toWorkspaceDto);
}

export async function createWorkspace(input: {
  userId: number;
  name: string;
}): Promise<WorkspaceDto> {
  const created = await getDb().transaction(async (tx) => {
    // Lock the owner row so concurrent workspace creations serialize the 10-workspace cap check.
    const ownerExists = await lockWorkspaceOwner(input.userId, tx);
    if (!ownerExists) {
      throw new UnauthorizedError('Authenticated user not found', 'UNAUTHENTICATED');
    }

    const existingCount = await countOwnedWorkspaces(input.userId, tx);
    if (existingCount >= MAX_OWNED_WORKSPACES) {
      throw new ConflictError(
        `Maximum of ${MAX_OWNED_WORKSPACES} owned workspaces reached`,
        'WORKSPACE_LIMIT_REACHED',
      );
    }

    return insertWorkspace({ ownerId: input.userId, name: input.name }, tx);
  });

  return toWorkspaceDto(created);
}

export async function getWorkspace(input: {
  userId: number;
  workspaceId: number;
}): Promise<WorkspaceDto> {
  const workspace = await findOwnedWorkspaceById({
    workspaceId: input.workspaceId,
    ownerId: input.userId,
  });
  if (!workspace) {
    throw new NotFoundError('Workspace not found', 'NOT_FOUND', [
      { resource: WORKSPACE_RESOURCE_NAME },
    ]);
  }
  return toWorkspaceDto(workspace);
}
