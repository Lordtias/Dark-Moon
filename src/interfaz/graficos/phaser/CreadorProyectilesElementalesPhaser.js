import { esCentroValido } from "./GeometriaVisualPhaser.js";
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
      textura: perfil.textura,
    });

    grafico.setRotation?.(anguloRad);
    grafico.setAlpha?.(critico ? 1 : 0.92);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearEstela({
    elemento,
    origen,
    destino,
    critico = false,
    mano = null,
  } = {}) {
    if (!esCentroValido(origen) || !esCentroValido(destino)) return null;

    const perfil = obtenerPerfilProyectilElemental(elemento);
    if (perfil.estela !== "arcos_breves") return null;

    const grafico = this.escena.add.graphics();
    dibujarEstelaChispa({
      grafico,
      origen,
      destino,
      principal: convertirColor(perfil.colorPrincipal),
      secundario: convertirColor(perfil.colorSecundario),
      escala: (Number(perfil.escala) || 1) * (critico ? 1.2 : 1),
      signoMano: mano === "secundaria" ? -1 : 1,
    });
    grafico.setAlpha?.(critico ? 0.78 : 0.58);
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
      impacto: perfil.impacto ?? perfil.forma,
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
  textura,
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


  if (forma === "chispa_ramificada") {
    grafico.lineStyle?.(grosor, principal, 0.98);
    grafico.beginPath?.();
    grafico.moveTo?.(-mitad, 0);
    grafico.lineTo?.(-mitad * 0.35, -mitad * 0.34);
    grafico.lineTo?.(-mitad * 0.05, mitad * 0.16);
    grafico.lineTo?.(mitad * 0.28, -mitad * 0.28);
    grafico.lineTo?.(mitad, 0);
    grafico.strokePath?.();
    grafico.lineStyle?.(1.2, secundario, 0.86);
    grafico.lineBetween?.(
      -mitad * 0.08,
      mitad * 0.12,
      mitad * 0.18,
      mitad * 0.48,
    );

    if (textura === "descarga_pulsante") {
      grafico.fillStyle?.(secundario, 0.92);
      grafico.fillCircle?.(0, 0, Math.max(1, tamano * 0.08));
      grafico.lineStyle?.(1, secundario, 0.72);
      grafico.lineBetween?.(
        -mitad * 0.12,
        -mitad * 0.34,
        mitad * 0.12,
        mitad * 0.34,
      );
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
  impacto,
  principal,
  secundario,
  tamano,
  critico,
}) {
  const radio = tamano * 0.55;
  const grosor = critico ? 3 : 2;

  if (impacto === "fragmento_cristal") {
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


  if (impacto === "descarga_cruzada") {
    grafico.lineStyle?.(grosor, principal, 0.98);
    for (let indice = 0; indice < 5; indice += 1) {
      const angulo = (Math.PI * 2 * indice) / 5;
      const x = Math.cos(angulo) * radio;
      const y = Math.sin(angulo) * radio;
      grafico.beginPath?.();
      grafico.moveTo?.(0, 0);
      grafico.lineTo?.(x * 0.42, y * 0.42);
      grafico.lineTo?.(
        x * 0.68 - y * 0.12,
        y * 0.68 + x * 0.12,
      );
      grafico.lineTo?.(x, y);
      grafico.strokePath?.();
    }
    return;
  }

  if (impacto === "gota_toxica") {
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


function dibujarEstelaChispa({
  grafico,
  origen,
  destino,
  principal,
  secundario,
  escala,
  signoMano,
}) {
  const dx = destino.x - origen.x;
  const dy = destino.y - origen.y;
  const longitud = Math.hypot(dx, dy) || 1;
  const perpendicular = { x: -dy / longitud, y: dx / longitud };

  grafico.lineStyle?.(Math.max(1, 1.4 * escala), principal, 0.72);
  grafico.beginPath?.();
  grafico.moveTo?.(origen.x, origen.y);
  for (let paso = 1; paso <= 6; paso += 1) {
    const t = paso / 6;
    const alternancia = paso % 2 === 0 ? -1 : 1;
    const desvio = alternancia * signoMano * 3.2 * escala;
    grafico.lineTo?.(
      origen.x + dx * t + perpendicular.x * desvio,
      origen.y + dy * t + perpendicular.y * desvio,
    );
  }
  grafico.strokePath?.();

  grafico.lineStyle?.(1, secundario, 0.46);
  grafico.lineBetween?.(
    origen.x + dx * 0.28,
    origen.y + dy * 0.28,
    origen.x + dx * 0.36 + perpendicular.x * signoMano * 4 * escala,
    origen.y + dy * 0.36 + perpendicular.y * signoMano * 4 * escala,
  );
}

function convertirColor(valor) {
  if (typeof valor !== "string") return 0xffffff;
  const limpio = valor.trim().replace(/^#/, "");
  const numero = Number.parseInt(limpio, 16);
  return Number.isInteger(numero) ? numero : 0xffffff;
}
