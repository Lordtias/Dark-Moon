import { crearMensajeTraducible, TIPOS_MENSAJE_JUEGO } from "../mensajes/MensajesJuego.js";
import { PATRONES_ATAQUE, esPatronAtaqueValido } from "./PatronesAtaque.js";

// Centraliza las reglas de alcance y línea de visión.
//
// Este sistema será utilizado tanto por el jugador como por enemigos,
// habilidades y hechizos futuros.
export function calcularDistanciaCuadricula(origen, destino) {
  return Math.max(
    Math.abs(destino.x - origen.x),
    Math.abs(destino.y - origen.y),
  );
}

export function evaluarAtaqueCasilla({
  atacante,
  xObjetivo,
  yObjetivo,
  mapa,
} = {}) {
  validarDatos({ atacante, xObjetivo, yObjetivo, mapa });
  const origen = {
    x: atacante.x,
    y: atacante.y,
  };
  const destino = {
    x: xObjetivo,
    y: yObjetivo,
  };

  if (!estaDentroMapa(mapa, destino.x, destino.y)) {
    return crearResultadoInvalido(
      "La casilla seleccionada está fuera del mapa.",
      "mensajes.alcance.saleMapa",
    );
  }

  if (esPared(mapa, destino.x, destino.y)) {
    return crearResultadoInvalido(
      "No podés atacar una pared.",
      "mensajes.combate.paredSeleccion",
    );
  }

  const distancia = calcularDistanciaCuadricula(origen, destino);
  if (distancia === 0) {
    return {
      puedeAtacar: false,
      dentroAlcance: false,
      lineaVisionDespejada: true,
      patronValido: false,
      // Se conserva temporalmente este nombre por compatibilidad con posibles
      // consumidores.
      alineacionValida: false,
      distancia,
      mensaje: "No podés atacar tu propia casilla.",
      mensajePresentacion: crearMensajeAlcance("mensajes.alcance.propiaCasilla"),
    };
  }

  if (distancia > atacante.alcanceAtaque) {
    return {
      puedeAtacar: false,
      dentroAlcance: false,
      lineaVisionDespejada: false,
      patronValido: false,
      alineacionValida: false,
      distancia,
      mensaje: `La casilla supera el alcance ` + `${atacante.alcanceAtaque}.`,
      mensajePresentacion: crearMensajeAlcance("mensajes.alcance.superaAlcance", {
        alcance: atacante.alcanceAtaque,
      }),
    };
  }

  const patronAtaque = atacante.patronAtaqueActual;
  if (!esPatronAtaqueValido(patronAtaque)) {
    throw new Error(
      `El patrón de ataque de ` + `${atacante.nombre} no es válido.`,
    );
  }

  const evaluacionPatron = evaluarPatronAtaque({
    patronAtaque,
    origen,
    destino,
    distancia,
  });

  if (!evaluacionPatron.valido) {
    return {
      puedeAtacar: false,
      dentroAlcance: true,
      lineaVisionDespejada: false,
      patronValido: false,
      alineacionValida: false,
      distancia,
      mensaje: evaluacionPatron.mensaje,
      mensajePresentacion: evaluacionPatron.mensajePresentacion ?? null,
    };
  }

  const lineaVision = evaluarLineaVision({ mapa, origen, destino });
  if (!lineaVision.despejada) {
    return {
      puedeAtacar: false,
      dentroAlcance: true,
      lineaVisionDespejada: false,
      patronValido: true,
      alineacionValida: true,
      distancia,
      mensaje: lineaVision.mensaje,
      mensajePresentacion: lineaVision.mensajePresentacion ?? null,
    };
  }

  return {
    puedeAtacar: true,
    dentroAlcance: true,
    lineaVisionDespejada: true,
    patronValido: true,
    alineacionValida: true,
    distancia,
    mensaje: null,
    mensajePresentacion: null,
  };
}

// Valida la forma espacial del ataque.
//
// ADYACENTE: solamente permite las ocho casillas contiguas.
// LINEAL: permite horizontal, vertical o diagonal perfecta.
// LIBRE: permite cualquier posición dentro del alcance.
function evaluarPatronAtaque({ patronAtaque, origen, destino, distancia }) {
  switch (patronAtaque) {
    case PATRONES_ATAQUE.ADYACENTE:
      return {
        valido: distancia === 1,
        mensaje:
          distancia === 1
            ? null
            : "Este ataque solamente puede alcanzar casillas adyacentes.",
        mensajePresentacion:
          distancia === 1
            ? null
            : crearMensajeAlcance("mensajes.alcance.soloAdyacente"),
      };
    case PATRONES_ATAQUE.LINEAL:
      return {
        valido: estaEnDireccionLineal(origen, destino),
        mensaje:
          "Este ataque debe realizarse en línea horizontal, vertical o diagonal.",
        mensajePresentacion: crearMensajeAlcance("mensajes.alcance.soloLineal"),
      };
    case PATRONES_ATAQUE.LIBRE:
      return {
        valido: true,
        mensaje: null,
        mensajePresentacion: null,
      };
    default:
      return {
        valido: false,
        mensaje: "El patrón de ataque seleccionado no está implementado.",
        mensajePresentacion: crearMensajeAlcance("mensajes.alcance.patronNoImplementado"),
      };
  }
}

// Comprueba las ocho direcciones lineales: horizontal, vertical y diagonal
// perfecta.
function estaEnDireccionLineal(origen, destino) {
  const diferenciaX = destino.x - origen.x;
  const diferenciaY = destino.y - origen.y;
  return (
    diferenciaX === 0 ||
    diferenciaY === 0 ||
    Math.abs(diferenciaX) === Math.abs(diferenciaY)
  );
}

// Recorre todas las casillas atravesadas por la trayectoria.
//
// Cuando la trayectoria cruza exactamente una esquina, solamente se bloquea
// si ambos lados están cerrados por paredes. La función se exporta para que la
// percepción enemiga pueda usar la misma regla geométrica que los ataques sin
// convertir la percepción en un ataque ficticio.
export function evaluarLineaVision({ mapa, origen, destino } = {}) {
  if (!Array.isArray(mapa) || mapa.length === 0) {
    throw new Error("Se necesita un mapa válido para evaluar línea de visión.");
  }
  if (
    !origen ||
    !destino ||
    !Number.isInteger(origen.x) ||
    !Number.isInteger(origen.y) ||
    !Number.isInteger(destino.x) ||
    !Number.isInteger(destino.y)
  ) {
    throw new Error("La línea de visión necesita posiciones enteras válidas.");
  }
  if (
    !estaDentroMapa(mapa, origen.x, origen.y) ||
    !estaDentroMapa(mapa, destino.x, destino.y)
  ) {
    return {
      despejada: false,
      mensaje: "La trayectoria sale del mapa.",
      mensajePresentacion: crearMensajeAlcance("mensajes.alcance.saleMapa"),
    };
  }

  const diferenciaX = destino.x - origen.x;
  const diferenciaY = destino.y - origen.y;
  const cantidadX = Math.abs(diferenciaX);
  const cantidadY = Math.abs(diferenciaY);
  const direccionX = Math.sign(diferenciaX);
  const direccionY = Math.sign(diferenciaY);
  let x = origen.x;
  let y = origen.y;
  let pasosX = 0;
  let pasosY = 0;

  while (pasosX < cantidadX || pasosY < cantidadY) {
    const decision =
      (1 + 2 * pasosX) * cantidadY - (1 + 2 * pasosY) * cantidadX;

    if (decision === 0) {
      const lateralHorizontal = {
        x: x + direccionX,
        y,
      };
      const lateralVertical = {
        x,
        y: y + direccionY,
      };
      const horizontalBloqueado = esBloqueante(
        mapa,
        lateralHorizontal.x,
        lateralHorizontal.y,
      );
      const verticalBloqueado = esBloqueante(
        mapa,
        lateralVertical.x,
        lateralVertical.y,
      );

      if (horizontalBloqueado && verticalBloqueado) {
        return {
          despejada: false,
          mensaje: "Dos paredes bloquean la trayectoria diagonal del ataque.",
          mensajePresentacion: crearMensajeAlcance("mensajes.alcance.dosParedesDiagonal"),
        };
      }

      x += direccionX;
      y += direccionY;
      pasosX++;
      pasosY++;
    } else if (decision < 0) {
      x += direccionX;
      pasosX++;
    } else {
      y += direccionY;
      pasosY++;
    }

    const esDestino = x === destino.x && y === destino.y;
    // La casilla de destino fue validada antes. Aquí solamente comprobamos
    // obstáculos que se encuentren en el trayecto.
    if (!esDestino && esBloqueante(mapa, x, y)) {
      return {
        despejada: false,
        mensaje: "Una pared bloquea la trayectoria del ataque.",
        mensajePresentacion: crearMensajeAlcance("mensajes.alcance.paredBloquea"),
      };
    }
  }

  return {
    despejada: true,
    mensaje: null,
    mensajePresentacion: null,
  };
}

function estaDentroMapa(mapa, x, y) {
  return y >= 0 && y < mapa.length && x >= 0 && x < mapa[y].length;
}

function esPared(mapa, x, y) {
  return estaDentroMapa(mapa, x, y) && mapa[y][x] === "#";
}

// Una posición fuera del mapa se considera bloqueante al comprobar esquinas.
function esBloqueante(mapa, x, y) {
  return !estaDentroMapa(mapa, x, y) || esPared(mapa, x, y);
}

function crearResultadoInvalido(mensaje, clave = null) {
  return {
    puedeAtacar: false,
    dentroAlcance: false,
    lineaVisionDespejada: false,
    patronValido: false,
    alineacionValida: false,
    distancia: null,
    mensaje,
    mensajePresentacion: clave ? crearMensajeAlcance(clave) : null,
  };
}

function crearMensajeAlcance(clave, parametros = {}) {
  return crearMensajeTraducible(clave, {
    tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
    parametros,
  });
}

function validarDatos({ atacante, xObjetivo, yObjetivo, mapa }) {
  if (!atacante) {
    throw new Error("Se necesita un atacante para evaluar el alcance.");
  }
  if (!Number.isInteger(xObjetivo) || !Number.isInteger(yObjetivo)) {
    throw new Error("La posición objetivo debe utilizar coordenadas enteras.");
  }
  if (!Array.isArray(mapa) || mapa.length === 0) {
    throw new Error("Se necesita un mapa válido para evaluar el ataque.");
  }
}
