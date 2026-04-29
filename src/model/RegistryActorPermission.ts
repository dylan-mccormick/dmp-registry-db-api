export interface RegistryActorPermission {
    actor_id: number,
    registry_id: number,
    permission_id: number
}

export interface CreateRegistryActorPermissionProps extends RegistryActorPermission {}