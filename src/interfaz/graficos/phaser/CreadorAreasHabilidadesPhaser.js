import { esCentroValido } from "./GeometriaVisualPhaser.js";
// Construye áreas transitorias para habilidades ya resueltas. Recibe casillas
// canónicas y perfiles de presentación; no calcula radio, obstáculos, daño ni
// objetivos.
export class CreadorAreasHabilidadesPhaser {
  constructor({ escena, compositor } = {}) {
    if (!escena?.add?.graphics || !compositor) {
      throw new Error(
        "El creador de áreas de habilidades necesita escena y compositor.",
      );
    }
    this.escena = escena;
    this.compositor = compositor;
  }

  crearNucleo({ centro, perfil, grado = 1 } = {}) {
    if (!esCentroValido(centro) || !perfil) return null;
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escala = obtenerEscalaGrado(perfil, grado);
    const tile = this.compositor.obtenerTamanoCasilla?.() ?? 16;
    const radioBase = Math.max(5, tile * 0.28 * escala);
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });

    if (perfil.efectoCasilla === "fractura_hielo") {
      grafico.fillStyle?.(principal, 0.22);
      grafico.fillCircle?.(0, 0, radioBase * 1.45);
      grafico.lineStyle?.(2, secundario, 0.92);
      dibujarPoligonoRadial(grafico, radioBase * 1.2, 8, 0.14);
      grafico.strokePath?.();
      dibujarCristalesRadiales(grafico, radioBase * 1.55, secundario, 1);
    } else {
      grafico.fillStyle?.(principal, 0.48);
      grafico.fillCircle?.(0, 0, radioBase * 1.6);
      grafico.fillStyle?.(principal, 0.9);
      grafico.fillCircle?.(0, 0, radioBase);
      grafico.fillStyle?.(secundario, 0.96);
      grafico.fillCircle?.(radioBase * 0.18, -radioBase * 0.18, radioBase * 0.38);
      dibujarLlamasRadiales(grafico, radioBase * 1.85, principal, secundario, 1);
    }

    grafico.setAlpha?.(0.2);
    grafico.setScale?.(0.7);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearAnilloExpansion({
    centro,
    perfil,
    radioPx,
    grosor = 3,
    anillo = 0,
    grado = 1,
  } = {}) {
    if (!esCentroValido(centro) || !perfil || !Number.isFinite(radioPx)) {
      return null;
    }
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escala = obtenerEscalaGrado(perfil, grado);
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });
    const radio = Math.max(7, radioPx * escala);

    if (perfil.efectoCasilla === "fractura_hielo") {
      grafico.lineStyle?.(Math.max(2, grosor), principal, 0.82);
      dibujarPoligonoRadial(grafico, radio, 8 + anillo * 2, 0.1);
      grafico.strokePath?.();
      grafico.lineStyle?.(1.5, secundario, 0.94);
      dibujarPoligonoRadial(grafico, radio * 0.78, 8 + anillo * 2, 0.14);
      grafico.strokePath?.();
    } else {
      grafico.lineStyle?.(Math.max(2, grosor), principal, 0.78);
      grafico.strokeCircle?.(0, 0, radio);
      grafico.lineStyle?.(1.5, secundario, 0.88);
      grafico.strokeCircle?.(0, 0, Math.max(4, radio * 0.72));
    }

    grafico.setAlpha?.(0.68);
    grafico.setScale?.(0.84);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearEfectoCasilla({
    centro,
    perfil,
    grado = 1,
    anillo = 0,
    esCentro = false,
    tieneObjetivo = false,
  } = {}) {
    if (!esCentroValido(centro) || !perfil) return null;
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const tile = this.compositor.obtenerTamanoCasilla?.() ?? 16;
    const escala = obtenerEscalaGrado(perfil, grado);
    const tamano = tile * (esCentro ? 0.92 : 0.82) * Math.min(1.18, escala);
    const mitad = tamano / 2;
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });

    if (perfil.efectoCasilla === "fractura_hielo") {
      grafico.fillStyle?.(principal, tieneObjetivo ? 0.24 : 0.18);
      grafico.fillRect?.(-mitad, -mitad, tamano, tamano);
      grafico.lineStyle?.(1.4, secundario, 0.82);
      dibujarGrietasHielo(grafico, mitad, anillo);
      dibujarCristalesCasilla(grafico, mitad, principal, secundario, anillo);
    } else {
      grafico.fillStyle?.(principal, tieneObjetivo ? 0.28 : 0.2);
      grafico.fillRect?.(-mitad, -mitad, tamano, tamano);
      grafico.lineStyle?.(1, secundario, 0.54);
      grafico.strokeRect?.(-mitad, -mitad, tamano, tamano);
      dibujarBroteFuegoCasilla(
        grafico,
        mitad,
        principal,
        secundario,
        anillo,
        esCentro,
      );
    }

    grafico.setAlpha?.(0.78);
    grafico.setScale?.(0.78);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearPulsoObjetivo({
    centro,
    perfil,
    grado = 1,
    anillo = 0,
    esObjetivoPrimario = false,
  } = {}) {
    if (!esCentroValido(centro) || !perfil) return null;
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escala = obtenerEscalaGrado(perfil, grado);
    const tile = this.compositor.obtenerTamanoCasilla?.() ?? 16;
    const factorPrimario = esObjetivoPrimario ? 1.34 : 1;
    const tamano = Math.max(11, tile * 0.72 * escala * factorPrimario);
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });

    if (perfil.efectoCasilla === "fractura_hielo") {
      grafico.fillStyle?.(principal, esObjetivoPrimario ? 0.3 : 0.2);
      grafico.fillCircle?.(0, 0, tamano * 0.44);
      grafico.lineStyle?.(esObjetivoPrimario ? 3 : 2, secundario, 0.94);
      dibujarPoligonoRadial(grafico, tamano * 0.5, 7 + anillo, 0.18);
      grafico.strokePath?.();
      dibujarCristalesRadiales(grafico, tamano * 0.72, principal, anillo);
    } else {
      grafico.fillStyle?.(principal, esObjetivoPrimario ? 0.48 : 0.32);
      grafico.fillCircle?.(0, 0, tamano * 0.58);
      grafico.fillStyle?.(secundario, esObjetivoPrimario ? 0.86 : 0.68);
      grafico.fillCircle?.(0, -tamano * 0.08, tamano * 0.24);
      grafico.lineStyle?.(esObjetivoPrimario ? 3 : 2, secundario, 0.94);
      grafico.strokeCircle?.(0, 0, tamano * 0.46);
      dibujarLlamasRadiales(grafico, tamano * 0.78, principal, secundario, anillo);
    }

    grafico.setAlpha?.(0.9);
    grafico.setScale?.(esObjetivoPrimario ? 0.72 : 0.78);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }
}

function dibujarGrietasHielo(grafico, mitad, anillo) {
  const cantidad = 5 + Math.min(3, anillo);
  for (let indice = 0; indice < cantidad; indice += 1) {
    const angulo = (Math.PI * 2 * indice) / cantidad + anillo * 0.12;
    const interior = mitad * 0.08;
    const exterior = mitad * (0.62 + (indice % 2) * 0.2);
    const x1 = Math.cos(angulo) * interior;
    const y1 = Math.sin(angulo) * interior;
    const x2 = Math.cos(angulo) * exterior;
    const y2 = Math.sin(angulo) * exterior;
    grafico.lineBetween?.(x1, y1, x2, y2);
    grafico.lineBetween?.(
      x2,
      y2,
      x2 + Math.cos(angulo + 0.72) * mitad * 0.18,
      y2 + Math.sin(angulo + 0.72) * mitad * 0.18,
    );
  }
}

function dibujarCristalesCasilla(grafico, mitad, principal, secundario, anillo) {
  const posiciones = [
    [-0.55, 0.42],
    [0.52, 0.34],
    [0.4, -0.52],
  ];
  for (let indice = 0; indice < posiciones.length; indice += 1) {
    const [px, py] = posiciones[(indice + anillo) % posiciones.length];
    const x = px * mitad;
    const y = py * mitad;
    grafico.fillStyle?.(principal, 0.58);
    grafico.lineStyle?.(1, secundario, 0.76);
    grafico.beginPath?.();
    grafico.moveTo?.(x, y - mitad * 0.25);
    grafico.lineTo?.(x + mitad * 0.12, y + mitad * 0.12);
    grafico.lineTo?.(x, y + mitad * 0.22);
    grafico.lineTo?.(x - mitad * 0.12, y + mitad * 0.12);
    grafico.closePath?.();
    grafico.fillPath?.();
    grafico.strokePath?.();
  }
}

function dibujarBroteFuegoCasilla(
  grafico,
  mitad,
  principal,
  secundario,
  anillo,
  esCentro,
) {
  const cantidad = (esCentro ? 5 : 3) + (anillo % 2);
  for (let indice = 0; indice < cantidad; indice += 1) {
    const desplazamiento =
      cantidad === 1 ? 0 : ((indice / (cantidad - 1)) - 0.5) * mitad * 1.25;
    const baseY = mitad * 0.52 - (indice % 2) * mitad * 0.12;
    const altura = mitad * (0.82 + ((indice + anillo) % 3) * 0.14);
    grafico.fillStyle?.(principal, 0.72);
    grafico.beginPath?.();
    grafico.moveTo?.(desplazamiento - mitad * 0.16, baseY);
    grafico.lineTo?.(desplazamiento, baseY - altura);
    grafico.lineTo?.(desplazamiento + mitad * 0.18, baseY);
    grafico.closePath?.();
    grafico.fillPath?.();
    grafico.fillStyle?.(secundario, 0.72);
    grafico.fillCircle?.(
      desplazamiento + mitad * 0.03,
      baseY - altura * 0.42,
      Math.max(1, mitad * 0.08),
    );
  }
  grafico.fillStyle?.(secundario, 0.62);
  grafico.fillCircle?.(-mitad * 0.55, -mitad * 0.48, 1.2);
  grafico.fillCircle?.(mitad * 0.48, -mitad * 0.22, 1);
}

function convertirColor(valor, fallback = 0xffffff) {
  if (typeof valor !== "string") return fallback;
  const normalizado = valor.trim();
  if (!normalizado.startsWith("#")) return fallback;
  const numero = Number.parseInt(normalizado.slice(1), 16);
  return Number.isFinite(numero) ? numero : fallback;
}

function obtenerEscalaGrado(perfil, grado) {
  const escalas = Array.isArray(perfil?.escalaPorGrado)
    ? perfil.escalaPorGrado
    : [];
  const indice = Math.max(0, Math.min(escalas.length - 1, Number(grado) - 1));
  return Number.isFinite(escalas[indice]) ? escalas[indice] : 1;
}

function dibujarPoligonoRadial(grafico, radio, lados, irregularidad = 0) {
  const cantidad = Math.max(3, lados);
  grafico.beginPath?.();
  for (let i = 0; i <= cantidad; i += 1) {
    const t = i / cantidad;
    const angulo = t * Math.PI * 2 - Math.PI / 2;
    const factor = i === cantidad
      ? 1
      : 1 + ((i % 2 === 0 ? 1 : -1) * irregularidad);
    const x = Math.cos(angulo) * radio * factor;
    const y = Math.sin(angulo) * radio * factor;
    if (i === 0) grafico.moveTo?.(x, y);
    else grafico.lineTo?.(x, y);
  }
}

function dibujarCristalesRadiales(grafico, radio, color, anillo = 0) {
  grafico.lineStyle?.(1.3, color, 0.84);
  const cantidad = 6 + anillo * 2;
  for (let i = 0; i < cantidad; i += 1) {
    const angulo = (Math.PI * 2 * i) / cantidad;
    const interior = radio * 0.48;
    const exterior = radio * 0.94;
    grafico.lineBetween?.(
      Math.cos(angulo) * interior,
      Math.sin(angulo) * interior,
      Math.cos(angulo) * exterior,
      Math.sin(angulo) * exterior,
    );
  }
}

function dibujarLlamasRadiales(grafico, radio, principal, secundario, anillo = 0) {
  const cantidad = 6 + anillo * 2;
  for (let i = 0; i < cantidad; i += 1) {
    const angulo = (Math.PI * 2 * i) / cantidad;
    const baseX = Math.cos(angulo) * radio * 0.4;
    const baseY = Math.sin(angulo) * radio * 0.4;
    const puntaX = Math.cos(angulo) * radio;
    const puntaY = Math.sin(angulo) * radio;
    const lateralX = Math.cos(angulo + 0.22) * radio * 0.58;
    const lateralY = Math.sin(angulo + 0.22) * radio * 0.58;

    grafico.fillStyle?.(principal, 0.3);
    grafico.beginPath?.();
    grafico.moveTo?.(baseX, baseY);
    grafico.lineTo?.(puntaX, puntaY);
    grafico.lineTo?.(lateralX, lateralY);
    grafico.closePath?.();
    grafico.fillPath?.();
    grafico.fillStyle?.(secundario, 0.48);
    grafico.fillCircle?.(puntaX * 0.88, puntaY * 0.88, 1.3);
  }
}
