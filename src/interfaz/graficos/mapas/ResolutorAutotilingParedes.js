import {
  analizarVecindadPared,
  analizarVecindadSuelo,
} from "./AnalizadorVecindadTerreno.js";

export function normalizarConfiguracionAutotilingPared(configuracion = {}) {
  const variantesEntrada = configuracion?.variantes ?? {};
  const bordeEntrada = configuracion?.borde ?? {};
  const sombraEntrada = configuracion?.sombraContacto ?? {};

  return Object.freeze({
    estrategiaBase:
      configuracion?.estrategiaBase === "variantes" ? "variantes" : "masa",
    recurso:
      normalizarRuta(configuracion?.recurso) ??
      normalizarRuta(variantesEntrada.interior),
    recursos: Object.freeze(normalizarListaRutas(configuracion?.recursos)),
    variantes: Object.freeze({
      aislado: normalizarRuta(variantesEntrada.aislado),
      extremo: normalizarRuta(variantesEntrada.extremo),
      recto: normalizarRuta(variantesEntrada.recto),
      esquina: normalizarRuta(variantesEntrada.esquina),
      unionT: normalizarRuta(variantesEntrada.unionT),
      cruce: normalizarRuta(variantesEntrada.cruce),
      interior: normalizarRuta(variantesEntrada.interior),
    }),
    borde: Object.freeze({
      recurso: normalizarRuta(bordeEntrada.recurso),
      recursoEsquinaInterior: normalizarRuta(
        bordeEntrada.recursoEsquinaInterior,
      ),
      color: convertirColor(bordeEntrada.color, 0x728078),
      colorLuz: convertirColor(bordeEntrada.colorLuz, 0xaeb8af),
      colorSombra: convertirColor(bordeEntrada.colorSombra, 0x21312b),
      grosor: limitarNumero(bordeEntrada.grosor, 2, 12, 5),
      grosorLuz: limitarNumero(bordeEntrada.grosorLuz, 1, 6, 1),
      opacidad: limitarNumero(bordeEntrada.opacidad, 0, 1, 0.94),
      opacidadLuz: limitarNumero(bordeEntrada.opacidadLuz, 0, 1, 0.72),
      opacidadSombra: limitarNumero(bordeEntrada.opacidadSombra, 0, 1, 0.34),
    }),
    sombraContacto: Object.freeze({
      habilitada: sombraEntrada.habilitada !== false,
      recurso: normalizarRuta(sombraEntrada.recurso),
      color: convertirColor(sombraEntrada.color, 0x06100c),
      grosor: limitarNumero(sombraEntrada.grosor, 1, 12, 4),
      margen: limitarNumero(sombraEntrada.margen, 0, 8, 2),
      opacidad: limitarNumero(sombraEntrada.opacidad, 0, 1, 0.16),
      opacidadSecundaria: limitarNumero(
        sombraEntrada.opacidadSecundaria,
        0,
        1,
        0.08,
      ),
      opacidadEsquina: limitarNumero(
        sombraEntrada.opacidadEsquina,
        0,
        1,
        0.22,
      ),
    }),
  });
}

export function obtenerRutasRecursosPared(configuracion) {
  const normalizada = normalizarConfiguracionAutotilingPared(configuracion);
  const rutas = [
    normalizada.recurso,
    ...normalizada.recursos,
    ...Object.values(normalizada.variantes),
    normalizada.borde.recurso,
    normalizada.borde.recursoEsquinaInterior,
    normalizada.sombraContacto.recurso,
  ].filter(Boolean);

  return [...new Set(rutas)];
}

export function resolverCasillaParedAutotiling({
  mapa,
  x,
  y,
  configuracion,
  simboloPared = "#",
  esPared = null,
}) {
  const configuracionNormalizada = normalizarConfiguracionAutotilingPared(
    configuracion,
  );
  const analisis = analizarVecindadPared(mapa, x, y, {
    simboloPared,
    esPared,
  });
  const tipoBase = clasificarTipoBase(analisis);
  const anguloBase =
    configuracionNormalizada.estrategiaBase === "variantes"
      ? obtenerAnguloBase({ analisis, tipoBase })
      : 0;
  const recursoBase = seleccionarRecursoBase({
    configuracion: configuracionNormalizada,
    tipoBase,
    x,
    y,
  });

  return Object.freeze({
    analisis,
    tipoBase,
    anguloBase,
    recursoBase,
    borde: configuracionNormalizada.borde,
    sombraContacto: configuracionNormalizada.sombraContacto,
  });
}

export function resolverCasillaSueloAutotiling({
  mapa,
  x,
  y,
  configuracion,
  simboloPared = "#",
  esPared = null,
}) {
  const configuracionNormalizada = normalizarConfiguracionAutotilingPared(
    configuracion,
  );
  const analisis = analizarVecindadSuelo(mapa, x, y, {
    simboloPared,
    esPared,
  });

  return Object.freeze({
    analisis,
    sombraContacto: configuracionNormalizada.sombraContacto,
  });
}

function seleccionarRecursoBase({ configuracion, tipoBase, x, y }) {
  if (configuracion.estrategiaBase === "variantes") {
    return configuracion.variantes[tipoBase] ?? configuracion.recurso;
  }

  if (configuracion.recursos.length > 0) {
    return configuracion.recursos[obtenerHashCasilla(x, y) % configuracion.recursos.length];
  }

  return configuracion.recurso ?? configuracion.variantes.interior ?? null;
}

function clasificarTipoBase(analisis) {
  const { cardinales, cantidadCardinales, cantidadDiagonales } = analisis;
  const { norte, este, sur, oeste } = cardinales;

  if (cantidadCardinales === 0) return "aislado";
  if (cantidadCardinales === 1) return "extremo";

  if (cantidadCardinales === 2) {
    return (norte && sur) || (este && oeste) ? "recto" : "esquina";
  }

  if (cantidadCardinales === 3) return "unionT";
  return cantidadDiagonales === 4 ? "interior" : "cruce";
}

function obtenerAnguloBase({ analisis, tipoBase }) {
  const { norte, este, sur, oeste } = analisis.cardinales;

  switch (tipoBase) {
    case "extremo":
      return norte ? 0 : este ? 90 : sur ? 180 : 270;
    case "recto":
      return norte && sur ? 90 : 0;
    case "esquina":
      return norte && este ? 0 : este && sur ? 90 : sur && oeste ? 180 : 270;
    case "unionT":
      return !sur ? 0 : !oeste ? 90 : !norte ? 180 : 270;
    default:
      return 0;
  }
}


function normalizarListaRutas(rutas) {
  if (!Array.isArray(rutas)) return [];
  return rutas.map(normalizarRuta).filter(Boolean);
}

function obtenerHashCasilla(x, y) {
  return Math.abs(
    Math.imul(x + 17, 73856093) ^ Math.imul(y + 31, 19349663),
  );
}

function normalizarRuta(ruta) {
  return typeof ruta === "string" && ruta.trim() !== "" ? ruta.trim() : null;
}

function convertirColor(valor, respaldo) {
  if (typeof valor !== "string" || !/^#[0-9a-f]{6}$/i.test(valor)) {
    return respaldo;
  }

  return Number.parseInt(valor.slice(1), 16);
}

function limitarNumero(valor, minimo, maximo, respaldo) {
  if (!Number.isFinite(valor)) return respaldo;
  return Math.max(minimo, Math.min(maximo, valor));
}
