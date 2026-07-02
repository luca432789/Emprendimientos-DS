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
            // y "solicitud.Emprendedor" sigue igual porque lo renombramos con un ALIAS en el SQL (CorreoVal AS Emprendedor).
            fila.innerHTML = `
                <td><strong>#${String(solicitud.idSolicitudInicio).padStart(4, '0')}</strong></td>
                <td>${solicitud.Emprendedor || 'No especificado'}</td>
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
async function fetchSolicitudesAreaSinRevisar() {
    const tablaCuerpo = document.getElementById('tabla-cuerpo-dinamico');
    const token = sessionStorage.getItem('token_ministerio');

    try {
        const respuesta = await fetch('/api/solicitudes/area/sin-revisar', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!respuesta.ok) throw new Error("Error al obtener datos del Área desde el servidor.");
        const solicitudes = await respuesta.json();

        if (solicitudes.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="4" style="text-align:center; color:gray; padding:20px;">🎉 No hay solicitudes pendientes de asignación en el área.</td></tr>`;
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
                <td><span class="badge-expediente" style="color: #1a3a5f; font-weight: 500;">${solicitud.NroExpediente}</span></td>
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
        tablaCuerpo.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Error al conectar con el servidor.</td></tr>`;
    }
}
// ======================================================================
// D. VISOR DEL ÁREA: MOSTRAR FORMULARIO Y GESTIONAR COMIENZO DE REVISIÓN
// ======================================================================
function verPdfYRevisionArea(idSolicitud, urlPdf) {
    const zonaRender = document.getElementById('zona-render-contenido');
    document.getElementById('bloque-filtros-tabla').style.display = 'none'; // Ocultamos barra de ordenamiento

    // Obtenemos de forma segura los datos del empleado logueado
    const cargoEmpleado = sessionStorage.getItem('empleado_cargo'); // "Técnico" o "Social"

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

    // Evento "Comenzar Revisión" con SweetAlert2 consecutiva
// Evento "Comenzar Revisión" con Desplegable Dinámico
    document.getElementById('btn-comenzar-revision').addEventListener('click', () => {
        const cargoEmpleado = sessionStorage.getItem('empleado_cargo'); // "Técnico" o "Social"
        const contraCargo = cargoEmpleado === 'Técnico' ? 'Social' : 'Técnico';

        Swal.fire({
            title: '¿Está seguro? Confirme su acción',
            text: `Al continuar usted será registrado como el empleado que empezó la revisión del formulario en el rol de Revisor ${cargoEmpleado}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2ecc71',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Comenzar Revisión',
            cancelButtonText: 'CANCELAR'
        }).then(async (result) => {
            if (result.isConfirmed) {
                
                try {
                    const token = sessionStorage.getItem('token_ministerio');

                    // 1️⃣ Buscamos al compañero del rol opuesto en la API
                    // Ejemplo: /api/empleados/cargo/Social
                    /*const respEmpleados = await fetch(`/api/empleados/cargo/${contraCargo}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });*/
                    /*const cargoEmpleado = sessionStorage.getItem('empleado_cargo'); // "Técnico" o "Social"
                    const contraCargoLimpio = (cargoEmpleado === 'Técnico' ? 'social' : 'tecnico');
                    const respEmpleados = await fetch(`/api/empleados/cargo/${contraCargoLimpio}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });*/
                    //token = sessionStorage.getItem('token_ministerio');

                    const respEmpleados = await fetch('/api/empleados', { 
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${sessionStorage.getItem('token_ministerio')}`
                        }
                    });

                    if (!respEmpleados.ok) throw new Error("No se pudo obtener la lista de compañeros evaluadores.");
                    const compañeros = await respEmpleados.json();

                    // 2️⃣ Convertimos el array de compañeros en un objeto clave-valor para el select de SweetAlert
                    // Usamos el idUsuario (o idEmpleado) como clave, y Nombre + Apellido como texto
                    const opcionesSelect = {};
                    compañeros.forEach(comp => {
                        // Usamos comp.idUsuario porque es el que se va a asociar en SolicitudInicio
                        opcionesSelect[comp.idUsuario] = `${comp.Nombre} ${comp.Apellido}`;
                    });

                    if (compañeros.length === 0) {
                        Swal.fire('Atención', `No se encontraron empleados activos con el cargo de Revisor ${contraCargo} en el sistema.`, 'warning');
                        return;
                    }

                    // 3️⃣ SEGUNDA PANTALLA: Mostrar el select con los datos reales
                    Swal.fire({
                        title: 'Asignación de Pareja Evaluadora',
                        text: `Usted registrará la revisión del Área para esta solicitud. Seleccione su compañero Revisor ${contraCargo} para conformar el equipo:`,
                        input: 'select',
                        inputOptions: opcionesSelect,
                        inputPlaceholder: `-- Seleccione un Revisor ${contraCargo} --`,
                        showCancelButton: true,
                        confirmButtonColor: '#1a3a5f',
                        cancelButtonColor: '#e74c3c',
                        confirmButtonText: 'Confirmar y Guardar Asignación',
                        cancelButtonText: 'Cancelar',
                        inputValidator: (value) => {
                            if (!value) {
                                return '¡Debe seleccionar obligatoriamente un compañero de equipo!';
                            }
                        }
                    }).then(async (partnerResult) => {
                        if (partnerResult.isConfirmed) {
                            const idUsuarioCompañero = partnerResult.value; // Este es el idUsuario seleccionado
                            const idUsuarioActual = sessionStorage.getItem('usuario_id'); // Asegurate de guardarlo en el login

                            // Armamos el body para impactar en tu tabla SolicitudInicio
                            const bodyAsignacion = {
                                idUsuarioRevisor1: idUsuarioActual,       // Quien cliquea (Ej: Técnico)
                                idUsuarioRevisor2: idUsuarioCompañero    // El elegido del select (Ej: Social)
                            };

                            // Enviamos la asignación al backend
                            const respuesta = await fetch(`/api/solicitudes/${idSolicitud}/tomar-revision`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify(bodyAsignacion)
                            });

                            if (!respuesta.ok) throw new Error("Error al asentar el inicio de revisión en la base de datos.");

                            Swal.fire({
                                icon: 'success',
                                title: '¡Revisión Iniciada!',
                                text: `Pareja evaluadora asignada correctamente. El expediente pasó a la bandeja "En revisión".`,
                                confirmButtonColor: '#1a3a5f'
                            }).then(() => {
                                // Volvemos a listar la bandeja de entrada actualizando el panel
                                cargarSección('inicio-sin-revisar', 'Solicitudes de Inicio');
                            });
                        }
                    });

                } catch (error) {
                    console.error(error);
                    Swal.fire('Error', 'No se pudo procesar la asignación: ' + error.message, 'error');
                }
            }
        });
    });
}