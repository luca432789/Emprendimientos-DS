Create database ProyectoEmprendimientos2026;
use ProyectoEmprendimientos2026;
-- drop database ProyectoEmprendimientos2026;
-- select * from usuario;

-- -----------------------------------------------------------------------------------------------------------
-- Seccion de DEFINICION de TABLAS --------------------------------------------------------------------------------
-- -----------------------------------------------------------------------------------------------------------
/* Tablas modelo relacional
-- Empleado (idEmpleado (PK), Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo (Mesa de Entrada - Técnico - Social - Administrador), Activo (Si-No))

-- SolicitudInicio (idSolicitudInicio (PK), DireccionPDF, DirectorioFotos, FechaRecibidoMesa, FechaRecibidoArea, EstadoRevisionArea (0: Sin revisar, 1: En proceso, 2: Finalizado), FechaInicioRev, FechaFinRev, idEmpleadoTecRevisor (FK), idEmpleadoSocRevisor (FK), AprobacionArea (si-no), EnvioMinistro (0: Sin enviar, 1: Enviado a ministro, 2: No corresponde), FechaEnvioMinistro, AprobacionMinistro (Si-No), FechaResolucionMin, CorreoVal)

-- Emprendimiento (idEmprendimiento (PK), Nombre, NroProyecto, Calle, NúmeroCalle, Barrio, Departamento, Localidad, EnMarcha (Si-No), ActividadPrincipal, UbicaciónGM (pluscode), idSolicitudInicio (FK))

-- Emprendedor (idEmprendedor (PK), Nombre, Apellido, DNI, Departamento, Localidad, Domicilio, Teléfono, Correo, Antecedentes, DescripcionAntecedente, idEmprendimiento (FK))

-- Usuario (idUsuario (PK), Correo, Contraseña, TipoUsuario ("Empleado de Mesa" - "Empleado de Area" - "Administrador" - "Emprendedor"), Activa (Si-No), idEmprendedor (FK), idEmpleado (FK))

-- Publicacion (idPublicacion (PK), idEmprendimiento (FK), TituloActual, DescripcionActual, DirectorioFotosActual, TituloPendiente, DescripcionPendiente, DirectorioFotosPendiente, EstadoModeracion, FechaSolicitud, FechaRevision, MotivoRechazo, idEmpleadoModerador (FK)) -- SERAN 2 POR EMPRENDIMIENTO (MANEJAR POR NODE)

-- Etiqueta (idEtiqueta, Nombre, Activa)

-- Publicacion_Etiqueta (idPublicacion, idEtiqueta (pk-fk))

-- Subsidio (idSubsidio (PK), PathFormularioSub, monto, FechaRecibido, Aprobado (Si-No), FechaResolucion, MensajeResolucion, PathDirectorioFacturas, FacturasEntregadas (Si-No), FechaFacturasValidadas, PuestaMarchaAcreditada (Si-No), FechaPuestaMarcha, idSolicitudInicio (FK), idEmpleadoRevisor (FK))

-- Credito (idCredito (PK), PathFormularioCredito, monto, FechaRecibido, Aprobado (Si-No), FechaResolucion, MensajeResolucion, PathDirectorioFacturas, FacturasEntregadas (Si-No), FechaFacturasValidadas, PuestaMarchaAcreditada (Si-No), FechaPuestaMarcha, idSolicitudInicio (FK), idEmpleadoRevisor (FK))

-- Garante (idGarante (PK), NombreCompleto, DNI, Teléfono, Correo, PathFotocopiaDNIautenticada, ConstanciaCuil,  PathCertificadoResidencia, PathBoletaImpuesto, PathCopiaResiboSueldo, idCredito (FK))

-- Expediente (NroExpediente (PK), idSolicitudInicio, FechaCarga, idEmpleadoCargo)

-- Auditoria (idLog (PK), idUsuario (FK), Accion, Tabla_Afectada, idRegistroAfectado, Detalle, Fecha_Hora, DirecciónIP)

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

-- SolicitudInicio (idSolicitudInicio (PK), DireccionPDF, DirectorioFotos, FechaRecibidoMesa, FechaRecibidoArea, EstadoRevisionArea (0: Sin revisar, 1: En proceso, 2: Finalizado), FechaInicioRev, FechaFinRev, idEmpleadoTecRevisor (FK), idEmpleadoSocRevisor (FK), AprobacionArea (si-no), AprobacionMinistro (Si-No), FechaResolucionMin, CorreoVal)
create table SolicitudInicio (
idSolicitudInicio int auto_increment primary key,
DireccionPDF varchar (1024) not null,
DirectorioFotos varchar(1024) not null,
FechaRecibidoMesa date not null default (current_date),

-- Trabajo EmpleadosArea
FechaRecibidoArea date null,
EstadoRevisionArea tinyint default 0, -- 0: Sin revisar, 1: En proceso, 2: Finalizado
FechaInicioRev date null,    -- Cuando el empleado presiona "Comenzar"
FechaFinRev date null,       -- Cuando presiona "Terminar"
idEmpleadoTecRevisor int null,
idEmpleadoSocRevisor int null,
AprobacionArea boolean null,  -- Resultado posterior a visita: 1/true = aceptado

-- Etapa Final de Solicitud
EnvioMinistro tinyint default 0, -- 0: Sin enviar, 1: Enviado a ministro, 2: No corresponde
FechaEnvioMinistro date null,
AprobacionMinistro boolean null,  -- La respuesta de aprobacion/rechazo del ministro
FechaResolucionMin date null,
CorreoVal varchar(512) null,-- comentario del porqué de rechazo || validación con usuario y link de contraseña
CONSTRAINT fk_Solicitud_EmpleadoTec
	FOREIGN KEY (idEmpleadoTecRevisor) REFERENCES Empleado(idEmpleado),
CONSTRAINT fk_Solicitud_EmpleadoSoc
	FOREIGN KEY (idEmpleadoSocRevisor) REFERENCES Empleado(idEmpleado)
);

-- Emprendimiento (idEmprendimiento (PK), Nombre, NroProyecto, Calle, NúmeroCalle, Barrio, Departamento, Localidad, EnMarcha (Si-No), ActividadPrincipal, UbicaciónGM (pluscode), idSolicitudInicio (FK))
create table Emprendimiento (
idEmprendimiento int auto_increment primary key,
Nombre varchar (50) not null,
NroProyecto varchar(50) unique not null, -- Estructura: año - interior jusn felipe ibarra (codigo de departamento) - numero correlativo
Calle varchar(30) not null,
NúmeroCalle int not null,
Barrio varchar (50) not null,
Departamento varchar (20) not null,
Localidad varchar (40) not null,
EnMarcha boolean not null default True, -- True/False - Los empleados lo cambian, no emprendedores.
ActividadPrincipal varchar (400) not null,
UbicaciónGM varchar (30) not null, -- pluscode
idSolicitudInicio int not null,
constraint fk_Emprendimiento_SolicitudI
	FOREIGN KEY (idSolicitudInicio) REFERENCES SolicitudInicio(idSolicitudInicio)
);

-- Emprendedor (idEmprendedor (PK), Nombre, Apellido, DNI, Departamento, Localidad, Domicilio, Teléfono, Correo, Antecedentes, DescripcionAntecedente, idEmprendimiento (FK))
create table Emprendedor (
idEmprendedor int auto_increment primary key,
Nombre varchar (30) not null, 
Apellido varchar (30) not null, 
DNI varchar (15) not null unique,
Departamento varchar (20) not null,
Localidad varchar (40) not null,
Domicilio varchar(512) not null,
Teléfono varchar(25) not null, 
Correo varchar(150) not null unique,
Antecedentes boolean null default False,
DescripcionAntecedente varchar(512) null,
idEmprendimiento int not null unique, -- unica para asegurar que cada emprendimiento solo esta conectado con un emprendedor
constraint fk_Emprendedor_Emprendimiento
	FOREIGN KEY (idEmprendimiento) REFERENCES Emprendimiento(idEmprendimiento)
);

-- Usuario (idUsuario (PK), Correo, Contraseña, TipoUsuario ("Empleado de Mesa" - "Empleado de Area" - "Administrador" - "Emprendedor"), Activa (Si-No), idEmprendedor (FK), idEmpleado (FK))
create table Usuario (
idUsuario int auto_increment primary key,
Correo varchar(150) not null unique,
Contraseña varchar(255) not null,
TipoUsuario varchar (20) not null, -- ("Empleado de Mesa" - "Empleado de Area" - "Administrador" - "Emprendedor")
Activa boolean not null default True, -- Para el login, verificar si el usuario esta activo (permite o no)
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

-- Etiqueta (idEtiqueta, Nombre, Activa)
create table Etiqueta (
idEtiqueta int auto_increment primary key,
Nombre varchar(40) not null unique,
Activa boolean not null default True -- 1: Visible/Usable, 0: Oculta
);

-- Publicacion_Etiqueta (idPublicacion, idEtiqueta (pk-fk))
create table Publicacion_Etiqueta (
idPublicacion int not null,
idEtiqueta int not null,
primary key (idPublicacion, idEtiqueta), -- Clave primaria compuesta para evitar duplicados
constraint fk_PE_Publicacion foreign key (idPublicacion) references Publicacion(idPublicacion) on delete cascade,
constraint fk_PE_Etiqueta foreign key (idEtiqueta) references Etiqueta(idEtiqueta) on delete cascade
);

-- Subsidio (idSubsidio (PK), PathFormularioSub, monto, FechaRecibido, Aprobado (Si-No), FechaResolucion, MensajeResolucion, PathDirectorioFacturas, FacturasEntregadas (Si-No), FechaFacturasValidadas, PuestaMarchaAcreditada (Si-No), FechaPuestaMarcha, idSolicitudInicio (FK), idEmpleadoRevisor (FK))
create table Subsidio (
idSubsidio int auto_increment primary key,
PathFormularioSub varchar(1024) not null,
monto decimal (12, 2) not null, 	-- maximo 9.000.000.000,00
FechaRecibido date not null default (current_date),
Aprobado boolean null, 		-- null = sin ver/pendiente, True= Aprobado, False= Rechazado
FechaResolucion date null,
MensajeResolucion varchar(512) null, 		-- Para explicar por qué se rechazó o notas de la aprobación
PathDirectorioFacturas varchar(1024) null, -- null hasta que se apruebe el subsidio
FacturasEntregadas boolean null default 0, -- hasta 30 dias desde la parobación  -- CAMBIAR A TINYINT? Emprendedor entrega todas las facturas = 1 (entregadas y en revision), 2= Validadas - 3 = no validadas?
FechaFacturasValidadas date null,
PuestaMarchaAcreditada boolean null default 0,-- hasta 90 dias desde la aprobación
FechaPuestaMarcha date null,
idSolicitudInicio int not null,
idEmpleadoRevisor int null,
CONSTRAINT fk_Subsidio_SolicitudInicio
	FOREIGN KEY (idSolicitudInicio) REFERENCES SolicitudInicio (idSolicitudInicio),
CONSTRAINT fk_Subsidio_EmpleadoRevisor
	FOREIGN KEY (idEmpleadoRevisor) REFERENCES Empleado (idEmpleado),
-- Check para evitar cargar Fecha de aprovación si Aprobado es null
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

-- Credito (idCredito (PK), PathFormularioCredito, monto, FechaRecibido, Aprobado (Si-No), FechaResolucion, MensajeResolucion, PathDirectorioFacturas, FacturasEntregadas (Si-No), FechaFacturasValidadas, PuestaMarchaAcreditada (Si-No), FechaPuestaMarcha, idSolicitudInicio (FK), idEmpleadoRevisor (FK))
create table Credito (
idCredito int auto_increment primary key,
PathFormularioCredito varchar(1024) not null,
monto decimal (12, 2) not null,-- maximo 9.000.000.000,00
FechaRecibido date not null,
Aprobado boolean null, -- null = sin ver/pendiente, True= Aprobado, False= Rechazado
FechaResolucion date null,
MensajeResolucion varchar(512) null, -- Para explicar por qué se rechazó o notas de la aprobación
PathDirectorioFacturas varchar(1024) null,-- null hasta que se apruebe el credito
FacturasEntregadas boolean null default 0, -- hasta 30 dias desde la parobación
FechaFacturasValidadas date null,
PuestaMarchaAcreditada boolean null default 0,-- hasta 90 dias desde la aprobación
FechaPuestaMarcha date null,
idSolicitudInicio int not null,
idEmpleadoRevisor int null,
CONSTRAINT fk_Credito_SolicitudInicio
	FOREIGN KEY (idSolicitudInicio) REFERENCES SolicitudInicio (idSolicitudInicio),
CONSTRAINT fk_Credito_Empleado
	FOREIGN KEY (idEmpleadoRevisor) REFERENCES Empleado (idEmpleado),
-- Check para evitar cargar Fecha de aprovación si Aprobado es null
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

-- Garante (idGarante (PK), NombreCompleto, DNI, Teléfono, Correo, PathFotocopiaDNIautenticada, ConstanciaCuil,  PathCertificadoResidencia, PathBoletaImpuesto, PathCopiaResiboSueldo, idCredito (FK))
create table Garante (
idGarante int auto_increment primary key,
NombreCompleto varchar (70) not null, 
DNI varchar (15) not null,
Teléfono varchar(25) not null, 
Correo varchar(150) not null, 
PathFotocopiaDNIautenticada varchar(1024) not null,
ConstanciaCuil varchar(1024) not null,
PathCertificadoResidencia varchar(1024) not null,
PathBoletaImpuesto varchar(1024) not null,
PathCopiaResiboSueldo varchar(1024) not null, -- El ultimo del mes
idCredito int not null,
CONSTRAINT fk_Garante_Credito
	FOREIGN KEY (idCredito) REFERENCES Credito (idCredito)
);

-- Expediente (NroExpediente (PK), idSolicitudInicio, FechaCarga, idEmpleadoCargo)
create table Expediente (
idExpediente int auto_increment primary key,
NroExpediente varchar(50) unique,
idSolicitudInicio int not null unique,
FechaCarga timestamp default current_timestamp,
idEmpleadoCargo int not null, -- cargo = Mesa de Entrada
CONSTRAINT fk_Expediente_SolicitudInicio
	FOREIGN KEY (idSolicitudInicio) REFERENCES SolicitudInicio (idSolicitudInicio),
CONSTRAINT fk_Expediente_Usuario 
FOREIGN KEY (idEmpleadoCargo) REFERENCES Usuario (idUsuario)
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

