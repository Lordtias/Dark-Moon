import {
  guardarConfiguracionBarraHabilidades,
  leerConfiguracionBarraHabilidades,
  eliminarConfiguracionBarraHabilidades,
} from "./PersistenciaBarraHabilidades.js";

export function crearDepuradorEtapa7({
  juego,
  sistemaHabilidades,
  panel,
  configuracionProgreso,
  configuracionEjecucion,
  guardarBarra,
} = {}) {
  const jugador = juego?.jugador ?? juego?.player;
  if (!jugador || !sistemaHabilidades || !panel) {
    throw new Error("El depurador de ETAPA 7 necesita una integración activa.");
  }

  return Object.freeze({
    obtenerJugador: () => jugador,
    obtenerJuego: () => juego,
    abrirPanel: () => panel.abrir(),
    cerrarPanel: () => panel.cerrar(),
    obtenerResumenEtapa7: () => ({
      progreso: obtenerResumen(jugador),
      barra: sistemaHabilidades.obtenerEstadoBarra(),
      panelAbierto: panel.estaAbierto(),
      seccionesFuturas: {
        basicas: [],
        armas: "En construcción",
        armaduras: ["liviana", "media", "pesada"],
      },
    }),
    obtenerResumenProgresoMagico: () => obtenerResumen(jugador),
    agregarPuntosUniversalesParaPrueba: (cantidad) =>
      obtenerProgreso(jugador).agregarPuntosUniversales(cantidad),
    agregarExperienciaMaestriaParaPrueba: (datos) =>
      obtenerProgreso(jugador).agregarExperienciaMaestria(datos),
    mejorarHabilidadParaPrueba: (datos) =>
      obtenerProgreso(jugador).mejorarHabilidad(datos),
    registrarExperienciaMaestriaParaPrueba: (evento) =>
      obtenerProgreso(jugador).registrarEjecucionEfectiva(evento),
    obtenerUltimaEjecucionHabilidad: () =>
      sistemaHabilidades.obtenerUltimaEjecucion(),
    asignarHabilidadARanura: (ranuraHumana, idHabilidad) => {
      const resultado = sistemaHabilidades.asignarHabilidad(
        normalizarRanuraHumana(ranuraHumana),
        idHabilidad,
      );
      guardarBarra();
      panel.renderizar();
      return resultado;
    },
    desasignarRanura: (ranuraHumana) => {
      const resultado = sistemaHabilidades.desasignarHabilidad(
        normalizarRanuraHumana(ranuraHumana),
      );
      guardarBarra();
      panel.renderizar();
      return resultado;
    },
    vaciarBarra: () => {
      const resultado = sistemaHabilidades.vaciarBarra();
      guardarBarra();
      panel.renderizar();
      return resultado;
    },
    guardarBarra,
    leerBarraGuardada: () => leerConfiguracionBarraHabilidades(),
    eliminarBarraGuardada: () => eliminarConfiguracionBarraHabilidades(),
    validarEtapa7: () =>
      validarContratos({
        jugador,
        sistemaHabilidades,
        configuracionProgreso,
        configuracionEjecucion,
      }),
  });
}

export function publicarDepuradorEtapa7(depurador) {
  const base = globalThis.darkMoonDebug;
  const combinado = Object.freeze({
    ...(base && typeof base === "object" ? base : {}),
    ...depurador,
    etapa7: depurador,
  });
  globalThis.darkMoonDebug = combinado;
  globalThis.darkMoonDebugEtapa7 = depurador;
  return combinado;
}

function validarContratos({
  jugador,
  sistemaHabilidades,
  configuracionProgreso,
  configuracionEjecucion,
}) {
  const comprobaciones = [];
  const idsMaestrias = Object.keys(configuracionProgreso.maestrias);
  const habilidades = Object.values(configuracionProgreso.habilidades);
  comprobar(
    comprobaciones,
    "Existen las cuatro maestrías mágicas",
    ["fuego", "frio", "rayo", "veneno"].every((id) => idsMaestrias.includes(id)) &&
      idsMaestrias.length === 4,
    idsMaestrias,
  );
  comprobar(
    comprobaciones,
    "Existen doce habilidades",
    habilidades.length === 12,
    habilidades.length,
  );
  for (const idMaestria of idsMaestrias) {
    const requisitos = habilidades
      .filter((habilidad) => habilidad.maestria === idMaestria)
      .map((habilidad) => habilidad.requisitoNivelMaestria)
      .sort((a, b) => a - b);
    const maximos = habilidades
      .filter((habilidad) => habilidad.maestria === idMaestria)
      .map((habilidad) => habilidad.gradoMaximo)
      .sort((a, b) => b - a);
    comprobar(
      comprobaciones,
      `${idMaestria}: requisitos 0/3/6`,
      JSON.stringify(requisitos) === JSON.stringify([0, 3, 6]),
      requisitos,
    );
    comprobar(
      comprobaciones,
      `${idMaestria}: grados máximos 4/3/3`,
      JSON.stringify(maximos) === JSON.stringify([4, 3, 3]),
      maximos,
    );
  }

  const barraOriginal = sistemaHabilidades.obtenerAsignaciones();
  const idsAsignados = barraOriginal.filter(Boolean);
  comprobar(
    comprobaciones,
    "La barra contiene diez ranuras",
    barraOriginal.length === 10,
    barraOriginal.length,
  );
  comprobar(
    comprobaciones,
    "No hay habilidades duplicadas en la barra",
    new Set(idsAsignados).size === idsAsignados.length,
    idsAsignados,
  );
  comprobar(
    comprobaciones,
    "Toda habilidad asignada está aprendida y es jugable",
    idsAsignados.every(
      (id) =>
        configuracionEjecucion.habilidades[id]?.ejecucion &&
        obtenerGrado(jugador, id) > 0,
    ),
    idsAsignados,
  );

  // Comprueba que consultar la barra no vuelva a completarla automáticamente.
  let luegoDeConsultar = [];
  try {
    sistemaHabilidades.vaciarBarra();
    luegoDeConsultar = sistemaHabilidades.obtenerEstadoBarra();
    comprobar(
      comprobaciones,
      "Una barra vacía permanece vacía al consultarla",
      luegoDeConsultar.every((ranura) => ranura.idHabilidad === null),
      luegoDeConsultar.map((ranura) => ranura.idHabilidad),
    );
  } finally {
    sistemaHabilidades.restaurarBarra(barraOriginal);
  }

  const almacenamiento = crearAlmacenamientoMemoria();
  guardarConfiguracionBarraHabilidades({
    ranuras: barraOriginal,
    almacenamiento,
  });
  const restaurada = leerConfiguracionBarraHabilidades({ almacenamiento });
  comprobar(
    comprobaciones,
    "La persistencia de barra conserva las diez ranuras",
    JSON.stringify(restaurada.ranuras) === JSON.stringify(barraOriginal),
    restaurada.ranuras,
  );

  return {
    exito: comprobaciones.every((comprobacion) => comprobacion.exito),
    aprobadas: comprobaciones.filter((comprobacion) => comprobacion.exito).length,
    total: comprobaciones.length,
    comprobaciones,
  };
}

function obtenerResumen(jugador) {
  if (typeof jugador.obtenerResumenProgresoMagico === "function") {
    return jugador.obtenerResumenProgresoMagico();
  }
  return (jugador.progresoMagico ?? jugador.progresoMagicoJugador).obtenerResumen();
}

function obtenerProgreso(jugador) {
  const progreso = jugador.progresoMagico ?? jugador.progresoMagicoJugador;
  if (!progreso || typeof progreso.obtenerResumen !== "function") {
    throw new Error("El jugador no expone ProgresoMagicoJugador.");
  }
  return progreso;
}

function obtenerGrado(jugador, idHabilidad) {
  if (typeof jugador.obtenerGradoHabilidad === "function") {
    return jugador.obtenerGradoHabilidad(idHabilidad);
  }
  return (jugador.progresoMagico ?? jugador.progresoMagicoJugador)
    .obtenerGradoHabilidad(idHabilidad);
}

function normalizarRanuraHumana(valor) {
  if (!Number.isInteger(valor) || valor < 1 || valor > 10) {
    throw new Error("La ranura debe indicarse entre 1 y 10.");
  }
  return valor - 1;
}

function comprobar(lista, nombre, condicion, valor) {
  lista.push({ nombre, exito: Boolean(condicion), valor });
}

function crearAlmacenamientoMemoria() {
  const datos = new Map();
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
  };
}
