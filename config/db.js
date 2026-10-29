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

// Ejecuta una escritura con quién la hizo (@usuario_id, null si es público) y desde qué IP
// (@usuario_ip), para que los triggers lo guarden en Auditoria. Usa una sola conexión:
// con pool.query cada consulta puede ir por otra conexión y el trigger tomaría los datos
// de otro pedido. Al terminar se limpian las variables antes de devolver la conexión.
export const consultaConAuditoria = async ({ idUsuario = null, ipCliente }, sql, parametros) => {
    const conexion = await pool.getConnection();
    try {
        await conexion.query('SET @usuario_id = ?, @usuario_ip = ?;', [idUsuario, ipCliente]);
        const [resultado] = await conexion.query(sql, parametros);
        return resultado;
    } finally {
        await conexion.query('SET @usuario_id = NULL, @usuario_ip = NULL;').catch(() => {});
        conexion.release();
    }
};