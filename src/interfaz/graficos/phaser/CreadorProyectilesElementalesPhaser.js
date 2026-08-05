import { obtenerPerfilProyectilElemental } from "../ContextoPerfilesAtaquePorFamilia.js";

// Construye formas mágicas temporales para ataques básicos de varita. No
// interpreta daño, Maná, resistencias ni habilidades: recibe el elemento y el
// resultado ya resueltos por la capa canónica.
export class CreadorProyectilesElementalesPhaser {
  constructor({ escena, compositor } = {}) {
    if (!escena?.add?.graphics || !compositor) {
      throw new Error(
        "El creador de proyectiles elementales necesita escena y compositor.",
      );
    }
    this.escena = escena;
    this.compositor = compositor;
  }

  crearProyectil({
    elemento,
    centro,
    destino = null,
    anguloRad = 0,
    critico = false,
    mano = null,
  } = {}) {
    if (!esCentroValido(centro) || !Number.isFinite(anguloRad)) return null;

    const perfil = obtenerPerfilProyectilElemental(elemento);
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escala = (Number(perfil.escala) || 1) * (critico ? 1.25 : 1);
    const tamano = (Number(perfil.tamanoVisualPx) || 12) * escala;
    const signoMano = mano === "secundaria" ? -1 : 1;

    dibujarProyectil({
      grafico,
      forma: perfil.forma,
      principal,
      secundario,
      tamano,
      critico,
      signoMano,
      centro,
      destino,
    });

    if (perfil.forma !== "rayo_zigzag") {
      grafico.setRotation?.(anguloRad);
    }
    grafico.setAlpha?.(critico ? 1 : 0.92);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearCanalizacion({ centro, elementos = [], criticos = [] } = {}) {
    if (!esCentroValido(centro) || !Array.isArray(elementos)) return null;
    const validos = elementos.filter((elemento) => typeof elemento === "string");
    if (validos.length === 0) return null;

    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });
    const radio = validos.length > 1 ? 8 : 6;

    validos.forEach((elemento, indice) => {
      const perfil = obtenerPerfilProyectilElemental(elemento);
      const color = convertirColor(perfil.colorPrincipal);
      const angulo = validos.length === 1
        ? -Math.PI / 2
        : -Math.PI / 2 + (Math.PI * 2 * indice) / validos.length;
      const x = Math.cos(angulo) * radio;
      const y = Math.sin(angulo) * radio;
      const esCritico = criticos[indice] === true;
      grafico.fillStyle?.(color, esCritico ? 0.92 : 0.72);
      grafico.fillCircle?.(x, y, esCritico ? 3 : 2);
    });

    grafico.lineStyle?.(1, 0xffffff, 0.28);
    grafico.strokeCircle?.(0, 0, radio + 2);
    grafico.setAlpha?.(0.35);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearImpacto({ elemento, centro, critico = false } = {}) {
    if (!esCentroValido(centro)) return null;
    const perfil = obtenerPerfilProyectilElemental(elemento);
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escala = critico ? 1.35 : 1;
    const tamano = (Number(perfil.tamanoVisualPx) || 12) * escala;

    dibujarImpacto({
      grafico,
      forma: perfil.forma,
      principal,
      secundario,
      tamano,
      critico,
    });

    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }
}

function dibujarProyectil({
  grafico,
  forma,
  principal,
  secundario,
  tamano,
  critico,
  signoMano,
  centro,
  destino,
}) {
  const mitad = tamano / 2;
  const grosor = critico ? 3 : 2;

  if (forma === "fragmento_cristal") {
    grafico.fillStyle?.(principal, 0.9);
    grafico.lineStyle?.(grosor, secundario, 0.95);
    grafico.beginPath?.();
    grafico.moveTo?.(mitad, 0);
    grafico.lineTo?.(-mitad * 0.45, mitad * 0.42);
    grafico.lineTo?.(-mitad, 0);
    grafico.lineTo?.(-mitad * 0.45, -mitad * 0.42);
    grafico.closePath?.();
    grafico.fillPath?.();
    grafico.strokePath?.();
    grafico.lineBetween?.(-mitad, 0, -mitad * 1.55, 0);
    return;
  }

  if (forma === "rayo_zigzag") {
    const dx = Number.isFinite(destino?.x) ? destino.x - centro.x : tamano * 1.6;
    const dy = Number.isFinite(destino?.y) ? destino.y - centro.y : 0;
    const longitud = Math.max(12, Math.hypot(dx, dy));
    const ux = longitud > 0 ? dx / longitud : 1;
    const uy = longitud > 0 ? dy / longitud : 0;
    const px = -uy;
    const py = ux;
    const amplitud = critico ? 2.4 : 1.6;
    const segmentos = 6;
    grafico.lineStyle?.(critico ? 3 : 2, principal, 0.96);
    grafico.beginPath?.();
    for (let indice = 0; indice <= segmentos; indice += 1) {
      const t = indice / segmentos;
      const baseX = dx * t;
      const baseY = dy * t;
      const offset = indice === 0 || indice === segmentos
        ? 0
        : ((indice % 2 === 0 ? -1 : 1) * amplitud * (1 + (critico ? 0.12 : 0)));
      const x = baseX + px * offset;
      const y = baseY + py * offset;
      if (indice === 0) {
        grafico.moveTo?.(x, y);
      } else {
        grafico.lineTo?.(x, y);
      }
    }
    grafico.strokePath?.();
    if (critico) {
      grafico.lineStyle?.(1.5, secundario, 0.78);
      grafico.beginPath?.();
      for (let indice = 0; indice <= segmentos; indice += 1) {
        const t = indice / segmentos;
        const baseX = dx * t;
        const baseY = dy * t;
        const offset = indice === 0 || indice === segmentos ? 0 : ((indice % 2 === 0 ? 1 : -1) * amplitud * 0.65);
        const x = baseX + px * offset;
        const y = baseY + py * offset;
        if (indice === 0) grafico.moveTo?.(x, y);
        else grafico.lineTo?.(x, y);
      }
      grafico.strokePath?.();
    }
    return;
  }

  if (forma === "gota_toxica") {
    grafico.fillStyle?.(principal, 0.92);
    grafico.beginPath?.();
    grafico.moveTo?.(mitad * 0.8, 0);
    grafico.lineTo?.(0, mitad * 0.52);
    grafico.lineTo?.(-mitad * 0.95, 0);
    grafico.lineTo?.(-mitad * 0.2, -mitad * 0.42);
    grafico.closePath?.();
    grafico.fillPath?.();
    grafico.fillStyle?.(secundario, 0.86);
    grafico.fillCircle?.(mitad * 0.12, -mitad * 0.1, mitad * 0.18);
    grafico.fillStyle?.(principal, 0.68);
    grafico.fillCircle?.(-mitad * 0.92, signoMano * mitad * 0.22, mitad * 0.16);
    grafico.fillCircle?.(-mitad * 1.34, -signoMano * mitad * 0.08, mitad * 0.1);
    return;
  }

  // Fuego y fallback: orbe irregular con cola de brasas.
  grafico.fillStyle?.(principal, 0.92);
  grafico.fillCircle?.(mitad * 0.1, 0, mitad * 0.55);
  grafico.fillStyle?.(secundario, 0.94);
  grafico.fillCircle?.(mitad * 0.25, -mitad * 0.1, mitad * 0.25);
  grafico.fillStyle?.(principal, 0.65);
  grafico.fillCircle?.(-mitad * 0.72, signoMano * 1.5, mitad * 0.24);
  grafico.fillCircle?.(-mitad * 1.22, -signoMano * 1.2, mitad * 0.14);
}

function dibujarImpacto({
  grafico,
  forma,
  principal,
  secundario,
  tamano,
  critico,
}) {
  const radio = tamano * 0.55;
  const grosor = critico ? 3 : 2;

  if (forma === "fragmento_cristal") {
    grafico.lineStyle?.(grosor, secundario, 0.95);
    for (let indice = 0; indice < 6; indice += 1) {
      const angulo = (Math.PI * 2 * indice) / 6;
      grafico.lineBetween?.(
        0,
        0,
        Math.cos(angulo) * radio,
        Math.sin(angulo) * radio,
      );
    }
    return;
  }

  if (forma === "rayo_zigzag") {
    grafico.lineStyle?.(grosor, principal, 0.95);
    for (let indice = 0; indice < 4; indice += 1) {
      const angulo = (Math.PI * 2 * indice) / 4;
      const x = Math.cos(angulo) * radio;
      const y = Math.sin(angulo) * radio;
      grafico.beginPath?.();
      grafico.moveTo?.(0, 0);
      grafico.lineTo?.(x * 0.35, y * 0.35);
      grafico.lineTo?.(x * 0.6 - y * 0.14, y * 0.6 + x * 0.14);
      grafico.lineTo?.(x, y);
      grafico.strokePath?.();
    }
    if (critico) {
      grafico.lineStyle?.(1.5, secundario, 0.82);
      grafico.lineBetween?.(-radio * 0.8, 0, radio * 0.8, 0);
      grafico.lineBetween?.(0, -radio * 0.8, 0, radio * 0.8);
    }
    return;
  }

  if (forma === "gota_toxica") {
    grafico.fillStyle?.(principal, 0.74);
    grafico.beginPath?.();
    grafico.moveTo?.(radio * 0.48, 0);
    grafico.lineTo?.(0, radio * 0.3);
    grafico.lineTo?.(-radio * 0.52, 0);
    grafico.lineTo?.(-radio * 0.08, -radio * 0.22);
    grafico.closePath?.();
    grafico.fillPath?.();
    for (let indice = 0; indice < 4; indice += 1) {
      const angulo = (Math.PI * 2 * indice) / 4;
      grafico.fillCircle?.(
        Math.cos(angulo) * radio * 0.7,
        Math.sin(angulo) * radio * 0.7,
        radio * 0.11,
      );
    }
    return;
  }

  grafico.fillStyle?.(principal, 0.55);
  grafico.fillCircle?.(0, 0, radio * 0.58);
  grafico.lineStyle?.(grosor, secundario, 0.92);
  grafico.strokeCircle?.(0, 0, radio);
  for (let indice = 0; indice < 6; indice += 1) {
    const angulo = (Math.PI * 2 * indice) / 6;
    grafico.lineBetween?.(
      Math.cos(angulo) * radio * 0.65,
      Math.sin(angulo) * radio * 0.65,
      Math.cos(angulo) * radio * 1.18,
      Math.sin(angulo) * radio * 1.18,
    );
  }
}

function convertirColor(valor) {
  if (typeof valor !== "string") return 0xffffff;
  const limpio = valor.trim().replace(/^#/, "");
  const numero = Number.parseInt(limpio, 16);
  return Number.isInteger(numero) ? numero : 0xffffff;
}

function esCentroValido(centro) {
  return Number.isFinite(centro?.x) && Number.isFinite(centro?.y);
}
