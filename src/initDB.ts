import mysql from 'mysql2/promise';

const initDB = (): Promise<mysql.Pool> => {
    return new Promise(async (resolve, reject) => {
        const pool = mysql.createPool({
            host: "localhost",
            user: "root",
            database: process.env.MYSQL_DATABASE,
            password: process.env.MYSQL_ROOT_PASSWORD
        });

        // test connection
        await pool.query("select 1;");
        resolve(pool);
    });
}

export default initDB;