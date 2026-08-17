import { limitar } from "../../utilidades/Numeros.js";
import { calcularDistanciaCuadricula } from "../espacio/GeometriaCuadricula.js";
import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";
import {
  crearEventoHabilidadResuelta,
  TIPOS_ACTOR_HABILIDAD,
} from "../acciones/EventosAccion.js";
import {
  seleccionarObjetivoPrioritario,
} from "../combate/SelectorObjetivoPrioritario.js";
import { TIPOS_ACCION_TEMPORAL } from "../tiempo/SistemaTiempo.js";
import {
  crearMensajeTraducible,
  crearParametroContenidoMensaje,
  TIPOS_MENSAJE_JUEGO,
} from "../mensajes/MensajesJuego.js";
import {
  crearMensajeDetalleImpacto,
  crearMensajesDetalleDanioHabilidad,
} from "../mensajes/MensajesCalculoCombate.js";
import {
  asignarHabilidadARanura,
  generarIdEjecucionHabilidad,
  obtenerAsignacionesHabilidades,
  obtenerUltimaEjecucion,
  registrarUltimaEjecucion,
} from "./EstadoSesionHabilidades.js";
import {
  crearVistaPreviaHabilidad,
  obtenerCasillasSeleccionablesHabilidad,
} from "./GeometriaHabilidades.js";
import {
  configurarTiradasDeterministasHabilidad,
  obtenerContextoPotenciaHabilidad,
  obtenerEstadoTiradasDeterministasHabilidad,
  resolverDanioHabilidad,
  resolverImpactoHabilidad,
  restaurarTiradasAleatoriasHabilidad,
} from "./MotorDanioHabilidad.js";
import {
  aplicarEfectosHabilidad,
  prepararEfectosHabilidad,
  validarDisponibilidadEfectosHabilidad,
} from "./MotorEfectosHabilidad.js";
import {
  CANTIDAD_RANURAS_BARRA,
  validarBarraContraJugador,
  validarIndiceRanuraBarra,
} from "./ContratoBarraHabilidades.js";

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
    if (!juego?.player || !juego?.map) {
      throw new Error("El sistema de habilidades necesita un Juego activo.");
    }
    if (!configuracionEjecucion?.habilidades) {
      throw new Error("Falta la configuración de ejecución de habilidades.");
    }
    this.juego = juego;
    this.jugador = juego.player;
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
    for (let indice = 0; indice < CANTIDAD_RANURAS_BARRA; indice += 1) {
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
    for (let indice = 0; indice < CANTIDAD_RANURAS_BARRA; indice += 1) {
      asignarHabilidadARanura(this.jugador, indice, null);
    }
    this.emitirCambio();
    return this.obtenerEstadoBarra();
  }

  desasignarHabilidad(indiceRanura) {
    validarIndiceRanuraBarra(indiceRanura);
    if (this.seleccion?.indiceRanura === indiceRanura) this.seleccion = null;
    asignarHabilidadARanura(this.jugador, indiceRanura, null);
    this.emitirCambio();
    return this.obtenerEstadoBarra();
  }

  asignarHabilidad(indiceRanura, idHabilidad) {
    validarIndiceRanuraBarra(indiceRanura);
    const habilidad = this.configuracion.habilidades[idHabilidad];
    if (!habilidad) {
      throw new Error(`La habilidad "${idHabilidad}" no existe.`);
    }
    if (habilidad.tipo !== "activa" || !habilidad.ejecucion) {
      throw new Error(`La habilidad "${idHabilidad}" no es una habilidad activa jugable.`);
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
    if (habilidad.tipo !== "activa" || !habilidad.ejecucion) {
      return crearRechazo(
        MOTIVOS.HABILIDAD_NO_CONFIGURADA,
        "La habilidad no es una habilidad activa jugable.",
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
      mensaje: crearMensajeTraducible("mensajes.habilidades.seleccionada", {
        parametros: { habilidad: parametroHabilidad(habilidad), grado },
        tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
        respaldo: `${habilidad.nombre} grado ${grado} seleccionada.`,
      }),
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

    const habilidad = this.configuracion.habilidades[this.seleccion.idHabilidad];
    if (habilidad.ejecucion.tipoObjetivo === "propio") {
      this.seleccion.x = this.jugador.x;
      this.seleccion.y = this.jugador.y;
      this.emitirCambio();
      return {
        exito: true,
        motivo: MOTIVOS.OK,
        mensaje: mensajeHabilidad("centrada", "La habilidad permanece centrada en el jugador."),
        turnoConsumido: false,
        redibujar: true,
        seleccion: this.obtenerSeleccionDetallada(),
      };
    }

    const limites = obtenerLimitesMapa(this.juego.map);
    this.seleccion.x = limitar(this.seleccion.x + dx, 0, limites.ancho - 1);
    this.seleccion.y = limitar(this.seleccion.y + dy, 0, limites.alto - 1);
    this.emitirCambio();
    return {
      exito: true,
      motivo: MOTIVOS.OK,
      mensaje: mensajeHabilidad("selectorMovido", "Selector de habilidad desplazado."),
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

    const habilidad = this.configuracion.habilidades[this.seleccion.idHabilidad];
    if (habilidad.ejecucion.tipoObjetivo === "propio") {
      this.seleccion.x = this.jugador.x;
      this.seleccion.y = this.jugador.y;
    } else {
      const limites = obtenerLimitesMapa(this.juego.map);
      this.seleccion.x = limitar(x, 0, limites.ancho - 1);
      this.seleccion.y = limitar(y, 0, limites.alto - 1);
    }
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
      const resultadoZona = plan.creaZonaTemporal
        ? this.crearZonaDesdePlan({ plan, idEjecucion })
        : null;
      const impactos = plan.creaZonaTemporal
        ? (resultadoZona?.impactos ?? []).map(resumirImpactoZona)
        : plan.objetivos.map((entrada) =>
            this.ejecutarSobreObjetivo({
              plan,
              entrada,
              idEjecucion,
            }),
          );
      const cantidadImpactos = impactos.filter((item) => item.impacto).length;
      const cantidadCriticos = impactos.filter((item) => item.critico).length;
      const efectos = impactos.flatMap((item) => item.efectos ?? []);
      const eventosEfectos = plan.creaZonaTemporal
        ? []
        : efectos.flatMap((efecto) => efecto.eventos ?? []);
      const impactosResultado = impactos.map((impacto) => ({
        ...impacto,
        efectos: (impacto.efectos ?? []).map(
          ({ eventos: _eventos, ...efecto }) => efecto,
        ),
      }));
      const efectosResultado = impactosResultado.flatMap(
        (impacto) => impacto.efectos ?? [],
      );
      const impactosEvento = impactos.map((impacto, indice) => ({
        ...impacto,
        objetivoEntidad: plan.creaZonaTemporal
          ? resultadoZona?.impactos?.[indice]?.objetivo ?? null
          : plan.objetivos[indice]?.objetivo ?? null,
        posicionObjetivo: impacto.objetivo ?? null,
      }));
      const eventoHabilidad = crearEventoHabilidadResuelta({
        actor: this.jugador,
        tipoActor: TIPOS_ACTOR_HABILIDAD.JUGADOR,
        habilidad: {
          ...plan.habilidad,
          formaImpacto: plan.gradoConfig.formaImpacto ?? null,
          zonaTemporal: plan.gradoConfig.zonaTemporal ?? null,
        },
        grado: plan.grado,
        posicionObjetivo: plan.centro,
        objetivoPrimario: plan.objetivoPrimario,
        casillasAfectadas: plan.casillasAfectadas,
        recorrido: plan.recorrido,
        impactos: impactosEvento,
        idEjecucion,
        recursosActor: [
          {
            recurso: "mana",
            valorAntes: manaAntes,
            valorDespues: manaDespues,
            cantidadReal: manaConsumido,
            valorMaximo: leerManaMaximo(this.jugador),
            tipoCambio: "consumo",
          },
        ],
        zonaTemporal: resultadoZona?.zona ?? null,
      });
      const mensaje = plan.creaZonaTemporal
        ? crearMensajeCreacionZona({
            habilidad: plan.habilidad,
            cantidadObjetivos: impactos.length,
            mensajeZona: resultadoZona?.mensaje,
          })
        : crearMensajeEjecucion({
            habilidad: plan.habilidad,
            cantidadObjetivos: impactos.length,
            cantidadImpactos,
            efectos,
            impactos,
          });
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
        impacto: cantidadImpactos > 0,
        critico: cantidadCriticos > 0,
        cantidadObjetivos: impactos.length,
        cantidadImpactos,
        cantidadCriticos,
        impactos: impactosResultado,
        danio: impactosResultado.find((item) => item.danio)?.danio ?? null,
        efectos: efectosResultado,
        zonaTemporal: resultadoZona?.zona ?? null,
        zonaCreada: resultadoZona?.creada === true,
        zonaRenovada: resultadoZona?.renovada === true,
        eventos: [
          eventoHabilidad,
          ...eventosEfectos,
          ...(resultadoZona?.eventos ?? []),
        ],
      };
      const resultadoTemporal = finalizarTiempo(this.juego, {
        resultado: resultadoBase,
        costoTemporalBase: plan.costoTemporal,
      });
      const experienciaMaestria = registrarExperienciaMaestria(this.jugador, {
        idEvento: idEjecucion,
        tipo: "mana_consumido",
        cantidad: manaConsumido,
        idMaestria: plan.habilidad.maestria,
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

  crearZonaDesdePlan({ plan, idEjecucion }) {
    if (typeof this.juego.crearZonaTemporal !== "function") {
      throw new Error("El mapa activo no permite crear zonas temporales.");
    }
    return this.juego.crearZonaTemporal({
      idEjecucion,
      idHabilidad: plan.habilidad.id,
      nombre: plan.habilidad.nombre,
      grado: plan.grado,
      fuente: this.jugador,
      hostil: plan.habilidad.ejecucion.hostil,
      casillas: plan.casillasAfectadas,
      configuracion: plan.gradoConfig.zonaTemporal,
      contenido: {
        danio: plan.gradoConfig.danio,
        efectos: plan.gradoConfig.efectos,
      },
      contextoPotencia: plan.contextoPotencia,
    });
  }

  ejecutarSobreObjetivo({ plan, entrada, idEjecucion }) {
    const objetivo = entrada.objetivo;
    if (plan.habilidad.ejecucion.hostil) {
      registrarHostilidad(this.juego, objetivo);
    }

    const componentesDanio = escalarComponentesDanio(
      plan.gradoConfig.danio,
      entrada.multiplicadorDanio,
    );
    const danio =
      componentesDanio.length > 0
        ? resolverDanioHabilidad({
            lanzador: this.jugador,
            objetivo,
            componentesConfigurados: componentesDanio,
            contextoPotencia: plan.contextoPotencia,
            idEjecucion,
          })
        : resolverImpactoHabilidad({
            lanzador: this.jugador,
            objetivo,
            idEjecucion,
            resolverImpacto: true,
            resolverCritico: false,
          });
    const efectos =
      danio.impacto && !danio.objetivoDerrotado
        ? aplicarEfectosHabilidad({
            juego: this.juego,
            lanzador: this.jugador,
            objetivo,
            efectosConfigurados: plan.gradoConfig.efectos,
            definicionesPreparadas: entrada.definicionesEfectos,
            contextoPotencia: plan.contextoPotencia,
            idEjecucion,
          })
        : [];

    return {
      objetivo: resumirObjetivoMensaje(objetivo),
      orden: entrada.orden,
      multiplicadorDanio: entrada.multiplicadorDanio,
      impacto: danio.impacto,
      critico: danio.critico,
      objetivoDerrotado: danio.objetivoDerrotado,
      danio: componentesDanio.length > 0 ? danio : null,
      resolucionImpacto: componentesDanio.length === 0 ? danio : null,
      efectos,
    };
  }

  // Compatibilidad de lectura: ya no existe un procesador alternativo.
  procesarEfectosPendientes() {
    return [];
  }

  obtenerSeleccionDetallada() {
    if (!this.seleccion) return null;
    const habilidad = this.configuracion.habilidades[this.seleccion.idHabilidad];
    const gradoConfig = habilidad.ejecucion.grados[this.seleccion.grado];
    const vistaPrevia = crearVistaPreviaHabilidad({
      mapa: this.juego.map,
      sistemaEspacial: this.juego.sistemaEspacial,
      jugador: this.jugador,
      objetivos: obtenerObjetivosVivos(this.juego),
      habilidad,
      gradoConfig,
      x: this.seleccion.x,
      y: this.seleccion.y,
    });

    return {
      ...this.seleccion,
      x: vistaPrevia.centro.x,
      y: vistaPrevia.centro.y,
      nombre: habilidad.nombre,
      idMaestria: habilidad.maestria,
      tipoObjetivo: habilidad.ejecucion.tipoObjetivo,
      costoMana: gradoConfig.costoMana,
      costoTemporalBase: gradoConfig.costoTemporalBase,
      alcance: gradoConfig.alcance,
      formaImpacto: copiarSimple(gradoConfig.formaImpacto),
      zonaTemporal: copiarSimple(gradoConfig.zonaTemporal),
      objetivoValido: vistaPrevia.objetivoValido,
      geometria: vistaPrevia.geometria,
      casillasSeleccionables: vistaPrevia.casillasSeleccionables.map(copiarCasilla),
      casillasAfectadas: vistaPrevia.casillasAfectadas.map(copiarCasilla),
      objetivosAfectados: vistaPrevia.objetivosAfectados.map((entrada) => ({
        nombre: entrada.objetivo.nombre ?? "Objetivo",
        x: entrada.x,
        y: entrada.y,
        orden: entrada.orden,
        multiplicadorDanio: entrada.multiplicadorDanio,
      })),
      recorrido: vistaPrevia.recorrido.map((paso) => ({ ...paso })),
      mensajeValidacion: vistaPrevia.mensaje,
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
    if (typeof this.jugador.obtenerGradoHabilidad !== "function") {
      throw new Error("El jugador no expone la consulta canónica de grados.");
    }
    return this.jugador.obtenerGradoHabilidad(idHabilidad);
  }

  prepararPlanEjecucion() {
    const habilidad = this.configuracion.habilidades[this.seleccion.idHabilidad];
    if (habilidad?.tipo !== "activa" || !habilidad?.ejecucion) {
      return crearRechazo(
        MOTIVOS.HABILIDAD_NO_CONFIGURADA,
        "La habilidad no es una habilidad activa configurada.",
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
    const vistaPrevia = crearVistaPreviaHabilidad({
      mapa: this.juego.map,
      sistemaEspacial: this.juego.sistemaEspacial,
      jugador: this.jugador,
      objetivos: obtenerObjetivosVivos(this.juego),
      habilidad,
      gradoConfig,
      x: this.seleccion.x,
      y: this.seleccion.y,
    });

    if (!vistaPrevia.geometria.dentroAlcance) {
      return crearRechazo(
        MOTIVOS.FUERA_DE_ALCANCE,
        vistaPrevia.geometria.mensaje,
      );
    }
    if (!vistaPrevia.geometria.patronValido) {
      return crearRechazo(MOTIVOS.PATRON_INVALIDO, vistaPrevia.geometria.mensaje);
    }
    if (
      habilidad.ejecucion.requiereLineaVision &&
      !vistaPrevia.geometria.lineaVisionDespejada
    ) {
      return crearRechazo(
        MOTIVOS.LINEA_VISION_BLOQUEADA,
        vistaPrevia.geometria.mensaje,
      );
    }
    const creaZonaTemporal = Boolean(gradoConfig.zonaTemporal);
    if (
      !vistaPrevia.objetivoValido ||
      (!creaZonaTemporal && vistaPrevia.objetivosAfectados.length === 0)
    ) {
      return crearRechazo(
        MOTIVOS.OBJETIVO_INVALIDO,
        vistaPrevia.mensaje ?? "No hay objetivos válidos para la habilidad.",
      );
    }
    if (leerManaActual(this.jugador) < gradoConfig.costoMana) {
      return crearRechazo(
        MOTIVOS.MANA_INSUFICIENTE,
        crearMensajeTraducible("mensajes.habilidades.manaInsuficiente", {
          parametros: {
            cantidad: gradoConfig.costoMana,
            habilidad: parametroHabilidad(habilidad),
          },
          tipo: TIPOS_MENSAJE_JUEGO.NEGATIVO,
          respaldo: `Se necesitan ${gradoConfig.costoMana} de Maná.`,
        }),
      );
    }
    const bloqueo = obtenerBloqueoTemporal(this.juego);
    if (bloqueo) {
      return crearRechazo(MOTIVOS.BLOQUEO_TEMPORAL, bloqueo);
    }

    try {
      validarDisponibilidadEfectosHabilidad({
        juego: this.juego,
        efectosConfigurados: gradoConfig.efectos,
      });
      const contextoPotencia = obtenerContextoPotenciaHabilidad(this.jugador);
      if (creaZonaTemporal) {
        validarContratoZonaTemporal({
          juego: this.juego,
          jugador: this.jugador,
          gradoConfig,
          casillasAfectadas: vistaPrevia.casillasAfectadas,
        });
      }
      const objetivos = vistaPrevia.objetivosAfectados.map((entrada) => {
        validarContratosEjecucion({
          juego: this.juego,
          jugador: this.jugador,
          objetivo: entrada.objetivo,
          componentesDanio: gradoConfig.danio,
          efectosConfigurados: gradoConfig.efectos,
        });
        return {
          ...entrada,
          definicionesEfectos: prepararEfectosHabilidad({
            lanzador: this.jugador,
            objetivo: entrada.objetivo,
            efectosConfigurados: gradoConfig.efectos,
            contextoPotencia,
            idEjecucion: "prevalidacion",
          }),
        };
      });

      return {
        exito: true,
        habilidad,
        grado,
        gradoConfig,
        objetivos,
        contextoPotencia,
        creaZonaTemporal,
        centro: copiarCasilla(vistaPrevia.centro),
        objetivoPrimario: vistaPrevia.objetivoPrimario ?? null,
        casillasAfectadas: vistaPrevia.casillasAfectadas.map(copiarCasilla),
        recorrido: vistaPrevia.recorrido.map((paso) => ({ ...paso })),
        costoMana: gradoConfig.costoMana,
        costoTemporal: gradoConfig.costoTemporalBase,
      };
    } catch (error) {
      return crearRechazo(MOTIVOS.ERROR_EJECUCION, error.message);
    }
  }

  validarBloqueosDeSeleccion() {
    if (this.juego.modoInteraccionActivo) {
      return crearRechazo(
        MOTIVOS.MODO_INTERACCION_ACTIVO,
        "Cerrá la interacción antes de seleccionar una habilidad.",
      );
    }
    const bloqueo = obtenerBloqueoTemporal(this.juego);
    return bloqueo ? crearRechazo(MOTIVOS.BLOQUEO_TEMPORAL, bloqueo) : null;
  }

  obtenerPuntoInicial(habilidad, grado) {
    if (habilidad.ejecucion.tipoObjetivo === "propio") {
      return { x: this.jugador.x, y: this.jugador.y };
    }

    const gradoConfig = habilidad.ejecucion.grados[grado];
    const casillasSeleccionables = obtenerCasillasSeleccionablesHabilidad({
      mapa: this.juego.map,
      sistemaEspacial: this.juego.sistemaEspacial,
      jugador: this.jugador,
      habilidad,
      gradoConfig,
    });
    const clavesSeleccionables = new Set(
      casillasSeleccionables.map(({ x, y }) => `${x}:${y}`),
    );
    const objetivoPrioritario = seleccionarObjetivoPrioritario({
      origen: this.jugador,
      objetivos: obtenerObjetivosVivos(this.juego),
      esObjetivoValido: (objetivo) =>
        objetivo instanceof Enemigo &&
        clavesSeleccionables.has(`${objetivo.x}:${objetivo.y}`),
    });
    if (objetivoPrioritario) {
      return { x: objetivoPrioritario.x, y: objetivoPrioritario.y };
    }

    const cercana = casillasSeleccionables.sort((a, b) => {
      const distanciaA = calcularDistanciaCuadricula(this.jugador, a);
      const distanciaB = calcularDistanciaCuadricula(this.jugador, b);
      return distanciaA - distanciaB || a.y - b.y || a.x - b.x;
    })[0];
    if (cercana) return { ...cercana };

    const limites = obtenerLimitesMapa(this.juego.map);
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

function validarContratoZonaTemporal({
  juego,
  jugador,
  gradoConfig,
  casillasAfectadas,
}) {
  if (typeof juego?.crearZonaTemporal !== "function") {
    throw new Error("Juego no expone la creación canónica de zonas temporales.");
  }
  if (!Array.isArray(casillasAfectadas) || casillasAfectadas.length === 0) {
    throw new Error("La zona temporal necesita casillas afectadas válidas.");
  }
  if (
    !Array.isArray(gradoConfig.danio) ||
    !Array.isArray(gradoConfig.efectos) ||
    (gradoConfig.danio.length === 0 && gradoConfig.efectos.length === 0)
  ) {
    throw new Error("La zona temporal necesita daño, efectos o ambos.");
  }
  if (typeof jugador.registrarExperienciaMaestria !== "function") {
    throw new Error(
      "El jugador no expone el registro de experiencia de maestría.",
    );
  }
}

function resumirImpactoZona(impacto) {
  const objetivo = impacto.objetivo;
  return {
    idEjecucion: impacto.idEjecucion ?? null,
    objetivo: resumirObjetivoMensaje(objetivo),
    orden: 0,
    multiplicadorDanio: 1,
    impacto: impacto.impacto === true,
    critico: impacto.critico === true,
    objetivoDerrotado: impacto.objetivoDerrotado === true,
    danio: impacto.danio ?? null,
    resolucionImpacto: impacto.resolucionImpacto ?? null,
    efectos: impacto.efectos ?? [],
    motivoZona: impacto.motivo,
  };
}

function validarContratosEjecucion({
  juego,
  jugador,
  objetivo,
  componentesDanio,
  efectosConfigurados,
}) {
  const necesitaRecibirDanio =
    componentesDanio.length > 0 ||
    efectosConfigurados.some((efecto) => efecto.tipo === "danio_periodico");
  if (necesitaRecibirDanio && !encontrarMetodoDanio(objetivo)) {
    throw new Error("El objetivo no puede recibir daño de habilidades.");
  }
  if (
    typeof juego.finalizarResultadoAccionJugador !== "function" &&
    typeof juego.finalizarAccionJugador !== "function"
  ) {
    throw new Error("Juego no expone la finalización temporal de acciones.");
  }
  if (typeof jugador.registrarExperienciaMaestria !== "function") {
    throw new Error(
      "El jugador no expone el registro de experiencia de maestría.",
    );
  }
}

function escalarComponentesDanio(componentes, multiplicador = 1) {
  return componentes.map((componente) => ({
    ...componente,
    valorBase: componente.valorBase * multiplicador,
  }));
}

function crearMensajeCreacionZona({
  habilidad,
  cantidadObjetivos,
  mensajeZona,
}) {
  const parametro = parametroHabilidad(habilidad);
  const resumen = cantidadObjetivos > 0
    ? crearMensajeTraducible(
        cantidadObjetivos === 1
          ? "mensajes.habilidades.zonaObjetivoSingular"
          : "mensajes.habilidades.zonaObjetivoPlural",
        {
          parametros: { habilidad: parametro, cantidad: cantidadObjetivos },
          tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
          respaldo: cantidadObjetivos === 1
            ? `${habilidad.nombre} afecta inicialmente a 1 objetivo.`
            : `${habilidad.nombre} afecta inicialmente a ${cantidadObjetivos} objetivos.`,
        },
      )
    : crearMensajeTraducible("mensajes.habilidades.zonaActiva", {
        parametros: { habilidad: parametro },
        tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
        respaldo: `${habilidad.nombre} queda activa sobre el área seleccionada.`,
      });
  return [resumen, mensajeZona].filter(Boolean);
}

function crearMensajeEjecucion({
  habilidad,
  cantidadObjetivos,
  cantidadImpactos,
  efectos = [],
  impactos = [],
}) {
  const fallos = cantidadObjetivos - cantidadImpactos;
  const parametro = parametroHabilidad(habilidad);
  const resumen = cantidadObjetivos === 1
    ? crearMensajeTraducible(
        cantidadImpactos === 1
          ? "mensajes.habilidades.impactoUnico"
          : "mensajes.habilidades.falloUnico",
        {
          parametros: { habilidad: parametro },
          tipo: cantidadImpactos === 1
            ? TIPOS_MENSAJE_JUEGO.POSITIVO
            : TIPOS_MENSAJE_JUEGO.NEGATIVO,
          respaldo: cantidadImpactos === 1
            ? `${habilidad.nombre} impacta al objetivo.`
            : `${habilidad.nombre} falla el impacto.`,
        },
      )
    : crearMensajeTraducible("mensajes.habilidades.multiobjetivo", {
        parametros: {
          habilidad: parametro,
          objetivos: cantidadObjetivos,
          impactos: cantidadImpactos,
          fallos,
        },
        tipo: cantidadImpactos > 0
          ? TIPOS_MENSAJE_JUEGO.POSITIVO
          : TIPOS_MENSAJE_JUEGO.NEGATIVO,
        respaldo: `${habilidad.nombre} alcanza ${cantidadObjetivos} objetivos: ${cantidadImpactos} impactos y ${fallos} fallos.`,
      });
  const vistos = new Set();
  const mensajesEfectos = [];
  for (const efecto of efectos) {
    const mensaje = efecto?.resultado?.mensajePresentacion ?? efecto?.resultado?.mensaje;
    if (!mensaje) continue;
    const clave = typeof mensaje === "object" ? JSON.stringify(mensaje) : String(mensaje);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    mensajesEfectos.push(mensaje);
  }
  const mensajesCalculo = [];
  for (const impacto of impactos) {
    if (impacto?.danio) {
      mensajesCalculo.push(
        ...crearMensajesDetalleDanioHabilidad({
          habilidad,
          objetivo: impacto.objetivo,
          danio: impacto.danio,
          tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
        }),
      );
    } else if (impacto?.resolucionImpacto) {
      const detalleImpacto = crearMensajeDetalleImpacto(
        impacto.resolucionImpacto,
        { tipo: impacto.resolucionImpacto.impacto
            ? TIPOS_MENSAJE_JUEGO.POSITIVO
            : TIPOS_MENSAJE_JUEGO.NEGATIVO },
      );
      if (detalleImpacto) mensajesCalculo.push(detalleImpacto);
    }
  }
  return [resumen, ...mensajesCalculo, ...mensajesEfectos];
}

function resumirObjetivoMensaje(objetivo) {
  if (!objetivo || typeof objetivo !== "object") {
    return { nombre: "Objetivo", x: null, y: null };
  }
  return {
    id: objetivo.id ?? null,
    idPlantilla: objetivo.idPlantilla ?? objetivo.plantillaId ?? null,
    idVariante: objetivo.idVariante ?? objetivo.varianteId ?? null,
    genero: objetivo.genero ?? null,
    nombre: objetivo.nombre ?? "Objetivo",
    x: objetivo.x,
    y: objetivo.y,
  };
}

function parametroHabilidad(habilidad) {
  return crearParametroContenidoMensaje("habilidades", habilidad?.id, {
    respaldo: habilidad?.nombre ?? "",
  });
}

function mensajeHabilidad(sufijo, respaldo, opciones = {}) {
  return crearMensajeTraducible(`mensajes.habilidades.${sufijo}`, {
    respaldo,
    ...opciones,
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
  if (typeof jugador.registrarExperienciaMaestria !== "function") {
    throw new Error(
      "El jugador no expone el registro de experiencia de maestría.",
    );
  }
  return jugador.registrarExperienciaMaestria(evento);
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
    () => juego?.obtenerBloqueoHabilidadTemporal?.(),
    () => juego?.coordinadorTiempo?.obtenerBloqueoHabilidadJugador?.(),
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

function obtenerObjetivosVivos(juego) {
  const objetivos = Array.isArray(juego.objetivos) ? juego.objetivos : [];
  return objetivos.filter((objetivo) => !estaDerrotado(objetivo));
}

function estaDerrotado(objetivo) {
  if (typeof objetivo?.estaDerrotado === "function") {
    return Boolean(objetivo.estaDerrotado());
  }
  const vida = objetivo?.vidaActual ?? objetivo?.vida;
  return objetivo?.estaDestruido === true || (Number.isFinite(vida) && vida <= 0);
}

function leerManaActual(jugador) {
  const valor =
    jugador?.manaActual ??
    jugador?.mana ??
    jugador?.recursos?.manaActual ??
    jugador?.recursos?.mana;
  return Number.isFinite(valor) ? valor : 0;
}

function leerManaMaximo(jugador) {
  const valor =
    jugador?.manaMaxima ??
    jugador?.manaMaximo ??
    jugador?.manaMax ??
    jugador?.recursos?.manaMaxima ??
    jugador?.recursos?.manaMaximo ??
    jugador?.recursos?.manaMax;
  return Number.isFinite(valor) ? Math.max(0, valor) : null;
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
  const claves = {
    [MOTIVOS.RANURA_VACIA]: "ranuraVacia",
    [MOTIVOS.HABILIDAD_DESCONOCIDA]: "habilidadDesconocida",
    [MOTIVOS.HABILIDAD_NO_CONFIGURADA]: "habilidadNoConfigurada",
    [MOTIVOS.HABILIDAD_NO_APRENDIDA]: "habilidadNoAprendida",
    [MOTIVOS.FUERA_DE_ALCANCE]: "fueraAlcance",
    [MOTIVOS.PATRON_INVALIDO]: "patronInvalido",
    [MOTIVOS.LINEA_VISION_BLOQUEADA]: "lineaVision",
    [MOTIVOS.OBJETIVO_INVALIDO]: "objetivoInvalido",
    [MOTIVOS.BLOQUEO_TEMPORAL]: "bloqueoTemporal",
    [MOTIVOS.MANA_INSUFICIENTE]: "manaAtomico",
    [MOTIVOS.CANCELADA]: "cancelada",
    [MOTIVOS.MODO_INTERACCION_ACTIVO]: "modoInteraccion",
    [MOTIVOS.ERROR_EJECUCION]: "errorEjecucion",
  };
  const mensajePresentacion = mensaje && typeof mensaje === "object"
    ? mensaje
    : claves[motivo]
      ? mensajeHabilidad(claves[motivo], typeof mensaje === "string" ? mensaje : "", {
          tipo: TIPOS_MENSAJE_JUEGO.NEGATIVO,
        })
      : mensaje;
  return {
    exito: false,
    motivo,
    mensaje: mensajePresentacion,
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

function copiarCasilla({ x, y }) {
  return { x, y };
}

function copiarSimple(valor) {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map(copiarSimple);
  return Object.fromEntries(
    Object.entries(valor).map(([clave, actual]) => [clave, copiarSimple(actual)]),
  );
}
