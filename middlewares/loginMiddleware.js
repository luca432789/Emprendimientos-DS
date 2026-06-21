// middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';

export const verificarToken = (req, res, next) => {
    // 1. Extraer el encabezado de autorización de la petición HTTP
    const authHeader = req.headers['authorization'];
    
    // El formato estándar es: "Bearer TOKEN_LARGUISIMO"
    // Hacemos un split por espacio y nos quedamos con la segunda parte (el token)
    const token = authHeader && authHeader.split(' ')[1];

    //console.log("✈️ HEADER RECIBIDO:", authHeader);
    //console.log("🔍 TOKEN RECORTADO:", token);
    
    // Si el usuario no mandó ningún token, lo rechazamos inmediatamente
    if (!token) {
        return res.status(401).json({ error: "Acceso denegado. No se proporcionó un token de seguridad." });
    }

    try {
        // 2. Verificar el token usando la clave secreta del .env
        // Si pasaron los 5 minutos fijados en el login, jwt.verify() arrojará un error automáticamente
        const tokenSecret = process.env.JWT_SECRET;
        const datosUsuarioDecodificados = jwt.verify(token, tokenSecret);

        // 3. Inyectar los datos del usuario dentro del objeto 'req' para que los controladores los usen
        req.usuarioLogueado = datosUsuarioDecodificados;

        // 4. Todo OK, el "policía" le cede el paso al siguiente controlador
        next(); 

    } catch (error) {
        console.error("Error al validar el JWT:", error.message);

        // Capturamos específicamente si el error es por vencimiento del tiempo ('TokenExpiredError')
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: "Su sesión ha expirado por inactividad de 5 minutos. Por favor, ingrese nuevamente." 
            });
        }

        // Cualquier otro error de manipulación del token (token falso o alterado)
        return res.status(403).json({ error: "Token de seguridad inválido o adulterado." });
    }
};