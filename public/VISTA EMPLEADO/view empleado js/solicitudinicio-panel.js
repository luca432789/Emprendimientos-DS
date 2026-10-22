// solicitudinicio-panel.js

// ======================================================================
// A. FETCH PRINCIPAL: TRAER SOLICITUDES SIN EXPEDIENTE DESDE LA DB (CORREGIDO)
// ======================================================================
async function fetchSolicitudesMesaEntrada() {
    const tablaCuerpo = document.getElementById('tabla-cuerpo-dinamico');
    const token = sessionStorage.getItem('token_ministerio');

    try {
        const respuesta = await fetch('/api/solicitudes/sin-expediente', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!respuesta.ok) throw new Error("Error al obtener datos del servidor.");
        const solicitudes = await respuesta.json();

        if (solicitudes.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="4" style="text-align:center; color:gray; padding:20px;">No hay solicitudes pendientes sin expediente.</td></tr>`;
            return;
        }

        tablaCuerpo.innerHTML = ''; // Limpiamos el indicador de carga visual

        solicitudes.forEach(solicitud => {
            const fila = document.createElement('tr');
            
            // Ajustamos el formateo de fecha para usar la propiedad real: FechaRecibido
            const fechaFormateada = solicitud.FechaRecibido 
                ? new Date(solicitud.FechaRecibido).toLocaleDateString('es-AR') 
                : 'Sin fecha';

            // 🚀 MAPEO CORREGIDO: Cambiamos "solicitud.id" por "solicitud.idSolicitudInicio"
            // y "solicitud.Emprendedor" es el nombre y apellido cargado en el Formulario de Inicio (ALIAS en el SQL).
            // El nombre lo escribe el público: se escapa antes de meterlo en el HTML.
            const emprendedor = String(solicitud.Emprendedor || 'No especificado')
                .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
            fila.innerHTML = `
                <td><strong>#${String(solicitud.idSolicitudInicio).padStart(4, '0')}</strong></td>
                <td>${emprendedor}</td>
                <td>${fechaFormateada}</td>
                <td style="text-align:center;">
                    <button class="btn-filtro btn-cargar-exp" 
                            style="padding: 4px 10px; background-color:#2f4e78;" 
                            data-id="${solicitud.idSolicitudInicio}" 
                            data-pdf="${solicitud.DireccionPDF}">
                        <i class="fa-solid fa-plus-square"></i> Cargar Exp.
                    </button>
                </td>
            `;
            tablaCuerpo.appendChild(fila);
        });

        // Escuchar los clics de los botones recién creados (Mantiene tu lógica intacta)
        document.querySelectorAll('.btn-cargar-exp').forEach(boton => {
            boton.addEventListener('click', (e) => {
                const target = e.target.closest('.btn-cargar-exp');
                const id = target.getAttribute('data-id');
                const pdfUrl = target.getAttribute('data-pdf');
                
                verPdfYFormulario(id, pdfUrl);
            });
        });

    } catch (error) {
        console.error("Error cargando solicitudes de mesa:", error);
        tablaCuerpo.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Error al conectar con el servidor.</td></tr>`;
    }
}

// ======================================================================
// B. MUTAR LA ZONA DE RENDER - VISOR MAXIMIZADO (CON MODAL DE VINCULACIÓN)
// ======================================================================
function verPdfYFormulario(idSolicitud, urlPdf) {
    const zonaRender = document.getElementById('zona-render-contenido');
    
    // Ocultamos la barra de filtros superior para ganar espacio limpio
    document.getElementById('bloque-filtros-tabla').style.display = 'none';

    // Inyectamos la interfaz del documento al 100% de ancho con el botón "Vincular Expediente" arriba
    zonaRender.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #e8eff7; padding: 10px 15px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #cbd5e1;">
            <div>
                <button id="btn-volver-a-lista" style="background: none; border: none; color: #2ecc71; font-size: 24px; cursor: pointer; transition: 0.2s;" title="Volver a la lista">
                    <i class="fa-solid fa-arrow-left-long"></i>
                </button>
                <span style="font-weight: bold; margin-left: 15px; color: #1a3a5f;">Formulario de Inicio - Solicitud #${String(idSolicitud).padStart(4, '0')}</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="btn-abrir-vincular" class="btn-filtro" style="background-color: #2ecc71; color: white; border: none; font-size: 13px; cursor: pointer;">
                    <i class="fa-solid fa-folder-plus"></i> Vincular Expediente
                </button>
                <a href="${urlPdf}" target="_blank" class="btn-filtro" style="background-color: #2f4e78; text-decoration: none; font-size: 13px;">
                    <i class="fa-solid fa-download"></i> Exportar
                </a>
            </div>
        </div>

        <div style="background: #e2e8f0; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1; height: 75vh; min-height: 650px; width: 100%;">
            <embed src="${urlPdf}#toolbar=1&navpanes=0" type="application/pdf" width="100%" height="100%">
        </div>
    `;

    // --- ASIGNAR EVENTOS A LOS COMPONENTES ---
    
    // Evento Volver (Flecha verde)
    document.getElementById('btn-volver-a-lista').addEventListener('click', () => {
        cargarSección('solicitudes-sin-expediente', 'Carga de Expedientes GED');
    });

    // 🚀 LÓGICA CON SWEETALERT2: Ventana interactiva y confirmación consecutiva
    document.getElementById('btn-abrir-vincular').addEventListener('click', () => {
        Swal.fire({
            title: 'Vinculación de Expediente GED',
            text: 'Genere el expediente en la plataforma del GED e ingrese el número correspondiente:',
            input: 'text',
            inputPlaceholder: 'EX-2026-XXXXXXXX- -GDE-MDS',
            showCancelButton: true,
            confirmButtonColor: '#2ecc71',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Continuar',
            cancelButtonText: 'Cancelar',
            inputValidator: (valor) => {
                if (!valor.trim()) {
                    return '¡El número de expediente no puede estar vacío!';
                }
            }
        }).then((result) => {
            // Si el usuario ingresó el dato y presionó Continuar:
            if (result.isConfirmed) {
                const expedienteVal = result.value.trim();

                // 🔄 SEGUNDA CONFIRMACIÓN (Doble validación de seguridad)
                Swal.fire({
                    title: '¿Está seguro de confirmar esta acción?',
                    text: `La solicitud #${String(idSolicitud).padStart(4, '0')} se asociará permanentemente al expediente: ${expedienteVal}. Su usuario quedará registrado como el cargador del documento.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#2ecc71',
                    cancelButtonColor: '#e74c3c',
                    confirmButtonText: 'Sí, guardar expediente',
                    cancelButtonText: 'Cancelar'
                }).then(async (confirmacion) => {
                    if (confirmacion.isConfirmed) {
                        try {
                            const token = sessionStorage.getItem('token_ministerio');
                            const respuesta = await fetch(`/api/solicitudes/${idSolicitud}/asignar-expediente`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ nroExpediente: expedienteVal })
                            });

                            if (!respuesta.ok) throw new Error("Error en la actualización de la DB.");

                            // La solicitud ya tiene expediente: la campanita del navbar baja en 1
                            if (typeof window.actualizarNotificaciones === 'function') window.actualizarNotificaciones();

                            Swal.fire({
                                icon: 'success',
                                title: '¡Éxito!',
                                text: 'El número de expediente fue asignado y auditado correctamente.',
                                confirmButtonColor: '#1a3a5f'
                            }).then(() => {
                                // Volver automáticamente a la tabla limpia
                                cargarSección('solicitudes-sin-expediente', 'Carga de Expedientes GED');
                            });

                        } catch (error) {
                            Swal.fire('Error', 'No se pudo guardar el expediente: ' + error.message, 'error');
                        }
                    }
                });
            }
        });
    });
}
// ======================================================================
// C. FETCH ÁREA: TRAER SOLICITUDES CON EXPEDIENTE SIN REVISOR (NUEVO)
// ======================================================================
function inicializarBandejaSinRevisar() {
    const filtroDepartamento = document.getElementById('filtro-departamento-sin-revisar');
    filtroDepartamento.addEventListener('change', fetchSolicitudesAreaSinRevisar);
    document.getElementById('limpiar-filtro-departamento-sin-revisar').addEventListener('click', () => {
        filtroDepartamento.value = '';
        fetchSolicitudesAreaSinRevisar();
    });
    fetchSolicitudesAreaSinRevisar();
}

async function fetchSolicitudesAreaSinRevisar() {
    const tablaCuerpo = document.getElementById('tabla-cuerpo-dinamico');
    const filtroDepartamento = document.getElementById('filtro-departamento-sin-revisar');
    const token = sessionStorage.getItem('token_ministerio');
    if (!tablaCuerpo || !filtroDepartamento) return;

    tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color:gray; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando expedientes en bandeja de entrada...</td></tr>`;

    try {
        const parametros = new URLSearchParams();
        if (filtroDepartamento.value) parametros.set('departamento', filtroDepartamento.value);
        const query = parametros.toString();
        const respuesta = await fetch(`/api/solicitudes/area/sin-revisar${query ? `?${query}` : ''}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!respuesta.ok) throw new Error("Error al obtener datos del Área desde el servidor.");
        const { solicitudes, departamentos } = await respuesta.json();
        if (!tablaCuerpo.isConnected) return;

        const departamentoActual = filtroDepartamento.value;
        filtroDepartamento.replaceChildren(new Option('Todos los departamentos', ''));
        departamentos.forEach(departamento => {
            filtroDepartamento.add(new Option(departamento, departamento));
        });
        filtroDepartamento.value = departamentoActual;

        if (solicitudes.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color:gray; padding:20px;">${departamentoActual
                ? 'No hay solicitudes pendientes de asignación en este departamento.'
                : '🎉 No hay solicitudes pendientes de asignación en el área.'}</td></tr>`;
            return;
        }

        tablaCuerpo.innerHTML = ''; // Limpiamos el spinner de carga

        solicitudes.forEach(solicitud => {
            const fila = document.createElement('tr');
            
            const fechaFormateada = solicitud.FechaRecibidoArea 
                ? new Date(solicitud.FechaRecibidoArea).toLocaleDateString('es-AR') 
                : 'Sin fecha';

            fila.innerHTML = `
                <td><strong>#${String(solicitud.idSolicitudInicio).padStart(4, '0')}</strong></td>
                <td><span class="badge-expediente" style="color: #1a3a5f; font-weight: 500;">${escaparDatoRevision(solicitud.NroExpediente)}</span></td>
                <td>${escaparDatoRevision(solicitud.EmprendimientoDepto || 'Sin datos')}</td>
                <td>${fechaFormateada}</td>
                <td style="text-align:center;">
                    <button class="btn-filtro btn-revisar-sol" 
                            style="padding: 4px 10px; background-color:#2c3e50;" 
                            data-id="${solicitud.idSolicitudInicio}"
                            data-pdf="${solicitud.DireccionPDF || '../mocks/formulario_inicio.pdf'}"> 
                            <i class="fa-solid fa-file-signature"></i> Revisar
                    </button>
                </td>
            `;
            tablaCuerpo.appendChild(fila);
        });

        // Evento para cuando hagan clic en "Tomar Revisión" (Para armar en los próximos sprints)
        document.querySelectorAll('.btn-revisar-sol').forEach(boton => {
            boton.addEventListener('click', (e) => {
                const target = e.target.closest('.btn-revisar-sol');
                const id = target.getAttribute('data-id');
                const pdfUrl = target.getAttribute('data-pdf');
                // Llamamos a la nueva función del visor del área 
                verPdfYRevisionArea(id, pdfUrl);
            });
        });

    } catch (error) {
        console.error("Error cargando solicitudes de área:", error);
        tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">Error al conectar con el servidor.</td></tr>`;
    }
}
// ======================================================================
// D. VISOR DEL ÁREA: MOSTRAR FORMULARIO Y GESTIONAR COMIENZO DE REVISIÓN
// ======================================================================
function verPdfYRevisionArea(idSolicitud, urlPdf) {
    const zonaRender = document.getElementById('zona-render-contenido');
    document.getElementById('bloque-filtros-tabla').style.display = 'none'; // Ocultamos barra de ordenamiento

    zonaRender.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #e8eff7; padding: 10px 15px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #cbd5e1;">
            <div>
                <button id="btn-volver-a-area" style="background: none; border: none; color: #e74c3c; font-size: 24px; cursor: pointer; transition: 0.2s;" title="Volver a la lista">
                    <i class="fa-solid fa-arrow-left-long"></i>
                </button>
                <span style="font-weight: bold; margin-left: 15px; color: #1a3a5f;">Evaluación de Expediente - Solicitud #${String(idSolicitud).padStart(4, '0')}</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="btn-comenzar-revision" class="btn-filtro" style="background-color: #d35400; color: white; border: none; font-size: 13px; cursor: pointer;">
                    <i class="fa-solid fa-comments"></i> Comenzar Revisión
                </button>
                <a href="${urlPdf}" target="_blank" class="btn-filtro" style="background-color: #2f4e78; text-decoration: none; font-size: 13px;">
                    <i class="fa-solid fa-download"></i> Exportar
                </a>
            </div>
        </div>

        <div style="background: #e2e8f0; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1; height: 75vh; min-height: 650px; width: 100%;">
            <embed src="${urlPdf}#toolbar=1&navpanes=0" type="application/pdf" width="100%" height="100%">
        </div>
    `;

    // Evento Volver
    document.getElementById('btn-volver-a-area').addEventListener('click', () => {
        cargarSección('inicio-sin-revisar', 'Solicitudes de Inicio');
    });

    document.getElementById('btn-comenzar-revision').addEventListener('click', async () => {
        try {
            const token = sessionStorage.getItem('token_ministerio');
            if (!token) throw new Error('La sesión venció. Inicia sesión nuevamente.');

            const respuestaEmpleados = await fetch('/api/empleados/para-revision', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const datosEquipo = await respuestaEmpleados.json();
            if (!respuestaEmpleados.ok) {
                throw new Error(datosEquipo.error || 'No se pudo obtener el equipo revisor.');
            }

            const { empleadoActual, cargosCandidatos, candidatos } = datosEquipo;
            if (candidatos.length === 0) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'No hay compañeros disponibles',
                    text: `No se encontraron empleados activos con cargo ${cargosCandidatos.join(' o ')} y cuenta de usuario activa.`
                });
                return;
            }

            const opcionesSelect = {};
            candidatos.forEach(compañero => {
                opcionesSelect[compañero.idEmpleado] = `${compañero.Nombre} ${compañero.Apellido} · ${compañero.Cargo}`;
            });

            const revisorActual = empleadoActual.cargo === 'Administrador'
                ? 'Administrador (equipo Técnico)'
                : empleadoActual.cargo;
            const cargoCompañero = cargosCandidatos.join(' o ');

            const seleccion = await Swal.fire({
                title: 'Asignación de pareja evaluadora',
                text: `Usted iniciará como Revisor ${revisorActual}. Seleccione un compañero con cargo ${cargoCompañero}.`,
                input: 'select',
                inputOptions: opcionesSelect,
                inputPlaceholder: `-- Seleccione ${cargoCompañero} --`,
                showCancelButton: true,
                confirmButtonColor: '#1a3a5f',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Continuar',
                cancelButtonText: 'Cancelar',
                inputValidator: valor => !valor ? 'Debe seleccionar un compañero de revisión.' : undefined
            });
            if (!seleccion.isConfirmed) return;

            const idEmpleadoCompañero = Number(seleccion.value);
            const compañeroSeleccionado = candidatos.find(compañero => compañero.idEmpleado === idEmpleadoCompañero);
            const idEmpleadoTecnico = empleadoActual.cargo === 'Social'
                ? idEmpleadoCompañero
                : empleadoActual.idEmpleado;
            const idEmpleadoSocial = empleadoActual.cargo === 'Social'
                ? empleadoActual.idEmpleado
                : idEmpleadoCompañero;
            const nombresRevisores = empleadoActual.cargo === 'Social'
                ? `Revisor Técnico: ${compañeroSeleccionado.Nombre} ${compañeroSeleccionado.Apellido}. Revisor Social: usted.`
                : `Revisor Técnico: usted. Revisor Social: ${compañeroSeleccionado.Nombre} ${compañeroSeleccionado.Apellido}.`;

            const confirmacion = await Swal.fire({
                title: 'Confirmar inicio de revisión',
                text: `${nombresRevisores} Se guardarán ambos identificadores de Empleado en la solicitud y el expediente pasará a revisión.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#2ecc71',
                cancelButtonColor: '#e74c3c',
                confirmButtonText: 'Sí, iniciar revisión',
                cancelButtonText: 'Cancelar'
            });
            if (!confirmacion.isConfirmed) return;

            const respuesta = await fetch(`/api/solicitudes/${idSolicitud}/iniciar-revision`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ idEmpleadoCompañero })
            });
            const resultado = await respuesta.json();
            if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo iniciar la revisión.');

            await Swal.fire({
                icon: 'success',
                title: '¡Revisión iniciada!',
                text: resultado.mensaje,
                confirmButtonColor: '#1a3a5f'
            });
            cargarSección('inicio-sin-revisar', 'Solicitudes de Inicio');
        } catch (error) {
            console.error('Error al iniciar revisión:', error);
            Swal.fire('Error', `No se pudo procesar la revisión: ${error.message}`, 'error');
        }
    });
}

function escaparDatoRevision(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

async function abrirDecisionRevisionArea(solicitud) {
    const formulario = await Swal.fire({
        title: `Continuar revisión · Solicitud #${solicitud.id}`,
        width: '620px',
        html: `
            <div style="text-align:left; margin:0 0 12px; padding:12px; background:#f1f5f9; border-radius:4px;">
                <div><b>Departamento:</b> ${escaparDatoRevision(solicitud.departamento)}</div>
                <div><b>Ayuda:</b> ${escaparDatoRevision(solicitud.ayuda)}</div>
                <div><b>Correo emprendedor:</b> ${escaparDatoRevision(solicitud.correo)}</div>
                ${solicitud.pdf ? `<a href="${escaparDatoRevision(solicitud.pdf)}" target="_blank" rel="noopener noreferrer">Abrir formulario PDF</a>` : ''}
            </div>
            <label for="decision-area">Decisión del Área</label>
            <select id="decision-area" class="swal2-select" style="width:100%; margin:8px 0;">
                <option value="">-- Seleccione una decisión --</option>
                <option value="1">Aprobar emprendimiento</option>
                <option value="0">Rechazar emprendimiento</option>
            </select>
            <div id="coordenadas-revision" style="display:none; grid-template-columns:1fr 1fr; gap:10px; text-align:left; margin-top:12px;">
                <label>Latitud
                    <input id="revision-latitud" type="number" step="any" min="-90" max="90" class="swal2-input" placeholder="-27.78" style="width:100%; margin:5px 0 0;">
                </label>
                <label>Longitud
                    <input id="revision-longitud" type="number" step="any" min="-180" max="180" class="swal2-input" placeholder="-64.26" style="width:100%; margin:5px 0 0;">
                </label>
            </div>
        `,
        didOpen: () => {
            const decision = document.getElementById('decision-area');
            const coordenadas = document.getElementById('coordenadas-revision');
            decision.addEventListener('change', () => {
                coordenadas.style.display = decision.value === '1' ? 'grid' : 'none';
                if (decision.value !== '1') {
                    document.getElementById('revision-latitud').value = '';
                    document.getElementById('revision-longitud').value = '';
                }
            });
        },
        preConfirm: () => {
            const decision = document.getElementById('decision-area').value;
            if (decision !== '0' && decision !== '1') {
                Swal.showValidationMessage('Selecciona aprobar o rechazar.');
                return false;
            }

            if (decision === '0') return { aprobacionArea: 0, latitud: null, longitud: null };

            const latitudTexto = document.getElementById('revision-latitud').value.trim();
            const longitudTexto = document.getElementById('revision-longitud').value.trim();
            const latitud = Number(latitudTexto);
            const longitud = Number(longitudTexto);
            if (!latitudTexto || !Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
                Swal.showValidationMessage('Ingresa una latitud entre -90 y 90.');
                return false;
            }
            if (!longitudTexto || !Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
                Swal.showValidationMessage('Ingresa una longitud entre -180 y 180.');
                return false;
            }
            return { aprobacionArea: 1, latitud, longitud };
        },
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1a3a5f'
    });
    if (!formulario.isConfirmed) return;

    const decisionTexto = formulario.value.aprobacionArea === 1
        ? `aprobar con coordenadas ${formulario.value.latitud}, ${formulario.value.longitud}`
        : 'rechazar';
    const confirmacion = await Swal.fire({
        title: 'Confirmar decisión del Área',
        text: `Se va a ${decisionTexto} la solicitud #${solicitud.id}. La fecha de finalización se registrará automáticamente.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, registrar decisión',
        cancelButtonText: 'Volver',
        confirmButtonColor: formulario.value.aprobacionArea === 1 ? '#2ecc71' : '#c0392b'
    });
    if (!confirmacion.isConfirmed) return;

    try {
        const token = sessionStorage.getItem('token_ministerio');
        if (!token) throw new Error('La sesión venció. Inicia sesión nuevamente.');

        const respuesta = await fetch(`/api/solicitudes/${encodeURIComponent(solicitud.id)}/resolver-area`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formulario.value)
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo registrar la decisión.');

        await Swal.fire({
            icon: 'success',
            title: 'Decisión registrada',
            text: resultado.mensaje,
            confirmButtonColor: '#1a3a5f'
        });
        cargarRevisionesAsignadas();
    } catch (error) {
        Swal.fire('Error', `No se pudo guardar la decisión del Área: ${error.message}`, 'error');
    }
}

function htmlDatosEtapaMinistro(solicitud) {
    return `
        <div style="text-align:left; margin:0 0 12px; padding:12px; background:#f1f5f9; border-radius:4px;">
            <div><b>N° de expediente:</b> ${escaparDatoRevision(solicitud.expediente || 'Sin expediente')}</div>
            <div><b>Departamento:</b> ${escaparDatoRevision(solicitud.departamento)}</div>
            <div><b>Ayuda:</b> ${escaparDatoRevision(solicitud.ayuda)}</div>
        </div>
        ${solicitud.pdf ? `<a href="${escaparDatoRevision(solicitud.pdf)}" target="_blank" rel="noopener noreferrer"
            class="btn-filtro" style="display:inline-block; background-color:#2f4e78; color:white; text-decoration:none; font-size:13px;">
            <i class="fa-solid fa-download"></i> Exportar PDF
        </a>` : ''}
    `;
}

async function enviarEtapaMinistro(idSolicitud, ruta, cuerpo) {
    const token = sessionStorage.getItem('token_ministerio');
    if (!token) throw new Error('La sesión venció. Inicia sesión nuevamente.');

    const respuesta = await fetch(`/api/solicitudes/${encodeURIComponent(idSolicitud)}/${ruta}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cuerpo)
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo registrar la operación.');
    return resultado;
}

async function abrirEnvioMinistro(solicitud) {
    const ventana = await Swal.fire({
        title: `Envío al Ministro · Solicitud #${solicitud.id}`,
        width: '620px',
        html: htmlDatosEtapaMinistro(solicitud),
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-paper-plane"></i> Confirmar envío al Ministro',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1a3a5f'
    });
    if (!ventana.isConfirmed) return;

    const confirmacion = await Swal.fire({
        title: '¿Confirmar envío al Ministro?',
        text: `Se registrará que el expediente ${solicitud.expediente || ''} de la solicitud #${solicitud.id} fue enviado al Ministro con la fecha de hoy.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, registrar envío',
        cancelButtonText: 'Volver',
        confirmButtonColor: '#2ecc71',
        cancelButtonColor: '#e74c3c'
    });
    if (!confirmacion.isConfirmed) return;

    try {
        const resultado = await enviarEtapaMinistro(solicitud.id, 'enviar-ministro', {});
        await Swal.fire({
            icon: 'success',
            title: 'Envío registrado',
            text: resultado.mensaje,
            confirmButtonColor: '#1a3a5f'
        });
        cargarRevisionesAsignadas();
    } catch (error) {
        Swal.fire('Error', `No se pudo registrar el envío al Ministro: ${error.message}`, 'error');
    }
}

function normalizarTextoRubro(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

// Pide el Nro de Proyecto y el Rubro (preseleccionado según lo escrito en el formulario de inicio)
async function pedirDatosProyectoAprobado(solicitud) {
    let rubros;
    try {
        const token = sessionStorage.getItem('token_ministerio');
        if (!token) throw new Error('La sesión venció. Inicia sesión nuevamente.');
        const respuesta = await fetch('/api/solicitudes/rubros', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        rubros = await respuesta.json();
        if (!respuesta.ok) throw new Error(rubros.error || 'No se pudieron cargar los rubros.');
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
        return null;
    }
    if (rubros.length === 0) {
        Swal.fire('Sin rubros', 'No hay rubros cargados. Registre al menos un rubro antes de aprobar.', 'warning');
        return null;
    }

    const rubroFormulario = normalizarTextoRubro(solicitud.rubro);
    const rubroCoincidente = rubros.find(rubro => normalizarTextoRubro(rubro.Nombre) === rubroFormulario);
    const opcionesRubro = rubros.map(rubro => `
        <option value="${escaparDatoRevision(rubro.idRubro)}" ${rubroCoincidente?.idRubro === rubro.idRubro ? 'selected' : ''}>
            ${escaparDatoRevision(rubro.Nombre)}
        </option>`).join('');

    const formulario = await Swal.fire({
        title: `Aprobación del Ministro · Solicitud #${solicitud.id}`,
        width: '620px',
        html: `
            <div style="text-align:left; margin:0 0 12px; padding:12px; background:#f1f5f9; border-radius:4px;">
                <div><b>N° de expediente:</b> ${escaparDatoRevision(solicitud.expediente || 'Sin expediente')}</div>
                <div><b>Emprendimiento:</b> ${escaparDatoRevision(solicitud.nombreEmprendimiento)}</div>
                <div><b>Rubro indicado en el formulario:</b> ${escaparDatoRevision(solicitud.rubro)}</div>
            </div>
            <label for="aprobacion-nro-proyecto" style="display:block; text-align:left;">Nro de Proyecto</label>
            <input id="aprobacion-nro-proyecto" class="swal2-input" maxlength="50" placeholder="Ej: T78-PO-09" style="width:100%; margin:6px 0 12px; box-sizing:border-box;">
            <label for="aprobacion-rubro" style="display:block; text-align:left;">Rubro del emprendimiento</label>
            <select id="aprobacion-rubro" class="swal2-select" style="width:100%; margin:6px 0 0;">
                ${rubroCoincidente ? '' : '<option value="">-- Seleccione un rubro --</option>'}
                ${opcionesRubro}
            </select>
        `,
        focusConfirm: false,
        preConfirm: () => {
            const nroProyecto = document.getElementById('aprobacion-nro-proyecto').value.trim();
            const selectRubro = document.getElementById('aprobacion-rubro');
            if (!nroProyecto) {
                Swal.showValidationMessage('Ingresa el Nro de Proyecto.');
                return false;
            }
            if (!selectRubro.value) {
                Swal.showValidationMessage('Selecciona el rubro del emprendimiento.');
                return false;
            }
            return {
                nroProyecto,
                idRubro: Number(selectRubro.value),
                nombreRubro: selectRubro.options[selectRubro.selectedIndex].text.trim()
            };
        },
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2ecc71'
    });
    return formulario.isConfirmed ? formulario.value : null;
}

async function abrirResolucionMinistro(solicitud) {
    const ventana = await Swal.fire({
        title: `Resolución del Ministro · Solicitud #${solicitud.id}`,
        width: '620px',
        html: `${htmlDatosEtapaMinistro(solicitud)}
            <p style="margin-top:14px;">Registre la decisión final enviada por el Ministro:</p>`,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-check"></i> Aprobado',
        denyButtonText: '<i class="fa-solid fa-xmark"></i> Rechazado',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2ecc71',
        denyButtonColor: '#c0392b'
    });
    if (ventana.isDismissed) return;

    const aprobacionMinistro = ventana.isConfirmed ? 1 : 0;
    const cuerpo = { aprobacionMinistro };
    let detalleAprobacion = '';

    if (aprobacionMinistro === 1) {
        const datosProyecto = await pedirDatosProyectoAprobado(solicitud);
        if (!datosProyecto) return;
        cuerpo.nroProyecto = datosProyecto.nroProyecto;
        cuerpo.idRubro = datosProyecto.idRubro;
        detalleAprobacion = ` Se creará el emprendimiento "${solicitud.nombreEmprendimiento || ''}" con Nro de Proyecto ${datosProyecto.nroProyecto} (rubro ${datosProyecto.nombreRubro}) , su emprendedor y su cuenta de usuario, con los datos del formulario de inicio.`;
    }

    const confirmacion = await Swal.fire({
        title: '¿Confirmar resolución del Ministro?',
        text: `Se registrará que el Ministro ${aprobacionMinistro === 1 ? 'APROBÓ' : 'RECHAZÓ'} la solicitud #${solicitud.id} (expediente ${solicitud.expediente || ''}).${detalleAprobacion} Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, registrar resolución',
        cancelButtonText: 'Volver',
        confirmButtonColor: aprobacionMinistro === 1 ? '#2ecc71' : '#c0392b'
    });
    if (!confirmacion.isConfirmed) return;

    try {
        const resultado = await enviarEtapaMinistro(solicitud.id, 'resolucion-ministro', cuerpo);
        await Swal.fire({
            icon: 'success',
            title: 'Resolución registrada',
            text: resultado.mensaje,
            confirmButtonColor: '#1a3a5f'
        });
        cargarRevisionesAsignadas();
    } catch (error) {
        Swal.fire('Error', `No se pudo registrar la resolución del Ministro: ${error.message}`, 'error');
    }
}

function inicializarBandejaRevisionesAsignadas() {
    const filtroDepartamento = document.getElementById('filtro-departamento-revision');
    filtroDepartamento.addEventListener('change', cargarRevisionesAsignadas);
    document.getElementById('limpiar-filtro-departamento-revision').addEventListener('click', () => {
        filtroDepartamento.value = '';
        cargarRevisionesAsignadas();
    });
    cargarRevisionesAsignadas();
}

async function cargarRevisionesAsignadas() {
    const cuerpo = document.getElementById('tabla-revisiones-asignadas');
    const filtroDepartamento = document.getElementById('filtro-departamento-revision');
    if (!cuerpo || !filtroDepartamento) return;

    cuerpo.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando revisiones asignadas...</td></tr>';

    try {
        const token = sessionStorage.getItem('token_ministerio');
        if (!token) throw new Error('La sesión venció. Inicia sesión nuevamente.');

        const parametros = new URLSearchParams();
        if (filtroDepartamento.value) parametros.set('departamento', filtroDepartamento.value);
        const query = parametros.toString();
        const respuesta = await fetch(`/api/solicitudes/area/asignadas${query ? `?${query}` : ''}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.error || 'No se pudieron cargar las revisiones.');
        if (!cuerpo.isConnected) return;

        const departamentoActual = filtroDepartamento.value;
        filtroDepartamento.replaceChildren(new Option('Todos los departamentos', ''));
        resultado.departamentos.forEach(departamento => {
            filtroDepartamento.add(new Option(departamento, departamento));
        });
        filtroDepartamento.value = departamentoActual;

        if (resultado.solicitudes.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No hay solicitudes asignadas pendientes en esta etapa.</td></tr>';
            return;
        }

        cuerpo.innerHTML = resultado.solicitudes.map(solicitud => {
            const fechaValor = solicitud.FechaInicioRev ? String(solicitud.FechaInicioRev) : '';
            const fechaTexto = /^\d{4}-\d{2}-\d{2}/.test(fechaValor)
                ? `${fechaValor.slice(8, 10)}/${fechaValor.slice(5, 7)}/${fechaValor.slice(0, 4)}`
                : 'Sin fecha';
            const decisionAreaTomada = solicitud.AprobacionArea !== null;
            const enviadoMinistro = Number(solicitud.EnvioMinistro) === 1;
            const estadoEtapa = enviadoMinistro
                ? 'Enviado al Ministro · En espera de resolución'
                : 'Aprobado por el Área · Pendiente de envío al Ministro';
            const datosEtapaMinistro = `
                    data-id="${escaparDatoRevision(solicitud.idSolicitudInicio)}"
                    data-expediente="${escaparDatoRevision(solicitud.NroExpediente || '')}"
                    data-departamento="${escaparDatoRevision(solicitud.EmprendimientoDepto)}"
                    data-ayuda="${escaparDatoRevision(solicitud.EleccionAyuda)}"
                    data-nombre="${escaparDatoRevision(solicitud.EmprendimientoNombre || '')}"
                    data-rubro="${escaparDatoRevision(solicitud.EmprendimientoRubro || '')}"
                    data-pdf="${escaparDatoRevision(solicitud.DireccionPDF || '')}"`;
            const accion = decisionAreaTomada
                ? `<div style="display:flex; flex-direction:column; gap:6px; align-items:flex-start;">
                    <span>${escaparDatoRevision(estadoEtapa)}</span>
                    ${enviadoMinistro
                        ? `<button type="button" class="btn-filtro btn-resolucion-ministro" style="background-color:#8e44ad;" ${datosEtapaMinistro}>
                            <i class="fa-solid fa-gavel"></i> Registrar resolución
                        </button>`
                        : `<button type="button" class="btn-filtro btn-envio-ministro" style="background-color:#1a3a5f;" ${datosEtapaMinistro}>
                            <i class="fa-solid fa-paper-plane"></i> Enviar al Ministro
                        </button>`}
                </div>`
                : `<button type="button" class="btn-filtro btn-continuar-revision"
                    data-id="${escaparDatoRevision(solicitud.idSolicitudInicio)}"
                    data-departamento="${escaparDatoRevision(solicitud.EmprendimientoDepto)}"
                    data-ayuda="${escaparDatoRevision(solicitud.EleccionAyuda)}"
                    data-correo="${escaparDatoRevision(solicitud.PersonaCorreo)}"
                    data-pdf="${escaparDatoRevision(solicitud.DireccionPDF || '')}">
                    <i class="fa-solid fa-file-signature"></i> Continuar revisión
                </button>`;

            return `
                <tr>
                    <td>#${escaparDatoRevision(solicitud.idSolicitudInicio)}</td>
                    <td>${escaparDatoRevision(solicitud.EmprendimientoDepto)}</td>
                    <td>${escaparDatoRevision(fechaTexto)}</td>
                    <td>${escaparDatoRevision(solicitud.EleccionAyuda)}</td>
                    <td>${escaparDatoRevision(solicitud.PersonaCorreo)}</td>
                    <td>${accion}</td>
                </tr>
            `;
        }).join('');

        cuerpo.querySelectorAll('.btn-continuar-revision').forEach(boton => {
            boton.addEventListener('click', () => abrirDecisionRevisionArea({
                id: boton.dataset.id,
                departamento: boton.dataset.departamento,
                ayuda: boton.dataset.ayuda,
                correo: boton.dataset.correo,
                pdf: boton.dataset.pdf
            }));
        });

        const datosBotonMinistro = boton => ({
            id: boton.dataset.id,
            expediente: boton.dataset.expediente,
            departamento: boton.dataset.departamento,
            ayuda: boton.dataset.ayuda,
            nombreEmprendimiento: boton.dataset.nombre,
            rubro: boton.dataset.rubro,
            pdf: boton.dataset.pdf
        });
        cuerpo.querySelectorAll('.btn-envio-ministro').forEach(boton => {
            boton.addEventListener('click', () => abrirEnvioMinistro(datosBotonMinistro(boton)));
        });
        cuerpo.querySelectorAll('.btn-resolucion-ministro').forEach(boton => {
            boton.addEventListener('click', () => abrirResolucionMinistro(datosBotonMinistro(boton)));
        });
    } catch (error) {
        if (cuerpo.isConnected) {
            cuerpo.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding:20px;">${escaparDatoRevision(error.message)}</td></tr>`;
        }
        console.error('Error cargando revisiones asignadas:', error);
    }
}