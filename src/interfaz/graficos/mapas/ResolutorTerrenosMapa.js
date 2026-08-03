export function normalizarConfiguracionTerrenosMapa(apariencia = {}) {
  if (apariencia?.definiciones && apariencia?.sueloBase && apariencia?.paredBase) {
    return apariencia;
  }
  const aparienciaPhaser = apariencia?.phaser ?? {};
  const terrenosVisuales = apariencia?.terrenos ?? {};
  const terrenosPhaser = aparienciaPhaser?.terrenos ?? {};
  const simbolos = new Set([
    '#',
    '.',
    ...Object.keys(terrenosVisuales),
    ...Object.keys(terrenosPhaser),
  ]);

  const colorSuelo = convertirColor(apariencia?.colorSuelo, 0x26372f);
  const colorPared = convertirColor(apariencia?.colorPared, 0x53695d);
  const sueloBase = Object.freeze({
    tipo: 'suelo',
    color: colorSuelo,
    recursos: Object.freeze(normalizarListaRutas(aparienciaPhaser?.suelo?.recursos)),
  });
  const paredBase = Object.freeze({
    tipo: 'pared',
    color: colorPared,
    recursos: Object.freeze([]),
  });

  const definiciones = {};

  for (const simbolo of simbolos) {
    const visual = terrenosVisuales?.[simbolo] ?? {};
    const phaser = terrenosPhaser?.[simbolo] ?? {};
    const esPared =
      phaser.tipo === 'pared' ||
      visual.tipo === 'pared' ||
      (simbolo === '#' && phaser.tipo !== 'suelo' && visual.tipo !== 'suelo');

    definiciones[simbolo] = Object.freeze({
      simbolo,
      tipo: esPared ? 'pared' : 'suelo',
      color: convertirColor(
        phaser.color ?? visual.color,
        esPared ? colorPared : colorSuelo,
      ),
      recursos: Object.freeze(
        normalizarListaRutas(phaser.recursos).length > 0
          ? normalizarListaRutas(phaser.recursos)
          : esPared
            ? []
            : sueloBase.recursos,
      ),
    });
  }

  return Object.freeze({
    sueloBase,
    paredBase,
    definiciones: Object.freeze(definiciones),
  });
}

export function obtenerRutasRecursosTerreno(configuracion) {
  const normalizada = normalizarConfiguracionTerrenosMapa(configuracion);
  const rutas = [
    ...normalizada.sueloBase.recursos,
    ...Object.values(normalizada.definiciones).flatMap((definicion) =>
      definicion.tipo === 'suelo' ? definicion.recursos : [],
    ),
  ].filter(Boolean);

  return [...new Set(rutas)];
}

export function crearPredicadoParedTerrenos(configuracion) {
  const normalizada = normalizarConfiguracionTerrenosMapa(configuracion);

  return (simbolo) => {
    const definicion = normalizada.definiciones[simbolo];
    return (definicion ?? normalizada.sueloBase).tipo === 'pared';
  };
}

export function resolverCasillaTerreno({
  configuracion,
  simbolo,
  x,
  y,
}) {
  const normalizada = normalizarConfiguracionTerrenosMapa(configuracion);
  const definicion =
    normalizada.definiciones[simbolo] ??
    (simbolo === '#' ? normalizada.paredBase : normalizada.sueloBase);

  return Object.freeze({
    simbolo,
    tipo: definicion.tipo,
    esPared: definicion.tipo === 'pared',
    color: definicion.color,
    recursos: definicion.recursos,
    rutaBase: elegirRutaDeterminista(definicion.recursos, x, y),
  });
}

function elegirRutaDeterminista(rutas, x, y) {
  if (!Array.isArray(rutas) || rutas.length === 0) return null;
  return rutas[obtenerHashCasilla(x, y) % rutas.length];
}

function obtenerHashCasilla(x, y) {
  return Math.abs(
    Math.imul(x + 17, 73856093) ^ Math.imul(y + 31, 19349663),
  );
}

function normalizarListaRutas(rutas) {
  if (!Array.isArray(rutas)) return [];
  return rutas.map(normalizarRuta).filter(Boolean);
}

function normalizarRuta(ruta) {
  return typeof ruta === 'string' && ruta.trim() !== '' ? ruta.trim() : null;
}

function convertirColor(valor, respaldo) {
  if (typeof valor !== 'string' || !/^#[0-9a-f]{6}$/i.test(valor)) {
    return respaldo;
  }

  return Number.parseInt(valor.slice(1), 16);
}
