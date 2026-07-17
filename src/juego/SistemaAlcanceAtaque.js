// Centraliza las reglas de alcance y línea de visión.
//
// Este sistema será utilizado tanto por el jugador
// como por los enemigos, habilidades y hechizos futuros.

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
      alineacionValida: false,
      distancia,
      mensaje: `La casilla supera el alcance ` + `${atacante.alcanceAtaque}.`,
    };
  }

  const tipoAtaque = atacante.tipoAtaqueActual;

  const alineacionValida =
    tipoAtaque !== "cuerpoACuerpo" ||
    estaEnDireccionCuerpoACuerpo(origen, destino);

  if (!alineacionValida) {
    return {
      puedeAtacar: false,
      dentroAlcance: true,
      lineaVisionDespejada: false,
      alineacionValida: false,
      distancia,
      mensaje:
        "El ataque cuerpo a cuerpo debe realizarse " +
        "en línea recta o diagonal.",
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
      alineacionValida: true,
      distancia,
      mensaje: lineaVision.mensaje,
    };
  }

  return {
    puedeAtacar: true,
    dentroAlcance: true,
    lineaVisionDespejada: true,
    alineacionValida: true,
    distancia,
    mensaje: null,
  };
}

// Las armas cuerpo a cuerpo con alcance superior
// solamente pueden extenderse en ocho direcciones:
//
// - Horizontal.
// - Vertical.
// - Diagonal perfecta.
function estaEnDireccionCuerpoACuerpo(origen, destino) {
  const diferenciaX = destino.x - origen.x;

  const diferenciaY = destino.y - origen.y;

  return (
    diferenciaX === 0 ||
    diferenciaY === 0 ||
    Math.abs(diferenciaX) === Math.abs(diferenciaY)
  );
}

// Recorre todas las casillas atravesadas por
// la trayectoria del ataque.
//
// Cuando la línea cruza exactamente una esquina,
// bloqueamos únicamente si ambos laterales son paredes.
// Esto conserva la misma regla utilizada al caminar.
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

    // La casilla de destino ya fue validada.
    // Solamente comprobamos obstáculos intermedios.
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

// Una posición fuera del mapa también se considera
// bloqueante para las comprobaciones de esquinas.
function esBloqueante(mapa, x, y) {
  return !estaDentroMapa(mapa, x, y) || esPared(mapa, x, y);
}

function crearResultadoInvalido(mensaje) {
  return {
    puedeAtacar: false,
    dentroAlcance: false,
    lineaVisionDespejada: false,
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
