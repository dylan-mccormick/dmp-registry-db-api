import mysql, { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { CreateRegistryProps, Registry, RegistryType, registryTypesArray, UpdateRegistryProps } from "../model/Registry";
import { GlobalRegistryRepository } from "./GlobalRegistryRepository";
import { verifyValidString } from "../Utils";
import { IllegalArgumentError } from "../error/IllegalArgumentError";
import { IllegalStateError } from "../error/IllegalStateError";
import { RepositoryFailureError } from "../error/RepositoryFailureError";
import { CreateRegistryAgentProps, UpdateRegistryAgentProps } from "../model/RegistryAgent";
import { RegistryAgent } from "../model/RegistryAgent";
import { CreateRegistryPermissionProps, RegistryPermissionAPIResult } from "../model/RegistryPermission";
import { RegistryPermission } from "../model/RegistryPermission";
import { RegistryActorPermission } from "../model/RegistryActorPermission";
import { User } from "../model/User";
import { UserRepository } from "./UserRepository";

/**
 * Implementation of the GlobalRegistryRepository.
 */
export class GlobalRegistryRepositoryImpl implements GlobalRegistryRepository {

    private pool: mysql.Pool;
    private registryTypeCache: Map<RegistryType, number> = new Map();

    private userRepository: UserRepository;

    constructor(pool: mysql.Pool, userRepository: UserRepository) {
        this.pool = pool;
        this.userRepository = userRepository;
        this.initializeRegistryTypes().catch(err => {
            console.error("failed to initialize registry type cache", err);
            throw err;
        });
    }

    private async initializeRegistryTypes(): Promise<void> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT tid, type FROM registry_type`);
        for (const row of rows) {
            this.registryTypeCache.set(row.type, row.tid);
        }

        // insert into if not exists
        for (const type of registryTypesArray) {
            if (!this.registryTypeCache.has(type)) {
                const [ { insertId } ] = await this.pool.execute<ResultSetHeader>(`INSERT INTO registry_type(type) VALUES (?)`, [ type.toString() ]);
                this.registryTypeCache.set(type, insertId);
            }
        }
    }

    private coerceDBRegistryPermission(dbResponse: any): RegistryPermission {
        console.log(dbResponse);
        if (!RegistryPermissionAPIResult.safeParse(dbResponse).success) {
            throw new IllegalArgumentError("Invalid object passed to coerce into Registry Permission.");
        }

        return {
            id: dbResponse.rpid,
            name: dbResponse.name
        }
    }

    public getRegistryTypeById(tid: number): RegistryType {
        for (const [ type, id ] of this.registryTypeCache.entries()) {
            if (id === tid) return type as RegistryType;
        }

        throw new RepositoryFailureError(`registry type with id ${tid} not found in cache`);
    }

    /* REGISTRY CRUD OPERATIONS */

    public async getRegistries(): Promise<Registry[]> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registries`);
        return rows as Registry[];
    }

    public async getRegistryById(id: number): Promise<Registry | null> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registries WHERE rid = ?`, [ id ]);
        return (rows[0] ?? null) as Registry;
    }

    public async getRegistryByName(name: string): Promise<Registry | null> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registries WHERE name = ?`, [ name ]);
        return (rows[0] ?? null) as Registry;
    }

    public async getRegistryAtStorageLocation(storageLocation: string): Promise<Registry | null> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registries WHERE storage_location = ?`, [ storageLocation ]);
        return (rows[0] ?? null) as Registry;
    }

    public async getRegistriesByUserIdPermissionId(userId: number, permissionId: number): Promise<Registry[]> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`
                SELECT r.*
                FROM registries r
                INNER JOIN registry_user_permissions rup ON r.rid = rup.registry_id
                WHERE rup.user_id = ? AND rup.permission_id = ?;`, [ userId, permissionId ]
            );
        return rows as Registry[];
    }

    public async createRegistry({ name, type, storage_location, created_by_user_id }: CreateRegistryProps): Promise<Registry> {
        // verify preconditions
        if (!verifyValidString(name)) throw new IllegalArgumentError(`registry name must be non-blank, lte length 255`);
        if (await this.getRegistryByName(name) != null) throw new IllegalStateError(`registry with the given name ${name} already exists`);
        if (await this.userRepository.getUserById(created_by_user_id) == null) throw new IllegalArgumentError(`cannot create a registry with a creator user id that does not exist`);

        // create the registry
        const [ rows ] = await this.pool.execute<ResultSetHeader>(
            `INSERT INTO registries(name, tid, storage_location, created_by_user_id)
            VALUES (?, ?, ?, ?)`, [ name, await this.registryTypeCache.get(type)!, storage_location, created_by_user_id ]);
        const registry = await this.getRegistryById(rows.insertId);

        if (registry == null) throw new RepositoryFailureError("registry was created without error but cannot be found");
        return registry;
    }

    public async updateRegistry(id: number, { name }: UpdateRegistryProps): Promise<void> {
        const registry = await this.getRegistryById(id);
        if (registry == null) throw new IllegalArgumentError("cannot update a registry that does not exist")

        // verify preconditions
        if (name !== undefined && !verifyValidString(name)) throw new IllegalArgumentError(`registry name must be non-blank, lte length 255`);
        if (name !== undefined && name != registry.name && await this.getRegistryByName(name) != null) throw new IllegalStateError(`registry with the given name ${name} already exists`);

        // update the registry
        const [ rows ] = await this.pool.execute<ResultSetHeader>(
            `UPDATE registries
            SET name = ?
            WHERE rid = ?`, [name ?? registry.name, id]
        );

        if (rows.affectedRows != 1) throw new RepositoryFailureError("the update-query registry was not updated");
        return;
    }

    public async deleteRegistry(id: number): Promise<void> {
        // just delete the registry, no effect if the registry does not exist
        await this.pool.execute(`DELETE FROM registries WHERE rid = ?`, [ id ]);
        return;
    }

    /* REGISTRY AGENT CRUD */

    public async getRegistryAgents(registryId: number): Promise<RegistryAgent[]> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registry_agents WHERE registry_id = ?`, [ registryId ]);
        return rows as RegistryAgent[];
    }

    public async getRegistryAgentById(id: number): Promise<RegistryAgent | null> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registry_agents WHERE raid = ?`, [ id ]);
        return (rows[0] ?? null) as RegistryAgent;
    }

    public async getRegistryAgentByName(name: string): Promise<RegistryAgent | null> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registry_agents WHERE name = ?`, [ name ]);
        return (rows[0] ?? null) as RegistryAgent;
    }

    public async createRegistryAgent({ registry_id, name, key_hash, created_by_user_id }: CreateRegistryAgentProps): Promise<RegistryAgent> {
        // verify preconditions
        if (!verifyValidString(name)) throw new IllegalArgumentError(`registry agent name must be non-blank, lte length 255`);
        if (!verifyValidString(key_hash)) throw new IllegalArgumentError(`registry agent key hash must be non-blank, lte length 255`);
        if (await this.getRegistryAgentByName(name) != null) throw new IllegalStateError(`registry agent with the name ${name} already exists`);
        if (await this.userRepository.getUserById(created_by_user_id) == null) throw new IllegalArgumentError(`cannot create a registry agent with a creator user id that does not exist`);

        // create the registry agent
        const [ rows ] = await this.pool.execute<ResultSetHeader>(
            `INSERT INTO registry_agents(registry_id, name, key_hash, created_by_user_id)
            VALUES (?, ?, ?, ?)`, [ registry_id, name, key_hash, created_by_user_id ]);
        const registryAgent = await this.getRegistryAgentById(rows.insertId);

        if (registryAgent == null) throw new RepositoryFailureError(`registry agent was created without error but was not found`);
        return registryAgent;
    }

    public async updateRegistryAgent(id: number, { name, key_hash }: UpdateRegistryAgentProps): Promise<void> {
        const agent = await this.getRegistryAgentById(id);
        if (agent == null) throw new IllegalArgumentError(`cannot update a registry agent that does not exist`);
        // verify preconditions
        if (name !== undefined && !verifyValidString(name)) throw new IllegalArgumentError(`registry agent name must be non-blank, lte length 255`);
        if (key_hash !== undefined && !verifyValidString(key_hash)) throw new IllegalArgumentError(`registry agent key hash must be non-blank, lte length 255`);
        if (name !== undefined && name != agent.name && await this.getRegistryAgentByName(name) != null) throw new IllegalStateError(`registry agent with the name ${name} already exists`);

        // update the registry agent
        const [ rows ] = await this.pool.execute<ResultSetHeader>(
            `UPDATE registry_agents
            SET name = ?, key_hash = ?
            WHERE raid = ?`,
        [ name ?? agent.name, key_hash ?? agent.key_hash, id ]);

        if (rows.affectedRows != 1) throw new RepositoryFailureError(`the update-query registry agent was not updated`);
        return;
    }

    public async deleteRegistryAgent(id: number) {
        // idempotent delete
        await this.pool.execute(`DELETE FROM registry_agents WHERE raid = ?`, [ id ]);
        return;
    }

    /* REGISTRY PERMISSIONS CRUD */
    public async getRegistryPermissions(): Promise<RegistryPermission[]> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registry_permissions_available`);
        return rows as RegistryPermission[];
    }

    public async getRegistryPermissionById(id: number): Promise<RegistryPermission | null> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registry_permissions_available WHERE rpid = ?`, [ id ]);
        return rows[0] ? this.coerceDBRegistryPermission(rows[0]) : null;
    }

    public async getRegistryPermissionByName(name: string): Promise<RegistryPermission | null> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registry_permissions_available WHERE name = ?`, [ name ]);
        return rows[0] ? this.coerceDBRegistryPermission(rows[0]) : null;
    }

    public async createRegistryPermission({ name }: CreateRegistryPermissionProps) {
        // verify preconditions
        if (!verifyValidString(name)) throw new IllegalArgumentError(`registry permission name must be non-blank, lte length 255`);
        if (await this.getRegistryPermissionByName(name) != null) throw new IllegalStateError(`registry permission with the name ${name} already exists`);

        // create the registry permission
        const [ rows ] = await this.pool.execute<ResultSetHeader>(
            `INSERT INTO registry_permissions_available(name)
            VALUES (?)`, [ name ]);
        const registryPermission = await this.getRegistryPermissionById(rows.insertId);

        if (registryPermission == null) throw new RepositoryFailureError(`registry permission was created without error but was not found`);
        return registryPermission;
    }

    public async deleteRegistryPermission(id: number): Promise<void> {
        // idempotent delete
        await this.pool.execute(`DELETE FROM registry_permissions_available WHERE rpid = ?`, [ id ]);
        return;
    }

    /* REGISTRY PERMISSIONS FOR USERS */
    public async getRegistryPermissionsOnUser(userId: number): Promise<RegistryActorPermission[]> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registry_user_permissions WHERE user_id = ?`, [ userId ]);
        return rows.map(row => ({
            actor_id: row.user_id as number,
            registry_id: row.registry_id as number,
            permission_id: row.permission_id as number
        }));
    }

    public async getRegistryPermissionsOnUserRegistry(userId: number, registryId: number): Promise<RegistryActorPermission[]> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registry_user_permissions WHERE user_id = ? AND registry_id = ?`, [ userId, registryId ]);
        return rows.map(row => ({
            actor_id: row.user_id as number,
            registry_id: row.registry_id as number,
            permission_id: row.permission_id as number
        }));
    }

    public async assignRegistryPermissionToUser(userId: number, registryId: number, permission: RegistryPermission): Promise<void> {
        // verify the permission exists
        const permissionRecord = await this.getRegistryPermissionById(permission.id);
        if (permissionRecord == null) throw new IllegalArgumentError(`cannot assign a registry permission that does not exist`);

        // idempotent assignment
        await this.pool.execute(
            `INSERT IGNORE INTO registry_user_permissions(user_id, registry_id, permission_id)
            VALUES (?, ?, ?)`, [ userId, registryId, permission.id ]);
        return;
    }

    public async revokeRegistryPermissionFromUser(userId: number, registryId: number, permission: RegistryPermission): Promise<void> {
        // idempotent revoke
        await this.pool.execute(
            `DELETE FROM registry_user_permissions
            WHERE user_id = ? AND registry_id = ? AND permission_id = ?`, [ userId, registryId, permission.id ]);
        return;
    }

    /* REGISTRY PERMISSIONS FOR AGENTS */
    public async getRegistryPermissionsOnAgent(agentId: number): Promise<RegistryActorPermission[]> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registry_agent_permissions WHERE agent_id = ?`, [ agentId ]);
        return rows.map(row => ({
            actor_id: row.agent_id as number,
            registry_id: row.registry_id as number,
            permission_id: row.permission_id as number
        }));
    }

    public async getRegistryPermissionsOnAgentRegistry(agentId: number, registryId: number): Promise<RegistryActorPermission[]> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registry_agent_permissions WHERE agent_id = ? AND registry_id = ?`, [ agentId, registryId ]);
        return rows.map(row => ({
            actor_id: row.agent_id as number,
            registry_id: row.registry_id as number,
            permission_id: row.permission_id as number
        }));
    }

    public async assignRegistryPermissionToAgent(agentId: number, registryId: number, permission: RegistryPermission): Promise<void> {
        // verify the permission exists
        const permissionRecord = await this.getRegistryPermissionById(permission.id);
        if (permissionRecord == null) throw new IllegalArgumentError(`cannot assign a registry permission that does not exist`);

        // idempotent assignment
        await this.pool.execute(
            `INSERT IGNORE INTO registry_agent_permissions(agent_id, registry_id, permission_id)
            VALUES (?, ?, ?)`, [ agentId, registryId, permission.id ]);
        return;
    }

    public async revokeRegistryPermissionFromAgent(agentId: number, registryId: number, permission: RegistryPermission): Promise<void> {
        // idempotent revoke
        await this.pool.execute(
            `DELETE FROM registry_agent_permissions
            WHERE agent_id = ? AND registry_id = ? AND permission_id = ?`, [ agentId, registryId, permission.id ]);
        return;
    }

    public async getAgentsWithPermissionOnRegistry(registryId: number, permissionId: number): Promise<RegistryAgent[]> {
        // run agent query
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(
            `SELECT ra.raid AS id, ra.registry_id, ra.name, ra.key_hash, ra.created_at, ra.created_by_user_id
                FROM registry_agents AS ra
                INNER JOIN registry_agent_permissions AS rap ON rap.agent_id = ra.raid
                WHERE rap.registry_id = ? AND rap.permission_id = ?;`, [ registryId, permissionId ]
        )

        return rows as RegistryAgent[];
    }

    public async getUsersWithPermissionOnRegistry(registryId: number, permissionId: number): Promise<User[]> {
        // run user query
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(
            `SELECT u.*
                FROM users AS u
                INNER JOIN registry_user_permissions AS rup ON rup.user_id = u.id
                WHERE rup.registry_id = ? AND rup.permission_id = ?;`, [ registryId, permissionId ])
        return rows as User[];
    }

}