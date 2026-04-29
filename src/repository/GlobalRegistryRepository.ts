import { CreateRegistryProps, Registry, UpdateRegistryProps } from "../model/Registry";
import { CreateRegistryAgentProps, RegistryAgent, UpdateRegistryAgentProps } from "../model/RegistryAgent";
import { CreateRegistryPermissionProps, RegistryPermission } from "../model/RegistryPermission";

/**
 * Basic CRUD interface that can be used for all registries. This manages each registry in the context
 * of the DMP Registry, but individual registry functions (i.e. adding/deleting entries) are left up to
 * the individual implementations depending on the type of registry.
 */
export interface GlobalRegistryRepository {
    /**
     * Creates a registry with the given properties, and returns a promise of it
     * @param registry define the registry to create
     */
    createRegistry(registry: CreateRegistryProps): Promise<Registry>;

    /**
     * Gets a list of all registries in the DMP Registry
     */
    getRegistries(): Promise<Registry[]>;

    /**
     * Gets a registry given the specified registry id
     * @param id the id of the registry
     */
    getRegistryById(id: number): Promise<Registry | null>

    /**
     * Updates a registry with the given properties
     * @param id the id of the registry to update
     * @param props the properties to set the registry to
     */
    updateRegistry(id: number, props: UpdateRegistryProps): Promise<void>;

    /**
     * Deletes a registry with the given id. If no registry exists, no effect will occur
     * @param id the id of the registry to delete
     */
    deleteRegistry(id: number): Promise<void>

    /**
     * Creates a new registry agent with the given properties, and returns a promise of it
     * @param agent properties of the new registry agent
     */
    createRegistryAgent(agent: CreateRegistryAgentProps): Promise<RegistryAgent>;

    /**
     * Gets a list of all registry agents in the DMP Registry
     */
    getAllRegistryAgents(): Promise<RegistryAgent[]>;

    /**
     * Gets a registry agent given the specified registry agent id
     * @param id the id of the registry agent to get
     */
    getRegistryAgentById(id: number): Promise<RegistryAgent | null>;

    /**
     * Gets a list of all registry agents that belong to a specific registry
     * @param registryId the id of the registry to get all agents of
     */
    getRegistryAgentsByRegistryId(registryId: number): Promise<RegistryAgent[]>;

    /**
     * Updates a registry agent with the given properties
     * @param id the id of the registry agent to update
     * @param props properties to update the registry agent according to
     */
    updateRegistryAgent(id: number, props: UpdateRegistryAgentProps): Promise<void>;

    /**
     * Deletes a registry agent with the given id. If no registry agent exists, no effect will occur
     * @param id the id of the registry agent to delete
     */
    deleteRegistryAgent(id: number): Promise<void>;

    /**
     * Creates a new registry permission with the given properties, and returns a promise of it
     * @param permission the permission to create
     */
    createRegistryPermission(permission: CreateRegistryPermissionProps): Promise<RegistryPermission>;

    /**
     * Gets a list of all registry permissions in the DMP Registry
     */
    getRegistryPermissions(): Promise<RegistryPermission[]>;

    /**
     * Gets a list of all registry permissions that apply to a specific user
     * @param userId the id of the user to get registry permissions of
     */
    getRegistryPermissionsOnUser(userId: number): Promise<RegistryPermission[]>;

    /**
     * Assigns a registry permission to a user. If the user already has this permission, no effect will occur
     * @param userId the id of the user to assign a permission to
     * @param permission the registry permission to assign to the user
     */
    assignRegistryPermissionToUser(userId: number, permission: RegistryPermission): Promise<void>;

    /**
     * Revokes a registry permission from a user. If the user does not have this permission, no effect will occur
     * @param userId the id the of user to revoke a permission from
     * @param permission the registry permission to revoke
     */
    revokeRegistryPermissionFromUser(userId: number, permission: RegistryPermission): Promise<void>;

    /**
     * Gets a list of all registry permissions that apply to a specific agent
     * @param agentId the id of the agent to get registry permissions of
     */
    getRegistryPermissionsOnAgent(agentId: number): Promise<RegistryPermission[]>;

    /**
     * Assigns a registry permission to an agent. If the agent already has this permission, no effect will occur
     * @param agentId the id of the agent to assign a permission to
     * @param permission the registry permission to assign to the agent
     */
    assignRegistryPermissionToAgent(agentId: number, permission: RegistryPermission): Promise<void>;

    /**
     * Revokes a registry permission from an agent. If the agent does not have this permission, no effect will occur
     * @param agentId the id of the agent to revoke a permission from
     * @param permission the registry permission to revoke
     */
    revokeRegistryPermissionFromAgent(agentId: number, permission: RegistryPermission): Promise<void>;

    /**
     * Deletes a registry permission with the given id. If no registry permission exists, no effect will occur
     * @param permissionId the id of the registry permission to delete
     */
    deleteRegistryPermission(permissionId: number): Promise<void>;

}