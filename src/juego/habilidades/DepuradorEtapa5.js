export function crearDepuradorEtapa5({ juego, sistemaHabilidades }) {
  const jugador = juego.jugador;

  return Object.freeze({
    obtenerJugador: () => jugador,
    obtenerJuego: () => juego,
    obtenerEstadoBarraHabilidades: () => sistemaHabilidades.obtenerEstadoBarra(),
    obtenerSeleccionHabilidad: () => sistemaHabilidades.obtenerSeleccionDetallada(),
    seleccionarHabilidadPorRanura: (ranuraHumana) =>
      sistemaHabilidades.seleccionarPorRanura(normalizarRanuraHumana(ranuraHumana)),
    fijarSelectorHabilidad: (x, y) => sistemaHabilidades.fijarSelector(x, y),
    moverSelectorHabilidad: (dx, dy) => sistemaHabilidades.moverSelector(dx, dy),
    cancelarHabilidad: () => sistemaHabilidades.cancelar(),
    confirmarHabilidad: () => sistemaHabilidades.confirmar(),
    obtenerUltimaEjecucionHabilidad: () => sistemaHabilidades.obtenerUltimaEjecucion(),
    obtenerEnemigosVivos: () =>
      (Array.isArray(juego.objetivos) ? juego.objetivos : []).filter(
        (objetivo) => !estaDerrotado(objetivo),
      ),
    obtenerInstantaneaEtapa5: () => crearInstantanea({ juego, jugador, sistemaHabilidades }),
    asignarHabilidadARanura: (ranuraHumana, idHabilidad) =>
      sistemaHabilidades.asignarHabilidad(
        normalizarRanuraHumana(ranuraHumana),
        idHabilidad,
      ),
    mejorarHabilidad: (datos) => invocarMejora(jugador, datos),
    registrarExperienciaMaestria: (evento) =>
      invocarRegistroExperiencia(jugador, evento),
    establecerManaActualParaPrueba: (valor) => establecerMana(jugador, valor),
    procesarEfectosPendientes: () => sistemaHabilidades.procesarEfectosPendientes(),
  });
}

export function publicarDepuradorEtapa5(depurador) {
  const base = globalThis.darkMoonDebug;
  const combinado = Object.freeze({
    ...(base && typeof base === "object" ? base : {}),
    ...depurador,
    etapa5: depurador,
  });

  globalThis.darkMoonDebug = combinado;
  globalThis.darkMoonDebugEtapa5 = depurador;
  return combinado;
}

function crearInstantanea({ juego, jugador, sistemaHabilidades }) {
  const resumen = obtenerResumenProgreso(jugador);
  return {
    manaActual: leerNumero(jugador.manaActual ?? jugador.mana),
    manaMaximo: leerNumero(jugador.manaMaximo ?? jugador.manaMaxima),
    tiempoActual: leerNumero(
      typeof juego.tiempoActual === "number"
        ? juego.tiempoActual
        : juego.sistemaTiempo?.tiempoActual,
    ),
    estaEnCombate: Boolean(juego.estaEnCombate),
    experienciaVeneno:
      resumen?.maestrias?.veneno?.experienciaActual ??
      resumen?.maestrias?.veneno?.experiencia ??
      0,
    gradoAguijonToxico:
      resumen?.habilidades?.aguijon_toxico?.grado ??
      sistemaHabilidades.obtenerEstadoBarra().find(
        (ranura) => ranura.idHabilidad === "aguijon_toxico",
      )?.grado ??
      0,
    seleccion: sistemaHabilidades.obtenerSeleccionDetallada(),
    ultimaEjecucion: sistemaHabilidades.obtenerUltimaEjecucion(),
    barra: sistemaHabilidades.obtenerEstadoBarra(),
  };
}

function obtenerResumenProgreso(jugador) {
  const metodos = ["obtenerResumenProgresoMagico", "obtenerResumenMagico"];
  for (const nombre of metodos) {
    if (typeof jugador?.[nombre] === "function") {
      return jugador[nombre]();
    }
  }
  const progreso = jugador.progresoMagico ?? jugador.progresoMagicoJugador;
  return typeof progreso?.obtenerResumen === "function"
    ? progreso.obtenerResumen()
    : null;
}

function invocarMejora(jugador, datos) {
  if (typeof jugador.mejorarHabilidad === "function") {
    return jugador.mejorarHabilidad(datos);
  }
  const progreso = jugador.progresoMagico ?? jugador.progresoMagicoJugador;
  if (typeof progreso?.mejorarHabilidad === "function") {
    return progreso.mejorarHabilidad(datos);
  }
  throw new Error("El jugador no expone mejorarHabilidad.");
}

function invocarRegistroExperiencia(jugador, evento) {
  if (typeof jugador.registrarExperienciaMaestria === "function") {
    return jugador.registrarExperienciaMaestria(evento);
  }
  const progreso = jugador.progresoMagico ?? jugador.progresoMagicoJugador;
  if (typeof progreso?.registrarEjecucionEfectiva === "function") {
    return progreso.registrarEjecucionEfectiva(evento);
  }
  throw new Error("El jugador no expone el registro de XP de maestría.");
}

function establecerMana(jugador, valor) {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error("El Maná de prueba debe ser un número no negativo.");
  }
  if ("manaActual" in jugador) {
    jugador.manaActual = valor;
    return jugador.manaActual;
  }
  if ("mana" in jugador) {
    jugador.mana = valor;
    return jugador.mana;
  }
  throw new Error("El jugador no expone Maná modificable para la prueba.");
}

function normalizarRanuraHumana(valor) {
  if (!Number.isInteger(valor) || valor < 1 || valor > 10) {
    throw new Error("La ranura debe indicarse entre 1 y 10.");
  }
  return valor - 1;
}

function estaDerrotado(objetivo) {
  if (typeof objetivo?.estaDerrotado === "function") {
    return Boolean(objetivo.estaDerrotado());
  }
  return Number.isFinite(objetivo?.vidaActual) ? objetivo.vidaActual <= 0 : false;
}

function leerNumero(valor) {
  return Number.isFinite(valor) ? valor : 0;
}
