// Construye recursos transitorios para líneas ya resueltas. Recibe el
// recorrido canónico y perfiles de presentación; no calcula dirección,
// obstáculos, daño, objetivos ni estados temporales.
export class CreadorLineasHabilidadesPhaser {
  constructor({ escena, compositor } = {}) {
    if (!escena?.add?.graphics || !compositor) {
      throw new Error(
        "El creador de líneas de habilidades necesita escena y compositor.",
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
    const tile = this.compositor.obtenerTamanoCasilla?.() ?? 16;
    const radio = Math.max(6, tile * 0.3 * escala);
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });

    if (esDescargaElectrica(perfil)) {
      grafico.lineStyle?.(2.4, principal, 0.92);
      grafico.strokeCircle?.(0, 0, radio);
      grafico.lineStyle?.(1.2, secundario, 0.96);
      for (let indice = 0; indice < 8; indice += 1) {
        const angulo = (Math.PI * 2 * indice) / 8;
        const interior = radio * 0.28;
        const exterior = radio * (indice % 2 === 0 ? 1.22 : 0.92);
        grafico.lineBetween?.(
          Math.cos(angulo) * interior,
          Math.sin(angulo) * interior,
          Math.cos(angulo + 0.12) * exterior,
          Math.sin(angulo + 0.12) * exterior,
        );
      }
      grafico.fillStyle?.(secundario, 0.98);
      grafico.fillCircle?.(0, 0, Math.max(1.8, radio * 0.2));
    } else {
      grafico.fillStyle?.(principal, 0.36);
      grafico.fillCircle?.(0, 0, radio * 1.28);
      grafico.lineStyle?.(2.2, secundario, 0.9);
      grafico.strokeCircle?.(0, 0, radio);
      dibujarLlamasCarga(grafico, radio, principal, secundario);
    }

    grafico.setAlpha?.(0.16);
    grafico.setScale?.(0.72);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearTramo({
    origen,
    destino,
    perfil,
    grado = 1,
    indice = 0,
    critico = false,
  } = {}) {
    if (!esCentroValido(origen) || !esCentroValido(destino) || !perfil) {
      return null;
    }
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escala = obtenerEscalaGrado(perfil, grado);
    const dx = destino.x - origen.x;
    const dy = destino.y - origen.y;
    const longitud = Math.max(1, Math.hypot(dx, dy));
    const px = -dy / longitud;
    const py = dx / longitud;
    const grafico = this.escena.add.graphics({ x: origen.x, y: origen.y });

    if (esDescargaElectrica(perfil)) {
      const grosor = (critico ? 4.2 : 3.2) * Math.min(1.35, escala);
      dibujarRayoQuebrado({
        grafico,
        dx,
        dy,
        px,
        py,
        color: principal,
        grosor,
        alfa: 0.94,
        amplitud: 2.8 * escala,
        indice,
      });
      dibujarRayoQuebrado({
        grafico,
        dx,
        dy,
        px,
        py,
        color: secundario,
        grosor: Math.max(1.1, grosor * 0.38),
        alfa: 0.98,
        amplitud: 1.1 * escala,
        indice: indice + 1,
        invertir: true,
      });
      dibujarRamasElectricas({
        grafico,
        dx,
        dy,
        px,
        py,
        color: principal,
        indice,
        escala,
      });
    } else {
      grafico.lineStyle?.(Math.max(4, 7 * escala), principal, 0.34);
      grafico.lineBetween?.(0, 0, dx, dy);
      grafico.lineStyle?.(Math.max(1.8, 3.2 * escala), secundario, 0.72);
      grafico.lineBetween?.(0, 0, dx, dy);
      dibujarBrasasTramo({
        grafico,
        dx,
        dy,
        px,
        py,
        principal,
        secundario,
        indice,
        escala,
      });
    }

    grafico.setAlpha?.(0.12);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearEfectoCasilla({
    centro,
    perfil,
    grado = 1,
    indice = 0,
    tieneObjetivo = false,
  } = {}) {
    if (!esCentroValido(centro) || !perfil) return null;
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escala = obtenerEscalaGrado(perfil, grado);
    const tile = this.compositor.obtenerTamanoCasilla?.() ?? 16;
    const tamano = tile * Math.min(0.94, 0.78 * escala);
    const mitad = tamano / 2;
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });

    if (esDescargaElectrica(perfil)) {
      grafico.fillStyle?.(principal, tieneObjetivo ? 0.24 : 0.15);
      grafico.fillRect?.(-mitad, -mitad, tamano, tamano);
      grafico.lineStyle?.(1.2, secundario, 0.72);
      for (let rama = 0; rama < 4; rama += 1) {
        const angulo = (Math.PI * 2 * rama) / 4 + indice * 0.21;
        grafico.beginPath?.();
        grafico.moveTo?.(0, 0);
        grafico.lineTo?.(
          Math.cos(angulo + 0.18) * mitad * 0.46,
          Math.sin(angulo + 0.18) * mitad * 0.46,
        );
        grafico.lineTo?.(
          Math.cos(angulo - 0.08) * mitad * 0.88,
          Math.sin(angulo - 0.08) * mitad * 0.88,
        );
        grafico.strokePath?.();
      }
      grafico.fillStyle?.(secundario, 0.9);
      grafico.fillCircle?.(0, 0, Math.max(1.2, mitad * 0.1));
    } else {
      grafico.fillStyle?.(principal, tieneObjetivo ? 0.3 : 0.2);
      grafico.fillRect?.(-mitad, -mitad, tamano, tamano);
      grafico.lineStyle?.(1, secundario, 0.5);
      grafico.strokeRect?.(-mitad, -mitad, tamano, tamano);
      dibujarLlamasCasilla({
        grafico,
        mitad,
        principal,
        secundario,
        indice,
        cantidad: tieneObjetivo ? 5 : 4,
      });
    }

    grafico.setAlpha?.(0.12);
    grafico.setScale?.(0.78);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearImpacto({
    centro,
    perfil,
    grado = 1,
    indice = 0,
    critico = false,
  } = {}) {
    if (!esCentroValido(centro) || !perfil) return null;
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escala = obtenerEscalaGrado(perfil, grado);
    const tamano = (Number(perfil.tamanoVisualPx) || 22) * escala;
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });

    if (esDescargaElectrica(perfil)) {
      grafico.fillStyle?.(principal, critico ? 0.44 : 0.3);
      grafico.fillCircle?.(0, 0, tamano * 0.42);
      grafico.lineStyle?.(critico ? 3.2 : 2.2, secundario, 0.98);
      for (let rama = 0; rama < (critico ? 10 : 7); rama += 1) {
        const angulo = (Math.PI * 2 * rama) / (critico ? 10 : 7) + indice * 0.11;
        const interior = tamano * 0.12;
        const exterior = tamano * (rama % 2 === 0 ? 0.68 : 0.52);
        grafico.lineBetween?.(
          Math.cos(angulo) * interior,
          Math.sin(angulo) * interior,
          Math.cos(angulo + 0.12) * exterior,
          Math.sin(angulo + 0.12) * exterior,
        );
      }
      grafico.fillStyle?.(secundario, 0.98);
      grafico.fillCircle?.(0, 0, Math.max(1.8, tamano * 0.1));
    } else {
      grafico.fillStyle?.(principal, critico ? 0.52 : 0.38);
      grafico.fillCircle?.(0, 0, tamano * 0.46);
      grafico.fillStyle?.(secundario, 0.78);
      grafico.fillCircle?.(0, -tamano * 0.08, tamano * 0.2);
      grafico.lineStyle?.(critico ? 3 : 2, secundario, 0.92);
      grafico.strokeCircle?.(0, 0, tamano * 0.38);
      dibujarLlamasImpacto(grafico, tamano, principal, secundario, indice);
    }

    grafico.setAlpha?.(0.16);
    grafico.setScale?.(0.68);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }
}

function esDescargaElectrica(perfil) {
  return (
    perfil?.efectoCasilla === "descarga_gruesa" ||
    perfil?.forma === "rayo_lineal"
  );
}

function dibujarRayoQuebrado({
  grafico,
  dx,
  dy,
  px,
  py,
  color,
  grosor,
  alfa,
  amplitud,
  indice,
  invertir = false,
}) {
  const longitud = Math.max(1, Math.hypot(dx, dy));
  const segmentos = Math.max(4, Math.min(9, Math.round(longitud / 6)));
  grafico.lineStyle?.(grosor, color, alfa);
  grafico.beginPath?.();
  for (let paso = 0; paso <= segmentos; paso += 1) {
    const t = paso / segmentos;
    const extremo = paso === 0 || paso === segmentos;
    const signo = (paso + indice) % 2 === 0 ? -1 : 1;
    const direccion = invertir ? -signo : signo;
    const offset = extremo
      ? 0
      : direccion * amplitud * Math.sin(Math.PI * t);
    const x = dx * t + px * offset;
    const y = dy * t + py * offset;
    if (paso === 0) grafico.moveTo?.(x, y);
    else grafico.lineTo?.(x, y);
  }
  grafico.strokePath?.();
}

function dibujarRamasElectricas({
  grafico,
  dx,
  dy,
  px,
  py,
  color,
  indice,
  escala,
}) {
  grafico.lineStyle?.(Math.max(1, 1.2 * escala), color, 0.58);
  for (let rama = 0; rama < 3; rama += 1) {
    const t = (rama + 1) / 4;
    const signo = (rama + indice) % 2 === 0 ? 1 : -1;
    const x = dx * t;
    const y = dy * t;
    const largo = (4.5 + rama) * escala;
    grafico.lineBetween?.(x, y, x + px * largo * signo, y + py * largo * signo);
  }
}

function dibujarBrasasTramo({
  grafico,
  dx,
  dy,
  px,
  py,
  principal,
  secundario,
  indice,
  escala,
}) {
  const cantidad = 3;
  for (let brasa = 0; brasa < cantidad; brasa += 1) {
    const t = (brasa + 1) / (cantidad + 1);
    const signo = (brasa + indice) % 2 === 0 ? 1 : -1;
    const x = dx * t + px * signo * 2.2 * escala;
    const y = dy * t + py * signo * 2.2 * escala;
    grafico.fillStyle?.(brasa % 2 === 0 ? secundario : principal, 0.82);
    grafico.fillCircle?.(x, y, Math.max(1, 1.3 * escala));
  }
}

function dibujarLlamasCarga(grafico, radio, principal, secundario) {
  for (let indice = 0; indice < 6; indice += 1) {
    const angulo = (Math.PI * 2 * indice) / 6;
    const baseX = Math.cos(angulo) * radio * 0.34;
    const baseY = Math.sin(angulo) * radio * 0.34;
    const puntaX = Math.cos(angulo - 0.12) * radio * 1.25;
    const puntaY = Math.sin(angulo - 0.12) * radio * 1.25;
    grafico.fillStyle?.(principal, 0.64);
    grafico.beginPath?.();
    grafico.moveTo?.(baseX - 2, baseY + 2);
    grafico.lineTo?.(puntaX, puntaY);
    grafico.lineTo?.(baseX + 2, baseY + 2);
    grafico.closePath?.();
    grafico.fillPath?.();
    grafico.fillStyle?.(secundario, 0.86);
    grafico.fillCircle?.(puntaX * 0.82, puntaY * 0.82, 1.2);
  }
}

function dibujarLlamasCasilla({
  grafico,
  mitad,
  principal,
  secundario,
  indice,
  cantidad,
}) {
  for (let llama = 0; llama < cantidad; llama += 1) {
    const fraccion = cantidad === 1 ? 0.5 : llama / (cantidad - 1);
    const x = (fraccion - 0.5) * mitad * 1.35;
    const baseY = mitad * 0.55 - (llama % 2) * mitad * 0.12;
    const altura = mitad * (0.72 + ((llama + indice) % 3) * 0.16);
    grafico.fillStyle?.(principal, 0.78);
    grafico.beginPath?.();
    grafico.moveTo?.(x - mitad * 0.14, baseY);
    grafico.lineTo?.(x, baseY - altura);
    grafico.lineTo?.(x + mitad * 0.16, baseY);
    grafico.closePath?.();
    grafico.fillPath?.();
    grafico.fillStyle?.(secundario, 0.72);
    grafico.fillCircle?.(x + 1, baseY - altura * 0.42, Math.max(1, mitad * 0.08));
  }
}

function dibujarLlamasImpacto(grafico, tamano, principal, secundario, indice) {
  const cantidad = 8;
  for (let llama = 0; llama < cantidad; llama += 1) {
    const angulo = (Math.PI * 2 * llama) / cantidad + indice * 0.08;
    const interior = tamano * 0.2;
    const exterior = tamano * (llama % 2 === 0 ? 0.74 : 0.58);
    grafico.fillStyle?.(principal, 0.68);
    grafico.beginPath?.();
    grafico.moveTo?.(
      Math.cos(angulo - 0.14) * interior,
      Math.sin(angulo - 0.14) * interior,
    );
    grafico.lineTo?.(
      Math.cos(angulo) * exterior,
      Math.sin(angulo) * exterior,
    );
    grafico.lineTo?.(
      Math.cos(angulo + 0.14) * interior,
      Math.sin(angulo + 0.14) * interior,
    );
    grafico.closePath?.();
    grafico.fillPath?.();
    grafico.fillStyle?.(secundario, 0.78);
    grafico.fillCircle?.(
      Math.cos(angulo) * exterior * 0.82,
      Math.sin(angulo) * exterior * 0.82,
      1.2,
    );
  }
}

function esCentroValido(centro) {
  return Number.isFinite(centro?.x) && Number.isFinite(centro?.y);
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
