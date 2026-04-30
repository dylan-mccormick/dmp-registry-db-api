import { Application, Request, Response, Router } from "express";
import { UserRepository } from "../repository/UserRepository";
import { UserCreateSchema, UserIdQuerySchema, UserQuerySchema, UserUpdateSchema } from "./schema/UserRepositorySchema";
import { asyncHandler } from "../Utils";
import { UserPermissionCreateSchema, UserPermissionIdQuerySchema, UserPermissionQuerySchema } from "./schema/UserPermissionSchema";


export class UserRepositoryAPI {
    private userRepository: UserRepository;

    constructor(userRepository: UserRepository) {
        this.userRepository = userRepository;
    }

    public registerRoutes(): Router {

        const router = Router();

        router.get("/users", asyncHandler(async (req: Request, res: Response) => {
            const { username } = UserQuerySchema.parse(req.query);
            if (username) {
                const user = await this.userRepository.getUserByUsername(username);

                if (!user) {
                    return res.status(404).json({ error: "User not found" });
                }

                return res.status(200).json(user);
            }

            const users = await this.userRepository.getUsers();
            res.status(200).json(users);
        }));

        router.post("/users", asyncHandler(async (req: Request, res: Response) => {
            const { username, email, password_hash } = UserCreateSchema.parse(req.body);
            // verify that the username is not already in use
            if (await this.userRepository.getUserByUsername(username)) {
                return res.status(400).json({ error: "Username is already in use" });
            }
            const newUser = await this.userRepository.createUser({ username, email, password_hash });
            res.status(201).json(newUser);
        }));

        router.get("/users/permissions", asyncHandler(async (req: Request, res: Response) => {
            // are we looking for a permission by its name?
            const { name } = UserPermissionQuerySchema.parse(req.query);
            if (name) {
                const permission = await this.userRepository.getPermissionByName(name);
                if (!permission) return res.status(404).json({ error: "Permission not found" });
                return res.status(200).json(permission);
            }

            const permissions = await this.userRepository.getPermissions();
            res.status(200).json(permissions);
        }));

        router.post("/users/permissions", asyncHandler(async (req: Request, res: Response) => {
            const { name } = UserPermissionCreateSchema.parse(req.body);
            // verify that the permission doesn't already exist
            if (await this.userRepository.getPermissionByName(name)) {
                return res.status(400).json({ error: "Permission with this name already exists" });
            }
            const newPermission = await this.userRepository.createPermission({ name });
            res.status(201).json(newPermission);
        }));

        router.get("/users/:id", asyncHandler(async (req: Request, res: Response) => {
            const { id } = UserIdQuerySchema.parse(req.params);
            const user = await this.userRepository.getUserById(id);
            if (!user) return res.status(404).json({ error: "User not found" });
            return res.status(200).json(user);
        }));

        router.put("/users/:id", asyncHandler(async (req: Request, res: Response) => {
            const { id } = UserIdQuerySchema.parse(req.params);
            const { username, email, password_hash, email_verified, token_version } = UserUpdateSchema.parse(req.body);
            if (!(await this.userRepository.getUserById(id))) return res.status(404).json({ error: "User not found" });
            // verify that the new username (if being updated) is not already in use by another user
            if (username) {
                const existingUser = await this.userRepository.getUserByUsername(username);
                if (existingUser && existingUser.id !== id) {
                    return res.status(400).json({ error: "Username is already in use" });
                }
            }
            const updatedUser = await this.userRepository.updateUser(id, { username, email, password_hash, email_verified, token_version });
            res.status(200).json(updatedUser);
        }));

        router.delete("/users/:id", asyncHandler(async (req: Request, res: Response) => {
            const { id } = UserIdQuerySchema.parse(req.params);
            await this.userRepository.deleteUser(id);
            res.status(200).json({ message: "User deleted successfully" });
        }));

        router.get("/users/permissions/:id", asyncHandler(async (req: Request, res: Response) => {
            const { id } = UserPermissionIdQuerySchema.parse(req.params);
            const permission = await this.userRepository.getPermissionById(id);
            if (!permission) return res.status(404).json({ error: "Permission not found" });
            return res.status(200).json(permission);
        }));

        router.delete("/users/permissions/:id", asyncHandler(async (req: Request, res: Response) => {
            const { id } = UserPermissionIdQuerySchema.parse(req.params);
            await this.userRepository.deletePermission(id);
            res.status(200).json({ message: "Permission deleted successfully" });
        }));

        router.get("/users/:id/permissions", asyncHandler(async (req: Request, res: Response) => {
            const { id } = UserIdQuerySchema.parse(req.params);
            // verify that the user exists
            if (!(await this.userRepository.getUserById(id))) return res.status(404).json({ error: "User not found" });

            const permissions = await this.userRepository.getPermissionsOnUser(id);
            res.status(200).json(permissions);
        }));

        router.post("/users/:id/permissions/:permissionId", asyncHandler(async (req: Request, res: Response) => {
            const { id } = UserIdQuerySchema.parse(req.params);
            const { id: permissionId } = UserPermissionIdQuerySchema.parse(req.params);
            // verify that the user exists
            if (!(await this.userRepository.getUserById(id))) return res.status(404).json({ error: "User not found" });
            // verify that the permission exists
            const permission = await this.userRepository.getPermissionById(permissionId);
            if (!permission) return res.status(404).json({ error: "Permission not found" });

            await this.userRepository.assignPermission(id, permission);
            res.status(200).json({ message: "Permission assigned to user successfully" });
        }));

        router.delete("/users/:id/permissions/:permissionId", asyncHandler(async (req: Request, res: Response) => {
            const { id } = UserIdQuerySchema.parse(req.params);
            const { id: permissionId } = UserPermissionIdQuerySchema.parse(req.params);
            // verify that the user exists
            if (!(await this.userRepository.getUserById(id))) return res.status(404).json({ error: "User not found" });
            // verify that the permission exists
            const permission = await this.userRepository.getPermissionById(permissionId);
            if (!permission) return res.status(404).json({ error: "Permission not found" });

            await this.userRepository.revokePermission(id, permission);
            res.status(200).json({ message: "Permission revoked from user successfully" });
        }));

        return router;

    }
}