import { SistemaEspacial } from "./SistemaEspacial.js";

// Primitivas geométricas compartidas por combate, IA, visibilidad, habilidades
// y generación. No producen mensajes de interfaz ni aplican reglas de daño.
export const MOTIVOS_LINEA_VISION = Object.freeze({
  DESPEJADA: "despejada",
  FUERA_MAPA: "fuera_mapa",
  DOS_OBSTRUCCIONES_DIAGONAL: "dos_obstrucciones_diagonal",
  OBSTRUCCION: "obstruccion",
});

// Distancia Chebyshev: coincide con el movimiento en ocho direcciones.
export function calcularDistanciaCuadricula(origen, destino) {
  return Math.max(
    Math.abs(destino.x - origen.x),
    Math.abs(destino.y - origen.y),
  );
}

// Recorre las casillas atravesadas por una línea de visión utilizando la
// autoridad espacial activa. La casilla destino no se considera obstrucción
// para poder ver o apuntar a una entidad que ocupa esa misma casilla.
export function evaluarLineaVisionCuadricula({
  mapa,
  sistemaEspacial = null,
  origen,
  destino,
} = {}) {
  if (
    !Number.isInteger(origen?.x) ||
    !Number.isInteger(origen?.y) ||
    !Number.isInteger(destino?.x) ||
    !Number.isInteger(destino?.y)
  ) {
    throw new Error("La línea de visión necesita posiciones enteras válidas.");
  }
  const espacio = resolverSistemaEspacial({ mapa, sistemaEspacial });

  if (
    !espacio.estaDentroMapa(origen.x, origen.y) ||
    !espacio.estaDentroMapa(destino.x, destino.y)
  ) {
    return crearResultadoLineaVision(false, MOTIVOS_LINEA_VISION.FUERA_MAPA);
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
        return crearResultadoLineaVision(
          false,
          MOTIVOS_LINEA_VISION.DOS_OBSTRUCCIONES_DIAGONAL,
          { x, y },
        );
      }

      x += direccionX;
      y += direccionY;
      pasosX += 1;
      pasosY += 1;
    } else if (decision < 0) {
      x += direccionX;
      pasosX += 1;
    } else {
      y += direccionY;
      pasosY += 1;
    }

    const esDestino = x === destino.x && y === destino.y;
    if (!esDestino && espacio.bloqueaVision(x, y)) {
      return crearResultadoLineaVision(
        false,
        MOTIVOS_LINEA_VISION.OBSTRUCCION,
        { x, y },
      );
    }
  }

  return crearResultadoLineaVision(true, MOTIVOS_LINEA_VISION.DESPEJADA);
}

function resolverSistemaEspacial({ mapa, sistemaEspacial }) {
  if (
    sistemaEspacial &&
    typeof sistemaEspacial.estaDentroMapa === "function" &&
    typeof sistemaEspacial.bloqueaVision === "function"
  ) {
    return sistemaEspacial;
  }
  return new SistemaEspacial({ mapa });
}

function crearResultadoLineaVision(despejada, motivo, posicionBloqueo = null) {
  return {
    despejada,
    motivo,
    posicionBloqueo: posicionBloqueo ? { ...posicionBloqueo } : null,
  };
}
