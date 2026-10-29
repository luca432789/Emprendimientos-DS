// Formularios de Subsidio y Crédito: solo los ven el Empleado de Área y el Administrador,
// que los cargan a nombre de un emprendimiento. (El servidor también lo controla al enviar.)
// - [data-solo-area]: se muestra solo a esos roles (empiezan con style="display:none")
// - [data-sin-acceso]: se muestra a todos los demás (aviso de que no tienen acceso)
const ROLES_FORMULARIOS_AYUDA = ['Empleado de Area', 'Administrador'];

const puedeCargarAyudas = (() => {
    try {
        const token = sessionStorage.getItem('token_ministerio');
        return Boolean(token) && ROLES_FORMULARIOS_AYUDA.includes(window.jwtDecode(token).tipoUsuario);
    } catch {
        return false;
    }
})();

document.querySelectorAll('[data-solo-area]').forEach((elemento) => {
    elemento.style.display = puedeCargarAyudas ? '' : 'none';
});
document.querySelectorAll('[data-sin-acceso]').forEach((elemento) => {
    elemento.style.display = puedeCargarAyudas ? 'none' : '';
});
