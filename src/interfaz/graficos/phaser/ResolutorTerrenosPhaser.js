const TIPO_PARED = "pared";
const TIPO_SUELO = "suelo";

// Interpreta la apariencia de cada símbolo del mapa para Phaser.
//
// El resolutor es exclusivamente visual: no decide caminabilidad, ocupación,
// movimiento ni conectividad. Esas reglas continúan perteneciendo al mapa y
// a los sistemas canónicos del juego.
export class ResolutorTerrenosPhaser {
  constructor({ mapa, apariencia = {} } = {}) {
    validarMapa(mapa);

    this.mapa = mapa;
    this.apariencia = apariencia ?? {};
    this.configuracionesTerreno = normalizarObjeto(
      this.apariencia.terrenos,
    );
    this.aparienciaPhaser = normalizarObjeto(this.apariencia.phaser);
    this.configuracionesPhaserTerreno = normalizarObjeto(
      this.aparienciaPhaser.terrenos,
    );
    this.cache = new Map();
  }

  resolver(x, y) {
    const simbolo = this.mapa[y]?.[x];

    if (simbolo === undefined) {
      return null;
    }

    if (!this.cache.has(simbolo)) {
      this.cache.set(simbolo, this.crearDefinicion(simbolo));
    }

    return this.cache.get(simbolo);
  }

  esPared(x, y) {
    return this.resolver(x, y)?.esPared === true;
  }

  obtenerRutasRecursos() {
    const rutas = new Set();

    for (let y = 0; y < this.mapa.length; y++) {
      for (let x = 0; x < this.mapa[y].length; x++) {
        const terreno = this.resolver(x, y);

        for (const ruta of terreno?.recursos ?? []) {
          rutas.add(ruta);
        }

        agregarRuta(rutas, terreno?.pared?.recurso);

        for (const ruta of Object.values(terreno?.pared?.variantes ?? {})) {
          agregarRuta(rutas, ruta);
        }

        for (const ruta of terreno?.pared?.altura?.frentes ?? []) {
          agregarRuta(rutas, ruta);
        }
      }
    }

    return [...rutas];
  }

  crearDefinicion(simbolo) {
    const configuracionGeneral = normalizarObjeto(
      this.configuracionesTerreno[simbolo],
    );
    const configuracionPhaser = normalizarObjeto(
      this.configuracionesPhaserTerreno[simbolo],
    );
    const tipo = normalizarTipoTerreno(configuracionGeneral.tipo, simbolo);
    const esPared = tipo === TIPO_PARED;
    const configuracionBase = esPared
      ? normalizarObjeto(this.aparienciaPhaser.pared)
      : normalizarObjeto(this.aparienciaPhaser.suelo);
    const configuracionParedEspecifica = normalizarObjeto(
      configuracionPhaser.pared,
    );

    return Object.freeze({
      simbolo,
      tipo,
      esPared,
      color:
        normalizarColor(configuracionGeneral.color) ??
        normalizarColor(
          esPared
            ? this.apariencia.colorPared
            : this.apariencia.colorSuelo,
        ),
      detalle: normalizarTexto(configuracionGeneral.detalle),
      recursos: Object.freeze(
        normalizarListaRutas(
          configuracionPhaser.recursos ?? configuracionBase.recursos,
        ),
      ),
      pared: Object.freeze(
        crearConfiguracionPared({
          base: configuracionBase,
          especifica:
            Object.keys(configuracionParedEspecifica).length > 0
              ? configuracionParedEspecifica
              : configuracionPhaser,
        }),
      ),
      decoracion: Object.freeze({
        ...normalizarObjeto(this.aparienciaPhaser.decoracion),
        ...normalizarObjeto(configuracionPhaser.decoracion),
      }),
      opacidadGrilla: normalizarNumero(configuracionPhaser.opacidadGrilla),
    });
  }
}

function crearConfiguracionPared({ base, especifica }) {
  const variantesBase = normalizarObjeto(base.variantes);
  const variantesEspecificas = normalizarObjeto(especifica.variantes);

  return {
    recurso:
      normalizarRuta(especifica.recurso) ?? normalizarRuta(base.recurso),
    variantes: Object.freeze({
      aislado:
        normalizarRuta(variantesEspecificas.aislado) ??
        normalizarRuta(variantesBase.aislado),
      extremo:
        normalizarRuta(variantesEspecificas.extremo) ??
        normalizarRuta(variantesBase.extremo),
      recto:
        normalizarRuta(variantesEspecificas.recto) ??
        normalizarRuta(variantesBase.recto),
      esquina:
        normalizarRuta(variantesEspecificas.esquina) ??
        normalizarRuta(variantesBase.esquina),
      unionT:
        normalizarRuta(variantesEspecificas.unionT) ??
        normalizarRuta(variantesBase.unionT),
      cruce:
        normalizarRuta(variantesEspecificas.cruce) ??
        normalizarRuta(variantesBase.cruce),
      interior:
        normalizarRuta(variantesEspecificas.interior) ??
        normalizarRuta(variantesBase.interior),
    }),
    altura: Object.freeze(
      crearConfiguracionAlturaPared({
        base: normalizarObjeto(base.altura),
        especifica: normalizarObjeto(especifica.altura),
      }),
    ),
  };
}

function crearConfiguracionAlturaPared({ base, especifica }) {
  return {
    frentes: Object.freeze(
      normalizarListaRutas(especifica.frentes ?? base.frentes),
    ),
    altoVisual:
      normalizarNumero(especifica.altoVisual) ??
      normalizarNumero(base.altoVisual) ??
      20,
    solapeSuperior:
      normalizarNumero(especifica.solapeSuperior) ??
      normalizarNumero(base.solapeSuperior) ??
      2,
    anchoLateral:
      normalizarNumero(especifica.anchoLateral) ??
      normalizarNumero(base.anchoLateral) ??
      5,
    sombraProyectada:
      normalizarNumero(especifica.sombraProyectada) ??
      normalizarNumero(base.sombraProyectada) ??
      6,
    opacidad:
      normalizarNumero(especifica.opacidad) ??
      normalizarNumero(base.opacidad) ??
      1,
  };
}

function normalizarTipoTerreno(tipo, simbolo) {
  if (typeof tipo === "string") {
    const normalizado = tipo.trim().toLowerCase();

    if (normalizado === TIPO_PARED || normalizado === TIPO_SUELO) {
      return normalizado;
    }
  }

  return simbolo === "#" ? TIPO_PARED : TIPO_SUELO;
}

function normalizarListaRutas(rutas) {
  if (!Array.isArray(rutas)) {
    return [];
  }

  return rutas.map(normalizarRuta).filter(Boolean);
}

function normalizarRuta(ruta) {
  return typeof ruta === "string" && ruta.trim() !== ""
    ? ruta.trim()
    : null;
}

function normalizarColor(color) {
  return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)
    ? color
    : null;
}

function normalizarTexto(texto) {
  return typeof texto === "string" && texto.trim() !== ""
    ? texto.trim()
    : null;
}

function normalizarNumero(valor) {
  return Number.isFinite(valor) ? valor : null;
}

function normalizarObjeto(valor) {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? valor
    : {};
}

function agregarRuta(rutas, ruta) {
  const normalizada = normalizarRuta(ruta);

  if (normalizada) {
    rutas.add(normalizada);
  }
}

function validarMapa(mapa) {
  if (!Array.isArray(mapa) || mapa.length === 0 || !Array.isArray(mapa[0])) {
    throw new Error("ResolutorTerrenosPhaser necesita un mapa válido.");
  }
}
