import { z } from "zod";

export const RegistryAgentIdQuerySchema = z.object({
    registryId: z.coerce.number().int().positive(),
    agentId: z.coerce.number().int().positive()
});

export const RegistryAgentCreateSchema = z.object({
    name: z.string().min(1).max(255),
    key_hash: z.string().min(1).max(255),
    created_by_user_id: z.coerce.number().int().positive()
});

export const RegistryAgentUpdateSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    key_hash: z.string().min(1).max(255).optional()
});