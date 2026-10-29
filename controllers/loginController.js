import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { 
    modelObtenerUsuarioPorCorreo, 
    modelVerificarPersonaFisica, 
    modelInsertarUsuarioWeb,
    modelRegistrarAuditoriaLogin,
    modelListarUsuariosAdministracion,
    modelContarUsuariosAdministracion,
    modelActualizarUsuarioAdministracion
} from '../models/loginModel.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';
import { usuarioDelTokenOpcional } from '../middlewares/loginMiddleware.js';

// La sesión dura JWT_EXPIRES_IN (10 minutos por defecto) y el navegador la renueva mientras
// la persona usa el sistema: así se cierra sola después de ese tiempo sin actividad.
const firmarToken = (usuario) => jwt.sign(
    { idUsuario: usuario.idUsuario, tipoUsuario: usuario.TipoUsuario, correo: usuario.Correo },
    process.env.JWT_SECRET || 'ClaveSeguridadPorDefecto123!',
    { expiresIn: process.env.JWT_EXPIRES_IN || '10m' }
);

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

        // 🔐 GENERACIÓN DEL TOKEN (JWT) con la clave secreta del archivo .env
        const token = firmarToken(usuarioBD);

        // Registrar rastro en la tabla auditoría mediante el modelo
        const ipCliente = obtenerIpCliente(req);
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


// POST /api/login/renovar: entrega un token nuevo mientras la sesión siga vigente y la
// cuenta siga activa (lo pide el navegador cuando hay actividad)
export const renovarSesion = async (req, res) => {
    try {
        const usuarioBD = await modelObtenerUsuarioPorCorreo(req.usuarioLogueado.correo);
        if (!usuarioBD || usuarioBD.idUsuario !== req.usuarioLogueado.idUsuario || !usuarioBD.Activa) {
            return res.status(401).json({ error: "Su sesión ha expirado. Por favor, ingrese nuevamente." });
        }
        res.json({ token: firmarToken(usuarioBD) });
    } catch (error) {
        console.error("Error al renovar la sesión:", error);
        res.status(500).json({ error: "No se pudo renovar la sesión." });
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

        if (tipoUsuario !== 'Emprendedor') {
            const cargosPermitidosPorRol = {
                'Empleado de Area': ['Técnico', 'Social'],
                'Empleado de Mesa': ['Mesa de Entrada'],
                'Administrador': ['Administrador']
            };
            const cargosPermitidos = cargosPermitidosPorRol[tipoUsuario];

            if (!cargosPermitidos?.includes(persona.Cargo)) {
                return res.status(400).json({
                    error: `El cargo ${persona.Cargo} no puede registrarse con el rol ${tipoUsuario}.`
                });
            }
        }

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
            // Quien lo crea desde el panel (administrador logueado) o null si se registró
            // desde la página pública; la IP se guarda siempre
            idUsuario: usuarioDelTokenOpcional(req)?.idUsuario ?? null,
            ipCliente: obtenerIpCliente(req)
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

export const listarUsuariosAdministracion = async (req, res) => {
    if (req.usuarioLogueado?.tipoUsuario !== 'Administrador') {
        return res.status(403).json({ error: 'Solo un administrador puede consultar el listado de usuarios.' });
    }

    const paginaSolicitada = Number(req.query.page ?? 1);
    const tiposPermitidos = ['Empleado de Mesa', 'Empleado de Area', 'Administrador', 'Emprendedor'];
    const { tipoUsuario, estado, buscar, orden } = req.query;
    const termino = typeof buscar === 'string' ? buscar.trim() : '';

    if (!Number.isInteger(paginaSolicitada) || paginaSolicitada < 1) {
        return res.status(400).json({ error: 'El número de página debe ser un entero positivo.' });
    }
    if (tipoUsuario && !tiposPermitidos.includes(tipoUsuario)) {
        return res.status(400).json({ error: 'El tipo de usuario seleccionado no es válido.' });
    }
    if (estado !== undefined && !['0', '1'].includes(estado)) {
        return res.status(400).json({ error: 'El estado de cuenta seleccionado no es válido.' });
    }
    if (orden !== undefined && !['asc', 'desc'].includes(orden)) {
        return res.status(400).json({ error: 'El orden por persona no es válido.' });
    }
    if (termino.length > 100) {
        return res.status(400).json({ error: 'La búsqueda no puede superar los 100 caracteres.' });
    }

    const filtros = {
        tipoUsuario: tipoUsuario || null,
        activa: estado === undefined ? null : Number(estado),
        buscar: termino || null,
        orden: orden || 'asc'
    };

    try {
        const registrosPorPagina = 10;
        const totalRegistros = await modelContarUsuariosAdministracion(filtros);
        const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);
        const pagina = totalPaginas === 0 ? 1 : Math.min(paginaSolicitada, totalPaginas);
        const offset = (pagina - 1) * registrosPorPagina;
        const usuarios = await modelListarUsuariosAdministracion(filtros, registrosPorPagina, offset);

        return res.status(200).json({
            usuarios,
            pagina,
            totalPaginas,
            totalRegistros,
            registrosPorPagina,
            orden: filtros.orden
        });
    } catch (error) {
        console.error('Error al listar usuarios para administración:', error);
        return res.status(500).json({ error: 'No se pudo obtener el listado de usuarios.' });
    }
};

export const actualizarUsuarioAdministracion = async (req, res) => {
    if (req.usuarioLogueado?.tipoUsuario !== 'Administrador') {
        return res.status(403).json({ error: 'Solo un administrador puede modificar cuentas de usuario.' });
    }

    const idUsuario = Number(req.params.id);
    if (!Number.isInteger(idUsuario) || idUsuario < 1) {
        return res.status(400).json({ error: 'El identificador del usuario no es válido.' });
    }

    const camposPermitidos = ['correo', 'tipoUsuario', 'cargo', 'activa', 'noticiero'];
    const camposRecibidos = Object.keys(req.body);
    if (camposRecibidos.some(campo => !camposPermitidos.includes(campo))) {
        return res.status(400).json({ error: 'La solicitud contiene campos no permitidos.' });
    }

    const camposDeAccion = camposRecibidos.filter(campo => campo !== 'cargo');
    if (camposDeAccion.length !== 1 || (camposRecibidos.includes('cargo') && !camposRecibidos.includes('tipoUsuario'))) {
        return res.status(400).json({ error: 'Envía una sola acción: correo, tipo de usuario, estado o permiso de noticiero.' });
    }

    const cambios = {};
    if (Object.hasOwn(req.body, 'correo')) {
        const correo = typeof req.body.correo === 'string' ? req.body.correo.trim() : '';
        if (correo.length > 150 || !/^\S+@\S+\.\S+$/.test(correo)) {
            return res.status(400).json({ error: 'Ingresa un correo válido de hasta 150 caracteres.' });
        }
        cambios.correo = correo;
    }

    if (Object.hasOwn(req.body, 'tipoUsuario')) {
        const tipoUsuario = req.body.tipoUsuario;
        const cargo = req.body.cargo;
        const cargosPorRol = {
            'Empleado de Mesa': ['Mesa de Entrada'],
            'Empleado de Area': ['Técnico', 'Social'],
            'Administrador': ['Administrador']
        };

        if (!Object.hasOwn(cargosPorRol, tipoUsuario) || !cargosPorRol[tipoUsuario].includes(cargo)) {
            return res.status(400).json({ error: 'El rol y el cargo de empleado seleccionados no son compatibles.' });
        }
        cambios.tipoUsuario = tipoUsuario;
        cambios.cargo = cargo;
    }

    if (Object.hasOwn(req.body, 'activa')) {
        if (req.body.activa !== 0 && req.body.activa !== 1) {
            return res.status(400).json({ error: 'El estado debe ser 1 (activa) o 0 (inactiva).' });
        }
        cambios.activa = req.body.activa;
    }

    if (Object.hasOwn(req.body, 'noticiero')) {
        if (req.body.noticiero !== 0 && req.body.noticiero !== 1) {
            return res.status(400).json({ error: 'El permiso de noticiero debe ser 1 (otorgado) o 0 (quitado).' });
        }
        cambios.noticiero = req.body.noticiero;
    }

    try {
        const resultado = await modelActualizarUsuarioAdministracion(idUsuario, cambios, {
            idUsuario: req.usuarioLogueado.idUsuario,
            ipCliente: obtenerIpCliente(req)
        });

        return res.status(200).json({
            mensaje: resultado.cambioRealizado ? 'Los datos del usuario se actualizaron correctamente.' : 'No había cambios para aplicar.'
        });
    } catch (error) {
        if (error.code === 'USER_NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        if (error.code === 'TYPE_CHANGE_REQUIRES_EMPLOYEE_RECORD' || error.code === 'NOTICIERO_NOT_ALLOWED') {
            return res.status(409).json({ error: error.message });
        }
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ese correo ya está asociado a otro registro.' });
        }

        console.error('Error al actualizar usuario desde administración:', error);
        return res.status(500).json({ error: 'No se pudieron actualizar los datos del usuario.' });
    }
};

