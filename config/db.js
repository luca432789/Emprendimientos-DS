// config/db.js
import mysql from 'mysql2';
import 'dotenv/config'

let poolConfig;

if (process.env.DATABASE_URL) {
    // En Render: Forzamos el uso de las variables individuales para asegurar la conexión externa
    poolConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME, // Esto lo obliga a usar ProyectoEmprendimientos2026
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
} else {
    // En tu localhost: Configuración tradicional
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