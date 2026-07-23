import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";

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
//
// Este sistema se ocupa de:
//
// - Mantener el estado del selector de combate.
// - Elegir automáticamente el enemigo prioritario.
// - Validar alcance, patrón y línea de visión.
// - Mover y cancelar el selector.
// - Resolver el ataque del jugador.
// - Retirar enemigos derrotados de la agenda temporal.
// - Generar botín y entregar experiencia.
//
// Juego continúa siendo la fachada pública utilizada
// por los controladores y la interfaz.
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

    this.finalizarAccionJugador = finalizarAccionJugador;

    // Los drops utilizan una secuencia propia
    // derivada de la semilla del mapa.
    this.aleatorioBotin = crearGeneradorAleatorio(`${semillaMapa}:botin`);

    this.modoActivo = false;

    this.selector = {
      x: this.jugador.x,
      y: this.jugador.y,
    };

    // La última dirección permite abrir el selector
    // hacia el lugar al que el jugador estaba mirando.
    this.ultimaDireccion = {
      x: 0,
      y: -1,
    };
  }

  // Guarda la última dirección utilizada por el jugador.
  //
  // Se llama tanto al moverse como al intentar caminar
  // contra un combatiente.
  registrarUltimaDireccion(movimientoX, movimientoY) {
    this.ultimaDireccion = {
      x: movimientoX,
      y: movimientoY,
    };
  }

  // Comprueba el alcance máximo del ataque actual.
  estaCasillaDentroAlcance(x, y) {
    const distancia = calcularDistanciaCuadricula(
      {
        x: this.jugador.x,
        y: this.jugador.y,
      },
      {
        x,
        y,
      },
    );

    return distancia >= 1 && distancia <= this.jugador.alcanceAtaque;
  }

  // Evalúa alcance, patrón de ataque
  // y línea de visión.
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

  // Prioriza:
  //
  // 1. El enemigo atacable más cercano.
  // 2. En empate, el de menor Vida actual.
  // 3. En un nuevo empate, el primero encontrado.
  obtenerEnemigoPrioritario() {
    let enemigoSeleccionado = null;

    let distanciaSeleccionada = Infinity;

    for (const objetivo of this.objetivos) {
      if (!(objetivo instanceof Enemigo) || !objetivo.estaVivo) {
        continue;
      }

      if (!this.esCasillaAtacable(objetivo.x, objetivo.y)) {
        continue;
      }

      const distancia = calcularDistanciaCuadricula(
        {
          x: this.jugador.x,

          y: this.jugador.y,
        },
        {
          x: objetivo.x,

          y: objetivo.y,
        },
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

  // Busca una casilla válida comenzando
  // por la última dirección del jugador.
  obtenerCasillaInicial() {
    const direcciones = [
      this.ultimaDireccion,

      {
        x: 0,
        y: -1,
      },

      {
        x: 1,
        y: 0,
      },

      {
        x: 0,
        y: 1,
      },

      {
        x: -1,
        y: 0,
      },

      {
        x: 1,
        y: -1,
      },

      {
        x: 1,
        y: 1,
      },

      {
        x: -1,
        y: 1,
      },

      {
        x: -1,
        y: -1,
      },
    ];

    for (const direccion of direcciones) {
      const x = this.jugador.x + direccion.x;

      const y = this.jugador.y + direccion.y;

      if (this.esCaminable(x, y) && this.esCasillaAtacable(x, y)) {
        return {
          x,
          y,
        };
      }
    }

    return null;
  }

  obtenerSeleccionInicial() {
    const enemigoPrioritario = this.obtenerEnemigoPrioritario();

    if (enemigoPrioritario) {
      return {
        x: enemigoPrioritario.x,

        y: enemigoPrioritario.y,
      };
    }

    return this.obtenerCasillaInicial();
  }

  // Activa el modo combate.
  //
  // Cuando se recibe una posición explícita,
  // normalmente proviene de una colisión
  // contra un combatiente.
  entrar(selectorX = null, selectorY = null) {
    if (!this.jugador.estaVivo) {
      return crearResultadoAccion({
        exito: false,
      });
    }

    if (this.obtenerModoInteraccionActivo()) {
      return crearResultadoAccion({
        exito: false,

        mensaje: "Confirmá la interacción con R o cancelá con Escape.",
      });
    }

    const seleccionExplicita = selectorX !== null && selectorY !== null;

    const seleccion = seleccionExplicita
      ? {
          x: selectorX,
          y: selectorY,
        }
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
        : "Modo combate: casilla " + `${seleccion.x}, ${seleccion.y}.`,

      redibujar: true,
    });
  }

  cancelar() {
    if (!this.modoActivo) {
      return crearResultadoAccion({
        exito: false,
      });
    }

    this.limpiarSelector();

    return crearResultadoAccion({
      mensaje: "Cancelaste el modo combate.",

      redibujar: true,
    });
  }

  moverSelector(movimientoX, movimientoY) {
    if (!this.modoActivo) {
      return crearResultadoAccion({
        exito: false,
      });
    }

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

        mensaje:
          "Esa casilla supera el alcance " + `${this.jugador.alcanceAtaque}.`,
      });
    }

    this.selector = {
      x: nuevaX,
      y: nuevaY,
    };

    const objetivo = this.obtenerObjetivoEn(nuevaX, nuevaY);

    const evaluacion = this.evaluarCasillaAtaque(nuevaX, nuevaY);

    const textoSeleccion = objetivo
      ? `Seleccionaste a ${objetivo.nombre}.`
      : "Seleccionaste la casilla " + `${nuevaX}, ${nuevaY}.`;

    return crearResultadoAccion({
      mensaje: evaluacion.puedeAtacar
        ? textoSeleccion
        : `${textoSeleccion} ` + `${evaluacion.mensaje}`,

      redibujar: true,
    });
  }

  // Ejecuta el ataque y procesa las consecuencias
  // inmediatas de destruir al objetivo.
  atacarObjetivo(objetivo) {
    if (objetivo instanceof Enemigo) {
      objetivo.activarAgresividad();
    }

    const resultado = this.jugador.atacar(objetivo);

    const mensajes = [resultado.mensaje];

    if (!objetivo.estaDestruido) {
      return mensajes.filter(Boolean).join("\n");
    }

    if (!(objetivo instanceof Enemigo)) {
      mensajes.push(`${objetivo.nombre} fue destruido.`);

      return mensajes.filter(Boolean).join("\n");
    }

    // El enemigo derrotado no debe conservar
    // acciones pendientes en la agenda.
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
        `${objetivo.nombre} dejó botín: ` + `${resultadoBotin.resumenTexto}.`,
      );
    }

    // La experiencia configurada en el enemigo
    // representa su recompensa relativa.
    //
    // Antes de entregarla se aplica el factor global
    // y el ajuste por diferencia de nivel.
    const recompensaExperiencia = calcularRecompensaExperiencia({
      experienciaBase: objetivo.experienciaOtorgada,

      nivelJugador: this.jugador.nivel,

      nivelEnemigo: objetivo.nivel,
    });

    const progresion = this.jugador.ganarExperiencia(
      recompensaExperiencia.experienciaFinal,
    );

    mensajes.push(
      `Ganaste ${progresion.experienciaGanada} ` + "puntos de experiencia.",
    );

    if (progresion.nivelesGanados === 1) {
      mensajes.push("Subiste al nivel " + `${progresion.nivelActual}.`);
    } else if (progresion.nivelesGanados > 1) {
      mensajes.push(
        `Subiste ${progresion.nivelesGanados} ` +
          "niveles y alcanzaste el nivel " +
          `${progresion.nivelActual}.`,
      );
    }

    if (progresion.puntosGanados === 1) {
      mensajes.push("Obtuviste 1 punto de atributo.");
    } else if (progresion.puntosGanados > 1) {
      mensajes.push(
        `Obtuviste ${progresion.puntosGanados} ` + "puntos de atributo.",
      );
    }

    return mensajes.filter(Boolean).join("\n");
  }

  // Confirma el ataque seleccionado
  // y consume su coste temporal.
  confirmarAtaque() {
    if (!this.modoActivo) {
      return crearResultadoAccion({
        exito: false,
      });
    }

    const { x, y } = this.selector;

    const evaluacion = this.evaluarCasillaAtaque(x, y);

    if (!evaluacion.puedeAtacar) {
      return crearResultadoAccion({
        exito: false,

        mensaje: evaluacion.mensaje,
      });
    }

    const costoAtaque = this.jugador.costoAtaqueActual;

    const objetivo = this.obtenerObjetivoEn(x, y);

    this.limpiarSelector();

    const mensaje = objetivo
      ? this.atacarObjetivo(objetivo)
      : this.jugador.atacarCasillaVacia().mensaje;

    return this.finalizarAccionJugador({
      mensaje,

      tipoAccion: TIPOS_ACCION_TEMPORAL.ATAQUE,

      costoBase: costoAtaque,
    });
  }

  // Desactiva el modo combate y devuelve
  // el selector a la posición del jugador.
  limpiarSelector() {
    this.modoActivo = false;

    this.selector = {
      x: this.jugador.x,
      y: this.jugador.y,
    };
  }
}
