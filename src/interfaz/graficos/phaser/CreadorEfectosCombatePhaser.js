import {
  CONFIGURACION_EFECTOS_COMBATE_PHASER,
  obtenerEstiloFeedbackCombate,
} from "./ConfiguracionEfectosCombatePhaser.js";

// Crea objetos visuales temporales. No interpreta reglas de combate ni decide
// qué resultado ocurrió; recibe texto, tipo y posición ya resueltos.
export class CreadorEfectosCombatePhaser {
  constructor({ escena, compositor } = {}) {
    if (!escena?.add || !compositor) {
      throw new Error(
        "El creador de efectos de combate necesita escena y compositor.",
      );
    }

    this.escena = escena;
    this.compositor = compositor;
  }

  crearTextoFlotante({
    centro,
    texto,
    tipo,
    indiceGolpe = 0,
    desplazamientoY = 0,
  } = {}) {
    if (!esCentroValido(centro) || typeof texto !== "string" || texto === "") {
      return null;
    }

    const estilo = obtenerEstiloFeedbackCombate(tipo);
    const separacion =
      CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.separacionGolpePx;
    const objeto = this.escena.add
      .text(
        centro.x,
        centro.y - 14 - indiceGolpe * separacion + desplazamientoY,
        texto,
        {
          color: estilo.color,
          fontFamily: "monospace",
          fontSize: estilo.tamano,
          fontStyle: "bold",
          stroke: estilo.borde,
          strokeThickness: 3,
          align: "center",
        },
      )
      .setOrigin(0.5);

    objeto.setScale?.(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.escalaInicial,
    );
    this.compositor.agregarEfectoTemporal(objeto);
    return objeto;
  }

  crearEscudoBloqueo({ centro, indiceGolpe = 0 } = {}) {
    if (!esCentroValido(centro)) return null;

    const grafico = this.escena.add.graphics({
      x: centro.x + 10,
      y: centro.y - 7 - indiceGolpe * 3,
    });
    grafico.fillStyle(0x334a5c, 0.88);
    grafico.lineStyle(2, 0xdce8f1, 0.95);
    grafico.beginPath?.();
    grafico.moveTo?.(0, -7);
    grafico.lineTo?.(6, -4);
    grafico.lineTo?.(5, 4);
    grafico.lineTo?.(0, 8);
    grafico.lineTo?.(-5, 4);
    grafico.lineTo?.(-6, -4);
    grafico.closePath?.();
    grafico.fillPath?.();
    grafico.strokePath?.();
    grafico.setScale?.(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.bloqueo.escalaInicial,
    );
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearMarcaCritico({ centro, indiceGolpe = 0 } = {}) {
    if (!esCentroValido(centro)) return null;

    const grafico = this.escena.add.graphics({
      x: centro.x - 10,
      y: centro.y - 8 - indiceGolpe * 3,
    });
    grafico.lineStyle(2, 0xffdf77, 0.95);
    grafico.beginPath?.();
    for (let indice = 0; indice < 8; indice += 1) {
      const angulo = -Math.PI / 2 + (Math.PI * 2 * indice) / 8;
      const radio = indice % 2 === 0 ? 8 : 3;
      const x = Math.cos(angulo) * radio;
      const y = Math.sin(angulo) * radio;
      if (indice === 0) grafico.moveTo?.(x, y);
      else grafico.lineTo?.(x, y);
    }
    grafico.closePath?.();
    grafico.strokePath?.();
    grafico.setScale?.(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.critico.escalaInicial,
    );
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearMarcaImpacto({ centro, critico = false } = {}) {
    if (!esCentroValido(centro)) return null;

    const marca = this.escena.add.graphics({
      x: centro.x,
      y: centro.y,
    });
    marca.lineStyle(critico ? 3 : 2, critico ? 0xffd36e : 0xfff0b8, 0.95);
    marca.beginPath?.();
    marca.moveTo?.(-7, -5);
    marca.lineTo?.(7, 5);
    marca.moveTo?.(6, -7);
    marca.lineTo?.(-5, 7);
    marca.strokePath?.();
    marca.fillStyle(critico ? 0xffe7a3 : 0xffffff, 0.82);
    marca.fillCircle(0, 0, critico ? 4 : 3);
    this.compositor.agregarEfectoTemporal(marca);
    return marca;
  }
}

function esCentroValido(centro) {
  return Number.isFinite(centro?.x) && Number.isFinite(centro?.y);
}
