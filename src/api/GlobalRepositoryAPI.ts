import { Application, Request, Response } from "express";
import { GlobalRegistryRepository } from "../repository/GlobalRegistryRepository";


export class GlobalRegistryRepositoryAPI {
    private app: Application;
    private globalRegistryRepository: GlobalRegistryRepository;

    constructor(app: Application, globalRegistryRepository: GlobalRegistryRepository) {
        this.app = app;
        this.globalRegistryRepository = globalRegistryRepository;
    }

    public registerRoutes() {



    }
}