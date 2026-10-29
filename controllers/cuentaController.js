import bcrypt from 'bcrypt';
import {
    modelDatosCorreoActivacion,
    modelDatosRecuperacion,
    HORAS_VALIDEZ_RECUPERACION,
    modelCrearEnlaceContrasena,
    modelBuscarEnlaceVigente,
    modelUsarEnlaceContrasena
} from '../models/cuentaModel.js';
import { enviarCorreo } from '../helpers/correo.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';

// Mismas reglas que el registro de usuarios: 12 caracteres, mayúscula, minúscula, número y especial
const REGEX_CONTRASEÑA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&-])[A-Za-z\d@$!%*?&-]{12,}$/;
const ROLES_REENVIO = ['Empleado de Area', 'Administrador'];
const FALTA_TABLA = 'Falta ejecutar database/Activacion de cuenta.sql en la base de datos.';
const faltaTabla = (error) => error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'ER_TABLEACCESS_DENIED_ERROR';

const escaparHtml = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// Dirección del sitio para el enlace: APP_URL del .env (ej. la de Render) o la del pedido actual
const urlDelSitio = (req) => (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

// Crea el enlace y envía el correo "su emprendimiento fue aprobado, cree su contraseña".
// Nunca lanza error: la aprobación ya quedó guardada aunque el correo falle. Devuelve
// { enviado, correo, motivo } para avisar en el panel y ofrecer "Reenviar enlace".
export const enviarCorreoActivacion = async (req, idUsuarioEmprendedor) => {
    let datos = null;
    try {
        datos = await modelDatosCorreoActivacion(idUsuarioEmprendedor);
        if (!datos) return { enviado: false, motivo: 'No se encontró la cuenta del emprendedor.' };

        const codigo = await modelCrearEnlaceContrasena(idUsuarioEmprendedor, {
            idUsuario: req.usuarioLogueado?.idUsuario,
            ipCliente: obtenerIpCliente(req)
        });
        const enlace = `${urlDelSitio(req)}/crear-contrasena?codigo=${encodeURIComponent(codigo)}`;
        const nombre = `${datos.Nombre} ${datos.Apellido}`.trim();

        await enviarCorreo({
            para: datos.Correo,
            asunto: `Su emprendimiento "${datos.NombreEmprendimiento}" fue aprobado`,
            texto: [
                `Hola ${nombre}:`,
                '',
                `Le informamos que su emprendimiento "${datos.NombreEmprendimiento}" fue aprobado por el Ministerio de Desarrollo Social.`,
                'Ya tiene una cuenta de emprendedor en El Camino de los Emprendedores. Para activarla, cree su contraseña ingresando a este enlace:',
                '',
                enlace,
                '',
                'El enlace vence en 72 horas y sirve una sola vez. Su usuario es este correo electrónico.',
                'Si usted no presentó un Formulario de Inicio, ignore este mensaje.'
            ].join('\n'),
            html: `
                <div style="font-family:Arial,Helvetica,sans-serif; max-width:560px; margin:0 auto; color:#1f2933;">
                    <h2 style="color:#2f4e78; margin-bottom:4px;">¡Su emprendimiento fue aprobado!</h2>
                    <p style="color:#555; margin-top:0;">El Camino de los Emprendedores · Ministerio de Desarrollo Social</p>
                    <p>Hola ${escaparHtml(nombre)}:</p>
                    <p>Le informamos que su emprendimiento <strong>"${escaparHtml(datos.NombreEmprendimiento)}"</strong> fue aprobado.
                       Ya tiene una cuenta de emprendedor; para activarla, cree su contraseña:</p>
                    <p style="text-align:center; margin:28px 0;">
                        <a href="${escaparHtml(enlace)}" style="background:#2f4e78; color:#fff; padding:12px 26px; border-radius:30px; text-decoration:none; font-weight:bold;">Crear mi contraseña</a>
                    </p>
                    <p style="font-size:13px; color:#555;">Su usuario es este correo: <strong>${escaparHtml(datos.Correo)}</strong>.<br>
                       El enlace vence en 72 horas y sirve una sola vez. Si el botón no funciona, copie esta dirección en el navegador:<br>
                       <span style="word-break:break-all;">${escaparHtml(enlace)}</span></p>
                    <p style="font-size:12px; color:#888;">Si usted no presentó un Formulario de Inicio, ignore este mensaje.</p>
                </div>`
        });
        return { enviado: true, correo: datos.Correo };
    } catch (error) {
        console.error('No se pudo enviar el correo de activación:', error.message);
        return {
            enviado: false,
            correo: datos?.Correo,
            motivo: error.code === 'CORREO_NO_CONFIGURADO'
                ? 'El envío de correos no está configurado en el servidor.'
                : faltaTabla(error) ? FALTA_TABLA : 'El servidor de correo no aceptó el envío.'
        };
    }
};

// Texto para agregar al mensaje de aprobación del panel
export const textoResultadoCorreo = (resultado) => resultado.enviado
    ? ` Se envió un correo a ${resultado.correo} para que el emprendedor cree su contraseña.`
    : ` ATENCIÓN: no se pudo enviar el correo para crear la contraseña (${resultado.motivo}) Puede reenviarlo más tarde.`;

// ---------- "Olvidé mi contraseña" ----------

// Límites para que no se use la página para llenar de correos a alguien ni para probar correos:
// por IP, 5 pedidos cada 15 minutos; por cuenta, un correo cada 2 minutos.
const PEDIDOS_POR_IP = 5;
const VENTANA_IP_MS = 15 * 60 * 1000;
const ESPERA_POR_CUENTA_MS = 2 * 60 * 1000;
const pedidosPorIp = new Map();      // ip -> [fechas de los pedidos]
const ultimoEnvioPorCuenta = new Map(); // correo -> fecha del último correo enviado

const RESPUESTA_RECUPERACION = 'Si el correo corresponde a una cuenta activa, en unos minutos le llegará un enlace para restablecer la contraseña. Revise también la carpeta de spam.';

const superaLimiteIp = (ip) => {
    const ahora = Date.now();
    const recientes = (pedidosPorIp.get(ip) || []).filter((fecha) => ahora - fecha < VENTANA_IP_MS);
    if (recientes.length >= PEDIDOS_POR_IP) return true;
    recientes.push(ahora);
    pedidosPorIp.set(ip, recientes);
    // Limpieza ocasional para que los mapas no crezcan sin fin
    if (pedidosPorIp.size > 5000) pedidosPorIp.clear();
    if (ultimoEnvioPorCuenta.size > 5000) ultimoEnvioPorCuenta.clear();
    return false;
};

// Busca la cuenta y envía el correo. Se ejecuta después de responder: así la respuesta tarda
// lo mismo exista o no la cuenta, y no se puede averiguar qué correos están registrados.
const enviarCorreoRecuperacion = async ({ correo, sitio, ipCliente }) => {
    const datos = await modelDatosRecuperacion(correo);
    if (!datos) return;

    const clave = datos.Correo.toLowerCase();
    if (Date.now() - (ultimoEnvioPorCuenta.get(clave) || 0) < ESPERA_POR_CUENTA_MS) return;
    ultimoEnvioPorCuenta.set(clave, Date.now());

    const codigo = await modelCrearEnlaceContrasena(datos.idUsuario, { idUsuario: null, ipCliente }, { recuperacion: true });
    const enlace = `${sitio}/crear-contrasena?codigo=${encodeURIComponent(codigo)}&motivo=recuperar`;
    const nombre = `${datos.Nombre || ''} ${datos.Apellido || ''}`.trim();
    const vence = HORAS_VALIDEZ_RECUPERACION === 1 ? '1 hora' : `${HORAS_VALIDEZ_RECUPERACION} horas`;

    await enviarCorreo({
        para: datos.Correo,
        asunto: 'Restablecer su contraseña - El Camino de los Emprendedores',
        texto: [
            `Hola${nombre ? ` ${nombre}` : ''}:`,
            '',
            'Recibimos un pedido para restablecer la contraseña de su cuenta en El Camino de los Emprendedores.',
            'Para elegir una contraseña nueva, ingrese a este enlace:',
            '',
            enlace,
            '',
            `El enlace vence en ${vence} y sirve una sola vez. Su usuario es este correo electrónico.`,
            'Si usted no pidió restablecer la contraseña, ignore este mensaje: su contraseña actual sigue funcionando.'
        ].join('\n'),
        html: `
            <div style="font-family:Arial,Helvetica,sans-serif; max-width:560px; margin:0 auto; color:#1f2933;">
                <h2 style="color:#2f4e78; margin-bottom:4px;">Restablecer contraseña</h2>
                <p style="color:#555; margin-top:0;">El Camino de los Emprendedores · Ministerio de Desarrollo Social</p>
                <p>Hola${nombre ? ` ${escaparHtml(nombre)}` : ''}:</p>
                <p>Recibimos un pedido para restablecer la contraseña de su cuenta. Para elegir una contraseña nueva:</p>
                <p style="text-align:center; margin:28px 0;">
                    <a href="${escaparHtml(enlace)}" style="background:#2f4e78; color:#fff; padding:12px 26px; border-radius:30px; text-decoration:none; font-weight:bold;">Elegir contraseña nueva</a>
                </p>
                <p style="font-size:13px; color:#555;">Su usuario es este correo: <strong>${escaparHtml(datos.Correo)}</strong>.<br>
                   El enlace vence en ${vence} y sirve una sola vez. Si el botón no funciona, copie esta dirección en el navegador:<br>
                   <span style="word-break:break-all;">${escaparHtml(enlace)}</span></p>
                <p style="font-size:12px; color:#888;">Si usted no pidió restablecer la contraseña, ignore este mensaje: su contraseña actual sigue funcionando.</p>
            </div>`
    });
};

// POST /api/cuenta/olvide-contrasena  body: { correo }  (público, sin sesión)
export const solicitarRecuperacionContrasena = async (req, res) => {
    const correo = typeof req.body.correo === 'string' ? req.body.correo.trim() : '';
    if (!correo || correo.length > 150 || !/^\S+@\S+\.\S+$/.test(correo)) {
        return res.status(400).json({ error: 'Ingrese un correo electrónico válido.' });
    }
    const ipCliente = obtenerIpCliente(req);
    if (superaLimiteIp(ipCliente)) {
        return res.status(429).json({ error: 'Hizo demasiados pedidos seguidos. Espere unos minutos e inténtelo de nuevo.' });
    }

    res.json({ mensaje: RESPUESTA_RECUPERACION });

    enviarCorreoRecuperacion({ correo, sitio: urlDelSitio(req), ipCliente }).catch((error) => {
        console.error('No se pudo enviar el correo para restablecer la contraseña:', error.code === 'CORREO_NO_CONFIGURADO' || faltaTabla(error) ? error.message : error);
    });
};

// GET /api/cuenta/enlace/:codigo -> la página "Crear contraseña" comprueba que el enlace sirva
export const verificarEnlaceContrasena = async (req, res) => {
    try {
        const enlace = await modelBuscarEnlaceVigente(req.params.codigo);
        if (!enlace) {
            return res.status(410).json({ error: 'El enlace no es válido, ya fue usado o venció. Puede pedir uno nuevo desde "¿Olvidó su contraseña?" en Iniciar sesión.' });
        }
        res.json({ correo: enlace.Correo, emprendimiento: enlace.NombreEmprendimiento });
    } catch (error) {
        if (faltaTabla(error)) return res.status(503).json({ error: FALTA_TABLA });
        console.error('Error al verificar el enlace de contraseña:', error);
        res.status(500).json({ error: 'No se pudo verificar el enlace.' });
    }
};

// POST /api/cuenta/crear-contrasena  body: { codigo, password }
export const crearContrasena = async (req, res) => {
    const { codigo, password } = req.body;
    if (typeof codigo !== 'string' || !codigo || typeof password !== 'string') {
        return res.status(400).json({ error: 'Faltan datos para crear la contraseña.' });
    }
    if (!REGEX_CONTRASEÑA.test(password)) {
        return res.status(400).json({
            error: 'La contraseña debe tener al menos 12 caracteres e incluir mayúsculas, minúsculas, números y un carácter especial (@$!%*?&-).'
        });
    }

    try {
        const idUsuario = await modelUsarEnlaceContrasena(codigo, await bcrypt.hash(password, 10), obtenerIpCliente(req));
        if (!idUsuario) {
            return res.status(410).json({ error: 'El enlace no es válido, ya fue usado o venció. Puede pedir uno nuevo desde "¿Olvidó su contraseña?" en Iniciar sesión.' });
        }
        res.json({ mensaje: 'Su contraseña fue creada. Ya puede iniciar sesión con su correo y la contraseña nueva.' });
    } catch (error) {
        if (faltaTabla(error)) return res.status(503).json({ error: FALTA_TABLA });
        console.error('Error al crear la contraseña:', error);
        res.status(500).json({ error: 'No se pudo guardar la contraseña.' });
    }
};

// POST /api/cuenta/reenviar-enlace/:idUsuario (Área / Administrador) -> vuelve a mandar el correo
export const reenviarEnlaceContrasena = async (req, res) => {
    if (!ROLES_REENVIO.includes(req.usuarioLogueado.tipoUsuario)) {
        return res.status(403).json({ error: 'Solo el Empleado de Área o el Administrador pueden reenviar el enlace.' });
    }
    const idUsuario = Number(req.params.idUsuario);
    if (!Number.isInteger(idUsuario) || idUsuario < 1) {
        return res.status(400).json({ error: 'El usuario indicado no es válido.' });
    }
    if (!(await modelDatosCorreoActivacion(idUsuario))) {
        return res.status(404).json({ error: 'El usuario no es una cuenta de emprendedor.' });
    }

    const resultado = await enviarCorreoActivacion(req, idUsuario);
    if (!resultado.enviado) return res.status(502).json({ error: `No se pudo enviar el correo: ${resultado.motivo}` });
    res.json({ mensaje: `Se envió el enlace para crear la contraseña a ${resultado.correo}.` });
};
