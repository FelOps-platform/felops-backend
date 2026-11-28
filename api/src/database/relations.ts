import { defineRelations } from 'drizzle-orm';
import * as schema from './schema.js';

export const relations = defineRelations(schema, (r) => ({
  users: {
    sessions: r.many.sessions({
      from: r.users.id,
      to: r.sessions.userId,
    }),
    authCodes: r.many.authCodes({
      from: r.users.id,
      to: r.authCodes.userId,
    }),
    ownedWorkspaces: r.many.workspaces({
      from: r.users.id,
      to: r.workspaces.ownerId,
    }),
    updatedActionSettings: r.many.workspaceActionSettings({
      from: r.users.id,
      to: r.workspaceActionSettings.updatedBy,
    }),
    connectedIntegrations: r.many.workspacesIntegrations({
      from: r.users.id,
      to: r.workspacesIntegrations.connectedBy,
    }),
    initiatedOauthStates: r.many.oauthStates({
      from: r.users.id,
      to: r.oauthStates.initiatedBy,
    }),
    decidedApprovals: r.many.approvals({
      from: r.users.id,
      to: r.approvals.decidedBy,
    }),
    createdKnowledgeSources: r.many.knowledgeSources({
      from: r.users.id,
      to: r.knowledgeSources.createdBy,
    }),
  },

  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
      optional: false,
    }),
  },

  authCodes: {
    user: r.one.users({
      from: r.authCodes.userId,
      to: r.users.id,
      optional: false,
    }),
  },

  workspaces: {
    owner: r.one.users({
      from: r.workspaces.ownerId,
      to: r.users.id,
      optional: false,
    }),
    agents: r.many.agents({
      from: r.workspaces.id,
      to: r.agents.workspaceId,
    }),
    actionSettings: r.many.workspaceActionSettings({
      from: r.workspaces.id,
      to: r.workspaceActionSettings.workspaceId,
    }),
    channels: r.many.workspacesChannels({
      from: r.workspaces.id,
      to: r.workspacesChannels.workspaceId,
    }),
    integrations: r.many.workspacesIntegrations({
      from: r.workspaces.id,
      to: r.workspacesIntegrations.workspaceId,
    }),
    oauthStates: r.many.oauthStates({
      from: r.workspaces.id,
      to: r.oauthStates.workspaceId,
    }),
    conversations: r.many.conversations({
      from: r.workspaces.id,
      to: r.conversations.workspaceId,
    }),
    executions: r.many.executions({
      from: r.workspaces.id,
      to: r.executions.workspaceId,
    }),
    approvals: r.many.approvals({
      from: r.workspaces.id,
      to: r.approvals.workspaceId,
    }),
    knowledgeSources: r.many.knowledgeSources({
      from: r.workspaces.id,
      to: r.knowledgeSources.workspaceId,
    }),
  },

  agents: {
    workspace: r.one.workspaces({
      from: r.agents.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    actions: r.many.agentsActions({
      from: r.agents.id,
      to: r.agentsActions.agentId,
    }),
    channels: r.many.workspacesChannels({
      from: r.agents.id,
      to: r.workspacesChannels.agentId,
    }),
    conversations: r.many.conversations({
      from: r.agents.id,
      to: r.conversations.agentId,
    }),
    executions: r.many.executions({
      from: r.agents.id,
      to: r.executions.agentId,
    }),
    approvals: r.many.approvals({
      from: r.agents.id,
      to: r.approvals.agentId,
    }),
    agentKnowledgeSources: r.many.agentsKnowledgeSources({
      from: r.agents.id,
      to: r.agentsKnowledgeSources.agentId,
    }),
    knowledgeSources: r.many.knowledgeSources({
      from: r.agents.id.through(r.agentsKnowledgeSources.agentId),
      to: r.knowledgeSources.id.through(r.agentsKnowledgeSources.sourceId),
    }),
  },

  agentsActions: {
    agent: r.one.agents({
      from: r.agentsActions.agentId,
      to: r.agents.id,
      optional: false,
    }),
  },

  workspaceActionSettings: {
    workspace: r.one.workspaces({
      from: r.workspaceActionSettings.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    updatedByUser: r.one.users({
      from: r.workspaceActionSettings.updatedBy,
      to: r.users.id,
      optional: true,
    }),
  },

  workspacesChannels: {
    workspace: r.one.workspaces({
      from: r.workspacesChannels.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    agent: r.one.agents({
      from: r.workspacesChannels.agentId,
      to: r.agents.id,
      optional: true,
    }),
    conversations: r.many.conversations({
      from: r.workspacesChannels.id,
      to: r.conversations.channelId,
    }),
  },

  workspacesIntegrations: {
    workspace: r.one.workspaces({
      from: r.workspacesIntegrations.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    connectedByUser: r.one.users({
      from: r.workspacesIntegrations.connectedBy,
      to: r.users.id,
      optional: true,
    }),
  },

  oauthStates: {
    workspace: r.one.workspaces({
      from: r.oauthStates.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    initiatedByUser: r.one.users({
      from: r.oauthStates.initiatedBy,
      to: r.users.id,
      optional: true,
    }),
  },

  conversations: {
    workspace: r.one.workspaces({
      from: r.conversations.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    agent: r.one.agents({
      from: r.conversations.agentId,
      to: r.agents.id,
      optional: false,
    }),
    channel: r.one.workspacesChannels({
      from: r.conversations.channelId,
      to: r.workspacesChannels.id,
      optional: false,
    }),
    messages: r.many.messages({
      from: r.conversations.id,
      to: r.messages.conversationId,
    }),
    executions: r.many.executions({
      from: r.conversations.id,
      to: r.executions.conversationId,
    }),
    approvals: r.many.approvals({
      from: r.conversations.id,
      to: r.approvals.conversationId,
    }),
  },

  messages: {
    conversation: r.one.conversations({
      from: r.messages.conversationId,
      to: r.conversations.id,
      optional: false,
    }),
  },

  executions: {
    workspace: r.one.workspaces({
      from: r.executions.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    agent: r.one.agents({
      from: r.executions.agentId,
      to: r.agents.id,
      optional: false,
    }),
    conversation: r.one.conversations({
      from: r.executions.conversationId,
      to: r.conversations.id,
      optional: false,
    }),
  },

  approvals: {
    workspace: r.one.workspaces({
      from: r.approvals.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    agent: r.one.agents({
      from: r.approvals.agentId,
      to: r.agents.id,
      optional: false,
    }),
    conversation: r.one.conversations({
      from: r.approvals.conversationId,
      to: r.conversations.id,
      optional: false,
    }),
    decidedByUser: r.one.users({
      from: r.approvals.decidedBy,
      to: r.users.id,
      optional: true,
    }),
  },

  knowledgeSources: {
    workspace: r.one.workspaces({
      from: r.knowledgeSources.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    createdByUser: r.one.users({
      from: r.knowledgeSources.createdBy,
      to: r.users.id,
      optional: true,
    }),
    agentKnowledgeSources: r.many.agentsKnowledgeSources({
      from: r.knowledgeSources.id,
      to: r.agentsKnowledgeSources.sourceId,
    }),
    agents: r.many.agents({
      from: r.knowledgeSources.id.through(r.agentsKnowledgeSources.sourceId),
      to: r.agents.id.through(r.agentsKnowledgeSources.agentId),
    }),
  },

  agentsKnowledgeSources: {
    agent: r.one.agents({
      from: r.agentsKnowledgeSources.agentId,
      to: r.agents.id,
      optional: false,
    }),
    source: r.one.knowledgeSources({
      from: r.agentsKnowledgeSources.sourceId,
      to: r.knowledgeSources.id,
      optional: false,
    }),
  },
}));
