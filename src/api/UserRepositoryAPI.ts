import { Application, Request, Response } from "express";
import { UserRepository } from "../repository/UserRepository";


export class UserRepositoryAPI {
    private app: Application;
    private userRepository: UserRepository;

    constructor(app: Application, userRepository: UserRepository) {
        this.app = app;
        this.userRepository = userRepository;
    }

    public registerRoutes() {



    }
}