import { z } from "zod";

export const UserQuerySchema = z.object({
    id: z.coerce.number().int().positive().optional(),
    username: z.string().optional(),
});

export const UserCreateSchema = z.object({
    username: z.string().min(1).max(255),
    email: z.email().max(255),
    password_hash: z.string().min(1).max(255)
});

export const UserUpdateSchema = z.object({
    username: z.string().min(1).max(255).optional(),
    email: z.email().max(255).optional(),
    email_verified: z.boolean().optional(),
    password_hash: z.string().min(1).max(255).optional(),
    token_version: z.number().int().positive().optional()
});