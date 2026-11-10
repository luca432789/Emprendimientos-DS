// Crea un Administrador (ficha de Empleado + cuenta de Usuario). Pensado para el primero de una instalación nueva:
// los demás empleados y usuarios se cargan después desde el panel, con ese Administrador.
//   npm run crear-admin                       (en la PC, con el .env apuntando a la base)
//   docker compose exec app npm run crear-admin   (con Docker)
// Pregunta los datos por la terminal; la contraseña no se muestra mientras se escribe.
import readline from 'node:readline';
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';

// Mismas reglas que el panel (empleadoController.js) y que la creación de contraseñas (cuentaController.js)
const REGEX_CONTRASEÑA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&-])[A-Za-z\d@$!%*?&-]{12,}$/;
const CAMPOS = [
    { clave: 'nombre', texto: 'Nombre', maximo: 30 },
    { clave: 'apellido', texto: 'Apellido', maximo: 30 },
    { clave: 'dni', texto: 'DNI', maximo: 15, regla: /^[A-Za-z0-9]+$/, error: 'solo letras y números, sin puntos' },
    { clave: 'domicilio', texto: 'Domicilio', maximo: 512 },
    { clave: 'telefono', texto: 'Teléfono', maximo: 25, regla: /^\d+$/, error: 'solo números' },
    { clave: 'correo', texto: 'Correo electrónico', maximo: 150, regla: /^\S+@\S+\.\S+$/, error: 'no es un correo válido' }
];

const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
const preguntar = (texto) => new Promise((resolver) => terminal.question(texto, (respuesta) => resolver(respuesta.trim())));

// Igual que preguntar, pero sin mostrar lo que se escribe
const preguntarOculto = (texto) => new Promise((resolver) => {
    const escribirOriginal = terminal._writeToOutput;
    terminal._writeToOutput = (cadena) => {
        if (cadena.includes(texto)) escribirOriginal.call(terminal, cadena);
    };
    terminal.question(texto, (respuesta) => {
        terminal._writeToOutput = escribirOriginal;
        process.stdout.write('\n');
        resolver(respuesta);
    });
});

const pedirCampo = async ({ texto, maximo, regla, error }) => {
    for (;;) {
        const valor = await preguntar(`${texto}: `);
        if (!valor) console.log(`  Complete el campo ${texto}.`);
        else if (valor.length > maximo) console.log(`  Admite hasta ${maximo} caracteres.`);
        else if (regla && !regla.test(valor)) console.log(`  ${texto}: ${error}.`);
        else return valor;
    }
};

const pedirContraseña = async () => {
    for (;;) {
        const contraseña = await preguntarOculto('Contraseña: ');
        if (!REGEX_CONTRASEÑA.test(contraseña)) {
            console.log('  Debe tener al menos 12 caracteres, con mayúsculas, minúsculas, números y uno de estos: @ $ ! % * ? & -');
            continue;
        }
        if (await preguntarOculto('Repetir la contraseña: ') === contraseña) return contraseña;
        console.log('  Las contraseñas no coinciden.');
    }
};

try {
    console.log('\nCrear un Administrador de "El Camino de los Emprendedores"\n');
    const [[{ administradores }]] = await pool.query(
        "SELECT COUNT(*) AS administradores FROM Usuario WHERE TipoUsuario = 'Administrador' AND Activa = 1;"
    );
    if (administradores > 0) {
        const seguir = await preguntar(`Ya hay ${administradores} Administrador(es) activo(s). Los demás se pueden crear desde el panel. ¿Crear otro igual? (s/n): `);
        if (!/^s/i.test(seguir)) throw new Error('Cancelado: no se creó ningún Administrador.');
    }

    const datos = {};
    for (const campo of CAMPOS) datos[campo.clave] = await pedirCampo(campo);
    datos.correo = datos.correo.toLowerCase();
    const contraseña = await pedirContraseña();

    const conexion = await pool.getConnection();
    try {
        await conexion.beginTransaction();
        // Para la auditoría: lo hizo la instalación, sin un usuario del sistema
        await conexion.query("SET @usuario_id = NULL, @usuario_ip = 'instalacion';");
        const [[repetido]] = await conexion.query(
            `SELECT (SELECT COUNT(*) FROM Empleado WHERE DNI = ? OR Correo = ?) + (SELECT COUNT(*) FROM Usuario WHERE Correo = ?) AS cantidad;`,
            [datos.dni, datos.correo, datos.correo]
        );
        if (repetido.cantidad > 0) throw new Error('Ya hay un empleado o usuario con ese DNI o correo.');
        const [empleado] = await conexion.query(
            `INSERT INTO Empleado (Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo, Activo)
             VALUES (?, ?, ?, ?, ?, ?, 'Administrador', true);`,
            [datos.nombre, datos.apellido, datos.dni, datos.domicilio, datos.telefono, datos.correo]
        );
        await conexion.query(
            `INSERT INTO Usuario (Correo, Contraseña, TipoUsuario, Activa, idEmprendedor, idEmpleado)
             VALUES (?, ?, 'Administrador', true, null, ?);`,
            [datos.correo, await bcrypt.hash(contraseña, 10), empleado.insertId]
        );
        await conexion.commit();
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
    console.log(`\nListo: ya puede iniciar sesión como Administrador con ${datos.correo}.\n`);
    process.exitCode = 0;
} catch (error) {
    console.error(`\n${error.message}\n`);
    process.exitCode = 1;
} finally {
    terminal.close();
    await pool.end();
}
