import { z } from "zod";

export const UserPermissionIdQuerySchema = z.object({
    id: z.coerce.number().int().positive()
});

export const UserPermissionQuerySchema = z.object({
    name: z.string().optional()
});

export const UserPermissionCreateSchema = z.object({
    name: z.string().min(1).max(255)
});