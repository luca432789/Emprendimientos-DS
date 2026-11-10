Create database ProyectoEmprendimientos2026;
use ProyectoEmprendimientos2026;
-- drop database ProyectoEmprendimientos2026;

-- -----------------------------------------------------------------------------------------------------------
-- Seccion de DEFINICION de TABLAS --------------------------------------------------------------------------------
-- -----------------------------------------------------------------------------------------------------------
/* Tablas modelo relacional
-- Empleado (idEmpleado (PK), Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo (Mesa de Entrada - Técnico - Social - Administrador), Activo (Si-No))

-- SolicitudInicio (idSolicitudInicio (PK), DireccionPDF, FechaRecibidoMesa, FechaRecibidoArea, EstadoRevisionArea (0: Sin revisar, 1: En proceso, 2: Finalizado), FechaInicioRev, FechaFinRev, idEmpleadoTecRevisor (FK), idEmpleadoSocRevisor (FK), AprobacionArea (si-no), EnvioMinistro (0: Sin enviar, 1: Enviado a ministro, 2: No corresponde), FechaEnvioMinistro, AprobacionMinistro (Si-No), FechaResolucionMin, CargaHistorica)

-- DatosSolicitudInicio (idDatosSolicitudInicio (PK), PersonaNombre, PersonaApellido, PersonaDNI, PersonaDepartamento, PersonaLocalidad, PersonaDomicilio, PersonaTeléfono, PersonaCorreo, EmprendimientoNombre, EmprendimientoCalle, EmprendimientoNroCalle, EmprendimientoBarrio, EmprendimientoDepto, EmprendimientoLocalidad, EmprendimientoActPrincipal, EmprendimientoMarcha, EmprendimientoRubro, EleccionAyuda, EmprendimientoLatitud, EmprendimientoLongitud, idSolicitudInicio (fk))

-- Rubro (idRubro (PK), Nombre, IconoMapa)

-- Emprendimiento (idEmprendimiento (PK), Nombre, NroProyecto, Calle, NúmeroCalle, Barrio, Departamento, Localidad, EnMarcha (Si-No), ActividadPrincipal, Latitud, Longitud, idSolicitudInicio (FK), idRubro (fk))

-- Emprendedor (idEmprendedor (PK), Nombre, Apellido, DNI, Departamento, Localidad, Domicilio, Teléfono, Correo, Antecedentes, DescripcionAntecedente, idEmprendimiento (FK))

-- Usuario (idUsuario (PK), Correo, Contraseña, TipoUsuario ("Empleado de Mesa" - "Empleado de Area" - "Administrador" - "Emprendedor"), Activa (Si-No), Noticiero (Si-No), idEmprendedor (FK), idEmpleado (FK))

-- Publicacion (idPublicacion (PK), idEmprendimiento (FK), TituloActual, DescripcionActual, DirectorioFotosActual, TituloPendiente, DescripcionPendiente, DirectorioFotosPendiente, EstadoModeracion, FechaSolicitud, FechaRevision, MotivoRechazo, idEmpleadoModerador (FK)) -- SERAN 2 POR EMPRENDIMIENTO (MANEJAR POR NODE)

-- Producto (idProducto (PK), idEmprendimiento (FK), Nombre, Precio, Descripcion, PathFoto, Activo (Si-No), FechaAlta)

-- Subsidio (idSubsidio (PK), PathFormularioSub, monto, FechaRecibido, Aprobado (Si-No), FechaResolucion, MensajeResolucion, PathDirectorioFacturas, FacturasEntregadas (Si-No), FechaEntregaFacturas, FechaFacturasValidadas, MotivoObservacionFacturas, PuestaMarchaAcreditada (Si-No), FechaPuestaMarcha, idSolicitudInicio (FK), idEmpleadoRevisor (FK), idEmpleadoFacturas (FK), idEmpleadoPuestaMarcha (FK))

-- Credito (idCredito (PK), PathFormularioCredito, monto, MontoAnterior, FechaRecibido, EstadoRevision, ReenvioSolicitado, ParteReenvio, Aprobado (Si-No), FechaResolucion, MotivoRechazo, MensajeSolicitudReenvio, PathDirectorioFacturas, FacturasEntregadas (Si-No), FechaEntregaFacturas, FechaFacturasValidadas, MotivoObservacionFacturas, PuestaMarchaAcreditada (Si-No), FechaPuestaMarcha, idSolicitudInicio (FK), idEmpleadoRevisor (FK), idEmpleadoFacturas (FK), idEmpleadoPuestaMarcha (FK))

-- Garante (idGarante (PK), NombreCompleto, DNI, Cuil, Telefono, Correo, PathFormularioGarante, idCredito (FK))

-- Expediente (NroExpediente (PK), idSolicitudInicio, FechaCarga, idUsuarioCargo)

-- Auditoria (idLog (PK), idUsuario (FK), Accion, Tabla_Afectada, idRegistroAfectado, Detalle, Fecha_Hora, DirecciónIP)

-- Noticia (idNoticia (PK), Titulo, Contenido, ImagenUrl, Visible (Si-No), idAutor (FK), FechaCreacion, FechaEdicion)

*/

-- ------------------------------------------------------------------------------------------------------------------------
-- Seccion de CREACION de TABLAS -------------------------------------------------------------------------------------------
-- ------------------------------------------------------------------------------------------------------------------------

-- Empleado (idEmpleado (PK), Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo (Mesa de Entrada - Técnico - Social - Administrador), Activo (Si-No))
create table Empleado (
idEmpleado int auto_increment primary key, 
Nombre varchar (30) not null, 
Apellido varchar (30) not null, 
DNI varchar (15) not null unique,-- varchar en caso de DNI extranjeros alfanumericos 
Domicilio varchar(512) not null, 
Teléfono varchar(25) not null, 
Correo varchar(150) not null unique, 
Cargo varchar(25) not null,
Activo boolean not null default True, -- True = activo - False = inactivo
CONSTRAINT chk_CargoEmpleado
	CHECK (Cargo IN ('Mesa de Entrada', 'Técnico', 'Social', 'Administrador')) -- Solo habran esos cargos
);

-- SolicitudInicio (idSolicitudInicio (PK), DireccionPDF, FechaRecibidoMesa, FechaRecibidoArea, EstadoRevisionArea (0: Sin revisar, 1: En proceso, 2: Finalizado), FechaInicioRev, FechaFinRev, idEmpleadoTecRevisor (FK), idEmpleadoSocRevisor (FK), AprobacionArea (si-no), EnvioMinistro (0: Sin enviar, 1: Enviado a ministro, 2: No corresponde), FechaEnvioMinistro, AprobacionMinistro (Si-No), FechaResolucionMin, CargaHistorica)
create table SolicitudInicio (
idSolicitudInicio int auto_increment primary key,
DireccionPDF varchar (1024) not null,
FechaRecibidoMesa date not null default (current_date),

-- Trabajo EmpleadosArea
FechaRecibidoArea date null,
EstadoRevisionArea tinyint default 0, -- 0: Sin revisar, 1: En proceso, 2: Finalizado
FechaInicioRev date null,    -- Cuando el empleado presiona "Comenzar"
FechaFinRev date null,       -- Cuando presiona "Terminar"
idEmpleadoTecRevisor int null,
idEmpleadoSocRevisor int null,
AprobacionArea boolean null,  -- Resultado posterior a visita: 1/true = aceptado
MotivoRechazo varchar(512) null, -- lo que escribió el Área (o el empleado, por el Ministro) al rechazar: también se envía por correo al emprendedor

-- Etapa Final de Solicitud
EnvioMinistro tinyint default 0, -- 0: Sin enviar, 1: Enviado a ministro, 2: No corresponde
FechaEnvioMinistro date null,
AprobacionMinistro boolean null,  -- La respuesta de aprobacion/rechazo del ministro
FechaResolucionMin date null,
MensajeResolucionFinal varchar(512) null, -- Cómo terminó: "Rechazado por el Área", "Rechazado por Subsidio", "Rechazado por Crédito", "Emprendimiento Aprobado por ministro", "Emprendimiento Rechazado por ministro" o el texto del rechazo por falta de formulario (EnvioMinistro = 2)
FechaResolucionFinal date null, -- Día en que quedó finalizada (junto con MensajeResolucionFinal): tras un rechazo, la misma persona puede presentar otra solicitud pasados 7 días
CargaHistorica boolean not null default False, -- True: emprendimiento antiguo cargado directo por un empleado (sin DatosSolicitudInicio ni fechas de revisión)
CONSTRAINT fk_Solicitud_EmpleadoTec
	FOREIGN KEY (idEmpleadoTecRevisor) REFERENCES Empleado(idEmpleado),
CONSTRAINT fk_Solicitud_EmpleadoSoc
	FOREIGN KEY (idEmpleadoSocRevisor) REFERENCES Empleado(idEmpleado)
);

-- DatosSolicitudInicio (idDatosSolicitudInicio (PK), PersonaNombre, PersonaApellido, PersonaDNI, PersonaDepartamento, PersonaLocalidad, PersonaDomicilio, PersonaTeléfono, PersonaCorreo, EmprendimientoNombre, EmprendimientoCalle, EmprendimientoNroCalle, EmprendimientoBarrio, EmprendimientoDepto, EmprendimientoLocalidad, EmprendimientoActPrincipal, EmprendimientoMarcha, EmprendimientoRubro, EleccionAyuda, EmprendimientoLatitud, EmprendimientoLongitud, idSolicitudInicio (fk))
create table DatosSolicitudInicio (
idDatosSolicitudInicio int auto_increment primary key,
PersonaNombre varchar (40) not null, 
PersonaApellido varchar (40) not null, 
PersonaDNI varchar (15) not null,
PersonaDepartamento varchar (20) not null,
PersonaLocalidad varchar (40) not null,
PersonaDomicilio varchar(512) not null,
PersonaTeléfono varchar(25) not null, 
PersonaCorreo varchar(150) not null,
EmprendimientoNombre varchar (50) not null,
EmprendimientoCalle varchar(30) not null,
EmprendimientoNroCalle varchar(6) not null,
EmprendimientoBarrio varchar (50) not null,
EmprendimientoDepto varchar (20) not null,
EmprendimientoLocalidad varchar (40) not null,
EmprendimientoActPrincipal varchar (400) not null,
EmprendimientoMarcha boolean not null default True,
EmprendimientoRubro varchar(150) not null,
EleccionAyuda varchar(10) not null, -- Subsidio o Credito
EmprendimientoLatitud decimal(12, 10) null,
EmprendimientoLongitud decimal(13, 10) null,
idSolicitudInicio int not null unique,
INDEX idx_DatosSolicitud_DNI (PersonaDNI),      -- solicitudes anteriores de la misma persona
INDEX idx_DatosSolicitud_Correo (PersonaCorreo),
CONSTRAINT fk_DatosSolicitud_SolicitudInicio
	FOREIGN KEY (idSolicitudInicio) REFERENCES SolicitudInicio(idSolicitudInicio),
CONSTRAINT chk_EleccionAyuda
	CHECK (EleccionAyuda IN ('Subsidio', 'Credito')) -- Solo se acepta esa ayuda
);

-- Rubro (idRubro (PK), Nombre, IconoMapa)
create table Rubro (
idRubro int auto_increment primary key,
Nombre varchar(50) not null unique, 
IconoMapa varchar(100) not null
);

-- Emprendimiento (idEmprendimiento (PK), Nombre, NroProyecto, Calle, NúmeroCalle, Barrio, Departamento, Localidad, EnMarcha (Si-No), ActividadPrincipal, Latitud, Longitud, idSolicitudInicio (FK), idRubro (fk))
create table Emprendimiento (
idEmprendimiento int auto_increment primary key,
Nombre varchar (50) not null,
NroProyecto varchar(50) unique not null, -- Estructura: año - interior jusn felipe ibarra (codigo de departamento) - numero correlativo
Calle varchar(30) not null,
NúmeroCalle varchar(6) not null,
Barrio varchar (50) not null,
Departamento varchar (20) not null,
Localidad varchar (40) not null,
EnMarcha boolean not null default True, -- True/False - Los empleados lo cambian, no emprendedores.
ActividadPrincipal varchar (400) not null,
Latitud decimal(12, 10), -- Datos necesarios para el mapa/ubicacion
Longitud decimal(13, 10),
idSolicitudInicio int not null,
idRubro int not null,
constraint fk_Emprendimiento_SolicitudI
	FOREIGN KEY (idSolicitudInicio) REFERENCES SolicitudInicio(idSolicitudInicio),
constraint fk_Emprendimiento_Rubro 
	FOREIGN KEY (idRubro) REFERENCES Rubro(idRubro)
);

-- Emprendedor (idEmprendedor (PK), Nombre, Apellido, DNI, Departamento, Localidad, Domicilio, Teléfono, Correo, Antecedentes, DescripcionAntecedente, idEmprendimiento (FK))
create table Emprendedor (
idEmprendedor int auto_increment primary key,
Nombre varchar (40) not null, 
Apellido varchar (40) not null, 
DNI varchar (15) not null unique,
Departamento varchar (20) not null,
Localidad varchar (40) not null,
Domicilio varchar(512) not null,
Teléfono varchar(25) not null, 
Correo varchar(150) not null unique,
Antecedentes boolean null default False, -- (para la futura administración de emprendedores) True: no entregó todas las FACTURAS de LEY en los 30 días desde la aprobación del Ministro
DescripcionAntecedente varchar(512) null, -- detalle del antecedente, lo carga un empleado
idEmprendimiento int not null unique, -- unica para asegurar que cada emprendimiento solo esta conectado con un emprendedor
constraint fk_Emprendedor_Emprendimiento
	FOREIGN KEY (idEmprendimiento) REFERENCES Emprendimiento(idEmprendimiento)
);

-- Usuario (idUsuario (PK), Correo, Contraseña, TipoUsuario ("Empleado de Mesa" - "Empleado de Area" - "Administrador" - "Emprendedor"), Activa (Si-No), Noticiero (Si-No), idEmprendedor (FK), idEmpleado (FK))
create table Usuario (
idUsuario int auto_increment primary key,
Correo varchar(150) not null unique,
Contraseña varchar(255) not null,
TipoUsuario varchar (20) not null, -- ("Empleado de Mesa" - "Empleado de Area" - "Administrador" - "Emprendedor")
Activa boolean not null default True, -- Para el login, verificar si el usuario esta activo (permite o no)
Noticiero boolean not null default False, -- Permiso para crear/editar noticias (solo "Empleado de Area" o "Administrador")
idEmprendedor int null,
idEmpleado int null,
CONSTRAINT chk_TipoUsuario
	CHECK (TipoUsuario IN ('Empleado de Mesa', 'Empleado de Area', 'Administrador', 'Emprendedor')), -- solo carga uno de esos 4 valores
CONSTRAINT fk_Usuario_Emprendedor
	FOREIGN KEY (idEmprendedor) REFERENCES Emprendedor (idEmprendedor),
CONSTRAINT fk_Usuario_Empleado
	FOREIGN KEY (idEmpleado) REFERENCES Empleado (idEmpleado),
CONSTRAINT chk_RelacionUnica_fk
	CHECK (-- check para solo añadir una id (fk) según corresponda y no ambas
		(TipoUsuario = 'Emprendedor' AND idEmprendedor IS NOT NULL AND idEmpleado IS NULL)
        OR
        ((TipoUsuario = 'Empleado de Mesa' OR TipoUsuario = 'Empleado de Area' OR TipoUsuario = 'Administrador') AND idEmpleado IS NOT NULL AND idEmprendedor IS NULL)
        )
);

-- Publicacion (idPublicacion (PK), idEmprendimiento (FK), TituloActual, DescripcionActual, DirectorioFotosActual, TituloPendiente, DescripcionPendiente, DirectorioFotosPendiente, EstadoModeracion, FechaSolicitud, FechaRevision, MotivoRechazo, idEmpleadoModerador (FK))
create table Publicacion (
idPublicacion int auto_increment primary key,
idEmprendimiento int not null, -- MANEJAR POR NODE LA REGLA DE UNICAMENTE 2 PUBLIS

-- Contenido que se muestra actualmente en la web
TituloActual varchar(150) null,
DescripcionActual text null,
DirectorioFotosActual varchar(1024) null,

-- Contenido "en espera" (lo que el emprendedor editó y será revisado)
TituloPendiente varchar(150) null,
DescripcionPendiente text null,
DirectorioFotosPendiente varchar(1024) null,

-- Control de moderación
EstadoModeracion tinyint default 1, -- 0: Sin cambios, 1: Revision pendiente, 2: Rechazado
FechaSolicitud date null,
FechaRevision date null,
MotivoRechazo varchar(512) null,
idEmpleadoModerador int null,
constraint fk_Publicacion_Emprendimiento 
	foreign key (idEmprendimiento) references Emprendimiento(idEmprendimiento),
constraint fk_Publicacion_Empleado 
	foreign key (idEmpleadoModerador) references Empleado(idEmpleado)
);

-- Subsidio (idSubsidio (PK), PathFormularioSub, monto, FechaRecibido, Aprobado (Si-No), FechaResolucion, MensajeResolucion, PathDirectorioFacturas, FacturasEntregadas (Si-No), FechaEntregaFacturas, FechaFacturasValidadas, MotivoObservacionFacturas, PuestaMarchaAcreditada (Si-No), FechaPuestaMarcha, idSolicitudInicio (FK), idEmpleadoRevisor (FK), idEmpleadoFacturas (FK), idEmpleadoPuestaMarcha (FK))
create table Subsidio (
idSubsidio int auto_increment primary key,
PathFormularioSub varchar(1024) not null,
monto decimal (12, 2) not null, 	-- maximo 9.000.000.000,00
MontoAnterior decimal (12, 2) null, -- monto del envío anterior, si el reenvío del formulario trajo un monto distinto
FechaRecibido date not null default (current_date),
EstadoRevision tinyint not null default 0, -- 0: Sin revisar, 1: En proceso, 2: Finalizado (solo con Aprobado en True o False)
ReenvioSolicitado boolean not null default False, -- True: el Área pidió reenviar el formulario (solo así el emprendedor puede reenviarlo); vuelve a False al recibirlo
Aprobado boolean null, 		-- null = sin ver/pendiente, True= Aprobado, False= Rechazado
FechaResolucion date null,
MotivoRechazo varchar(512) null, -- lo que escribió el empleado al rechazar (también se envía por correo al emprendedor)
MensajeSolicitudReenvio varchar(512) null, 		-- Para explicar por qué se solicitó el reenvio de formulario

PathDirectorioFacturas varchar(1024) null, -- null hasta que el emprendedor sube su primera factura; carpeta de las facturas que sube desde su cuenta
FacturasEntregadas boolean null default 0, -- hasta 30 dias desde la aprobación del Ministro. 0: sin entregar (o observadas), 1: enviadas a revisar; validadas = FechaFacturasValidadas
FechaEntregaFacturas date null, -- cuando el emprendedor envió las facturas a revisar
FechaFacturasValidadas date null, -- cuando un empleado validó las facturas entregadas
MotivoObservacionFacturas varchar(512) null, -- si el empleado no las valida: qué debe corregir el emprendedor (FacturasEntregadas vuelve a 0)
PuestaMarchaAcreditada boolean null default 0,-- hasta 90 dias desde la aprobación; la declara un empleado (no el emprendedor)
FechaPuestaMarcha date null,
idSolicitudInicio int not null,
idEmpleadoRevisor int null, -- aprobó o rechazó el formulario
idEmpleadoFacturas int null, -- validó u observó las facturas
idEmpleadoPuestaMarcha int null, -- acreditó la puesta en marcha
CONSTRAINT fk_Subsidio_SolicitudInicio
	FOREIGN KEY (idSolicitudInicio) REFERENCES SolicitudInicio (idSolicitudInicio),
CONSTRAINT fk_Subsidio_EmpleadoRevisor
	FOREIGN KEY (idEmpleadoRevisor) REFERENCES Empleado (idEmpleado),
CONSTRAINT fk_Subsidio_EmpleadoFacturas
	FOREIGN KEY (idEmpleadoFacturas) REFERENCES Empleado (idEmpleado),
CONSTRAINT fk_Subsidio_EmpleadoPuestaMarcha
	FOREIGN KEY (idEmpleadoPuestaMarcha) REFERENCES Empleado (idEmpleado),
-- Check para evitar cargar Fecha de aprovación si Aprobado es null
-- Finalizado solo con resolución, y toda resolución deja el subsidio finalizado
CONSTRAINT chk_estado_revision_sub CHECK (
	(Aprobado IS NULL AND EstadoRevision IN (0, 1)) OR (Aprobado IS NOT NULL AND EstadoRevision = 2)
    ),
CONSTRAINT chk_aprobacion_fecha_sub 
	CHECK (
	((Aprobado = TRUE OR Aprobado = FALSE) AND FechaResolucion IS NOT NULL) OR 
    (Aprobado IS NULL AND FechaResolucion IS NULL)
    ),
-- check para que si Aprobado es null o falso no se carguen las facturas
CONSTRAINT chk_facturas_solo_aprobado_sub CHECK (
	Aprobado = TRUE OR (FacturasEntregadas IS NULL AND PathDirectorioFacturas IS NULL AND FechaFacturasValidadas IS NULL)
    ),
-- check si Aprobado es falso o null las puesta en marcha son null
CONSTRAINT chk_marcha_solo_aprobado_sub CHECK (
	Aprobado = TRUE OR (PuestaMarchaAcreditada IS NULL AND FechaPuestaMarcha IS NULL)
    )
);

-- Credito (idCredito (PK), PathFormularioCredito, monto, MontoAnterior, FechaRecibido, EstadoRevision, ReenvioSolicitado, ParteReenvio, Aprobado (Si-No), FechaResolucion, MotivoRechazo, MensajeSolicitudReenvio, PathDirectorioFacturas, FacturasEntregadas (Si-No), FechaEntregaFacturas, FechaFacturasValidadas, MotivoObservacionFacturas, PuestaMarchaAcreditada (Si-No), FechaPuestaMarcha, idSolicitudInicio (FK), idEmpleadoRevisor (FK), idEmpleadoFacturas (FK), idEmpleadoPuestaMarcha (FK))
-- Mismas columnas de revisión que Subsidio: el emprendedor lo completa con su Nº de expediente y el Área lo revisa
create table Credito (
idCredito int auto_increment primary key,
PathFormularioCredito varchar(1024) not null, -- documento completo: hojas 1 a 7, presupuestos y documentación del garante
monto decimal (12, 2) not null,-- maximo 9.000.000.000,00
MontoAnterior decimal (12, 2) null, -- monto del envío anterior, si el reenvío del formulario trajo un monto distinto
FechaRecibido date not null default (current_date),
EstadoRevision tinyint not null default 0, -- 0: Sin revisar, 1: En proceso, 2: Finalizado (solo con Aprobado en True o False)
ReenvioSolicitado boolean not null default False, -- True: el Área pidió reenviar el formulario (solo así el emprendedor puede reenviarlo); vuelve a False al recibirlo
ParteReenvio enum('Completo', 'Titular', 'Garante') null, -- qué parte se pidió reenviar: todo, solo hojas 1 a 6 y presupuestos, o solo la hoja y documentos del garante
Aprobado boolean null, -- null = sin ver/pendiente, True= Aprobado, False= Rechazado
FechaResolucion date null,
MotivoRechazo varchar(512) null, -- lo que escribió el empleado al rechazar (también se envía por correo al emprendedor)
MensajeSolicitudReenvio varchar(512) null, -- Para explicar por qué se solicitó el reenvio de formulario

PathDirectorioFacturas varchar(1024) null,-- null hasta que el emprendedor sube su primera factura
FacturasEntregadas boolean null default 0, -- hasta 30 dias desde la aprobación del Ministro. 0: sin entregar (o observadas), 1: enviadas a revisar; validadas = FechaFacturasValidadas
FechaEntregaFacturas date null, -- cuando el emprendedor envió las facturas a revisar
FechaFacturasValidadas date null,
MotivoObservacionFacturas varchar(512) null, -- si el empleado no las valida: qué debe corregir el emprendedor (FacturasEntregadas vuelve a 0)
PuestaMarchaAcreditada boolean null default 0,-- hasta 90 dias desde la aprobación
FechaPuestaMarcha date null,
idSolicitudInicio int not null,
idEmpleadoRevisor int null, -- aprobó o rechazó el formulario
idEmpleadoFacturas int null, -- validó u observó las facturas
idEmpleadoPuestaMarcha int null, -- acreditó la puesta en marcha
CONSTRAINT fk_Credito_SolicitudInicio
	FOREIGN KEY (idSolicitudInicio) REFERENCES SolicitudInicio (idSolicitudInicio),
CONSTRAINT fk_Credito_Empleado
	FOREIGN KEY (idEmpleadoRevisor) REFERENCES Empleado (idEmpleado),
CONSTRAINT fk_Credito_EmpleadoFacturas
	FOREIGN KEY (idEmpleadoFacturas) REFERENCES Empleado (idEmpleado),
CONSTRAINT fk_Credito_EmpleadoPuestaMarcha
	FOREIGN KEY (idEmpleadoPuestaMarcha) REFERENCES Empleado (idEmpleado),
-- Check para evitar cargar Fecha de aprovación si Aprobado es null
-- Finalizado solo con resolución, y toda resolución deja el crédito finalizado
CONSTRAINT chk_estado_revision_cred CHECK (
	(Aprobado IS NULL AND EstadoRevision IN (0, 1)) OR (Aprobado IS NOT NULL AND EstadoRevision = 2)
    ),
CONSTRAINT chk_aprobacion_fecha_cred CHECK (
	((Aprobado = TRUE OR Aprobado = FALSE) AND FechaResolucion IS NOT NULL) OR 
    (Aprobado IS NULL AND FechaResolucion IS NULL)
    ),
-- check para que si Aprobado es null o falso no se carguen las facturas
CONSTRAINT chk_facturas_solo_aprobado_cred CHECK (
	Aprobado = TRUE OR (FacturasEntregadas IS NULL AND PathDirectorioFacturas IS NULL AND FechaFacturasValidadas IS NULL)
    ),
-- check si Aprobado es falso o null las puesta en marcha son null
CONSTRAINT chk_marcha_solo_aprobado_cred CHECK (
	Aprobado = TRUE OR (PuestaMarchaAcreditada IS NULL AND FechaPuestaMarcha IS NULL)
    )
);

-- Garante (idGarante (PK), NombreCompleto, DNI, Cuil, Telefono, Correo, PathFormularioGarante, idCredito (FK))
-- Un garante por crédito: el primer envío agrega la fila y cada reenvío la actualiza (el trigger registra qué cambió; no se borra).
-- Si un crédito viejo tiene varias filas, el garante vigente es el de mayor idGarante
create table Garante (
idGarante int auto_increment primary key,
NombreCompleto varchar (70) not null,
DNI varchar (15) not null,
Cuil varchar (11) not null,
Telefono varchar(25) not null,
Correo varchar(150) not null,
-- PDF con la hoja de datos del garante (con su firma) y sus 5 documentos: fotocopia de DNI autenticada, constancia de CUIL,
-- certificado de residencia, boleta de impuesto y recibo de sueldo (el último del mes). También van al final del PathFormularioCredito.
PathFormularioGarante varchar(1024) not null,
idCredito int not null,
CONSTRAINT fk_Garante_Credito
	FOREIGN KEY (idCredito) REFERENCES Credito (idCredito)
);

-- Expediente (idExpediente (PK), NroExpediente, idSolicitudInicio, FechaCarga, idUsuarioCargo)
create table Expediente (
idExpediente int auto_increment primary key,
NroExpediente varchar(50) unique,
idSolicitudInicio int not null unique,
FechaCarga timestamp default current_timestamp,
idUsuarioCargo int not null, -- usuario que cargó el expediente (Mesa de Entrada; en la carga histórica, Área o Administrador)
CONSTRAINT fk_Expediente_SolicitudInicio
	FOREIGN KEY (idSolicitudInicio) REFERENCES SolicitudInicio (idSolicitudInicio),
CONSTRAINT fk_Expediente_Usuario 
	FOREIGN KEY (idUsuarioCargo) REFERENCES Usuario (idUsuario)
);

-- Auditoria (idLog (PK), idUsuario (FK), Accion, Tabla_Afectada, idRegistroAfectado, Detalle, Fecha_Hora, DirecciónIP)
create table Auditoria (
idLog int auto_increment primary key,
idUsuario int null, -- NULL si el sistema hace algo automático
Accion varchar(30) not null, -- EJ: 'INSERT', 'UPDATE', 'DELETE', 'LOGIN'
Tabla_Afectada varchar(100) not null,
idRegistroAfectado int null, -- ID de la fila que se cambió (Ej: idSubsidio 45)
Detalle text not null, -- El "comentario" o descripción de qué cambió
Fecha_Hora timestamp default current_timestamp,
DireccionIP varchar(50) not null -- Para saber desde qué PC se hizo la acción
);

-- Producto (idProducto (PK), idEmprendimiento (FK), Nombre, Precio, Descripcion, PathFoto, Activo (Si-No), FechaAlta)
create table if not exists Producto (
idProducto int auto_increment primary key,
idEmprendimiento int not null,
Nombre varchar(100) not null,
Precio decimal(12, 2) null,             -- null = "Consultar precio"
Descripcion varchar(500) null,
PathFoto varchar(1024) null,            -- ruta web de la foto (ej: /uploads/productos/1/producto-3-xxxx.jpg)
Activo boolean not null default true,   -- false = oculto en el perfil público (la API no borra registros)
FechaAlta date not null default (current_date),
constraint fk_Producto_Emprendimiento
	foreign key (idEmprendimiento) references Emprendimiento(idEmprendimiento)
);

-- NotificacionVista (idUsuario (PK, FK), Clave (PK), FechaVista)
create table if not exists NotificacionVista (
idUsuario int not null,
Clave varchar(150) not null,            -- identifica la notificación (ej: pub-2-0-2026-10-17-votn1f)
FechaVista timestamp not null default current_timestamp,
primary key (idUsuario, Clave),
constraint fk_NotificacionVista_Usuario
	foreign key (idUsuario) references Usuario(idUsuario)
);

-- EnlaceContrasena (idEnlace (PK), idUsuario (FK), TokenHash, Vence, Usado, FechaCreacion)
-- Enlace que se envía por correo al emprendedor aprobado para que cree su contraseña
create table if not exists EnlaceContrasena (
idEnlace int auto_increment primary key,
idUsuario int not null,
TokenHash char(64) not null unique,     -- SHA-256 del código del enlace: el código real solo viaja en el correo
Vence datetime not null,                -- después de esta fecha el enlace ya no sirve
Usado boolean not null default false,   -- cada enlace sirve una sola vez
FechaCreacion timestamp not null default current_timestamp,
constraint fk_EnlaceContrasena_Usuario
	foreign key (idUsuario) references Usuario(idUsuario)
);

-- Noticia (idNoticia (PK), Titulo, Contenido, ImagenUrl, Visible (Si-No), idAutor (FK), FechaCreacion, FechaEdicion)
-- Noticias de la pestaña "Noticias": las publica un usuario con el permiso Noticiero (ver triggers de Noticia)
create table if not exists Noticia (
idNoticia int auto_increment primary key,
Titulo varchar(255) not null,
Contenido text not null,
ImagenUrl varchar(255) null,            -- ruta web de la imagen (ej: /uploads/NoticiasImagen/noticia-1729000000000-1.jpg)
Visible boolean not null default True,  -- false = oculta en la página pública (ej: noticias muy viejas). La API no borra registros
idAutor int not null,                   -- usuario que la publicó
FechaCreacion timestamp not null default current_timestamp,
FechaEdicion timestamp null,            -- la carga el trigger cuando se edita el título, contenido o imagen
constraint fk_Noticia_Autor
	foreign key (idAutor) references Usuario(idUsuario)
);
