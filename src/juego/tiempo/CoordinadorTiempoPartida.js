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
  constructor({ mapa, jugador, objetivos, estadoCombate } = {}) {
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
    if (
      !estadoCombate ||
      typeof estadoCombate.registrarParticipante !== "function" ||
      typeof estadoCombate.retirarParticipante !== "function" ||
      typeof estadoCombate.limpiar !== "function" ||
      typeof estadoCombate.extraerEventosPendientes !== "function"
    ) {
      throw new Error(
        "CoordinadorTiempoPartida necesita un estado de combate válido.",
      );
    }

    this.mapa = mapa;
    this.jugador = jugador;
    this.objetivos = objetivos;
    this.estadoCombate = estadoCombate;
    this.sistemaTiempo = new SistemaTiempo();
    this.sistemaEfectosTemporales = new SistemaEfectosTemporales({
      obtenerTiempoActual: () => this.sistemaTiempo.tiempoActual,
    });

    // El motor de efectos conserva una fuente descriptiva. Este mapa privado
    // agrega, solo durante la vida del mapa activo, la identidad de la entidad
    // que originó el efecto. No se serializa ni se transfiere entre mapas.
    this.fuentesCombatientesPorEfecto = new Map();

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

  registrarParticipanteCombate(enemigo, motivo) {
    return this.estadoCombate.registrarParticipante(enemigo, { motivo });
  }

  retirarParticipanteCombate(enemigo, motivo) {
    return this.estadoCombate.retirarParticipante(enemigo, { motivo });
  }

  extraerEventosCombateEn(acumulado) {
    acumulado.eventos.push(...this.estadoCombate.extraerEventosPendientes());
  }

  eliminarFuentesPertenecientesA(actor) {
    for (const [efectoId, fuente] of this.fuentesCombatientesPorEfecto) {
      if (fuente === actor) {
        this.fuentesCombatientesPorEfecto.delete(efectoId);
      }
    }
  }

  eliminarFuentesSegunEventos(eventos = []) {
    for (const evento of eventos) {
      if (
        evento.tipo === "efecto_retirado" ||
        evento.tipo === "efecto_vencido"
      ) {
        this.fuentesCombatientesPorEfecto.delete(evento.efectoId);
      }
    }
  }

  eliminarActor(
    actor,
    { limpiarEfectos = true, motivoCombate = "actor_retirado" } = {},
  ) {
    if (actor === this.jugador) {
      this.estadoCombate.limpiar({ motivo: "muerte_jugador" });
    } else if (actor instanceof Enemigo) {
      this.retirarParticipanteCombate(actor, motivoCombate);
      this.eliminarFuentesPertenecientesA(actor);
    }

    if (limpiarEfectos) {
      const resultadoRetiro =
        this.sistemaEfectosTemporales.retirarEfectosObjetivo(actor, {
          motivo: "actor_retirado",
        });
      this.eliminarFuentesSegunEventos(resultadoRetiro.eventos);
    }

    return this.sistemaTiempo.eliminarActor(actor);
  }

  aplicarEfectoTemporal(definicion = {}) {
    if (!definicion || typeof definicion !== "object") {
      throw new Error("La definición del efecto temporal debe ser válida.");
    }

    // fuenteCombatiente es contexto de la partida, no parte del contrato
    // serializable de SistemaEfectosTemporales.
    const { fuenteCombatiente = null, ...definicionEfecto } = definicion;
    const resultado = this.sistemaEfectosTemporales.aplicar(definicionEfecto);

    if (resultado.exito && resultado.efecto?.id && fuenteCombatiente) {
      this.fuentesCombatientesPorEfecto.set(
        resultado.efecto.id,
        fuenteCombatiente,
      );
    }

    // Aplicar con éxito un efecto negativo sobre un objetivo válido ya es una
    // participación hostil real, incluso antes de su primer tick de daño.
    if (
      resultado.exito &&
      resultado.aplicado &&
      resultado.efecto?.beneficioso === false
    ) {
      if (
        definicion.objetivo instanceof Enemigo &&
        definicion.objetivo.estaVivo &&
        this.objetivos.includes(definicion.objetivo) &&
        fuenteCombatiente === this.jugador
      ) {
        this.registrarParticipanteCombate(
          definicion.objetivo,
          "efecto_hostil_aplicado_por_jugador",
        );
      } else if (
        definicion.objetivo === this.jugador &&
        fuenteCombatiente instanceof Enemigo &&
        fuenteCombatiente.estaVivo &&
        this.objetivos.includes(fuenteCombatiente)
      ) {
        this.registrarParticipanteCombate(
          fuenteCombatiente,
          "efecto_hostil_aplicado_por_enemigo",
        );
      }
    }

    return resultado;
  }

  obtenerEfectosTemporales(objetivo = this.jugador) {
    return this.sistemaEfectosTemporales.obtenerEfectosObjetivo(objetivo);
  }

  retirarEfectosTemporales(objetivo = this.jugador, opciones = {}) {
    const resultado = this.sistemaEfectosTemporales.retirarEfectosObjetivo(
      objetivo,
      opciones,
    );
    this.eliminarFuentesSegunEventos(resultado.eventos);
    return resultado;
  }

  retirarEfectosNegativos(objetivo = this.jugador, opciones = {}) {
    const resultado = this.sistemaEfectosTemporales.retirarEfectosNegativos(
      objetivo,
      opciones,
    );
    this.eliminarFuentesSegunEventos(resultado.eventos);
    return resultado;
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
        this.eliminarActor(objetivo, {
          motivoCombate: "enemigo_derrotado",
        });
        continue;
      }
      if (!this.sistemaTiempo.tieneActor(objetivo)) {
        this.sistemaTiempo.registrarActor(objetivo);
      }
    }

    this.estadoCombate.retirarParticipantesInvalidos(
      (participante) =>
        participante instanceof Enemigo &&
        participante.estaVivo &&
        this.objetivos.includes(participante),
      { motivo: "participante_fuera_del_mapa" },
    );
  }

  aplicarPulsoRegeneracion() {
    let resultadoJugador = {
      vidaRecuperada: 0,
      manaRecuperado: 0,
    };

    if (this.jugador.estaVivo) {
      const estadisticasJugador = this.jugador.estadisticasDerivadas;
      resultadoJugador = {
        // El acumulador fraccionario de Vida queda pausado durante combate:
        // no se incrementa, no se consume y tampoco se reinicia.
        vidaRecuperada: this.estadoCombate.estaEnCombate
          ? 0
          : this.jugador.procesarRegeneracionVida(estadisticasJugador),
        // El Maná mantiene exactamente la política de la ETAPA 3 dentro y
        // fuera de combate.
        manaRecuperado:
          this.jugador.procesarRegeneracionMana(estadisticasJugador),
      };
    }

    // La ETAPA 3A no modifica la regeneración de enemigos.
    for (const objetivo of this.objetivos) {
      if (!(objetivo instanceof Combatiente) || !objetivo.estaVivo) {
        continue;
      }
      objetivo.procesarPulsoRegeneracion();
    }

    return resultadoJugador;
  }

  limpiarObjetivosDerrotados(objetivosDerrotados = []) {
    for (const objetivo of objetivosDerrotados) {
      this.eliminarActor(objetivo, {
        limpiarEfectos: false,
        motivoCombate:
          objetivo === this.jugador
            ? "muerte_jugador"
            : "enemigo_derrotado_por_efecto",
      });
    }
  }

  procesarHostilidadDeEfectos(eventos = []) {
    for (const evento of eventos) {
      if (
        evento.tipo === "efecto_retirado" ||
        evento.tipo === "efecto_vencido"
      ) {
        this.fuentesCombatientesPorEfecto.delete(evento.efectoId);
        continue;
      }

      if (evento.tipo !== "danio_periodico_aplicado" || evento.danio <= 0) {
        continue;
      }

      // Un enemigo vivo que recibe daño periódico del jugador participa de
      // nuevo aunque hubiese perdido la persecución entre ticks.
      if (
        evento.objetivo instanceof Enemigo &&
        evento.objetivo.estaVivo &&
        this.objetivos.includes(evento.objetivo)
      ) {
        this.registrarParticipanteCombate(
          evento.objetivo,
          "danio_periodico_recibido_por_enemigo",
        );
        continue;
      }

      if (evento.objetivo !== this.jugador) {
        continue;
      }

      const fuenteCombatiente =
        this.fuentesCombatientesPorEfecto.get(evento.efectoId) ??
        evento.fuente?.combatiente ??
        evento.fuente?.actor ??
        evento.fuente?.entidad ??
        null;

      // Un efecto residual de un enemigo muerto o perteneciente a otro mapa
      // puede conservar su daño, pero no reactiva un combate ya finalizado.
      if (
        fuenteCombatiente instanceof Enemigo &&
        fuenteCombatiente.estaVivo &&
        this.objetivos.includes(fuenteCombatiente)
      ) {
        this.registrarParticipanteCombate(
          fuenteCombatiente,
          "danio_periodico_recibido_por_jugador",
        );
      }
    }
  }

  procesarResultadoEfectos(resultadoEfectos, acumulado) {
    acumulado.mensajes.push(...resultadoEfectos.mensajes);
    acumulado.eventos.push(...resultadoEfectos.eventos);
    this.procesarHostilidadDeEfectos(resultadoEfectos.eventos);
    this.limpiarObjetivosDerrotados(resultadoEfectos.objetivosDerrotados);
    this.extraerEventosCombateEn(acumulado);
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
        this.procesarResultadoEfectos(resultadoEfectos, acumulado);
      }
    }

    // Si el destino coincide con el reloj actual, todavía puede haber eventos
    // recién programados para ese mismo instante.
    if (
      this.sistemaEfectosTemporales.obtenerSiguienteInstante() === tiempoDestino
    ) {
      const resultadoEfectos =
        this.sistemaEfectosTemporales.procesarEventosEn(tiempoDestino);
      this.procesarResultadoEfectos(resultadoEfectos, acumulado);
    }

    return acumulado;
  }

  avanzarHastaSiguienteActorConPulsos() {
    const acumulado = crearAcumuladoTemporal();
    while (true) {
      const tiempoSiguienteActor =
        this.sistemaTiempo.obtenerTiempoSiguienteActor();
      if (tiempoSiguienteActor === null) {
        return {
          actor: null,
          ...acumulado,
        };
      }

      const resultadoHastaActor =
        this.procesarPulsosTemporalesHasta(tiempoSiguienteActor);
      acumularResultadoTemporal(acumulado, resultadoHastaActor);
      const tiempoRecalculado =
        this.sistemaTiempo.obtenerTiempoSiguienteActor();

      if (tiempoRecalculado === null) {
        return {
          actor: null,
          ...acumulado,
        };
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

    // Incluye cualquier inicio o finalización producido por la acción del
    // jugador antes de que el reloj comience a avanzar.
    this.extraerEventosCombateEn(acumulado);

    while (this.jugador.estaVivo) {
      this.sincronizarEnemigosConAgenda();
      this.extraerEventosCombateEn(acumulado);

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
        registrarParticipanteCombate: (participante, motivo) =>
          this.registrarParticipanteCombate(participante, motivo),
        retirarParticipanteCombate: (participante, motivo) =>
          this.retirarParticipanteCombate(participante, motivo),
      });
      acumulado.mensajes.push(...resultadoEnemigo.mensajes);
      this.extraerEventosCombateEn(acumulado);

      if (enemigo.estaVivo) {
        this.sistemaTiempo.registrarAccion({
          actor: enemigo,
          tipoAccion: resultadoEnemigo.tipoAccion,
          costoBase: resultadoEnemigo.costoBase,
        });
      } else {
        this.eliminarActor(enemigo, {
          motivoCombate: "enemigo_derrotado",
        });
        this.extraerEventosCombateEn(acumulado);
      }

      if (!this.jugador.estaVivo) {
        this.eliminarActor(this.jugador, {
          motivoCombate: "muerte_jugador",
        });
        this.extraerEventosCombateEn(acumulado);
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

    this.estadoCombate.limpiar({ motivo: "destruccion_mapa" });
    // Al destruir el mapa no queda ningún consumidor del evento. Se descarta
    // para liberar también las referencias contenidas en la cola.
    this.estadoCombate.extraerEventosPendientes();
    this.sistemaEfectosTemporales.destruir({
      preservarObjetivos:
        preservarEfectosJugador && this.jugador.estaVivo ? [this.jugador] : [],
    });
    this.fuentesCombatientesPorEfecto.clear();
    this.sistemaTiempo.registros.clear();
    this.destruido = true;
  }
}
