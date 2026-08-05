const ANCLAJES_RECURSO = Object.freeze({
  CENTRO: "centro",
  INICIO: "inicio",
});

// Crea sprites temporales desde rutas ya resueltas por el dominio. No conoce
// armas, municiones ni equipamiento y puede reutilizarse para futuras capas.
export class CreadorRecursosAtaquePhaser {
  constructor({ escena, compositor, gestorRecursos } = {}) {
    if (!escena?.add?.image || !compositor || !gestorRecursos) {
      throw new Error(
        "El creador de recursos de ataque necesita escena, compositor y recursos.",
      );
    }
    this.escena = escena;
    this.compositor = compositor;
    this.gestorRecursos = gestorRecursos;
  }

  async crearSpriteTemporal({
    recursoVisual,
    centro,
    longitudVisiblePx,
    anguloRad = 0,
    orientacionBaseGrados = 0,
    anclaje = ANCLAJES_RECURSO.CENTRO,
    alpha = 1,
    tint = null,
  } = {}) {
    if (
      typeof recursoVisual !== "string" ||
      recursoVisual.trim() === "" ||
      !esCentroValido(centro) ||
      !Number.isFinite(longitudVisiblePx) ||
      longitudVisiblePx <= 0 ||
      !Number.isFinite(anguloRad) ||
      !Number.isFinite(orientacionBaseGrados)
    ) {
      return null;
    }

    const informacion = await this.gestorRecursos.obtenerInformacionAsync(
      recursoVisual,
    );
    if (!informacion) return null;

    const sprite = this.escena.add.image(
      centro.x,
      centro.y,
      informacion.claveTextura,
    );
    const limites = informacion.limitesVisibles;
    const anchoVisible = Math.max(1, limites?.ancho ?? informacion.ancho);
    const escala = longitudVisiblePx / anchoVisible;
    const origen = resolverOrigen({ anclaje, informacion });

    sprite.setOrigin?.(origen.x, origen.y);
    sprite.setDisplaySize?.(
      Math.max(1, informacion.ancho * escala),
      Math.max(1, informacion.alto * escala),
    );
    sprite.setRotation?.(
      anguloRad + (orientacionBaseGrados * Math.PI) / 180,
    );
    sprite.setAlpha?.(Math.min(1, Math.max(0, alpha)));
    if (Number.isInteger(tint) && tint >= 0) sprite.setTint?.(tint);
    this.compositor.agregarEfectoTemporal(sprite);
    return sprite;
  }
}

export { ANCLAJES_RECURSO };

function resolverOrigen({ anclaje, informacion }) {
  const ancho = Math.max(1, informacion.ancho);
  const alto = Math.max(1, informacion.alto);
  const limites = informacion.limitesVisibles;
  const centroY = limites?.centroY ?? alto / 2;
  if (anclaje === ANCLAJES_RECURSO.INICIO) {
    return Object.freeze({
      x: (limites?.minimoX ?? 0) / ancho,
      y: centroY / alto,
    });
  }
  return Object.freeze({
    x: (limites?.centroX ?? ancho / 2) / ancho,
    y: centroY / alto,
  });
}

function esCentroValido(centro) {
  return Number.isFinite(centro?.x) && Number.isFinite(centro?.y);
}
