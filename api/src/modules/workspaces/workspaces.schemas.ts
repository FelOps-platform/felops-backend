import { z } from 'zod';

const MAX_WORKSPACE_NAME_LENGTH = 50;
const PG_INT4_MAX = 2_147_483_647;

export const createWorkspaceSchema = z.strictObject({
  name: z.string().trim().min(1).max(MAX_WORKSPACE_NAME_LENGTH),
});

export const workspaceParamsSchema = z.strictObject({
  workspaceId: z.coerce.number().int().positive().max(PG_INT4_MAX),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type WorkspaceParamsInput = z.infer<typeof workspaceParamsSchema>;
