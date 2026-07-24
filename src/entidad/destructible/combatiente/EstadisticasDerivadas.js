import { CONFIGURACION_COMBATE } from "../../../config/ConfiguracionCombate.js";
import { obtenerConfiguracionAtaque } from "./ConfiguracionAtaque.js";
import {
  TIPOS_DANIO,
  normalizarResistencia,
} from "../../../juego/combate/ComponentesDanio.js";

const RESISTENCIAS = ["fuego", "frio", "rayo", "veneno"];

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function sumarPropiedad(objetos, propiedad) {
  return objetos.reduce((total, objeto) => {
    const valor = objeto?.propiedades?.[propiedad] ?? 0;
    return total + (Number.isFinite(valor) ? valor : 0);
  }, 0);
}

function multiplicarBonosMas(objetos, propiedad) {
  return objetos.reduce((multiplicador, objeto) => {
    const valor = objeto?.propiedades?.[propiedad] ?? 0;
    if (!Number.isFinite(valor)) {
      return multiplicador;
    }

    return multiplicador * (1 + valor / 100);
  }, 1);
}

function obtenerObjetosEquipados(combatiente) {
  return combatiente.equipamiento?.obtenerObjetosEquipados() ?? [];
}

// Calcula Vida y Maná sin necesitar
// una instancia completa de Combatiente.
export function calcularRecursosMaximos({
  nivel,
  atributos,
  estadisticasBase,
  objetosEquipados = [],
} = {}) {
  const coeficientes = CONFIGURACION_COMBATE.atributos;
  const vidaMaxima = Math.max(
    1,
    estadisticasBase.vida +
      (nivel - 1) * estadisticasBase.vidaPorNivel +
      coeficientes.vidaPorConstitucion * atributos.constitucion +
      sumarPropiedad(objetosEquipados, "vidaMaxima"),
  );
  const manaMaximo = Math.max(
    0,
    estadisticasBase.mana +
      (nivel - 1) * estadisticasBase.manaPorNivel +
      coeficientes.manaPorInteligencia * atributos.inteligencia +
      sumarPropiedad(objetosEquipados, "manaMaximo"),
  );

  return {
    vidaMaxima: Math.round(vidaMaxima),
    manaMaximo: Math.round(manaMaximo),
  };
}

// Crea las estadísticas específicas
// de un golpe individual.
//
// Cada mano utiliza:
//
// - Su propio daño.
// - Su propio atributo.
// - Su propia precisión.
// - Su propio crítico.
// - Su propio multiplicador dual.
function calcularComponenteDanio(combatiente, fuente, objetos) {
  const propiedades = fuente.propiedades;
  const base = combatiente.estadisticasBase;
  const atributos = combatiente.atributos;
  const coeficientes = CONFIGURACION_COMBATE.atributos;
  const minimoBase = propiedades.danioFisicoMinimo;
  const maximoBase = propiedades.danioFisicoMaximo;
  const planoLocalMinimo = propiedades.danioFisicoLocalMinimo ?? 0;
  const planoLocalMaximo = propiedades.danioFisicoLocalMaximo ?? 0;
  const porcentajeLocal =
    (propiedades.danioFisicoLocalPorcentaje ?? 0) / 100;
  const minimoLocal = Math.max(
    0,
    Math.floor((minimoBase + planoLocalMinimo) * (1 + porcentajeLocal)),
  );
  const maximoLocal = Math.max(
    minimoLocal,
    Math.ceil((maximoBase + planoLocalMaximo) * (1 + porcentajeLocal)),
  );
  const atributoOfensivo = propiedades.atributoAtaque;
  const valorAtributo = atributos[atributoOfensivo] ?? 10;
  const bonoAtributo =
    coeficientes.danioPorPuntoRespectoDiez * (valorAtributo - 10);
  const multiplicadorAtributo = Math.max(0, 1 + bonoAtributo);
  const precision =
    base.precision +
    coeficientes.precisionPorDestreza * atributos.destreza +
    (propiedades.precision ?? 0) +
    sumarPropiedad(objetos, "precisionGlobal");
  const probabilidadCritico = limitar(
    (propiedades.probabilidadCritico ?? base.probabilidadCritico) +
      sumarPropiedad(objetos, "probabilidadCriticoGlobal"),
    0,
    CONFIGURACION_COMBATE.limites.criticoMaximo,
  );
  const multiplicadorCritico =
    (propiedades.multiplicadorCritico ?? base.multiplicadorCritico) +
    sumarPropiedad(objetos, "multiplicadorCriticoAdicional");

  return {
    nombre: fuente.nombre,
    objeto: fuente.objeto,
    mano: fuente.mano,
    multiplicadorGolpe: fuente.multiplicadorGolpe,
    atributoOfensivo,
    valorAtributo,
    minimoLocal,
    maximoLocal,
    bonoAtributo,
    multiplicadorAtributo,
    precision,
    probabilidadCritico,
    multiplicadorCritico,

    // Compatibilidad hacia adelante:
    // cada golpe físico antiguo queda representado como
    // una fuente que contiene un componente tipado físico.
    componentesDanio: [
      {
        tipo: TIPOS_DANIO.FISICO,
        minimoLocal,
        maximoLocal,
        multiplicadorAtributo,
        aplicaDanioPlanoGlobal: true,
        aplicaMultiplicadorGlobal: true,
        aplicaCritico: true,
      },
    ],
  };
}

function calcularDanioFisico(combatiente, objetos, configuracionAtaque) {
  const componentesBase = configuracionAtaque.fuentesDanio.map((fuente) =>
    calcularComponenteDanio(combatiente, fuente, objetos),
  );
  const danioPlanoGlobalMinimo = sumarPropiedad(
    objetos,
    "danioFisicoGlobalMinimo",
  );
  const danioPlanoGlobalMaximo = sumarPropiedad(
    objetos,
    "danioFisicoGlobalMaximo",
  );
  const danioAumentadoGlobal =
    sumarPropiedad(objetos, "danioFisicoAumentadoPorcentaje") / 100;
  const multiplicadorAumentadoGlobal = Math.max(
    0,
    1 + danioAumentadoGlobal,
  );
  const multiplicadorMasGlobal = multiplicarBonosMas(
    objetos,
    "danioFisicoMasPorcentaje",
  );
  const multiplicadorGlobal =
    multiplicadorAumentadoGlobal * multiplicadorMasGlobal;

  // Cada componente recibe una porción del daño
  // global según el multiplicador de su mano.
  //
  // Con 60% + 40%, el daño plano global total
  // no se duplica por usar dos armas.
  const componentes = componentesBase.map((componente) => {
    const minimo = Math.max(
      0,
      (componente.minimoLocal * componente.multiplicadorAtributo +
        danioPlanoGlobalMinimo) *
        componente.multiplicadorGolpe *
        multiplicadorGlobal,
    );
    const maximo = Math.max(
      minimo,
      (componente.maximoLocal * componente.multiplicadorAtributo +
        danioPlanoGlobalMaximo) *
        componente.multiplicadorGolpe *
        multiplicadorGlobal,
    );

    return {
      ...componente,
      minimo,
      maximo,
      promedio: (minimo + maximo) / 2,
    };
  });
  const minimoFinal = componentes.reduce(
    (total, componente) => total + componente.minimo,
    0,
  );
  const maximoFinal = componentes.reduce(
    (total, componente) => total + componente.maximo,
    0,
  );

  return {
    esAtaqueDual: configuracionAtaque.esAtaqueDual,
    cantidadGolpes: configuracionAtaque.cantidadGolpes,
    componentes,
    danioPlanoGlobal: {
      minimo: danioPlanoGlobalMinimo,
      maximo: danioPlanoGlobalMaximo,
    },
    danioAumentadoGlobal,
    multiplicadorMasGlobal,
    multiplicadorGlobal,
    minimo: Math.max(0, minimoFinal),
    maximo: Math.max(minimoFinal, maximoFinal),
    promedio: (minimoFinal + maximoFinal) / 2,
  };
}

export function calcularEstadisticasDerivadas(combatiente) {
  const objetos = obtenerObjetosEquipados(combatiente);
  const base = combatiente.estadisticasBase;
  const atributos = combatiente.atributos;
  const coeficientes = CONFIGURACION_COMBATE.atributos;
  const configuracionAtaque = obtenerConfiguracionAtaque(combatiente);
  const ataqueControlador = configuracionAtaque.propiedadesControladoras;
  const recursos = calcularRecursosMaximos({
    nivel: combatiente.nivel,
    atributos,
    estadisticasBase: base,
    objetosEquipados: objetos,
  });
  const regeneracionVida = Math.max(
    0,
    base.regeneracionVida +
      coeficientes.regeneracionVidaPorConstitucion *
        (atributos.constitucion - 10) +
      sumarPropiedad(objetos, "regeneracionVida") +
      recursos.vidaMaxima *
        (sumarPropiedad(objetos, "regeneracionVidaPorcentaje") / 100),
  );
  const regeneracionMana = Math.max(
    0,
    base.regeneracionMana +
      coeficientes.regeneracionManaPorSabiduria *
        (atributos.sabiduria - 10) +
      sumarPropiedad(objetos, "regeneracionMana") +
      recursos.manaMaximo *
        (sumarPropiedad(objetos, "regeneracionManaPorcentaje") / 100),
  );
  const resistencias = {};

  for (const resistencia of RESISTENCIAS) {
    const nombrePropiedad =
      `resistencia${resistencia[0].toUpperCase()}` + resistencia.slice(1);
    let valor =
      base.resistencias[resistencia] +
      coeficientes.resistenciaElementalPorSabiduria *
        (atributos.sabiduria - 10) +
      sumarPropiedad(objetos, nombrePropiedad);

    if (resistencia === "veneno") {
      valor +=
        coeficientes.resistenciaVenenoPorConstitucion *
        (atributos.constitucion - 10);
    }

    resistencias[resistencia] = normalizarResistencia(
      valor,
      `La resistencia derivada a ${resistencia}`,
    );
  }

  const armaduraPlana = base.armadura + sumarPropiedad(objetos, "armadura");
  const armaduraPorcentual =
    sumarPropiedad(objetos, "armaduraAumentadaPorcentaje") / 100;

  return {
    ...recursos,
    regeneracionVida,
    regeneracionMana,

    // Estas estadísticas generales continúan
    // representando el arma controladora.
    //
    // El combate dual utiliza además los valores
    // específicos guardados en cada componente.
    precision:
      base.precision +
      coeficientes.precisionPorDestreza * atributos.destreza +
      (ataqueControlador.precision ?? 0) +
      sumarPropiedad(objetos, "precisionGlobal"),
    evasion:
      base.evasion +
      coeficientes.evasionPorDestreza * atributos.destreza +
      sumarPropiedad(objetos, "evasion"),
    armadura: Math.max(
      0,
      Math.round(armaduraPlana * (1 + armaduraPorcentual)),
    ),
    probabilidadCritico: limitar(
      (ataqueControlador.probabilidadCritico ?? base.probabilidadCritico) +
        sumarPropiedad(objetos, "probabilidadCriticoGlobal"),
      0,
      CONFIGURACION_COMBATE.limites.criticoMaximo,
    ),
    multiplicadorCritico:
      (ataqueControlador.multiplicadorCritico ??
        base.multiplicadorCritico) +
      sumarPropiedad(objetos, "multiplicadorCriticoAdicional"),
    probabilidadBloqueo: limitar(
      base.probabilidadBloqueo +
        sumarPropiedad(objetos, "probabilidadBloqueo"),
      0,
      CONFIGURACION_COMBATE.limites.bloqueoMaximo,
    ),
    mitigacionBloqueo: limitar(
      sumarPropiedad(objetos, "mitigacionBloqueo"),
      0,
      CONFIGURACION_COMBATE.limites.mitigacionBloqueoMaxima,
    ),
    potenciaEfectos:
      base.potenciaEfectos +
      coeficientes.potenciaEfectosPorSabiduria * atributos.sabiduria,
    resistenciaMental:
      base.resistenciaMental +
      coeficientes.resistenciaMentalPorSabiduria * atributos.sabiduria,
    potenciaAura:
      base.potenciaAura +
      coeficientes.potenciaAuraPorCarisma * atributos.carisma,
    resistencias,
    danioFisico: calcularDanioFisico(
      combatiente,
      objetos,
      configuracionAtaque,
    ),
  };
}
