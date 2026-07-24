import { EstadoCombatePartida } from "./combate/EstadoCombatePartida.js";
import { SistemaCombateJugador } from "./combate/SistemaCombateJugador.js";
import { SistemaInteraccionJugador } from "./interacciones/SistemaInteraccionJugador.js";
import { SistemaMovimientoJugador } from "./movimiento/SistemaMovimientoJugador.js";
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
    this.configuracionObjetos = configuracionObjetos;
    this.player = player;
    this.objetivos = objetivos;
    this.interactuables = interactuables;
    this.destruido = false;

    // El estado pertenece al Juego y, por tanto, al mapa activo. No se guarda
    // en EstadoPartida porque debe desaparecer al volver a ciudad o iniciar
    // otra expedición.
    this.estadoCombatePartida = new EstadoCombatePartida();
    this.coordinadorTiempo = new CoordinadorTiempoPartida({
      mapa: this.map,
      jugador: this.player,
      objetivos: this.objetivos,
      estadoCombate: this.estadoCombatePartida,
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
      esCaminable: (x, y) => this.esCaminable(x, y),
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
      mapa: this.map,
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

  get tiempoActual() {
    return this.coordinadorTiempo.tiempoActual;
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
  // etapa posterior sin conocer la implementación interna del motor.
  retirarEfectosNegativos(objetivo = this.player, opciones = {}) {
    return this.coordinadorTiempo.retirarEfectosNegativos(objetivo, opciones);
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

  confirmarInteraccionSeleccionada() {
    const bloqueo = this.obtenerBloqueoAccionTemporal();
    return bloqueo ?? this.sistemaInteraccionJugador.confirmarSeleccion();
  }

  cancelarModoInteraccion() {
    return this.sistemaInteraccionJugador.cancelarModoInteraccion();
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
        mensaje: "No podés modificar el equipamiento estando derrotado.",
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
        mensaje: "Cancelá el modo combate antes de cambiar el equipamiento.",
        turnoConsumido: false,
        redibujar: false,
      };
    }

    if (this.modoInteraccionActivo) {
      return {
        exito: false,
        mensaje: "Cancelá la selección de interacción antes de usar objetos.",
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

  finalizarResultadoAccionJugador({ resultado, tipoAccion, costoBase } = {}) {
    return this.coordinadorTiempo.finalizarResultadoAccionJugador({
      resultado,
      tipoAccion,
      costoBase,
    });
  }

  finalizarAccionJugador({ mensaje, tipoAccion, costoBase } = {}) {
    return this.coordinadorTiempo.finalizarAccionJugador({
      mensaje,
      tipoAccion,
      costoBase,
    });
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
        mensaje: "Confirmá la interacción con R o cancelá con Escape.",
        turnoConsumido: false,
        redibujar: false,
      };
    }

    if (this.modoCombateActivo) {
      return {
        mensaje: "Confirmá con F o cancelá con Escape.",
        turnoConsumido: false,
        redibujar: false,
      };
    }

    return this.finalizarAccionJugador({
      mensaje: "Esperaste una acción.",
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
