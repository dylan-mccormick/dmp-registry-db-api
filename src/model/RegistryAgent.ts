export interface RegistryAgent {
    id: number,
    registry_id: number,
    name: string,
    key_hash: string,
    created_at: Date,
    created_by_user_id?: number
}

export interface CreateRegistryAgentProps {
    registry_id: number,
    name: string,
    key_hash: string,
    created_by_user_id: number
}

export interface UpdateRegistryAgentProps {
    name?: string,
    key_hash?: string
}