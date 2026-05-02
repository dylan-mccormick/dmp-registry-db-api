import { Application, Request, Response, Router } from "express";
import { GlobalRegistryRepository } from "../repository/GlobalRegistryRepository";
import { RegistryRepositoryCreateSchema, RegistryRepositoryIdQuerySchema, RegistryRepositoryQuerySchema, RegistryRepositoryUpdateSchema } from "./schema/RegistryRepositorySchema";
import { asyncHandler } from "../Utils";
import { RegistryAgentCreateSchema, RegistryAgentIdQuerySchema, RegistryAgentUpdateSchema } from "./schema/RegistryAgentSchema";
import { RegistryPermissionCreateSchema, RegistryPermissionIdQuerySchema } from "./schema/RegistryPermissionSchema";
import { RegistryAgentPermissionIdQuerySchema, UserIdGlobalPermissionQuerySchema, UserIdRegistryPermissionIdQuerySchema, UserIdRegistryPermissionQuerySchema } from "./schema/RegistryActorPermissionSchema";


export class GlobalRegistryRepositoryAPI {
    private globalRegistryRepository: GlobalRegistryRepository;

    constructor(globalRegistryRepository: GlobalRegistryRepository) {
        this.globalRegistryRepository = globalRegistryRepository;
    }

    public registerRoutes(): Router {

        const router = Router();

        router.get("/registry/permissions", asyncHandler(async (req: Request, res: Response) => {
            const { name } = RegistryRepositoryQuerySchema.parse(req.query);
            if (name) {
                const permission = await this.globalRegistryRepository.getRegistryPermissionByName(name);
                if (!permission) return res.status(404).json({ error: "Registry permission not found" });
                return res.status(200).json(permission);
            }
            const permissions = await this.globalRegistryRepository.getRegistryPermissions();
            res.status(200).json(permissions);
        })); // also handle cases when we are indexing by name

        router.get("/registry/permissions/:permissionId", asyncHandler(async (req: Request, res: Response) => {
            const { permissionId } = RegistryPermissionIdQuerySchema.parse(req.params);
            const permission = await this.globalRegistryRepository.getRegistryPermissionById(permissionId);
            if (!permission) return res.status(404).json({ error: "Registry permission not found" });
            res.status(200).json(permission);
        }));

        router.post("/registry/permissions", asyncHandler(async (req: Request, res: Response) => {
            const { name } = RegistryPermissionCreateSchema.parse(req.body);
            // verify that the registry permission name is not already in use
            if (await this.globalRegistryRepository.getRegistryPermissionByName(name)) {
                 return res.status(400).json({ error: "Registry permission with this name already exists" });
            }
            const permission = await this.globalRegistryRepository.createRegistryPermission({ name });
            res.status(201).json(permission);
        }));

        router.delete("/registry/permissions/:permissionId", asyncHandler(async (req: Request, res: Response) => {
            const { permissionId } = RegistryPermissionIdQuerySchema.parse(req.params);
            await this.globalRegistryRepository.deleteRegistryPermission(permissionId); // idempotent delete, so no need to verify existence beforehand
            res.status(200).json({ message: "Registry permission deleted successfully" });
        }));

        router.get("/registry", asyncHandler(async (req: Request, res: Response) => {
            const { name } = RegistryRepositoryQuerySchema.parse(req.query);
            if (name) {
                const registry = await this.globalRegistryRepository.getRegistryByName(name);
                if (!registry) {
                    return res.status(404).json({ error: "Registry not found" });
                }
                return res.status(200).json(registry);
            }
            const registry = await this.globalRegistryRepository.getRegistries();
            res.status(200).json(registry);
        }));

        router.post("/registry", asyncHandler(async (req: Request, res: Response) => {
            const { name, type, storage_location } = RegistryRepositoryCreateSchema.parse(req.body);
            // verify that the registry name is not already in use
            if (await this.globalRegistryRepository.getRegistryByName(name)) return res.status(400).json({ error: "Registry with this name already exists" });
            const registry = await this.globalRegistryRepository.createRegistry({ name, type, storage_location });
            res.status(201).json(registry);
        }));

        router.get("/registry/:id", asyncHandler(async (req: Request, res: Response) => {
            const { id } = RegistryRepositoryIdQuerySchema.parse(req.params);
            const registry = await this.globalRegistryRepository.getRegistryById(id);
            if (!registry) return res.status(404).json({ error: "Registry not found" });
            res.status(200).json(registry);
        }));

        router.put("/registry/:id", asyncHandler(async (req: Request, res: Response) => {
            const { name } = RegistryRepositoryUpdateSchema.parse(req.body);
            const { id } = RegistryRepositoryIdQuerySchema.parse(req.params);
            // verify that the registry exists
            const registry = await this.globalRegistryRepository.getRegistryById(id);
            if (!registry) return res.status(404).json({ error: "Registry not found" });
            // verify that the new name is not already in use by another registry
            if (name && await this.globalRegistryRepository.getRegistryByName(name) && (await this.globalRegistryRepository.getRegistryByName(name))!.id !== id) {
                return res.status(400).json({ error: "Registry with this name already exists" });
            }
            await this.globalRegistryRepository.updateRegistry(id, { name });
            res.status(200).json({ message: "Registry updated successfully" });
        }));

        router.delete("/registry/:id", asyncHandler(async (req: Request, res: Response) => {
            const { id } = RegistryRepositoryIdQuerySchema.parse(req.params);
            await this.globalRegistryRepository.deleteRegistry(id); // idempotent delete, so no need to verify existence beforehand
            res.status(200).json({ message: "Registry deleted successfully" });
        }));

        router.get("/registry/:id/agents", asyncHandler(async (req: Request, res: Response) => {
            const { name } = RegistryRepositoryQuerySchema.parse(req.query);
            const { id: registryId } = RegistryRepositoryIdQuerySchema.parse(req.params);
            if (name) {
                const agent = await this.globalRegistryRepository.getRegistryAgentByName(name);
                if (!agent) return res.status(404).json({ error: "Registry agent not found" });
                return res.status(200).json(agent);
            }
            const agents = await this.globalRegistryRepository.getRegistryAgents(registryId);
            res.status(200).json(agents);
        }));

        router.get("/registry/:registryId/agents/:agentId", asyncHandler(async (req: Request, res: Response) => {
            const { agentId } = RegistryAgentIdQuerySchema.parse(req.params);
            const agent = await this.globalRegistryRepository.getRegistryAgentById(agentId);
            if (!agent) return res.status(404).json({ error: "Registry agent not found" });
            res.status(200).json(agent);
        }));

        router.post("/registry/:id/agents", asyncHandler(async (req: Request, res: Response) => {
            const { id: registryId } = RegistryRepositoryIdQuerySchema.parse(req.params);
            const { name, key_hash, created_by_user_id } = RegistryAgentCreateSchema.parse(req.body);
            // verify that the registry exists
            if (!(await this.globalRegistryRepository.getRegistryById(registryId))) return res.status(404).json({ error: "Registry not found" });
            // verify that the registry agent name is not already in use
            if (await this.globalRegistryRepository.getRegistryAgentByName(name)) return res.status(400).json({ error: "Registry agent with this name already exists" });
            // verify that the user creating the registry agent exists
            if (!(await this.globalRegistryRepository.getRegistryPermissionsOnUser(created_by_user_id))) return res.status(404).json({ error: "Creating user not found" });
            const agent = await this.globalRegistryRepository.createRegistryAgent({ registry_id: registryId, name, key_hash, created_by_user_id });
            res.status(201).json(agent);
        }));

        router.put("/registry/:registryId/agents/:agentId", asyncHandler(async (req: Request, res: Response) => {
            const { agentId } = RegistryAgentIdQuerySchema.parse(req.params);
            const { name, key_hash } = RegistryAgentUpdateSchema.parse(req.body);
            const agent = await this.globalRegistryRepository.getRegistryAgentById(agentId);
            if (!agent) return res.status(404).json({ error: "Registry agent not found" });
            // verify that the new name is not already in use by another registry agent
            if (name && await this.globalRegistryRepository.getRegistryAgentByName(name) && (await this.globalRegistryRepository.getRegistryAgentByName(name))!.id !== agentId) {
                return res.status(400).json({ error: "Registry agent with this name already exists" });
            }
            await this.globalRegistryRepository.updateRegistryAgent(agentId, { name, key_hash });
            res.status(200).json({ message: "Registry agent updated successfully" });
        }));

        router.delete("/registry/:registryId/agents/:agentId", asyncHandler(async (req: Request, res: Response) => {
            const { agentId } = RegistryAgentIdQuerySchema.parse(req.params);
            await this.globalRegistryRepository.deleteRegistryAgent(agentId); // idempotent delete, so no need to verify existence beforehand
            res.status(200).json({ message: "Registry agent deleted successfully" });
        }));

        router.get("/users/:userId/registry/permissions", asyncHandler(async (req: Request, res: Response) => {
            const { userId } = UserIdGlobalPermissionQuerySchema.parse(req.params);
            const permissions = await this.globalRegistryRepository.getRegistryPermissionsOnUser(userId);
            res.status(200).json(permissions);
        }));

        router.get("/users/:userId/registry/:registryId/permissions", asyncHandler(async (req: Request, res: Response) => {
            const { userId, registryId } = UserIdRegistryPermissionQuerySchema.parse(req.params);
            const permissions = await this.globalRegistryRepository.getRegistryPermissionsOnUserRegistry(userId, registryId);
             res.status(200).json(permissions);
        }));

        router.post("/users/:userId/registry/:registryId/permissions/:permissionId", asyncHandler(async (req: Request, res: Response) => {
            const { userId, registryId, permissionId } = UserIdRegistryPermissionIdQuerySchema.parse(req.params);
            const permission = await this.globalRegistryRepository.getRegistryPermissionById(permissionId);
            if (!permission) return res.status(404).json({ error: "Registry permission not found" });
            await this.globalRegistryRepository.assignRegistryPermissionToUser(userId, registryId, permission);
            res.status(200).json({ message: "Registry permission assigned to user successfully" });
        }));

        router.get("/users/:userId/registry/:registryId/permissions/:permissionId", asyncHandler(async (req: Request, res: Response) => {
            const { userId, registryId, permissionId } = UserIdRegistryPermissionIdQuerySchema.parse(req.params);
            const permission = await this.globalRegistryRepository.getRegistryPermissionById(permissionId);
            if (!permission) return res.status(404).json({ error: "Registry permission not found" });
            const permissionsOnUser = await this.globalRegistryRepository.getRegistryPermissionsOnUserRegistry(userId, registryId);
            const hasPermission = permissionsOnUser.some(p => p.permission_id === permissionId);
            res.status(200).json({ hasPermission });
        }));

        router.delete("/users/:userId/registry/:registryId/permissions/:permissionId", asyncHandler(async (req: Request, res: Response) => {
            const { userId, registryId, permissionId } = UserIdRegistryPermissionIdQuerySchema.parse(req.params);
            const permission = await this.globalRegistryRepository.getRegistryPermissionById(permissionId);
            if (!permission) return res.status(404).json({ error: "Registry permission not found" });
            await this.globalRegistryRepository.revokeRegistryPermissionFromUser(userId, registryId, permission);
            res.status(200).json({ message: "Registry permission revoked from user successfully" });
        }));

        router.get("/registry/:registryId/agents/:agentId/permissions", asyncHandler(async (req: Request, res: Response) => {
            const { registryId, agentId } = RegistryAgentIdQuerySchema.parse(req.params);
            const permissions = await this.globalRegistryRepository.getRegistryPermissionsOnAgentRegistry(agentId, registryId);
            res.status(200).json(permissions);
        }));

        router.get("/registry/:registryId/agents/:agentId/permissions/:permissionId", asyncHandler(async (req: Request, res: Response) => {
            const { registryId, agentId, permissionId } = RegistryAgentPermissionIdQuerySchema.parse(req.params);
            const permission = await this.globalRegistryRepository.getRegistryPermissionById(permissionId);
            if (!permission) return res.status(404).json({ error: "Registry permission not found" });
            const permissionsOnAgent = await this.globalRegistryRepository.getRegistryPermissionsOnAgentRegistry(agentId, registryId);
            const hasPermission = permissionsOnAgent.some(p => p.permission_id === permissionId);
            res.status(200).json({ hasPermission });
        }));

        router.post("/registry/:registryId/agents/:agentId/permissions/:permissionId", asyncHandler(async (req: Request, res: Response) => {
            const { registryId, agentId, permissionId } = RegistryAgentPermissionIdQuerySchema.parse(req.params);
            const permission = await this.globalRegistryRepository.getRegistryPermissionById(permissionId);
            if (!permission) return res.status(404).json({ error: "Registry permission not found" });
            await this.globalRegistryRepository.assignRegistryPermissionToAgent(agentId, registryId, permission);
            res.status(200).json({ message: "Registry permission assigned to agent successfully" });
        }));

        router.delete("/registry/:registryId/agents/:agentId/permissions/:permissionId", asyncHandler(async (req: Request, res: Response) => {
            const { registryId, agentId, permissionId } = RegistryAgentPermissionIdQuerySchema.parse(req.params);
            const permission = await this.globalRegistryRepository.getRegistryPermissionById(permissionId);
            if (!permission) return res.status(404).json({ error: "Registry permission not found" });
            await this.globalRegistryRepository.revokeRegistryPermissionFromAgent(agentId, registryId, permission);
            res.status(200).json({ message: "Registry permission revoked from agent successfully" });
        }));

        return router;

    }
}