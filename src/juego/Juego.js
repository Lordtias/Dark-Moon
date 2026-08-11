import { EstadoCombatePartida } from "./combate/EstadoCombatePartida.js";
import { SistemaCombateJugador } from "./combate/SistemaCombateJugador.js";
import { SistemaInteraccionJugador } from "./interacciones/SistemaInteraccionJugador.js";
import { SistemaMovimientoJugador } from "./movimiento/SistemaMovimientoJugador.js";
import { SistemaEspacial } from "./espacio/SistemaEspacial.js";
import { SistemaVisibilidadJugador } from "./visibilidad/SistemaVisibilidadJugador.js";
import {
  crearMensajeTraducible,
  TIPOS_MENSAJE_JUEGO,
} from "./mensajes/MensajesJuego.js";
import {
  COSTOS_TEMPORALES_BASE,
  TIPOS_ACCION_TEMPORAL,
} from "./tiempo/SistemaTiempo.js";
import { CoordinadorTiempoPartida } from "./tiempo/CoordinadorTiempoPartida.js";

export class Juego {
  constructor({
    map,
    player,
    objetivos,
    interactuables = [],
    mapaSeleccionado,
    planoMazmorra = null,
    configuracionObjetos,
  } = {}) {
    if (!Array.isArray(map) || map.length === 0) {
      throw new Error("Juego necesita un mapa válido.");
    }
    if (!player) {
      throw new Error("Juego necesita un jugador.");
    }
    if (!Array.isArray(objetivos)) {
      throw new Error("Los objetivos deben estar dentro de una lista.");
    }
    if (!Array.isArray(interactuables)) {
      throw new Error(
        "Las entidades interactuables deben estar dentro de una lista.",
      );
    }
    if (!mapaSeleccionado || typeof mapaSeleccionado !== "object") {
      throw new Error("Juego necesita una plantilla de mapa seleccionada.");
    }
    if (
      configuracionObjetos === null ||
      typeof configuracionObjetos !== "object" ||
      Array.isArray(configuracionObjetos)
    ) {
      throw new Error("Juego necesita una configuración de objetos válida.");
    }

    this.map = map;
    this.mapaSeleccionado = mapaSeleccionado;
    this.planoMazmorra = planoMazmorra;
    this.configuracionObjetos = configuracionObjetos;
    this.player = player;
    this.objetivos = objetivos;
    this.interactuables = interactuables;
    this.destruido = false;

    // El sistema espacial es la única autoridad runtime para combinar terreno,
    // entidades y zonas al responder bloqueos de movimiento o visión.
    this.sistemaEspacial = new SistemaEspacial({
      mapa: this.map,
      obtenerEntidades: () => [
        this.player,
        ...new Set([...this.objetivos, ...this.interactuables]),
      ],
      obtenerZonas: () =>
        this.coordinadorTiempo?.obtenerZonasTemporales?.() ?? [],
    });

    // El estado pertenece al Juego y, por tanto, al mapa activo. No se guarda
    // en EstadoPartida porque debe desaparecer al volver a ciudad o iniciar
    // otra expedición.
    this.estadoCombatePartida = new EstadoCombatePartida();
    this.coordinadorTiempo = new CoordinadorTiempoPartida({
      mapa: this.map,
      jugador: this.player,
      objetivos: this.objetivos,
      estadoCombate: this.estadoCombatePartida,
      sistemaEspacial: this.sistemaEspacial,
    });

    // La visibilidad pertenece al mapa activo y reutiliza la misma autoridad
    // espacial que movimiento, pathfinding y LOS. El radio proviene siempre
    // de la Percepción actual del jugador, nunca de la configuración del mapa.
    this.sistemaVisibilidadJugador = new SistemaVisibilidadJugador({
      mapa: this.map,
      jugador: this.player,
      sistemaEspacial: this.sistemaEspacial,
      configuracion: this.mapaSeleccionado.visibilidad,
    });

    const semillaMapa =
      this.mapaSeleccionado.generacionActual?.semilla ?? "partida";
    this.sistemaCombateJugador = new SistemaCombateJugador({
      mapa: this.map,
      jugador: this.player,
      objetivos: this.objetivos,
      interactuables: this.interactuables,
      configuracionObjetos: this.configuracionObjetos,
      semillaMapa,
      sistemaEspacial: this.sistemaEspacial,
      obtenerObjetivoEn: (x, y) => this.obtenerObjetivoEn(x, y),
      obtenerModoInteraccionActivo: () =>
        this.sistemaInteraccionJugador?.modoActivo === true,
      eliminarActorTemporal: (actor) =>
        this.coordinadorTiempo.eliminarActor(actor),
      registrarParticipanteCombate: (enemigo, motivo) =>
        this.coordinadorTiempo.registrarParticipanteCombate(enemigo, motivo),
      finalizarAccionJugador: (parametros) =>
        this.finalizarAccionJugador(parametros),
    });

    this.sistemaInteraccionJugador = new SistemaInteraccionJugador({
      jugador: this.player,
      interactuables: this.interactuables,
      obtenerModoCombateActivo: () => this.modoCombateActivo,
      obtenerContextoInteraccion: () => ({ juego: this }),
      finalizarResultadoAccionJugador: (parametros) =>
        this.finalizarResultadoAccionJugador(parametros),
    });

    this.sistemaMovimientoJugador = new SistemaMovimientoJugador({
      sistemaEspacial: this.sistemaEspacial,
      jugador: this.player,
      obtenerObjetivoEn: (x, y) => this.obtenerObjetivoEn(x, y),
      obtenerModoInteraccionActivo: () => this.modoInteraccionActivo,
      moverSelectorInteraccion: (movimientoX, movimientoY) =>
        this.moverSelectorInteraccion(movimientoX, movimientoY),
      obtenerModoCombateActivo: () => this.modoCombateActivo,
      moverSelectorCombate: (movimientoX, movimientoY) =>
        this.moverSelectorCombate(movimientoX, movimientoY),
      registrarUltimaDireccionCombate: (movimientoX, movimientoY) =>
        this.sistemaCombateJugador.registrarUltimaDireccion(
          movimientoX,
          movimientoY,
        ),
      entrarModoCombate: (selectorX, selectorY) =>
        this.entrarModoCombate(selectorX, selectorY),
      obtenerOpcionesInteraccion: () => this.obtenerOpcionesInteraccion(),
      obtenerBloqueoMovimiento: () =>
        this.coordinadorTiempo.obtenerBloqueoMovimientoJugador(),
      notificarMovimientoActor: (movimiento) =>
        this.coordinadorTiempo.notificarMovimientoActor(movimiento),
      finalizarAccionJugador: (parametros) =>
        this.finalizarAccionJugador(parametros),
    });
  }

  get sistemaTiempo() {
    return this.coordinadorTiempo.sistemaTiempo;
  }

  get sistemaEfectosTemporales() {
    return this.coordinadorTiempo.sistemaEfectosTemporales;
  }

  get sistemaZonasTemporales() {
    return this.coordinadorTiempo.sistemaZonasTemporales;
  }

  get tiempoActual() {
    return this.coordinadorTiempo.tiempoActual;
  }

  esCasillaVisibleJugador(x, y) {
    return this.sistemaVisibilidadJugador.esCasillaVisible(x, y);
  }

  esCasillaDescubiertaJugador(x, y) {
    return this.sistemaVisibilidadJugador.esCasillaDescubierta(x, y);
  }

  obtenerEstadoVisibilidadJugador() {
    return this.sistemaVisibilidadJugador.obtenerEstado();
  }

  get estaEnCombate() {
    return this.estadoCombatePartida.estaEnCombate;
  }

  get cantidadParticipantesCombate() {
    return this.estadoCombatePartida.cantidadParticipantes;
  }

  obtenerParticipantesCombate() {
    return this.estadoCombatePartida.obtenerParticipantes();
  }

  get modoCombateActivo() {
    return this.sistemaCombateJugador.modoActivo;
  }

  get selectorCombate() {
    return this.sistemaCombateJugador.selector;
  }

  get ultimaDireccionJugador() {
    return this.sistemaCombateJugador.ultimaDireccion;
  }

  get modoInteraccionActivo() {
    return this.sistemaInteraccionJugador.modoActivo;
  }

  get selectorInteraccion() {
    return this.sistemaInteraccionJugador.selector;
  }

  obtenerObjetivoEn(x, y) {
    return this.objetivos.find(
      (objetivo) =>
        !objetivo.estaDestruido && objetivo.x === x && objetivo.y === y,
    );
  }

  obtenerInteractuablesEn(x, y) {
    return this.interactuables.filter(
      (interactuable) => interactuable.x === x && interactuable.y === y,
    );
  }

  obtenerBloqueoAccionTemporal() {
    return this.coordinadorTiempo.obtenerBloqueoAccionJugador();
  }

  obtenerBloqueoHabilidadTemporal() {
    return this.coordinadorTiempo.obtenerBloqueoHabilidadJugador();
  }

  aplicarEfectoTemporal(definicion) {
    return this.coordinadorTiempo.aplicarEfectoTemporal(definicion);
  }

  obtenerEfectosTemporales(objetivo = this.player) {
    return this.coordinadorTiempo.obtenerEfectosTemporales(objetivo);
  }

  retirarEfectosTemporales(objetivo = this.player, opciones = {}) {
    return this.coordinadorTiempo.retirarEfectosTemporales(objetivo, opciones);
  }

  // Fachada prevista para que la curandera pueda restaurar estados en una
  // otro consumidor sin conocer la implementación interna del motor.
  retirarEfectosNegativos(objetivo = this.player, opciones = {}) {
    return this.coordinadorTiempo.retirarEfectosNegativos(objetivo, opciones);
  }

  crearZonaTemporal(definicion) {
    return this.coordinadorTiempo.crearZonaTemporal(definicion);
  }

  obtenerZonasTemporales() {
    return this.coordinadorTiempo.obtenerZonasTemporales();
  }

  notificarMovimientoActor(movimiento) {
    return this.coordinadorTiempo.notificarMovimientoActor(movimiento);
  }

  obtenerInteraccionesDisponibles() {
    return this.sistemaInteraccionJugador.obtenerInteraccionesDisponibles();
  }

  obtenerInteraccionPrioritaria() {
    return this.sistemaInteraccionJugador.obtenerInteraccionPrioritaria();
  }

  obtenerOpcionesInteraccion() {
    return this.sistemaInteraccionJugador.obtenerOpcionesInteraccion();
  }

  obtenerOpcionInteraccionSeleccionada() {
    return this.sistemaInteraccionJugador.obtenerOpcionSeleccionada();
  }

  entrarModoInteraccion() {
    return this.sistemaInteraccionJugador.entrarModoInteraccion();
  }

  moverSelectorInteraccion(movimientoX, movimientoY) {
    return this.sistemaInteraccionJugador.moverSelector(
      movimientoX,
      movimientoY,
    );
  }

  seleccionarCasillaInteraccion(x, y) {
    return this.sistemaInteraccionJugador.seleccionarCasilla(x, y);
  }

  confirmarInteraccionSeleccionada() {
    const bloqueo = this.obtenerBloqueoAccionTemporal();
    return bloqueo ?? this.sistemaInteraccionJugador.confirmarSeleccion();
  }

  cancelarModoInteraccion() {
    return this.sistemaInteraccionJugador.cancelarModoInteraccion();
  }

  activarInteractuable(interaccion) {
    const bloqueo = this.obtenerBloqueoAccionTemporal();
    return (
      bloqueo ?? this.sistemaInteraccionJugador.ejecutarActivacion(interaccion)
    );
  }

  establecerSelectorInteraccion(opcion) {
    return this.sistemaInteraccionJugador.establecerSelector(opcion);
  }

  limpiarSelectorInteraccion() {
    return this.sistemaInteraccionJugador.limpiarSelector();
  }

  estaDentroMapa(x, y) {
    return this.sistemaMovimientoJugador.estaDentroMapa(x, y);
  }

  esCaminable(x, y) {
    return this.sistemaMovimientoJugador.esCaminable(x, y);
  }

  estaDiagonalBloqueada(movimientoX, movimientoY) {
    return this.sistemaMovimientoJugador.estaDiagonalBloqueada(
      movimientoX,
      movimientoY,
    );
  }

  moverJugador(movimientoX, movimientoY) {
    return this.sistemaMovimientoJugador.mover(movimientoX, movimientoY);
  }

  estaCasillaDentroAlcance(x, y) {
    return this.sistemaCombateJugador.estaCasillaDentroAlcance(x, y);
  }

  evaluarCasillaAtaque(x, y) {
    return this.sistemaCombateJugador.evaluarCasillaAtaque(x, y);
  }

  esCasillaAtacable(x, y) {
    return this.sistemaCombateJugador.esCasillaAtacable(x, y);
  }

  obtenerEnemigoPrioritarioCombate() {
    return this.sistemaCombateJugador.obtenerEnemigoPrioritario();
  }

  obtenerCasillaInicialCombate() {
    return this.sistemaCombateJugador.obtenerCasillaInicial();
  }

  obtenerSeleccionInicialCombate() {
    return this.sistemaCombateJugador.obtenerSeleccionInicial();
  }

  entrarModoCombate(selectorX = null, selectorY = null) {
    return this.sistemaCombateJugador.entrar(selectorX, selectorY);
  }

  cancelarModoCombate() {
    return this.sistemaCombateJugador.cancelar();
  }

  moverSelectorCombate(movimientoX, movimientoY) {
    return this.sistemaCombateJugador.moverSelector(movimientoX, movimientoY);
  }

  seleccionarCasillaCombate(x, y) {
    return this.sistemaCombateJugador.seleccionarCasilla(x, y);
  }

  atacarObjetivo(objetivo) {
    const bloqueo = this.obtenerBloqueoAccionTemporal();
    return bloqueo ?? this.sistemaCombateJugador.atacarObjetivo(objetivo);
  }

  confirmarAtaque() {
    const bloqueo = this.obtenerBloqueoAccionTemporal();
    return bloqueo ?? this.sistemaCombateJugador.confirmarAtaque();
  }

  obtenerBloqueoAccionPanelObjetos() {
    if (!this.player.estaVivo) {
      return {
        exito: false,
        mensaje: crearMensajeTraducible("mensajes.juego.equipamientoDerrotado", { tipo: TIPOS_MENSAJE_JUEGO.NEGATIVO, respaldo: "No podés modificar el equipamiento estando derrotado." }),
        turnoConsumido: false,
        redibujar: false,
      };
    }

    const bloqueoTemporal = this.obtenerBloqueoAccionTemporal();
    if (bloqueoTemporal) {
      return bloqueoTemporal;
    }

    if (this.modoCombateActivo) {
      return {
        exito: false,
        mensaje: crearMensajeTraducible("mensajes.juego.equipamientoCombate", { tipo: TIPOS_MENSAJE_JUEGO.ALERTA, respaldo: "Cancelá el modo combate antes de cambiar el equipamiento." }),
        turnoConsumido: false,
        redibujar: false,
      };
    }

    if (this.modoInteraccionActivo) {
      return {
        exito: false,
        mensaje: crearMensajeTraducible("mensajes.juego.objetosInteraccion", { tipo: TIPOS_MENSAJE_JUEGO.ALERTA, respaldo: "Cancelá la selección de interacción antes de usar objetos." }),
        turnoConsumido: false,
        redibujar: false,
      };
    }

    return null;
  }

  obtenerBloqueoInteraccion() {
    return (
      this.obtenerBloqueoAccionTemporal() ??
      this.sistemaInteraccionJugador.obtenerBloqueoInteraccion()
    );
  }

  interactuarConObjetoInventario(indiceInventario) {
    const bloqueo = this.obtenerBloqueoAccionPanelObjetos();
    if (bloqueo) {
      return bloqueo;
    }

    const objetoSeleccionado =
      this.player.inventario.obtenerObjetoEn(indiceInventario);
    const esConsumo = objetoSeleccionado?.esConsumible === true;
    const tipoAccion = esConsumo
      ? TIPOS_ACCION_TEMPORAL.CONSUMO
      : TIPOS_ACCION_TEMPORAL.ACCION;
    const costoBase = esConsumo
      ? objetoSeleccionado.costoConsumo
      : COSTOS_TEMPORALES_BASE.accion;
    const resultado =
      this.player.interactuarConObjetoInventario(indiceInventario);

    return this.finalizarResultadoAccionJugador({
      resultado,
      tipoAccion,
      costoBase,
    });
  }

  desequiparObjetoAInventario(nombreRanura) {
    const bloqueo = this.obtenerBloqueoAccionPanelObjetos();
    if (bloqueo) {
      return bloqueo;
    }

    const resultado = this.player.desequiparObjetoAInventario(nombreRanura);
    return this.finalizarResultadoAccionJugador({
      resultado,
      tipoAccion: TIPOS_ACCION_TEMPORAL.ACCION,
      costoBase: COSTOS_TEMPORALES_BASE.accion,
    });
  }

  recogerObjetoInteractuable(interactuable, indiceOrigen) {
    const bloqueo = this.obtenerBloqueoAccionTemporal();
    return (
      bloqueo ??
      this.sistemaInteraccionJugador.recogerObjeto(interactuable, indiceOrigen)
    );
  }

  recogerTodoInteractuable(interactuable) {
    const bloqueo = this.obtenerBloqueoAccionTemporal();
    return bloqueo ?? this.sistemaInteraccionJugador.recogerTodo(interactuable);
  }

  validarInteraccionContenedor(interactuable) {
    return this.sistemaInteraccionJugador.validarInteraccionContenedor(
      interactuable,
    );
  }

  retirarInteractuableSiVacio(interactuable) {
    return this.sistemaInteraccionJugador.retirarInteractuableSiVacio(
      interactuable,
    );
  }

  incorporarDestruccionesPendientes(resultado) {
    if (!resultado || typeof resultado !== "object") {
      return resultado;
    }

    const derrotas = this.sistemaCombateJugador.resolverDestruccionesPendientes();
    if (!derrotas.mensaje && (derrotas.eventos?.length ?? 0) === 0) {
      return resultado;
    }

    return {
      ...resultado,
      mensaje: [resultado.mensaje, derrotas.mensaje].filter(Boolean),
      eventos: [...(resultado.eventos ?? []), ...(derrotas.eventos ?? [])],
      redibujar: true,
    };
  }

  finalizarResultadoAccionJugador({ resultado, tipoAccion, costoBase } = {}) {
    const resultadoConDerrotasInmediatas =
      this.incorporarDestruccionesPendientes(resultado);
    const resultadoTemporal =
      this.coordinadorTiempo.finalizarResultadoAccionJugador({
        resultado: resultadoConDerrotasInmediatas,
        tipoAccion,
        costoBase,
      });

    return this.incorporarDestruccionesPendientes(resultadoTemporal);
  }

  finalizarAccionJugador({
    mensaje,
    tipoAccion,
    costoBase,
    eventos = [],
  } = {}) {
    const resultadoConDerrotasInmediatas = this.incorporarDestruccionesPendientes({
      mensaje,
      eventos,
    });
    const resultadoTemporal = this.coordinadorTiempo.finalizarAccionJugador({
      mensaje: resultadoConDerrotasInmediatas.mensaje,
      tipoAccion,
      costoBase,
      eventos: resultadoConDerrotasInmediatas.eventos ?? [],
    });

    return this.incorporarDestruccionesPendientes(resultadoTemporal);
  }

  esperarTurno() {
    if (!this.player.estaVivo) {
      return {
        mensaje: null,
        turnoConsumido: false,
        redibujar: false,
      };
    }

    const bloqueoTemporal = this.obtenerBloqueoAccionTemporal();
    if (bloqueoTemporal) {
      return bloqueoTemporal;
    }

    if (this.modoInteraccionActivo) {
      return {
        mensaje: crearMensajeTraducible("mensajes.combate.confirmarInteraccion", { tipo: TIPOS_MENSAJE_JUEGO.ALERTA, respaldo: "Confirmá la interacción con R o cancelá con Escape." }),
        turnoConsumido: false,
        redibujar: false,
      };
    }

    if (this.modoCombateActivo) {
      return {
        mensaje: crearMensajeTraducible("mensajes.combate.confirmarAtaque", { tipo: TIPOS_MENSAJE_JUEGO.ALERTA, respaldo: "Confirmá con F o cancelá con Escape." }),
        turnoConsumido: false,
        redibujar: false,
      };
    }

    return this.finalizarAccionJugador({
      mensaje: null,
      tipoAccion: TIPOS_ACCION_TEMPORAL.ESPERA,
      costoBase: COSTOS_TEMPORALES_BASE.espera,
    });
  }

  destruir({ preservarEfectosJugador = true } = {}) {
    if (this.destruido) {
      return;
    }

    this.coordinadorTiempo.destruir({ preservarEfectosJugador });
    this.destruido = true;
  }
}
