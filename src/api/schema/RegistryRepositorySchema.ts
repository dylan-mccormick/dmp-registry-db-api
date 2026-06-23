import { z } from "zod";
import { registryTypesArray } from "../../model/Registry";

export const RegistryRepositoryIdQuerySchema = z.object({
    id: z.coerce.number().int().positive()
});

export const RegistryRepositoryQuerySchema = z.object({
    name: z.string().optional()
});

export const RegistryRepositoryCreateSchema = z.object({
    name: z.string().min(1).max(255),
    type: z.enum(registryTypesArray),
    storage_location: z.string().min(1).max(255),
    created_by_user_id: z.coerce.number().int().positive()
});

export const RegistryRepositoryUpdateSchema = z.object({
    name: z.string().min(1).max(255).optional()
});