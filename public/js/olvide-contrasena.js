// Olvidé mi contraseña (/olvide-contrasena): pide el correo y el servidor envía un enlace a la página
// "Crear contraseña" (/crear-contrasena?codigo=...&motivo=recuperar) para elegir una nueva.
// El servidor responde lo mismo exista o no la cuenta, así no se puede averiguar qué correos están registrados.
const formulario = document.getElementById('form-olvide-contrasena');
const campoCorreo = document.getElementById('correo-recuperacion');
const aviso = document.getElementById('aviso-olvide');
const exito = document.getElementById('exito-olvide');

const mostrarAviso = (texto) => {
    aviso.textContent = texto;
    aviso.hidden = false;
};

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    aviso.hidden = true;

    const correo = campoCorreo.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(correo)) {
        mostrarAviso('Ingrese un correo electrónico válido.');
        campoCorreo.focus();
        return;
    }

    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
        const respuesta = await fetch('/api/cuenta/olvide-contrasena', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo })
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) {
            mostrarAviso(datos.error || 'No se pudo enviar el pedido.');
            return;
        }
        formulario.hidden = true;
        exito.innerHTML = '';
        exito.append(datos.mensaje, document.createElement('br'), document.createElement('br'));
        const volver = document.createElement('a');
        volver.href = '/login';
        volver.textContent = 'Volver a iniciar sesión';
        exito.append(volver);
        exito.hidden = false;
    } catch {
        mostrarAviso('No se pudo conectar con el servidor. Inténtelo de nuevo en unos minutos.');
    } finally {
        boton.disabled = false;
    }
});

campoCorreo.focus();
