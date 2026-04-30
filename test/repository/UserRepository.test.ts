import mysql, { createPool } from 'mysql2/promise';
import { UserRepositoryImpl } from '../../src/repository/UserRepositoryImpl';
import { UserRepository } from '../../src/repository/UserRepository';
import { IllegalArgumentError } from '../../src/error/IllegalArgumentError';
import { IllegalStateError } from '../../src/error/IllegalStateError';

let pool: mysql.Pool;
let repo: UserRepository;

const clearTables = async () => {
    await pool.execute('DELETE FROM user_permissions');
    await pool.execute('DELETE FROM users');
    await pool.execute('DELETE FROM user_permissions_available');
};

const longString = (length: number) => 'a'.repeat(length);

beforeAll(async () => {
    pool = createPool({
        host: 'localhost',
        port: 3307,  // test db port
        user: 'root',
        password: 'password',
        database: 'test'
    });
    repo = new UserRepositoryImpl(pool);
});

beforeEach(async () => {
    await clearTables();
});

afterAll(async () => {
    await pool.end();
});

describe('UserRepository contract', () => {
    describe('user CRUD', () => {
        it('returns an empty list when there are no users', async () => {
            await expect(repo.getUsers()).resolves.toEqual([]);
        });

        it('creates a user and returns the persisted record', async () => {
            const created = await repo.createUser({
                username: 'alice',
                email: 'alice@example.com',
                password_hash: 'hash-1'
            });

            expect(created).toMatchObject({
                username: 'alice',
                email: 'alice@example.com',
                password_hash: 'hash-1'
            });
            expect(created.id).toEqual(expect.any(Number));
            expect(created.created_at).toEqual(expect.any(Date));

            await expect(repo.getUserById(created.id)).resolves.toEqual(created);
            await expect(repo.getUserByUsername('alice')).resolves.toEqual(created);
            await expect(repo.getUsers()).resolves.toEqual([created]);
        });

        it('accepts values at the 255 character boundary', async () => {
            const value = longString(255);

            const created = await repo.createUser({
                username: value,
                email: `${value}@x.co`.slice(0, 255),
                password_hash: value
            });

            expect(created.username).toBe(value);
            expect(created.password_hash).toBe(value);
            expect(created.email.length).toBeLessThanOrEqual(255);
        });

        it('rejects blank or oversized create payload values', async () => {
            const invalidValues = ['', '   ', longString(256)];

            for (const username of invalidValues) {
                await expect(repo.createUser({
                    username,
                    email: 'valid@example.com',
                    password_hash: 'hash-1'
                })).rejects.toBeInstanceOf(IllegalArgumentError);
            }

            for (const email of invalidValues) {
                await expect(repo.createUser({
                    username: 'valid-user',
                    email,
                    password_hash: 'hash-1'
                })).rejects.toBeInstanceOf(IllegalArgumentError);
            }

            for (const password_hash of invalidValues) {
                await expect(repo.createUser({
                    username: 'valid-user',
                    email: 'valid@example.com',
                    password_hash
                })).rejects.toBeInstanceOf(IllegalArgumentError);
            }
        });

        it('rejects duplicate usernames and preserves the original user', async () => {
            const original = await repo.createUser({
                username: 'alice',
                email: 'alice@example.com',
                password_hash: 'hash-1'
            });

            await expect(repo.createUser({
                username: 'alice',
                email: 'alice2@example.com',
                password_hash: 'hash-2'
            })).rejects.toBeInstanceOf(IllegalStateError);

            await expect(repo.getUsers()).resolves.toEqual([original]);
        });

        it('returns null when a user cannot be found', async () => {
            await expect(repo.getUserById(999999)).resolves.toBeNull();
            await expect(repo.getUserByUsername('missing')).resolves.toBeNull();
        });

        it('updates only the provided fields on a user', async () => {
            const created = await repo.createUser({
                username: 'alice',
                email: 'alice@example.com',
                password_hash: 'hash-1'
            });

            await repo.updateUser(created.id, {
                email: 'alice-updated@example.com',
                email_verified: false,
                token_version: 7
            });

            const updated = await repo.getUserById(created.id);

            expect(updated).toMatchObject({
                id: created.id,
                username: 'alice',
                email: 'alice-updated@example.com',
                token_version: 7,
                password_hash: 'hash-1',
            });
            expect(Boolean(updated?.email_verified)).toBe(false);
        });

        it('rejects updates for missing users', async () => {
            await expect(repo.updateUser(999999, {
                email: 'missing@example.com'
            })).rejects.toBeInstanceOf(IllegalArgumentError);
        });

        it('rejects invalid update values and leaves the user unchanged', async () => {
            const created = await repo.createUser({
                username: 'alice',
                email: 'alice@example.com',
                password_hash: 'hash-1'
            });

            await expect(repo.updateUser(created.id, {
                username: '   '
            })).rejects.toBeInstanceOf(IllegalArgumentError);

            await expect(repo.getUserById(created.id)).resolves.toMatchObject(created);
        });

        it('rejects username collisions during update', async () => {
            const alice = await repo.createUser({
                username: 'alice',
                email: 'alice@example.com',
                password_hash: 'hash-1'
            });
            const bob = await repo.createUser({
                username: 'bob',
                email: 'bob@example.com',
                password_hash: 'hash-2'
            });

            await expect(repo.updateUser(bob.id, {
                username: 'alice'
            })).rejects.toBeInstanceOf(IllegalStateError);

            await expect(repo.getUserById(bob.id)).resolves.toMatchObject(bob);
            await expect(repo.getUserById(alice.id)).resolves.toMatchObject(alice);
        });

        it('deletes a user and treats a missing delete target as a no-op', async () => {
            const created = await repo.createUser({
                username: 'alice',
                email: 'alice@example.com',
                password_hash: 'hash-1'
            });

            await expect(repo.deleteUser(created.id)).resolves.toBeUndefined();
            await expect(repo.getUserById(created.id)).resolves.toBeNull();

            await expect(repo.deleteUser(created.id)).resolves.toBeUndefined();
        });
    });

    describe('permission CRUD', () => {
        it('returns an empty list when there are no permissions', async () => {
            await expect(repo.getPermissions()).resolves.toEqual([]);
        });

        it('creates a permission and returns the persisted record', async () => {
            const created = await repo.createPermission({
                name: 'can-read'
            });

            expect(created).toMatchObject({
                name: 'can-read'
            });
            expect(created.id).toEqual(expect.any(Number));

            await expect(repo.getPermissionById(created.id)).resolves.toEqual(created);
            await expect(repo.getPermissionByName('can-read')).resolves.toEqual(created);
            await expect(repo.getPermissions()).resolves.toEqual([created]);
        });

        it('accepts permission names at the 255 character boundary', async () => {
            const name = longString(255);

            const created = await repo.createPermission({ name });

            expect(created.name).toBe(name);
        });

        it('rejects blank or oversized permission names', async () => {
            for (const name of ['', '   ', longString(256)]) {
                await expect(repo.createPermission({ name })).rejects.toBeInstanceOf(IllegalArgumentError);
            }
        });

        it('rejects duplicate permission names', async () => {
            const created = await repo.createPermission({
                name: 'can-read'
            });

            await expect(repo.createPermission({
                name: 'can-read'
            })).rejects.toBeInstanceOf(IllegalStateError);

            await expect(repo.getPermissions()).resolves.toEqual([created]);
        });

        it('returns null when a permission cannot be found', async () => {
            await expect(repo.getPermissionById(999999)).resolves.toBeNull();
            await expect(repo.getPermissionByName('missing')).resolves.toBeNull();
        });

        it('deletes a permission and treats a missing delete target as a no-op', async () => {
            const created = await repo.createPermission({
                name: 'can-read'
            });

            await expect(repo.deletePermission(created.id)).resolves.toBeUndefined();
            await expect(repo.getPermissionById(created.id)).resolves.toBeNull();

            await expect(repo.deletePermission(created.id)).resolves.toBeUndefined();
        });
    });

    describe('user permission assignments', () => {
        it('returns the permissions assigned to a user', async () => {
            const user = await repo.createUser({
                username: 'alice',
                email: 'alice@example.com',
                password_hash: 'hash-1'
            });
            const read = await repo.createPermission({ name: 'can-read' });
            const write = await repo.createPermission({ name: 'can-write' });

            await repo.assignPermission(user.id, read);
            await repo.assignPermission(user.id, write);

            const permissions = await repo.getPermissionsOnUser(user.id);

            expect(permissions).toEqual(expect.arrayContaining([read, write]));
            expect(permissions).toHaveLength(2);
        });

        it('rejects permission lookup for a missing user', async () => {
            await expect(repo.getPermissionsOnUser(999999)).rejects.toBeInstanceOf(IllegalArgumentError);
        });

        it('assigns a permission once and ignores duplicate assignments', async () => {
            const user = await repo.createUser({
                username: 'alice',
                email: 'alice@example.com',
                password_hash: 'hash-1'
            });
            const permission = await repo.createPermission({ name: 'can-read' });

            await expect(repo.assignPermission(user.id, permission)).resolves.toBeUndefined();
            await expect(repo.assignPermission(user.id, permission)).resolves.toBeUndefined();

            const permissions = await repo.getPermissionsOnUser(user.id);
            expect(permissions).toEqual([permission]);
        });

        it('rejects assignment when the user or permission does not exist', async () => {
            const permission = await repo.createPermission({ name: 'can-read' });
            const user = await repo.createUser({
                username: 'alice',
                email: 'alice@example.com',
                password_hash: 'hash-1'
            });

            await expect(repo.assignPermission(999999, permission)).rejects.toBeInstanceOf(IllegalArgumentError);
            await expect(repo.assignPermission(user.id, { id: 999999, name: 'missing' })).rejects.toBeInstanceOf(IllegalArgumentError);
        });

        it('revokes a permission and treats missing assignments as a no-op', async () => {
            const user = await repo.createUser({
                username: 'alice',
                email: 'alice@example.com',
                password_hash: 'hash-1'
            });
            const permission = await repo.createPermission({ name: 'can-read' });

            await repo.assignPermission(user.id, permission);
            await expect(repo.revokePermission(user.id, permission)).resolves.toBeUndefined();
            await expect(repo.getPermissionsOnUser(user.id)).resolves.toEqual([]);

            await expect(repo.revokePermission(user.id, permission)).resolves.toBeUndefined();
        });

        it('rejects revocation for a missing user', async () => {
            const permission = await repo.createPermission({ name: 'can-read' });

            await expect(repo.revokePermission(999999, permission)).rejects.toBeInstanceOf(IllegalArgumentError);
        });

        it('removes a permission from all users when the permission is deleted', async () => {
            const alice = await repo.createUser({
                username: 'alice',
                email: 'alice@example.com',
                password_hash: 'hash-1'
            });
            const bob = await repo.createUser({
                username: 'bob',
                email: 'bob@example.com',
                password_hash: 'hash-2'
            });
            const permission = await repo.createPermission({ name: 'can-read' });

            await repo.assignPermission(alice.id, permission);
            await repo.assignPermission(bob.id, permission);

            await repo.deletePermission(permission.id);

            await expect(repo.getPermissionById(permission.id)).resolves.toBeNull();
            await expect(repo.getPermissionsOnUser(alice.id)).resolves.toEqual([]);
            await expect(repo.getPermissionsOnUser(bob.id)).resolves.toEqual([]);
        });
    });
});