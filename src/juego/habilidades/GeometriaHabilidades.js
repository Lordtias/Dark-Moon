import { evaluarAtaqueCasilla } from "../combate/SistemaAlcanceAtaque.js";

export const TIPOS_FORMA_IMPACTO = Object.freeze({
  INDIVIDUAL: "individual",
  RADIO: "radio",
  CADENA: "cadena",
});

// Calcula la vista previa completa de una habilidad sin modificar el mundo.
// El resultado sirve tanto para la interfaz como para preparar la ejecución.
export function crearVistaPreviaHabilidad({
  mapa,
  jugador,
  objetivos = [],
  habilidad,
  gradoConfig,
  x,
  y,
} = {}) {
  validarEntrada({ mapa, jugador, objetivos, habilidad, gradoConfig, x, y });

  const centro = obtenerCentroSeleccion({ jugador, habilidad, x, y });
  const geometria = evaluarSeleccionHabilidad({
    mapa,
    jugador,
    habilidad,
    gradoConfig,
    x: centro.x,
    y: centro.y,
  });
  const casillasSeleccionables = obtenerCasillasSeleccionablesHabilidad({
    mapa,
    jugador,
    habilidad,
    gradoConfig,
  });
  const objetivosVivos = objetivos.filter(
    (objetivo) => !estaDerrotado(objetivo),
  );
  const objetivoPrimario = encontrarObjetivoEn(
    objetivosVivos,
    centro.x,
    centro.y,
  );
  const formaImpacto = gradoConfig.formaImpacto;
  const resolucionImpacto = resolverFormaImpacto({
    mapa,
    centro,
    objetivos: objetivosVivos,
    objetivoPrimario,
    formaImpacto,
  });
  const objetivoValido = validarObjetivoSeleccion({
    tipoObjetivo: habilidad.ejecucion.tipoObjetivo,
    objetivoPrimario,
    objetivosAfectados: resolucionImpacto.objetivosAfectados,
  });
  const puedeEjecutar = geometria.puedeEjecutar && objetivoValido;

  return {
    centro,
    geometria: {
      ...geometria,
      puedeEjecutar,
    },
    casillasSeleccionables,
    casillasAfectadas: resolucionImpacto.casillasAfectadas,
    objetivosAfectados: resolucionImpacto.objetivosAfectados,
    recorrido: resolucionImpacto.recorrido,
    objetivoPrimario,
    objetivoValido,
    puedeEjecutar,
    mensaje: puedeEjecutar
      ? null
      : geometria.puedeEjecutar
        ? "No hay enemigos válidos dentro de la forma de impacto."
        : geometria.mensaje,
  };
}

export function obtenerCasillasSeleccionablesHabilidad({
  mapa,
  jugador,
  habilidad,
  gradoConfig,
} = {}) {
  validarEntradaBasica({ mapa, jugador, habilidad, gradoConfig });

  if (habilidad.ejecucion.tipoObjetivo === "propio") {
    return [{ x: jugador.x, y: jugador.y }];
  }

  const casillas = [];
  for (let y = 0; y < mapa.length; y += 1) {
    for (let x = 0; x < mapa[y].length; x += 1) {
      const geometria = evaluarSeleccionHabilidad({
        mapa,
        jugador,
        habilidad,
        gradoConfig,
        x,
        y,
      });
      if (geometria.puedeEjecutar) casillas.push({ x, y });
    }
  }
  return casillas;
}

export function evaluarSeleccionHabilidad({
  mapa,
  jugador,
  habilidad,
  gradoConfig,
  x,
  y,
} = {}) {
  validarEntrada({
    mapa,
    jugador,
    objetivos: [],
    habilidad,
    gradoConfig,
    x,
    y,
  });

  if (habilidad.ejecucion.tipoObjetivo === "propio") {
    const coincide = x === jugador.x && y === jugador.y;
    return {
      dentroAlcance: coincide,
      patronValido: coincide,
      lineaVisionDespejada: true,
      puedeEjecutar: coincide,
      distancia: 0,
      mensaje: coincide
        ? null
        : "Esta habilidad se ejecuta sobre la casilla del jugador.",
      detalle: null,
    };
  }

  const atacanteAdaptado = crearAdaptadorGeometrico({
    jugador,
    alcance: gradoConfig.alcance,
    patronAtaque: habilidad.ejecucion.patronAtaque,
  });

  try {
    const resultado = evaluarAtaqueCasilla({
      atacante: atacanteAdaptado,
      xObjetivo: x,
      yObjetivo: y,
      mapa,
    });
    const dentroAlcance = Boolean(
      resultado.dentroAlcance ?? resultado.puedeAtacar,
    );
    const patronValido = Boolean(
      resultado.patronValido ?? resultado.puedeAtacar,
    );
    const lineaVisionDespejada = Boolean(
      resultado.lineaVisionDespejada ?? resultado.puedeAtacar,
    );
    const puedeEjecutar =
      dentroAlcance &&
      patronValido &&
      (!habilidad.ejecucion.requiereLineaVision || lineaVisionDespejada);

    return {
      dentroAlcance,
      patronValido,
      lineaVisionDespejada,
      puedeEjecutar,
      distancia: resultado.distancia ?? null,
      mensaje: puedeEjecutar
        ? null
        : (resultado.mensaje ?? "La casilla no es válida para la habilidad."),
      detalle: resultado,
    };
  } catch (error) {
    return {
      dentroAlcance: false,
      patronValido: false,
      lineaVisionDespejada: false,
      puedeEjecutar: false,
      distancia: null,
      mensaje: error.message,
      detalle: null,
    };
  }
}

function resolverFormaImpacto({
  mapa,
  centro,
  objetivos,
  objetivoPrimario,
  formaImpacto,
}) {
  switch (formaImpacto.tipo) {
    case TIPOS_FORMA_IMPACTO.RADIO:
      return resolverRadio({ mapa, centro, objetivos, formaImpacto });
    case TIPOS_FORMA_IMPACTO.CADENA:
      return resolverCadena({
        objetivoPrimario,
        objetivos,
        formaImpacto,
      });
    case TIPOS_FORMA_IMPACTO.INDIVIDUAL:
    default:
      return resolverIndividual({ mapa, centro, objetivoPrimario });
  }
}

function resolverIndividual({ mapa, centro, objetivoPrimario }) {
  const casillasAfectadas = esCasillaSuelo(mapa, centro.x, centro.y)
    ? [{ x: centro.x, y: centro.y }]
    : [];
  const objetivosAfectados = objetivoPrimario
    ? [crearObjetivoAfectado(objetivoPrimario, 0, 1)]
    : [];
  return {
    casillasAfectadas,
    objetivosAfectados,
    recorrido: objetivosAfectados.map(copiarPasoRecorrido),
  };
}

function resolverRadio({ mapa, centro, objetivos, formaImpacto }) {
  const casillasAfectadas = [];
  const clavesAfectadas = new Set();

  for (
    let y = centro.y - formaImpacto.radio;
    y <= centro.y + formaImpacto.radio;
    y += 1
  ) {
    for (
      let x = centro.x - formaImpacto.radio;
      x <= centro.x + formaImpacto.radio;
      x += 1
    ) {
      if (!esCasillaSuelo(mapa, x, y)) continue;
      if (distanciaCuadricula(centro, { x, y }) > formaImpacto.radio) continue;
      const casilla = { x, y };
      casillasAfectadas.push(casilla);
      clavesAfectadas.add(crearClaveCasilla(casilla));
    }
  }

  casillasAfectadas.sort(compararCasillas);
  const objetivosAfectados = objetivos
    .filter((objetivo) => clavesAfectadas.has(crearClaveCasilla(objetivo)))
    .sort((a, b) => {
      const diferenciaDistancia =
        distanciaCuadricula(centro, a) - distanciaCuadricula(centro, b);
      return diferenciaDistancia || compararCasillas(a, b);
    })
    .map((objetivo, orden) => crearObjetivoAfectado(objetivo, orden, 1));

  return {
    casillasAfectadas,
    objetivosAfectados,
    recorrido: [],
  };
}

function resolverCadena({ objetivoPrimario, objetivos, formaImpacto }) {
  if (!objetivoPrimario) {
    return { casillasAfectadas: [], objetivosAfectados: [], recorrido: [] };
  }

  const seleccionados = [objetivoPrimario];
  const visitados = new Set([objetivoPrimario]);

  while (seleccionados.length < formaImpacto.maximoObjetivos) {
    const actual = seleccionados[seleccionados.length - 1];
    const siguiente = objetivos
      .filter(
        (objetivo) =>
          !visitados.has(objetivo) &&
          distanciaCuadricula(actual, objetivo) <= formaImpacto.alcanceSalto,
      )
      .sort((a, b) => {
        const diferenciaDistancia =
          distanciaCuadricula(actual, a) - distanciaCuadricula(actual, b);
        return diferenciaDistancia || compararCasillas(a, b);
      })[0];

    if (!siguiente) break;
    seleccionados.push(siguiente);
    visitados.add(siguiente);
  }

  const objetivosAfectados = seleccionados.map((objetivo, orden) =>
    crearObjetivoAfectado(
      objetivo,
      orden,
      Math.pow(formaImpacto.factorDanioPorSalto, orden),
    ),
  );

  return {
    casillasAfectadas: objetivosAfectados.map(({ x, y }) => ({ x, y })),
    objetivosAfectados,
    recorrido: objetivosAfectados.map(copiarPasoRecorrido),
  };
}

function validarObjetivoSeleccion({
  tipoObjetivo,
  objetivoPrimario,
  objetivosAfectados,
}) {
  if (tipoObjetivo === "enemigo") return Boolean(objetivoPrimario);
  return objetivosAfectados.length > 0;
}

function obtenerCentroSeleccion({ jugador, habilidad, x, y }) {
  return habilidad.ejecucion.tipoObjetivo === "propio"
    ? { x: jugador.x, y: jugador.y }
    : { x, y };
}

function crearObjetivoAfectado(objetivo, orden, multiplicadorDanio) {
  return {
    objetivo,
    x: objetivo.x,
    y: objetivo.y,
    orden,
    multiplicadorDanio,
  };
}

function copiarPasoRecorrido({ x, y, orden }) {
  return { x, y, orden };
}

function encontrarObjetivoEn(objetivos, x, y) {
  return (
    objetivos.find((objetivo) => objetivo.x === x && objetivo.y === y) ?? null
  );
}

function crearAdaptadorGeometrico({ jugador, alcance, patronAtaque }) {
  return new Proxy(jugador, {
    get(objetivo, propiedad, receptor) {
      const equipamientoAdaptado = crearAdaptadorEquipamiento(
        objetivo.equipamiento,
        alcance,
        patronAtaque,
      );
      const sobrescrituras = {
        alcance,
        alcanceAtaque: alcance,
        patronAtaque,
        patronAtaqueActual: patronAtaque,
        patrónAtaque: patronAtaque,
        equipamiento: equipamientoAdaptado,
        obtenerAlcanceAtaque: () => alcance,
        obtenerPatronAtaque: () => patronAtaque,
        obtenerConfiguracionAtaqueActual: () => ({
          alcance,
          patronAtaque,
          patrónAtaque: patronAtaque,
        }),
        obtenerDatosAtaqueActual: () => ({
          alcance,
          patronAtaque,
          patrónAtaque: patronAtaque,
        }),
      };
      if (Object.prototype.hasOwnProperty.call(sobrescrituras, propiedad)) {
        return sobrescrituras[propiedad];
      }
      return Reflect.get(objetivo, propiedad, receptor);
    },
  });
}

function crearAdaptadorEquipamiento(equipamiento, alcance, patronAtaque) {
  const base =
    equipamiento && typeof equipamiento === "object" ? equipamiento : {};
  return new Proxy(base, {
    get(objetivo, propiedad, receptor) {
      const sobrescrituras = {
        alcance,
        alcanceAtaque: alcance,
        patronAtaque,
        obtenerAlcanceAtaque: () => alcance,
        obtenerPatronAtaque: () => patronAtaque,
        obtenerArmaActiva: () => ({ alcance, patronAtaque }),
        obtenerArmaPrincipal: () => ({ alcance, patronAtaque }),
      };
      if (Object.prototype.hasOwnProperty.call(sobrescrituras, propiedad)) {
        return sobrescrituras[propiedad];
      }
      return Reflect.get(objetivo, propiedad, receptor);
    },
  });
}

function distanciaCuadricula(origen, destino) {
  return Math.max(
    Math.abs(destino.x - origen.x),
    Math.abs(destino.y - origen.y),
  );
}

function esCasillaSuelo(mapa, x, y) {
  return (
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

function estaDerrotado(objetivo) {
  if (typeof objetivo?.estaDerrotado === "function") {
    return Boolean(objetivo.estaDerrotado());
  }
  const vida = objetivo?.vidaActual ?? objetivo?.vida;
  return (
    objetivo?.estaDestruido === true || (Number.isFinite(vida) && vida <= 0)
  );
}

function validarEntrada({
  mapa,
  jugador,
  objetivos,
  habilidad,
  gradoConfig,
  x,
  y,
}) {
  validarEntradaBasica({ mapa, jugador, habilidad, gradoConfig });
  if (!Array.isArray(objetivos)) {
    throw new Error(
      "Los objetivos de la habilidad deben estar dentro de una lista.",
    );
  }
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error("La selección de habilidad necesita coordenadas enteras.");
  }
}

function validarEntradaBasica({ mapa, jugador, habilidad, gradoConfig }) {
  if (!Array.isArray(mapa) || mapa.length === 0) {
    throw new Error("La geometría de habilidades necesita un mapa válido.");
  }
  if (
    !jugador ||
    !Number.isInteger(jugador.x) ||
    !Number.isInteger(jugador.y)
  ) {
    throw new Error(
      "La geometría de habilidades necesita un jugador posicionado.",
    );
  }
  if (!habilidad?.ejecucion || !gradoConfig?.formaImpacto) {
    throw new Error(
      "La habilidad necesita una ejecución y forma de impacto válidas.",
    );
  }
}
