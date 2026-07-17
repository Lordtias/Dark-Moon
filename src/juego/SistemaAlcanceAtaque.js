import { PATRONES_ATAQUE, esPatronAtaqueValido } from "./PatronesAtaque.js";

// Centraliza las reglas de alcance y línea de visión.
//
// Este sistema será utilizado tanto por el jugador
// como por enemigos, habilidades y hechizos futuros.
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
  validarDatos({
    atacante,
    xObjetivo,
    yObjetivo,
    mapa,
  });

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
    );
  }

  if (esPared(mapa, destino.x, destino.y)) {
    return crearResultadoInvalido("No podés atacar una pared.");
  }

  const distancia = calcularDistanciaCuadricula(origen, destino);

  if (distancia === 0) {
    return {
      puedeAtacar: false,
      dentroAlcance: false,
      lineaVisionDespejada: true,
      patronValido: false,

      // Se conserva temporalmente este nombre
      // por compatibilidad con posibles consumidores.
      alineacionValida: false,

      distancia,

      mensaje: "No podés atacar tu propia casilla.",
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
    };
  }

  const lineaVision = evaluarLineaVision({
    mapa,
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
  };
}

// Valida la forma espacial del ataque.
//
// ADYACENTE:
// Solamente permite las ocho casillas contiguas.
//
// LINEAL:
// Permite horizontal, vertical o diagonal perfecta.
//
// LIBRE:
// Permite cualquier posición dentro del alcance.
function evaluarPatronAtaque({ patronAtaque, origen, destino, distancia }) {
  switch (patronAtaque) {
    case PATRONES_ATAQUE.ADYACENTE:
      return {
        valido: distancia === 1,

        mensaje:
          distancia === 1
            ? null
            : "Este ataque solamente puede alcanzar " + "casillas adyacentes.",
      };

    case PATRONES_ATAQUE.LINEAL:
      return {
        valido: estaEnDireccionLineal(origen, destino),

        mensaje:
          "Este ataque debe realizarse en línea " +
          "horizontal, vertical o diagonal.",
      };

    case PATRONES_ATAQUE.LIBRE:
      return {
        valido: true,
        mensaje: null,
      };

    default:
      return {
        valido: false,

        mensaje: "El patrón de ataque seleccionado " + "no está implementado.",
      };
  }
}

// Comprueba las ocho direcciones lineales:
//
// - Horizontal.
// - Vertical.
// - Diagonal perfecta.
function estaEnDireccionLineal(origen, destino) {
  const diferenciaX = destino.x - origen.x;

  const diferenciaY = destino.y - origen.y;

  return (
    diferenciaX === 0 ||
    diferenciaY === 0 ||
    Math.abs(diferenciaX) === Math.abs(diferenciaY)
  );
}

// Recorre todas las casillas atravesadas
// por la trayectoria del ataque.
//
// Cuando la trayectoria cruza exactamente una
// esquina, solamente bloqueamos si ambos lados
// están cerrados por paredes.
function evaluarLineaVision({ mapa, origen, destino }) {
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

          mensaje:
            "Dos paredes bloquean la trayectoria " + "diagonal del ataque.",
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

    // La casilla de destino fue validada antes.
    // Aquí solamente comprobamos obstáculos
    // que se encuentren en el trayecto.
    if (!esDestino && esBloqueante(mapa, x, y)) {
      return {
        despejada: false,

        mensaje: "Una pared bloquea la trayectoria del ataque.",
      };
    }
  }

  return {
    despejada: true,
    mensaje: null,
  };
}

function estaDentroMapa(mapa, x, y) {
  return y >= 0 && y < mapa.length && x >= 0 && x < mapa[y].length;
}

function esPared(mapa, x, y) {
  return estaDentroMapa(mapa, x, y) && mapa[y][x] === "#";
}

// Una posición fuera del mapa se considera
// bloqueante al comprobar esquinas.
function esBloqueante(mapa, x, y) {
  return !estaDentroMapa(mapa, x, y) || esPared(mapa, x, y);
}

function crearResultadoInvalido(mensaje) {
  return {
    puedeAtacar: false,
    dentroAlcance: false,
    lineaVisionDespejada: false,
    patronValido: false,
    alineacionValida: false,
    distancia: null,
    mensaje,
  };
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
