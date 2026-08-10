import { obtenerInstante, redondearMilisegundos } from "../../utilidades/TiempoEjecucion.js";
const CANTIDAD_MAXIMA_MUESTRAS = 200;

// Registra tiempos de aplicación sin participar de ninguna regla jugable.
//
// La medición separa:
// - resolución lógica;
// - preparación de la presentación;
// - espera hasta que la presentación queda inactiva;
// - tiempo total hasta recuperar el control.
//
// Las muestras se conservan únicamente en memoria para diagnóstico manual.
export class MedidorFluidezPartida {
  constructor({ cantidadMaximaMuestras = CANTIDAD_MAXIMA_MUESTRAS } = {}) {
    if (
      !Number.isInteger(cantidadMaximaMuestras) ||
      cantidadMaximaMuestras <= 0
    ) {
      throw new Error(
        "MedidorFluidezPartida necesita una cantidad máxima de muestras válida.",
      );
    }

    this.cantidadMaximaMuestras = cantidadMaximaMuestras;
    this.reiniciar();
  }

  reiniciar() {
    this.muestras = [];
    this.entradasDescartadas = 0;
    this.ultimaEntradaDescartada = null;
    this.secuencia = 0;
    return this.obtenerResumen();
  }

  iniciarMuestra({ tipo = "accion", origen = "desconocido", contexto = null } = {}) {
    return {
      id: ++this.secuencia,
      tipo: normalizarTexto(tipo, "accion"),
      origen: normalizarTexto(origen, "desconocido"),
      contexto: copiarContexto(contexto),
      inicioMs: obtenerInstante(),
      finLogicaMs: null,
      finPreparacionMs: null,
      turnoConsumido: false,
      cantidadEventos: 0,
      duracionIaMs: 0,
      duracionPathfindingMs: 0,
      accionesIaProcesadas: 0,
      busquedasPathfinding: 0,
      eventosVisualesGenerados: 0,
      eventosVisualesConservados: 0,
      eventosVisualesDescartados: 0,
      impactosOcultosDescartados: 0,
      transicionesEntradaFov: 0,
      transicionesSalidaFov: 0,
      enemigosVisibles: 0,
      duracionPlanificacionVisualMs: 0,
      duracionFiltradoVisualMs: 0,
      duracionLogicaMs: 0,
      duracionPreparacionMs: 0,
      duracionEsperaVisualMs: 0,
      duracionTotalMs: 0,
      estado: "en_curso",
    };
  }

  registrarFinLogica(muestra, resultado) {
    if (!esMuestraValida(muestra)) {
      return false;
    }

    const instante = obtenerInstante();
    muestra.finLogicaMs = instante;
    muestra.duracionLogicaMs = redondearMilisegundos(
      instante - muestra.inicioMs,
    );
    muestra.turnoConsumido = resultado?.turnoConsumido === true;
    muestra.cantidadEventos = Array.isArray(resultado?.eventos)
      ? resultado.eventos.length
      : 0;
    const diagnostico = resultado?.diagnosticoFluidez ?? null;
    muestra.duracionIaMs = redondearMilisegundos(diagnostico?.duracionIaMs);
    muestra.duracionPathfindingMs = redondearMilisegundos(
      diagnostico?.duracionPathfindingMs,
    );
    muestra.accionesIaProcesadas = normalizarEnteroNoNegativo(
      diagnostico?.accionesIaProcesadas,
    );
    muestra.busquedasPathfinding = normalizarEnteroNoNegativo(
      diagnostico?.busquedasPathfinding,
    );
    return true;
  }

  registrarFinPreparacion(muestra, diagnosticoPresentacion = null) {
    if (!esMuestraValida(muestra)) {
      return false;
    }

    const instante = obtenerInstante();
    const inicioPreparacion = Number.isFinite(muestra.finLogicaMs)
      ? muestra.finLogicaMs
      : muestra.inicioMs;

    muestra.finPreparacionMs = instante;
    muestra.duracionPreparacionMs = redondearMilisegundos(
      instante - inicioPreparacion,
    );
    registrarDiagnosticoPresentacionEnMuestra(
      muestra,
      diagnosticoPresentacion,
    );
    return true;
  }

  completar(
    muestra,
    { estado = "completada", incluirEsperaVisual = true } = {},
  ) {
    if (!esMuestraValida(muestra)) {
      return null;
    }

    const instante = obtenerInstante();
    const inicioEspera = Number.isFinite(muestra.finPreparacionMs)
      ? muestra.finPreparacionMs
      : instante;

    muestra.duracionEsperaVisualMs = incluirEsperaVisual
      ? redondearMilisegundos(Math.max(0, instante - inicioEspera))
      : 0;
    muestra.duracionTotalMs = redondearMilisegundos(
      instante - muestra.inicioMs,
    );
    muestra.estado = normalizarTexto(estado, "completada");

    const muestraFinal = Object.freeze({
      id: muestra.id,
      tipo: muestra.tipo,
      origen: muestra.origen,
      contexto: copiarContexto(muestra.contexto),
      turnoConsumido: muestra.turnoConsumido,
      cantidadEventos: muestra.cantidadEventos,
      duracionIaMs: muestra.duracionIaMs,
      duracionPathfindingMs: muestra.duracionPathfindingMs,
      accionesIaProcesadas: muestra.accionesIaProcesadas,
      busquedasPathfinding: muestra.busquedasPathfinding,
      eventosVisualesGenerados: muestra.eventosVisualesGenerados,
      eventosVisualesConservados: muestra.eventosVisualesConservados,
      eventosVisualesDescartados: muestra.eventosVisualesDescartados,
      impactosOcultosDescartados: muestra.impactosOcultosDescartados,
      transicionesEntradaFov: muestra.transicionesEntradaFov,
      transicionesSalidaFov: muestra.transicionesSalidaFov,
      enemigosVisibles: muestra.enemigosVisibles,
      duracionPlanificacionVisualMs: muestra.duracionPlanificacionVisualMs,
      duracionFiltradoVisualMs: muestra.duracionFiltradoVisualMs,
      duracionLogicaMs: muestra.duracionLogicaMs,
      duracionPreparacionMs: muestra.duracionPreparacionMs,
      duracionEsperaVisualMs: muestra.duracionEsperaVisualMs,
      duracionTotalMs: muestra.duracionTotalMs,
      estado: muestra.estado,
    });

    this.muestras.push(muestraFinal);
    if (this.muestras.length > this.cantidadMaximaMuestras) {
      this.muestras.splice(
        0,
        this.muestras.length - this.cantidadMaximaMuestras,
      );
    }

    return muestraFinal;
  }

  registrarEntradaDescartada({ tipo = "accion", origen = "desconocido", contexto = null } = {}) {
    this.entradasDescartadas += 1;
    this.ultimaEntradaDescartada = Object.freeze({
      tipo: normalizarTexto(tipo, "accion"),
      origen: normalizarTexto(origen, "desconocido"),
      contexto: copiarContexto(contexto),
      instanteMs: redondearMilisegundos(obtenerInstante()),
    });
    return this.entradasDescartadas;
  }

  obtenerResumen() {
    const muestras = this.muestras ?? [];
    const temporales = muestras.filter((muestra) => muestra.turnoConsumido);

    return Object.freeze({
      cantidadMuestras: muestras.length,
      accionesTemporales: temporales.length,
      entradasDescartadas: this.entradasDescartadas ?? 0,
      ultimaEntradaDescartada: this.ultimaEntradaDescartada
        ? { ...this.ultimaEntradaDescartada }
        : null,
      promediosMs: crearResumenTiempos(muestras, calcularPromedio),
      maximosMs: crearResumenTiempos(muestras, calcularMaximo),
      totalesDiagnostico: crearTotalesDiagnostico(muestras),
      ultimasMuestras: muestras.slice(-20).map((muestra) => ({
        ...muestra,
        contexto: copiarContexto(muestra.contexto),
      })),
    });
  }
}

function crearResumenTiempos(muestras, calcular) {
  return Object.freeze({
    logica: calcular(muestras, "duracionLogicaMs"),
    ia: calcular(muestras, "duracionIaMs"),
    pathfinding: calcular(muestras, "duracionPathfindingMs"),
    preparacionPresentacion: calcular(muestras, "duracionPreparacionMs"),
    planificacionVisual: calcular(muestras, "duracionPlanificacionVisualMs"),
    filtradoVisual: calcular(muestras, "duracionFiltradoVisualMs"),
    esperaVisual: calcular(muestras, "duracionEsperaVisualMs"),
    total: calcular(muestras, "duracionTotalMs"),
  });
}

function registrarDiagnosticoPresentacionEnMuestra(muestra, diagnostico) {
  if (!diagnostico || typeof diagnostico !== "object") return;
  muestra.eventosVisualesGenerados = normalizarEnteroNoNegativo(
    diagnostico.eventosVisualesGenerados,
  );
  muestra.eventosVisualesConservados = normalizarEnteroNoNegativo(
    diagnostico.eventosVisualesConservados,
  );
  muestra.eventosVisualesDescartados = normalizarEnteroNoNegativo(
    diagnostico.eventosVisualesDescartados,
  );
  muestra.impactosOcultosDescartados = normalizarEnteroNoNegativo(
    diagnostico.impactosOcultosDescartados,
  );
  muestra.transicionesEntradaFov = normalizarEnteroNoNegativo(
    diagnostico.transicionesEntrada,
  );
  muestra.transicionesSalidaFov = normalizarEnteroNoNegativo(
    diagnostico.transicionesSalida,
  );
  muestra.enemigosVisibles = normalizarEnteroNoNegativo(
    diagnostico.enemigosVisiblesDespues,
  );
  muestra.duracionPlanificacionVisualMs = redondearMilisegundos(
    diagnostico.duracionPlanificacionVisualMs,
  );
  muestra.duracionFiltradoVisualMs = redondearMilisegundos(
    diagnostico.duracionFiltradoVisualMs,
  );
}

function crearTotalesDiagnostico(muestras) {
  const sumar = (propiedad) => muestras.reduce(
    (total, muestra) => total + (Number(muestra[propiedad]) || 0),
    0,
  );
  return Object.freeze({
    accionesIaProcesadas: sumar("accionesIaProcesadas"),
    busquedasPathfinding: sumar("busquedasPathfinding"),
    eventosCanonicos: sumar("cantidadEventos"),
    eventosVisualesGenerados: sumar("eventosVisualesGenerados"),
    eventosVisualesConservados: sumar("eventosVisualesConservados"),
    eventosVisualesDescartados: sumar("eventosVisualesDescartados"),
    impactosOcultosDescartados: sumar("impactosOcultosDescartados"),
    transicionesEntradaFov: sumar("transicionesEntradaFov"),
    transicionesSalidaFov: sumar("transicionesSalidaFov"),
  });
}

function normalizarEnteroNoNegativo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(0, Math.trunc(numero)) : 0;
}

function calcularPromedio(muestras, propiedad) {
  if (muestras.length === 0) {
    return 0;
  }

  const total = muestras.reduce(
    (acumulado, muestra) => acumulado + (muestra[propiedad] ?? 0),
    0,
  );
  return redondearMilisegundos(total / muestras.length);
}

function calcularMaximo(muestras, propiedad) {
  if (muestras.length === 0) {
    return 0;
  }

  return redondearMilisegundos(
    Math.max(...muestras.map((muestra) => muestra[propiedad] ?? 0)),
  );
}

function copiarContexto(contexto) {
  if (!contexto || typeof contexto !== "object" || Array.isArray(contexto)) {
    return null;
  }

  return { ...contexto };
}

function esMuestraValida(muestra) {
  return Boolean(
    muestra &&
      typeof muestra === "object" &&
      Number.isFinite(muestra.inicioMs),
  );
}

function normalizarTexto(valor, respaldo) {
  return typeof valor === "string" && valor.trim() !== ""
    ? valor.trim()
    : respaldo;
}
