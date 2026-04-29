import dotenv from 'dotenv';
import initDB from './db/initDB';

const DEV_ENV = true;

dotenv.config({ path: `.env.${DEV_ENV ? 'dev' : 'prod'}` });

// Init DB
initDB().then(pool => {

})