import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";
import { verificarRequisitosAtaque } from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";
import { crearEventoAtaqueResuelto } from "../acciones/EventosAccion.js";
import { crearResultadoAccion } from "../acciones/ResultadoAccion.js";
import { TIPOS_ACCION_TEMPORAL } from "../tiempo/SistemaTiempo.js";
import { ResolutorDerrotasJugador } from "./ResolutorDerrotasJugador.js";
import {
  calcularDistanciaCuadricula,
  evaluarAtaqueCasilla,
} from "./SistemaAlcanceAtaque.js";
import {
  seleccionarObjetivoPrioritario,
} from "./SelectorObjetivoPrioritario.js";

function crearResultadoAtaqueCasillaVacia({ jugador, posicionObjetivo }) {
  const configuracionAtaque = jugador.configuracionAtaqueActual;
  const resultadoAtaque = jugador.atacarCasillaVacia();

  return {
    mensaje: resultadoAtaque.mensaje,
    eventos: [
      crearEventoAtaqueResuelto({
        atacante: jugador,
        posicionObjetivo,
        resultado: resultadoAtaque,
        configuracionAtaque,
      }),
    ],
  };
}

// Administra el combate iniciado por el jugador.
export class SistemaCombateJugador {
  constructor({
    mapa,
    jugador,
    objetivos,
    interactuables,
    configuracionObjetos,
    semillaMapa = "partida",
    esCaminable,
    obtenerObjetivoEn,
    obtenerModoInteraccionActivo,
    eliminarActorTemporal,
    registrarParticipanteCombate,
    finalizarAccionJugador,
  } = {}) {
    if (!Array.isArray(mapa) || mapa.length === 0) {
      throw new Error("SistemaCombateJugador necesita un mapa válido.");
    }
    if (!jugador || typeof jugador !== "object") {
      throw new Error("SistemaCombateJugador necesita un jugador válido.");
    }
    if (!Array.isArray(objetivos)) {
      throw new Error("SistemaCombateJugador necesita una lista de objetivos.");
    }
    if (!Array.isArray(interactuables)) {
      throw new Error(
        "SistemaCombateJugador necesita una lista de interactuables.",
      );
    }
    if (
      configuracionObjetos === null ||
      typeof configuracionObjetos !== "object" ||
      Array.isArray(configuracionObjetos)
    ) {
      throw new Error(
        "SistemaCombateJugador necesita una configuración de objetos válida.",
      );
    }
    if (typeof esCaminable !== "function") {
      throw new Error(
        "SistemaCombateJugador necesita consultar casillas caminables.",
      );
    }
    if (typeof obtenerObjetivoEn !== "function") {
      throw new Error(
        "SistemaCombateJugador necesita consultar objetivos del mapa.",
      );
    }
    if (typeof obtenerModoInteraccionActivo !== "function") {
      throw new Error(
        "SistemaCombateJugador necesita consultar el modo interacción.",
      );
    }
    if (typeof eliminarActorTemporal !== "function") {
      throw new Error(
        "SistemaCombateJugador necesita retirar actores temporales.",
      );
    }
    if (typeof registrarParticipanteCombate !== "function") {
      throw new Error(
        "SistemaCombateJugador necesita registrar participantes de combate.",
      );
    }
    if (typeof finalizarAccionJugador !== "function") {
      throw new Error(
        "SistemaCombateJugador necesita finalizar acciones temporales.",
      );
    }

    this.mapa = mapa;
    this.jugador = jugador;
    this.objetivos = objetivos;
    this.esCaminable = esCaminable;
    this.obtenerObjetivoEn = obtenerObjetivoEn;
    this.obtenerModoInteraccionActivo = obtenerModoInteraccionActivo;
    this.registrarParticipanteCombate = registrarParticipanteCombate;
    this.finalizarAccionJugador = finalizarAccionJugador;
    this.resolutorDerrotasJugador = new ResolutorDerrotasJugador({
      jugador,
      objetivos,
      interactuables,
      configuracionObjetos,
      semillaMapa,
      eliminarActorTemporal,
    });
    this.modoActivo = false;
    this.selector = { x: this.jugador.x, y: this.jugador.y };
    this.ultimaDireccion = { x: 0, y: -1 };
  }

  registrarUltimaDireccion(movimientoX, movimientoY) {
    this.ultimaDireccion = { x: movimientoX, y: movimientoY };
  }

  estaCasillaDentroAlcance(x, y) {
    const distancia = calcularDistanciaCuadricula(
      { x: this.jugador.x, y: this.jugador.y },
      { x, y },
    );
    return distancia >= 1 && distancia <= this.jugador.alcanceAtaque;
  }

  evaluarCasillaAtaque(x, y) {
    return evaluarAtaqueCasilla({
      atacante: this.jugador,
      xObjetivo: x,
      yObjetivo: y,
      mapa: this.mapa,
    });
  }

  esCasillaAtacable(x, y) {
    return this.evaluarCasillaAtaque(x, y).puedeAtacar;
  }

  obtenerEnemigoPrioritario() {
    return seleccionarObjetivoPrioritario({
      origen: this.jugador,
      objetivos: this.objetivos,
      esObjetivoValido: (objetivo) =>
        objetivo instanceof Enemigo &&
        objetivo.estaVivo &&
        this.esCasillaAtacable(objetivo.x, objetivo.y),
    });
  }

  obtenerCasillaInicial() {
    const direcciones = [
      this.ultimaDireccion,
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
      { x: -1, y: -1 },
    ];

    for (const direccion of direcciones) {
      const x = this.jugador.x + direccion.x;
      const y = this.jugador.y + direccion.y;
      if (this.esCaminable(x, y) && this.esCasillaAtacable(x, y)) {
        return { x, y };
      }
    }

    return null;
  }

  obtenerSeleccionInicial() {
    const enemigoPrioritario = this.obtenerEnemigoPrioritario();
    if (enemigoPrioritario) {
      return { x: enemigoPrioritario.x, y: enemigoPrioritario.y };
    }
    return this.obtenerCasillaInicial();
  }

  entrar(selectorX = null, selectorY = null) {
    if (!this.jugador.estaVivo) {
      return crearResultadoAccion({ exito: false });
    }
    if (this.obtenerModoInteraccionActivo()) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "Confirmá la interacción con R o cancelá con Escape.",
      });
    }

    const seleccionExplicita = selectorX !== null && selectorY !== null;
    const seleccion = seleccionExplicita
      ? { x: selectorX, y: selectorY }
      : this.obtenerSeleccionInicial();

    if (seleccion === null) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "No hay una casilla válida para atacar.",
      });
    }

    const evaluacion = this.evaluarCasillaAtaque(seleccion.x, seleccion.y);
    if (seleccionExplicita && !evaluacion.puedeAtacar) {
      return crearResultadoAccion({
        exito: false,
        mensaje: evaluacion.mensaje,
      });
    }
    if (
      !this.esCaminable(seleccion.x, seleccion.y) ||
      !this.estaCasillaDentroAlcance(seleccion.x, seleccion.y)
    ) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "No hay una casilla válida para atacar.",
      });
    }

    this.modoActivo = true;
    this.selector = seleccion;
    const objetivo = this.obtenerObjetivoEn(seleccion.x, seleccion.y);
    return crearResultadoAccion({
      mensaje: objetivo
        ? `Modo combate: seleccionaste a ${objetivo.nombre}.`
        : `Modo combate: casilla ${seleccion.x}, ${seleccion.y}.`,
      redibujar: true,
    });
  }

  cancelar() {
    const respaldoActivo = this.jugador.ataqueNaturalForzado === true;
    if (!this.modoActivo && !respaldoActivo) {
      return crearResultadoAccion({ exito: false });
    }

    this.jugador.ataqueNaturalForzado = false;
    this.limpiarSelector();
    return crearResultadoAccion({
      mensaje: respaldoActivo
        ? "Cancelaste el ataque de respaldo."
        : "Cancelaste el modo combate.",
      redibujar: true,
    });
  }

  moverSelector(movimientoX, movimientoY) {
    if (!this.modoActivo) return crearResultadoAccion({ exito: false });

    return this.seleccionarCasilla(
      this.selector.x + movimientoX,
      this.selector.y + movimientoY,
    );
  }

  seleccionarCasilla(x, y) {
    if (!this.modoActivo) return crearResultadoAccion({ exito: false });

    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "La casilla seleccionada es inválida.",
      });
    }

    if (!this.esCaminable(x, y)) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "No podés seleccionar una pared.",
      });
    }
    if (!this.estaCasillaDentroAlcance(x, y)) {
      return crearResultadoAccion({
        exito: false,
        mensaje: `Esa casilla supera el alcance ${this.jugador.alcanceAtaque}.`,
      });
    }

    this.selector = { x, y };
    const objetivo = this.obtenerObjetivoEn(x, y);
    const evaluacion = this.evaluarCasillaAtaque(x, y);
    const textoSeleccion = objetivo
      ? `Seleccionaste a ${objetivo.nombre}.`
      : `Seleccionaste la casilla ${x}, ${y}.`;

    return crearResultadoAccion({
      mensaje: evaluacion.puedeAtacar
        ? textoSeleccion
        : `${textoSeleccion} ${evaluacion.mensaje}`,
      redibujar: true,
    });
  }

  resolverDerrotasPendientes() {
    return this.resolutorDerrotasJugador.resolverPendientes();
  }

  // Conserva el contrato histórico utilizado por Juego.atacarObjetivo():
  // ejecutar el ataque y devolver solamente su mensaje.
  atacarObjetivo(objetivo) {
    return this.resolverAtaqueObjetivo(objetivo).mensaje;
  }

  // El registro de hostilidad ocurre solamente después de que el motor haya
  // confirmado y consumido los recursos del ataque. Un fallo de impacto sigue
  // siendo un intento hostil válido.
  resolverAtaqueObjetivo(objetivo) {
    const configuracionAtaque = this.jugador.configuracionAtaqueActual;
    const resultadoAtaque = this.jugador.atacar(objetivo);

    if (resultadoAtaque.ataqueNoDisponible) {
      return {
        mensaje: resultadoAtaque.mensaje,
        eventos: [],
      };
    }

    if (objetivo instanceof Enemigo) {
      this.registrarParticipanteCombate(objetivo, "intento_hostil_jugador");
      objetivo.activarAgresividad();
    }

    const mensajes = [resultadoAtaque.mensaje];
    const eventos = [
      crearEventoAtaqueResuelto({
        atacante: this.jugador,
        objetivo,
        resultado: resultadoAtaque,
        configuracionAtaque,
      }),
    ];

    if (!objetivo.estaDestruido) {
      return {
        mensaje: mensajes.filter(Boolean).join("\n"),
        eventos,
      };
    }

    if (!(objetivo instanceof Enemigo)) {
      mensajes.push(`${objetivo.nombre} fue destruido.`);
      return {
        mensaje: mensajes.filter(Boolean).join("\n"),
        eventos,
      };
    }

    const derrota = this.resolutorDerrotasJugador.resolverObjetivo(objetivo);
    mensajes.push(derrota.mensaje);
    return {
      mensaje: mensajes.filter(Boolean).join("\n"),
      eventos,
    };
  }

  confirmarAtaque() {
    if (!this.modoActivo) return crearResultadoAccion({ exito: false });

    const { x, y } = this.selector;
    const evaluacion = this.evaluarCasillaAtaque(x, y);
    if (!evaluacion.puedeAtacar) {
      return crearResultadoAccion({
        exito: false,
        mensaje: evaluacion.mensaje,
      });
    }

    // Esta validación sucede antes de limpiar el selector, registrar hostilidad
    // o finalizar la acción temporal.
    const requisitos = verificarRequisitosAtaque(this.jugador);
    if (!requisitos.disponible) {
      return crearResultadoAccion({
        exito: false,
        mensaje: requisitos.mensaje,
        turnoConsumido: false,
        redibujar: false,
      });
    }

    const costoAtaque = this.jugador.costoAtaqueActual;
    const objetivo = this.obtenerObjetivoEn(x, y);
    const usaRespaldo = this.jugador.ataqueNaturalForzado === true;

    try {
      const resultadoAtaque = objetivo
        ? this.resolverAtaqueObjetivo(objetivo)
        : crearResultadoAtaqueCasillaVacia({
            jugador: this.jugador,
            posicionObjetivo: { x, y },
          });
      this.limpiarSelector();
      return this.finalizarAccionJugador({
        mensaje: resultadoAtaque.mensaje,
        tipoAccion: TIPOS_ACCION_TEMPORAL.ATAQUE,
        costoBase: costoAtaque,
        eventos: resultadoAtaque.eventos,
      });
    } finally {
      if (usaRespaldo) this.jugador.ataqueNaturalForzado = false;
    }
  }

  limpiarSelector() {
    this.modoActivo = false;
    this.selector = { x: this.jugador.x, y: this.jugador.y };
  }
}
