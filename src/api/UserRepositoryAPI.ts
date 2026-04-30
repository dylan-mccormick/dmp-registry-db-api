import { Application, Request, Response } from "express";
import { UserRepository } from "../repository/UserRepository";
import { UserCreateSchema, UserQuerySchema, UserUpdateSchema } from "./schema/UserRepositorySchema";
import { ZodError } from "zod";


export class UserRepositoryAPI {
    private app: Application;
    private userRepository: UserRepository;

    constructor(app: Application, userRepository: UserRepository) {
        this.app = app;
        this.userRepository = userRepository;
    }

    public registerRoutes() {

        /* BASIC USER CRUD */

        this.app.get("/users", async (req, res) => {
            try {
                const { username } = UserQuerySchema.parse(req.query);
                if (username) {
                    const user = await this.userRepository.getUserByUsername(username);

                    if (!user) {
                        return res.status(404).json({ error: "User not found" });
                    }

                    return res.status(200).json(user);
                }
            } catch (error) {
                if (error instanceof ZodError) {
                    return res.status(400).json({ error: error.message });
                }
                res.status(500).json({ error: "Internal server error" });
            }

            const users = await this.userRepository.getUsers();
            res.status(200).json(users);
        });

        this.app.get("/users/:id", async (req, res) => {
            try {
                const { id } = UserQuerySchema.parse(req.params);
                if (id) {
                    const user = await this.userRepository.getUserById(id);

                    if (!user) {
                        return res.status(404).json({ error: "User not found" });
                    }

                    return res.status(200).json(user);
                }

                res.status(400).json({ error: "Invalid query parameters" });
            } catch (error) {
                if (error instanceof ZodError) {
                    return res.status(400).json({ error: error.message });
                }
                res.status(500).json({ error: "Internal server error" });
            }
        });

        this.app.post("/users", async (req, res) => {
            try {
                const { username, email, password_hash } = UserCreateSchema.parse(req.body);
                const newUser = await this.userRepository.createUser({ username, email, password_hash });
                res.status(201).json(newUser);
            } catch (error) {
                if (error instanceof ZodError) {
                    return res.status(400).json({ error: error.message });
                }
                res.status(500).json({ error: "Internal server error" });
            }
        });

        this.app.put("/users/:id", async (req, res) => {
            try {
                const { id } = UserQuerySchema.parse(req.params);
                const { username, email, password_hash } = UserUpdateSchema.parse(req.body);

                if (!id) {
                    return res.status(400).json({ error: "User ID is required" });
                }

                const updatedUser = await this.userRepository.updateUser(id, { username, email, password_hash });
                res.status(200).json(updatedUser);
            } catch (error) {
                if (error instanceof ZodError) {
                    return res.status(400).json({ error: error.message });
                }
                res.status(500).json({ error: "Internal server error" });
            }
        });

        this.app.delete("/users/:id", async (req, res) => {
            try {
                const { id } = UserQuerySchema.parse(req.params);

                if (!id) {
                    return res.status(400).json({ error: "User ID is required" });
                }

                await this.userRepository.deleteUser(id);
                res.status(200).json({ message: "User deleted successfully" });
            } catch (error) {
                if (error instanceof ZodError) {
                    return res.status(400).json({ error: error.message });
                }
                res.status(500).json({ error: "Internal server error" });
            }
        });

        /* USER PERMISSIONS */


    }
}