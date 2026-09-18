// middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';

export const verificarToken = (req, res, next) => {
    const token = req.cookies?.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

    if (!token) {
        return res.status(401).json({ error: "Acceso denegado. No se proporcionó un token de seguridad." });
    }

    try {
        const tokenSecret = process.env.JWT_SECRET || 'ClaveSeguridadPorDefecto123!';
        const datosUsuarioDecodificados = jwt.verify(token, tokenSecret);

        req.usuarioLogueado = datosUsuarioDecodificados;
        next();

    } catch (error) {
        console.error("Error al validar el JWT:", error.message);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: "Su sesión ha expirado por inactividad de 5 minutos. Por favor, ingrese nuevamente." 
            });
        }

        return res.status(403).json({ error: "Token de seguridad inválido o adulterado." });
    }
};

export const permitirRoles = (...rolesPermitidos) => {
    return (req, res, next) => {
        const rolUsuario = req.usuarioLogueado?.tipoUsuario;

        if (!rolesPermitidos.includes(rolUsuario)) {
            return res.status(403).json({
                error: 'No tiene permisos para realizar esta acción.'
            });
        }

        next();
    };
};