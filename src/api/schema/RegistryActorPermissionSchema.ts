import { z } from "zod";

// User Registry Permissions

export const UserIdGlobalPermissionQuerySchema = z.object({
    userId: z.coerce.number().int().positive()
});

export const UserIdRegistryPermissionQuerySchema = z.object({
    userId: z.coerce.number().int().positive(),
    registryId: z.coerce.number().int().positive()
});

export const UserIdRegistryPermissionIdQuerySchema = z.object({
    userId: z.coerce.number().int().positive(),
    registryId: z.coerce.number().int().positive(),
    permissionId: z.coerce.number().int().positive()
});

// Agent Registry Permissions

export const RegistryAgentIdQuerySchema = z.object({
    registryId: z.coerce.number().int().positive(),
    agentId: z.coerce.number().int().positive()
});

export const RegistryAgentPermissionIdQuerySchema = z.object({
    registryId: z.coerce.number().int().positive(),
    agentId: z.coerce.number().int().positive(),
    permissionId: z.coerce.number().int().positive()
});