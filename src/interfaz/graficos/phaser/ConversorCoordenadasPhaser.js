import { TAMANO_CASILLA_VISUAL_PHASER } from "./ConfiguracionPhaser.js";

// Centraliza la traducción entre pantalla, mundo y casillas lógicas.
// No dibuja, no modifica el estado jugable y no emite comandos.
export class ConversorCoordenadasPhaser {
  constructor({ camara } = {}) {
    if (!camara?.getWorldPoint) {
      throw new Error(
        "ConversorCoordenadasPhaser necesita una cámara Phaser válida.",
      );
    }

    this.camara = camara;
    this.geometria = null;
  }

  actualizarGeometria(geometria) {
    this.geometria = validarGeometria(geometria)
      ? Object.freeze({ ...geometria })
      : null;
  }

  pantallaAMundo(xPantalla, yPantalla) {
    if (!sonCoordenadasValidas(xPantalla, yPantalla)) {
      return null;
    }

    const zoom = obtenerZoom(this.camara);
    const origenPantallaX =
      this.camara.x + this.camara.width * this.camara.originX;
    const origenPantallaY =
      this.camara.y + this.camara.height * this.camara.originY;
    const origenMundoX =
      this.camara.scrollX + this.camara.width * this.camara.originX;
    const origenMundoY =
      this.camara.scrollY + this.camara.height * this.camara.originY;

    return {
      x: origenMundoX + (xPantalla - origenPantallaX) / zoom,
      y: origenMundoY + (yPantalla - origenPantallaY) / zoom,
    };
  }

  mundoAPantalla(xMundo, yMundo) {
    if (!sonCoordenadasValidas(xMundo, yMundo)) {
      return null;
    }

    const zoom = obtenerZoom(this.camara);
    const origenPantallaX =
      this.camara.x + this.camara.width * this.camara.originX;
    const origenPantallaY =
      this.camara.y + this.camara.height * this.camara.originY;
    const origenMundoX =
      this.camara.scrollX + this.camara.width * this.camara.originX;
    const origenMundoY =
      this.camara.scrollY + this.camara.height * this.camara.originY;

    return {
      x: origenPantallaX + (xMundo - origenMundoX) * zoom,
      y: origenPantallaY + (yMundo - origenMundoY) * zoom,
    };
  }

  mundoACasilla(xMundo, yMundo) {
    if (
      !this.geometria ||
      !sonCoordenadasValidas(xMundo, yMundo)
    ) {
      return null;
    }

    const casilla = {
      x: Math.floor(
        (xMundo - this.geometria.origenX) /
          TAMANO_CASILLA_VISUAL_PHASER,
      ),
      y: Math.floor(
        (yMundo - this.geometria.origenY) /
          TAMANO_CASILLA_VISUAL_PHASER,
      ),
    };

    return normalizarCasilla(casilla, this.geometria);
  }

  pantallaACasilla(xPantalla, yPantalla) {
    const puntoMundo = this.pantallaAMundo(xPantalla, yPantalla);

    return puntoMundo
      ? this.mundoACasilla(puntoMundo.x, puntoMundo.y)
      : null;
  }

  casillaAMundo(casilla, { centro = false } = {}) {
    const normalizada = normalizarCasilla(casilla, this.geometria);
    if (!normalizada) return null;

    const desplazamiento = centro ? 0.5 : 0;

    return {
      x:
        this.geometria.origenX +
        (normalizada.x + desplazamiento) * TAMANO_CASILLA_VISUAL_PHASER,
      y:
        this.geometria.origenY +
        (normalizada.y + desplazamiento) * TAMANO_CASILLA_VISUAL_PHASER,
    };
  }

  casillaAPantalla(casilla, opciones = {}) {
    const puntoMundo = this.casillaAMundo(casilla, opciones);

    return puntoMundo
      ? this.mundoAPantalla(puntoMundo.x, puntoMundo.y)
      : null;
  }

  destruir() {
    this.geometria = null;
    this.camara = null;
  }
}

function validarGeometria(geometria) {
  return Boolean(
    Number.isInteger(geometria?.columnas) &&
      geometria.columnas > 0 &&
      Number.isInteger(geometria?.filas) &&
      geometria.filas > 0 &&
      Number.isFinite(geometria?.origenX) &&
      Number.isFinite(geometria?.origenY),
  );
}

function normalizarCasilla(casilla, geometria) {
  if (
    !validarGeometria(geometria) ||
    !Number.isInteger(casilla?.x) ||
    !Number.isInteger(casilla?.y) ||
    casilla.x < 0 ||
    casilla.y < 0 ||
    casilla.x >= geometria.columnas ||
    casilla.y >= geometria.filas
  ) {
    return null;
  }

  return { x: casilla.x, y: casilla.y };
}

function obtenerZoom(camara) {
  return Number.isFinite(camara?.zoom) && camara.zoom > 0
    ? camara.zoom
    : 1;
}

function sonCoordenadasValidas(x, y) {
  return Number.isFinite(x) && Number.isFinite(y);
}
