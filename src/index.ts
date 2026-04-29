import dotenv from 'dotenv';
import initDB from './db/initDB';
import readline from "readline";
import { UserRepository } from './repository/UserRepository';
import { UserRepositoryImpl } from './repository/UserRepositoryImpl';

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


    function runRl() {
        rl.question("Enter a command: ", async (command) => {
            console.log(await eval("async () => { return " + command + "; }")());
            runRl();
        });
    }
    runRl();
})