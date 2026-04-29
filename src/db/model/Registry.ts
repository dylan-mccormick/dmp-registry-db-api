export type RegistryType = 'files' | 'mongodb'

export interface Registry {
    id: number,
    name: string,
    type: RegistryType,
    storage_location: string,
    created_at: Date
}

export interface UpdateRegistryProps {
    name?: string
}

export interface CreateRegistryProps {
    name: string,
    type: RegistryType,
    storage_location: string
}