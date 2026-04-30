import { Application, Request, Response, Router } from "express";
import { GlobalRegistryRepository } from "../repository/GlobalRegistryRepository";


export class GlobalRegistryRepositoryAPI {
    private globalRegistryRepository: GlobalRegistryRepository;

    constructor(globalRegistryRepository: GlobalRegistryRepository) {
        this.globalRegistryRepository = globalRegistryRepository;
    }

    public registerRoutes(): Router {

        const router = Router();



        return router;

    }
}