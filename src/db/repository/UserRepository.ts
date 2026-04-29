import { CreateUserProps, UpdateUserProps, User } from "../model/User";
import { CreateUserPermissionProps, UserPermission } from "../model/UserPermission";

/**
 * Repository for users. Responsible for CRUD operations on users, as well as their specific permissions for the application.
 */
export interface UserRepository {
    /**
     * Creates a user with the specified properties
     * @param props the properties of the created user
     */
    createUser(props: CreateUserProps): Promise<User>;

    /**
     * Gets the list of all users in the repository
     */
    getUsers(): Promise<User[]>;

    /**
     * Gets a user's profile given an Id
     * @param id the id of the user to get
     */
    getUserById(id: number): Promise<User | null>;

    /**
     * Gets a user's profile by a username
     * @param username the username of the user
     */
    getUserByUsername(username: string): Promise<User | null>;

    /**
     * Updates a user's profile with the given properties. Properties that are not set will not change
     * @param id the user to update
     * @param props the properties to update the user with
     */
    updateUser(id: number, props: UpdateUserProps): Promise<void>;

    /**
     * Deletes a user by the specified Id
     * @param id the id of the user to delete
     */
    deleteUser(id: number): Promise<void>;

    /**
     * Creates a permission by the given name
     * @param permission the permission name to create
     */
    createPermission(permission: CreateUserPermissionProps): Promise<UserPermission>;

    /**
     * Gets a list of all permissions that are available
     */
    getPermissions(): Promise<UserPermission[]>;

    /**
     * Returns a list of all permissions that apply to a specific user
     * @param userId the id of the user to get permissions of
     */
    getPermissionsOnUser(userId: number): Promise<UserPermission[]>;

    /**
     * Gives a specific permission to the user. The userId must be valid and the permission must exist. If the user already has this permission, no effect will occur
     * @param userId the id of the user to give the permission to
     * @param permission the permission to add to the user
     */
    assignPermission(userId: number, permission: UserPermission): Promise<void>

    /**
     * Revokes a specific permission from a user. The userId must be valid
     * If the user does not already have this permission, no effect will occur
     * @param userId the id of the user to revoke the permission from
     * @param permission the permission to revoke
     */
    revokePermission(userId: number, permission: UserPermission): Promise<void>

    /**
     * Completely deletes a permission from the database. This will also revoke the permission from all users who already have it.
     * If the permission does not exist, no effect will occur
     * @param permission the permission id to delete
     */
    deletePermission(permissionId: number): Promise<void>
}