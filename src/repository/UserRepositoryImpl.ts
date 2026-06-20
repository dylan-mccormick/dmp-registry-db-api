import mysql, { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { UserRepository } from "./UserRepository";
import { CreateUserProps, UpdateUserProps, User } from "../model/User";
import { verifyValidString } from "../Utils";
import { IllegalArgumentError } from "../error/IllegalArgumentError";
import { IllegalStateError } from "../error/IllegalStateError";
import { RepositoryFailureError } from "../error/RepositoryFailureError";
import { CreateUserPermissionProps, UserPermission } from "../model/UserPermission";

/**
 * Implementation of the UserRepository.
 */
export class UserRepositoryImpl implements UserRepository {

    private pool: mysql.Pool;

    /* USER CRUD OPERATIONS */

    /**
     * Constructs a new User Repository.
     * @param pool the MySQL Connection pool to use
     */
    constructor(pool: mysql.Pool) {
        this.pool = pool;
    }

    public getUsers = async (): Promise<User[]> => {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM users;");
        return rows as User[];
    }

    public getUserById = async (id: number): Promise<User | null> => {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM users WHERE id = ?", [ id ]);
        return (rows[0] ?? null) as User;
    }

    public getUserByUsername = async (username: string): Promise<User | null> => {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM users WHERE username = ?", [ username ]);
        return (rows[0] ?? null) as User;
    }

    public searchUsersByUsername = async (usernameQuery: string): Promise<User[]> => {
        const query = `%${usernameQuery}%`;
        const [ rows ] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM users WHERE username LIKE ?", [ query ]);
        return rows as User[];
    }

    public createUser = async ({ username, email, password_hash }: CreateUserProps): Promise<User> => {
        // verify preconditions
        if (!verifyValidString(username)) throw new IllegalArgumentError("username must be non-blank, lte length 255");
        if (!verifyValidString(email)) throw new IllegalArgumentError("email must be non-blank, lte length 255");
        if (!verifyValidString(password_hash)) throw new IllegalArgumentError("password hash must be non-blank, lte length 255");

        // username must be unique
        if (await this.getUserByUsername(username) != null) throw new IllegalStateError(`a user with username ${username} already exists`);

        // now we may create the user
        const [ rows ] = await this.pool.execute<ResultSetHeader>("INSERT INTO users(username, email, password_hash) VALUES (?, ?, ?)", [username, email, password_hash]);
        const user = await this.getUserById(rows.insertId);

        if (user == null) throw new RepositoryFailureError("user was created without error but cannot be found");
        return user;
    }

    public updateUser = async (id: number, props: UpdateUserProps): Promise<void> => {
        const user = await this.getUserById(id);
        if (user == null) throw new IllegalArgumentError("cannot update a user that does not exist");

        // verify preconditions
        if (props.username !== undefined && !verifyValidString(props.username)) throw new IllegalArgumentError("username must be non-blank, lte length 255");
        if (props.email !== undefined && !verifyValidString(props.email)) throw new IllegalArgumentError("email must be non-blank, lte length 255");
        if (props.password_hash !== undefined && !verifyValidString(props.password_hash)) throw new IllegalArgumentError("password hash must be non-blank, lte length 255");

        // username must be unique
        if (props.username !== undefined && props.username != user.username && await this.getUserByUsername(props.username) != null) throw new IllegalStateError(`a user with username ${props.username} already exists`);

        // now we may update the user
        const [ rows ] = await this.pool.execute<ResultSetHeader>(
            `UPDATE users
            SET email = ?, email_verified = ?, password_hash = ?, token_version = ?, username = ?
            WHERE id = ?`, [props.email ?? user.email, props.email_verified ?? user.email_verified, props.password_hash ?? user.password_hash, props.token_version ?? user.token_version, props.username ?? user.username, id]);

        if (rows.affectedRows != 1) throw new RepositoryFailureError("the update-query user was not updated");
        return;
    }

    public deleteUser = async (id: number): Promise<void> => {
        // just delete the user by id from the database
        // if the user is not deleted, there wont be any error

        await this.pool.execute("DELETE FROM users WHERE id = ?", [ id ]);
        return;
    }

    /* PERMISSION CRUD OPERATIONS */

    public getPermissions = async (): Promise<UserPermission[]> => {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM user_permissions_available");
        return rows as UserPermission[];
    }

    public getPermissionByName = async (name: string): Promise<UserPermission | null> => {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM user_permissions_available WHERE name = ?", [ name ]);
        return (rows[0] ?? null) as UserPermission;
    }

    public getPermissionById = async (id: number): Promise<UserPermission | null> => {
        const [ rows ] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM user_permissions_available WHERE id = ?", [ id ]);
        return (rows[0] ?? null) as UserPermission;
    }

    public createPermission = async ({ name }: CreateUserPermissionProps): Promise<UserPermission> => {
        // verify preconditions
        if (!verifyValidString(name)) throw new IllegalArgumentError("name must be non-blank, lte length 255");

        // name must be unique
        if (await this.getPermissionByName(name)) throw new IllegalStateError(`a user permission with name ${name} already exists`)

        // now we may create the user permission
        const [ rows ] = await this.pool.execute<ResultSetHeader>(
            `INSERT INTO user_permissions_available(name)
            VALUES (?)`, [ name ]);
        const permission = await this.getPermissionById(rows.insertId);

        if (permission == null) throw new RepositoryFailureError("user permission was created without error but cannot be found");
        return permission as UserPermission;
    }

    public deletePermission = async (permissionId: number): Promise<void> => {
        // just delete the permission by id from the database
        // if the permission is not deleted, there wont be any error

        await this.pool.execute("DELETE FROM user_permissions_available WHERE id = ?", [ permissionId ]);
        return;
    }

    /* USER-PERMISSIONS */
    public getPermissionsOnUser = async(userId: number): Promise<UserPermission[]> => {
        // assert the user id exists
        if (await this.getUserById(userId) == null) throw new IllegalArgumentError(`user with the provided id ${userId} does not exist`);

        // query all permissions by user
        const [ rows ] = await this.pool.execute<RowDataPacket[]>(`SELECT * FROM user_permissions WHERE user_id = ?`, [ userId ]);
        const result: UserPermission[] = await Promise.all(rows.map(async row => {
            const userPermission = await this.getPermissionById(row.permission_id);
            if (userPermission == null) throw new RepositoryFailureError("user holds a permission that is not available to anyone");
            return userPermission;
        }));

        return result;
    }

    public assignPermission = async (userId: number, permission: UserPermission): Promise<void> => {
        // verify the user id and permission id are valid
        if (await this.getUserById(userId) == null) throw new IllegalArgumentError(`user with the provided id ${userId} does not exist`);
        if (await this.getPermissionById(permission.id) == null) throw new IllegalArgumentError(`permission with the provided id ${permission.id} does not exist`);

        // if the user already has this permission, do nothing
        if ((await this.getPermissionsOnUser(userId)).find(p => p.id == permission.id)) return;

        // add the permission to the permissions table
        const [ rows ] = await this.pool.execute<ResultSetHeader>(
            `INSERT INTO user_permissions(user_id, permission_id)
            VALUES (?, ?)`, [ userId, permission.id ]);

        if (rows.affectedRows != 1) throw new RepositoryFailureError("the insert operation did not occur properly");
        return;
    }

    public revokePermission = async (userId: number, permission: UserPermission) => {
        // verify the user id is valid
        if (await this.getUserById(userId) == null) throw new IllegalArgumentError(`user with the provided id ${userId} does not exist`);

        // just delete the permission by the primary key
        // if the permission is not deleted, there won't be any error

        await this.pool.execute(`DELETE FROM user_permissions WHERE (user_id, permission_id) = (?, ?)`, [ userId, permission.id ]);
        return;
    }

}