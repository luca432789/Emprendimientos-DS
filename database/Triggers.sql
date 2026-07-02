-- use ProyectoEmprendimientos2026;

-- ------------------------------------------------------------------------------------------------------------------------
-- Seccion de TRIGGERS ------------------------------------------------------------------------------------------------------
-- ------------------------------------------------------------------------------------------------------------------------
-- Orden de triggers: Empleado, SolicitudInicio, Emprendimiento, Emprendedor, Usuario, Publicacion, Etiqueta, Subsidio, Credito, Garante, Expediente.
-- drop trigger tg_auditoria_empleado_update; -- comando para eliminar triggers

-- PARA REALIZAR PRUEBA DE AUDITORIA EJECUTAR LINEA DE ABAJO
SET @usuario_id = 10; -- El ID del empleado que está logueado en ese momento
SET @usuario_ip = '222.555.33.4';


-- TRIGGERS DE EMPLEADOS - AUDITORIA ----------------------------------------------------------------------------------------------------------------------------------------
-- Empleado (idEmpleado (PK), Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo (Mesa de Entrada - Técnico - Social - Administrador), Activo (Si-No))
-- Trigger Insert_Auditoria_Empleado
DELIMITER //
CREATE TRIGGER tg_auditoria_empleado_insert
AFTER INSERT ON Empleado
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
	@usuario_id, 'INSERT', 'Empleado', NEW.idEmpleado, 
	CONCAT('Nuevo empleado añadido: ', NEW.Nombre, ' ', NEW.Apellido, ' - DNI: ', NEW.DNI,' - Cargo: ', NEW.Cargo),
	@usuario_ip);
END;
//
DELIMITER ;
-- Trigger Update_Auditoria_Empleado
DELIMITER //
CREATE TRIGGER tg_auditoria_empleado_update
AFTER UPDATE ON Empleado
FOR EACH ROW
BEGIN
    -- 1. Cambio de datos de Identidad
    IF OLD.DNI <> NEW.DNI OR OLD.Nombre <> NEW.Nombre OR OLD.Apellido <> NEW.Apellido THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Empleado', NEW.idEmpleado, 
			CONCAT('Modificación de datos de identidad: DNI anterior -> ', OLD.DNI, ', actual -> ', NEW.DNI,
				' - Nombre: anterior -> ', OLD.Nombre, ', actual -> ', NEW.Nombre,
				' - Apellido: anterior -> ', OLD.Apellido, ', actual -> ', NEW.Apellido),
			@usuario_ip);
    END IF;

    -- 2. Cambio de datos de Contacto
    IF OLD.Teléfono <> NEW.Teléfono OR OLD.Correo <> NEW.Correo THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Empleado', NEW.idEmpleado, 
			CONCAT('Modificación de datos de contacto: Teléfono anterior -> ', OLD.Teléfono, ', actual -> ', NEW.Teléfono,
				' - Correo: anterior -> ', OLD.Correo, ', actual -> ', NEW.Correo),
			@usuario_ip);
    END IF;

    -- 3. Cambio de Cargo (Rol en el Ministerio)
    IF OLD.Cargo <> NEW.Cargo THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Empleado', NEW.idEmpleado, 
			CONCAT('Cambio de cargo de: ', OLD.Cargo, ' a ', NEW.Cargo),
			@usuario_ip);
    END IF;

    -- 4. Cambio de Domicilio
    IF OLD.Domicilio <> NEW.Domicilio THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Empleado', NEW.idEmpleado, 
			CONCAT('Cambio de Domicilio de: ', OLD.Domicilio, ' a ', NEW.Domicilio),
			@usuario_ip);
    END IF;

    -- 5. Cambio de Estado (Baja/Alta laboral)
    IF OLD.Activo <> NEW.Activo THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Empleado', NEW.idEmpleado, 
			CONCAT('Cambio de estado laboral a: ', CASE WHEN NEW.Activo = 1 THEN 'Reincorporado' ELSE 'Baja (Inactivo)' END),
			@usuario_ip);
    END IF;
END;
//
DELIMITER ;

-- TRIGGERS DE SOLICITUDINICIO - AUDITORIA ----------------------------------------------------------------------------------------------------------------------------------------
-- Trigger Insert_Auditoria_SolicitudInicio
DELIMITER //
CREATE TRIGGER tg_auditoria_SolicitudInicio_insert
AFTER INSERT ON SolicitudInicio
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
		@usuario_id, 'INSERT', 'SolicitudInicio', NEW.idSolicitudInicio, 
		CONCAT('Nueva solicitud ingresada a Mesa de Entrada. Archivo: ', NEW.DireccionPDF),
		@usuario_ip);
END;
//
DELIMITER ;

-- Trigger Update_Auditoria_SolicitudInicio
DELIMITER //
CREATE TRIGGER tg_auditoria_SolicitudInicio_update
AFTER UPDATE ON SolicitudInicio
FOR EACH ROW
BEGIN    
    -- 1. Cambio en el Estado de Revisión del area
    IF OLD.EstadoRevisionArea <> NEW.EstadoRevisionArea THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'SolicitudInicio', NEW.idSolicitudInicio, 
			CONCAT('Estado de revisión de area cambió a: ', 
				CASE NEW.EstadoRevisionArea WHEN 0 THEN 'Sin revisar' WHEN 1 THEN 'En proceso' ELSE 'Finalizado' END), 
			@usuario_ip);
    END IF;

    -- 2. Firma/Aprobación del area (visita tecnico - social)
    IF (OLD.AprobacionArea IS NULL AND NEW.AprobacionArea IS NOT NULL) OR (OLD.AprobacionArea <> NEW.AprobacionArea) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'SolicitudInicio', NEW.idSolicitudInicio, 
			CONCAT('Dictamen del Área: ', CASE WHEN NEW.AprobacionArea = 1 THEN 'APROBADO' ELSE 'RECHAZADO' END, 
				' Revisores - Tecnico: ', COALESCE(NEW.idEmpleadoTecRevisor, 'N/C'), ' - Social: ', COALESCE(NEW.idEmpleadoSocRevisor, 'N/C')), 
			@usuario_ip);
    END IF;
    
    -- 3. Envío de documentos a ministro (solicitudInicio y subsidio/credito)
    IF OLD.EnvioMinistro <> NEW.EnvioMinistro AND NEW.EnvioMinistro = 1 THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'SolicitudInicio', NEW.idSolicitudInicio, 
			CONCAT('El empleado ', NEW.idEmpleadoTecRevisor ,' envió los documentos al ministro'), 
			@usuario_ip);
    END IF;

    -- 4. Resolucion Ministro (Aprobacion final
    IF (OLD.AprobacionMinistro IS NULL AND NEW.AprobacionMinistro IS NOT NULL) OR (OLD.AprobacionMinistro <> NEW.AprobacionMinistro) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'SolicitudInicio', NEW.idSolicitudInicio, 
			CONCAT('Resolución del Ministro: ', CASE WHEN NEW.AprobacionMinistro = 1 THEN 'APROBADA' ELSE 'RECHAZADA' END), 
			@usuario_ip);
    END IF;
END;
//
DELIMITER ;


-- TRIGGERS DE EMPRENDIMIENTO - AUDITORIA ----------------------------------------------------------------------------------------------------------------------------------------
-- Trigger Insert_Auditoria_Emprendimiento
DELIMITER //
CREATE TRIGGER tg_auditoria_Emprendimiento_insert
AFTER INSERT ON Emprendimiento
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
		@usuario_id, 'INSERT', 'Emprendimiento', NEW.idEmprendimiento, 
		CONCAT('Nuevo emprendimiento aceptado: ', NEW.Nombre, ' con Nro ', NEW.NroProyecto, ' de proyecto'),
		@usuario_ip);
END;
//
DELIMITER ;
-- Trigger Update_Auditoria_Emprendimiento
DELIMITER //
CREATE TRIGGER tg_auditoria_Emprendimiento_update_NroProyecto
BEFORE UPDATE ON Emprendimiento
FOR EACH ROW
BEGIN
    -- 1. Evitar que se modifique el Número de Proyecto
    IF OLD.NroProyecto <> NEW.NroProyecto THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Error: El Número de Proyecto no se puede modificar.';
    END IF;
END;
//
DELIMITER ;
DELIMITER //
CREATE TRIGGER tg_auditoria_Emprendimiento_update
AFTER UPDATE ON Emprendimiento
FOR EACH ROW
BEGIN
    -- 2. Cambio en el nombre o rubro
    IF OLD.Nombre <> NEW.Nombre OR OLD.ActividadPrincipal <> NEW.ActividadPrincipal THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Emprendimiento', NEW.idEmprendimiento, 
			CONCAT('Se cambiaron datos del emprendimiento de: Nombre anterior -> ', OLD.Nombre, ', Nombre actual -> ', NEW.Nombre,
				'. Rubro anterior -> ', LEFT(OLD.ActividadPrincipal, 50), '...', ' Rubro actual -> ', LEFT(NEW.ActividadPrincipal, 50), '...'),
			@usuario_ip);
    END IF;

    -- 3. Cambio de ubicacion
    IF OLD.Calle <> NEW.Calle OR OLD.NúmeroCalle <> NEW.NúmeroCalle OR OLD.Barrio <> NEW.Barrio OR OLD.Departamento <> NEW.Departamento 
    OR OLD.Localidad <> NEW.Localidad OR OLD.UbicaciónGM <> NEW.UbicaciónGM THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Emprendimiento', NEW.idEmprendimiento, 
			CONCAT('MUDANZA/GEOLOCALIZACIÓN: Antigua dirección: ', OLD.Calle, ' ', OLD.NúmeroCalle, ' (', OLD.UbicaciónGM, ') -> Nueva dirección: ',
				NEW.Calle, ' ', NEW.NúmeroCalle, ' (', NEW.UbicaciónGM, ')'), 
			@usuario_ip);
    END IF;

    -- 4. Cambio de Estado Operativo (Controlado por Empleados del Área)
    IF OLD.EnMarcha <> NEW.EnMarcha THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Emprendimiento', NEW.idEmprendimiento,
			CONCAT('Cambio de estado operativo del proyecto: ', CASE WHEN NEW.EnMarcha = 1 THEN 'YA SE ENCUENTRA EN MARCHA' ELSE 'SE DETUVO / EN PAUSA' END), 
			@usuario_ip);
    END IF;
END;
//
DELIMITER ;

-- TRIGGERS DE EMPRENDEDOR - AUDITORIA ----------------------------------------------------------------------------------------------------------------------------------------
-- Trigger Insert_Auditoria_Emprendedor
DELIMITER //
CREATE TRIGGER tg_auditoria_Emprendedor_insert
AFTER INSERT ON Emprendedor
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
		@usuario_id, 'INSERT', 'Emprendedor', NEW.idEmprendedor, 
		CONCAT('Nuevo emprendedor aceptado: ', NEW.Nombre,' ', NEW.Apellido, ' - DNI: ', NEW.DNI, ' asignado al Emprendimiento ID: ', NEW.idEmprendimiento),
		@usuario_ip);
END;
//
DELIMITER ;
-- Trigger UPDATE_auditoria_Emprendedor
DELIMITER //
CREATE TRIGGER tg_auditoria_emprendedor_update
AFTER UPDATE ON Emprendedor
FOR EACH ROW
BEGIN
    -- 1. Cambio de Datos de Identidad (DNI, Nombre, Apellido)
    IF OLD.DNI <> NEW.DNI OR OLD.Nombre <> NEW.Nombre OR OLD.Apellido <> NEW.Apellido THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Emprendedor', NEW.idEmprendedor, 
			CONCAT('Modificacion de datos de identidad: DNI anterior: ', OLD.DNI, ' -> Nuevo DNI: ', NEW.DNI,
				'. Nombre y apellido anterior: ', OLD.Nombre, ' ', OLD.Apellido,  ' -> Nuevo nombre y apellido:', NEW.Nombre, ' ', NEW.Apellido), 
			@usuario_ip);
    END IF;

    -- 2. Cambio de Datos de Contacto 
    IF OLD.Correo <> NEW.Correo OR OLD.Teléfono <> NEW.Teléfono THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Emprendedor', NEW.idEmprendedor, 
			CONCAT('Cambio de contacto de Teléfono', NEW.Teléfono, ' (Anterior', OLD.Teléfono, ')', '. Nuevo Correo: ', NEW.Correo, ' (Anterior', OLD.Correo, ')'), 
			@usuario_ip);
    END IF;
    
    -- 3. Cambio de Datos de Residencia (Domicilio)
    IF OLD.Domicilio <> NEW.Domicilio THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Emprendedor', NEW.idEmprendedor, 
			CONCAT('Cambio de Domicilio a', NEW.Domicilio, ' (Anterior', OLD.Domicilio, ')'), 
			@usuario_ip);
    END IF;
    

    -- 4. Actualización de Antecedentes del Emprendedor
    IF (OLD.Antecedentes IS NULL AND NEW.Antecedentes IS NOT NULL) OR (OLD.Antecedentes <> NEW.Antecedentes) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Emprendedor', NEW.idEmprendedor, 
			CONCAT('Actualización de antecedentes: ', CASE WHEN NEW.Antecedentes = 1 THEN 'Posee experiencia previa de faltas' ELSE 'Sin experiencia de faltas registrada' END), 
			@usuario_ip);
    END IF;
END;
//
DELIMITER ;

-- TRIGGERS DE USUARIO - AUDITORIA ----------------------------------------------------------------------------------------------------------------------------------------
-- Trigger Insert_Auditoria_usuario
DELIMITER //
CREATE TRIGGER tg_auditoria_usuario_insert
AFTER INSERT ON Usuario
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'INSERT', 'Usuario', NEW.idUsuario, 
        CONCAT('Nuevo usuario creado. Rol: "', NEW.TipoUsuario, '" - Correo: ', NEW.Correo,
			CASE 
				WHEN NEW.idEmprendedor IS NOT NULL THEN CONCAT(' - Vinculado a Emprendedor ID: ', NEW.idEmprendedor)
				ELSE CONCAT(' - Vinculado a Empleado ID: ', NEW.idEmpleado)
			END),
        @usuario_ip);
END;
//
DELIMITER ;
-- Trigger Update_Auditoria_usuario
DELIMITER //
CREATE TRIGGER tg_auditoria_usuario_update
AFTER UPDATE ON Usuario
FOR EACH ROW
BEGIN
    -- 1. Verificamos si cambió el estado de activación (Baja/Alta lógica)
    IF OLD.Activa <> NEW.Activa THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Usuario', NEW.idUsuario, 
			CONCAT('Cambio de estado de cuenta para ', NEW.Correo, ': ', 
				CASE WHEN NEW.Activa = 1 THEN 'Cuenta Activada' ELSE 'Cuenta Suspendida/Desactivada' END),
			@usuario_ip);
    END IF;

    -- 2. Verificamos si se le cambió el Tipo de Usuario (Permisos)
    IF OLD.TipoUsuario <> NEW.TipoUsuario THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
            @usuario_id, 'UPDATE', 'Usuario', NEW.idUsuario, 
            CONCAT('Cambio de Rol para ', NEW.Correo, ': ', ' de ', OLD.TipoUsuario, ' a ', NEW.TipoUsuario),
            @usuario_ip);
    END IF;
    
    -- 3. Verificamos si cambió el correo de acceso
    IF OLD.Correo <> NEW.Correo THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Usuario', NEW.idUsuario, 
			CONCAT('Cambio de correo de inicio de sesión: ', OLD.Correo, ' -> ', NEW.Correo),
			@usuario_ip);
    END IF;
    
    -- 4. Verificamos si cambió la contraseña de acceso
    IF OLD.Contraseña <> NEW.Contraseña THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
            @usuario_id, 'UPDATE', 'Usuario', NEW.idUsuario, 
            CONCAT('ALERTA DE SEGURIDAD: El usuario ', NEW.Correo, ' modificó su contraseña de acceso.'),
            @usuario_ip);
    END IF;
END;
//
DELIMITER ;


-- TRIGGERS DE PUBLICACION - AUDITORIA ----------------------------------------------------------------------------------------------------------------------------------------
-- Publicacion (idPublicacion (PK), idEmprendimiento (FK), TituloActual, DescripcionActual, DirectorioFotosActual, TituloPendiente, DescripcionPendiente, DirectorioFotosPendiente, EstadoModeracion, FechaSolicitud, FechaRevision, MotivoRechazo, idEmpleadoModerador (FK))
-- Trigger Insert_Auditoria_Publicacion
DELIMITER //
CREATE TRIGGER tg_auditoria_Publicacion_insert
AFTER INSERT ON Publicacion
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'INSERT', 'Publicacion', NEW.idPublicacion, 
        CONCAT('Emprendedor creó postulación de publicación para Emprendimiento ID: ', NEW.idEmprendimiento, '. Título propuesto: "', NEW.TituloPendiente, '"'),
        @usuario_ip);
END;
//
DELIMITER ;
-- Trigger UPDATE_Auditoria_Publicacion
DELIMITER //
CREATE TRIGGER tg_auditoria_publicacion_update
AFTER UPDATE ON Publicacion
FOR EACH ROW
BEGIN
    -- Escenario 1: El emprendedor edita la publicación y entra en revisión (Estado de 0 o 2 pasa a 1)
    IF NEW.EstadoModeracion = 1 AND OLD.EstadoModeracion <> 1 THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Publicacion', NEW.idPublicacion, 
			CONCAT('El emprendedor solicitó una revisión de contenido. Nuevo título propuesto: "', NEW.TituloPendiente, '"'), 
			@usuario_ip);
    END IF;

    -- Escenario 2: El empleado del Ministerio APRUEBA los cambios (Estado pasa a 0)
    IF NEW.EstadoModeracion = 0 AND OLD.EstadoModeracion = 1 THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Publicacion', NEW.idPublicacion, 
			CONCAT('La Publicacion fue Aprobada por Empleado ID: ', COALESCE(NEW.idEmpleadoModerador, 'N/C'), '. El contenido ya está visible en la web pública.'), 
			@usuario_ip);
    END IF;

    -- Escenario 3: El empleado del Ministerio RECHAZA los cambios (Estado pasa a 2)
    IF NEW.EstadoModeracion = 2 AND OLD.EstadoModeracion = 1 THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Publicacion', NEW.idPublicacion, 
			CONCAT('PUBLICACIÓN RECHAZADA por Empleado ID: ', COALESCE(NEW.idEmpleadoModerador, 'N/C'), '. Motivo: ', COALESCE(NEW.MotivoRechazo, 'No especificado')), 
			@usuario_ip);
    END IF;
END;
//
DELIMITER ;

-- TRIGGERS DE ETIQUETA - AUDITORIA ----------------------------------------------------------------------------------------------------------------------------------------
-- Etiqueta (idEtiqueta, Nombre)
-- Trigger Insert_Auditoria_Etiqueta
DELIMITER //
CREATE TRIGGER tg_auditoria_etiqueta_insert
AFTER INSERT ON Etiqueta
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'INSERT', 'Etiqueta', NEW.idEtiqueta, 
        CONCAT('Nueva etiqueta global añadida al catálogo: "', NEW.Nombre, '"'),
        @usuario_ip
    );
END;
//
DELIMITER ;
-- Trigger UPDATE_Auditoria_Etiqueta
DELIMITER //
CREATE TRIGGER tg_auditoria_etiqueta_update
AFTER UPDATE ON Etiqueta
FOR EACH ROW
BEGIN
    -- 1. Controlar si le cambiaron el nombre a la etiqueta
    IF OLD.Nombre <> NEW.Nombre THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Etiqueta', NEW.idEtiqueta, 
			CONCAT('Se corrigió el nombre de la etiqueta: "', OLD.Nombre, '" -> "', NEW.Nombre, '"'),
			@usuario_ip);
    END IF;

    -- 2. Controlar el Borrado Lógico (Activa / Desactivada)
    IF OLD.Activa <> NEW.Activa THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Etiqueta', NEW.idEtiqueta, 
			CONCAT('Cambio de estado en etiqueta "', NEW.Nombre, '": ', CASE WHEN NEW.Activa = 1 THEN 'DISPONIBLE / ACTIVADA' ELSE 'DESACTIVADA' END),
            @usuario_ip);
    END IF;
END;
//
DELIMITER ;

-- TRIGGERS DE SUBSIDIO - AUDITORIA ----------------------------------------------------------------------------------------------------------------------------------------
-- Subsidio (idSubsidio (PK), PathFormularioSub, monto, FechaRecibido, Aprobado (Si-No), FechaResolucion, MensajeResolucion, PathDirectorioFacturas, FacturasEntregadas (Si-No), FechaFacturasValidadas, PuestaMarchaAcreditada (Si-No), FechaPuestaMarcha, idSolicitudInicio (FK), idEmpleadoRevisor (FK))
-- Trigger Insert_Auditoria_Subsidio
DELIMITER //
CREATE TRIGGER tg_auditoria_Subsidio_insert
AFTER INSERT ON Subsidio
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'INSERT', 'Subsidio', NEW.idSubsidio, 
        CONCAT('Pedido de Subsidio registrado para Solicitud ID: ', NEW.idSolicitudInicio, '. Monto solicitado: $', NEW.monto,
			' Ubicacion del formulario: ' , NEW.PathFormularioSub),
        @usuario_ip);
END;
//
DELIMITER ;
-- Triger UPDATE_auditoria_Subsidio
DELIMITER //
CREATE TRIGGER tg_auditoria_subsidio_update
AFTER UPDATE ON Subsidio
FOR EACH ROW
BEGIN
    -- 1. Resolución del Subsidio (Aprobado/Rechazado)
    IF (OLD.Aprobado IS NULL AND NEW.Aprobado IS NOT NULL) OR (OLD.Aprobado <> NEW.Aprobado) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Subsidio', NEW.idSubsidio, 
			CONCAT('Estado del Subsidio actualizado a: ', CASE WHEN NEW.Aprobado = 1 THEN 'OTORGADO' ELSE 'RECHAZADO' END,
				' - Revisor/Ministro ID: ', COALESCE(NEW.idEmpleadoRevisor, 'N/C')),
			@usuario_ip);
    END IF;

    -- 2. Rendición de Cuentas (Entrega y validación de facturas)
    IF (OLD.FacturasEntregadas IS NULL AND NEW.FacturasEntregadas IS NOT NULL) OR (OLD.FacturasEntregadas <> NEW.FacturasEntregadas) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Subsidio', NEW.idSubsidio, 
			CONCAT('Rendición de facturas: ', CASE WHEN NEW.FacturasEntregadas = 1 THEN 'Entregadas y en revisión' ELSE 'Sin entregar/Retiradas' END), 
            @usuario_ip);
    END IF;

    -- 3. Acreditación de Puesta en Marcha (El inspector fue a ver si el emprendimiento funciona)
    IF (OLD.PuestaMarchaAcreditada IS NULL AND NEW.PuestaMarchaAcreditada IS NOT NULL) OR (OLD.PuestaMarchaAcreditada <> NEW.PuestaMarchaAcreditada) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Subsidio', NEW.idSubsidio, 
			CONCAT('Verificación de campo: Puesta en marcha ', CASE WHEN NEW.PuestaMarchaAcreditada = 1 THEN 'ACREDITADA POSITIVA' ELSE 'NO ACREDITADA' END),
            @usuario_ip);
    END IF;
    
    -- 4. SEGURO DE INTEGRIDAD: Si se cambió el monto
    IF (OLD.monto <> NEW.monto) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Subsidio', NEW.idSubsidio, 
			CONCAT('¡ALERTA DE CONTROL! Alteración de valor económico. Monto anterior: $', OLD.monto, ' -> Nuevo Monto: $', NEW.monto), 
			@usuario_ip);
    END IF;
    
END;
//
DELIMITER ;

-- EJEMPLO DE ATRAPA-TODO
-- Si no entró en ninguno de los IF anteriores, pero la fila cambió en algo...
-- IF (OLD.Aprobado = NEW.Aprobado AND OLD.FacturasEntregadas = NEW.FacturasEntregadas AND OLD.PuestaMarchaAcreditada = NEW.PuestaMarchaAcreditada AND OLD.Monto = NEW.Monto) 
-- AND (OLD.FechaResolucion <> NEW.FechaResolucion OR OLD.idEmpleadoRevisor <> NEW.idEmpleadoRevisor /* etc */) THEN
	-- INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
	-- VALUES (@usuario_id, 'UPDATE', 'Subsidio', NEW.idSubsidio, 'Modificación manual de campos técnicos/fechas secundarias.', @usuario_ip);
-- END IF;

-- TRIGGERS DE CREDITO - AUDITORIA ----------------------------------------------------------------------------------------------------------------------------------------
-- Credito (idCredito (PK), PathFormularioCredito, monto, FechaRecibido, Aprobado (Si-No), FechaResolucion, MensajeResolucion, PathDirectorioFacturas, FacturasEntregadas (Si-No), FechaFacturasValidadas, PuestaMarchaAcreditada (Si-No), FechaPuestaMarcha, idSolicitudInicio (FK), idEmpleadoRevisor (FK))
-- Trigger Insert_Auditoria_Credito
DELIMITER //
CREATE TRIGGER tg_auditoria_Credito_insert
AFTER INSERT ON Credito
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'INSERT', 'Credito', NEW.idCredito, 
        CONCAT('Pedido de Crédito registrado para Solicitud ID: ', NEW.idSolicitudInicio, '. Monto solicitado: $', NEW.monto,
			' Ubicacion del formulario: ' , NEW.PathFormularioCredito),
        @usuario_ip
    );
END;
//
DELIMITER ;
-- Triger UPDATE_auditoria_Credito
DELIMITER //
CREATE TRIGGER tg_auditoria_Credito_update
AFTER UPDATE ON Credito
FOR EACH ROW
BEGIN
    -- 1. Resolución del Credito (Aprobado/Rechazado)
    IF (OLD.Aprobado IS NULL AND NEW.Aprobado IS NOT NULL) OR (OLD.Aprobado <> NEW.Aprobado) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Credito', NEW.idCredito, 
			CONCAT('Estado del Subsidio actualizado a: ', CASE WHEN NEW.Aprobado = 1 THEN 'OTORGADO' ELSE 'RECHAZADO' END,
				' - Revisor/Ministro ID: ', COALESCE(NEW.idEmpleadoRevisor, 'N/C')),
			@usuario_ip);
    END IF;

    -- 2. Rendición de Cuentas (Entrega y validación de facturas)
    IF (OLD.FacturasEntregadas IS NULL AND NEW.FacturasEntregadas IS NOT NULL) OR (OLD.FacturasEntregadas <> NEW.FacturasEntregadas) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Credito', NEW.idCredito, 
			CONCAT('Rendición de facturas: ', CASE WHEN NEW.FacturasEntregadas = 1 THEN 'Entregadas y en revisión' ELSE 'Sin entregar/Retiradas' END), 
            @usuario_ip);
    END IF;

    -- 3. Acreditación de Puesta en Marcha (El inspector fue a ver si el emprendimiento funciona)
    IF (OLD.PuestaMarchaAcreditada IS NULL AND NEW.PuestaMarchaAcreditada IS NOT NULL) OR (OLD.PuestaMarchaAcreditada <> NEW.PuestaMarchaAcreditada) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Credito', NEW.idCredito, 
			CONCAT('Verificación de campo: Puesta en marcha ', CASE WHEN NEW.PuestaMarchaAcreditada = 1 THEN 'ACREDITADA POSITIVA' ELSE 'NO ACREDITADA' END),
            @usuario_ip);
    END IF;
    
        -- 4. SEGURO DE INTEGRIDAD: Si se cambió el monto
    IF (OLD.monto <> NEW.monto) THEN
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
        VALUES (
			@usuario_id, 'UPDATE', 'Credito', NEW.idCredito, 
			CONCAT('¡ALERTA DE CONTROL! Alteración de valor económico. Monto anterior: $', OLD.monto, ' -> Nuevo Monto: $', NEW.monto), 
			@usuario_ip);
    END IF;
END;
//
DELIMITER ;

-- TRIGGERS DE GARANTE - AUDITORIA ----------------------------------------------------------------------------------------------------------------------------------------
-- Trigger Insert_Auditoria_Garante
DELIMITER //
CREATE TRIGGER tg_auditoria_Garante_insert
AFTER INSERT ON Garante
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'INSERT', 'Garante', NEW.idGarante, 
        CONCAT('Se añadió garante: ', NEW.NombreCompleto, ' (DNI: ', NEW.DNI, ') al Crédito ID: ', NEW.idCredito),
        @usuario_ip
    );
END;
//
DELIMITER ;


-- TRIGGERS DE EXPEDIENTE - AUDITORIA ----------------------------------------------------------------------------------------------------------------------------------------
-- Trigger Insert_Auditoria_Expediente
DELIMITER //
CREATE TRIGGER tg_auditoria_expediente_insert
AFTER INSERT ON Expediente
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
    VALUES (
        @usuario_id, 'INSERT', 'Expediente', NEW.idExpediente, 
        CONCAT('Expediente generado para Solicitud ID: ', NEW.idSolicitudInicio, ' por Empleado ID: ', NEW.idEmpleadoCargo),
        @usuario_ip
    );
END;
//
DELIMITER ;
-- Trigger AfterInsert_SolicitudInicio_Expediente
DELIMITER //
CREATE TRIGGER after_expediente_insert
AFTER INSERT ON Expediente
FOR EACH ROW
BEGIN
    -- Cuando se inserta el expediente, actualizamos la solicitud asignándole la fecha del día actual
    UPDATE SolicitudInicio 
    SET FechaRecibidoArea = CURRENT_DATE()
    WHERE idSolicitudInicio = NEW.idSolicitudInicio;
END;
//
DELIMITER ;


