// =========================================================
// paginador.js - Flechas y número de página para las páginas públicas (Noticias y Publicaciones).
// Funciona como el de Auditoría: tocando el número se puede escribir a qué página ir (Enter).
// Uso: const paginador = crearPaginador(elemento, { alCambiar: (pagina) => {...}, singular: 'noticia', plural: 'noticias' });
//      paginador.actualizar({ pagina, totalPaginas, totalRegistros });  paginador.cargando();
// =========================================================

function crearPaginador(contenedor, { alCambiar, singular = 'registro', plural = 'registros' }) {
    contenedor.classList.add('paginador');
    contenedor.innerHTML = `
        <button type="button" class="paginador-flecha" aria-label="Página anterior" title="Página anterior"><i class="fa-solid fa-chevron-left"></i></button>
        <span class="paginador-indicador" role="status" aria-live="polite"></span>
        <button type="button" class="paginador-flecha" aria-label="Página siguiente" title="Página siguiente"><i class="fa-solid fa-chevron-right"></i></button>`;
    const [anterior, siguiente] = contenedor.querySelectorAll('.paginador-flecha');
    const indicador = contenedor.querySelector('.paginador-indicador');
    let estado = { pagina: 1, totalPaginas: 0, totalRegistros: 0 };
    let ocupado = false;

    const ir = (pagina) => {
        if (ocupado || pagina < 1 || pagina > estado.totalPaginas || pagina === estado.pagina) return pintar();
        alCambiar(pagina);
    };

    function pintar() {
        const { pagina, totalPaginas, totalRegistros } = estado;
        // Con una sola página no hace falta mostrarlo
        contenedor.hidden = totalPaginas <= 1;
        indicador.innerHTML = `Página <button type="button" class="paginador-numero" title="Tocá para escribir una página">${pagina}</button> de ${totalPaginas}
            <span class="paginador-total">· ${totalRegistros} ${totalRegistros === 1 ? singular : plural}</span>`;
        anterior.disabled = ocupado || pagina <= 1;
        siguiente.disabled = ocupado || pagina >= totalPaginas;
    }

    anterior.addEventListener('click', () => ir(estado.pagina - 1));
    siguiente.addEventListener('click', () => ir(estado.pagina + 1));
    indicador.addEventListener('click', (evento) => {
        const boton = evento.target.closest('.paginador-numero');
        if (!boton || ocupado) return;
        const entrada = document.createElement('input');
        entrada.type = 'number';
        entrada.min = '1';
        entrada.max = String(estado.totalPaginas);
        entrada.value = String(estado.pagina);
        entrada.className = 'paginador-entrada';
        entrada.setAttribute('aria-label', 'Número de página; presioná Enter para ir');
        entrada.addEventListener('keydown', (tecla) => {
            if (tecla.key === 'Enter') {
                tecla.preventDefault();
                ir(Number(entrada.value));
            } else if (tecla.key === 'Escape') {
                pintar();
            }
        });
        entrada.addEventListener('blur', () => { if (entrada.isConnected) pintar(); });
        boton.replaceWith(entrada);
        entrada.focus();
        entrada.select();
    });

    return {
        actualizar(nuevoEstado) {
            estado = nuevoEstado;
            ocupado = false;
            pintar();
        },
        cargando() {
            ocupado = true;
            anterior.disabled = true;
            siguiente.disabled = true;
        }
    };
}
