import { evaluarAtaqueCasilla } from "../combate/SistemaAlcanceAtaque.js";
import { TIPOS_ACCION_TEMPORAL } from "../tiempo/SistemaTiempo.js";
import {
  asignarHabilidadARanura,
  generarIdEjecucionHabilidad,
  obtenerAsignacionesHabilidades,
  obtenerUltimaEjecucion,
  registrarUltimaEjecucion,
} from "./EstadoSesionHabilidades.js";
import {
  configurarTiradasDeterministasHabilidad,
  obtenerContextoPotenciaHabilidad,
  obtenerEstadoTiradasDeterministasHabilidad,
  resolverDanioHabilidad,
  restaurarTiradasAleatoriasHabilidad,
} from "./MotorDanioHabilidad.js";
import {
  aplicarEfectosHabilidad,
  prepararEfectosHabilidad,
  validarDisponibilidadEfectosHabilidad,
} from "./MotorEfectosHabilidad.js";
import { validarBarraContraJugador } from "./PersistenciaBarraHabilidades.js";

const MOTIVOS = Object.freeze({
  OK: "OK",
  RANURA_VACIA: "RANURA_VACIA",
  HABILIDAD_DESCONOCIDA: "HABILIDAD_DESCONOCIDA",
  HABILIDAD_NO_CONFIGURADA: "HABILIDAD_NO_CONFIGURADA",
  HABILIDAD_NO_APRENDIDA: "HABILIDAD_NO_APRENDIDA",
  OBJETIVO_INVALIDO: "OBJETIVO_INVALIDO",
  FUERA_DE_ALCANCE: "FUERA_DE_ALCANCE",
  PATRON_INVALIDO: "PATRON_INVALIDO",
  LINEA_VISION_BLOQUEADA: "LINEA_VISION_BLOQUEADA",
  MANA_INSUFICIENTE: "MANA_INSUFICIENTE",
  BLOQUEO_TEMPORAL: "BLOQUEO_TEMPORAL",
  MODO_INTERACCION_ACTIVO: "MODO_INTERACCION_ACTIVO",
  CANCELADA: "CANCELADA",
  ERROR_EJECUCION: "ERROR_EJECUCION",
});

export class SistemaHabilidadesJugador {
  constructor({ juego, configuracionEjecucion }) {
    if (!juego?.jugador || !juego?.mapa) {
      throw new Error("El sistema de habilidades necesita un Juego activo.");
    }
    if (!configuracionEjecucion?.habilidades) {
      throw new Error("Falta la configuración de ejecución de habilidades.");
    }
    this.juego = juego;
    this.jugador = juego.jugador;
    this.configuracion = configuracionEjecucion;
    this.seleccion = null;
    this.oyentesCambio = new Set();
    this.destruido = false;
  }

  get modoHabilidad() {
    return Boolean(this.seleccion);
  }

  get selectorHabilidad() {
    return this.seleccion ? { x: this.seleccion.x, y: this.seleccion.y } : null;
  }

  obtenerEstadoBarra() {
    const asignaciones = obtenerAsignacionesHabilidades(this.jugador);
    return asignaciones.map((idHabilidad, indice) => {
      const habilidad = idHabilidad
        ? this.configuracion.habilidades[idHabilidad]
        : null;
      const grado = habilidad ? this.obtenerGrado(idHabilidad) : 0;
      const gradoConfig = habilidad?.ejecucion?.grados?.[grado] ?? null;
      const manaActual = leerManaActual(this.jugador);
      return {
        indice,
        tecla: indice === 9 ? "0" : String(indice + 1),
        idHabilidad,
        nombre: habilidad?.nombre ?? "",
        icono: habilidad?.icono ?? null,
        descripcion: habilidad?.descripcion ?? "",
        grado,
        configurada: Boolean(habilidad?.ejecucion),
        costoMana: gradoConfig?.costoMana ?? null,
        manaSuficiente: gradoConfig
          ? manaActual >= gradoConfig.costoMana
          : false,
        seleccionada: this.seleccion?.indiceRanura === indice,
      };
    });
  }

  obtenerAsignaciones() {
    return obtenerAsignacionesHabilidades(this.jugador);
  }

  restaurarBarra(ranuras) {
    const validadas = validarBarraContraJugador({
      ranuras,
      habilidades: this.configuracion.habilidades,
      obtenerGrado: (idHabilidad) => this.obtenerGrado(idHabilidad),
    });
    for (let indice = 0; indice < 10; indice += 1) {
      asignarHabilidadARanura(this.jugador, indice, null);
    }
    validadas.forEach((idHabilidad, indice) => {
      if (idHabilidad !== null) {
        asignarHabilidadARanura(this.jugador, indice, idHabilidad);
      }
    });
    this.emitirCambio();
    return this.obtenerEstadoBarra();
  }

  vaciarBarra() {
    if (this.modoHabilidad) this.cancelar();
    for (let indice = 0; indice < 10; indice += 1) {
      asignarHabilidadARanura(this.jugador, indice, null);
    }
    this.emitirCambio();
    return this.obtenerEstadoBarra();
  }

  desasignarHabilidad(indiceRanura) {
    validarIndiceRanura(indiceRanura);
    if (this.seleccion?.indiceRanura === indiceRanura) this.seleccion = null;
    asignarHabilidadARanura(this.jugador, indiceRanura, null);
    this.emitirCambio();
    return this.obtenerEstadoBarra();
  }

  asignarHabilidad(indiceRanura, idHabilidad) {
    validarIndiceRanura(indiceRanura);
    const habilidad = this.configuracion.habilidades[idHabilidad];
    if (!habilidad) {
      throw new Error(`La habilidad "${idHabilidad}" no existe.`);
    }
    if (!habilidad.ejecucion) {
      throw new Error(`La habilidad "${idHabilidad}" todavía no es jugable.`);
    }
    if (this.obtenerGrado(idHabilidad) <= 0) {
      throw new Error(`La habilidad "${idHabilidad}" todavía no fue aprendida.`);
    }
    asignarHabilidadARanura(this.jugador, indiceRanura, idHabilidad);
    this.emitirCambio();
    return this.obtenerEstadoBarra();
  }

  seleccionarPorRanura(indiceRanura) {
    if (this.destruido) {
      return crearRechazo(MOTIVOS.CANCELADA, "La integración ya fue destruida.");
    }
    const bloqueo = this.validarBloqueosDeSeleccion();
    if (bloqueo) return bloqueo;
    const estadoRanura = this.obtenerEstadoBarra()[indiceRanura];
    if (!estadoRanura?.idHabilidad) {
      return crearRechazo(MOTIVOS.RANURA_VACIA, "La ranura está vacía.");
    }
    const habilidad = this.configuracion.habilidades[estadoRanura.idHabilidad];
    if (!habilidad) {
      return crearRechazo(
        MOTIVOS.HABILIDAD_DESCONOCIDA,
        "La habilidad asignada no existe.",
      );
    }
    if (!habilidad.ejecucion) {
      return crearRechazo(
        MOTIVOS.HABILIDAD_NO_CONFIGURADA,
        "La habilidad todavía no posee ejecución jugable.",
      );
    }
    const grado = this.obtenerGrado(habilidad.id);
    if (grado <= 0) {
      return crearRechazo(
        MOTIVOS.HABILIDAD_NO_APRENDIDA,
        "La habilidad todavía no fue aprendida.",
      );
    }
    this.cancelarAtaqueFisico();
    const puntoInicial = this.obtenerPuntoInicial(habilidad, grado);
    this.seleccion = {
      indiceRanura,
      idHabilidad: habilidad.id,
      grado,
      x: puntoInicial.x,
      y: puntoInicial.y,
    };
    this.emitirCambio();
    return {
      exito: true,
      motivo: MOTIVOS.OK,
      mensaje: `${habilidad.nombre} grado ${grado} seleccionada.`,
      turnoConsumido: false,
      redibujar: true,
      seleccion: this.obtenerSeleccionDetallada(),
    };
  }

  moverSelector(dx, dy) {
    if (!this.seleccion) {
      return crearRechazo(
        MOTIVOS.CANCELADA,
        "No hay una habilidad seleccionada.",
      );
    }
    if (
      !Number.isInteger(dx) ||
      !Number.isInteger(dy) ||
      (dx === 0 && dy === 0)
    ) {
      return crearRechazo(
        MOTIVOS.OBJETIVO_INVALIDO,
        "El desplazamiento es inválido.",
      );
    }
    const limites = obtenerLimitesMapa(this.juego.mapa);
    this.seleccion.x = limitar(this.seleccion.x + dx, 0, limites.ancho - 1);
    this.seleccion.y = limitar(this.seleccion.y + dy, 0, limites.alto - 1);
    this.emitirCambio();
    return {
      exito: true,
      motivo: MOTIVOS.OK,
      mensaje: "Selector de habilidad desplazado.",
      turnoConsumido: false,
      redibujar: true,
      seleccion: this.obtenerSeleccionDetallada(),
    };
  }

  fijarSelector(x, y) {
    if (!this.seleccion) {
      return crearRechazo(
        MOTIVOS.CANCELADA,
        "No hay una habilidad seleccionada.",
      );
    }
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      return crearRechazo(MOTIVOS.OBJETIVO_INVALIDO, "La casilla es inválida.");
    }
    const limites = obtenerLimitesMapa(this.juego.mapa);
    this.seleccion.x = limitar(x, 0, limites.ancho - 1);
    this.seleccion.y = limitar(y, 0, limites.alto - 1);
    this.emitirCambio();
    return this.obtenerSeleccionDetallada();
  }

  cancelar() {
    const habiaSeleccion = Boolean(this.seleccion);
    this.seleccion = null;
    this.emitirCambio();
    return crearRechazo(
      MOTIVOS.CANCELADA,
      habiaSeleccion
        ? "Selección de habilidad cancelada."
        : "No había una habilidad seleccionada.",
    );
  }

  confirmar() {
    if (!this.seleccion) {
      return crearRechazo(
        MOTIVOS.CANCELADA,
        "No hay una habilidad seleccionada.",
      );
    }
    const plan = this.prepararPlanEjecucion();
    if (!plan.exito) return plan;

    const manaAntes = leerManaActual(this.jugador);
    const idEjecucion = generarIdEjecucionHabilidad(this.jugador);
    let faseIrreversible = false;
    try {
      consumirMana(this.jugador, plan.costoMana);
      const manaDespues = leerManaActual(this.jugador);
      const manaConsumido = Math.max(0, manaAntes - manaDespues);
      if (manaConsumido !== plan.costoMana) {
        restaurarMana(this.jugador, manaAntes);
        return crearRechazo(
          MOTIVOS.MANA_INSUFICIENTE,
          "No fue posible descontar el Maná completo de forma atómica.",
        );
      }

      faseIrreversible = true;
      if (plan.habilidad.ejecucion.hostil) {
        registrarHostilidad(this.juego, plan.objetivo);
      }
      const danio = resolverDanioHabilidad({
        lanzador: this.jugador,
        objetivo: plan.objetivo,
        componentesConfigurados: plan.gradoConfig.danio,
        contextoPotencia: plan.contextoPotencia,
        idEjecucion,
      });
      const efectos =
        danio.impacto && !danio.objetivoDerrotado
          ? aplicarEfectosHabilidad({
              juego: this.juego,
              lanzador: this.jugador,
              objetivo: plan.objetivo,
              efectosConfigurados: plan.gradoConfig.efectos,
              definicionesPreparadas: plan.definicionesEfectos,
              contextoPotencia: plan.contextoPotencia,
              idEjecucion,
            })
          : [];
      const mensaje = danio.impacto
        ? `${plan.habilidad.nombre} impacta al objetivo.`
        : `${plan.habilidad.nombre} falla el impacto.`;
      const resultadoBase = {
        exito: true,
        motivo: MOTIVOS.OK,
        mensaje,
        turnoConsumido: true,
        redibujar: true,
        idEjecucion,
        idHabilidad: plan.habilidad.id,
        idMaestria: plan.habilidad.maestria,
        grado: plan.grado,
        manaConsumido,
        costoTemporal: plan.costoTemporal,
        tipoAccion: "habilidad",
        ejecucionEfectiva: true,
        impacto: danio.impacto,
        critico: danio.critico,
        danio,
        efectos,
      };
      const resultadoTemporal = finalizarTiempo(this.juego, {
        resultado: resultadoBase,
        costoTemporalBase: plan.costoTemporal,
      });
      const experienciaMaestria = registrarExperienciaMaestria(this.jugador, {
        idEjecucion,
        idMaestria: plan.habilidad.maestria,
        manaConsumido,
        ejecucionEfectiva: true,
      });
      const resultado = {
        ...(resultadoTemporal ?? resultadoBase),
        experienciaMaestria,
      };
      registrarUltimaEjecucion(this.jugador, resultado);
      this.seleccion = null;
      this.emitirCambio();
      return resultado;
    } catch (error) {
      if (!faseIrreversible) restaurarMana(this.jugador, manaAntes);
      const resultado = crearRechazo(
        MOTIVOS.ERROR_EJECUCION,
        `La habilidad no pudo completarse: ${error.message}`,
      );
      resultado.idEjecucion = idEjecucion;
      resultado.error = error;
      resultado.manaConsumido = Math.max(
        0,
        manaAntes - leerManaActual(this.jugador),
      );
      resultado.faseIrreversible = faseIrreversible;
      registrarUltimaEjecucion(this.jugador, resultado);
      this.emitirCambio();
      return resultado;
    }
  }

  // Compatibilidad de lectura: ya no existe un procesador alternativo.
  procesarEfectosPendientes() {
    return [];
  }

  obtenerSeleccionDetallada() {
    if (!this.seleccion) return null;
    const habilidad = this.configuracion.habilidades[this.seleccion.idHabilidad];
    const gradoConfig = habilidad.ejecucion.grados[this.seleccion.grado];
    const objetivo = obtenerObjetivoEn(
      this.juego,
      this.seleccion.x,
      this.seleccion.y,
    );
    const geometria = evaluarGeometria({
      juego: this.juego,
      jugador: this.jugador,
      x: this.seleccion.x,
      y: this.seleccion.y,
      habilidad,
      gradoConfig,
    });
    return {
      ...this.seleccion,
      nombre: habilidad.nombre,
      costoMana: gradoConfig.costoMana,
      costoTemporalBase: gradoConfig.costoTemporalBase,
      alcance: gradoConfig.alcance,
      objetivoValido: Boolean(objetivo),
      geometria,
    };
  }

  obtenerUltimaEjecucion() {
    return obtenerUltimaEjecucion(this.jugador);
  }

  obtenerEnemigosVivos() {
    return obtenerObjetivosVivos(this.juego);
  }

  configurarTiradasDeterministas(configuracion) {
    return configurarTiradasDeterministasHabilidad(configuracion);
  }

  restaurarTiradasAleatorias() {
    return restaurarTiradasAleatoriasHabilidad();
  }

  obtenerEstadoTiradasDeterministas() {
    return obtenerEstadoTiradasDeterministasHabilidad();
  }

  suscribirCambio(oyente) {
    if (typeof oyente !== "function") {
      throw new Error("El oyente de habilidades debe ser una función.");
    }
    this.oyentesCambio.add(oyente);
    return () => this.oyentesCambio.delete(oyente);
  }

  obtenerGrado(idHabilidad) {
    if (typeof this.jugador.obtenerGradoHabilidad === "function") {
      return this.jugador.obtenerGradoHabilidad(idHabilidad);
    }
    if (
      typeof this.jugador.progresoMagico?.obtenerGradoHabilidad === "function"
    ) {
      return this.jugador.progresoMagico.obtenerGradoHabilidad(idHabilidad);
    }
    if (
      typeof this.jugador.progresoMagicoJugador?.obtenerGradoHabilidad ===
      "function"
    ) {
      return this.jugador.progresoMagicoJugador.obtenerGradoHabilidad(
        idHabilidad,
      );
    }
    return 0;
  }

  prepararPlanEjecucion() {
    const habilidad = this.configuracion.habilidades[this.seleccion.idHabilidad];
    if (!habilidad?.ejecucion) {
      return crearRechazo(
        MOTIVOS.HABILIDAD_NO_CONFIGURADA,
        "La habilidad no posee ejecución configurada.",
      );
    }
    const grado = this.obtenerGrado(habilidad.id);
    if (grado <= 0) {
      return crearRechazo(
        MOTIVOS.HABILIDAD_NO_APRENDIDA,
        "La habilidad ya no está aprendida.",
      );
    }
    const gradoConfig = habilidad.ejecucion.grados[grado];
    const objetivo = obtenerObjetivoEn(
      this.juego,
      this.seleccion.x,
      this.seleccion.y,
    );
    if (!objetivo || estaDerrotado(objetivo)) {
      return crearRechazo(
        MOTIVOS.OBJETIVO_INVALIDO,
        "La casilla no contiene un enemigo válido.",
      );
    }
    const geometria = evaluarGeometria({
      juego: this.juego,
      jugador: this.jugador,
      x: this.seleccion.x,
      y: this.seleccion.y,
      habilidad,
      gradoConfig,
    });
    if (!geometria.dentroAlcance) {
      return crearRechazo(MOTIVOS.FUERA_DE_ALCANCE, geometria.mensaje);
    }
    if (!geometria.patronValido) {
      return crearRechazo(MOTIVOS.PATRON_INVALIDO, geometria.mensaje);
    }
    if (
      habilidad.ejecucion.requiereLineaVision &&
      !geometria.lineaVisionDespejada
    ) {
      return crearRechazo(MOTIVOS.LINEA_VISION_BLOQUEADA, geometria.mensaje);
    }
    if (leerManaActual(this.jugador) < gradoConfig.costoMana) {
      return crearRechazo(
        MOTIVOS.MANA_INSUFICIENTE,
        `Se necesitan ${gradoConfig.costoMana} de Maná.`,
      );
    }
    const bloqueo = obtenerBloqueoTemporal(this.juego);
    if (bloqueo) {
      return crearRechazo(MOTIVOS.BLOQUEO_TEMPORAL, bloqueo);
    }
    try {
      validarContratosEjecucion({
        juego: this.juego,
        jugador: this.jugador,
        objetivo,
        efectosConfigurados: gradoConfig.efectos,
      });
      const contextoPotencia = obtenerContextoPotenciaHabilidad(this.jugador);
      const definicionesEfectos = prepararEfectosHabilidad({
        lanzador: this.jugador,
        objetivo,
        efectosConfigurados: gradoConfig.efectos,
        contextoPotencia,
        idEjecucion: "prevalidacion",
      });
      return {
        exito: true,
        habilidad,
        grado,
        gradoConfig,
        objetivo,
        contextoPotencia,
        definicionesEfectos,
        costoMana: gradoConfig.costoMana,
        costoTemporal: gradoConfig.costoTemporalBase,
      };
    } catch (error) {
      return crearRechazo(MOTIVOS.ERROR_EJECUCION, error.message);
    }
  }

  validarBloqueosDeSeleccion() {
    if (this.juego.modoInteraccion) {
      return crearRechazo(
        MOTIVOS.MODO_INTERACCION_ACTIVO,
        "Cerrá la interacción antes de seleccionar una habilidad.",
      );
    }
    const bloqueo = obtenerBloqueoTemporal(this.juego);
    return bloqueo ? crearRechazo(MOTIVOS.BLOQUEO_TEMPORAL, bloqueo) : null;
  }

  obtenerPuntoInicial(habilidad, grado) {
    const gradoConfig = habilidad.ejecucion.grados[grado];
    const objetivos = obtenerObjetivosVivos(this.juego)
      .map((objetivo) => ({
        objetivo,
        distancia: Math.max(
          Math.abs(objetivo.x - this.jugador.x),
          Math.abs(objetivo.y - this.jugador.y),
        ),
      }))
      .filter(({ distancia }) => distancia <= gradoConfig.alcance)
      .sort((a, b) => a.distancia - b.distancia);
    if (objetivos.length > 0) {
      return { x: objetivos[0].objetivo.x, y: objetivos[0].objetivo.y };
    }
    const limites = obtenerLimitesMapa(this.juego.mapa);
    return {
      x: limitar(this.jugador.x + 1, 0, limites.ancho - 1),
      y: limitar(this.jugador.y, 0, limites.alto - 1),
    };
  }

  cancelarAtaqueFisico() {
    if (typeof this.juego.cancelarModoCombate === "function") {
      this.juego.cancelarModoCombate();
    }
  }

  emitirCambio() {
    if (this.destruido) return;
    for (const oyente of this.oyentesCambio) {
      oyente(this.obtenerEstadoBarra(), this.obtenerSeleccionDetallada());
    }
  }

  destruir() {
    if (this.destruido) return false;
    this.seleccion = null;
    this.oyentesCambio.clear();
    restaurarTiradasAleatoriasHabilidad();
    this.destruido = true;
    return true;
  }
}

export { MOTIVOS as MOTIVOS_HABILIDADES };

function validarContratosEjecucion({
  juego,
  jugador,
  objetivo,
  efectosConfigurados,
}) {
  if (!encontrarMetodoDanio(objetivo)) {
    throw new Error("El objetivo no puede recibir daño de habilidades.");
  }
  if (
    typeof juego.finalizarResultadoAccionJugador !== "function" &&
    typeof juego.finalizarAccionJugador !== "function"
  ) {
    throw new Error("Juego no expone la finalización temporal de acciones.");
  }
  const progreso = jugador.progresoMagico ?? jugador.progresoMagicoJugador;
  if (
    typeof jugador.registrarExperienciaMaestria !== "function" &&
    typeof progreso?.registrarEjecucionEfectiva !== "function"
  ) {
    throw new Error(
      "El jugador no expone el registro de experiencia de maestría.",
    );
  }
  validarDisponibilidadEfectosHabilidad({ juego, efectosConfigurados });
}

function evaluarGeometria({ juego, jugador, x, y, habilidad, gradoConfig }) {
  const atacanteAdaptado = crearAdaptadorGeometrico({
    jugador,
    alcance: gradoConfig.alcance,
    patronAtaque: habilidad.ejecucion.patronAtaque,
  });
  try {
    const resultado = evaluarAtaqueCasilla({
      atacante: atacanteAdaptado,
      xObjetivo: x,
      yObjetivo: y,
      mapa: juego.mapa,
    });
    return {
      dentroAlcance: Boolean(resultado.dentroAlcance ?? resultado.puedeAtacar),
      patronValido: Boolean(resultado.patronValido ?? resultado.puedeAtacar),
      lineaVisionDespejada: Boolean(
        resultado.lineaVisionDespejada ?? resultado.puedeAtacar,
      ),
      puedeEjecutar: Boolean(resultado.puedeAtacar),
      mensaje:
        resultado.mensaje ?? "La casilla no es válida para la habilidad.",
      detalle: resultado,
    };
  } catch (error) {
    return {
      dentroAlcance: false,
      patronValido: false,
      lineaVisionDespejada: false,
      puedeEjecutar: false,
      mensaje: error.message,
      detalle: null,
    };
  }
}

function crearAdaptadorGeometrico({ jugador, alcance, patronAtaque }) {
  return new Proxy(jugador, {
    get(objetivo, propiedad, receptor) {
      const equipamientoAdaptado = crearAdaptadorEquipamiento(
        objetivo.equipamiento,
        alcance,
        patronAtaque,
      );
      const sobrescrituras = {
        alcance,
        alcanceAtaque: alcance,
        patronAtaque,
        patronAtaqueActual: patronAtaque,
        patrónAtaque: patronAtaque,
        equipamiento: equipamientoAdaptado,
        obtenerAlcanceAtaque: () => alcance,
        obtenerPatronAtaque: () => patronAtaque,
        obtenerConfiguracionAtaqueActual: () => ({
          alcance,
          patronAtaque,
          patrónAtaque: patronAtaque,
        }),
        obtenerDatosAtaqueActual: () => ({
          alcance,
          patronAtaque,
          patrónAtaque: patronAtaque,
        }),
      };
      if (Object.prototype.hasOwnProperty.call(sobrescrituras, propiedad)) {
        return sobrescrituras[propiedad];
      }
      return Reflect.get(objetivo, propiedad, receptor);
    },
  });
}

function crearAdaptadorEquipamiento(equipamiento, alcance, patronAtaque) {
  const base =
    equipamiento && typeof equipamiento === "object" ? equipamiento : {};
  return new Proxy(base, {
    get(objetivo, propiedad, receptor) {
      const sobrescrituras = {
        alcance,
        alcanceAtaque: alcance,
        patronAtaque,
        obtenerAlcanceAtaque: () => alcance,
        obtenerPatronAtaque: () => patronAtaque,
        obtenerArmaActiva: () => ({ alcance, patronAtaque }),
        obtenerArmaPrincipal: () => ({ alcance, patronAtaque }),
      };
      if (Object.prototype.hasOwnProperty.call(sobrescrituras, propiedad)) {
        return sobrescrituras[propiedad];
      }
      return Reflect.get(objetivo, propiedad, receptor);
    },
  });
}

function finalizarTiempo(juego, { resultado, costoTemporalBase }) {
  if (typeof juego.finalizarResultadoAccionJugador === "function") {
    return juego.finalizarResultadoAccionJugador({
      resultado,
      tipoAccion:
        TIPOS_ACCION_TEMPORAL.HABILIDAD ?? TIPOS_ACCION_TEMPORAL.ACCION,
      costoBase: costoTemporalBase,
    });
  }
  if (typeof juego.finalizarAccionJugador === "function") {
    return juego.finalizarAccionJugador({
      mensaje: resultado.mensaje,
      tipoAccion:
        TIPOS_ACCION_TEMPORAL.HABILIDAD ?? TIPOS_ACCION_TEMPORAL.ACCION,
      costoBase: costoTemporalBase,
    });
  }
  throw new Error("Juego no expone la finalización temporal de acciones.");
}

function registrarExperienciaMaestria(jugador, evento) {
  if (typeof jugador.registrarExperienciaMaestria === "function") {
    return jugador.registrarExperienciaMaestria(evento);
  }
  const progreso = jugador.progresoMagico ?? jugador.progresoMagicoJugador;
  if (typeof progreso?.registrarEjecucionEfectiva === "function") {
    return progreso.registrarEjecucionEfectiva(evento);
  }
  throw new Error(
    "El jugador no expone el registro de experiencia de maestría.",
  );
}

function registrarHostilidad(juego, objetivo) {
  const receptores = [juego, juego.estadoCombatePartida, juego.coordinadorTiempo];
  const nombres = [
    "registrarParticipanteCombate",
    "registrarParticipante",
    "registrarHostilidad",
  ];
  for (const receptor of receptores) {
    for (const nombre of nombres) {
      if (typeof receptor?.[nombre] === "function") {
        receptor[nombre](objetivo);
        return;
      }
    }
  }
}

function obtenerBloqueoTemporal(juego) {
  const consultas = [
    () => juego?.obtenerBloqueoAccionTemporal?.(),
    () => juego?.coordinadorTiempo?.obtenerBloqueoAccionJugador?.(),
    () => juego?.obtenerBloqueoTemporalJugador?.(),
    () => juego?.obtenerBloqueoAccionesJugador?.(),
    () => juego?.obtenerBloqueoJugador?.(),
  ];

  for (const consultar of consultas) {
    const resultado = consultar();
    if (typeof resultado === "string" && resultado) {
      return resultado;
    }
    if (resultado?.bloqueado === true || resultado?.exito === false) {
      return resultado.mensaje ?? resultado.motivo ?? "El jugador no puede actuar.";
    }
  }

  return null;
}

function obtenerObjetivoEn(juego, x, y) {
  if (typeof juego.obtenerObjetivoEn === "function") {
    return juego.obtenerObjetivoEn(x, y);
  }
  return obtenerObjetivosVivos(juego).find(
    (objetivo) => objetivo.x === x && objetivo.y === y,
  );
}

function obtenerObjetivosVivos(juego) {
  const objetivos = Array.isArray(juego.objetivos) ? juego.objetivos : [];
  return objetivos.filter((objetivo) => !estaDerrotado(objetivo));
}

function estaDerrotado(objetivo) {
  if (typeof objetivo?.estaDerrotado === "function") {
    return Boolean(objetivo.estaDerrotado());
  }
  const vida = objetivo?.vidaActual ?? objetivo?.vida;
  return Number.isFinite(vida) ? vida <= 0 : false;
}

function leerManaActual(jugador) {
  const valor =
    jugador?.manaActual ??
    jugador?.mana ??
    jugador?.recursos?.manaActual ??
    jugador?.recursos?.mana;
  return Number.isFinite(valor) ? valor : 0;
}

function consumirMana(jugador, cantidad) {
  for (const nombre of ["consumirMana", "gastarMana"]) {
    if (typeof jugador?.[nombre] === "function") {
      const resultado = jugador[nombre](cantidad);
      if (resultado === false) {
        throw new Error("El jugador rechazó el consumo de Maná.");
      }
      return resultado;
    }
  }
  if ("manaActual" in jugador) {
    jugador.manaActual = leerManaActual(jugador) - cantidad;
    return cantidad;
  }
  throw new Error("El jugador no expone una operación de consumo de Maná.");
}

function restaurarMana(jugador, valorAnterior) {
  const actual = leerManaActual(jugador);
  const diferencia = Math.max(0, valorAnterior - actual);
  if (diferencia === 0) return;
  for (const nombre of ["recuperarMana", "restaurarMana"]) {
    if (typeof jugador?.[nombre] === "function") {
      jugador[nombre](diferencia);
      return;
    }
  }
  if ("manaActual" in jugador) jugador.manaActual = valorAnterior;
}

function obtenerLimitesMapa(mapa) {
  if (Array.isArray(mapa)) {
    const alto = Math.max(1, mapa.length);
    const ancho = Math.max(
      1,
      mapa.reduce((maximo, fila) => {
        const longitud = typeof fila?.length === "number" ? fila.length : 0;
        return Math.max(maximo, longitud);
      }, 0),
    );
    return { ancho, alto };
  }

  const ancho =
    mapa?.ancho ??
    mapa?.columnas ??
    mapa?.width ??
    mapa?.celdas?.[0]?.length ??
    mapa?.terreno?.[0]?.length ??
    1;
  const alto =
    mapa?.alto ??
    mapa?.filas ??
    mapa?.height ??
    mapa?.celdas?.length ??
    mapa?.terreno?.length ??
    1;
  return { ancho: Math.max(1, ancho), alto: Math.max(1, alto) };
}

function crearRechazo(motivo, mensaje) {
  return {
    exito: false,
    motivo,
    mensaje,
    turnoConsumido: false,
    redibujar: true,
    ejecucionEfectiva: false,
    manaConsumido: 0,
  };
}

function encontrarMetodoDanio(objetivo) {
  return ["recibirDanio", "recibirDaño", "aplicarDanio", "aplicarDaño"].find(
    (nombre) => typeof objetivo?.[nombre] === "function",
  );
}

function validarIndiceRanura(indiceRanura) {
  if (!Number.isInteger(indiceRanura) || indiceRanura < 0 || indiceRanura > 9) {
    throw new Error("La ranura de habilidad debe estar entre 0 y 9.");
  }
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}
