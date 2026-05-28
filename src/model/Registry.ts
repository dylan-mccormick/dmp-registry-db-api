import z from "zod";

export const registryTypesArray = [ 'files', 'mongodb' ] as const;

export type RegistryType = typeof registryTypesArray[number];

export interface Registry {
    id: number,
    name: string,
    type: RegistryType,
    storage_location: string,
    created_at: Date
}

export const RegistryAPIResult = z.object({
    rid: z.number(),
    name: z.string(),
    tid: z.number(),
    storage_location: z.string(),
    created_at: z.date()
});

export interface UpdateRegistryProps {
    name?: string
}

export interface CreateRegistryProps {
    name: string,
    type: RegistryType,
    storage_location: string,
    created_by_user_id: number
}