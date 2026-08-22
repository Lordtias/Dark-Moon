import {
  OBJETIVOS_MODIFICADOR,
} from "../modificadores/ContratosModificadoresCombatiente.js";

import {
  ATRIBUTOS_HABILIDAD,
  ATRIBUTOS_HABILIDAD_RESERVADOS_CORTO_PLAZO,
  ATRIBUTOS_HABILIDAD_VALIDOS,
  validarAtributoHabilidad,
} from "./ContratosAtributosHabilidad.js";

export {
  ATRIBUTOS_HABILIDAD,
  ATRIBUTOS_HABILIDAD_RESERVADOS_CORTO_PLAZO,
  ATRIBUTOS_HABILIDAD_VALIDOS,
  validarAtributoHabilidad,
};

// Genera un snapshot derivado para una única ejecución/vista previa. Nunca
// modifica Habilidades.json ni persiste resultados resueltos.
export function crearConfiguracionHabilidadEfectiva({
  lanzador,
  habilidad,
  gradoConfig,
} = {}) {
  if (!lanzador?.obtenerValorModificado) {
    throw new Error("La configuración efectiva necesita un lanzador modificable.");
  }
  if (!habilidad?.id || !habilidad?.maestria || !habilidad?.ejecucion) {
    throw new Error("La configuración efectiva necesita una habilidad activa válida.");
  }
  if (!gradoConfig || typeof gradoConfig !== "object") {
    throw new Error("La configuración efectiva necesita un grado válido.");
  }

  const efectiva = copiarSimple(gradoConfig);
  const contextoBase = crearContextoBase(habilidad, gradoConfig);

  efectiva.costoMana = resolverAtributo({
    lanzador, contextoBase, atributo: ATRIBUTOS_HABILIDAD.COSTO_MANA,
    valorBase: gradoConfig.costoMana, normalizar: enteroNoNegativo,
  });
  efectiva.costoTemporalBase = resolverAtributo({
    lanzador, contextoBase, atributo: ATRIBUTOS_HABILIDAD.COSTO_TEMPORAL,
    valorBase: gradoConfig.costoTemporalBase, normalizar: enteroPositivo,
  });
  efectiva.alcance = habilidad.ejecucion.ataqueArma?.usaAlcanceArma === true
    ? enteroPositivo(lanzador.alcanceAtaque)
    : resolverAtributo({
        lanzador, contextoBase, atributo: ATRIBUTOS_HABILIDAD.ALCANCE,
        valorBase: gradoConfig.alcance, normalizar: enteroPositivo,
      });

  if (efectiva.ataqueArma) {
    efectiva.ataqueArma.cantidadProyectiles = resolverAtributo({
      lanzador,
      contextoBase,
      atributo: ATRIBUTOS_HABILIDAD.CANTIDAD_PROYECTILES,
      valorBase: gradoConfig.ataqueArma.cantidadProyectiles,
      normalizar: enteroPositivo,
    });
    efectiva.ataqueArma.factorDanioArma = resolverAtributo({
      lanzador,
      contextoBase,
      atributo: ATRIBUTOS_HABILIDAD.FACTOR_DANIO_ARMA,
      valorBase: gradoConfig.ataqueArma.factorDanioArma,
      normalizar: numeroPositivo,
    });
    efectiva.ataqueArma.distanciaDesplazamiento = resolverAtributo({
      lanzador,
      contextoBase,
      atributo: ATRIBUTOS_HABILIDAD.DISTANCIA_DESPLAZAMIENTO,
      valorBase: gradoConfig.ataqueArma.distanciaDesplazamiento,
      normalizar: enteroNoNegativo,
    });
  }

  if (efectiva.formaImpacto) {
    resolverFormaImpacto({ lanzador, contextoBase, forma: efectiva.formaImpacto });
  }

  // El daño base permanece propio de la habilidad. Los modificadores globales
  // de daño se aplican una sola vez en el motor de resolución, nunca durante
  // la construcción de esta instantánea.
  efectiva.danio = (efectiva.danio ?? []).map((componente) => ({ ...componente }));

  efectiva.efectos = (efectiva.efectos ?? []).map((efecto) =>
    resolverEfecto({ lanzador, contextoBase, efecto }),
  );

  if (efectiva.zonaTemporal) {
    efectiva.zonaTemporal.duracion = resolverAtributo({
      lanzador, contextoBase, atributo: ATRIBUTOS_HABILIDAD.DURACION_ZONA,
      valorBase: efectiva.zonaTemporal.duracion, normalizar: enteroPositivo,
    });
    efectiva.zonaTemporal.intervalo = resolverAtributo({
      lanzador, contextoBase, atributo: ATRIBUTOS_HABILIDAD.INTERVALO_ZONA,
      valorBase: efectiva.zonaTemporal.intervalo, normalizar: enteroPositivo,
    });
  }

  return congelarProfundamente(efectiva);
}

function resolverFormaImpacto({ lanzador, contextoBase, forma }) {
  if (forma.tipo === "radio") {
    forma.radio = resolverAtributo({
      lanzador, contextoBase, atributo: ATRIBUTOS_HABILIDAD.RADIO_IMPACTO,
      valorBase: forma.radio, normalizar: enteroPositivo,
    });
  } else if (forma.tipo === "linea") {
    forma.longitud = resolverAtributo({
      lanzador, contextoBase, atributo: ATRIBUTOS_HABILIDAD.LONGITUD_LINEA,
      valorBase: forma.longitud, normalizar: enteroPositivo,
    });
    forma.ancho = resolverAtributo({
      lanzador, contextoBase, atributo: ATRIBUTOS_HABILIDAD.ANCHO_LINEA,
      valorBase: forma.ancho, normalizar: enteroPositivo,
    });
  } else if (forma.tipo === "cadena") {
    forma.maximoObjetivos = resolverAtributo({
      lanzador, contextoBase, atributo: ATRIBUTOS_HABILIDAD.CANTIDAD_OBJETIVOS,
      valorBase: forma.maximoObjetivos, normalizar: enteroPositivo,
    });
    forma.alcanceSalto = resolverAtributo({
      lanzador, contextoBase, atributo: ATRIBUTOS_HABILIDAD.ALCANCE_SALTO,
      valorBase: forma.alcanceSalto, normalizar: enteroPositivo,
    });
    forma.factorDanioPorSalto = resolverAtributo({
      lanzador, contextoBase, atributo: ATRIBUTOS_HABILIDAD.FACTOR_DANIO_POR_SALTO,
      valorBase: forma.factorDanioPorSalto, normalizar: numeroPositivo,
    });
  }
}

function resolverEfecto({ lanzador, contextoBase, efecto }) {
  const copia = copiarSimple(efecto);
  const contextoEfecto = {
    ...contextoBase,
    efectoIdHabilidad: efecto.efectoId ?? null,
    tipoEfectoHabilidad: efecto.tipo ?? null,
  };
  copia.probabilidadBase = resolverAtributo({
    lanzador, contextoBase: contextoEfecto,
    atributo: ATRIBUTOS_HABILIDAD.PROBABILIDAD_EFECTO,
    valorBase: efecto.probabilidadBase, normalizar: porcentaje,
  });
  copia.duracion = resolverAtributo({
    lanzador, contextoBase: contextoEfecto,
    atributo: ATRIBUTOS_HABILIDAD.DURACION_EFECTO,
    valorBase: efecto.duracion, normalizar: enteroPositivo,
  });
  if (Number.isFinite(efecto.intervalo)) {
    copia.intervalo = resolverAtributo({
      lanzador, contextoBase: contextoEfecto,
      atributo: ATRIBUTOS_HABILIDAD.INTERVALO_EFECTO,
      valorBase: efecto.intervalo, normalizar: enteroPositivo,
    });
  }
  copia.maximo = resolverAtributo({
    lanzador, contextoBase: contextoEfecto,
    atributo: ATRIBUTOS_HABILIDAD.MAXIMO_ACUMULACIONES_EFECTO,
    valorBase: efecto.maximo, normalizar: numeroPositivo,
  });
  copia.incremento = resolverAtributo({
    lanzador, contextoBase: contextoEfecto,
    atributo: ATRIBUTOS_HABILIDAD.INCREMENTO_ACUMULACION_EFECTO,
    valorBase: efecto.incremento, normalizar: numeroPositivo,
  });

  if (efecto.tipo === "danio_periodico" && Number.isFinite(efecto.valorBase)) {
    // El daño periódico pertenece al efecto. No hereda Daño Mágico, Daño de
    // Habilidad ni bonificaciones de daño por afinidad de la acción origen.
    copia.valorBase = efecto.valorBase;
  }

  if (Array.isArray(efecto.modificadores)) {
    copia.modificadores = efecto.modificadores.map((descriptor) => ({
      ...descriptor,
      valor: resolverAtributo({
        lanzador,
        contextoBase: {
          ...contextoEfecto,
          objetivoModificadorEfecto: descriptor.objetivo,
        },
        atributo: ATRIBUTOS_HABILIDAD.MAGNITUD_MODIFICADOR_EFECTO,
        valorBase: descriptor.valor,
        normalizar: numeroFinito,
      }),
    }));
  }
  if (efecto.emision && Number.isFinite(efecto.emision.radio)) {
    copia.emision = {
      ...efecto.emision,
      radio: resolverAtributo({
        lanzador, contextoBase: contextoEfecto,
        atributo: ATRIBUTOS_HABILIDAD.RADIO_AURA,
        valorBase: efecto.emision.radio, normalizar: enteroNoNegativo,
      }),
    };
  }
  return copia;
}

function resolverAtributo({ lanzador, contextoBase, atributo, valorBase, normalizar }) {
  validarAtributoHabilidad(atributo);
  if (!Number.isFinite(valorBase)) return valorBase;
  const resultado = lanzador.obtenerValorModificado(
    OBJETIVOS_MODIFICADOR.ATRIBUTO_HABILIDAD,
    valorBase,
    { ...contextoBase, atributoHabilidad: atributo },
  );
  return normalizar(resultado);
}

function crearContextoBase(habilidad, gradoConfig) {
  return {
    idHabilidad: habilidad.id,
    maestriaHabilidad: habilidad.maestria,
    tipoObjetivoHabilidad: habilidad.ejecucion.tipoObjetivo,
    formaImpactoHabilidad: gradoConfig.formaImpacto?.tipo ?? "individual",
  };
}

function numeroFinito(valor) {
  if (!Number.isFinite(valor)) throw new Error("El atributo de habilidad produjo un valor inválido.");
  return valor;
}
function numeroNoNegativo(valor) { return Math.max(0, numeroFinito(valor)); }
function numeroPositivo(valor) { return Math.max(Number.EPSILON, numeroFinito(valor)); }
function enteroNoNegativo(valor) { return Math.max(0, Math.round(numeroFinito(valor))); }
function enteroPositivo(valor) { return Math.max(1, Math.round(numeroFinito(valor))); }
function porcentaje(valor) { return Math.max(0, Math.min(100, numeroFinito(valor))); }

function copiarSimple(valor) {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map(copiarSimple);
  return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, copiarSimple(v)]));
}
function congelarProfundamente(valor) {
  if (!valor || typeof valor !== "object" || Object.isFrozen(valor)) return valor;
  Object.values(valor).forEach(congelarProfundamente);
  return Object.freeze(valor);
}
