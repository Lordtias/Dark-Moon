// Estados visuales que puede producir una comparación.
// La interfaz puede usar estos valores para mostrar mejoras en verde,
// pérdidas en rojo y diferencias descriptivas como información neutral.
export const TENDENCIAS_COMPARACION_OBJETO = Object.freeze({
  MEJORA: "mejora",
  EMPEORA: "empeora",
  IGUAL: "igual",
  NEUTRAL: "neutral",
  AGREGADA: "agregada",
  PERDIDA: "perdida",
});

// Reglas para las estadísticas cuyo valor puede compararse numéricamente.
// Las etiquetas se normalizan sin tildes y en minúsculas antes de buscarlas.
const REGLAS_ESTADISTICAS = Object.freeze({
  "dano fisico": {
    tipo: "rangoDanio",
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

// Crea un modelo de comparación independiente del DOM.
//
// Recibe las presentaciones construidas por PresentadorObjeto para poder
// reutilizar esta lógica en inventario, botín, comerciantes y recompensas.
export function crearComparacionObjetos({
  presentacionCandidata,
  presentacionEquipada = null,
  mismoObjeto = false,
} = {}) {
  validarPresentacionObjeto(presentacionCandidata, "candidata");

  if (presentacionEquipada !== null) {
    validarPresentacionObjeto(presentacionEquipada, "equipada");
  }

  // No hay nada con qué comparar cuando la ranura está vacía.
  if (presentacionEquipada === null) {
    return crearComparacionNoDisponible(
      "No hay un objeto equipado en la ranura correspondiente.",
    );
  }

  // Comparar una instancia consigo misma solamente agregaría ruido visual.
  if (mismoObjeto === true) {
    return crearComparacionNoDisponible(
      "El objeto inspeccionado ya está equipado.",
    );
  }

  return {
    disponible: true,
    motivo: "",

    equipado: crearResumenObjeto(presentacionEquipada),

    filasEstadisticas: compararEstadisticas({
      estadisticasCandidatas: presentacionCandidata.estadisticas,

      estadisticasEquipadas: presentacionEquipada.estadisticas,
    }),

    cambiosAfijos: compararAfijos({
      afijosCandidatos: presentacionCandidata.afijos,

      afijosEquipados: presentacionEquipada.afijos,
    }),
  };
}

// Devuelve siempre la misma estructura aunque la comparación
// no pueda mostrarse.
function crearComparacionNoDisponible(motivo) {
  return {
    disponible: false,
    motivo,
    equipado: null,
    filasEstadisticas: [],

    cambiosAfijos: {
      agregados: [],
      perdidos: [],
      modificados: [],
    },
  };
}

// Crea la información mínima necesaria para identificar
// visualmente el objeto equipado.
function crearResumenObjeto(presentacion) {
  return {
    nombre: presentacion.nombre,
    subtitulo: presentacion.subtitulo,
    nivelObjeto: presentacion.nivelObjeto,

    rareza: {
      ...presentacion.rareza,
    },
  };
}

// Compara las estadísticas mostradas por ambas presentaciones.
function compararEstadisticas({
  estadisticasCandidatas,
  estadisticasEquipadas,
}) {
  const equipadasPorEtiqueta = new Map(
    estadisticasEquipadas.map((estadistica) => [
      normalizarEtiqueta(estadistica.etiqueta),

      estadistica,
    ]),
  );

  const etiquetasProcesadas = new Set();
  const filas = [];

  // Conservamos primero el orden visual del objeto candidato.
  for (const estadisticaCandidata of estadisticasCandidatas) {
    const clave = normalizarEtiqueta(estadisticaCandidata.etiqueta);

    etiquetasProcesadas.add(clave);

    const estadisticaEquipada = equipadasPorEtiqueta.get(clave) ?? null;

    // La propiedad existe solamente en el objeto candidato.
    if (estadisticaEquipada === null) {
      filas.push({
        etiqueta: estadisticaCandidata.etiqueta,

        valorCandidato: estadisticaCandidata.valor,

        valorEquipado: "—",

        tendencia: TENDENCIAS_COMPARACION_OBJETO.AGREGADA,

        diferencia: "Nueva propiedad",
      });

      continue;
    }

    filas.push(
      evaluarEstadistica({
        clave,
        estadisticaCandidata,
        estadisticaEquipada,
      }),
    );
  }

  // Las propiedades exclusivas del objeto equipado
  // se perderían al cambiarlo.
  for (const estadisticaEquipada of estadisticasEquipadas) {
    const clave = normalizarEtiqueta(estadisticaEquipada.etiqueta);

    if (etiquetasProcesadas.has(clave)) {
      continue;
    }

    filas.push({
      etiqueta: estadisticaEquipada.etiqueta,

      valorCandidato: "—",

      valorEquipado: estadisticaEquipada.valor,

      tendencia: TENDENCIAS_COMPARACION_OBJETO.PERDIDA,

      diferencia: "Se pierde",
    });
  }

  return filas;
}

// Decide qué regla de comparación corresponde a una estadística.
function evaluarEstadistica({
  clave,
  estadisticaCandidata,
  estadisticaEquipada,
}) {
  const valorCandidato = String(estadisticaCandidata.valor);

  const valorEquipado = String(estadisticaEquipada.valor);

  // Los textos exactamente iguales no necesitan
  // ninguna interpretación adicional.
  if (valorCandidato === valorEquipado) {
    return crearFilaComparacion({
      estadisticaCandidata,
      estadisticaEquipada,

      tendencia: TENDENCIAS_COMPARACION_OBJETO.IGUAL,

      diferencia: "Sin cambios",
    });
  }

  const regla = REGLAS_ESTADISTICAS[clave];

  // Patrón, atributo, tipo de ataque y otros textos
  // se muestran lado a lado sin afirmar automáticamente
  // que uno sea mejor que otro.
  if (!regla) {
    return crearFilaComparacion({
      estadisticaCandidata,
      estadisticaEquipada,

      tendencia: TENDENCIAS_COMPARACION_OBJETO.NEUTRAL,

      diferencia: "Diferente",
    });
  }

  switch (regla.tipo) {
    case "rangoDanio":
      return evaluarRangoDanio({
        estadisticaCandidata,
        estadisticaEquipada,
      });

    case "critico":
      return evaluarCritico({
        estadisticaCandidata,
        estadisticaEquipada,
      });

    case "numero":
      return evaluarNumeroSimple({
        estadisticaCandidata,
        estadisticaEquipada,
        unidad: regla.unidad,
      });

    default:
      return crearFilaNeutral({
        estadisticaCandidata,
        estadisticaEquipada,
      });
  }
}

// Compara dos rangos de daño utilizando su promedio.
function evaluarRangoDanio({ estadisticaCandidata, estadisticaEquipada }) {
  const numerosCandidato = extraerNumeros(estadisticaCandidata.valor);

  const numerosEquipado = extraerNumeros(estadisticaEquipada.valor);

  if (numerosCandidato.length < 2 || numerosEquipado.length < 2) {
    return crearFilaNeutral({
      estadisticaCandidata,
      estadisticaEquipada,
    });
  }

  const promedioCandidato = (numerosCandidato[0] + numerosCandidato[1]) / 2;

  const promedioEquipado = (numerosEquipado[0] + numerosEquipado[1]) / 2;

  const diferencia = promedioCandidato - promedioEquipado;

  return crearFilaComparacion({
    estadisticaCandidata,
    estadisticaEquipada,

    tendencia: compararNumeros(promedioCandidato, promedioEquipado),

    diferencia:
      diferencia === 0
        ? "Mismo daño medio"
        : `${formatearNumeroConSigno(diferencia)} de daño medio`,
  });
}

// Compara probabilidad y multiplicador de crítico
// mediante su aporte promedio.
function evaluarCritico({ estadisticaCandidata, estadisticaEquipada }) {
  const numerosCandidato = extraerNumeros(estadisticaCandidata.valor);

  const numerosEquipado = extraerNumeros(estadisticaEquipada.valor);

  if (numerosCandidato.length < 2 || numerosEquipado.length < 2) {
    return crearFilaNeutral({
      estadisticaCandidata,
      estadisticaEquipada,
    });
  }

  // Fórmula usada:
  //
  // 1 + probabilidad × (multiplicador - 1)
  //
  // No representa el DPS completo del arma,
  // pero permite comparar conjuntamente ambos valores.
  const factorCandidato =
    1 + (numerosCandidato[0] / 100) * (numerosCandidato[1] - 1);

  const factorEquipado =
    1 + (numerosEquipado[0] / 100) * (numerosEquipado[1] - 1);

  const diferenciaPorcentual = (factorCandidato - factorEquipado) * 100;

  return crearFilaComparacion({
    estadisticaCandidata,
    estadisticaEquipada,

    tendencia: compararNumeros(factorCandidato, factorEquipado),

    diferencia:
      Math.abs(diferenciaPorcentual) < 0.0001
        ? "Mismo aporte crítico"
        : `${formatearNumeroConSigno(
            diferenciaPorcentual,
          )} % de aporte crítico`,
  });
}

// Compara estadísticas representadas por un único número.
function evaluarNumeroSimple({
  estadisticaCandidata,
  estadisticaEquipada,
  unidad,
}) {
  const numerosCandidato = extraerNumeros(estadisticaCandidata.valor);

  const numerosEquipado = extraerNumeros(estadisticaEquipada.valor);

  if (numerosCandidato.length === 0 || numerosEquipado.length === 0) {
    return crearFilaNeutral({
      estadisticaCandidata,
      estadisticaEquipada,
    });
  }

  const numeroCandidato = numerosCandidato[0];

  const numeroEquipado = numerosEquipado[0];

  const diferencia = numeroCandidato - numeroEquipado;

  return crearFilaComparacion({
    estadisticaCandidata,
    estadisticaEquipada,

    tendencia: compararNumeros(numeroCandidato, numeroEquipado),

    diferencia:
      diferencia === 0
        ? "Sin cambios"
        : `${formatearNumeroConSigno(diferencia)}${unidad}`,
  });
}

// Crea una comparación descriptiva cuando no puede
// determinarse automáticamente qué opción es mejor.
function crearFilaNeutral({ estadisticaCandidata, estadisticaEquipada }) {
  return crearFilaComparacion({
    estadisticaCandidata,
    estadisticaEquipada,

    tendencia: TENDENCIAS_COMPARACION_OBJETO.NEUTRAL,

    diferencia: "Diferente",
  });
}

// Construye una fila común para la futura interfaz.
function crearFilaComparacion({
  estadisticaCandidata,
  estadisticaEquipada,
  tendencia,
  diferencia,
}) {
  return {
    etiqueta: estadisticaCandidata.etiqueta,

    valorCandidato: estadisticaCandidata.valor,

    valorEquipado: estadisticaEquipada.valor,

    tendencia,
    diferencia,
  };
}

// Compara dos números usando una pequeña tolerancia
// para evitar diferencias producidas por decimales.
function compararNumeros(candidato, equipado) {
  const tolerancia = 0.0001;

  if (Math.abs(candidato - equipado) <= tolerancia) {
    return TENDENCIAS_COMPARACION_OBJETO.IGUAL;
  }

  return candidato > equipado
    ? TENDENCIAS_COMPARACION_OBJETO.MEJORA
    : TENDENCIAS_COMPARACION_OBJETO.EMPEORA;
}

// Compara los afijos de ambos objetos.
function compararAfijos({ afijosCandidatos, afijosEquipados }) {
  const equipadosPorClave = new Map(
    afijosEquipados.map((afijo) => [crearClaveAfijo(afijo), afijo]),
  );

  const clavesProcesadas = new Set();

  const cambios = {
    agregados: [],
    perdidos: [],
    modificados: [],
  };

  for (const afijoCandidato of afijosCandidatos) {
    const clave = crearClaveAfijo(afijoCandidato);

    clavesProcesadas.add(clave);

    const afijoEquipado = equipadosPorClave.get(clave) ?? null;

    // El objeto candidato incorpora un afijo nuevo.
    if (afijoEquipado === null) {
      cambios.agregados.push(copiarAfijo(afijoCandidato));

      continue;
    }

    // El mismo afijo mantiene grado y valores.
    if (
      afijosSonIguales({
        afijoCandidato,
        afijoEquipado,
      })
    ) {
      continue;
    }

    // El afijo existe en ambos objetos,
    // pero cambia de grado o de valores.
    cambios.modificados.push({
      candidato: copiarAfijo(afijoCandidato),

      equipado: copiarAfijo(afijoEquipado),
    });
  }

  // Los afijos que existen solamente en el objeto equipado
  // se perderían al reemplazarlo.
  for (const afijoEquipado of afijosEquipados) {
    const clave = crearClaveAfijo(afijoEquipado);

    if (clavesProcesadas.has(clave)) {
      continue;
    }

    cambios.perdidos.push(copiarAfijo(afijoEquipado));
  }

  return cambios;
}

// Genera una identidad estable para comparar afijos.
function crearClaveAfijo(afijo) {
  const tipo = typeof afijo.tipo === "string" ? afijo.tipo : "afijo";

  const identidad =
    typeof afijo.id === "string" && afijo.id.trim() !== ""
      ? afijo.id
      : afijo.nombre;

  return `${tipo}:${identidad}`;
}

// Determina si dos instancias del mismo afijo
// mantienen exactamente su grado y sus efectos.
function afijosSonIguales({ afijoCandidato, afijoEquipado }) {
  if (afijoCandidato.grado !== afijoEquipado.grado) {
    return false;
  }

  return (
    JSON.stringify(afijoCandidato.efectos) ===
    JSON.stringify(afijoEquipado.efectos)
  );
}

// Copia únicamente la información visual necesaria.
// Así evitamos modificar accidentalmente las presentaciones originales.
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

// Extrae números desde textos como:
//
// "4 - 8"
// "12 %"
// "5 % ×1.5"
// "1,25 ataques/s"
function extraerNumeros(valor) {
  const coincidencias = String(valor).match(/[-+]?\d+(?:[.,]\d+)?/g) ?? [];

  return coincidencias
    .map((numero) => Number(numero.replace(",", ".")))
    .filter(Number.isFinite);
}

// Redondea un número a dos decimales
// y agrega el signo positivo cuando corresponde.
function formatearNumeroConSigno(valor) {
  const numeroRedondeado = Math.round(valor * 100) / 100;

  const signo = numeroRedondeado > 0 ? "+" : "";

  return `${signo}${numeroRedondeado}`;
}

// Normaliza las etiquetas para que diferencias de tildes,
// espacios o mayúsculas no rompan la comparación.
function normalizarEtiqueta(etiqueta) {
  return String(etiqueta)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Valida la estructura mínima que necesita el comparador.
//
// Esta validación permite detectar rápidamente si el PresentadorObjeto
// cambia en el futuro y deja de entregar el formato esperado.
function validarPresentacionObjeto(presentacion, nombre) {
  if (
    !presentacion ||
    typeof presentacion !== "object" ||
    typeof presentacion.nombre !== "string" ||
    typeof presentacion.subtitulo !== "string" ||
    !presentacion.rareza ||
    typeof presentacion.rareza.nombre !== "string" ||
    !Number.isInteger(presentacion.nivelObjeto) ||
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
