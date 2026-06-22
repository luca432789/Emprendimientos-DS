// config/db.js
import mysql from 'mysql2';
import 'dotenv/config'

let poolConfig;

if (process.env.DATABASE_URL) {
    // Si estamos en Render, usamos la URL de Railway combinada con tus límites del pool
    poolConfig = {
        url: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
} else {
    // Si estás en tu localhost, usa la configuración tradicional
    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
}

export const pool = mysql.createPool(poolConfig).promise();