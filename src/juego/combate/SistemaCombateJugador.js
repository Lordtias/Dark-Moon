import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";
import { verificarRequisitosAtaque } from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";
import { crearResultadoAccion } from "../acciones/ResultadoAccion.js";
import { generarBotinEnSuelo } from "../botin/SistemaBotin.js";
import { crearGeneradorAleatorio } from "../generacion/GeneradorAleatorio.js";
import { calcularRecompensaExperiencia } from "../progresion/SistemaProgresion.js";
import { TIPOS_ACCION_TEMPORAL } from "../tiempo/SistemaTiempo.js";
import {
  calcularDistanciaCuadricula,
  evaluarAtaqueCasilla,
} from "./SistemaAlcanceAtaque.js";

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
    this.interactuables = interactuables;
    this.configuracionObjetos = configuracionObjetos;
    this.esCaminable = esCaminable;
    this.obtenerObjetivoEn = obtenerObjetivoEn;
    this.obtenerModoInteraccionActivo = obtenerModoInteraccionActivo;
    this.eliminarActorTemporal = eliminarActorTemporal;
    this.registrarParticipanteCombate = registrarParticipanteCombate;
    this.finalizarAccionJugador = finalizarAccionJugador;
    this.aleatorioBotin = crearGeneradorAleatorio(`${semillaMapa}:botin`);
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
    let enemigoSeleccionado = null;
    let distanciaSeleccionada = Infinity;

    for (const objetivo of this.objetivos) {
      if (!(objetivo instanceof Enemigo) || !objetivo.estaVivo) continue;
      if (!this.esCasillaAtacable(objetivo.x, objetivo.y)) continue;

      const distancia = calcularDistanciaCuadricula(
        { x: this.jugador.x, y: this.jugador.y },
        { x: objetivo.x, y: objetivo.y },
      );
      const estaMasCerca = distancia < distanciaSeleccionada;
      const mismaDistanciaConMenosVida =
        distancia === distanciaSeleccionada &&
        (enemigoSeleccionado === null ||
          objetivo.vidaActual < enemigoSeleccionado.vidaActual);
      if (estaMasCerca || mismaDistanciaConMenosVida) {
        enemigoSeleccionado = objetivo;
        distanciaSeleccionada = distancia;
      }
    }

    return enemigoSeleccionado;
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

    const nuevaX = this.selector.x + movimientoX;
    const nuevaY = this.selector.y + movimientoY;
    if (!this.esCaminable(nuevaX, nuevaY)) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "No podés seleccionar una pared.",
      });
    }
    if (!this.estaCasillaDentroAlcance(nuevaX, nuevaY)) {
      return crearResultadoAccion({
        exito: false,
        mensaje: `Esa casilla supera el alcance ${this.jugador.alcanceAtaque}.`,
      });
    }

    this.selector = { x: nuevaX, y: nuevaY };
    const objetivo = this.obtenerObjetivoEn(nuevaX, nuevaY);
    const evaluacion = this.evaluarCasillaAtaque(nuevaX, nuevaY);
    const textoSeleccion = objetivo
      ? `Seleccionaste a ${objetivo.nombre}.`
      : `Seleccionaste la casilla ${nuevaX}, ${nuevaY}.`;
    return crearResultadoAccion({
      mensaje: evaluacion.puedeAtacar
        ? textoSeleccion
        : `${textoSeleccion} ${evaluacion.mensaje}`,
      redibujar: true,
    });
  }

  // El registro de hostilidad ocurre solamente después de que el motor haya
  // confirmado y consumido los recursos del ataque. Un fallo de impacto sigue
  // siendo un intento hostil válido.
  atacarObjetivo(objetivo) {
    const resultado = this.jugador.atacar(objetivo);
    if (resultado.ataqueNoDisponible) return resultado.mensaje;

    if (objetivo instanceof Enemigo) {
      this.registrarParticipanteCombate(objetivo, "intento_hostil_jugador");
      objetivo.activarAgresividad();
    }
    const mensajes = [resultado.mensaje];

    if (!objetivo.estaDestruido) return mensajes.filter(Boolean).join("\n");

    if (!(objetivo instanceof Enemigo)) {
      mensajes.push(`${objetivo.nombre} fue destruido.`);
      return mensajes.filter(Boolean).join("\n");
    }

    this.eliminarActorTemporal(objetivo);
    mensajes.push(`${objetivo.nombre} fue derrotado.`);

    const resultadoBotin = generarBotinEnSuelo({
      fuente: objetivo,
      configuracionObjetos: this.configuracionObjetos,
      aleatorio: this.aleatorioBotin,
      interactuables: this.interactuables,
    });
    if (resultadoBotin.cantidadUnidades > 0) {
      mensajes.push(
        `${objetivo.nombre} dejó botín: ${resultadoBotin.resumenTexto}.`,
      );
    }

    const recompensaExperiencia = calcularRecompensaExperiencia({
      experienciaBase: objetivo.experienciaOtorgada,
      nivelJugador: this.jugador.nivel,
      nivelEnemigo: objetivo.nivel,
    });
    const progresion = this.jugador.ganarExperiencia(
      recompensaExperiencia.experienciaFinal,
    );
    mensajes.push(
      `Ganaste ${progresion.experienciaGanada} puntos de experiencia.`,
    );

    if (progresion.nivelesGanados === 1) {
      mensajes.push(`Subiste al nivel ${progresion.nivelActual}.`);
    } else if (progresion.nivelesGanados > 1) {
      mensajes.push(
        `Subiste ${progresion.nivelesGanados} niveles y alcanzaste el nivel ` +
          `${progresion.nivelActual}.`,
      );
    }
    if (progresion.puntosGanados === 1) {
      mensajes.push("Obtuviste 1 punto de atributo.");
    } else if (progresion.puntosGanados > 1) {
      mensajes.push(
        `Obtuviste ${progresion.puntosGanados} puntos de atributo.`,
      );
    }

    return mensajes.filter(Boolean).join("\n");
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
      const mensaje = objetivo
        ? this.atacarObjetivo(objetivo)
        : this.jugador.atacarCasillaVacia().mensaje;
      this.limpiarSelector();
      return this.finalizarAccionJugador({
        mensaje,
        tipoAccion: TIPOS_ACCION_TEMPORAL.ATAQUE,
        costoBase: costoAtaque,
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
