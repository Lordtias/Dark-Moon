import { TAMANO_CASILLA_REFERENCIA } from "./ConfiguracionPhaser.js";

const COLOR_SELECTOR_VALIDO = 0xffe66d;
const COLOR_SELECTOR_INVALIDO = 0xff705c;

// Compone únicamente el feedback táctico de selección sobre la escena neutral.
export class CompositorSeleccionPhaser {
  constructor({ escena, capaSeleccion, obtenerPosicionCasilla } = {}) {
    if (!escena?.add || !capaSeleccion || typeof obtenerPosicionCasilla !== "function") {
      throw new Error(
        "CompositorSeleccionPhaser necesita escena, capa y conversión de casillas.",
      );
    }

    this.escena = escena;
    this.capaSeleccion = capaSeleccion;
    this.obtenerPosicionCasilla = obtenerPosicionCasilla;
    this.escenaDarkMoon = null;
    this.geometria = null;
    this.casillaPuntero = null;
  }

  actualizarContexto({ escenaDarkMoon, geometria } = {}) {
    this.escenaDarkMoon = escenaDarkMoon ?? null;
    this.geometria = geometria ?? null;
  }

  ocultarTemporal() {
    if (!this.capaSeleccion) {
      return false;
    }

    // Al confirmar una acción, el selector táctico pertenece al estado previo.
    // Se retira antes de reproducir el ataque para que no permanezca superpuesto
    // sobre el objetivo durante el feedback visual. La escena final autoritativa
    // volverá a dibujar la selección únicamente si todavía corresponde.
    this.capaSeleccion.removeAll(true);
    return true;
  }

  establecerCasillaPuntero(casilla) {
    const normalizada = normalizarCasilla(casilla, this.geometria);

    if (
      normalizada?.x === this.casillaPuntero?.x &&
      normalizada?.y === this.casillaPuntero?.y
    ) {
      return;
    }

    this.casillaPuntero = normalizada;
    this.dibujar();
  }

  dibujar({ escenaDarkMoon = this.escenaDarkMoon, geometria = this.geometria } = {}) {
    this.actualizarContexto({ escenaDarkMoon, geometria });
    this.capaSeleccion.removeAll(true);

    if (!this.escenaDarkMoon || !this.geometria) {
      return;
    }

    const combate = this.escenaDarkMoon.combate ?? {};
    const graficos = this.escena.add.graphics();
    const esHabilidad = combate.modo === "habilidad";
    const estiloHabilidad = obtenerEstiloSeleccionHabilidadPhaser(
      combate.habilidad?.maestria,
    );

    for (const casilla of combate.casillasAtacables ?? []) {
      this.dibujarRellenoCasilla(graficos, casilla, {
        relleno: esHabilidad ? estiloHabilidad.rangoRelleno : 0xdc3737,
        borde: esHabilidad ? estiloHabilidad.rangoBorde : 0xff6e6e,
        alphaRelleno: 0.1,
        alphaBorde: 0.28,
        margen: 1,
      });
    }

    for (const casilla of combate.casillasAfectadas ?? []) {
      this.dibujarRellenoCasilla(graficos, casilla, {
        relleno: estiloHabilidad.areaRelleno,
        borde: estiloHabilidad.areaBorde,
        alphaRelleno: 0.18,
        alphaBorde: 0.48,
        margen: 2,
      });
    }

    this.dibujarRecorrido(
      graficos,
      combate.recorrido,
      esHabilidad ? estiloHabilidad : null,
    );

    if (this.casillaPuntero) {
      this.dibujarRellenoCasilla(graficos, this.casillaPuntero, {
        relleno: 0xdce8ff,
        borde: 0xeaf2ff,
        alphaRelleno: 0.07,
        alphaBorde: 0.42,
        margen: 2,
      });
    }

    if (combate.selector) {
      this.dibujarSelectorEsquinas(
        graficos,
        combate.selector,
        esHabilidad ? estiloHabilidad : null,
      );
    }

    this.capaSeleccion.add(graficos);
    this.dibujarObjetivosHabilidad(
      combate.objetivosAfectados,
      esHabilidad ? estiloHabilidad : null,
    );
  }

  dibujarRellenoCasilla(graficos, casilla, estilo) {
    const posicion = this.obtenerPosicionCasilla(casilla);
    if (!posicion) return;

    const margen = estilo.margen ?? 1;
    graficos.fillStyle(estilo.relleno, estilo.alphaRelleno);
    graficos.fillRect(
      posicion.x + margen,
      posicion.y + margen,
      TAMANO_CASILLA_REFERENCIA - margen * 2,
      TAMANO_CASILLA_REFERENCIA - margen * 2,
    );
    graficos.lineStyle(1, estilo.borde, estilo.alphaBorde);
    graficos.strokeRect(
      posicion.x + margen + 0.5,
      posicion.y + margen + 0.5,
      TAMANO_CASILLA_REFERENCIA - margen * 2 - 1,
      TAMANO_CASILLA_REFERENCIA - margen * 2 - 1,
    );
  }

  dibujarSelectorEsquinas(graficos, selector, estiloHabilidad = null) {
    const posicion = this.obtenerPosicionCasilla(selector);
    if (!posicion) return;

    const color = selector.esValido
      ? estiloHabilidad?.selector ?? COLOR_SELECTOR_VALIDO
      : COLOR_SELECTOR_INVALIDO;
    const margen = 3;
    const longitud = 8;
    const x0 = posicion.x + margen;
    const y0 = posicion.y + margen;
    const x1 = posicion.x + TAMANO_CASILLA_REFERENCIA - margen;
    const y1 = posicion.y + TAMANO_CASILLA_REFERENCIA - margen;

    graficos.fillStyle(color, 0.1);
    graficos.fillRect(
      posicion.x + 1,
      posicion.y + 1,
      TAMANO_CASILLA_REFERENCIA - 2,
      TAMANO_CASILLA_REFERENCIA - 2,
    );
    graficos.lineStyle(3, color, 1);
    graficos.lineBetween(x0, y0, x0 + longitud, y0);
    graficos.lineBetween(x0, y0, x0, y0 + longitud);
    graficos.lineBetween(x1, y0, x1 - longitud, y0);
    graficos.lineBetween(x1, y0, x1, y0 + longitud);
    graficos.lineBetween(x0, y1, x0 + longitud, y1);
    graficos.lineBetween(x0, y1, x0, y1 - longitud);
    graficos.lineBetween(x1, y1, x1 - longitud, y1);
    graficos.lineBetween(x1, y1, x1, y1 - longitud);
  }

  dibujarRecorrido(graficos, recorrido, estiloHabilidad = null) {
    if (!Array.isArray(recorrido) || recorrido.length < 2) return;

    const pasos = [...recorrido].sort((a, b) => a.orden - b.orden);
    graficos.lineStyle(
      3,
      estiloHabilidad?.recorrido ?? 0xb9dcff,
      0.88,
    );
    graficos.beginPath();

    pasos.forEach((paso, indice) => {
      const posicion = this.obtenerPosicionCasilla(paso);
      if (!posicion) return;
      const x = posicion.x + TAMANO_CASILLA_REFERENCIA / 2;
      const y = posicion.y + TAMANO_CASILLA_REFERENCIA / 2;
      if (indice === 0) graficos.moveTo(x, y);
      else graficos.lineTo(x, y);
    });

    graficos.strokePath();
  }

  dibujarObjetivosHabilidad(objetivos, estiloHabilidad = null) {
    for (const objetivo of objetivos ?? []) {
      const posicion = this.obtenerPosicionCasilla(objetivo);
      if (!posicion) continue;

      const graficos = this.escena.add.graphics();
      graficos.lineStyle(
        2,
        estiloHabilidad?.objetivoBorde ?? 0xf5e1ff,
        0.95,
      );
      graficos.strokeRect(
        posicion.x + 5.5,
        posicion.y + 5.5,
        TAMANO_CASILLA_REFERENCIA - 11,
        TAMANO_CASILLA_REFERENCIA - 11,
      );
      this.capaSeleccion.add(graficos);

      const texto = this.escena.add
        .text(
          posicion.x + TAMANO_CASILLA_REFERENCIA - 7,
          posicion.y + 7,
          String((objetivo.orden ?? 0) + 1),
          {
            color: "#ffffff",
            backgroundColor: estiloHabilidad?.objetivoFondoCss ?? "#50236e",
            fontFamily: "monospace",
            fontSize: "9px",
            fontStyle: "bold",
            padding: { x: 2, y: 1 },
          },
        )
        .setOrigin(0.5);
      this.capaSeleccion.add(texto);
    }
  }

  destruir() {
    this.escenaDarkMoon = null;
    this.geometria = null;
    this.casillaPuntero = null;
    this.escena = null;
    this.capaSeleccion = null;
    this.obtenerPosicionCasilla = null;
  }
}

function obtenerEstiloSeleccionHabilidadPhaser(maestria) {
  const estilos = {
    fuego: {
      rangoRelleno: 0xff642f,
      rangoBorde: 0xffa25d,
      areaRelleno: 0xff4f28,
      areaBorde: 0xffc363,
      recorrido: 0xffae64,
      objetivoBorde: 0xffe4ad,
      objetivoFondoCss: "#782b18",
      selector: 0xffbd62,
    },
    frio: {
      rangoRelleno: 0x51bff3,
      rangoBorde: 0x9fe6ff,
      areaRelleno: 0x54c5f5,
      areaBorde: 0xd4f7ff,
      recorrido: 0xb6ecff,
      objetivoBorde: 0xe8fbff,
      objetivoFondoCss: "#205f82",
      selector: 0x9be8ff,
    },
    rayo: {
      rangoRelleno: 0xad58f4,
      rangoBorde: 0xd59bff,
      areaRelleno: 0xaa50e6,
      areaBorde: 0xe6b8ff,
      recorrido: 0xd6aaff,
      objetivoBorde: 0xf3deff,
      objetivoFondoCss: "#522375",
      selector: 0xd7a3ff,
    },
    veneno: {
      rangoRelleno: 0x68d63d,
      rangoBorde: 0xaaf064,
      areaRelleno: 0x62ce38,
      areaBorde: 0xcfff83,
      recorrido: 0xb8ef70,
      objetivoBorde: 0xe0ffb3,
      objetivoFondoCss: "#35651f",
      selector: 0xb8ef70,
    },
  };
  return estilos[maestria] ?? {
    rangoRelleno: 0x5578eb,
    rangoBorde: 0x7da5ff,
    areaRelleno: 0xaa50e6,
    areaBorde: 0xe19bff,
    recorrido: 0xb9dcff,
    objetivoBorde: 0xf5e1ff,
    objetivoFondoCss: "#50236e",
    selector: COLOR_SELECTOR_VALIDO,
  };
}

function normalizarCasilla(casilla, geometria) {
  if (
    !geometria ||
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
