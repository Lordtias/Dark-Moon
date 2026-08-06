// Construye formas transitorias para habilidades ya resueltas. No consulta
// catálogos jugables ni interpreta daño, objetivos, resistencias o tiempo.
export class CreadorEfectosHabilidadesPhaser {
  constructor({ escena, compositor } = {}) {
    if (!escena?.add?.graphics || !compositor) {
      throw new Error(
        "El creador de efectos de habilidades necesita escena y compositor.",
      );
    }
    this.escena = escena;
    this.compositor = compositor;
  }

  crearConjuracion({ centro, perfil, grado = 1 } = {}) {
    if (!esCentroValido(centro) || !perfil) return null;
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escala = obtenerEscalaGrado(perfil, grado);
    const radio = 7 * escala;
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });

    grafico.lineStyle?.(2, principal, 0.82);
    grafico.strokeCircle?.(0, 0, radio);
    grafico.lineStyle?.(1, secundario, 0.66);
    grafico.strokeCircle?.(0, 0, radio * 0.58);
    dibujarGlifoConjuracion({
      grafico,
      forma: perfil.forma,
      principal,
      secundario,
      radio,
    });
    grafico.setAlpha?.(0.18);
    grafico.setScale?.(0.72);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearProyectil({
    centro,
    destino = null,
    perfil,
    grado = 1,
    anguloRad = 0,
    critico = false,
  } = {}) {
    if (!esCentroValido(centro) || !perfil || !Number.isFinite(anguloRad)) {
      return null;
    }

    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escalaGrado = obtenerEscalaGrado(perfil, grado);
    const tamano =
      (Number(perfil.tamanoVisualPx) || 14) *
      escalaGrado *
      (critico ? 1.18 : 1);
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });

    dibujarFormaHabilidad({
      grafico,
      forma: perfil.forma,
      principal,
      secundario,
      tamano,
      critico,
      centro,
      destino,
    });
    dibujarTexturaHabilidad({
      grafico,
      textura: perfil.textura,
      principal,
      secundario,
      tamano,
    });
    if (perfil.forma !== "rayo_zigzag") {
      grafico.setRotation?.(anguloRad);
    }
    grafico.setAlpha?.(critico ? 1 : 0.94);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearEstela({ origen, destino, perfil, grado = 1 } = {}) {
    if (!esCentroValido(origen) || !esCentroValido(destino) || !perfil) {
      return null;
    }
    if (perfil.estela === "ramificada") return null;

    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escala = obtenerEscalaGrado(perfil, grado);
    const grafico = this.escena.add.graphics();

    dibujarEstelaHabilidad({
      grafico,
      estela: perfil.estela,
      origen,
      destino,
      principal,
      secundario,
      escala,
    });
    grafico.setAlpha?.(0.54);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearImpacto({
    centro,
    perfil,
    grado = 1,
    critico = false,
    intensidadVisual = null,
  } = {}) {
    if (!esCentroValido(centro) || !perfil) return null;
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const escalaGrado = obtenerEscalaGrado(perfil, grado);
    const tamano =
      (Number(perfil.tamanoVisualPx) || 14) *
      escalaGrado *
      (critico ? 1.25 : 1);
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });

    dibujarImpactoHabilidad({
      grafico,
      impacto: perfil.impacto,
      principal,
      secundario,
      tamano,
      critico,
      intensidadVisual,
    });
    grafico.setAlpha?.(0.96);
    grafico.setScale?.(0.62);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }
}

function dibujarGlifoConjuracion({
  grafico,
  forma,
  principal,
  secundario,
  radio,
}) {
  if (forma === "esquirla_alargada") {
    grafico.lineStyle?.(1.5, secundario, 0.9);
    grafico.lineBetween?.(0, -radio, 0, radio);
    grafico.lineBetween?.(-radio * 0.45, 0, radio * 0.45, 0);
    return;
  }
  if (forma === "rayo_zigzag") {
    grafico.lineStyle?.(1.5, secundario, 0.92);
    grafico.beginPath?.();
    grafico.moveTo?.(-radio * 0.65, -radio * 0.2);
    grafico.lineTo?.(-radio * 0.08, -radio * 0.55);
    grafico.lineTo?.(radio * 0.08, 0);
    grafico.lineTo?.(radio * 0.68, radio * 0.2);
    grafico.strokePath?.();
    return;
  }
  if (forma === "masa_corrosiva") {
    grafico.fillStyle?.(principal, 0.72);
    grafico.fillCircle?.(-radio * 0.38, radio * 0.16, radio * 0.28);
    grafico.fillCircle?.(radio * 0.24, -radio * 0.24, radio * 0.2);
    grafico.lineStyle?.(1.2, secundario, 0.82);
    grafico.strokeCircle?.(radio * 0.08, radio * 0.08, radio * 0.24);
    return;
  }
  if (forma === "aguijon_viscoso") {
    grafico.fillStyle?.(principal, 0.74);
    grafico.fillCircle?.(-radio * 0.32, radio * 0.1, 2);
    grafico.fillCircle?.(radio * 0.34, -radio * 0.18, 1.5);
    return;
  }
  grafico.fillStyle?.(principal, 0.78);
  for (let indice = 0; indice < 4; indice += 1) {
    const angulo = (Math.PI * 2 * indice) / 4;
    grafico.fillCircle?.(
      Math.cos(angulo) * radio * 0.72,
      Math.sin(angulo) * radio * 0.72,
      1.5,
    );
  }
}

function dibujarFormaHabilidad({
  grafico,
  forma,
  principal,
  secundario,
  tamano,
  critico,
  centro,
  destino,
}) {
  const mitad = tamano / 2;
  const grosor = critico ? 3 : 2;

  if (forma === "esquirla_alargada") {
    grafico.fillStyle?.(principal, 0.88);
    grafico.lineStyle?.(grosor, secundario, 0.96);
    grafico.beginPath?.();
    grafico.moveTo?.(mitad, 0);
    grafico.lineTo?.(-mitad * 0.42, mitad * 0.34);
    grafico.lineTo?.(-mitad, 0);
    grafico.lineTo?.(-mitad * 0.42, -mitad * 0.34);
    grafico.closePath?.();
    grafico.fillPath?.();
    grafico.strokePath?.();
    grafico.lineStyle?.(1, secundario, 0.68);
    grafico.lineBetween?.(-mitad * 0.3, 0, mitad * 0.65, 0);
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
      const offset =
        indice === 0 || indice === segmentos
          ? 0
          : (indice % 2 === 0 ? -1 : 1) * amplitud;
      const x = baseX + px * offset;
      const y = baseY + py * offset;
      if (indice === 0) grafico.moveTo?.(x, y);
      else grafico.lineTo?.(x, y);
    }
    grafico.strokePath?.();

    if (critico) {
      grafico.lineStyle?.(1.5, secundario, 0.78);
      grafico.beginPath?.();
      for (let indice = 0; indice <= segmentos; indice += 1) {
        const t = indice / segmentos;
        const baseX = dx * t;
        const baseY = dy * t;
        const offset =
          indice === 0 || indice === segmentos
            ? 0
            : (indice % 2 === 0 ? 1 : -1) * amplitud * 0.65;
        const x = baseX + px * offset;
        const y = baseY + py * offset;
        if (indice === 0) grafico.moveTo?.(x, y);
        else grafico.lineTo?.(x, y);
      }
      grafico.strokePath?.();
    }
    return;
  }

  if (forma === "masa_corrosiva") {
    grafico.fillStyle?.(principal, 0.94);
    grafico.fillCircle?.(mitad * 0.08, 0, mitad * 0.72);
    grafico.fillCircle?.(-mitad * 0.48, mitad * 0.25, mitad * 0.42);
    grafico.fillCircle?.(-mitad * 0.52, -mitad * 0.26, mitad * 0.36);
    grafico.fillCircle?.(mitad * 0.38, -mitad * 0.2, mitad * 0.3);
    grafico.fillStyle?.(secundario, 0.72);
    grafico.fillCircle?.(mitad * 0.16, -mitad * 0.12, mitad * 0.24);
    grafico.lineStyle?.(grosor, secundario, 0.82);
    grafico.strokeCircle?.(mitad * 0.06, 0, mitad * 0.7);
    grafico.fillStyle?.(principal, 0.66);
    grafico.fillCircle?.(-mitad * 1.08, mitad * 0.42, mitad * 0.16);
    grafico.fillCircle?.(-mitad * 1.26, -mitad * 0.18, mitad * 0.11);
    return;
  }

  if (forma === "aguijon_viscoso") {
    grafico.fillStyle?.(principal, 0.9);
    grafico.lineStyle?.(grosor, secundario, 0.88);
    grafico.beginPath?.();
    grafico.moveTo?.(mitad, 0);
    grafico.lineTo?.(-mitad * 0.62, mitad * 0.24);
    grafico.lineTo?.(-mitad, 0);
    grafico.lineTo?.(-mitad * 0.62, -mitad * 0.24);
    grafico.closePath?.();
    grafico.fillPath?.();
    grafico.strokePath?.();
    grafico.fillStyle?.(secundario, 0.76);
    grafico.fillCircle?.(-mitad * 0.86, mitad * 0.38, mitad * 0.12);
    grafico.fillCircle?.(-mitad * 1.18, -mitad * 0.18, mitad * 0.08);
    return;
  }

  // Ascua: masa irregular, más grande y concentrada que un ataque de varita.
  grafico.fillStyle?.(principal, 0.94);
  grafico.fillCircle?.(mitad * 0.06, 0, mitad * 0.62);
  grafico.fillStyle?.(secundario, 0.96);
  grafico.fillCircle?.(mitad * 0.18, -mitad * 0.13, mitad * 0.28);
  grafico.fillStyle?.(principal, 0.68);
  grafico.beginPath?.();
  grafico.moveTo?.(-mitad * 0.28, -mitad * 0.18);
  grafico.lineTo?.(-mitad * 1.18, -mitad * 0.48);
  grafico.lineTo?.(-mitad * 0.76, mitad * 0.12);
  grafico.lineTo?.(-mitad * 1.35, mitad * 0.4);
  grafico.lineTo?.(-mitad * 0.24, mitad * 0.24);
  grafico.closePath?.();
  grafico.fillPath?.();
}

function dibujarTexturaHabilidad({
  grafico,
  textura,
  principal,
  secundario,
  tamano,
}) {
  const mitad = tamano / 2;
  if (textura === "cristal_facetado") {
    grafico.lineStyle?.(1, secundario, 0.78);
    grafico.lineBetween?.(-mitad * 0.45, -mitad * 0.16, mitad * 0.46, 0);
    grafico.lineBetween?.(-mitad * 0.3, mitad * 0.18, mitad * 0.28, 0);
    return;
  }
  if (textura === "toxina_burbujeante") {
    grafico.lineStyle?.(1.2, secundario, 0.86);
    grafico.strokeCircle?.(
      -mitad * 0.24,
      -mitad * 0.18,
      Math.max(1.2, tamano * 0.09),
    );
    grafico.strokeCircle?.(
      mitad * 0.18,
      mitad * 0.12,
      Math.max(1, tamano * 0.07),
    );
    grafico.strokeCircle?.(
      -mitad * 0.02,
      mitad * 0.34,
      Math.max(0.8, tamano * 0.055),
    );
    grafico.fillStyle?.(secundario, 0.7);
    grafico.fillCircle?.(
      mitad * 0.32,
      -mitad * 0.2,
      Math.max(0.8, tamano * 0.05),
    );
    return;
  }
  if (textura === "toxina_densa") {
    grafico.fillStyle?.(secundario, 0.66);
    grafico.fillCircle?.(-mitad * 0.38, -mitad * 0.12, Math.max(1, tamano * 0.07));
    grafico.fillCircle?.(-mitad * 0.12, mitad * 0.16, Math.max(0.8, tamano * 0.05));
    return;
  }
  if (textura === "llama_irregular") {
    grafico.fillStyle?.(secundario, 0.72);
    grafico.fillCircle?.(mitad * 0.12, -mitad * 0.08, Math.max(1, tamano * 0.09));
    grafico.fillStyle?.(principal, 0.58);
    grafico.fillCircle?.(-mitad * 0.58, -mitad * 0.25, Math.max(0.8, tamano * 0.06));
  }
}

function dibujarEstelaHabilidad({
  grafico,
  estela,
  origen,
  destino,
  principal,
  secundario,
  escala,
}) {
  const dx = destino.x - origen.x;
  const dy = destino.y - origen.y;
  const longitud = Math.hypot(dx, dy) || 1;
  const perpendicular = { x: -dy / longitud, y: dx / longitud };



  for (let paso = 1; paso <= 7; paso += 1) {
    const t = paso / 8;
    const alternancia = paso % 2 === 0 ? -1 : 1;
    const x = origen.x + dx * t + perpendicular.x * alternancia * 2.2 * escala;
    const y = origen.y + dy * t + perpendicular.y * alternancia * 2.2 * escala;

    if (estela === "polvo_helado") {
      grafico.lineStyle?.(1, secundario, 0.7);
      const radio = (1.4 + (paso % 3) * 0.45) * escala;
      grafico.lineBetween?.(x - radio, y, x + radio, y);
      grafico.lineBetween?.(x, y - radio, x, y + radio);
    } else if (estela === "gotas_corrosivas") {
      const radio = (1.7 + (paso % 3) * 0.55) * escala;
      grafico.fillStyle?.(paso % 2 === 0 ? secundario : principal, 0.74);
      grafico.fillCircle?.(x, y + (paso % 3) * 1.2, radio);
      grafico.lineStyle?.(0.8, secundario, 0.48);
      grafico.strokeCircle?.(x, y + (paso % 3) * 1.2, radio * 1.28);
      if (paso % 2 === 1) {
        grafico.fillCircle?.(
          x - perpendicular.x * radio * 1.5,
          y - perpendicular.y * radio * 1.5,
          radio * 0.46,
        );
      }
    } else if (estela === "gotas_toxicas") {
      grafico.fillStyle?.(paso % 2 === 0 ? secundario : principal, 0.64);
      grafico.fillCircle?.(x, y + paso % 3, (1.2 + (paso % 2) * 0.6) * escala);
    } else {
      grafico.fillStyle?.(paso % 2 === 0 ? secundario : principal, 0.62);
      grafico.fillCircle?.(x, y - (paso % 3) * 1.4, (1 + (paso % 3) * 0.35) * escala);
    }
  }
}

function dibujarImpactoHabilidad({
  grafico,
  impacto,
  principal,
  secundario,
  tamano,
  critico,
  intensidadVisual = null,
}) {
  const radio = tamano * 0.58;
  const grosor = critico ? 3 : 2;

  if (impacto === "corrosion_expansiva") {
    const intensidad = limitarEntero(
      intensidadVisual?.intensidad,
      1,
      Math.max(1, Number(intensidadVisual?.maximo) || 1),
    );
    const maximo = Math.max(intensidad, Number(intensidadVisual?.maximo) || 1);
    const progreso = maximo > 1 ? (intensidad - 1) / (maximo - 1) : 0;
    const radioCorrosion = radio * (1 + progreso * 0.2);
    const cantidadSalpicaduras = 7 + intensidad * 2;
    const cantidadBurbujas = 2 + intensidad * 2;

    grafico.fillStyle?.(principal, 0.5 + progreso * 0.12);
    grafico.fillCircle?.(0, 0, radioCorrosion * 0.62);
    grafico.fillCircle?.(
      -radioCorrosion * 0.34,
      radioCorrosion * 0.18,
      radioCorrosion * 0.32,
    );
    grafico.fillCircle?.(
      radioCorrosion * 0.3,
      -radioCorrosion * 0.22,
      radioCorrosion * 0.28,
    );
    grafico.lineStyle?.(grosor, secundario, 0.9);
    grafico.strokeCircle?.(0, 0, radioCorrosion * 0.88);

    for (let indice = 0; indice < cantidadSalpicaduras; indice += 1) {
      const angulo = (Math.PI * 2 * indice) / cantidadSalpicaduras;
      const alternancia = indice % 3;
      const distancia = radioCorrosion * (0.82 + alternancia * 0.18);
      const radioGota =
        (1.25 + (indice % 2) * 0.55) * (1 + progreso * 0.28);
      grafico.fillStyle?.(
        indice % 2 === 0 ? principal : secundario,
        0.76,
      );
      grafico.fillCircle?.(
        Math.cos(angulo) * distancia,
        Math.sin(angulo) * distancia,
        radioGota,
      );
    }

    grafico.lineStyle?.(1.1, secundario, 0.78);
    for (let indice = 0; indice < cantidadBurbujas; indice += 1) {
      const angulo = (Math.PI * 2 * indice) / cantidadBurbujas + 0.35;
      const distancia = radioCorrosion * (0.18 + (indice % 3) * 0.16);
      const radioBurbuja = 1.1 + (indice % 2) * 0.65 + progreso * 0.5;
      grafico.strokeCircle?.(
        Math.cos(angulo) * distancia,
        Math.sin(angulo) * distancia,
        radioBurbuja,
      );
    }

    if (intensidadVisual?.alcanzoMaximo === true) {
      grafico.lineStyle?.(1.4, secundario, 0.68);
      grafico.strokeCircle?.(0, 0, radioCorrosion * 1.2);
    }
    return;
  }

  if (impacto === "fractura_radial") {
    grafico.lineStyle?.(grosor, secundario, 0.96);
    for (let indice = 0; indice < 7; indice += 1) {
      const angulo = (Math.PI * 2 * indice) / 7;
      grafico.lineBetween?.(
        Math.cos(angulo) * radio * 0.18,
        Math.sin(angulo) * radio * 0.18,
        Math.cos(angulo) * radio,
        Math.sin(angulo) * radio,
      );
    }
    return;
  }


  if (impacto === "descarga_zigzag") {
    grafico.lineStyle?.(grosor, principal, 0.95);
    for (let indice = 0; indice < 4; indice += 1) {
      const angulo = (Math.PI * 2 * indice) / 4;
      const x = Math.cos(angulo) * radio;
      const y = Math.sin(angulo) * radio;
      grafico.beginPath?.();
      grafico.moveTo?.(0, 0);
      grafico.lineTo?.(x * 0.35, y * 0.35);
      grafico.lineTo?.(
        x * 0.6 - y * 0.14,
        y * 0.6 + x * 0.14,
      );
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

  if (impacto === "salpicadura_punzante") {
    grafico.fillStyle?.(principal, 0.72);
    for (let indice = 0; indice < 6; indice += 1) {
      const angulo = (Math.PI * 2 * indice) / 6;
      const distancia = indice % 2 === 0 ? radio : radio * 0.62;
      grafico.fillCircle?.(
        Math.cos(angulo) * distancia,
        Math.sin(angulo) * distancia,
        indice % 2 === 0 ? 2 : 1.4,
      );
    }
    grafico.lineStyle?.(grosor, secundario, 0.86);
    grafico.lineBetween?.(-radio * 0.72, 0, radio * 0.72, 0);
    return;
  }

  grafico.fillStyle?.(principal, 0.48);
  grafico.fillCircle?.(0, 0, radio * 0.56);
  grafico.lineStyle?.(grosor, secundario, 0.94);
  grafico.strokeCircle?.(0, 0, radio);
  for (let indice = 0; indice < 8; indice += 1) {
    const angulo = (Math.PI * 2 * indice) / 8;
    grafico.lineBetween?.(
      Math.cos(angulo) * radio * 0.62,
      Math.sin(angulo) * radio * 0.62,
      Math.cos(angulo) * radio * 1.16,
      Math.sin(angulo) * radio * 1.16,
    );
  }
}

function limitarEntero(valor, minimo, maximo) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return minimo;
  return Math.max(minimo, Math.min(maximo, Math.round(numero)));
}

function obtenerEscalaGrado(perfil, grado) {
  const escalas = Array.isArray(perfil?.escalaPorGrado)
    ? perfil.escalaPorGrado
    : [1];
  const indice = Math.max(0, Math.min(escalas.length - 1, (grado || 1) - 1));
  return Number(escalas[indice]) || 1;
}

function convertirColor(valor) {
  if (typeof valor !== "string") return 0xffffff;
  const numero = Number.parseInt(valor.replace(/^#/, ""), 16);
  return Number.isInteger(numero) ? numero : 0xffffff;
}

function esCentroValido(centro) {
  return Number.isFinite(centro?.x) && Number.isFinite(centro?.y);
}
