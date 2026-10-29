// Crear contraseña: página a la que lleva el enlace del correo que recibe el emprendedor aprobado
// (/crear-contrasena?codigo=...). Comprueba el enlace, pide la contraseña dos veces y la guarda.
// También la usa "Olvidé mi contraseña" (&motivo=recuperar): mismo enlace, solo cambian los textos.
const REGEX_CONTRASENA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&-])[A-Za-z\d@$!%*?&-]{12,}$/;

const parametros = new URLSearchParams(window.location.search);
const codigo = parametros.get('codigo') || '';
const esRecuperacion = parametros.get('motivo') === 'recuperar';
const estado = document.getElementById('estado-enlace');
const aviso = document.getElementById('aviso-enlace');
const formulario = document.getElementById('form-crear-contrasena');
const exito = document.getElementById('exito-contrasena');
const nueva = document.getElementById('password-nueva');
const repetida = document.getElementById('password-repetida');

// Enlace vencido o inválido: se ofrece pedir uno nuevo
const mostrarAviso = (texto) => {
    estado.hidden = true;
    aviso.textContent = `${texto} `;
    const pedirOtro = document.createElement('a');
    pedirOtro.href = '/olvide-contrasena';
    pedirOtro.textContent = 'Pedir un enlace nuevo';
    aviso.append(pedirOtro);
    aviso.hidden = false;
};

if (esRecuperacion) {
    document.title = 'Restablecer contraseña - Camino de los emprendedores';
    document.getElementById('titulo-contrasena').textContent = 'Restablecer contraseña';
    document.getElementById('texto-exito-accion').textContent = 'actualizada';
}

// El código no queda en la barra de direcciones (ni en el historial) una vez leído
history.replaceState(null, '', window.location.pathname);

const comprobarEnlace = async () => {
    if (!codigo) {
        mostrarAviso('El enlace está incompleto. Ábralo directamente desde el correo que recibió.');
        return;
    }
    try {
        const respuesta = await fetch(`/api/cuenta/enlace/${encodeURIComponent(codigo)}`);
        const datos = await respuesta.json();
        if (!respuesta.ok) {
            mostrarAviso(datos.error || 'El enlace no es válido.');
            return;
        }
        document.getElementById('dato-emprendimiento').textContent = datos.emprendimiento || '';
        // Las cuentas de empleados no tienen emprendimiento
        document.getElementById('fila-emprendimiento').hidden = !datos.emprendimiento;
        document.getElementById('dato-correo').textContent = datos.correo;
        estado.hidden = true;
        formulario.hidden = false;
        nueva.focus();
    } catch {
        mostrarAviso('No se pudo conectar con el servidor. Inténtelo de nuevo en unos minutos.');
    }
};

document.getElementById('mostrar-password').addEventListener('change', (evento) => {
    const tipo = evento.target.checked ? 'text' : 'password';
    nueva.type = tipo;
    repetida.type = tipo;
});

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    aviso.hidden = true;

    if (!REGEX_CONTRASENA.test(nueva.value)) {
        aviso.textContent = 'La contraseña debe tener al menos 12 caracteres e incluir mayúsculas, minúsculas, números y un carácter especial (@ $ ! % * ? & -).';
        aviso.hidden = false;
        nueva.focus();
        return;
    }
    if (nueva.value !== repetida.value) {
        aviso.textContent = 'Las dos contraseñas no coinciden.';
        aviso.hidden = false;
        repetida.focus();
        return;
    }

    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
        const respuesta = await fetch('/api/cuenta/crear-contrasena', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo, password: nueva.value })
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) {
            aviso.textContent = datos.error || 'No se pudo guardar la contraseña.';
            aviso.hidden = false;
            return;
        }
        formulario.hidden = true;
        exito.hidden = false;
    } catch {
        aviso.textContent = 'No se pudo conectar con el servidor. Inténtelo de nuevo.';
        aviso.hidden = false;
    } finally {
        boton.disabled = false;
    }
});

comprobarEnlace();
