// =========================================================
// ampliar-imagen.js - Visor de imágenes ampliadas (publicaciones, productos, fotos y noticias)
// Cualquier elemento con el atributo data-ampliar (un <a href="imagen"> o un <img>) abre la imagen
// grande sobre la página. Se cierra con un clic en la imagen o fuera de ella, o con Escape.
// Ctrl+clic / clic del medio siguen abriendo la imagen en otra pestaña como antes.
// data-ampliar="/ruta/imagen.jpg" permite indicar otra ruta; vacío usa el href o el src.
// =========================================================

(() => {
    const ESTILOS = `
        [data-ampliar] { cursor: zoom-in; }
        .visor-imagen {
            position: fixed; inset: 0; z-index: 5000;
            display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10px;
            padding: 16px; background: rgba(15, 23, 42, 0.85);
            cursor: zoom-out; opacity: 0; transition: opacity 0.18s ease;
        }
        .visor-imagen.abierto { opacity: 1; }
        .visor-imagen img {
            max-width: min(94vw, 1600px); max-height: calc(100vh - 70px);
            object-fit: contain; border-radius: 6px; background: #fff;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            transform: scale(0.96); transition: transform 0.18s ease;
        }
        .visor-imagen.abierto img { transform: scale(1); }
        .visor-imagen-ayuda { color: #e2e8f0; font-size: 13px; text-align: center; }
        .visor-imagen-cerrar {
            position: absolute; top: 12px; right: 12px; width: 40px; height: 40px;
            border: none; border-radius: 50%; background: rgba(255, 255, 255, 0.15);
            color: #fff; font-size: 22px; line-height: 40px; cursor: pointer;
        }
        .visor-imagen-cerrar:hover, .visor-imagen-cerrar:focus-visible { background: rgba(255, 255, 255, 0.3); }
        @media (prefers-reduced-motion: reduce) {
            .visor-imagen, .visor-imagen img { transition: none; }
        }`;

    let visor = null;
    let elementoAnterior = null; // para devolver el foco al cerrar
    let overflowAnterior = '';

    function cerrar() {
        if (!visor) return;
        const actual = visor;
        visor = null;
        actual.classList.remove('abierto');
        document.documentElement.style.overflow = overflowAnterior;
        document.removeEventListener('keydown', alPresionarTecla);
        setTimeout(() => actual.remove(), 180);
        elementoAnterior?.focus?.({ preventScroll: true });
    }

    function alPresionarTecla(evento) {
        if (evento.key === 'Escape') cerrar();
    }

    function abrir(url, descripcion) {
        cerrar();
        elementoAnterior = document.activeElement;
        overflowAnterior = document.documentElement.style.overflow;

        visor = document.createElement('div');
        visor.className = 'visor-imagen';
        visor.setAttribute('role', 'dialog');
        visor.setAttribute('aria-modal', 'true');
        visor.setAttribute('aria-label', descripcion || 'Imagen ampliada');

        const imagen = document.createElement('img');
        imagen.src = url;
        imagen.alt = descripcion || 'Imagen ampliada';

        const ayuda = document.createElement('p');
        ayuda.className = 'visor-imagen-ayuda';
        ayuda.textContent = 'Hacé clic en cualquier lugar o presioná Esc para cerrar';

        const botonCerrar = document.createElement('button');
        botonCerrar.type = 'button';
        botonCerrar.className = 'visor-imagen-cerrar';
        botonCerrar.setAttribute('aria-label', 'Cerrar imagen');
        botonCerrar.textContent = '×';

        visor.append(botonCerrar, imagen, ayuda);
        visor.addEventListener('click', cerrar); // en la imagen, afuera o en la X
        document.addEventListener('keydown', alPresionarTecla);
        document.documentElement.style.overflow = 'hidden'; // que no se mueva la página de fondo
        document.body.appendChild(visor);
        requestAnimationFrame(() => visor?.classList.add('abierto'));
        botonCerrar.focus({ preventScroll: true });
    }

    document.addEventListener('click', (evento) => {
        const disparador = evento.target.closest('[data-ampliar]');
        if (!disparador || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
        const miniatura = disparador.tagName === 'IMG' ? disparador : disparador.querySelector('img');
        const url = disparador.dataset.ampliar || disparador.getAttribute('href') || miniatura?.currentSrc || miniatura?.src;
        if (!url) return;
        evento.preventDefault();
        abrir(url, miniatura?.alt);
    });

    const estilo = document.createElement('style');
    estilo.textContent = ESTILOS;
    document.head.appendChild(estilo);
})();
