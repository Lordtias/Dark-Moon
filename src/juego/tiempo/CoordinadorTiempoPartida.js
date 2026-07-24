import { Combatiente } from "../../entidad/destructible/combatiente/Combatiente.js";
import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";
import { SistemaEfectosTemporales } from "../efectos/SistemaEfectosTemporales.js";
import { procesarAccionEnemigo } from "../ia/SistemaAccionesEnemigos.js";
import { SistemaTiempo, TIEMPO_REFERENCIA } from "./SistemaTiempo.js";

function crearAcumuladoTemporal() {
  return {
    recuperacionJugador: {
      vidaRecuperada: 0,
      manaRecuperado: 0,
    },
    mensajes: [],
    eventos: [],
  };
}

function acumularResultadoTemporal(destino, origen) {
  destino.recuperacionJugador.vidaRecuperada +=
    origen.recuperacionJugador?.vidaRecuperada ?? 0;
  destino.recuperacionJugador.manaRecuperado +=
    origen.recuperacionJugador?.manaRecuperado ?? 0;
  destino.mensajes.push(...(origen.mensajes ?? []));
  destino.eventos.push(...(origen.eventos ?? []));
  return destino;
}

export class CoordinadorTiempoPartida {
  constructor({ mapa, jugador, objetivos } = {}) {
    if (!Array.isArray(mapa) || mapa.length === 0) {
      throw new Error("CoordinadorTiempoPartida necesita un mapa válido.");
    }
    if (!jugador || typeof jugador !== "object") {
      throw new Error("CoordinadorTiempoPartida necesita un jugador válido.");
    }
    if (!Array.isArray(objetivos)) {
      throw new Error(
        "CoordinadorTiempoPartida necesita una lista de objetivos.",
      );
    }

    this.mapa = mapa;
    this.jugador = jugador;
    this.objetivos = objetivos;
    this.sistemaTiempo = new SistemaTiempo();
    this.sistemaEfectosTemporales = new SistemaEfectosTemporales({
      obtenerTiempoActual: () => this.sistemaTiempo.tiempoActual,
    });
    this.sistemaTiempo.establecerConsultaDisponibilidadMinima((actor) =>
      this.sistemaEfectosTemporales.obtenerFinAturdimiento(actor),
    );
    this.siguientePulsoTemporal = TIEMPO_REFERENCIA;
    this.destruido = false;

    this.sistemaTiempo.registrarActor(this.jugador);
    this.sistemaEfectosTemporales.reanudarObjetivo(this.jugador);
    this.sincronizarEnemigosConAgenda();
    this.avanzarHastaSiguienteActorConPulsos();
  }

  get tiempoActual() {
    return this.sistemaTiempo.tiempoActual;
  }

  eliminarActor(actor, { limpiarEfectos = true } = {}) {
    if (limpiarEfectos) {
      this.sistemaEfectosTemporales.retirarEfectosObjetivo(actor, {
        motivo: "actor_retirado",
      });
    }
    return this.sistemaTiempo.eliminarActor(actor);
  }

  aplicarEfectoTemporal(definicion) {
    return this.sistemaEfectosTemporales.aplicar(definicion);
  }

  obtenerEfectosTemporales(objetivo = this.jugador) {
    return this.sistemaEfectosTemporales.obtenerEfectosObjetivo(objetivo);
  }

  retirarEfectosTemporales(objetivo = this.jugador, opciones = {}) {
    return this.sistemaEfectosTemporales.retirarEfectosObjetivo(
      objetivo,
      opciones,
    );
  }

  retirarEfectosNegativos(objetivo = this.jugador, opciones = {}) {
    return this.sistemaEfectosTemporales.retirarEfectosNegativos(
      objetivo,
      opciones,
    );
  }

  obtenerBloqueoAccionJugador() {
    if (!this.sistemaEfectosTemporales.estaAturdido(this.jugador)) {
      return null;
    }

    return {
      exito: false,
      mensaje: "Estás aturdido y no podés realizar acciones.",
      turnoConsumido: false,
      redibujar: false,
      eventos: [
        {
          tipo: "accion_rechazada_por_aturdimiento",
          objetivo: this.jugador,
        },
      ],
    };
  }

  obtenerBloqueoMovimientoJugador() {
    const bloqueoAccion = this.obtenerBloqueoAccionJugador();
    if (bloqueoAccion) {
      return bloqueoAccion;
    }

    if (!this.sistemaEfectosTemporales.estaInmovilizado(this.jugador)) {
      return null;
    }

    return {
      exito: false,
      mensaje: "Estás inmovilizado y no podés desplazarte.",
      turnoConsumido: false,
      redibujar: false,
      eventos: [
        {
          tipo: "movimiento_rechazado_por_inmovilizacion",
          objetivo: this.jugador,
        },
      ],
    };
  }

  finalizarResultadoAccionJugador({ resultado, tipoAccion, costoBase } = {}) {
    if (
      !resultado ||
      typeof resultado !== "object" ||
      typeof resultado.exito !== "boolean"
    ) {
      throw new Error(
        "La acción del jugador debe devolver un resultado válido.",
      );
    }

    if (!resultado.exito) {
      return {
        ...resultado,
        turnoConsumido: false,
        redibujar: resultado.redibujar ?? false,
      };
    }

    const resultadoTemporal = this.finalizarAccionJugador({
      mensaje: resultado.mensaje,
      tipoAccion,
      costoBase,
    });

    return {
      ...resultado,
      ...resultadoTemporal,
      exito: true,
      eventos: [
        ...(resultado.eventos ?? []),
        ...(resultadoTemporal.eventos ?? []),
      ],
    };
  }

  sincronizarEnemigosConAgenda() {
    for (const objetivo of this.objetivos) {
      if (!(objetivo instanceof Enemigo)) {
        continue;
      }
      if (!objetivo.estaVivo) {
        this.eliminarActor(objetivo);
        continue;
      }
      if (!this.sistemaTiempo.tieneActor(objetivo)) {
        this.sistemaTiempo.registrarActor(objetivo);
      }
    }
  }

  aplicarPulsoRegeneracion() {
    const combatientes = [
      this.jugador,
      ...this.objetivos.filter((objetivo) => objetivo instanceof Combatiente),
    ];
    let resultadoJugador = {
      vidaRecuperada: 0,
      manaRecuperado: 0,
    };

    for (const combatiente of combatientes) {
      if (!combatiente.estaVivo) {
        continue;
      }
      const resultado = combatiente.procesarPulsoRegeneracion();
      if (combatiente === this.jugador) {
        resultadoJugador = resultado;
      }
    }

    return resultadoJugador;
  }

  limpiarObjetivosDerrotados(objetivosDerrotados = []) {
    for (const objetivo of objetivosDerrotados) {
      this.sistemaTiempo.eliminarActor(objetivo);
    }
  }

  // Procesa regeneración y eventos de efectos hasta el destino. Cuando
  // coinciden, primero se aplica regeneración y luego ticks/vencimientos.
  procesarPulsosTemporalesHasta(tiempoDestino) {
    if (!Number.isFinite(tiempoDestino) || tiempoDestino < 0) {
      throw new Error("El tiempo de destino debe ser un número válido.");
    }

    const acumulado = crearAcumuladoTemporal();

    while (this.sistemaTiempo.tiempoActual < tiempoDestino) {
      const siguienteEfecto =
        this.sistemaEfectosTemporales.obtenerSiguienteInstante();
      const instantes = [tiempoDestino];

      if (this.siguientePulsoTemporal <= tiempoDestino) {
        instantes.push(this.siguientePulsoTemporal);
      }
      if (siguienteEfecto !== null && siguienteEfecto <= tiempoDestino) {
        instantes.push(siguienteEfecto);
      }

      const siguienteInstante = Math.min(...instantes);
      this.sistemaTiempo.avanzarTiempoHasta(siguienteInstante);

      if (this.siguientePulsoTemporal === siguienteInstante) {
        const recuperacion = this.aplicarPulsoRegeneracion();
        acumulado.recuperacionJugador.vidaRecuperada +=
          recuperacion.vidaRecuperada;
        acumulado.recuperacionJugador.manaRecuperado +=
          recuperacion.manaRecuperado;
        this.siguientePulsoTemporal += TIEMPO_REFERENCIA;
      }

      if (
        this.sistemaEfectosTemporales.obtenerSiguienteInstante() ===
        siguienteInstante
      ) {
        const resultadoEfectos =
          this.sistemaEfectosTemporales.procesarEventosEn(siguienteInstante);
        acumulado.mensajes.push(...resultadoEfectos.mensajes);
        acumulado.eventos.push(...resultadoEfectos.eventos);
        this.limpiarObjetivosDerrotados(resultadoEfectos.objetivosDerrotados);
      }
    }

    // Si el destino coincide con el reloj actual, todavía puede haber eventos
    // recién programados para ese mismo instante.
    if (
      this.sistemaEfectosTemporales.obtenerSiguienteInstante() === tiempoDestino
    ) {
      const resultadoEfectos =
        this.sistemaEfectosTemporales.procesarEventosEn(tiempoDestino);
      acumulado.mensajes.push(...resultadoEfectos.mensajes);
      acumulado.eventos.push(...resultadoEfectos.eventos);
      this.limpiarObjetivosDerrotados(resultadoEfectos.objetivosDerrotados);
    }

    return acumulado;
  }

  avanzarHastaSiguienteActorConPulsos() {
    const acumulado = crearAcumuladoTemporal();

    while (true) {
      const tiempoSiguienteActor =
        this.sistemaTiempo.obtenerTiempoSiguienteActor();
      if (tiempoSiguienteActor === null) {
        return { actor: null, ...acumulado };
      }

      const resultadoHastaActor =
        this.procesarPulsosTemporalesHasta(tiempoSiguienteActor);
      acumularResultadoTemporal(acumulado, resultadoHastaActor);

      const tiempoRecalculado =
        this.sistemaTiempo.obtenerTiempoSiguienteActor();
      if (tiempoRecalculado === null) {
        return { actor: null, ...acumulado };
      }

      if (tiempoRecalculado > this.sistemaTiempo.tiempoActual) {
        continue;
      }

      return {
        actor: this.sistemaTiempo.avanzarHastaSiguienteActor(),
        ...acumulado,
      };
    }
  }

  procesarHastaTurnoJugador() {
    const acumulado = crearAcumuladoTemporal();

    while (this.jugador.estaVivo) {
      this.sincronizarEnemigosConAgenda();
      if (!this.sistemaTiempo.obtenerSiguienteActor()) {
        break;
      }

      const avance = this.avanzarHastaSiguienteActorConPulsos();
      acumularResultadoTemporal(acumulado, avance);

      if (!avance.actor) {
        break;
      }

      if (avance.actor === this.jugador) {
        break;
      }

      const enemigo = avance.actor;
      const resultadoEnemigo = procesarAccionEnemigo({
        enemigo,
        jugador: this.jugador,
        mapa: this.mapa,
        objetivos: this.objetivos,
        estaInmovilizado: (objetivo) =>
          this.sistemaEfectosTemporales.estaInmovilizado(objetivo),
      });
      acumulado.mensajes.push(...resultadoEnemigo.mensajes);

      if (enemigo.estaVivo) {
        this.sistemaTiempo.registrarAccion({
          actor: enemigo,
          tipoAccion: resultadoEnemigo.tipoAccion,
          costoBase: resultadoEnemigo.costoBase,
        });
      } else {
        this.eliminarActor(enemigo);
      }

      if (!this.jugador.estaVivo) {
        this.eliminarActor(this.jugador);
        break;
      }
    }

    return {
      mensajes: acumulado.mensajes,
      mensaje: acumulado.mensajes.filter(Boolean).join("\n"),
      recuperacionJugador: acumulado.recuperacionJugador,
      eventos: acumulado.eventos,
    };
  }

  crearMensajeRegeneracion(regeneracion) {
    const recursosRecuperados = [];
    if (regeneracion.vidaRecuperada > 0) {
      recursosRecuperados.push(`${regeneracion.vidaRecuperada} de Vida`);
    }
    if (regeneracion.manaRecuperado > 0) {
      recursosRecuperados.push(`${regeneracion.manaRecuperado} de Maná`);
    }
    if (recursosRecuperados.length === 0) {
      return null;
    }
    return `Recuperaste ${recursosRecuperados.join(" y ")}.`;
  }

  finalizarAccionJugador({ mensaje, tipoAccion, costoBase } = {}) {
    const bloqueo = this.obtenerBloqueoAccionJugador();
    if (bloqueo) {
      return bloqueo;
    }

    this.sincronizarEnemigosConAgenda();
    const actorActual = this.sistemaTiempo.obtenerSiguienteActor();
    if (actorActual !== this.jugador) {
      throw new Error("El jugador intentó actuar fuera de su turno temporal.");
    }

    this.sistemaTiempo.registrarAccion({
      actor: this.jugador,
      tipoAccion,
      costoBase,
    });

    const resultadoTemporal = this.procesarHastaTurnoJugador();
    const mensajes = [mensaje, ...resultadoTemporal.mensajes];
    const mensajeRegeneracion = this.crearMensajeRegeneracion(
      resultadoTemporal.recuperacionJugador,
    );
    if (mensajeRegeneracion) {
      mensajes.push(mensajeRegeneracion);
    }

    return {
      mensaje: mensajes.filter(Boolean).join("\n"),
      turnoConsumido: true,
      redibujar: true,
      eventos: resultadoTemporal.eventos,
    };
  }

  destruir({ preservarEfectosJugador = true } = {}) {
    if (this.destruido) {
      return;
    }

    this.sistemaEfectosTemporales.destruir({
      preservarObjetivos:
        preservarEfectosJugador && this.jugador.estaVivo ? [this.jugador] : [],
    });
    this.sistemaTiempo.registros.clear();
    this.destruido = true;
  }
}
