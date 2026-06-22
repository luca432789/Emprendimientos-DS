// config/db.js
import mysql from 'mysql2';
import 'dotenv/config'

let poolConfig;

// 1. Render define automáticamente la variable RENDER=true en su plataforma.
if (process.env.RENDER) {
    // Si estamos en la nube, usa las variables configuradas en el panel de Render
    poolConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME, // ProyectoEmprendimientos2026
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
} else {
    // 2. Si estás en tu computadora (Localhost), usa estrictamente tu .env local
    poolConfig = {
        host: process.env.DB_HOST,      
        user: process.env.DB_USER,      
        password: process.env.DB_PASS, 
        database: process.env.DB_NAME,  
        port: 3306,                     // Puerto local de tu MySQL
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
}

export const pool = mysql.createPool(poolConfig).promise();