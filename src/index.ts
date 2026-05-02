import dotenv from 'dotenv';
import initDB from './initDB';
import readline from "readline";
import { UserRepository } from './repository/UserRepository';
import { UserRepositoryImpl } from './repository/UserRepositoryImpl';
import { GlobalRegistryRepositoryImpl } from './repository/GlobalRegistryRepositoryImpl';
import { GlobalRegistryRepository } from './repository/GlobalRegistryRepository';
import initAPI from './initAPI';

const DEV_ENV = true;

dotenv.config({ path: `.env.${DEV_ENV ? 'dev' : 'prod'}` });

// Init DB
console.log("Entering main function.");
initDB().then(async pool => {
    console.log("Connected to DB pool.");

    const userRepository: UserRepository = new UserRepositoryImpl(pool);
    const globalRegistryRepository: GlobalRegistryRepository = new GlobalRegistryRepositoryImpl(pool);
    console.log("Initialized repositories.");

    initAPI(userRepository, globalRegistryRepository).then(() => console.log("Initialized API.")).catch(err => {
        console.error("Failed to initialize API.");
        console.error(err);
        process.exit(1);
    });
}).catch(err => {
    console.error("Failed to initialize DB pool.");
    console.error(err);
    process.exit(1);
});
