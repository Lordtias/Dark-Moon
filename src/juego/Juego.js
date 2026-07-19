import { Enemigo } from "../entidad/destructible/combatiente/Enemigo.js";

import { Combatiente } from "../entidad/destructible/combatiente/Combatiente.js";

import { procesarTurnoEnemigo } from "./SistemaTurnosEnemigos.js";

import {
  calcularDistanciaCuadricula,
  evaluarAtaqueCasilla,
} from "./SistemaAlcanceAtaque.js";

import {
  COSTOS_TEMPORALES_BASE,
  SistemaTiempo,
  TIEMPO_REFERENCIA,
  TIPOS_ACCION_TEMPORAL,
} from "./SistemaTiempo.js";

export class Juego {
  constructor({ map, player, objetivos, mapaSeleccionado } = {}) {
    if (!Array.isArray(map) || map.length === 0) {
      throw new Error("Juego necesita un mapa válido.");
    }

    if (!player) {
      throw new Error("Juego necesita un jugador.");
    }

    if (!Array.isArray(objetivos)) {
      throw new Error("Los objetivos deben estar " + "dentro de una lista.");
    }

    if (!mapaSeleccionado || typeof mapaSeleccionado !== "object") {
      throw new Error(
        "Juego necesita una plantilla " + "de mapa seleccionada.",
      );
    }

    this.map = map;
    this.mapaSeleccionado = mapaSeleccionado;

    this.player = player;
    this.objetivos = objetivos;

    // Continúa contando acciones realizadas
    // por el jugador.
    this.turno = 0;

    this.modoCombateActivo = false;

    this.selectorCombate = {
      x: player.x,
      y: player.y,
    };

    this.ultimaDireccionJugador = {
      x: 0,
      y: -1,
    };

    // Agenda temporal de la partida.
    this.sistemaTiempo = new SistemaTiempo();

    // El primer pulso periódico sucederá
    // al alcanzar 100 unidades.
    this.siguientePulsoTemporal = TIEMPO_REFERENCIA;

    // El jugador se registra primero para que
    // gane los empates temporales iniciales.
    this.sistemaTiempo.registrarActor(this.player);

    this.sincronizarEnemigosConAgenda();

    // Dejamos el reloj preparado en el primer
    // turno del jugador, que comienza en 0.
    this.avanzarHastaSiguienteActorConPulsos();
  }

  // Permite que la interfaz consulte
  // el tiempo alcanzado por el mundo.
  get tiempoActual() {
    return this.sistemaTiempo.tiempoActual;
  }

  obtenerObjetivoEn(x, y) {
    return this.objetivos.find(
      (objetivo) =>
        !objetivo.estaDestruido && objetivo.x === x && objetivo.y === y,
    );
  }

  estaDentroMapa(x, y) {
    return y >= 0 && y < this.map.length && x >= 0 && x < this.map[y].length;
  }

  esCaminable(x, y) {
    return this.estaDentroMapa(x, y) && this.map[y][x] !== "#";
  }

  // Comprueba únicamente la distancia numérica.
  //
  // El selector puede recorrer todo el rango aunque
  // una trayectoria concreta esté bloqueada.
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

  // Evalúa distancia, dirección,
  // patrón y línea de visión.
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

  // Busca automáticamente el enemigo atacable
  // con mayor prioridad.
  //
  // 1. Menor distancia.
  // 2. Menor Vida actual.
  // 3. Primer enemigo encontrado.
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

      // Si también empatan en Vida,
      // se conserva el primero encontrado.
    }

    return enemigoSeleccionado;
  }

  // Mantiene el comportamiento anterior
  // cuando no hay enemigos atacables.
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

  // Al entrar en modo combate se prioriza
  // automáticamente un enemigo atacable.
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
        ? `Modo combate: seleccionaste a ` + `${objetivo.nombre}.`
        : `Modo combate: casilla ` + `${seleccion.x}, ${seleccion.y}.`,

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
      : `Seleccionaste la casilla ` + `${nuevaX}, ${nuevaY}.`;

    return {
      mensaje: evaluacion.puedeAtacar
        ? textoSeleccion
        : `${textoSeleccion} ` + `${evaluacion.mensaje}`,

      turnoConsumido: false,
      redibujar: true,
    };
  }

  atacarObjetivo(objetivo) {
    if (objetivo instanceof Enemigo) {
      // Atacar provoca a enemigos reactivos,
      // incluso si el golpe falla.
      objetivo.activarAgresividad();
    }

    const resultado = this.player.atacar(objetivo);

    const mensajes = [resultado.mensaje];

    if (objetivo.estaDestruido) {
      if (objetivo instanceof Enemigo) {
        // Un actor muerto no debe conservar
        // futuras acciones en la agenda.
        this.sistemaTiempo.eliminarActor(objetivo);

        const progresion = this.player.ganarExperiencia(
          objetivo.experienciaOtorgada,
        );

        mensajes.push(`${objetivo.nombre} fue derrotado.`);

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

    // Capturamos el coste antes de resolver
    // el ataque y consumir munición.
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

  // Registra enemigos nuevos y retira
  // automáticamente los destruidos.
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

  // Aplica un único pulso de regeneración
  // a todos los combatientes vivos.
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

      const resultado = combatiente.procesarRegeneracionTurno();

      if (combatiente === this.player) {
        resultadoJugador = resultado;
      }
    }

    return resultadoJugador;
  }

  // Procesa todos los pulsos periódicos
  // atravesados hasta un instante concreto.
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

  // Avanza hasta el actor siguiente, procesando
  // primero los pulsos que ocurran en el camino.
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

  // Ejecuta enemigos hasta que el jugador
  // vuelva a ser el siguiente actor.
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

      const resultadoEnemigo = procesarTurnoEnemigo({
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

  // Finaliza una acción real del jugador
  // registrando su coste en la agenda.
  finalizarAccionJugador({ mensaje, tipoAccion, costoBase }) {
    this.sincronizarEnemigosConAgenda();

    const actorActual = this.sistemaTiempo.obtenerSiguienteActor();

    if (actorActual !== this.player) {
      throw new Error(
        "El jugador intentó actuar fuera " + "de su turno temporal.",
      );
    }

    this.turno++;

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

    return this.finalizarAccionJugador({
      mensaje: "Te moviste por la mazmorra.",

      tipoAccion: TIPOS_ACCION_TEMPORAL.MOVIMIENTO,

      costoBase: COSTOS_TEMPORALES_BASE.movimiento,
    });
  }
}
