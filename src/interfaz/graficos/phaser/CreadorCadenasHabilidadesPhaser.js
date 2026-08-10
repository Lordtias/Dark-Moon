import { esCentroValido } from "./GeometriaVisualPhaser.js";
import { limitar } from "../../../utilidades/Numeros.js";
// Construye recursos transitorios para cadenas ya resueltas. No selecciona
// objetivos, no consulta paredes y no interpreta daño o efectos temporales.
export class CreadorCadenasHabilidadesPhaser {
  constructor({ escena, compositor } = {}) {
    if (!escena?.add?.graphics || !compositor) {
      throw new Error(
        "El creador de cadenas necesita escena y compositor válidos.",
      );
    }
    this.escena = escena;
    this.compositor = compositor;
  }

  crearCarga({ centro, perfil, grado = 1 } = {}) {
    if (!esCentroValido(centro) || !perfil) return null;
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escala = obtenerEscalaGrado(perfil, grado);
    const radio = 7 * escala;
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });

    grafico.lineStyle?.(2, principal, 0.82);
    grafico.strokeCircle?.(0, 0, radio);
    grafico.lineStyle?.(1.4, secundario, 0.9);
    for (let indice = 0; indice < 6; indice += 1) {
      const angulo = (Math.PI * 2 * indice) / 6;
      const interior = radio * 0.32;
      const exterior = radio * (indice % 2 === 0 ? 1.08 : 0.86);
      grafico.lineBetween?.(
        Math.cos(angulo) * interior,
        Math.sin(angulo) * interior,
        Math.cos(angulo + 0.12) * exterior,
        Math.sin(angulo + 0.12) * exterior,
      );
    }
    grafico.fillStyle?.(secundario, 0.84);
    grafico.fillCircle?.(0, 0, Math.max(1.5, radio * 0.18));
    grafico.setAlpha?.(0.16);
    grafico.setScale?.(0.72);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearArco({
    origen,
    destino,
    perfil,
    grado = 1,
    multiplicadorVisual = 1,
    critico = false,
    primario = false,
    indiceSalto = 0,
  } = {}) {
    if (!esCentroValido(origen) || !esCentroValido(destino) || !perfil) {
      return null;
    }

    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escalaGrado = obtenerEscalaGrado(perfil, grado);
    const intensidad = limitar(
      Number.isFinite(multiplicadorVisual) ? multiplicadorVisual : 1,
      0.52,
      1.2,
    );
    const dx = destino.x - origen.x;
    const dy = destino.y - origen.y;
    const longitud = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / longitud;
    const uy = dy / longitud;
    const px = -uy;
    const py = ux;
    const amplitudBase = (primario ? 3.2 : 2.5) * escalaGrado * intensidad;
    const grosor = (primario ? 3.2 : 2.4) * intensidad * (critico ? 1.34 : 1);
    const segmentos = Math.max(6, Math.min(11, Math.round(longitud / 8)));
    const grafico = this.escena.add.graphics({ x: origen.x, y: origen.y });

    dibujarTrayectoria({
      grafico,
      dx,
      dy,
      px,
      py,
      segmentos,
      amplitud: amplitudBase,
      desfase: indiceSalto,
      color: principal,
      grosor,
      alfa: critico ? 1 : 0.94,
    });
    dibujarTrayectoria({
      grafico,
      dx,
      dy,
      px,
      py,
      segmentos,
      amplitud: amplitudBase * 0.42,
      desfase: indiceSalto + 1,
      color: secundario,
      grosor: Math.max(1, grosor * 0.42),
      alfa: 0.9,
      invertir: true,
    });
    dibujarRamas({
      grafico,
      dx,
      dy,
      ux,
      uy,
      px,
      py,
      color: principal,
      intensidad,
      indiceSalto,
      critico,
    });

    grafico.setAlpha?.(0.12);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearNucleoSalto({ origen, perfil, grado = 1, primario = false } = {}) {
    if (!esCentroValido(origen) || !perfil) return null;
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escala = obtenerEscalaGrado(perfil, grado);
    const radio = (primario ? 3.2 : 2.6) * escala;
    const grafico = this.escena.add.graphics({ x: origen.x, y: origen.y });

    grafico.fillStyle?.(principal, 0.62);
    grafico.fillCircle?.(0, 0, radio * 1.6);
    grafico.fillStyle?.(secundario, 0.98);
    grafico.fillCircle?.(0, 0, radio * 0.72);
    grafico.lineStyle?.(1.5, secundario, 0.82);
    grafico.strokeCircle?.(0, 0, radio * 1.18);
    grafico.setAlpha?.(0.18);
    grafico.setScale?.(0.72);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearImpacto({
    centro,
    perfil,
    grado = 1,
    multiplicadorVisual = 1,
    critico = false,
    primario = false,
    indiceSalto = 0,
  } = {}) {
    if (!esCentroValido(centro) || !perfil) return null;
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escalaGrado = obtenerEscalaGrado(perfil, grado);
    const intensidad = limitar(
      Number.isFinite(multiplicadorVisual) ? multiplicadorVisual : 1,
      0.55,
      1.25,
    );
    const tamano =
      (Number(perfil.tamanoVisualPx) || 18) *
      escalaGrado *
      intensidad *
      (primario ? 1.24 : 1) *
      (critico ? 1.18 : 1);
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });

    grafico.fillStyle?.(principal, primario ? 0.34 : 0.24);
    grafico.fillCircle?.(0, 0, tamano * 0.44);
    grafico.lineStyle?.(primario ? 3 : 2, principal, 0.9);
    grafico.strokeCircle?.(0, 0, tamano * 0.36);
    grafico.lineStyle?.(critico ? 2.2 : 1.5, secundario, 0.92);
    const cantidad = primario ? 8 : 6;
    for (let indice = 0; indice < cantidad; indice += 1) {
      const angulo =
        (Math.PI * 2 * indice) / cantidad + indiceSalto * 0.17;
      const interior = tamano * 0.18;
      const medio = tamano * (indice % 2 === 0 ? 0.38 : 0.31);
      const exterior = tamano * (primario ? 0.68 : 0.56);
      grafico.beginPath?.();
      grafico.moveTo?.(
        Math.cos(angulo) * interior,
        Math.sin(angulo) * interior,
      );
      grafico.lineTo?.(
        Math.cos(angulo + 0.18) * medio,
        Math.sin(angulo + 0.18) * medio,
      );
      grafico.lineTo?.(
        Math.cos(angulo - 0.08) * exterior,
        Math.sin(angulo - 0.08) * exterior,
      );
      grafico.strokePath?.();
    }
    grafico.fillStyle?.(secundario, 0.96);
    grafico.fillCircle?.(0, 0, Math.max(1.5, tamano * 0.1));
    grafico.setAlpha?.(0.18);
    grafico.setScale?.(0.68);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }
}

function dibujarTrayectoria({
  grafico,
  dx,
  dy,
  px,
  py,
  segmentos,
  amplitud,
  desfase,
  color,
  grosor,
  alfa,
  invertir = false,
}) {
  grafico.lineStyle?.(grosor, color, alfa);
  grafico.beginPath?.();
  for (let indice = 0; indice <= segmentos; indice += 1) {
    const t = indice / segmentos;
    const extremo = indice === 0 || indice === segmentos;
    const alternancia = (indice + desfase) % 2 === 0 ? -1 : 1;
    const direccion = invertir ? -alternancia : alternancia;
    const atenuacion = Math.sin(Math.PI * t);
    const offset = extremo ? 0 : direccion * amplitud * atenuacion;
    const x = dx * t + px * offset;
    const y = dy * t + py * offset;
    if (indice === 0) grafico.moveTo?.(x, y);
    else grafico.lineTo?.(x, y);
  }
  grafico.strokePath?.();
}

function dibujarRamas({
  grafico,
  dx,
  dy,
  ux,
  uy,
  px,
  py,
  color,
  intensidad,
  indiceSalto,
  critico,
}) {
  const cantidad = critico ? 4 : 3;
  grafico.lineStyle?.(Math.max(1, 1.3 * intensidad), color, 0.58);
  for (let indice = 0; indice < cantidad; indice += 1) {
    const t = (indice + 1) / (cantidad + 1);
    const signo = (indice + indiceSalto) % 2 === 0 ? 1 : -1;
    const origenX = dx * t;
    const origenY = dy * t;
    const largo = (5 + indice * 1.3) * intensidad;
    grafico.beginPath?.();
    grafico.moveTo?.(origenX, origenY);
    grafico.lineTo?.(
      origenX + px * largo * signo + ux * largo * 0.45,
      origenY + py * largo * signo + uy * largo * 0.45,
    );
    grafico.strokePath?.();
  }
}

function convertirColor(valor, fallback = 0xffffff) {
  if (typeof valor !== "string" || !valor.trim().startsWith("#")) {
    return fallback;
  }
  const numero = Number.parseInt(valor.trim().slice(1), 16);
  return Number.isFinite(numero) ? numero : fallback;
}

function obtenerEscalaGrado(perfil, grado) {
  const escalas = Array.isArray(perfil?.escalaPorGrado)
    ? perfil.escalaPorGrado
    : [];
  const indice = Math.max(0, Math.min(escalas.length - 1, Number(grado) - 1));
  return Number.isFinite(escalas[indice]) ? escalas[indice] : 1;
}
