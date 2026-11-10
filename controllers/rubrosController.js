import fs from 'fs/promises';
import path from 'path';
import {
    modelListarNombresRubros,
    modelListarRubros,
    modelCrearRubro,
    modelEditarRubro
} from '../models/rubrosModel.js';
import { validarImagenes, rutaFisica, ErrorImagen } from '../helpers/imagenes.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';

// Administración de Rubros: Empleado de Área y Administrador
const ROLES_AREA = ['Empleado de Area', 'Administrador'];
const CARPETA_ICONOS = '/uploads/IconoMapa';
const RUBROS_POR_PAGINA = 10;

const puedeAdministrar = (req, res) => {
    if (ROLES_AREA.includes(req.usuarioLogueado?.tipoUsuario)) return true;
    res.status(403).json({ error: 'Solo empleados del Área y administradores pueden administrar los rubros.' });
    return false;
};

const auditoriaDe = (req) => ({ idUsuario: req.usuarioLogueado.idUsuario, ipCliente: obtenerIpCliente(req) });

class ErrorRubro extends Error {}

// Nombre: sin espacios de más, de 2 a 50 caracteres (Rubro.Nombre es varchar(50) y único)
const validarNombre = (valor) => {
    const nombre = String(valor ?? '').replace(/\s+/g, ' ').trim();
    if (nombre.length < 2 || nombre.length > 50) throw new ErrorRubro('El nombre del rubro debe tener de 2 a 50 caracteres.');
    return nombre;
};

// Icono opcional: imagen JPG, PNG o WEBP en base64 (la página la achica antes de enviarla)
const validarIcono = (icono) => {
    if (icono === undefined || icono === null || icono === '') return null;
    return validarImagenes([icono], 1)[0];
};

// Se guarda como /uploads/IconoMapa/rubro-<id>-<fecha>.<ext> (la fecha evita que el navegador muestre el anterior)
const guardarIcono = async (idRubro, imagen) => {
    const nombre = `rubro-${idRubro}-${Date.now()}.${imagen.extension}`;
    await fs.mkdir(rutaFisica(CARPETA_ICONOS), { recursive: true });
    await fs.writeFile(path.join(rutaFisica(CARPETA_ICONOS), nombre), imagen.bytes);
    return `${CARPETA_ICONOS}/${nombre}`;
};

// Solo se borran los iconos subidos desde esta pantalla (los de los datos iniciales, como Bombo.png, quedan)
const borrarIcono = async (rutaWeb) => {
    if (!rutaWeb || !rutaWeb.startsWith(`${CARPETA_ICONOS}/rubro-`)) return;
    await fs.unlink(rutaFisica(rutaWeb)).catch(() => {});
};

const responderError = (res, error, mensajeGeneral) => {
    if (error instanceof ErrorRubro || error instanceof ErrorImagen) return res.status(400).json({ error: error.message });
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un rubro con ese nombre.' });
    console.error(mensajeGeneral, error);
    return res.status(500).json({ error: mensajeGeneral });
};

// GET /api/rubros (público): nombres para sugerir en el Formulario de Inicio
export const listarNombresRubros = async (req, res) => {
    try {
        res.json(await modelListarNombresRubros());
    } catch (error) {
        responderError(res, error, 'No se pudieron cargar los rubros.');
    }
};

// GET /api/rubros/admin?page=1 -> de a 10, por nombre
export const listarRubros = async (req, res) => {
    if (!puedeAdministrar(req, res)) return;
    const pagina = Number(req.query.page ?? 1);
    if (!Number.isInteger(pagina) || pagina < 1) return res.status(400).json({ error: 'Número de página inválido.' });
    try {
        res.json(await modelListarRubros(pagina, RUBROS_POR_PAGINA));
    } catch (error) {
        responderError(res, error, 'No se pudieron cargar los rubros.');
    }
};

// POST /api/rubros  { nombre, icono? }
export const crearRubro = async (req, res) => {
    if (!puedeAdministrar(req, res)) return;
    let iconoGuardado = '';
    try {
        const nombre = validarNombre(req.body?.nombre);
        const icono = validarIcono(req.body?.icono);
        const rubro = await modelCrearRubro(nombre, async (idRubro) => {
            iconoGuardado = icono ? await guardarIcono(idRubro, icono) : '';
            return iconoGuardado;
        }, auditoriaDe(req));
        res.status(201).json({ mensaje: `Se agregó el rubro "${rubro.Nombre}".`, rubro });
    } catch (error) {
        await borrarIcono(iconoGuardado); // si la base falló, no queda el archivo suelto
        responderError(res, error, 'No se pudo agregar el rubro.');
    }
};

// PUT /api/rubros/:id  { nombre, icono?, quitarIcono? }
export const editarRubro = async (req, res) => {
    if (!puedeAdministrar(req, res)) return;
    const idRubro = Number(req.params.id);
    if (!Number.isInteger(idRubro) || idRubro < 1) return res.status(400).json({ error: 'Rubro inválido.' });
    let iconoGuardado = '';
    try {
        const nombre = validarNombre(req.body?.nombre);
        const icono = validarIcono(req.body?.icono);
        if (icono) iconoGuardado = await guardarIcono(idRubro, icono);
        const nuevoIcono = icono ? iconoGuardado : (req.body?.quitarIcono ? '' : undefined);
        const resultado = await modelEditarRubro(idRubro, nombre, nuevoIcono, auditoriaDe(req));
        if (!resultado) {
            await borrarIcono(iconoGuardado);
            return res.status(404).json({ error: 'El rubro no existe.' });
        }
        if (resultado.anterior.IconoMapa !== resultado.actual.IconoMapa) await borrarIcono(resultado.anterior.IconoMapa);
        res.json({ mensaje: `Se guardaron los cambios del rubro "${resultado.actual.Nombre}".`, rubro: resultado.actual });
    } catch (error) {
        await borrarIcono(iconoGuardado);
        responderError(res, error, 'No se pudieron guardar los cambios del rubro.');
    }
};
