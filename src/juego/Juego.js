import { Enemigo } from "../entidad/destructible/combatiente/Enemigo.js";

import { Combatiente } from "../entidad/destructible/combatiente/Combatiente.js";

import { procesarFaseEnemigos } from "./SistemaTurnosEnemigos.js";

export class Juego {
  constructor({ map, player, objetivos } = {}) {
    if (!Array.isArray(map) || map.length === 0) {
      throw new Error("Juego necesita un mapa válido.");
    }

    if (!player) {
      throw new Error("Juego necesita un jugador.");
    }

    if (!Array.isArray(objetivos)) {
      throw new Error("Los objetivos deben estar dentro de una lista.");
    }

    this.map = map;
    this.player = player;
    this.objetivos = objetivos;
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

  calcularDistanciaCuadricula(origenX, origenY, destinoX, destinoY) {
    return Math.max(
      Math.abs(destinoX - origenX),

      Math.abs(destinoY - origenY),
    );
  }

  estaCasillaDentroAlcance(x, y) {
    const distancia = this.calcularDistanciaCuadricula(
      this.player.x,
      this.player.y,
      x,
      y,
    );

    return distancia >= 1 && distancia <= this.player.alcanceAtaque;
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

  obtenerSeleccionInicialCombate() {
    const direcciones = [
      this.ultimaDireccionJugador,
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
      const x = this.player.x + direccion.x;

      const y = this.player.y + direccion.y;

      if (this.esCaminable(x, y) && this.estaCasillaDentroAlcance(x, y)) {
        return {
          x,
          y,
        };
      }
    }

    return null;
  }

  entrarModoCombate(selectorX = null, selectorY = null) {
    if (!this.player.estaVivo) {
      return {
        mensaje: null,
        turnoConsumido: false,
        redibujar: false,
      };
    }

    const seleccion =
      selectorX !== null && selectorY !== null
        ? {
            x: selectorX,
            y: selectorY,
          }
        : this.obtenerSeleccionInicialCombate();

    if (
      seleccion === null ||
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
          `Esa casilla supera el alcance ` + `${this.player.alcanceAtaque}.`,

        turnoConsumido: false,

        redibujar: false,
      };
    }

    this.selectorCombate = {
      x: nuevaX,
      y: nuevaY,
    };

    const objetivo = this.obtenerObjetivoEn(nuevaX, nuevaY);

    return {
      mensaje: objetivo
        ? `Seleccionaste a ${objetivo.nombre}.`
        : `Seleccionaste la casilla ${nuevaX}, ${nuevaY}.`,

      turnoConsumido: false,

      redibujar: true,
    };
  }

  atacarObjetivo(objetivo) {
    // Atacar provoca a enemigos reactivos
    // incluso cuando el golpe falla.
    if (objetivo instanceof Enemigo) {
      objetivo.activarAgresividad();
    }

    const resultado = this.player.atacar(objetivo);

    const mensajes = [resultado.mensaje];

    if (objetivo.estaDestruido) {
      if (objetivo instanceof Enemigo) {
        const progresion = this.player.ganarExperiencia(
          objetivo.experienciaOtorgada,
        );

        mensajes.push(`${objetivo.nombre} fue derrotado.`);

        mensajes.push(
          `Ganaste ${progresion.experienciaGanada} ` + "puntos de experiencia.",
        );

        if (progresion.nivelesGanados === 1) {
          mensajes.push(`Subiste al nivel ` + `${progresion.nivelActual}.`);
        } else if (progresion.nivelesGanados > 1) {
          mensajes.push(
            `Subiste ${progresion.nivelesGanados} niveles ` +
              `y alcanzaste el nivel ` +
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

    return mensajes.filter(Boolean).join(" ");
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

    const objetivo = this.obtenerObjetivoEn(x, y);

    this.modoCombateActivo = false;

    this.selectorCombate = {
      x: this.player.x,
      y: this.player.y,
    };

    const mensaje = objetivo
      ? this.atacarObjetivo(objetivo)
      : this.player.atacarCasillaVacia().mensaje;

    return this.finalizarTurno(mensaje);
  }

  aplicarRegeneraciones() {
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

  finalizarTurno(mensaje) {
    this.turno++;

    const resultadoEnemigos = procesarFaseEnemigos({
      objetivos: this.objetivos,

      jugador: this.player,

      mapa: this.map,
    });

    if (resultadoEnemigos.mensaje !== "") {
      mensaje = [mensaje, resultadoEnemigos.mensaje].filter(Boolean).join(" ");
    }

    const regeneracion = this.aplicarRegeneraciones();

    const recursosRecuperados = [];

    if (regeneracion.vidaRecuperada > 0) {
      recursosRecuperados.push(`${regeneracion.vidaRecuperada} de Vida`);
    }

    if (regeneracion.manaRecuperado > 0) {
      recursosRecuperados.push(`${regeneracion.manaRecuperado} de Maná`);
    }

    if (recursosRecuperados.length > 0) {
      mensaje += ` Recuperaste ` + `${recursosRecuperados.join(" y ")}.`;
    }

    return {
      mensaje,
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

    return this.finalizarTurno("Esperaste un turno.");
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

    return this.finalizarTurno("Te moviste por la mazmorra.");
  }
}
