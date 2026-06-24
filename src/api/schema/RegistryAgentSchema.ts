import { z } from "zod";

export const AgentIdQuerySchema = z.object({
    agentId: z.coerce.number().int().positive()
})

export const AgentHashQuerySchema = z.object({
    hash: z.string().min(1).max(255)
})

export const RegistryAgentIdQuerySchema = z.object({
    registryId: z.coerce.number().int().positive(),
    agentId: z.coerce.number().int().positive()
});

export const RegistryAgentCreateSchema = z.object({
    name: z.string().min(1).max(255).regex(/^\w+$/),
    key_hash: z.string().min(1).max(255).regex(/^\w+$/),
    created_by_user_id: z.coerce.number().int().positive()
});

export const RegistryAgentUpdateSchema = z.object({
    name: z.string().min(1).max(255).regex(/^\w+$/).optional(),
    key_hash: z.string().min(1).max(255).regex(/^\w+$/).optional()
});