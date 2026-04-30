import express from "express";
import { GlobalRegistryRepository } from "./repository/GlobalRegistryRepository";
import { UserRepository } from "./repository/UserRepository";
import helmet from "helmet";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import { GlobalRegistryRepositoryAPI } from "./api/GlobalRepositoryAPI";
import { UserRepositoryAPI } from "./api/UserRepositoryAPI";

const initAPI = (userRepository: UserRepository, globalRegistryRepository: GlobalRegistryRepository): Promise<void> => {
    return new Promise((resolve, reject) => {
        // rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
        });

        const app = express();

        // use modules
        app.use(helmet());
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(bodyParser.json());
        app.use(limiter);

        // register API routes
        const userRepositoryAPI = new UserRepositoryAPI(app, userRepository);
        userRepositoryAPI.registerRoutes();

        const globalRegistryRepositoryAPI = new GlobalRegistryRepositoryAPI(app, globalRegistryRepository);
        globalRegistryRepositoryAPI.registerRoutes();
    });
}

export default initAPI;