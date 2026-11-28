CREATE TYPE "approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "auth_code_purpose" AS ENUM('email_verification', 'password_reset');--> statement-breakpoint
CREATE TYPE "channel_type" AS ENUM('whatsapp', 'widget', 'hosted');--> statement-breakpoint
CREATE TYPE "execution_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "integration_connection_status" AS ENUM('connected', 'invalid');--> statement-breakpoint
CREATE TYPE "knowledge_source_type" AS ENUM('file', 'url');--> statement-breakpoint
CREATE TYPE "knowledge_status" AS ENUM('processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "message_sender_type" AS ENUM('user', 'agent');--> statement-breakpoint
CREATE TABLE "auth_codes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auth_codes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"purpose" "auth_code_purpose" NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(36) PRIMARY KEY,
	"user_id" integer NOT NULL,
	"refresh_token_hash" varchar(64) NOT NULL UNIQUE,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"user_agent" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workspaces_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(50) NOT NULL,
	"owner_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "agents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workspace_id" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"instructions" varchar(8000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents_actions" (
	"agent_id" integer,
	"tool_key" varchar(100),
	"requires_approval" boolean DEFAULT false NOT NULL,
	CONSTRAINT "agents_actions_pkey" PRIMARY KEY("agent_id","tool_key")
);
--> statement-breakpoint
CREATE TABLE "workspaces_channels" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workspaces_channels_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workspace_id" integer NOT NULL,
	"channel_type" "channel_type" NOT NULL,
	"name" varchar(100) NOT NULL,
	"agent_id" integer,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"state_hash" varchar(64) PRIMARY KEY,
	"workspace_id" integer NOT NULL,
	"integration_key" varchar(50) NOT NULL,
	"initiated_by" integer NOT NULL,
	"redirect_uri" varchar(2048) NOT NULL,
	"return_path" varchar(512),
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_action_settings" (
	"workspace_id" integer,
	"tool_key" varchar(100),
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_action_settings_pkey" PRIMARY KEY("workspace_id","tool_key")
);
--> statement-breakpoint
CREATE TABLE "workspaces_integrations" (
	"workspace_id" integer,
	"integration_key" varchar(50),
	"external_account_id" varchar(255) NOT NULL,
	"external_account_name" varchar(255),
	"granted_scopes" varchar(1000),
	"encrypted_credentials" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"connected_by" integer NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_validated_at" timestamp with time zone,
	"status" "integration_connection_status" DEFAULT 'connected'::"integration_connection_status" NOT NULL,
	CONSTRAINT "workspaces_integrations_pkey" PRIMARY KEY("workspace_id","integration_key")
);
--> statement-breakpoint
CREATE TABLE "agents_knowledge_sources" (
	"agent_id" integer,
	"source_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_knowledge_sources_pkey" PRIMARY KEY("agent_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "knowledge_sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "knowledge_sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workspace_id" integer NOT NULL,
	"source_type" "knowledge_source_type" NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"url" varchar(2048),
	"file_type" varchar(20),
	"storage_key" varchar(255),
	"storage_content_type" varchar(100),
	"status" "knowledge_status" DEFAULT 'processing'::"knowledge_status" NOT NULL,
	"error_message" varchar(1000),
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" varchar(36) PRIMARY KEY,
	"workspace_id" integer NOT NULL,
	"agent_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"job_id" varchar(64) NOT NULL,
	"tool_key" varchar(100) NOT NULL,
	"integration_key" varchar(50) NOT NULL,
	"params" jsonb DEFAULT '{}' NOT NULL,
	"effect_summary" varchar(1000) NOT NULL,
	"status" "approval_status" DEFAULT 'pending'::"approval_status" NOT NULL,
	"decided_by" integer,
	"note" varchar(1000),
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workspace_id" integer NOT NULL,
	"agent_id" integer NOT NULL,
	"channel_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "executions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workspace_id" integer NOT NULL,
	"agent_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"integration_key" varchar(50) NOT NULL,
	"tool_key" varchar(100) NOT NULL,
	"tool_arguments" jsonb DEFAULT '{}' NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"status" "execution_status" DEFAULT 'running'::"execution_status" NOT NULL,
	"result" jsonb,
	"error_code" varchar(64),
	"error_message" varchar(1000),
	"retryable" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"sender_type" "message_sender_type" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE varchar(50) USING "name"::varchar(50);--> statement-breakpoint
CREATE INDEX "idx_auth_codes_user_purpose" ON "auth_codes" ("user_id","purpose","created_at");--> statement-breakpoint
CREATE INDEX "idx_auth_codes_expiry" ON "auth_codes" ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expiry" ON "sessions" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_agents_workspace_name" ON "agents" ("workspace_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_channels_workspace_name" ON "workspaces_channels" ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "idx_oauth_state_workspace" ON "oauth_states" ("workspace_id","integration_key");--> statement-breakpoint
CREATE INDEX "idx_oauth_state_expiry" ON "oauth_states" ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_wi_integration" ON "workspaces_integrations" ("integration_key");--> statement-breakpoint
CREATE INDEX "idx_agents_knowledge_source" ON "agents_knowledge_sources" ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_knowledge_workspace_hash" ON "knowledge_sources" ("workspace_id","content_hash");--> statement-breakpoint
CREATE INDEX "idx_knowledge_workspace_status" ON "knowledge_sources" ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "idx_approvals_workspace_status" ON "approvals" ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "idx_approvals_agent_status" ON "approvals" ("agent_id","status");--> statement-breakpoint
CREATE INDEX "idx_conversations_workspace_created" ON "conversations" ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_executions_workspace_created" ON "executions" ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_executions_agent_created" ON "executions" ("agent_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_executions_workspace_idempotency" ON "executions" ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation_created" ON "messages" ("conversation_id","created_at");--> statement-breakpoint
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agents_actions" ADD CONSTRAINT "agents_actions_agent_id_agents_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspaces_channels" ADD CONSTRAINT "workspaces_channels_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspaces_channels" ADD CONSTRAINT "workspaces_channels_agent_id_agents_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_initiated_by_users_id_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "workspace_action_settings" ADD CONSTRAINT "workspace_action_settings_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_action_settings" ADD CONSTRAINT "workspace_action_settings_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "workspaces_integrations" ADD CONSTRAINT "workspaces_integrations_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspaces_integrations" ADD CONSTRAINT "workspaces_integrations_connected_by_users_id_fkey" FOREIGN KEY ("connected_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "agents_knowledge_sources" ADD CONSTRAINT "agents_knowledge_sources_agent_id_agents_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agents_knowledge_sources" ADD CONSTRAINT "agents_knowledge_sources_source_id_knowledge_sources_id_fkey" FOREIGN KEY ("source_id") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_agent_id_agents_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_conversation_id_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_decided_by_users_id_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_agents_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_channel_id_workspaces_channels_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "workspaces_channels"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_agent_id_agents_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_conversation_id_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;