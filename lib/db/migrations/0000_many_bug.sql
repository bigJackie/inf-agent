CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"content" text NOT NULL,
	"index" integer NOT NULL,
	"char_count" integer NOT NULL,
	"embedding" vector(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"citations" jsonb,
	"streaming" integer DEFAULT 0 NOT NULL,
	"truncated" integer DEFAULT 0 NOT NULL,
	"truncation_reason" text,
	"model" text,
	"tokens_input" integer,
	"tokens_output" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT '新对话' NOT NULL,
	"prompt" text,
	"model" text DEFAULT 'deepseek-ai/DeepSeek-V3' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunk_doc_idx" ON "chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "chunk_doc_order_idx" ON "chunks" USING btree ("document_id","index");--> statement-breakpoint
CREATE INDEX "chunk_embedding_hnsw_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "doc_session_idx" ON "documents" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "doc_session_updated_idx" ON "documents" USING btree ("session_id","updated_at");--> statement-breakpoint
CREATE INDEX "msg_session_idx" ON "messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "msg_session_time_idx" ON "messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "msg_streaming_idx" ON "messages" USING btree ("streaming");