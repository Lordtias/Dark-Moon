import { Enemigo } from "../entidad/destructible/combatiente/Enemigo.js";
import { Combatiente } from "../entidad/destructible/combatiente/Combatiente.js";

import {
  calcularDistanciaCuadricula,
  evaluarAtaqueCasilla,
} from "./combate/SistemaAlcanceAtaque.js";

import { generarBotinEnSuelo } from "./botin/SistemaBotin.js";
import { crearGeneradorAleatorio } from "./generacion/GeneradorAleatorio.js";

import { SistemaInteraccionJugador } from "./interacciones/SistemaInteraccionJugador.js";

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

    // Botines, cofres, NPC y objetos de misión
    // permanecen separados de los objetivos.
    this.interactuables = interactuables;

    // Los drops utilizan una secuencia propia
    // derivada de la semilla del mapa.
    const semillaMapa =
      this.mapaSeleccionado.generacionActual?.semilla ?? "partida";

    this.aleatorioBotin = crearGeneradorAleatorio(`${semillaMapa}:botin`);

    this.modoCombateActivo = false;

    this.selectorCombate = {
      x: player.x,
      y: player.y,
    };

    this.ultimaDireccionJugador = {
      x: 0,
      y: -1,
    };

    // El coordinador temporal administra la agenda,
    // la regeneración y las acciones enemigas.
    //
    // Juego conserva solamente la responsabilidad
    // de iniciar y consultar ese coordinador.
    this.coordinadorTiempo = new CoordinadorTiempoPartida({
      mapa: this.map,
      jugador: this.player,
      objetivos: this.objetivos,
    });

    // El sistema de interacción administra:
    //
    // - El selector de interactuables.
    // - Las validaciones de alcance.
    // - La transferencia de botín.
    // - El retiro de contenedores vacíos.
    //
    // Juego entrega funciones pequeñas para evitar
    // que el sistema dependa de toda su implementación.
    this.sistemaInteraccionJugador = new SistemaInteraccionJugador({
      jugador: this.player,
      interactuables: this.interactuables,

      obtenerModoCombateActivo: () => this.modoCombateActivo,

      obtenerContextoInteraccion: () => ({
        juego: this,
      }),

      finalizarResultadoAccionJugador: (parametros) =>
        this.finalizarResultadoAccionJugador(parametros),
    });
  }

  // Conservamos el acceso juego.sistemaTiempo para no romper
  // PanelOrdenTemporal ni cualquier herramienta de diagnóstico.
  //
  // El dueño real del sistema ahora es CoordinadorTiempoPartida.
  get sistemaTiempo() {
    return this.coordinadorTiempo.sistemaTiempo;
  }

  // Expone el tiempo actual sin que el resto de la aplicación
  // necesite conocer al coordinador temporal.
  get tiempoActual() {
    return this.coordinadorTiempo.tiempoActual;
  }

  // Conservamos juego.modoInteraccionActivo
  // porque los controladores y el adaptador visual
  // todavía consultan esta propiedad directamente.
  get modoInteraccionActivo() {
    return this.sistemaInteraccionJugador.modoActivo;
  }

  // Conservamos juego.selectorInteraccion
  // para no modificar el adaptador de escena actual.
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

  // Juego conserva estos métodos como fachada pública.
  //
  // Los controladores no necesitan saber que la lógica
  // fue trasladada a SistemaInteraccionJugador.
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
    return this.sistemaInteraccionJugador.confirmarSeleccion();
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
    return y >= 0 && y < this.map.length && x >= 0 && x < this.map[y].length;
  }

  esCaminable(x, y) {
    return this.estaDentroMapa(x, y) && this.map[y][x] !== "#";
  }

  estaCasillaDentroAlcance(x, y) {
    const distancia = calcularDistanciaCuadricula(
      {
        x: this.player.x,
        y: this.player.y,
      },
      {
        x,
        y,
      },
    );

    return distancia >= 1 && distancia <= this.player.alcanceAtaque;
  }

  evaluarCasillaAtaque(x, y) {
    return evaluarAtaqueCasilla({
      atacante: this.player,
      xObjetivo: x,
      yObjetivo: y,
      mapa: this.map,
    });
  }

  esCasillaAtacable(x, y) {
    return this.evaluarCasillaAtaque(x, y).puedeAtacar;
  }

  estaDiagonalBloqueada(movimientoX, movimientoY) {
    const esDiagonal =
      Math.abs(movimientoX) === 1 && Math.abs(movimientoY) === 1;

    if (!esDiagonal) {
      return false;
    }

    const horizontalBloqueada = !this.esCaminable(
      this.player.x + movimientoX,
      this.player.y,
    );

    const verticalBloqueada = !this.esCaminable(
      this.player.x,
      this.player.y + movimientoY,
    );

    return horizontalBloqueada && verticalBloqueada;
  }

  obtenerEnemigoPrioritarioCombate() {
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
          x: this.player.x,
          y: this.player.y,
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

  obtenerCasillaInicialCombate() {
    const direcciones = [
      this.ultimaDireccionJugador,
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
      const x = this.player.x + direccion.x;

      const y = this.player.y + direccion.y;

      if (this.esCaminable(x, y) && this.esCasillaAtacable(x, y)) {
        return {
          x,
          y,
        };
      }
    }

    return null;
  }

  obtenerSeleccionInicialCombate() {
    const enemigoPrioritario = this.obtenerEnemigoPrioritarioCombate();

    if (enemigoPrioritario) {
      return {
        x: enemigoPrioritario.x,
        y: enemigoPrioritario.y,
      };
    }

    return this.obtenerCasillaInicialCombate();
  }

  entrarModoCombate(selectorX = null, selectorY = null) {
    if (!this.player.estaVivo) {
      return {
        mensaje: null,
        turnoConsumido: false,
        redibujar: false,
      };
    }

    if (this.modoInteraccionActivo) {
      return {
        mensaje: "Confirmá la interacción con R o cancelá con Escape.",
        turnoConsumido: false,
        redibujar: false,
      };
    }

    const seleccionExplicita = selectorX !== null && selectorY !== null;

    const seleccion = seleccionExplicita
      ? {
          x: selectorX,
          y: selectorY,
        }
      : this.obtenerSeleccionInicialCombate();

    if (seleccion === null) {
      return {
        mensaje: "No hay una casilla válida para atacar.",
        turnoConsumido: false,
        redibujar: false,
      };
    }

    const evaluacion = this.evaluarCasillaAtaque(seleccion.x, seleccion.y);

    if (seleccionExplicita && !evaluacion.puedeAtacar) {
      return {
        mensaje: evaluacion.mensaje,
        turnoConsumido: false,
        redibujar: false,
      };
    }

    if (
      !this.esCaminable(seleccion.x, seleccion.y) ||
      !this.estaCasillaDentroAlcance(seleccion.x, seleccion.y)
    ) {
      return {
        mensaje: "No hay una casilla válida para atacar.",
        turnoConsumido: false,
        redibujar: false,
      };
    }

    this.modoCombateActivo = true;
    this.selectorCombate = seleccion;

    const objetivo = this.obtenerObjetivoEn(seleccion.x, seleccion.y);

    return {
      mensaje: objetivo
        ? `Modo combate: seleccionaste a ${objetivo.nombre}.`
        : `Modo combate: casilla ${seleccion.x}, ${seleccion.y}.`,
      turnoConsumido: false,
      redibujar: true,
    };
  }

  cancelarModoCombate() {
    if (!this.modoCombateActivo) {
      return {
        mensaje: null,
        turnoConsumido: false,
        redibujar: false,
      };
    }

    this.modoCombateActivo = false;

    this.selectorCombate = {
      x: this.player.x,
      y: this.player.y,
    };

    return {
      mensaje: "Cancelaste el modo combate.",
      turnoConsumido: false,
      redibujar: true,
    };
  }

  moverSelectorCombate(movimientoX, movimientoY) {
    const nuevaX = this.selectorCombate.x + movimientoX;

    const nuevaY = this.selectorCombate.y + movimientoY;

    if (!this.esCaminable(nuevaX, nuevaY)) {
      return {
        mensaje: "No podés seleccionar una pared.",
        turnoConsumido: false,
        redibujar: false,
      };
    }

    if (!this.estaCasillaDentroAlcance(nuevaX, nuevaY)) {
      return {
        mensaje:
          "Esa casilla supera el alcance " + `${this.player.alcanceAtaque}.`,
        turnoConsumido: false,
        redibujar: false,
      };
    }

    this.selectorCombate = {
      x: nuevaX,
      y: nuevaY,
    };

    const objetivo = this.obtenerObjetivoEn(nuevaX, nuevaY);

    const evaluacion = this.evaluarCasillaAtaque(nuevaX, nuevaY);

    const textoSeleccion = objetivo
      ? `Seleccionaste a ${objetivo.nombre}.`
      : `Seleccionaste la casilla ${nuevaX}, ${nuevaY}.`;

    return {
      mensaje: evaluacion.puedeAtacar
        ? textoSeleccion
        : `${textoSeleccion} ${evaluacion.mensaje}`,
      turnoConsumido: false,
      redibujar: true,
    };
  }

  atacarObjetivo(objetivo) {
    if (objetivo instanceof Enemigo) {
      objetivo.activarAgresividad();
    }

    const resultado = this.player.atacar(objetivo);

    const mensajes = [resultado.mensaje];

    if (objetivo.estaDestruido) {
      if (objetivo instanceof Enemigo) {
        // El coordinador temporal retira al enemigo derrotado
        // para que no conserve acciones pendientes.
        this.coordinadorTiempo.eliminarActor(objetivo);

        mensajes.push(`${objetivo.nombre} fue derrotado.`);

        const resultadoBotin = generarBotinEnSuelo({
          fuente: objetivo,
          configuracionObjetos: this.configuracionObjetos,
          aleatorio: this.aleatorioBotin,
          interactuables: this.interactuables,
        });

        if (resultadoBotin.cantidadUnidades > 0) {
          mensajes.push(
            `${objetivo.nombre} dejó botín: ` +
              `${resultadoBotin.resumenTexto}.`,
          );
        }

        const progresion = this.player.ganarExperiencia(
          objetivo.experienciaOtorgada,
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
      } else {
        mensajes.push(`${objetivo.nombre} fue destruido.`);
      }
    }

    return mensajes.filter(Boolean).join("\n");
  }

  confirmarAtaque() {
    if (!this.modoCombateActivo) {
      return {
        mensaje: null,
        turnoConsumido: false,
        redibujar: false,
      };
    }

    const { x, y } = this.selectorCombate;

    const evaluacion = this.evaluarCasillaAtaque(x, y);

    if (!evaluacion.puedeAtacar) {
      return {
        mensaje: evaluacion.mensaje,
        turnoConsumido: false,
        redibujar: false,
      };
    }

    const costoAtaque = this.player.costoAtaqueActual;

    const objetivo = this.obtenerObjetivoEn(x, y);

    this.modoCombateActivo = false;

    this.selectorCombate = {
      x: this.player.x,
      y: this.player.y,
    };

    const mensaje = objetivo
      ? this.atacarObjetivo(objetivo)
      : this.player.atacarCasillaVacia().mensaje;

    return this.finalizarAccionJugador({
      mensaje,
      tipoAccion: TIPOS_ACCION_TEMPORAL.ATAQUE,
      costoBase: costoAtaque,
    });
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

  // Las validaciones y transferencias de botín
  // pertenecen ahora al sistema de interacción.
  obtenerBloqueoInteraccion() {
    return this.sistemaInteraccionJugador.obtenerBloqueoInteraccion();
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
    return this.sistemaInteraccionJugador.recogerObjeto(
      interactuable,
      indiceOrigen,
    );
  }

  recogerTodoInteractuable(interactuable) {
    return this.sistemaInteraccionJugador.recogerTodo(interactuable);
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

  // Mantiene el método público de Juego para evitar
  // modificar inventario, equipamiento e interacciones.
  //
  // La implementación real pertenece ahora
  // al coordinador temporal.
  finalizarResultadoAccionJugador({ resultado, tipoAccion, costoBase } = {}) {
    return this.coordinadorTiempo.finalizarResultadoAccionJugador({
      resultado,
      tipoAccion,
      costoBase,
    });
  }

  // Juego continúa ofreciendo este método como fachada.
  //
  // Los sistemas de movimiento, combate, espera e inventario
  // no necesitan saber que la coordinación temporal fue extraída.
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

  moverJugador(movimientoX, movimientoY) {
    if (!this.player.estaVivo) {
      return {
        mensaje: null,
        turnoConsumido: false,
        redibujar: false,
      };
    }

    // Respaldo adicional por si el movimiento
    // llega desde otro controlador.
    if (this.modoInteraccionActivo) {
      return this.moverSelectorInteraccion(movimientoX, movimientoY);
    }

    if (this.modoCombateActivo) {
      return this.moverSelectorCombate(movimientoX, movimientoY);
    }

    const nuevaX = this.player.x + movimientoX;

    const nuevaY = this.player.y + movimientoY;

    if (!this.esCaminable(nuevaX, nuevaY)) {
      return {
        mensaje: "No podés atravesar una pared.",
        turnoConsumido: false,
        redibujar: false,
      };
    }

    if (this.estaDiagonalBloqueada(movimientoX, movimientoY)) {
      return {
        mensaje: "No podés atravesar esa esquina.",
        turnoConsumido: false,
        redibujar: false,
      };
    }

    const objetivo = this.obtenerObjetivoEn(nuevaX, nuevaY);

    if (objetivo instanceof Combatiente) {
      this.ultimaDireccionJugador = {
        x: movimientoX,
        y: movimientoY,
      };

      return this.entrarModoCombate(nuevaX, nuevaY);
    }

    if (objetivo) {
      return {
        mensaje: `No podés caminar sobre ${objetivo.nombre}.`,
        turnoConsumido: false,
        redibujar: false,
      };
    }

    this.player.x = nuevaX;
    this.player.y = nuevaY;

    this.ultimaDireccionJugador = {
      x: movimientoX,
      y: movimientoY,
    };

    const opcionesInteraccion = this.obtenerOpcionesInteraccion();

    let mensajeInteraccion = "";

    if (opcionesInteraccion.length === 1) {
      mensajeInteraccion =
        `\n${opcionesInteraccion[0].interaccionPrioritaria.texto}: ` +
        "presioná R.";
    } else if (opcionesInteraccion.length > 1) {
      mensajeInteraccion = "\nHay varias entidades para revisar: presioná R.";
    }

    return this.finalizarAccionJugador({
      mensaje: "Te moviste por la mazmorra." + mensajeInteraccion,
      tipoAccion: TIPOS_ACCION_TEMPORAL.MOVIMIENTO,
      costoBase: COSTOS_TEMPORALES_BASE.movimiento,
    });
  }
}
