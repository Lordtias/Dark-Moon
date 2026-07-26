import { CONFIGURACION_COMBATE } from "../../../config/ConfiguracionCombate.js";
import { obtenerConfiguracionAtaque } from "./ConfiguracionAtaque.js";
import {
  TIPOS_DANIO,
  normalizarResistencia,
  normalizarTipoDanio,
} from "../../../juego/combate/ComponentesDanio.js";
import {
  calcularManaMaximo,
  calcularMultiplicadorDanioMagico,
  calcularMultiplicadorEfectos,
  calcularRegeneracionMana,
} from "../../../juego/magia/CalculadorAtributosMagicos.js";
import { esVarita } from "../../../juego/magia/SistemaCatalizadores.js";

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
    if (!Number.isFinite(valor)) return multiplicador;
    return multiplicador * (1 + valor / 100);
  }, 1);
}

function obtenerObjetosEquipados(combatiente) {
  return combatiente.equipamiento?.obtenerObjetosEquipados() ?? [];
}

// Calcula Vida y Maná sin necesitar una instancia completa de Combatiente.
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
  const manaMaximo = calcularManaMaximo({
    manaBase: estadisticasBase.mana,
    manaPorNivel: estadisticasBase.manaPorNivel,
    nivel,
    atributos,
    bonificacionPlana: sumarPropiedad(objetosEquipados, "manaMaximo"),
  });
  return {
    vidaMaxima: Math.round(vidaMaxima),
    manaMaximo,
  };
}

function crearDescriptorDanioFisico({
  minimoLocal,
  maximoLocal,
  multiplicadorAtributo,
}) {
  return {
    tipo: TIPOS_DANIO.FISICO,
    minimoLocal,
    maximoLocal,
    multiplicadorAtributo,
    aplicaDanioPlanoGlobal: true,
    aplicaMultiplicadorGlobal: true,
    aplicaCritico: true,
  };
}

function crearDescriptorDescargaVarita({ propiedades, atributos }) {
  const tipo = normalizarTipoDanio(propiedades.elementoAtaqueBasico);
  if (tipo === TIPOS_DANIO.FISICO) {
    throw new Error("El ataque básico de una varita debe ser elemental.");
  }

  const minimoLocal = propiedades.danioElementalMinimo;
  const maximoLocal = propiedades.danioElementalMaximo;
  if (
    !Number.isFinite(minimoLocal) ||
    minimoLocal < 0 ||
    !Number.isFinite(maximoLocal) ||
    maximoLocal < minimoLocal
  ) {
    throw new Error("El rango elemental de la varita no es válido.");
  }

  return {
    tipo,
    minimoLocal,
    maximoLocal,
    // El ataque básico mágico utiliza la estadística mágica vigente. La
    // Potencia de Habilidad queda reservada exclusivamente para habilidades.
    multiplicadorAtributo: calcularMultiplicadorDanioMagico(atributos),
    aplicaDanioPlanoGlobal: false,
    aplicaMultiplicadorGlobal: false,
    aplicaCritico: true,
  };
}

// Crea las estadísticas específicas de una fuente individual. Cada mano
// conserva su precisión, crítico y multiplicador dual del motor existente.
function calcularComponenteDanio(combatiente, fuente, objetos) {
  const propiedades = fuente.propiedades;
  const base = combatiente.estadisticasBase;
  const atributos = combatiente.atributos;
  const coeficientes = CONFIGURACION_COMBATE.atributos;
  const fuenteEsVarita = esVarita(fuente.objeto);

  let minimoLocal;
  let maximoLocal;
  let multiplicadorAtributo;
  let bonoAtributo;
  let descriptorDanio;

  const atributoOfensivo = propiedades.atributoAtaque;
  const valorAtributo = atributos[atributoOfensivo] ?? 10;

  if (fuenteEsVarita) {
    descriptorDanio = crearDescriptorDescargaVarita({ propiedades, atributos });
    minimoLocal = descriptorDanio.minimoLocal;
    maximoLocal = descriptorDanio.maximoLocal;
    multiplicadorAtributo = descriptorDanio.multiplicadorAtributo;
    bonoAtributo = multiplicadorAtributo - 1;
  } else {
    const minimoBase = propiedades.danioFisicoMinimo;
    const maximoBase = propiedades.danioFisicoMaximo;
    const planoLocalMinimo = propiedades.danioFisicoLocalMinimo ?? 0;
    const planoLocalMaximo = propiedades.danioFisicoLocalMaximo ?? 0;
    const porcentajeLocal = (propiedades.danioFisicoLocalPorcentaje ?? 0) / 100;
    minimoLocal = Math.max(
      0,
      Math.floor((minimoBase + planoLocalMinimo) * (1 + porcentajeLocal)),
    );
    maximoLocal = Math.max(
      minimoLocal,
      Math.ceil((maximoBase + planoLocalMaximo) * (1 + porcentajeLocal)),
    );
    bonoAtributo =
      coeficientes.danioPorPuntoRespectoDiez * (valorAtributo - 10);
    multiplicadorAtributo = Math.max(0, 1 + bonoAtributo);
    descriptorDanio = crearDescriptorDanioFisico({
      minimoLocal,
      maximoLocal,
      multiplicadorAtributo,
    });
  }

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
    esAtaqueMagicoBasico: fuenteEsVarita,
    componentesDanio: [descriptorDanio],
  };
}

// El nombre se conserva por compatibilidad con los consumidores existentes,
// aunque sus fuentes pueden ser físicas o elementales.
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
  const multiplicadorAumentadoGlobal = Math.max(0, 1 + danioAumentadoGlobal);
  const multiplicadorMasGlobal = multiplicarBonosMas(
    objetos,
    "danioFisicoMasPorcentaje",
  );
  const multiplicadorGlobal =
    multiplicadorAumentadoGlobal * multiplicadorMasGlobal;

  const componentes = componentesBase.map((componente) => {
    const descriptor = componente.componentesDanio[0];
    const aplicaPlanoFisico = descriptor.aplicaDanioPlanoGlobal === true;
    const aplicaMultiplicadorFisico =
      descriptor.aplicaMultiplicadorGlobal === true;
    const planoMinimo = aplicaPlanoFisico ? danioPlanoGlobalMinimo : 0;
    const planoMaximo = aplicaPlanoFisico ? danioPlanoGlobalMaximo : 0;
    const multiplicadorFinal = aplicaMultiplicadorFisico
      ? multiplicadorGlobal
      : 1;
    const minimo = Math.max(
      0,
      (componente.minimoLocal * componente.multiplicadorAtributo +
        planoMinimo) *
        componente.multiplicadorGolpe *
        multiplicadorFinal,
    );
    const maximo = Math.max(
      minimo,
      (componente.maximoLocal * componente.multiplicadorAtributo +
        planoMaximo) *
        componente.multiplicadorGolpe *
        multiplicadorFinal,
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
  const regeneracionMana = calcularRegeneracionMana({
    regeneracionBase: base.regeneracionMana,
    sabiduria: atributos.sabiduria,
    bonificacionPlana: sumarPropiedad(objetos, "regeneracionMana"),
    manaMaximo: recursos.manaMaximo,
    bonificacionPorcentual: sumarPropiedad(
      objetos,
      "regeneracionManaPorcentaje",
    ),
  });
  const multiplicadorDanioMagico = calcularMultiplicadorDanioMagico(atributos);
  const multiplicadorEfectosAtributos = calcularMultiplicadorEfectos(atributos);
  const potenciaEfectosAdicional =
    base.potenciaEfectos + sumarPropiedad(objetos, "potenciaEfectos");
  const multiplicadorEfectos = Math.max(
    0.01,
    multiplicadorEfectosAtributos * (1 + potenciaEfectosAdicional / 100),
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
    multiplicadorDanioMagico,
    bonificacionDanioMagicoPorcentaje: (multiplicadorDanioMagico - 1) * 100,
    multiplicadorEfectos,
    bonificacionEfectosPorcentaje: (multiplicadorEfectos - 1) * 100,
    potenciaEfectos: (multiplicadorEfectos - 1) * 100,
    precision:
      base.precision +
      coeficientes.precisionPorDestreza * atributos.destreza +
      (ataqueControlador.precision ?? 0) +
      sumarPropiedad(objetos, "precisionGlobal"),
    evasion:
      base.evasion +
      coeficientes.evasionPorDestreza * atributos.destreza +
      sumarPropiedad(objetos, "evasion"),
    armadura: Math.max(0, Math.round(armaduraPlana * (1 + armaduraPorcentual))),
    probabilidadCritico: limitar(
      (ataqueControlador.probabilidadCritico ?? base.probabilidadCritico) +
        sumarPropiedad(objetos, "probabilidadCriticoGlobal"),
      0,
      CONFIGURACION_COMBATE.limites.criticoMaximo,
    ),
    multiplicadorCritico:
      (ataqueControlador.multiplicadorCritico ?? base.multiplicadorCritico) +
      sumarPropiedad(objetos, "multiplicadorCriticoAdicional"),
    probabilidadBloqueo: limitar(
      base.probabilidadBloqueo + sumarPropiedad(objetos, "probabilidadBloqueo"),
      0,
      CONFIGURACION_COMBATE.limites.bloqueoMaximo,
    ),
    mitigacionBloqueo: limitar(
      sumarPropiedad(objetos, "mitigacionBloqueo"),
      0,
      CONFIGURACION_COMBATE.limites.mitigacionBloqueoMaxima,
    ),
    resistenciaMental:
      base.resistenciaMental +
      coeficientes.resistenciaMentalPorSabiduria * atributos.sabiduria,
    potenciaAura:
      base.potenciaAura +
      coeficientes.potenciaAuraPorCarisma * atributos.carisma,
    resistencias,
    danioFisico: calcularDanioFisico(combatiente, objetos, configuracionAtaque),
  };
}
