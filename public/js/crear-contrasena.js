// Crear contraseña: página a la que lleva el enlace del correo que recibe el emprendedor aprobado
// (/crear-contrasena?codigo=...). Comprueba el enlace, pide la contraseña dos veces y la guarda.
const REGEX_CONTRASENA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&-])[A-Za-z\d@$!%*?&-]{12,}$/;

const codigo = new URLSearchParams(window.location.search).get('codigo') || '';
const estado = document.getElementById('estado-enlace');
const aviso = document.getElementById('aviso-enlace');
const formulario = document.getElementById('form-crear-contrasena');
const exito = document.getElementById('exito-contrasena');
const nueva = document.getElementById('password-nueva');
const repetida = document.getElementById('password-repetida');

const mostrarAviso = (texto) => {
    estado.hidden = true;
    aviso.textContent = texto;
    aviso.hidden = false;
};

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
