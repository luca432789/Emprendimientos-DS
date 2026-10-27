// IP de quien hace el pedido, para guardarla en la tabla Auditoria.
// - req.ip ya respeta la configuración 'trust proxy' de app.js (en Render toma la IP real
//   del visitante; en la PC local, la conexión directa, sin creer encabezados falsificables).
// - Se pasa a formato IPv4 cuando corresponde: '::1' -> '127.0.0.1' y
//   '::ffff:192.168.100.7' -> '192.168.100.7'.
export const obtenerIpCliente = (req) => {
    const ip = String(req.ip || req.socket?.remoteAddress || '').trim();
    if (!ip) return 'Desconocida';
    if (ip === '::1') return '127.0.0.1';
    return ip.replace(/^::ffff:/i, '').slice(0, 50); // DireccionIP es varchar(50)
};
