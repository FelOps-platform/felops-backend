import { pgEnum } from 'drizzle-orm/pg-core';

export const messageSenderTypeEnum = pgEnum('message_sender_type', ['user', 'agent']);

export const executionStatusEnum = pgEnum('execution_status', ['running', 'succeeded', 'failed']);

export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);

export const knowledgeSourceTypeEnum = pgEnum('knowledge_source_type', ['file', 'url']);

export const knowledgeStatusEnum = pgEnum('knowledge_status', ['processing', 'ready', 'failed']);

export const integrationConnectionStatusEnum = pgEnum('integration_connection_status', [
  'connected',
  'invalid',
]);

export const channelTypeEnum = pgEnum('channel_type', ['whatsapp', 'widget', 'hosted']);

export const authCodePurposeEnum = pgEnum('auth_code_purpose', [
  'email_verification',
  'password_reset',
]);
