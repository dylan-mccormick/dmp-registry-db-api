import express from "express";
import morgan from "morgan";
import { GlobalRegistryRepository } from "./repository/GlobalRegistryRepository";
import { UserRepository } from "./repository/UserRepository";
import helmet from "helmet";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import { GlobalRegistryRepositoryAPI } from "./api/GlobalRepositoryAPI";
import { UserRepositoryAPI } from "./api/UserRepositoryAPI";
import apiKeyHandler from "./api/apiKeyHandler";
import errorHandler from "./api/errorHandler";

const initAPI = (userRepository: UserRepository, globalRegistryRepository: GlobalRegistryRepository): Promise<void> => {
    return new Promise((resolve, reject) => {
        // rate limiting
        const limiter = rateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 60, // limit each IP to 60 requests per windowMs
        });

        const app = express();
        app.use(morgan("combined"));

        // use modules
        app.use(helmet());
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(bodyParser.json());
        app.use(limiter);

        // api key handler
        app.use(apiKeyHandler);

        // register API routes
        const userRepositoryAPI = new UserRepositoryAPI(userRepository);
        const userRouter = userRepositoryAPI.registerRoutes();

        const globalRegistryRepositoryAPI = new GlobalRegistryRepositoryAPI(globalRegistryRepository);
        const globalRouter = globalRegistryRepositoryAPI.registerRoutes();

        app.use("/api/v1", userRouter);
        app.use("/api/v1", globalRouter);

        // custom modules
        app.use(errorHandler);

        // start server
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            resolve();
        }).on("error", (err) => {
            reject(err);
        });
    });
}

export default initAPI;