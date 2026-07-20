import { Enemigo } from "../entidad/destructible/combatiente/Enemigo.js";

import { Combatiente } from "../entidad/destructible/combatiente/Combatiente.js";

import { procesarAccionEnemigo } from "./ia/SistemaAccionesEnemigos.js";

import {
  calcularDistanciaCuadricula,
  evaluarAtaqueCasilla,
} from "./combate/SistemaAlcanceAtaque.js";

import { generarBotinEnSuelo } from "./botin/SistemaBotin.js";

import { crearGeneradorAleatorio } from "./generacion/GeneradorAleatorio.js";

import {
  transferirObjetoEntreContenedores,
  transferirTodosLosObjetos,
} from "./inventario/SistemaTransferenciaObjetos.js";

import {
  obtenerInteraccionesDisponibles as resolverInteraccionesDisponibles,
  obtenerInteraccionPrioritaria as resolverInteraccionPrioritaria,
} from "./interacciones/SistemaInteracciones.js";

import {
  crearOpcionesInteraccion,
  seleccionarOpcionEnDireccion,
} from "./interacciones/SelectorInteracciones.js";

import { TIPOS_INTERACCION } from "./interacciones/TiposInteraccion.js";

import {
  COSTOS_TEMPORALES_BASE,
  SistemaTiempo,
  TIEMPO_REFERENCIA,
  TIPOS_ACCION_TEMPORAL,
} from "./tiempo/SistemaTiempo.js";

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

    // El selector de interacción posee
    // un estado independiente del combate.
    this.modoInteraccionActivo = false;

    this.selectorInteraccion = {
      entidad: null,

      x: player.x,

      y: player.y,
    };

    this.ultimaDireccionJugador = {
      x: 0,

      y: -1,
    };

    this.sistemaTiempo = new SistemaTiempo();

    this.siguientePulsoTemporal = TIEMPO_REFERENCIA;

    this.sistemaTiempo.registrarActor(this.player);

    this.sincronizarEnemigosConAgenda();

    this.avanzarHastaSiguienteActorConPulsos();
  }

  get tiempoActual() {
    return this.sistemaTiempo.tiempoActual;
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

  obtenerInteraccionesDisponibles() {
    return resolverInteraccionesDisponibles({
      actor: this.player,

      interactuables: this.interactuables,

      contexto: {
        juego: this,
      },
    });
  }

  obtenerInteraccionPrioritaria() {
    return resolverInteraccionPrioritaria({
      actor: this.player,

      interactuables: this.interactuables,

      contexto: {
        juego: this,
      },
    });
  }

  // Agrupa las interacciones por entidad.
  //
  // Una entidad futura que ofrezca Hablar
  // y Comerciar aparece una sola vez.
  obtenerOpcionesInteraccion() {
    return crearOpcionesInteraccion(this.obtenerInteraccionesDisponibles());
  }

  obtenerOpcionInteraccionSeleccionada() {
    if (!this.selectorInteraccion.entidad) {
      return null;
    }

    return (
      this.obtenerOpcionesInteraccion().find(
        (opcion) => opcion.entidad === this.selectorInteraccion.entidad,
      ) ?? null
    );
  }

  entrarModoInteraccion() {
    const bloqueo = this.obtenerBloqueoInteraccion();

    if (bloqueo) {
      return bloqueo;
    }

    if (this.modoInteraccionActivo) {
      return {
        exito: false,

        mensaje: "Ya estás seleccionando una interacción.",

        turnoConsumido: false,

        redibujar: false,
      };
    }

    const opciones = this.obtenerOpcionesInteraccion();

    if (opciones.length === 0) {
      return {
        exito: false,

        mensaje: "No hay nada para revisar cerca.",

        turnoConsumido: false,

        redibujar: false,
      };
    }

    if (opciones.length === 1) {
      return {
        exito: false,

        mensaje: "Solo hay una entidad interactuable disponible.",

        interaccion: opciones[0].interaccionPrioritaria,

        turnoConsumido: false,

        redibujar: false,
      };
    }

    this.modoInteraccionActivo = true;

    this.establecerSelectorInteraccion(opciones[0]);

    return {
      exito: true,

      mensaje:
        `Seleccionaste ${opciones[0].entidad.nombre}. ` +
        "Mové el selector y confirmá con R.",

      turnoConsumido: false,

      redibujar: true,
    };
  }

  moverSelectorInteraccion(movimientoX, movimientoY) {
    if (!this.modoInteraccionActivo) {
      return {
        mensaje: null,

        turnoConsumido: false,

        redibujar: false,
      };
    }

    const opciones = this.obtenerOpcionesInteraccion();

    if (opciones.length === 0) {
      this.limpiarSelectorInteraccion();

      return {
        mensaje: "Ya no hay interacciones disponibles.",

        turnoConsumido: false,

        redibujar: true,
      };
    }

    const opcionActual =
      opciones.find(
        (opcion) => opcion.entidad === this.selectorInteraccion.entidad,
      ) ?? opciones[0];

    const siguienteOpcion = seleccionarOpcionEnDireccion({
      opciones,
      opcionActual,
      movimientoX,
      movimientoY,
    });

    if (siguienteOpcion === opcionActual) {
      return {
        mensaje: "No hay otro interactuable en esa dirección.",

        turnoConsumido: false,

        redibujar: false,
      };
    }

    this.establecerSelectorInteraccion(siguienteOpcion);

    return {
      mensaje:
        `Seleccionaste ${siguienteOpcion.entidad.nombre}. ` + "Confirmá con R.",

      turnoConsumido: false,

      redibujar: true,
    };
  }

  confirmarInteraccionSeleccionada() {
    if (!this.modoInteraccionActivo) {
      return {
        exito: false,

        mensaje: null,

        interaccion: null,

        turnoConsumido: false,

        redibujar: false,
      };
    }

    const opciones = this.obtenerOpcionesInteraccion();

    const opcionSeleccionada =
      opciones.find(
        (opcion) => opcion.entidad === this.selectorInteraccion.entidad,
      ) ??
      opciones[0] ??
      null;

    this.limpiarSelectorInteraccion();

    if (!opcionSeleccionada) {
      return {
        exito: false,

        mensaje: "La interacción seleccionada ya no está disponible.",

        interaccion: null,

        turnoConsumido: false,

        redibujar: true,
      };
    }

    return {
      exito: true,

      mensaje: null,

      interaccion: opcionSeleccionada.interaccionPrioritaria,

      entidad: opcionSeleccionada.entidad,

      turnoConsumido: false,

      redibujar: true,
    };
  }

  cancelarModoInteraccion() {
    if (!this.modoInteraccionActivo) {
      return {
        mensaje: null,

        turnoConsumido: false,

        redibujar: false,
      };
    }

    this.limpiarSelectorInteraccion();

    return {
      mensaje: "Cancelaste la selección de interacción.",

      turnoConsumido: false,

      redibujar: true,
    };
  }

  establecerSelectorInteraccion(opcion) {
    this.selectorInteraccion = {
      entidad: opcion.entidad,

      x: opcion.x,

      y: opcion.y,
    };
  }

  limpiarSelectorInteraccion() {
    this.modoInteraccionActivo = false;

    this.selectorInteraccion = {
      entidad: null,

      x: this.player.x,

      y: this.player.y,
    };
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
        this.sistemaTiempo.eliminarActor(objetivo);

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

  obtenerBloqueoInteraccion() {
    if (!this.player.estaVivo) {
      return {
        exito: false,

        mensaje: "No podés interactuar estando derrotado.",

        turnoConsumido: false,

        redibujar: false,
      };
    }

    if (this.modoCombateActivo) {
      return {
        exito: false,

        mensaje: "Cancelá el modo combate antes de interactuar.",

        turnoConsumido: false,

        redibujar: false,
      };
    }

    return null;
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
    const validacion = this.validarInteraccionContenedor(interactuable);

    if (validacion) {
      return validacion;
    }

    const objeto =
      interactuable.contenedorObjetos.obtenerObjetoEn(indiceOrigen);

    if (!objeto) {
      return {
        exito: false,

        mensaje: "Ese espacio del contenedor está vacío.",

        turnoConsumido: false,

        redibujar: false,
      };
    }

    const resultadoTransferencia = transferirObjetoEntreContenedores({
      contenedorOrigen: interactuable.contenedorObjetos,

      contenedorDestino: this.player.inventario,

      indiceOrigen,
    });

    if (!resultadoTransferencia.exito) {
      return {
        exito: false,

        mensaje: "No hay espacio suficiente en el inventario.",

        turnoConsumido: false,

        redibujar: false,
      };
    }

    this.retirarInteractuableSiVacio(interactuable);

    const mensajes = [
      `Recogiste ${resultadoTransferencia.cantidadTransferida} ` +
        `${resultadoTransferencia.nombreObjeto}.`,
    ];

    if (resultadoTransferencia.cantidadRestante > 0) {
      mensajes.push(
        `Quedaron ${resultadoTransferencia.cantidadRestante} ` +
          `${resultadoTransferencia.nombreObjeto} en el botín.`,
      );
    }

    const resultado = {
      exito: true,

      mensaje: mensajes.join("\n"),

      ...resultadoTransferencia,
    };

    return this.finalizarResultadoAccionJugador({
      resultado,

      tipoAccion: TIPOS_ACCION_TEMPORAL.ACCION,

      costoBase: COSTOS_TEMPORALES_BASE.accion,
    });
  }

  recogerTodoInteractuable(interactuable) {
    const validacion = this.validarInteraccionContenedor(interactuable);

    if (validacion) {
      return validacion;
    }

    const resultadoTransferencia = transferirTodosLosObjetos({
      contenedorOrigen: interactuable.contenedorObjetos,

      contenedorDestino: this.player.inventario,
    });

    if (!resultadoTransferencia.exito) {
      return {
        exito: false,

        mensaje: "No hay espacio suficiente en el inventario.",

        turnoConsumido: false,

        redibujar: false,
      };
    }

    this.retirarInteractuableSiVacio(interactuable);

    const detalles = resultadoTransferencia.resultados
      .filter((resultado) => resultado.cantidadTransferida > 0)
      .map(
        (resultado) =>
          `${resultado.cantidadTransferida} ` + `${resultado.nombreObjeto}`,
      );

    const mensajes = ["Recogiste todo lo posible:", ...detalles];

    if (!resultadoTransferencia.origenVacio) {
      mensajes.push(
        "Algunos objetos quedaron en el botín porque el inventario no tiene espacio.",
      );
    }

    const resultado = {
      exito: true,

      mensaje: mensajes.join("\n"),

      ...resultadoTransferencia,
    };

    return this.finalizarResultadoAccionJugador({
      resultado,

      tipoAccion: TIPOS_ACCION_TEMPORAL.ACCION,

      costoBase: COSTOS_TEMPORALES_BASE.accion,
    });
  }

  validarInteraccionContenedor(interactuable) {
    const bloqueo = this.obtenerBloqueoInteraccion();

    if (bloqueo) {
      return bloqueo;
    }

    if (!this.interactuables.includes(interactuable)) {
      return {
        exito: false,

        mensaje: "Ese contenedor ya no está disponible.",

        turnoConsumido: false,

        redibujar: false,
      };
    }

    if (
      !interactuable?.contenedorObjetos ||
      typeof interactuable.contenedorObjetos.estaVacio !== "function"
    ) {
      return {
        exito: false,

        mensaje: "La entidad seleccionada no contiene objetos.",

        turnoConsumido: false,

        redibujar: false,
      };
    }

    if (interactuable.contenedorObjetos.estaVacio()) {
      this.retirarInteractuableSiVacio(interactuable);

      return {
        exito: false,

        mensaje: "El contenedor está vacío.",

        turnoConsumido: false,

        redibujar: true,
      };
    }

    const interaccionDisponible = this.obtenerInteraccionesDisponibles().some(
      (interaccion) =>
        interaccion.entidad === interactuable &&
        interaccion.tipo === TIPOS_INTERACCION.ABRIR_CONTENEDOR,
    );

    if (!interaccionDisponible) {
      return {
        exito: false,

        mensaje: "Acercate al contenedor para recoger sus objetos.",

        turnoConsumido: false,

        redibujar: false,
      };
    }

    return null;
  }

  retirarInteractuableSiVacio(interactuable) {
    const estaVacio =
      interactuable?.estaVacio === true ||
      interactuable?.contenedorObjetos?.estaVacio?.() === true;

    if (!estaVacio) {
      return false;
    }

    const indice = this.interactuables.indexOf(interactuable);

    if (indice === -1) {
      return false;
    }

    this.interactuables.splice(indice, 1);

    if (this.selectorInteraccion.entidad === interactuable) {
      this.limpiarSelectorInteraccion();
    }

    return true;
  }

  finalizarResultadoAccionJugador({ resultado, tipoAccion, costoBase } = {}) {
    if (
      !resultado ||
      typeof resultado !== "object" ||
      typeof resultado.exito !== "boolean"
    ) {
      throw new Error(
        "La acción de inventario debe devolver un resultado válido.",
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
    };
  }

  sincronizarEnemigosConAgenda() {
    for (const objetivo of this.objetivos) {
      if (!(objetivo instanceof Enemigo)) {
        continue;
      }

      if (!objetivo.estaVivo) {
        this.sistemaTiempo.eliminarActor(objetivo);

        continue;
      }

      if (!this.sistemaTiempo.tieneActor(objetivo)) {
        this.sistemaTiempo.registrarActor(objetivo);
      }
    }
  }

  aplicarPulsoRegeneracion() {
    const combatientes = [
      this.player,

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

      if (combatiente === this.player) {
        resultadoJugador = resultado;
      }
    }

    return resultadoJugador;
  }

  procesarPulsosTemporalesHasta(tiempoDestino) {
    const recuperacionTotal = {
      vidaRecuperada: 0,

      manaRecuperado: 0,
    };

    while (this.siguientePulsoTemporal <= tiempoDestino) {
      this.sistemaTiempo.avanzarTiempoHasta(this.siguientePulsoTemporal);

      const recuperacion = this.aplicarPulsoRegeneracion();

      recuperacionTotal.vidaRecuperada += recuperacion.vidaRecuperada;

      recuperacionTotal.manaRecuperado += recuperacion.manaRecuperado;

      this.siguientePulsoTemporal += TIEMPO_REFERENCIA;
    }

    return recuperacionTotal;
  }

  avanzarHastaSiguienteActorConPulsos() {
    const tiempoSiguienteActor =
      this.sistemaTiempo.obtenerTiempoSiguienteActor();

    if (tiempoSiguienteActor === null) {
      return {
        actor: null,

        recuperacionJugador: {
          vidaRecuperada: 0,

          manaRecuperado: 0,
        },
      };
    }

    const recuperacionJugador =
      this.procesarPulsosTemporalesHasta(tiempoSiguienteActor);

    const actor = this.sistemaTiempo.avanzarHastaSiguienteActor();

    return {
      actor,
      recuperacionJugador,
    };
  }

  procesarHastaTurnoJugador() {
    const mensajes = [];

    const recuperacionTotal = {
      vidaRecuperada: 0,

      manaRecuperado: 0,
    };

    while (this.player.estaVivo) {
      this.sincronizarEnemigosConAgenda();

      const siguienteActor = this.sistemaTiempo.obtenerSiguienteActor();

      if (!siguienteActor) {
        break;
      }

      const avance = this.avanzarHastaSiguienteActorConPulsos();

      recuperacionTotal.vidaRecuperada +=
        avance.recuperacionJugador.vidaRecuperada;

      recuperacionTotal.manaRecuperado +=
        avance.recuperacionJugador.manaRecuperado;

      if (avance.actor === this.player) {
        break;
      }

      const enemigo = avance.actor;

      const resultadoEnemigo = procesarAccionEnemigo({
        enemigo,

        jugador: this.player,

        mapa: this.map,

        objetivos: this.objetivos,
      });

      mensajes.push(...resultadoEnemigo.mensajes);

      if (enemigo.estaVivo) {
        this.sistemaTiempo.registrarAccion({
          actor: enemigo,

          tipoAccion: resultadoEnemigo.tipoAccion,

          costoBase: resultadoEnemigo.costoBase,
        });
      } else {
        this.sistemaTiempo.eliminarActor(enemigo);
      }

      if (!this.player.estaVivo) {
        break;
      }
    }

    return {
      mensajes,

      mensaje: mensajes.filter(Boolean).join("\n"),

      recuperacionJugador: recuperacionTotal,
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

    return "Recuperaste " + `${recursosRecuperados.join(" y ")}.`;
  }

  finalizarAccionJugador({ mensaje, tipoAccion, costoBase }) {
    this.sincronizarEnemigosConAgenda();

    const actorActual = this.sistemaTiempo.obtenerSiguienteActor();

    if (actorActual !== this.player) {
      throw new Error("El jugador intentó actuar fuera de su turno temporal.");
    }

    this.sistemaTiempo.registrarAccion({
      actor: this.player,

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
    };
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
