import { z } from "zod";

export const localeSchema = z.enum(["en", "nl"]);

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const chatBodySchema = z.object({
  messages: z.array(chatMessageSchema).max(50),
  locale: localeSchema,
});

export const ticketCreateSchema = z.object({
  categoryId: z.string().uuid(),
  subject: z.string().min(1).max(500),
  description: z.string().max(20000).optional().default(""),
  escalationChatTranscript: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
        createdAt: z.string().optional(),
      })
    )
    .optional(),
});

export const ticketMessageSchema = z.object({
  body: z.string().min(1).max(20000),
  isInternal: z.boolean().optional().default(false),
});

export const adminTicketPatchSchema = z.object({
  status: z
    .enum(["open", "in_progress", "waiting_customer", "resolved", "closed"])
    .optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  closedReason: z.string().max(2000).nullable().optional(),
  internalNotes: z.string().max(20000).nullable().optional(),
});

export const categoryWriteSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  sortOrder: z.number().int().optional(),
  toolKey: z.string().max(80).nullable().optional(),
});

export const articleWriteSchema = z.object({
  translationGroupId: z.string().uuid().optional(),
  locale: localeSchema,
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(500),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  body: z.string().max(500000).default(""),
  excerpt: z.string().max(2000).nullable().optional(),
  published: z.boolean().optional().default(true),
});
