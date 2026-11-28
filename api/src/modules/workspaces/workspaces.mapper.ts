import type { WorkspaceWithAgentCount } from './workspaces.repository.js';

export const WORKSPACE_OWNER_ROLE = 'owner' as const;

export interface WorkspaceDto {
  id: number;
  name: string;
  role: typeof WORKSPACE_OWNER_ROLE;
  agentsCount: number;
  createdAt: string;
}

export function toWorkspaceDto(row: WorkspaceWithAgentCount): WorkspaceDto {
  return {
    id: row.id,
    name: row.name,
    role: WORKSPACE_OWNER_ROLE,
    agentsCount: row.agentsCount,
    createdAt: row.createdAt.toISOString(),
  };
}
