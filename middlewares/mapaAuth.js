// middlewares/mapaAuth.js
// Se usa DESPUÉS de verificarToken (authMiddleware.js), que ya validó el JWT
// y dejó los datos en req.usuarioLogueado. Acá solo se controla el rol.

// Solo Empleado de Area y Administrador pueden ubicar/editar (Empleado de Mesa NO).
// Mantenelo igual que ROLES_EDITORES en public/js/mapa.js
const ROLES_EDITORES = ['Empleado de Area', 'Administrador'];

export const soloEditoresMapa = (req, res, next) => {
    const rol = req.usuarioLogueado?.tipoUsuario;

    if (!ROLES_EDITORES.includes(rol)) {
        const msg = 'Tu rol no tiene permiso para ubicar emprendimientos.';
        return res.status(403).json({ error: msg, mensaje: msg });
    }

    next();
};