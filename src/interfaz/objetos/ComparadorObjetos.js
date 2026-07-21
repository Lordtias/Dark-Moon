// Estados visuales que puede producir una diferencia.
//
// La vista utiliza estos valores para aplicar colores sin conocer
// cómo se calculó cada estadística.
export const TENDENCIAS_COMPARACION_OBJETO = Object.freeze({
  MEJORA: "mejora",
  EMPEORA: "empeora",
  AGREGADA: "agregada",
  PERDIDA: "perdida",
});

// Reglas de las estadísticas que pueden compararse de forma objetiva.
//
// Las propiedades descriptivas, como Atributo, Tipo de ataque o Patrón,
// no se califican como mejores o peores porque dependen del contexto.
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
    unidad: " % crítico",
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

// Construye una comparación compacta entre el objeto inspeccionado
// y los objetos que dejarían de aportar estadísticas al equiparlo.
//
// El primer objeto desplazado actúa como referencia principal.
// Los siguientes solamente agregan propiedades que la referencia
// principal no tenía.
//
// Esto permite mostrar, por ejemplo, la pérdida de Armadura y Bloqueo
// de un escudo al equipar un arma de dos manos, sin sumar
// incorrectamente el daño de dos armas distintas.
export function crearComparacionObjetos({
  presentacionCandidata,
  presentacionesDesplazadas = [],
} = {}) {
  validarPresentacionObjeto(presentacionCandidata, "candidata");

  if (!Array.isArray(presentacionesDesplazadas)) {
    throw new Error("Las presentaciones desplazadas deben ser una lista.");
  }

  for (const presentacion of presentacionesDesplazadas) {
    validarPresentacionObjeto(presentacion, "desplazada");
  }

  if (presentacionesDesplazadas.length === 0) {
    return crearComparacionVacia();
  }

  const estadisticasReferencia = crearMapaEstadisticasReferencia(
    presentacionesDesplazadas,
  );

  const resultadoEstadisticas = compararEstadisticas({
    estadisticasCandidatas: presentacionCandidata.estadisticas,

    estadisticasReferencia,
  });

  return {
    disponible: true,

    diferenciasEstadisticas: resultadoEstadisticas.diferencias,

    filasAdicionales: resultadoEstadisticas.filasAdicionales,

    cambiosAfijos: compararAfijos({
      afijosCandidatos: presentacionCandidata.afijos,

      afijosDesplazados: presentacionesDesplazadas.flatMap(
        (presentacion) => presentacion.afijos,
      ),
    }),
  };
}

function crearComparacionVacia() {
  return {
    disponible: false,
    diferenciasEstadisticas: [],
    filasAdicionales: [],

    cambiosAfijos: {
      agregados: [],
      perdidos: [],
      modificados: [],
    },
  };
}

// Conserva todas las estadísticas del primer objeto desplazado.
//
// De los objetos adicionales se incorporan únicamente propiedades
// nuevas. De esta forma un escudo puede aportar Armadura y Bloqueo
// a la comparación, pero una segunda arma no duplica Daño físico,
// Precisión o Crítico de manera matemáticamente incorrecta.
function crearMapaEstadisticasReferencia(presentaciones) {
  const mapa = new Map();

  for (const presentacion of presentaciones) {
    for (const estadistica of presentacion.estadisticas) {
      const clave = normalizarEtiqueta(estadistica.etiqueta);

      if (!mapa.has(clave)) {
        mapa.set(clave, estadistica);
      }
    }
  }

  return mapa;
}

function compararEstadisticas({
  estadisticasCandidatas,
  estadisticasReferencia,
}) {
  const diferencias = [];
  const filasAdicionales = [];
  const clavesCandidatas = new Set();

  for (const estadisticaCandidata of estadisticasCandidatas) {
    const clave = normalizarEtiqueta(estadisticaCandidata.etiqueta);

    clavesCandidatas.add(clave);

    const regla = REGLAS_ESTADISTICAS[clave];

    // Las propiedades descriptivas no generan una diferencia.
    if (!regla) {
      continue;
    }

    const estadisticaReferencia = estadisticasReferencia.get(clave) ?? null;

    const diferencia = evaluarDiferencia({
      regla,
      estadisticaCandidata,
      estadisticaReferencia,
    });

    if (diferencia !== null) {
      diferencias.push({
        etiqueta: estadisticaCandidata.etiqueta,

        ...diferencia,
      });
    }
  }

  // Una propiedad que solo estaba en el equipamiento actual
  // debe aparecer como una fila compacta con valor nuevo "—".
  for (const [
    clave,
    estadisticaReferencia,
  ] of estadisticasReferencia.entries()) {
    if (clavesCandidatas.has(clave)) {
      continue;
    }

    const regla = REGLAS_ESTADISTICAS[clave];

    if (!regla) {
      continue;
    }

    const diferencia = evaluarDiferenciaPerdida({
      regla,
      estadisticaReferencia,
    });

    if (diferencia === null) {
      continue;
    }

    filasAdicionales.push({
      etiqueta: estadisticaReferencia.etiqueta,

      valor: "—",

      ...diferencia,
    });
  }

  return {
    diferencias,
    filasAdicionales,
  };
}

function evaluarDiferencia({
  regla,
  estadisticaCandidata,
  estadisticaReferencia,
}) {
  switch (regla.tipo) {
    case "rangoDanio":
      return evaluarRangoDanio({
        valorCandidato: estadisticaCandidata.valor,

        valorReferencia: estadisticaReferencia?.valor ?? null,

        unidad: regla.unidad,
      });

    case "critico":
      return evaluarCritico({
        valorCandidato: estadisticaCandidata.valor,

        valorReferencia: estadisticaReferencia?.valor ?? null,

        unidad: regla.unidad,
      });

    case "numero":
      return evaluarNumeroSimple({
        valorCandidato: estadisticaCandidata.valor,

        valorReferencia: estadisticaReferencia?.valor ?? null,

        unidad: regla.unidad,
      });

    default:
      return null;
  }
}

function evaluarDiferenciaPerdida({ regla, estadisticaReferencia }) {
  switch (regla.tipo) {
    case "rangoDanio":
      return evaluarRangoDanio({
        valorCandidato: null,

        valorReferencia: estadisticaReferencia.valor,

        unidad: regla.unidad,
      });

    case "critico":
      return evaluarCritico({
        valorCandidato: null,

        valorReferencia: estadisticaReferencia.valor,

        unidad: regla.unidad,
      });

    case "numero":
      return evaluarNumeroSimple({
        valorCandidato: null,

        valorReferencia: estadisticaReferencia.valor,

        unidad: regla.unidad,
      });

    default:
      return null;
  }
}

function evaluarRangoDanio({ valorCandidato, valorReferencia, unidad }) {
  const promedioCandidato =
    valorCandidato === null ? 0 : obtenerPromedioRango(valorCandidato);

  const promedioReferencia =
    valorReferencia === null ? 0 : obtenerPromedioRango(valorReferencia);

  if (promedioCandidato === null || promedioReferencia === null) {
    return null;
  }

  return crearResultadoNumerico({
    diferencia: promedioCandidato - promedioReferencia,

    unidad,
  });
}

function evaluarNumeroSimple({ valorCandidato, valorReferencia, unidad }) {
  const numeroCandidato =
    valorCandidato === null ? 0 : obtenerPrimerNumero(valorCandidato);

  const numeroReferencia =
    valorReferencia === null ? 0 : obtenerPrimerNumero(valorReferencia);

  if (numeroCandidato === null || numeroReferencia === null) {
    return null;
  }

  return crearResultadoNumerico({
    diferencia: numeroCandidato - numeroReferencia,

    unidad,
  });
}

function evaluarCritico({ valorCandidato, valorReferencia, unidad }) {
  const aporteCandidato =
    valorCandidato === null ? 0 : obtenerAporteCritico(valorCandidato);

  const aporteReferencia =
    valorReferencia === null ? 0 : obtenerAporteCritico(valorReferencia);

  if (aporteCandidato === null || aporteReferencia === null) {
    return null;
  }

  return crearResultadoNumerico({
    diferencia: aporteCandidato - aporteReferencia,

    unidad,
  });
}

function crearResultadoNumerico({ diferencia, unidad }) {
  const tolerancia = 0.0001;

  if (Math.abs(diferencia) <= tolerancia) {
    return null;
  }

  return {
    tendencia:
      diferencia > 0
        ? TENDENCIAS_COMPARACION_OBJETO.MEJORA
        : TENDENCIAS_COMPARACION_OBJETO.EMPEORA,

    diferencia: `${formatearNumeroConSigno(diferencia)}${unidad}`,
  };
}

function obtenerPromedioRango(valor) {
  const numeros = extraerNumeros(valor);

  if (numeros.length < 2) {
    return null;
  }

  return (numeros[0] + numeros[1]) / 2;
}

function obtenerPrimerNumero(valor) {
  const numeros = extraerNumeros(valor);

  return numeros.length > 0 ? numeros[0] : null;
}

// Devuelve cuánto daño medio adicional aporta el crítico,
// expresado en puntos porcentuales.
//
// Ejemplo:
// 6 % × 1,60 produce 3,6 puntos porcentuales de aporte.
function obtenerAporteCritico(valor) {
  const numeros = extraerNumeros(valor);

  if (numeros.length < 2) {
    return null;
  }

  const probabilidad = numeros[0] / 100;

  const multiplicador = numeros[1];

  return probabilidad * (multiplicador - 1) * 100;
}

function compararAfijos({ afijosCandidatos, afijosDesplazados }) {
  const desplazadosPorClave = new Map();

  for (const afijo of afijosDesplazados) {
    const clave = crearClaveAfijo(afijo);

    if (!desplazadosPorClave.has(clave)) {
      desplazadosPorClave.set(clave, afijo);
    }
  }

  const clavesProcesadas = new Set();

  const cambios = {
    agregados: [],
    perdidos: [],
    modificados: [],
  };

  for (const afijoCandidato of afijosCandidatos) {
    const clave = crearClaveAfijo(afijoCandidato);

    clavesProcesadas.add(clave);

    const afijoDesplazado = desplazadosPorClave.get(clave) ?? null;

    if (afijoDesplazado === null) {
      cambios.agregados.push(copiarAfijo(afijoCandidato));

      continue;
    }

    if (
      !afijosSonIguales({
        afijoCandidato,
        afijoDesplazado,
      })
    ) {
      cambios.modificados.push({
        candidato: copiarAfijo(afijoCandidato),

        equipado: copiarAfijo(afijoDesplazado),
      });
    }
  }

  for (const [clave, afijoDesplazado] of desplazadosPorClave.entries()) {
    if (clavesProcesadas.has(clave)) {
      continue;
    }

    cambios.perdidos.push(copiarAfijo(afijoDesplazado));
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

function afijosSonIguales({ afijoCandidato, afijoDesplazado }) {
  return (
    afijoCandidato.grado === afijoDesplazado.grado &&
    JSON.stringify(afijoCandidato.efectos) ===
      JSON.stringify(afijoDesplazado.efectos)
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

  const texto = String(redondeado).replace(".", ",");

  return `${signo}${texto}`;
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
