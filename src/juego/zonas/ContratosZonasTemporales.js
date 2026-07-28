export const ACTIVADORES_ZONA_TEMPORAL = Object.freeze({
  AL_CREAR: "al_crear",
  AL_ENTRAR: "al_entrar",
  POR_INTERVALO: "por_intervalo",
});

export const ACTIVADORES_ZONA_TEMPORAL_VALIDOS = Object.freeze(
  Object.values(ACTIVADORES_ZONA_TEMPORAL),
);

export const OBJETIVOS_ZONA_TEMPORAL = Object.freeze({
  HOSTILES: "hostiles",
  ALIADOS: "aliados",
  TODOS: "todos",
  FUENTE: "fuente",
});

export const OBJETIVOS_ZONA_TEMPORAL_VALIDOS = Object.freeze(
  Object.values(OBJETIVOS_ZONA_TEMPORAL),
);

export const POLITICAS_SUPERPOSICION_ZONA = Object.freeze({
  RENOVAR_DURACION: "renovar_duracion",
  REEMPLAZAR: "reemplazar",
  PERMITIR_SUPERPOSICION: "permitir_superposicion",
});

export const POLITICAS_SUPERPOSICION_ZONA_VALIDAS = Object.freeze(
  Object.values(POLITICAS_SUPERPOSICION_ZONA),
);

export function normalizarConfiguracionZonaTemporal(
  definicion,
  { etiqueta = "la zona temporal" } = {},
) {
  validarObjeto(definicion, etiqueta);
  validarNumeroPositivo(definicion.duracion, `la duración de ${etiqueta}`);

  const activadores = normalizarActivadores(definicion.activadores, etiqueta);
  const usaIntervalo = activadores.includes(
    ACTIVADORES_ZONA_TEMPORAL.POR_INTERVALO,
  );
  const intervalo = definicion.intervalo ?? null;

  if (usaIntervalo) {
    validarNumeroPositivo(intervalo, `el intervalo de ${etiqueta}`);
    if (intervalo >= definicion.duracion) {
      throw new Error(
        `El intervalo de ${etiqueta} debe ser menor que su duración.`,
      );
    }
  } else if (intervalo !== null) {
    validarNumeroPositivo(intervalo, `el intervalo de ${etiqueta}`);
  }

  const afecta = normalizarId(definicion.afecta ?? "hostiles");
  if (!OBJETIVOS_ZONA_TEMPORAL_VALIDOS.includes(afecta)) {
    throw new Error(
      `El alcance de objetivos "${afecta}" de ${etiqueta} no es válido.`,
    );
  }

  const politicaSuperposicion = normalizarId(
    definicion.politicaSuperposicion ?? "renovar_duracion",
  );
  if (!POLITICAS_SUPERPOSICION_ZONA_VALIDAS.includes(politicaSuperposicion)) {
    throw new Error(
      `La política de superposición "${politicaSuperposicion}" de ${etiqueta} no es válida.`,
    );
  }

  const grupoSuperposicion = normalizarId(
    definicion.grupoSuperposicion ?? "zona_temporal",
  );
  const apariencia = normalizarId(definicion.apariencia ?? "generica");

  if (
    definicion.resolverImpacto !== undefined &&
    typeof definicion.resolverImpacto !== "boolean"
  ) {
    throw new Error(
      `resolverImpacto de ${etiqueta} debe ser un valor booleano.`,
    );
  }
  if (
    definicion.resolverCritico !== undefined &&
    typeof definicion.resolverCritico !== "boolean"
  ) {
    throw new Error(
      `resolverCritico de ${etiqueta} debe ser un valor booleano.`,
    );
  }

  return congelarProfundamente({
    duracion: definicion.duracion,
    intervalo,
    activadores,
    afecta,
    politicaSuperposicion,
    grupoSuperposicion,
    apariencia,
    resolverImpacto: definicion.resolverImpacto !== false,
    resolverCritico: definicion.resolverCritico === true,
  });
}

export function normalizarCasillasZonaTemporal(casillas, mapa) {
  if (!Array.isArray(casillas) || casillas.length === 0) {
    throw new Error("La zona temporal necesita al menos una casilla.");
  }

  const unicas = new Map();
  for (const casilla of casillas) {
    if (!Number.isInteger(casilla?.x) || !Number.isInteger(casilla?.y)) {
      throw new Error(
        "Cada casilla de la zona temporal debe usar coordenadas enteras.",
      );
    }
    if (!esCasillaSuelo(mapa, casilla.x, casilla.y)) {
      continue;
    }
    unicas.set(crearClaveCasilla(casilla), {
      x: casilla.x,
      y: casilla.y,
    });
  }

  const resultado = [...unicas.values()].sort(compararCasillas);
  if (resultado.length === 0) {
    throw new Error("La zona temporal no posee casillas de suelo válidas.");
  }
  return Object.freeze(resultado.map((casilla) => Object.freeze(casilla)));
}

function normalizarActivadores(activadores, etiqueta) {
  if (!Array.isArray(activadores) || activadores.length === 0) {
    throw new Error(`${etiqueta} necesita al menos un activador.`);
  }

  const normalizados = [...new Set(activadores.map(normalizarId))];
  for (const activador of normalizados) {
    if (!ACTIVADORES_ZONA_TEMPORAL_VALIDOS.includes(activador)) {
      throw new Error(
        `El activador "${activador}" de ${etiqueta} no es válido.`,
      );
    }
  }
  return Object.freeze(normalizados);
}

function esCasillaSuelo(mapa, x, y) {
  return (
    Array.isArray(mapa) &&
    y >= 0 &&
    y < mapa.length &&
    x >= 0 &&
    x < mapa[y].length &&
    mapa[y][x] !== "#"
  );
}

function crearClaveCasilla({ x, y }) {
  return `${x}:${y}`;
}

function compararCasillas(a, b) {
  return a.y - b.y || a.x - b.x;
}

function validarObjeto(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}

function validarNumeroPositivo(valor, descripcion) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un número mayor que 0.`);
  }
}

function normalizarId(valor) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error("Los identificadores de zona temporal necesitan texto.");
  }
  return valor.trim().toLowerCase();
}

function congelarProfundamente(valor) {
  if (valor === null || typeof valor !== "object" || Object.isFrozen(valor)) {
    return valor;
  }
  Object.freeze(valor);
  for (const contenido of Object.values(valor)) {
    congelarProfundamente(contenido);
  }
  return valor;
}
