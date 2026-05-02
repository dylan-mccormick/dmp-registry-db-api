import { z } from "zod";

export const RegistryPermissionIdQuerySchema = z.object({
    permissionId: z.coerce.number().int().positive()
});

export const RegistryPermissionCreateSchema = z.object({
    name: z.string().min(1).max(255)
});