import { crearMensajeTraducible, TIPOS_MENSAJE_JUEGO } from "../mensajes/MensajesJuego.js";
import { SistemaEspacial } from "../espacio/SistemaEspacial.js";
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
  sistemaEspacial = null,
} = {}) {
  validarDatos({ atacante, xObjetivo, yObjetivo, mapa, sistemaEspacial });
  const espacio = resolverSistemaEspacial({ mapa, sistemaEspacial });
  const origen = {
    x: atacante.x,
    y: atacante.y,
  };
  const destino = {
    x: xObjetivo,
    y: yObjetivo,
  };

  if (!espacio.estaDentroMapa(destino.x, destino.y)) {
    return crearResultadoInvalido(
      "La casilla seleccionada está fuera del mapa.",
      "mensajes.alcance.saleMapa",
    );
  }

  const terrenoDestino = espacio.consultarTerreno(destino.x, destino.y);
  if (terrenoDestino.bloqueaMovimiento && terrenoDestino.bloqueaVision) {
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

  const lineaVision = evaluarLineaVision({
    mapa,
    sistemaEspacial: espacio,
    origen,
    destino,
  });
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
export function evaluarLineaVision({
  mapa,
  sistemaEspacial = null,
  origen,
  destino,
} = {}) {
  const espacio = resolverSistemaEspacial({ mapa, sistemaEspacial });
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
    !espacio.estaDentroMapa(origen.x, origen.y) ||
    !espacio.estaDentroMapa(destino.x, destino.y)
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
      const lateralHorizontal = { x: x + direccionX, y };
      const lateralVertical = { x, y: y + direccionY };
      const horizontalBloqueado = espacio.bloqueaVision(
        lateralHorizontal.x,
        lateralHorizontal.y,
      );
      const verticalBloqueado = espacio.bloqueaVision(
        lateralVertical.x,
        lateralVertical.y,
      );

      if (horizontalBloqueado && verticalBloqueado) {
        return {
          despejada: false,
          mensaje: "Dos obstrucciones bloquean la trayectoria diagonal.",
          mensajePresentacion: crearMensajeAlcance(
            "mensajes.alcance.dosObstruccionesDiagonal",
          ),
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
    // La casilla destino no bloquea la visión hacia sí misma. Solamente se
    // evalúan obstrucciones intermedias de terreno, entidades y zonas.
    if (!esDestino && espacio.bloqueaVision(x, y)) {
      return {
        despejada: false,
        mensaje: "Una obstrucción bloquea la trayectoria.",
        mensajePresentacion: crearMensajeAlcance(
          "mensajes.alcance.obstruccionBloquea",
        ),
      };
    }
  }

  return {
    despejada: true,
    mensaje: null,
    mensajePresentacion: null,
  };
}

function resolverSistemaEspacial({ mapa, sistemaEspacial }) {
  if (
    sistemaEspacial &&
    typeof sistemaEspacial.estaDentroMapa === "function" &&
    typeof sistemaEspacial.bloqueaVision === "function" &&
    typeof sistemaEspacial.consultarTerreno === "function"
  ) {
    return sistemaEspacial;
  }
  return new SistemaEspacial({ mapa });
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

function validarDatos({
  atacante,
  xObjetivo,
  yObjetivo,
  mapa,
  sistemaEspacial,
}) {
  if (!atacante) {
    throw new Error("Se necesita un atacante para evaluar el alcance.");
  }
  if (!Number.isInteger(xObjetivo) || !Number.isInteger(yObjetivo)) {
    throw new Error("La posición objetivo debe utilizar coordenadas enteras.");
  }
  if (
    (!Array.isArray(mapa) || mapa.length === 0) &&
    !sistemaEspacial
  ) {
    throw new Error("Se necesita un mapa o sistema espacial válido para evaluar el ataque.");
  }
}
