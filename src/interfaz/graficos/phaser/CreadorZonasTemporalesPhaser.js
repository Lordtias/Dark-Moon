// Construye representaciones persistentes y transitorias de zonas ya resueltas.
// No consulta duración, activadores, objetivos, daño ni reglas de superposición.
export class CreadorZonasTemporalesPhaser {
  constructor({ escena, compositor } = {}) {
    if (!escena?.add?.container || !escena?.add?.graphics || !compositor) {
      throw new Error(
        "El creador de zonas temporales necesita escena y compositor.",
      );
    }
    this.escena = escena;
    this.compositor = compositor;
  }

  crearPersistente({ zona } = {}) {
    if (!esZonaValida(zona)) return null;
    const perfil = zona.perfilVisual;
    const contenedor = this.escena.add.container(0, 0);
    contenedor.__zonaTemporal = copiarZonaVisual(zona);
    contenedor.__firmaZonaTemporal = crearFirmaZona(zona);
    contenedor.__tweensZonaTemporal = [];

    for (const casilla of zona.casillas) {
      const centro = this.compositor.obtenerCentroCasilla?.(casilla);
      if (!esCentroValido(centro)) continue;
      const celda = this.crearCeldaPersistente({
        centro,
        casilla,
        perfil,
        zona,
      });
      if (celda) {
        contenedor.add(celda);
        contenedor.__tweensZonaTemporal.push(
          ...(celda.__tweensZonaTemporal ?? []),
        );
        celda.__tweensZonaTemporal = [];
      }
    }

    return contenedor;
  }

  actualizarPersistente({ objeto, zona } = {}) {
    if (!objeto || !esZonaValida(zona)) return false;
    if (objeto.__firmaZonaTemporal !== crearFirmaZona(zona)) return false;
    objeto.__zonaTemporal = copiarZonaVisual(zona);
    return true;
  }

  destruirPersistente(objeto) {
    if (!objeto) return false;
    for (const tween of objeto.__tweensZonaTemporal ?? []) {
      tween?.stop?.();
      tween?.remove?.();
    }
    objeto.__tweensZonaTemporal = [];
    objeto.destroy?.(true);
    return true;
  }

  crearDespliegue({ zona } = {}) {
    return this.crearEfectoTransitorioZona({
      zona,
      tipo: "creacion",
      alphaInicial: 0.12,
      escalaInicial: 0.58,
      intensidad: 1.15,
    });
  }

  crearPulsoRenovacion({ zona } = {}) {
    return this.crearEfectoTransitorioZona({
      zona,
      tipo: "renovacion",
      alphaInicial: 0.18,
      escalaInicial: 0.84,
      intensidad: 1.32,
    });
  }

  crearPulsoActivacion({ zona } = {}) {
    return this.crearEfectoTransitorioZona({
      zona,
      tipo: "activacion",
      alphaInicial: 0.16,
      escalaInicial: 0.9,
      intensidad: 1.18,
    });
  }

  crearEfectoTransitorioZona({
    zona,
    tipo,
    alphaInicial,
    escalaInicial,
    intensidad,
  } = {}) {
    if (!esZonaValida(zona)) return null;
    const perfil = zona.perfilVisual;
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const detalle = convertirColor(perfil.colorDetalle);
    const contenedor = this.escena.add.container(0, 0);

    for (const casilla of zona.casillas) {
      const centro = this.compositor.obtenerCentroCasilla?.(casilla);
      if (!esCentroValido(centro)) continue;
      const hash = obtenerHashCasilla(casilla.x, casilla.y, zona.id);
      const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });
      const radio = 9 + (hash % 4);

      grafico.fillStyle?.(principal, 0.18 * intensidad);
      grafico.fillEllipse?.(0, 3, radio * 1.8, radio * 0.92);
      grafico.fillStyle?.(secundario, 0.22 * intensidad);
      grafico.fillCircle?.(-radio * 0.35, -1, radio * 0.38);
      grafico.fillCircle?.(radio * 0.28, -3, radio * 0.31);
      grafico.fillStyle?.(detalle, 0.42 * intensidad);
      const cantidad = Math.max(2, Math.min(6, perfil.densidad + 1));
      for (let indice = 0; indice < cantidad; indice += 1) {
        const angulo = ((hash + indice * 71) % 360) * (Math.PI / 180);
        const distancia = 3 + ((hash >>> (indice % 8)) % 7);
        grafico.fillCircle?.(
          Math.cos(angulo) * distancia,
          Math.sin(angulo) * distancia - 2,
          Math.max(1, perfil.tamanoParticulaPx * (0.65 + (indice % 3) * 0.16)),
        );
      }
      grafico.setAlpha?.(alphaInicial);
      grafico.setScale?.(escalaInicial);
      grafico.__tipoEfectoZona = tipo;
      contenedor.add(grafico);
    }

    this.compositor.agregarEfectoTemporal?.(contenedor);
    return contenedor;
  }

  crearCeldaPersistente({ centro, casilla, perfil, zona }) {
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const detalle = convertirColor(perfil.colorDetalle);
    const hash = obtenerHashCasilla(casilla.x, casilla.y, zona.id);
    const celda = this.escena.add.container(centro.x, centro.y);
    const mancha = this.escena.add.graphics();
    const vapor = this.escena.add.graphics();
    const particulas = this.escena.add.graphics();

    dibujarManchaBase({
      grafico: mancha,
      principal,
      secundario,
      hash,
      opacidad: perfil.opacidadBase,
    });
    dibujarVapor({
      grafico: vapor,
      principal,
      secundario,
      hash,
      altura: perfil.alturaVaporPx,
      opacidad: perfil.opacidadBase,
    });
    dibujarParticulas({
      grafico: particulas,
      color: detalle,
      hash,
      cantidad: perfil.densidad,
      tamano: perfil.tamanoParticulaPx,
      opacidad: perfil.opacidadBase,
    });

    celda.add([mancha, vapor, particulas]);
    celda.__casillaZonaTemporal = { x: casilla.x, y: casilla.y };

    const duracion = Math.max(500, Number(perfil.duracionAmbientalMs) || 1800);
    const retraso = hash % 360;
    const tweenVapor = this.escena.tweens.add({
      targets: vapor,
      y: -Math.max(1.5, perfil.alturaVaporPx * 0.22),
      scaleX: 1.05,
      scaleY: 1.12,
      alpha: Math.min(0.9, perfil.opacidadBase + 0.18),
      duration: duracion + (hash % 280),
      delay: retraso,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    const tweenParticulas = this.escena.tweens.add({
      targets: particulas,
      y: -Math.max(2, perfil.alturaVaporPx * 0.38),
      angle: hash % 2 === 0 ? 6 : -6,
      alpha: Math.min(1, perfil.opacidadBase + 0.28),
      duration: Math.max(450, duracion * 0.78 + (hash % 190)),
      delay: retraso + 90,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    celda.__tweensZonaTemporal = [tweenVapor, tweenParticulas];
    return celda;
  }
}

function dibujarManchaBase({
  grafico,
  principal,
  secundario,
  hash,
  opacidad,
}) {
  grafico.fillStyle?.(principal, opacidad * 0.34);
  grafico.fillEllipse?.(0, 5, 24 + (hash % 5), 12 + (hash % 3));
  grafico.fillStyle?.(secundario, opacidad * 0.18);
  grafico.fillEllipse?.(-5, 3, 13, 7);
  grafico.fillEllipse?.(6, 6, 11, 6);
  grafico.lineStyle?.(1, secundario, opacidad * 0.26);
  grafico.strokeEllipse?.(0, 5, 25, 13);
}

function dibujarVapor({
  grafico,
  principal,
  secundario,
  hash,
  altura,
  opacidad,
}) {
  const desplazamiento = (hash % 5) - 2;
  grafico.fillStyle?.(principal, opacidad * 0.52);
  grafico.fillEllipse?.(-6 + desplazamiento, 0, 12, altura);
  grafico.fillEllipse?.(3 + desplazamiento, -2, 15, altura + 2);
  grafico.fillEllipse?.(8 - desplazamiento, 2, 10, Math.max(5, altura - 1));
  grafico.fillStyle?.(secundario, opacidad * 0.2);
  grafico.fillEllipse?.(0, -3, 12, Math.max(4, altura * 0.62));
}

function dibujarParticulas({
  grafico,
  color,
  hash,
  cantidad,
  tamano,
  opacidad,
}) {
  grafico.fillStyle?.(color, Math.min(0.86, opacidad + 0.22));
  for (let indice = 0; indice < cantidad; indice += 1) {
    const angulo = ((hash + indice * 83) % 360) * (Math.PI / 180);
    const distancia = 4 + ((hash >>> (indice % 10)) % 7);
    const radio = Math.max(0.8, tamano * (0.48 + (indice % 3) * 0.17));
    grafico.fillCircle?.(
      Math.cos(angulo) * distancia,
      Math.sin(angulo) * distancia - 3,
      radio,
    );
    if (indice % 2 === 0) {
      grafico.lineStyle?.(1, color, Math.min(0.72, opacidad + 0.08));
      grafico.strokeCircle?.(
        Math.cos(angulo) * distancia,
        Math.sin(angulo) * distancia - 3,
        radio + 1,
      );
    }
  }
}

function esZonaValida(zona) {
  return (
    zona &&
    typeof zona.id === "string" &&
    zona.id !== "" &&
    Array.isArray(zona.casillas) &&
    zona.perfilVisual &&
    typeof zona.perfilVisual === "object"
  );
}

function esCentroValido(centro) {
  return Number.isFinite(centro?.x) && Number.isFinite(centro?.y);
}

function convertirColor(valor, fallback = 0xffffff) {
  if (typeof valor !== "string" || !valor.startsWith("#")) return fallback;
  const numero = Number.parseInt(valor.slice(1), 16);
  return Number.isFinite(numero) ? numero : fallback;
}

function crearFirmaZona(zona) {
  const casillas = zona.casillas
    .map(({ x, y }) => `${x}:${y}`)
    .sort()
    .join("|");
  return [zona.id, zona.apariencia ?? "generica", casillas].join("::");
}

function copiarZonaVisual(zona) {
  return {
    ...zona,
    casillas: zona.casillas.map(({ x, y }) => ({ x, y })),
  };
}

function obtenerHashCasilla(x, y, idZona = "zona") {
  let hash = 2166136261;
  const texto = `${idZona}:${x}:${y}`;
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
