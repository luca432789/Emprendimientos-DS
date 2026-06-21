import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { 
    modelObtenerUsuarioPorCorreo, 
    modelVerificarPersonaFisica, 
    modelInsertarUsuarioWeb,
    modelRegistrarAuditoriaLogin
} from '../models/loginModel.js';

// CONTROLADOR DE LOG IN
export const loginUsuario = async (req, res) => {
    try {
        const { correo, password } = req.body;

        if (!correo || !password) {
            return res.status(400).json({ error: "Por favor, complete todos los campos" });
        }

        const usuarioBD = await modelObtenerUsuarioPorCorreo(correo);

        if (!usuarioBD) {
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }
        // Verificamos si el usuario está activo en el sistema
        if (!usuarioBD.Activa) {
            return res.status(403).json({ error: "Este usuario se encuentra inhabilitado para ingresar al sistema." });
        }
       
        const contraseñaCorrecta = await bcrypt.compare(password, usuarioBD.Contraseña);
        if (!contraseñaCorrecta) {
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }

        // 🔐 GENERACIÓN DEL TOKEN (JWT) 
        // Usamos la clave secreta guardada en el archivo .env externo
        const tokenSecret = process.env.JWT_SECRET || 'ClaveSeguridadPorDefecto123!';
        
        const payload = {
            idUsuario: usuarioBD.idUsuario,
            tipoUsuario: usuarioBD.TipoUsuario,
            correo: usuarioBD.Correo
        };

        // Ponemos la caducidad exacta por inactividad/tiempo: 5 minutos
        const token = jwt.sign(payload, tokenSecret, { expiresIn: '5m' });

        // Registrar rastro en la tabla auditoría mediante el modelo
        const ipCliente = req.ip || '127.0.0.1';
        await modelRegistrarAuditoriaLogin(usuarioBD.idUsuario, ipCliente);
        
        res.json({
            mensaje: "¡Inicio de sesión exitoso!",
            token: token,
            tipoUsuario: usuarioBD.TipoUsuario
        });

    } catch (error) {
        console.error("Error en el proceso de Login:", error);
        res.status(500).json({ error: "Error interno del servidor al procesar el ingreso" });
    }
};


// CONTROLADOR DE REGISTRO DE USUARIO
export const registrarUsuario = async (req, res) => {
    try {
        const { correo, password, tipoUsuario } = req.body;

        // 1. Validaciones básicas de campos vacíos
        if (!correo || !password || !tipoUsuario) {
            return res.status(400).json({ error: "Por favor, complete todos los campos obligatorios." });
        }

        // 2. VALIDACIÓN DE SEGURIDAD DE CONTRASEÑA
        const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&-])[A-Za-z\d@$!%*?&-]{12,}$/;
        if (!regexPassword.test(password)) {
            return res.status(400).json({ 
                error: "La contraseña es demasiado débil. Debe tener al menos 12 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales." 
            });
        }

        // 3. Determinar en qué tabla buscar según el tipo de selección
        let tablaBusqueda = '';
        let columnaId = '';
        if (tipoUsuario === 'Emprendedor') {
            tablaBusqueda = 'emprendedor';
            columnaId = 'idemprendedor'; // Ajustá el nombre exacto de la PK de tu tabla Emprendedor
        } else if (['Empleado de Mesa', 'Empleado de Area', 'Administrador'].includes(tipoUsuario)) {
            tablaBusqueda = 'empleado';
            columnaId = 'idempleado'; // Ajustá el nombre exacto de la PK de tu tabla Empleado
        } else {
            return res.status(400).json({ error: "Tipo de usuario no válido." });
        }

        // 4. 🚀 LLAMADA AL MODELO: Verificar si la persona existe físicamente cargada
        const persona = await modelVerificarPersonaFisica(tablaBusqueda, columnaId, correo);
        if (!persona) {
            return res.status(404).json({ 
                error: `No se encontró ningún registro de ${tipoUsuario} con el correo electrónico proporcionado.` 
            });
        }

        const idPersonaFisica = persona[columnaId];

        // 5. 🚀 LLAMADA AL MODELO: Evitar que el correo tenga dos usuarios web duplicados
        const usuarioExistente = await modelObtenerUsuarioPorCorreo(correo);
        if (usuarioExistente) {
            return res.status(400).json({ error: "Este correo electrónico ya tiene un usuario web registrado." });
        }

        // 6. ENCRIPTACIÓN: Convertimos la contraseña en un Hash indescifrable
        // El número 10 es el "saltRounds" (costo de procesamiento del algoritmo)
        const passwordEncriptada = await bcrypt.hash(password, 10);

        // 7. Preparar las claves foráneas (una será el ID y la otra se mantendrá NULL)
        const idEmprendedorFK = (tipoUsuario === 'Emprendedor') ? idPersonaFisica : null;
        const idEmpleadoFK = (tipoUsuario !== 'Emprendedor') ? idPersonaFisica : null;

        // 8. 🚀 LLAMADA AL MODELO: Mandamos a persistir el registro en MySQL
        const datosNuevoUsuario = {
            correo,
            passwordEncriptada,
            tipoUsuario,
            idEmprendedorFK,
            idEmpleadoFK
        };

        const datosAuditoria = {
            idAuditor: 1, // ID por defecto de administrador que realiza la acción en pruebas
            ipCliente: req.ip || '127.0.0.1'
        };

        await modelInsertarUsuarioWeb(datosNuevoUsuario, datosAuditoria);

        // 9. Respuesta exitosa para el Frontend
        return res.status(201).json({ 
            mensaje: `¡Usuario de tipo ${tipoUsuario} registrado exitosamente!` 
        });

    } catch (error) {
        console.error("Error en el controlador de registro:", error);
        return res.status(500).json({ error: "Error interno del servidor al procesar el registro." });
    }
};

