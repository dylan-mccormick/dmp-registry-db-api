import mysql, { createPool, ResultSetHeader } from 'mysql2/promise';
import { GlobalRegistryRepositoryImpl } from '../../src/repository/GlobalRegistryRepositoryImpl';
import { GlobalRegistryRepository } from '../../src/repository/GlobalRegistryRepository';
import { IllegalArgumentError } from '../../src/error/IllegalArgumentError';
import { IllegalStateError } from '../../src/error/IllegalStateError';

let pool: mysql.Pool;
let repo: GlobalRegistryRepository;

const clearTables = async () => {
	await pool.execute('DELETE FROM registry_agent_permissions');
	await pool.execute('DELETE FROM registry_user_permissions');
	await pool.execute('DELETE FROM registry_agents');
	await pool.execute('DELETE FROM registry_permissions_available');
	await pool.execute('DELETE FROM registries');
	await pool.execute('DELETE FROM user_permissions');
	await pool.execute('DELETE FROM user_permissions_available');
	await pool.execute('DELETE FROM users');
};

const longString = (length: number) => 'a'.repeat(length);

const createRegistry = async (name: string, type: 'files' | 'mongodb' = 'files', storage_location = 'storage://bucket') => {
	return repo.createRegistry({ name, type, storage_location });
};

const insertUser = async (username: string) => {
	const [result] = await pool.execute<ResultSetHeader>(
		'INSERT INTO users(username, email, password_hash) VALUES (?, ?, ?)',
		[username, `${username}@example.com`, 'hash-1']
	);

	return result.insertId;
};

const insertRegistryAgent = async (registryId: number, name: string, keyHash?: string, createdByUserId?: number) => {
	const [result] = await pool.execute<ResultSetHeader>(
		'INSERT INTO registry_agents(registry_id, name, key_hash, created_by_user_id) VALUES (?, ?, ?, ?)',
		[registryId, name, keyHash ?? `key-${name}`, createdByUserId ?? null]
	);

	return result.insertId;
};

beforeAll(async () => {
	pool = createPool({
		host: 'localhost',
		port: 3307,
		user: 'root',
		password: 'password',
		database: 'test'
	});
	repo = new GlobalRegistryRepositoryImpl(pool);
});

beforeEach(async () => {
	await clearTables();
});

afterAll(async () => {
	await pool.end();
});

describe('GlobalRegistryRepository contract', () => {
	describe('registry CRUD', () => {
		it('returns an empty list when there are no registries', async () => {
			await expect(repo.getRegistries()).resolves.toEqual([]);
		});

		it('creates a registry and returns the persisted record', async () => {
			const created = await createRegistry('registry-a', 'files', 'storage://a');

			expect(created).toMatchObject({
				name: 'registry-a',
				type: 'files',
				storage_location: 'storage://a'
			});
			expect(created.id).toEqual(expect.any(Number));
			expect(created.created_at).toEqual(expect.any(Date));

			await expect(repo.getRegistryById(created.id)).resolves.toEqual(created);
			await expect(repo.getRegistryByName('registry-a')).resolves.toEqual(created);
			await expect(repo.getRegistries()).resolves.toEqual([created]);
		});

		it('accepts registry names at the 255 character boundary', async () => {
			const name = longString(255);

			const created = await createRegistry(name, 'mongodb', 'storage://b');

			expect(created.name).toBe(name);
		});

		it('rejects blank or oversized registry names', async () => {
			for (const name of ['', '   ', longString(256)]) {
				await expect(createRegistry(name)).rejects.toBeInstanceOf(IllegalArgumentError);
			}
		});

		it('rejects duplicate registry names', async () => {
			const created = await createRegistry('registry-a');

			await expect(createRegistry('registry-a')).rejects.toBeInstanceOf(IllegalStateError);
			await expect(repo.getRegistries()).resolves.toEqual([created]);
		});

		it('returns null when a registry cannot be found', async () => {
			await expect(repo.getRegistryById(999999)).resolves.toBeNull();
			await expect(repo.getRegistryByName('missing')).resolves.toBeNull();
		});

		it('updates only the registry name', async () => {
			const created = await createRegistry('registry-a', 'mongodb', 'storage://a');

			await repo.updateRegistry(created.id, {
				name: 'registry-b'
			});

			const updated = await repo.getRegistryById(created.id);

			expect(updated).toMatchObject({
				id: created.id,
				name: 'registry-b',
				type: 'mongodb',
				storage_location: 'storage://a'
			});
			expect(updated?.created_at).toEqual(created.created_at);
		});

		it('accepts an empty update object without changing the registry', async () => {
			const created = await createRegistry('registry-a', 'files', 'storage://a');

			await expect(repo.updateRegistry(created.id, {})).resolves.toBeUndefined();
			await expect(repo.getRegistryById(created.id)).resolves.toEqual(created);
		});

		it('rejects registry updates for a missing registry', async () => {
			await expect(repo.updateRegistry(999999, { name: 'registry-b' })).rejects.toBeInstanceOf(IllegalArgumentError);
		});

		it('rejects blank or oversized update names', async () => {
			const created = await createRegistry('registry-a');

			for (const name of ['', '   ', longString(256)]) {
				await expect(repo.updateRegistry(created.id, { name })).rejects.toBeInstanceOf(IllegalArgumentError);
			}
		});

		it('rejects registry name collisions during update', async () => {
			const first = await createRegistry('registry-a');
			const second = await createRegistry('registry-b');

			await expect(repo.updateRegistry(second.id, { name: 'registry-a' })).rejects.toBeInstanceOf(IllegalStateError);
			await expect(repo.getRegistryById(first.id)).resolves.toEqual(first);
			await expect(repo.getRegistryById(second.id)).resolves.toEqual(second);
		});

		it('deletes a registry and treats a missing delete target as a no-op', async () => {
			const created = await createRegistry('registry-a');

			await expect(repo.deleteRegistry(created.id)).resolves.toBeUndefined();
			await expect(repo.getRegistryById(created.id)).resolves.toBeNull();

			await expect(repo.deleteRegistry(created.id)).resolves.toBeUndefined();
		});
	});

	describe('registry agent CRUD', () => {
		it('returns an empty list for registries without agents', async () => {
			const registry = await createRegistry('registry-a');

			await expect(repo.getRegistryAgents(registry.id)).resolves.toEqual([]);
		});

		it('creates a registry agent and returns the persisted record', async () => {
			const registry = await createRegistry('registry-a');
			const creatorUserId = await insertUser('creator');

			const created = await repo.createRegistryAgent({
				registry_id: registry.id,
				name: 'agent-a',
				key_hash: 'key-1',
				created_by_user_id: creatorUserId
			});

			expect(created).toMatchObject({
				registry_id: registry.id,
				name: 'agent-a',
				key_hash: 'key-1',
				created_by_user_id: creatorUserId
			});
			expect(created.id).toEqual(expect.any(Number));
			expect(created.created_at).toEqual(expect.any(Date));

			await expect(repo.getRegistryAgentById(created.id)).resolves.toEqual(created);
			await expect(repo.getRegistryAgentByName('agent-a')).resolves.toEqual(created);
			await expect(repo.getRegistryAgents(registry.id)).resolves.toEqual([created]);
		});

		it('accepts registry agent names and key hashes at the 255 character boundary', async () => {
			const registry = await createRegistry('registry-a');
			const creatorUserId = await insertUser('creator');
			const value = longString(255);

			const created = await repo.createRegistryAgent({
				registry_id: registry.id,
				name: value,
				key_hash: value,
				created_by_user_id: creatorUserId
			});

			expect(created.name).toBe(value);
			expect(created.key_hash).toBe(value);
		});

		it('rejects blank or oversized registry agent names and key hashes', async () => {
			const registry = await createRegistry('registry-a');
			const creatorUserId = await insertUser('creator');

			for (const name of ['', '   ', longString(256)]) {
				await expect(repo.createRegistryAgent({
					registry_id: registry.id,
					name,
					key_hash: 'key-1',
					created_by_user_id: creatorUserId
				})).rejects.toBeInstanceOf(IllegalArgumentError);
			}

			for (const key_hash of ['', '   ', longString(256)]) {
				await expect(repo.createRegistryAgent({
					registry_id: registry.id,
					name: 'agent-a',
					key_hash,
					created_by_user_id: creatorUserId
				})).rejects.toBeInstanceOf(IllegalArgumentError);
			}
		});

		it('rejects duplicate registry agent names', async () => {
			const registry = await createRegistry('registry-a');
			const creatorUserId = await insertUser('creator');

			await repo.createRegistryAgent({
				registry_id: registry.id,
				name: 'agent-a',
				key_hash: 'key-1',
				created_by_user_id: creatorUserId
			});

			await expect(repo.createRegistryAgent({
				registry_id: registry.id,
				name: 'agent-a',
				key_hash: 'key-2',
				created_by_user_id: creatorUserId
			})).rejects.toBeInstanceOf(IllegalStateError);
		});

		it('returns null when a registry agent cannot be found', async () => {
			await expect(repo.getRegistryAgentById(999999)).resolves.toBeNull();
			await expect(repo.getRegistryAgentByName('missing')).resolves.toBeNull();
		});

		it('returns only the agents that belong to a registry', async () => {
			const registryA = await createRegistry('registry-a');
			const registryB = await createRegistry('registry-b');

			const agentA = await insertRegistryAgent(registryA.id, 'agent-a');
			const agentB = await insertRegistryAgent(registryA.id, 'agent-b');
			const agentC = await insertRegistryAgent(registryB.id, 'agent-c');

			await expect(repo.getRegistryAgents(registryA.id)).resolves.toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: agentA, registry_id: registryA.id, name: 'agent-a' }),
					expect.objectContaining({ id: agentB, registry_id: registryA.id, name: 'agent-b' })
				])
			);

			await expect(repo.getRegistryAgents(registryB.id)).resolves.toEqual([
				expect.objectContaining({ id: agentC, registry_id: registryB.id, name: 'agent-c' })
			]);
		});

		it('updates only the provided registry agent fields', async () => {
			const registry = await createRegistry('registry-a');
			const agentId = await insertRegistryAgent(registry.id, 'agent-a', 'key-1');

			await repo.updateRegistryAgent(agentId, {
				name: 'agent-b',
				key_hash: 'key-2'
			});

			await expect(repo.getRegistryAgentById(agentId)).resolves.toMatchObject({
				id: agentId,
				registry_id: registry.id,
				name: 'agent-b',
				key_hash: 'key-2'
			});
		});

		it('accepts an empty update object without changing the registry agent', async () => {
			const registry = await createRegistry('registry-a');
			const agentId = await insertRegistryAgent(registry.id, 'agent-a', 'key-1');

			const before = await repo.getRegistryAgentById(agentId);
			await expect(repo.updateRegistryAgent(agentId, {})).resolves.toBeUndefined();
			await expect(repo.getRegistryAgentById(agentId)).resolves.toEqual(before);
		});

		it('rejects registry agent updates for a missing agent', async () => {
			await expect(repo.updateRegistryAgent(999999, { name: 'agent-b' })).rejects.toBeInstanceOf(IllegalArgumentError);
		});

		it('rejects blank or oversized update values for registry agents', async () => {
			const registry = await createRegistry('registry-a');
			const agentId = await insertRegistryAgent(registry.id, 'agent-a', 'key-1');

			for (const name of ['', '   ', longString(256)]) {
				await expect(repo.updateRegistryAgent(agentId, { name })).rejects.toBeInstanceOf(IllegalArgumentError);
			}

			for (const key_hash of ['', '   ', longString(256)]) {
				await expect(repo.updateRegistryAgent(agentId, { key_hash })).rejects.toBeInstanceOf(IllegalArgumentError);
			}
		});

		it('rejects registry agent name collisions during update', async () => {
			const registry = await createRegistry('registry-a');
			const firstId = await insertRegistryAgent(registry.id, 'agent-a', 'key-1');
			const secondId = await insertRegistryAgent(registry.id, 'agent-b', 'key-2');

			await expect(repo.updateRegistryAgent(secondId, { name: 'agent-a' })).rejects.toBeInstanceOf(IllegalStateError);
			await expect(repo.getRegistryAgentById(firstId)).resolves.toMatchObject({ id: firstId, name: 'agent-a' });
			await expect(repo.getRegistryAgentById(secondId)).resolves.toMatchObject({ id: secondId, name: 'agent-b' });
		});

		it('deletes a registry agent and treats a missing delete target as a no-op', async () => {
			const registry = await createRegistry('registry-a');
			const agentId = await insertRegistryAgent(registry.id, 'agent-a');

			await expect(repo.deleteRegistryAgent(agentId)).resolves.toBeUndefined();
			await expect(repo.getRegistryAgentById(agentId)).resolves.toBeNull();

			await expect(repo.deleteRegistryAgent(agentId)).resolves.toBeUndefined();
		});
	});

	describe('registry permission CRUD', () => {
		it('returns an empty list when there are no registry permissions', async () => {
			await expect(repo.getRegistryPermissions()).resolves.toEqual([]);
		});

		it('creates a registry permission and returns the persisted record', async () => {
			const created = await repo.createRegistryPermission({
				name: 'can-read'
			});

			expect(created).toMatchObject({
				name: 'can-read'
			});
			expect(created.id).toEqual(expect.any(Number));

			await expect(repo.getRegistryPermissionById(created.id)).resolves.toEqual(created);
			await expect(repo.getRegistryPermissionByName('can-read')).resolves.toEqual(created);
			await expect(repo.getRegistryPermissions()).resolves.toEqual([created]);
		});

		it('accepts registry permission names at the 255 character boundary', async () => {
			const name = longString(255);

			const created = await repo.createRegistryPermission({ name });

			expect(created.name).toBe(name);
		});

		it('rejects blank or oversized registry permission names', async () => {
			for (const name of ['', '   ', longString(256)]) {
				await expect(repo.createRegistryPermission({ name })).rejects.toBeInstanceOf(IllegalArgumentError);
			}
		});

		it('rejects duplicate registry permission names', async () => {
			const created = await repo.createRegistryPermission({
				name: 'can-read'
			});

			await expect(repo.createRegistryPermission({
				name: 'can-read'
			})).rejects.toBeInstanceOf(IllegalStateError);

			await expect(repo.getRegistryPermissions()).resolves.toEqual([created]);
		});

		it('returns null when a registry permission cannot be found', async () => {
			await expect(repo.getRegistryPermissionById(999999)).resolves.toBeNull();
			await expect(repo.getRegistryPermissionByName('missing')).resolves.toBeNull();
		});

		it('deletes a registry permission and treats a missing delete target as a no-op', async () => {
			const created = await repo.createRegistryPermission({
				name: 'can-read'
			});

			await expect(repo.deleteRegistryPermission(created.id)).resolves.toBeUndefined();
			await expect(repo.getRegistryPermissionById(created.id)).resolves.toBeNull();
			await expect(repo.deleteRegistryPermission(created.id)).resolves.toBeUndefined();
		});
	});

	describe('registry permissions on users', () => {
		it('returns the registry permissions assigned to a user with the contract shape', async () => {
			const registry = await createRegistry('registry-a');
			const userId = await insertUser('alice');
			const permission = await repo.createRegistryPermission({ name: 'can-read' });

			await repo.assignRegistryPermissionToUser(userId, registry.id, permission);

			await expect(repo.getRegistryPermissionsOnUser(userId)).resolves.toEqual([
				{
					actor_id: userId,
					registry_id: registry.id,
					permission_id: permission.id
				}
			]);
		});

		it('returns only the registry permissions assigned within a specific registry', async () => {
			const registryA = await createRegistry('registry-a');
			const registryB = await createRegistry('registry-b');
			const userId = await insertUser('alice');
			const read = await repo.createRegistryPermission({ name: 'can-read' });
			const write = await repo.createRegistryPermission({ name: 'can-write' });

			await repo.assignRegistryPermissionToUser(userId, registryA.id, read);
			await repo.assignRegistryPermissionToUser(userId, registryB.id, write);

			await expect(repo.getRegistryPermissionsOnUserRegistry(userId, registryA.id)).resolves.toEqual([
				{
					actor_id: userId,
					registry_id: registryA.id,
					permission_id: read.id
				}
			]);

			await expect(repo.getRegistryPermissionsOnUserRegistry(userId, registryB.id)).resolves.toEqual([
				{
					actor_id: userId,
					registry_id: registryB.id,
					permission_id: write.id
				}
			]);
		});

		it('assigns a registry permission once and ignores duplicate assignments', async () => {
			const registry = await createRegistry('registry-a');
			const userId = await insertUser('alice');
			const permission = await repo.createRegistryPermission({ name: 'can-read' });

			await expect(repo.assignRegistryPermissionToUser(userId, registry.id, permission)).resolves.toBeUndefined();
			await expect(repo.assignRegistryPermissionToUser(userId, registry.id, permission)).resolves.toBeUndefined();

			await expect(repo.getRegistryPermissionsOnUserRegistry(userId, registry.id)).resolves.toEqual([
				{
					actor_id: userId,
					registry_id: registry.id,
					permission_id: permission.id
				}
			]);
		});

		it('revokes a registry permission from a user and treats missing assignments as a no-op', async () => {
			const registry = await createRegistry('registry-a');
			const userId = await insertUser('alice');
			const permission = await repo.createRegistryPermission({ name: 'can-read' });

			await repo.assignRegistryPermissionToUser(userId, registry.id, permission);
			await expect(repo.revokeRegistryPermissionFromUser(userId, registry.id, permission)).resolves.toBeUndefined();
			await expect(repo.getRegistryPermissionsOnUser(userId)).resolves.toEqual([]);

			await expect(repo.revokeRegistryPermissionFromUser(userId, registry.id, permission)).resolves.toBeUndefined();
		});
	});

	describe('registry permissions on agents', () => {
		it('returns the registry permissions assigned to an agent with the contract shape', async () => {
			const registry = await createRegistry('registry-a');
			const agentId = await insertRegistryAgent(registry.id, 'agent-a');
			const permission = await repo.createRegistryPermission({ name: 'can-read' });

			await repo.assignRegistryPermissionToAgent(agentId, registry.id, permission);

			await expect(repo.getRegistryPermissionsOnAgent(agentId)).resolves.toEqual([
				{
					actor_id: agentId,
					registry_id: registry.id,
					permission_id: permission.id
				}
			]);
		});

		it('returns only the registry permissions assigned within a specific registry for an agent', async () => {
			const registryA = await createRegistry('registry-a');
			const registryB = await createRegistry('registry-b');
			const agentId = await insertRegistryAgent(registryA.id, 'agent-a');
			const read = await repo.createRegistryPermission({ name: 'can-read' });
			const write = await repo.createRegistryPermission({ name: 'can-write' });

			await repo.assignRegistryPermissionToAgent(agentId, registryA.id, read);
			await repo.assignRegistryPermissionToAgent(agentId, registryB.id, write);

			await expect(repo.getRegistryPermissionsOnAgentRegistry(agentId, registryA.id)).resolves.toEqual([
				{
					actor_id: agentId,
					registry_id: registryA.id,
					permission_id: read.id
				}
			]);

			await expect(repo.getRegistryPermissionsOnAgentRegistry(agentId, registryB.id)).resolves.toEqual([
				{
					actor_id: agentId,
					registry_id: registryB.id,
					permission_id: write.id
				}
			]);
		});

		it('assigns a registry permission once and ignores duplicate assignments for an agent', async () => {
			const registry = await createRegistry('registry-a');
			const agentId = await insertRegistryAgent(registry.id, 'agent-a');
			const permission = await repo.createRegistryPermission({ name: 'can-read' });

			await expect(repo.assignRegistryPermissionToAgent(agentId, registry.id, permission)).resolves.toBeUndefined();
			await expect(repo.assignRegistryPermissionToAgent(agentId, registry.id, permission)).resolves.toBeUndefined();

			await expect(repo.getRegistryPermissionsOnAgentRegistry(agentId, registry.id)).resolves.toEqual([
				{
					actor_id: agentId,
					registry_id: registry.id,
					permission_id: permission.id
				}
			]);
		});

		it('revokes a registry permission from an agent and treats missing assignments as a no-op', async () => {
			const registry = await createRegistry('registry-a');
			const agentId = await insertRegistryAgent(registry.id, 'agent-a');
			const permission = await repo.createRegistryPermission({ name: 'can-read' });

			await repo.assignRegistryPermissionToAgent(agentId, registry.id, permission);
			await expect(repo.revokeRegistryPermissionFromAgent(agentId, registry.id, permission)).resolves.toBeUndefined();
			await expect(repo.getRegistryPermissionsOnAgent(agentId)).resolves.toEqual([]);

			await expect(repo.revokeRegistryPermissionFromAgent(agentId, registry.id, permission)).resolves.toBeUndefined();
		});
	});
});
