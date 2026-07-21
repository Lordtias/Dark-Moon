// Estados visuales usados por la tabla comparativa.
export const TENDENCIAS_COMPARACION_OBJETO = Object.freeze({
  MEJORA: "mejora",
  EMPEORA: "empeora",
  IGUAL: "igual",
  NEUTRAL: "neutral",
  AGREGADA: "agregada",
  PERDIDA: "perdida",
});

// Solo estas propiedades pueden considerarse objetivamente mejores o peores.
// Las demás se muestran como diferencias descriptivas.
const REGLAS_ESTADISTICAS = Object.freeze({
  "dano fisico": {
    tipo: "rangoDanio",
    unidad: " de daño medio",
  },

  precision: {
    tipo: "numero",
    unidad: "",
  },

  "velocidad de ataque": {
    tipo: "numero",
    unidad: " ataques/s",
  },

  critico: {
    tipo: "critico",
    unidad: " % de aporte crítico",
  },

  alcance: {
    tipo: "numero",
    unidad: "",
  },

  armadura: {
    tipo: "numero",
    unidad: "",
  },

  bloqueo: {
    tipo: "numero",
    unidad: " p.p.",
  },

  "mitigacion de bloqueo": {
    tipo: "numero",
    unidad: " p.p.",
  },

  capacidad: {
    tipo: "numero",
    unidad: " pilas",
  },
});

// Compara libremente dos objetos sin asumir que ocupan la misma ranura.
// Así se puede comparar, por ejemplo, una daga contra un escudo.
export function crearComparacionObjetos({
  presentacionInspeccionada,
  presentacionElegida,
} = {}) {
  validarPresentacionObjeto(presentacionInspeccionada, "inspeccionada");

  validarPresentacionObjeto(presentacionElegida, "elegida");

  return {
    inspeccionado: crearResumenObjeto(presentacionInspeccionada),

    elegido: crearResumenObjeto(presentacionElegida),

    filasEstadisticas: compararEstadisticas({
      estadisticasInspeccionadas: presentacionInspeccionada.estadisticas,

      estadisticasElegidas: presentacionElegida.estadisticas,
    }),

    cambiosAfijos: compararAfijos({
      afijosInspeccionados: presentacionInspeccionada.afijos,

      afijosElegidos: presentacionElegida.afijos,
    }),
  };
}

function crearResumenObjeto(presentacion) {
  return {
    nombre: presentacion.nombre,

    subtitulo: presentacion.subtitulo,

    nivelObjeto: presentacion.nivelObjeto,

    rareza: presentacion.rareza
      ? {
          ...presentacion.rareza,
        }
      : null,
  };
}

function compararEstadisticas({
  estadisticasInspeccionadas,
  estadisticasElegidas,
}) {
  const elegidasPorEtiqueta = new Map(
    estadisticasElegidas.map((estadistica) => [
      normalizarEtiqueta(estadistica.etiqueta),

      estadistica,
    ]),
  );

  const etiquetasProcesadas = new Set();

  const filas = [];

  // Conservamos primero el orden natural
  // del objeto inspeccionado.
  for (const estadisticaInspeccionada of estadisticasInspeccionadas) {
    const clave = normalizarEtiqueta(estadisticaInspeccionada.etiqueta);

    etiquetasProcesadas.add(clave);

    const estadisticaElegida = elegidasPorEtiqueta.get(clave) ?? null;

    if (estadisticaElegida === null) {
      filas.push({
        etiqueta: estadisticaInspeccionada.etiqueta,

        valorInspeccionado: estadisticaInspeccionada.valor,

        valorElegido: "—",

        tendencia: TENDENCIAS_COMPARACION_OBJETO.AGREGADA,

        diferencia: "Solo en el objeto inspeccionado",
      });

      continue;
    }

    filas.push(
      evaluarEstadistica({
        clave,
        estadisticaInspeccionada,
        estadisticaElegida,
      }),
    );
  }

  // Después agregamos propiedades exclusivas
  // del objeto elegido.
  for (const estadisticaElegida of estadisticasElegidas) {
    const clave = normalizarEtiqueta(estadisticaElegida.etiqueta);

    if (etiquetasProcesadas.has(clave)) {
      continue;
    }

    filas.push({
      etiqueta: estadisticaElegida.etiqueta,

      valorInspeccionado: "—",

      valorElegido: estadisticaElegida.valor,

      tendencia: TENDENCIAS_COMPARACION_OBJETO.PERDIDA,

      diferencia: "Solo en el objeto elegido",
    });
  }

  return filas;
}

function evaluarEstadistica({
  clave,
  estadisticaInspeccionada,
  estadisticaElegida,
}) {
  const valorInspeccionado = String(estadisticaInspeccionada.valor);

  const valorElegido = String(estadisticaElegida.valor);

  if (valorInspeccionado === valorElegido) {
    return crearFilaComparacion({
      estadisticaInspeccionada,
      estadisticaElegida,

      tendencia: TENDENCIAS_COMPARACION_OBJETO.IGUAL,

      diferencia: "Sin cambios",
    });
  }

  const regla = REGLAS_ESTADISTICAS[clave];

  // Atributo, patrón, tipo de ataque y manos
  // no tienen un ganador automático.
  if (!regla) {
    return crearFilaComparacion({
      estadisticaInspeccionada,
      estadisticaElegida,

      tendencia: TENDENCIAS_COMPARACION_OBJETO.NEUTRAL,

      diferencia: "Diferente",
    });
  }

  switch (regla.tipo) {
    case "rangoDanio":
      return evaluarRangoDanio({
        estadisticaInspeccionada,
        estadisticaElegida,
        unidad: regla.unidad,
      });

    case "critico":
      return evaluarCritico({
        estadisticaInspeccionada,
        estadisticaElegida,
        unidad: regla.unidad,
      });

    case "numero":
      return evaluarNumeroSimple({
        estadisticaInspeccionada,
        estadisticaElegida,
        unidad: regla.unidad,
      });

    default:
      return crearFilaNeutral({
        estadisticaInspeccionada,
        estadisticaElegida,
      });
  }
}

function evaluarRangoDanio({
  estadisticaInspeccionada,
  estadisticaElegida,
  unidad,
}) {
  const numerosInspeccionado = extraerNumeros(estadisticaInspeccionada.valor);

  const numerosElegido = extraerNumeros(estadisticaElegida.valor);

  if (numerosInspeccionado.length < 2 || numerosElegido.length < 2) {
    return crearFilaNeutral({
      estadisticaInspeccionada,
      estadisticaElegida,
    });
  }

  const promedioInspeccionado =
    (numerosInspeccionado[0] + numerosInspeccionado[1]) / 2;

  const promedioElegido = (numerosElegido[0] + numerosElegido[1]) / 2;

  return crearFilaNumerica({
    estadisticaInspeccionada,
    estadisticaElegida,

    diferencia: promedioInspeccionado - promedioElegido,

    unidad,
  });
}

function evaluarNumeroSimple({
  estadisticaInspeccionada,
  estadisticaElegida,
  unidad,
}) {
  const numerosInspeccionado = extraerNumeros(estadisticaInspeccionada.valor);

  const numerosElegido = extraerNumeros(estadisticaElegida.valor);

  if (numerosInspeccionado.length === 0 || numerosElegido.length === 0) {
    return crearFilaNeutral({
      estadisticaInspeccionada,
      estadisticaElegida,
    });
  }

  return crearFilaNumerica({
    estadisticaInspeccionada,
    estadisticaElegida,

    diferencia: numerosInspeccionado[0] - numerosElegido[0],

    unidad,
  });
}

function evaluarCritico({
  estadisticaInspeccionada,
  estadisticaElegida,
  unidad,
}) {
  const aporteInspeccionado = obtenerAporteCritico(
    estadisticaInspeccionada.valor,
  );

  const aporteElegido = obtenerAporteCritico(estadisticaElegida.valor);

  if (aporteInspeccionado === null || aporteElegido === null) {
    return crearFilaNeutral({
      estadisticaInspeccionada,
      estadisticaElegida,
    });
  }

  return crearFilaNumerica({
    estadisticaInspeccionada,
    estadisticaElegida,

    diferencia: aporteInspeccionado - aporteElegido,

    unidad,
  });
}

function crearFilaNumerica({
  estadisticaInspeccionada,
  estadisticaElegida,
  diferencia,
  unidad,
}) {
  const tendencia = compararNumeros(diferencia, 0);

  const textoDiferencia =
    tendencia === TENDENCIAS_COMPARACION_OBJETO.IGUAL
      ? "Sin cambios"
      : `${formatearNumeroConSigno(diferencia)}${unidad}`;

  return crearFilaComparacion({
    estadisticaInspeccionada,
    estadisticaElegida,
    tendencia,

    diferencia: textoDiferencia,
  });
}

function crearFilaNeutral({ estadisticaInspeccionada, estadisticaElegida }) {
  return crearFilaComparacion({
    estadisticaInspeccionada,
    estadisticaElegida,

    tendencia: TENDENCIAS_COMPARACION_OBJETO.NEUTRAL,

    diferencia: "Diferente",
  });
}

function crearFilaComparacion({
  estadisticaInspeccionada,
  estadisticaElegida,
  tendencia,
  diferencia,
}) {
  return {
    etiqueta: estadisticaInspeccionada.etiqueta,

    valorInspeccionado: estadisticaInspeccionada.valor,

    valorElegido: estadisticaElegida.valor,

    tendencia,
    diferencia,
  };
}

function compararNumeros(valorInspeccionado, valorElegido) {
  const tolerancia = 0.0001;

  if (Math.abs(valorInspeccionado - valorElegido) <= tolerancia) {
    return TENDENCIAS_COMPARACION_OBJETO.IGUAL;
  }

  return valorInspeccionado > valorElegido
    ? TENDENCIAS_COMPARACION_OBJETO.MEJORA
    : TENDENCIAS_COMPARACION_OBJETO.EMPEORA;
}

// Convierte probabilidad y multiplicador
// en aporte medio porcentual.
function obtenerAporteCritico(valor) {
  const numeros = extraerNumeros(valor);

  if (numeros.length < 2) {
    return null;
  }

  const probabilidad = numeros[0] / 100;

  const multiplicador = numeros[1];

  return probabilidad * (multiplicador - 1) * 100;
}

function compararAfijos({ afijosInspeccionados, afijosElegidos }) {
  const elegidosPorClave = new Map(
    afijosElegidos.map((afijo) => [crearClaveAfijo(afijo), afijo]),
  );

  const clavesProcesadas = new Set();

  const cambios = {
    agregados: [],

    perdidos: [],

    modificados: [],
  };

  for (const afijoInspeccionado of afijosInspeccionados) {
    const clave = crearClaveAfijo(afijoInspeccionado);

    clavesProcesadas.add(clave);

    const afijoElegido = elegidosPorClave.get(clave) ?? null;

    if (afijoElegido === null) {
      cambios.agregados.push(copiarAfijo(afijoInspeccionado));

      continue;
    }

    if (
      !afijosSonIguales({
        afijoInspeccionado,
        afijoElegido,
      })
    ) {
      cambios.modificados.push({
        inspeccionado: copiarAfijo(afijoInspeccionado),

        elegido: copiarAfijo(afijoElegido),
      });
    }
  }

  for (const afijoElegido of afijosElegidos) {
    const clave = crearClaveAfijo(afijoElegido);

    if (!clavesProcesadas.has(clave)) {
      cambios.perdidos.push(copiarAfijo(afijoElegido));
    }
  }

  return cambios;
}

function crearClaveAfijo(afijo) {
  const tipo = typeof afijo.tipo === "string" ? afijo.tipo : "afijo";

  const identidad =
    typeof afijo.id === "string" && afijo.id.trim() !== ""
      ? afijo.id
      : afijo.nombre;

  return `${tipo}:${identidad}`;
}

function afijosSonIguales({ afijoInspeccionado, afijoElegido }) {
  return (
    afijoInspeccionado.grado === afijoElegido.grado &&
    JSON.stringify(afijoInspeccionado.efectos) ===
      JSON.stringify(afijoElegido.efectos)
  );
}

function copiarAfijo(afijo) {
  return {
    id: afijo.id,

    tipo: afijo.tipo,

    tipoEtiqueta: afijo.tipoEtiqueta,

    nombre: afijo.nombre,

    grado: afijo.grado,

    efectos: Array.isArray(afijo.efectos) ? [...afijo.efectos] : [],
  };
}

function extraerNumeros(valor) {
  const coincidencias = String(valor).match(/[-+]?\d+(?:[.,]\d+)?/g) ?? [];

  return coincidencias
    .map((numero) => Number(numero.replace(",", ".")))
    .filter(Number.isFinite);
}

function formatearNumeroConSigno(valor) {
  const redondeado = Math.round(valor * 100) / 100;

  const signo = redondeado > 0 ? "+" : "";

  return `${signo}` + String(redondeado).replace(".", ",");
}

function normalizarEtiqueta(etiqueta) {
  return String(etiqueta)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function validarPresentacionObjeto(presentacion, nombre) {
  if (
    !presentacion ||
    typeof presentacion !== "object" ||
    typeof presentacion.nombre !== "string" ||
    typeof presentacion.subtitulo !== "string" ||
    !Array.isArray(presentacion.estadisticas) ||
    !Array.isArray(presentacion.afijos)
  ) {
    throw new Error(
      `ComparadorObjetos necesita una presentación ${nombre} válida.`,
    );
  }

  for (const estadistica of presentacion.estadisticas) {
    if (
      !estadistica ||
      typeof estadistica !== "object" ||
      typeof estadistica.etiqueta !== "string" ||
      typeof estadistica.valor !== "string"
    ) {
      throw new Error(
        `La presentación ${nombre} contiene una estadística inválida.`,
      );
    }
  }

  for (const afijo of presentacion.afijos) {
    if (
      !afijo ||
      typeof afijo !== "object" ||
      typeof afijo.nombre !== "string" ||
      !Number.isInteger(afijo.grado) ||
      !Array.isArray(afijo.efectos)
    ) {
      throw new Error(`La presentación ${nombre} contiene un afijo inválido.`);
    }
  }
}
