import dotenv from 'dotenv';
import initDB from './db/initDB';
import readline from "readline";
import { UserRepository } from './repository/UserRepository';
import { UserRepositoryImpl } from './repository/UserRepositoryImpl';
import { GlobalRegistryRepositoryImpl } from './repository/GlobalRegistryRepositoryImpl';

const DEV_ENV = true;

dotenv.config({ path: `.env.${DEV_ENV ? 'dev' : 'prod'}` });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});



// Init DB
initDB().then(async pool => {
    console.log("connected to db pool");

    const userRepository = new UserRepositoryImpl(pool);
    const repo = new GlobalRegistryRepositoryImpl(pool);

    function runRl() {
        rl.question("Enter a command: ", async (command) => {
            console.log(await eval("async () => { return " + command + "; }")());
            runRl();
        });
    }
    runRl();
})