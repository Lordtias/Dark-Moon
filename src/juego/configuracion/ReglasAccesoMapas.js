// Centraliza las reglas utilizadas para decidir
// si el jugador puede entrar en una plantilla de mapa.
//
// La configuración distingue:
//
// - nivelDesbloqueo:
//   Nivel mínimo del jugador necesario para acceder.
//
// - niveles.minimo / niveles.maximo:
//   Rango de dificultad que puede seleccionarse
//   una vez desbloqueada la plantilla.

// Evalúa el acceso sin lanzar errores.
//
// El resultado se utiliza tanto por el selector visual
// como por el controlador que genera la mazmorra.
export function evaluarAccesoMapa({ plantilla, nivelJugador } = {}) {
  validarPlantilla(plantilla);

  validarNivelJugador(nivelJugador);

  const nivelDesbloqueo = obtenerNivelDesbloqueoMapa(plantilla);

  const desbloqueada = nivelJugador >= nivelDesbloqueo;

  const nivelesFaltantes = desbloqueada ? 0 : nivelDesbloqueo - nivelJugador;

  return {
    desbloqueada,
    nivelJugador,
    nivelDesbloqueo,
    nivelesFaltantes,

    mensajeBloqueo: desbloqueada
      ? ""
      : crearMensajeBloqueo({
          nivelDesbloqueo,
          nivelesFaltantes,
        }),
  };
}

// Devuelve el nivel de desbloqueo declarado
// explícitamente por la plantilla.
export function obtenerNivelDesbloqueoMapa(plantilla) {
  validarPlantilla(plantilla);

  const nivelDesbloqueo = plantilla.nivelDesbloqueo;

  if (!Number.isInteger(nivelDesbloqueo) || nivelDesbloqueo < 1) {
    throw new Error(
      "El nivel de desbloqueo de una plantilla debe ser " +
        "un entero mayor o igual que 1.",
    );
  }

  return nivelDesbloqueo;
}

// Detiene cualquier intento de acceso inválido.
//
// Esta validación debe ejecutarse aunque la interfaz
// ya haya deshabilitado el botón de entrada.
export function validarAccesoMapa({
  plantilla,
  idMapa = null,
  nivelJugador,
  ignorarNivelDesbloqueo = false,
} = {}) {
  if (typeof ignorarNivelDesbloqueo !== "boolean") {
    throw new Error(
      "La opción para ignorar el nivel de desbloqueo debe ser booleana.",
    );
  }

  if (ignorarNivelDesbloqueo) {
    return {
      desbloqueada: true,
      nivelJugador,

      nivelDesbloqueo: obtenerNivelDesbloqueoMapa(plantilla),

      nivelesFaltantes: 0,
      mensajeBloqueo: "",
      accesoForzado: true,
    };
  }

  const resultado = evaluarAccesoMapa({
    plantilla,
    nivelJugador,
  });

  if (resultado.desbloqueada) {
    return {
      ...resultado,
      accesoForzado: false,
    };
  }

  const nombreMapa = obtenerNombreMapa({
    plantilla,
    idMapa,
  });

  throw new Error(
    `No podés entrar a "${nombreMapa}" con nivel ${nivelJugador}. ` +
      `El mapa requiere nivel ${resultado.nivelDesbloqueo}.`,
  );
}

// Crea una copia de la configuración que contiene
// únicamente las plantillas desbloqueadas.
//
// Se utiliza cuando una expedición aleatoria no especifica
// un ID concreto. Así la selección ponderada nunca puede
// elegir un destino bloqueado durante una partida normal.
export function filtrarConfiguracionMapasAccesibles({
  configuracionMapas,
  nivelJugador,
} = {}) {
  validarConfiguracionMapas(configuracionMapas);

  validarNivelJugador(nivelJugador);

  const plantillas = {};

  for (const [idMapa, plantilla] of Object.entries(
    configuracionMapas.plantillas,
  )) {
    const acceso = evaluarAccesoMapa({
      plantilla,
      nivelJugador,
    });

    if (acceso.desbloqueada) {
      plantillas[idMapa] = plantilla;
    }
  }

  if (Object.keys(plantillas).length === 0) {
    throw new Error(
      `No existen mapas desbloqueados para un jugador de nivel ${nivelJugador}.`,
    );
  }

  return {
    ...configuracionMapas,
    plantillas,
  };
}

// Genera un resumen útil para consola y pruebas.
export function crearResumenAccesoMapas({
  configuracionMapas,
  nivelJugador,
} = {}) {
  validarConfiguracionMapas(configuracionMapas);

  validarNivelJugador(nivelJugador);

  return Object.entries(configuracionMapas.plantillas).map(
    ([idMapa, plantilla]) => ({
      idMapa,

      nombre: plantilla.nombre ?? idMapa,

      nivelJugador,

      nivelDesbloqueo: obtenerNivelDesbloqueoMapa(plantilla),

      nivelMinimo: plantilla.niveles?.minimo ?? null,

      nivelMaximo: plantilla.niveles?.maximo ?? null,

      ...evaluarAccesoMapa({
        plantilla,
        nivelJugador,
      }),
    }),
  );
}

function crearMensajeBloqueo({ nivelDesbloqueo, nivelesFaltantes }) {
  const textoNiveles =
    nivelesFaltantes === 1
      ? "Te falta 1 nivel."
      : `Te faltan ${nivelesFaltantes} niveles.`;

  return `Requiere nivel ${nivelDesbloqueo}. ` + textoNiveles;
}

function obtenerNombreMapa({ plantilla, idMapa }) {
  if (typeof plantilla.nombre === "string" && plantilla.nombre.trim() !== "") {
    return plantilla.nombre.trim();
  }

  if (typeof idMapa === "string" && idMapa.trim() !== "") {
    return idMapa.trim();
  }

  return "mapa desconocido";
}

function validarConfiguracionMapas(configuracionMapas) {
  if (
    configuracionMapas === null ||
    typeof configuracionMapas !== "object" ||
    Array.isArray(configuracionMapas) ||
    configuracionMapas.plantillas === null ||
    typeof configuracionMapas.plantillas !== "object" ||
    Array.isArray(configuracionMapas.plantillas)
  ) {
    throw new Error("Se necesita una configuración válida de mapas.");
  }
}

function validarPlantilla(plantilla) {
  if (
    plantilla === null ||
    typeof plantilla !== "object" ||
    Array.isArray(plantilla)
  ) {
    throw new Error("Se necesita una plantilla de mapa válida.");
  }
}

function validarNivelJugador(nivelJugador) {
  if (!Number.isInteger(nivelJugador) || nivelJugador < 1) {
    throw new Error(
      "El nivel del jugador debe ser un entero mayor o igual que 1.",
    );
  }
}
