import mysql from 'mysql2/promise';

const initDB = (): Promise<mysql.Pool> => {
    return new Promise(async (resolve, reject) => {
        if (!process.env.MYSQL_PORT) {
		reject("port for sql db not defined in env!");
		return;
	}
	
	const pool = mysql.createPool({
            host: "localhost",
            user: "root",
	    port: parseInt(process.env.MYSQL_PORT),
            database: process.env.MYSQL_DATABASE,
            password: process.env.MYSQL_ROOT_PASSWORD
        });

        // test connection
        await pool.query("select 1;");
        resolve(pool);
    });
}

export default initDB;
