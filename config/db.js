// config/db.js
import mysql from 'mysql2';
import 'dotenv/config'

export const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,  // 2. Agregado para que lea el puerto 18535 en la nube
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();