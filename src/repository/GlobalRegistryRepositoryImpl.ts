import mysql, { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { CreateRegistryProps, Registry, UpdateRegistryProps } from "../model/Registry";
import { GlobalRegistryRepository } from "./GlobalRegistryRepository";
import { verifyValidString } from "../Utils";
import { IllegalArgumentError } from "../error/IllegalArgumentError";
import { IllegalStateError } from "../error/IllegalStateError";
import { RepositoryFailureError } from "../error/RepositoryFailureError";

/**
 * Implementation of the GlobalRegistryRepository.
 */
export class GlobalRegistryRepositoryImpl implements GlobalRegistryRepository {

    private pool: mysql.Pool;

    constructor(pool: mysql.Pool) {
        this.pool = pool;
    }

    /* REGISTRY CRUD OPERATIONS */

    public async getRegistries(): Promise<Registry[]> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registries`);
        return rows as Registry[];
    }

    public async getRegistryById(id: number): Promise<Registry | null> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registries WHERE id = ?`, [ id ]);
        return (rows[0] ?? null) as Registry;
    }

    public async getRegistryByName(name: string): Promise<Registry | null> {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM registries WHERE name = ?`, [ name ]);
        return (rows[0] ?? null) as Registry;
    }

    public async createRegistry({ name, type, storage_location }: CreateRegistryProps): Promise<Registry> {
        // verify preconditions
        if (!verifyValidString(name)) throw new IllegalArgumentError(`registry name must be non-blank, lte length 255`);
        if (await this.getRegistryByName(name) != null) throw new IllegalStateError(`registry with the given name ${name} already exists`);

        // create the registry
        const [ rows ] = await this.pool.execute<ResultSetHeader>(
            `INSERT INTO registries(name, type, storage_location)
            VALUES (?, ?, ?)`, [ name, type, storage_location ]);
        const registry = await this.getRegistryById(rows.insertId);

        if (registry == null) throw new RepositoryFailureError("registry was created without error but cannot be found");
        return registry;
    }

    public async updateRegistry(id: number, { name }: UpdateRegistryProps): Promise<void> {
        const registry = await this.getRegistryById(id);
        if (registry == null) throw new IllegalArgumentError("cannot update a registry that does not exist")

        // verify preconditions
        if (name && !verifyValidString(name)) throw new IllegalArgumentError(`registry name must be non-blank, lte length 255`);
        if (name && name != registry.name && await this.getRegistryByName(name) != null) throw new IllegalStateError(`registry with the given name ${name} already exists`);

        // update the registry
        const [ rows ] = await this.pool.execute<ResultSetHeader>(
            `UPDATE registries
            SET name = ?
            WHERE id = ?`, [name ?? registry.name, id]
        );

        if (rows.affectedRows != 1) throw new RepositoryFailureError("the update-query registry was not updated");
        return;
    }

    public async deleteRegistry(id: number): Promise<void> {
        // just delete the registry, no effect if the registry does not exist
        await this.pool.execute(`DELETE FROM registries WHERE id = ?`, [ id ]);
        return;
    }

}