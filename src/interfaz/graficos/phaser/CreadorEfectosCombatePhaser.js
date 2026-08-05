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
  crearImpactoProyectil({ centro, critico = false } = {}) {
    if (!esCentroValido(centro)) return null;
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });
    const radio = critico ? 8 : 6;
    const color = critico ? 0xffdf72 : 0xfff1c2;
    grafico.lineStyle(critico ? 3 : 2, color, 0.96);
    for (let indice = 0; indice < 4; indice += 1) {
      const angulo = (Math.PI * 2 * indice) / 4 + Math.PI / 4;
      const interior = radio * 0.35;
      grafico.lineBetween?.(
        Math.cos(angulo) * interior,
        Math.sin(angulo) * interior,
        Math.cos(angulo) * radio,
        Math.sin(angulo) * radio,
      );
    }
    grafico.fillStyle(color, 0.86);
    grafico.fillCircle?.(0, 0, critico ? 3 : 2);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearEfectoAtaqueCuerpoACuerpo({
    centroAtacante,
    centroObjetivo,
    animacion,
    mano = null,
    critico = false,
  } = {}) {
    if (
      !esCentroValido(centroAtacante) ||
      !esCentroValido(centroObjetivo) ||
      !animacion
    ) {
      return null;
    }

    const tipo = animacion.tipo ?? "golpe";
    if (tipo === "estocada") {
      return this.crearEstocada({
        centroAtacante,
        centroObjetivo,
        animacion,
        critico,
      });
    }

    if (tipo === "corte") {
      return this.crearCorte({
        centroAtacante,
        centroObjetivo,
        animacion,
        mano,
        critico,
      });
    }

    return this.crearGolpeContundente({
      centroAtacante,
      centroObjetivo,
      animacion,
      critico,
    });
  }

  crearCorte({
    centroAtacante,
    centroObjetivo,
    animacion,
    mano,
    critico = false,
  }) {
    const anguloAtaque = Math.atan2(
      centroObjetivo.y - centroAtacante.y,
      centroObjetivo.x - centroAtacante.x,
    );
    const desviacionMano = mano === "secundaria" ? -0.18 : 0.18;
    const sentido = animacion.sentido === "antihorario" ? -1 : 1;
    const factorCritico = critico ? 1.22 : 1;
    const amplitud =
      ((Number(animacion.amplitudGrados) || 75) * factorCritico * Math.PI) /
      180;
    const radio = Math.max(
      5,
      10 * (Number(animacion.escala) || 1) * factorCritico,
    );
    const centroAngulo = anguloAtaque + Math.PI / 2 + desviacionMano;
    const inicio = centroAngulo - (amplitud / 2) * sentido;
    const fin = centroAngulo + (amplitud / 2) * sentido;
    const grafico = this.escena.add.graphics({
      x: centroObjetivo.x,
      y: centroObjetivo.y,
    });
    const grosorBase = animacion.tamano === "grande" ? 3 : 2;
    const grosor = grosorBase + (critico ? 2 : 0);
    grafico.lineStyle(grosor, critico ? 0xffdf72 : 0xfff1c2, 0.98);
    grafico.beginPath?.();
    grafico.arc?.(0, 0, radio, inicio, fin, sentido < 0);
    grafico.strokePath?.();
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearGolpeContundente({
    centroAtacante,
    centroObjetivo,
    animacion,
    critico = false,
  }) {
    const grafico = this.escena.add.graphics({
      x: centroObjetivo.x,
      y: centroObjetivo.y,
    });
    const escala = Number(animacion.escala) || 1;
    const factorCritico = critico ? 1.28 : 1;
    const radio = Math.max(5, 9 * escala * factorCritico);
    const color = critico ? 0xffd862 : 0xffe5a7;
    const grosor = (animacion.tamano === "grande" ? 3 : 2) +
      (critico ? 2 : 0);

    if (animacion.tamano === "grande") {
      const puntas = 8;
      const radioInterior = radio * 0.43;
      grafico.lineStyle(grosor, color, 0.98);
      grafico.beginPath?.();
      for (let indice = 0; indice < puntas * 2; indice += 1) {
        const angulo = -Math.PI / 2 + (Math.PI * indice) / puntas;
        const radioActual = indice % 2 === 0 ? radio : radioInterior;
        const x = Math.cos(angulo) * radioActual;
        const y = Math.sin(angulo) * radioActual;
        if (indice === 0) grafico.moveTo?.(x, y);
        else grafico.lineTo?.(x, y);
      }
      grafico.closePath?.();
      grafico.strokePath?.();
      grafico.fillStyle(critico ? 0xffef9c : 0xfff1c2, 0.95);
      grafico.fillCircle?.(0, 0, Math.max(4, radio * 0.34));
    } else {
      const angulo = Math.atan2(
        centroObjetivo.y - centroAtacante.y,
        centroObjetivo.x - centroAtacante.x,
      );
      grafico.lineStyle(grosor, color, 0.94);
      grafico.strokeCircle?.(0, 0, radio);
      grafico.lineBetween?.(
        -Math.cos(angulo) * radio,
        -Math.sin(angulo) * radio,
        Math.cos(angulo) * radio,
        Math.sin(angulo) * radio,
      );
      grafico.fillStyle(color, 0.9);
      grafico.fillCircle?.(0, 0, critico ? 4 : 3);
    }

    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearEstocada({
    centroAtacante,
    centroObjetivo,
    animacion,
    critico = false,
  }) {
    const grafico = this.escena.add.graphics({
      x: centroAtacante.x,
      y: centroAtacante.y,
    });
    const dx = centroObjetivo.x - centroAtacante.x;
    const dy = centroObjetivo.y - centroAtacante.y;
    const longitud = Math.hypot(dx, dy) || 1;
    const ux = dx / longitud;
    const uy = dy / longitud;
    const offsetInicio = 5;
    const offsetFin = 2;
    const inicioX = ux * offsetInicio;
    const inicioY = uy * offsetInicio;
    const finX = dx - ux * offsetFin;
    const finY = dy - uy * offsetFin;
    const factorCritico = critico ? 1.24 : 1;
    const punta = 4 * (Number(animacion.escala) || 1) * factorCritico;
    grafico.lineStyle(
      critico ? 4 : 2,
      critico ? 0xffdf72 : 0xfff1c2,
      0.98,
    );
    grafico.lineBetween?.(inicioX, inicioY, finX, finY);
    grafico.lineBetween?.(
      finX,
      finY,
      finX - ux * punta - uy * punta,
      finY - uy * punta + ux * punta,
    );
    grafico.lineBetween?.(
      finX,
      finY,
      finX - ux * punta + uy * punta,
      finY - uy * punta - ux * punta,
    );
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

}

function esCentroValido(centro) {
  return Number.isFinite(centro?.x) && Number.isFinite(centro?.y);
}
