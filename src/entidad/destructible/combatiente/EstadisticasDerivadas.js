import { limitar } from "../../../utilidades/Numeros.js";
import { CONFIGURACION_COMBATE } from "../../../config/ConfiguracionCombate.js";
import { obtenerConfiguracionAtaque } from "./ConfiguracionAtaque.js";
import {
  TIPOS_DANIO,
  crearDescriptoresDanioElementalLocal,
  normalizarResistencia,
  normalizarTipoDanio,
} from "../../../juego/combate/ComponentesDanio.js";
import {
  calcularManaMaximo,
  calcularMultiplicadorDanioMagico,
  calcularMultiplicadorEfectos,
  calcularRegeneracionMana,
} from "../../../juego/magia/CalculadorAtributosMagicos.js";
import {
  IDS_RESISTENCIA_EFECTO,
  PROPIEDAD_RESISTENCIA_EFECTO,
  calcularBonoResistenciasEfectosPorConstitucion,
  normalizarResistenciaEfecto,
} from "../../../juego/efectos/ResistenciasEfectos.js";
import { esVarita } from "../../../juego/magia/SistemaCatalizadores.js";
import { OBJETIVOS_MODIFICADOR } from "../../../juego/modificadores/ContratosModificadoresCombatiente.js";

const RESISTENCIAS = ["fuego", "frio", "rayo", "veneno"];
const OBJETIVO_RESISTENCIA_ELEMENTAL = Object.freeze({
  fuego: OBJETIVOS_MODIFICADOR.RESISTENCIA_FUEGO,
  frio: OBJETIVOS_MODIFICADOR.RESISTENCIA_FRIO,
  rayo: OBJETIVOS_MODIFICADOR.RESISTENCIA_RAYO,
  veneno: OBJETIVOS_MODIFICADOR.RESISTENCIA_VENENO,
});
const OBJETIVO_RESISTENCIA_EFECTO = Object.freeze({
  congelamiento: OBJETIVOS_MODIFICADOR.RESISTENCIA_CONGELAMIENTO,
  aturdimiento: OBJETIVOS_MODIFICADOR.RESISTENCIA_ATURDIMIENTO,
  envenenamiento: OBJETIVOS_MODIFICADOR.RESISTENCIA_ENVENENAMIENTO,
  quemadura: OBJETIVOS_MODIFICADOR.RESISTENCIA_QUEMADURA,
});

function resolverValor(combatiente, objetivo, valorBase, contexto = {}) {
  if (!combatiente?.sistemaModificadoresCombatiente) return valorBase;
  return combatiente.obtenerValorModificado(objetivo, valorBase, contexto);
}

function crearContextoFuenteAtaque(combatiente, fuente, esAtaqueDual) {
  return {
    familiaArma: fuente.objeto?.familiaObjeto ?? null,
    mano: fuente.mano,
    tipoAtaque: fuente.propiedades?.tipoAtaque ?? null,
    esAtaqueDual: esAtaqueDual === true,
  };
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

export function calcularRecursosMaximos({
  nivel,
  atributos,
  estadisticasBase,
  objetosEquipados = [],
  combatiente = null,
} = {}) {
  const coeficientes = CONFIGURACION_COMBATE.atributos;
  const vidaBase =
    estadisticasBase.vida +
    (nivel - 1) * estadisticasBase.vidaPorNivel +
    coeficientes.vidaPorConstitucion * atributos.constitucion +
    sumarPropiedad(objetosEquipados, "vidaMaxima");
  const manaBase = calcularManaMaximo({
    manaBase: estadisticasBase.mana,
    manaPorNivel: estadisticasBase.manaPorNivel,
    nivel,
    atributos,
    bonificacionPlana: sumarPropiedad(objetosEquipados, "manaMaximo"),
  });
  const vidaMaxima = resolverValor(
    combatiente,
    OBJETIVOS_MODIFICADOR.VIDA_MAXIMA,
    vidaBase,
  );
  const manaMaximo = resolverValor(
    combatiente,
    OBJETIVOS_MODIFICADOR.MANA_MAXIMO,
    manaBase,
  );

  return {
    vidaMaxima: Math.max(1, Math.round(vidaMaxima)),
    manaMaximo: Math.max(0, Math.round(manaMaximo)),
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
    // El ataque básico mágico utiliza la estadística mágica vigente.
    // Potencia de Habilidad queda reservada exclusivamente para habilidades.
    multiplicadorAtributo: calcularMultiplicadorDanioMagico(atributos),
    aplicaDanioPlanoGlobal: false,
    aplicaMultiplicadorGlobal: false,
    aplicaCritico: true,
  };
}

function obtenerDescriptoresElementalesFuente(fuente) {
  return crearDescriptoresDanioElementalLocal(fuente.propiedades, {
    origen: `la fuente de ataque "${fuente.nombre}"`,
  });
}

// Crea las estadísticas específicas de una fuente individual. Cada mano
// conserva su precisión, crítico y multiplicador dual del motor existente.
function calcularComponenteDanio(combatiente, fuente, objetos, esAtaqueDual) {
  const propiedades = fuente.propiedades;
  const base = combatiente.estadisticasBase;
  const atributos = combatiente.atributos;
  const coeficientes = CONFIGURACION_COMBATE.atributos;
  const fuenteEsVarita = esVarita(fuente.objeto);

  let minimoLocal;
  let maximoLocal;
  let multiplicadorAtributo;
  let bonoAtributo;
  let descriptorPrincipal;

  const atributoOfensivo = propiedades.atributoAtaque;
  const valorAtributo = atributos[atributoOfensivo] ?? 10;

  if (fuenteEsVarita) {
    descriptorPrincipal = crearDescriptorDescargaVarita({
      propiedades,
      atributos,
    });
    minimoLocal = descriptorPrincipal.minimoLocal;
    maximoLocal = descriptorPrincipal.maximoLocal;
    multiplicadorAtributo = descriptorPrincipal.multiplicadorAtributo;
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
    descriptorPrincipal = crearDescriptorDanioFisico({
      minimoLocal,
      maximoLocal,
      multiplicadorAtributo,
    });
  }

  const contextoFuente = crearContextoFuenteAtaque(
    combatiente,
    fuente,
    esAtaqueDual,
  );
  const precisionBase =
    base.precision +
    coeficientes.precisionPorDestreza * atributos.destreza +
    (propiedades.precision ?? 0) +
    sumarPropiedad(objetos, "precisionGlobal");
  const precision = resolverValor(
    combatiente,
    OBJETIVOS_MODIFICADOR.PRECISION,
    precisionBase,
    contextoFuente,
  );
  const probabilidadCriticoBase =
    (propiedades.probabilidadCritico ?? base.probabilidadCritico) +
    sumarPropiedad(objetos, "probabilidadCriticoGlobal");
  const probabilidadCritico = limitar(
    resolverValor(
      combatiente,
      OBJETIVOS_MODIFICADOR.PROBABILIDAD_CRITICO,
      probabilidadCriticoBase,
      contextoFuente,
    ),
    0,
    CONFIGURACION_COMBATE.limites.criticoMaximo,
  );
  const multiplicadorCriticoBase =
    (propiedades.multiplicadorCritico ?? base.multiplicadorCritico) +
    sumarPropiedad(objetos, "multiplicadorCriticoAdicional");
  const multiplicadorCritico = resolverValor(
    combatiente,
    OBJETIVOS_MODIFICADOR.MULTIPLICADOR_CRITICO,
    multiplicadorCriticoBase,
    contextoFuente,
  );
  const multiplicadorGolpe = resolverValor(
    combatiente,
    OBJETIVOS_MODIFICADOR.MULTIPLICADOR_DANIO_FUENTE,
    fuente.multiplicadorGolpe,
    contextoFuente,
  );

  return {
    nombre: fuente.nombre,
    objeto: fuente.objeto,
    mano: fuente.mano,
    multiplicadorGolpe,
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
    componentesDanio: [
      descriptorPrincipal,
      ...obtenerDescriptoresElementalesFuente(fuente),
    ],
  };
}

function calcularRangoDescriptor({
  descriptor,
  multiplicadorGolpe,
  danioPlanoGlobalMinimo,
  danioPlanoGlobalMaximo,
  multiplicadorGlobal,
}) {
  const planoMinimo =
    descriptor.aplicaDanioPlanoGlobal === true ? danioPlanoGlobalMinimo : 0;
  const planoMaximo =
    descriptor.aplicaDanioPlanoGlobal === true ? danioPlanoGlobalMaximo : 0;
  const multiplicadorFinal =
    descriptor.aplicaMultiplicadorGlobal === true ? multiplicadorGlobal : 1;

  const minimo = Math.max(
    0,
    (descriptor.minimoLocal * descriptor.multiplicadorAtributo + planoMinimo) *
      multiplicadorGolpe *
      multiplicadorFinal,
  );
  const maximo = Math.max(
    minimo,
    (descriptor.maximoLocal * descriptor.multiplicadorAtributo + planoMaximo) *
      multiplicadorGolpe *
      multiplicadorFinal,
  );

  return {
    tipo: descriptor.tipo,
    minimo,
    maximo,
    promedio: (minimo + maximo) / 2,
  };
}

// El nombre se conserva por compatibilidad con los consumidores existentes,
// aunque sus fuentes pueden contener componentes físicos y elementales.
function calcularDanioFisico(combatiente, objetos, configuracionAtaque) {
  const componentesBase = configuracionAtaque.fuentesDanio.map((fuente) =>
    calcularComponenteDanio(
      combatiente,
      fuente,
      objetos,
      configuracionAtaque.esAtaqueDual,
    ),
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
    const rangosComponentes = componente.componentesDanio.map((descriptor) =>
      calcularRangoDescriptor({
        descriptor,
        multiplicadorGolpe: componente.multiplicadorGolpe,
        danioPlanoGlobalMinimo,
        danioPlanoGlobalMaximo,
        multiplicadorGlobal,
      }),
    );
    const minimo = rangosComponentes.reduce(
      (total, rango) => total + rango.minimo,
      0,
    );
    const maximo = rangosComponentes.reduce(
      (total, rango) => total + rango.maximo,
      0,
    );

    return {
      ...componente,
      rangosComponentes,
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
  const contextoAtaque = {
    familiaArma: configuracionAtaque.armaControladora?.familiaObjeto ?? null,
    tipoAtaque: ataqueControlador.tipoAtaque,
    esAtaqueDual: configuracionAtaque.esAtaqueDual,
  };
  const recursos = calcularRecursosMaximos({
    nivel: combatiente.nivel,
    atributos,
    estadisticasBase: base,
    objetosEquipados: objetos,
    combatiente,
  });

  const regeneracionVidaBase =
    base.regeneracionVida +
    coeficientes.regeneracionVidaPorConstitucion *
      (atributos.constitucion - 10) +
    sumarPropiedad(objetos, "regeneracionVida") +
    recursos.vidaMaxima *
      (sumarPropiedad(objetos, "regeneracionVidaPorcentaje") / 100);
  const regeneracionVida = Math.max(
    0,
    resolverValor(
      combatiente,
      OBJETIVOS_MODIFICADOR.REGENERACION_VIDA,
      regeneracionVidaBase,
    ),
  );

  const regeneracionManaBase = calcularRegeneracionMana({
    regeneracionBase: base.regeneracionMana,
    sabiduria: atributos.sabiduria,
    bonificacionPlana: sumarPropiedad(objetos, "regeneracionMana"),
    manaMaximo: recursos.manaMaximo,
    bonificacionPorcentual: sumarPropiedad(
      objetos,
      "regeneracionManaPorcentaje",
    ),
  });
  const regeneracionMana = Math.max(
    0,
    resolverValor(
      combatiente,
      OBJETIVOS_MODIFICADOR.REGENERACION_MANA,
      regeneracionManaBase,
    ),
  );

  const multiplicadorDanioMagico = calcularMultiplicadorDanioMagico(atributos);
  const multiplicadorEfectosAtributos = calcularMultiplicadorEfectos(atributos);
  const potenciaEfectosAdicional =
    base.potenciaEfectos + sumarPropiedad(objetos, "potenciaEfectos");
  const potenciaEfectosBase =
    (multiplicadorEfectosAtributos *
      (1 + potenciaEfectosAdicional / 100) -
      1) *
    100;
  const potenciaEfectos = resolverValor(
    combatiente,
    OBJETIVOS_MODIFICADOR.POTENCIA_EFECTOS,
    potenciaEfectosBase,
  );
  const multiplicadorEfectos = Math.max(0.01, 1 + potenciaEfectos / 100);

  const resistencias = {};
  for (const resistencia of RESISTENCIAS) {
    const nombrePropiedad =
      `resistencia${resistencia[0].toUpperCase()}` + resistencia.slice(1);
    let valorBase =
      base.resistencias[resistencia] +
      coeficientes.resistenciaElementalPorSabiduria *
        (atributos.sabiduria - 10) +
      sumarPropiedad(objetos, nombrePropiedad);

    if (resistencia === "veneno") {
      valorBase +=
        coeficientes.resistenciaVenenoPorConstitucion *
        (atributos.constitucion - 10);
    }

    const valorResuelto = resolverValor(
      combatiente,
      OBJETIVO_RESISTENCIA_ELEMENTAL[resistencia],
      valorBase,
    );
    resistencias[resistencia] = normalizarResistencia(
      valorResuelto,
      `La resistencia derivada a ${resistencia}`,
    );
  }

  const bonificacionResistenciasEfectosPorConstitucion =
    combatiente.aplicaBonoConstitucionResistenciasEfectos === true
      ? calcularBonoResistenciasEfectosPorConstitucion(
          atributos.constitucion,
        )
      : 0;
  const resistenciasEfectos = {};
  for (const idResistencia of IDS_RESISTENCIA_EFECTO) {
    const propiedad = PROPIEDAD_RESISTENCIA_EFECTO[idResistencia];
    const valorBase =
      (base.resistenciasEfectos?.[idResistencia] ?? 0) +
      bonificacionResistenciasEfectosPorConstitucion +
      sumarPropiedad(objetos, propiedad);
    const valorResuelto = resolverValor(
      combatiente,
      OBJETIVO_RESISTENCIA_EFECTO[idResistencia],
      valorBase,
    );
    resistenciasEfectos[idResistencia] = normalizarResistenciaEfecto(
      valorResuelto,
      `La resistencia derivada a ${idResistencia}`,
    );
  }

  const armaduraPlana = base.armadura + sumarPropiedad(objetos, "armadura");
  const armaduraPorcentual =
    sumarPropiedad(objetos, "armaduraAumentadaPorcentaje") / 100;
  const armaduraBase = armaduraPlana * (1 + armaduraPorcentual);
  const armadura = Math.max(
    0,
    Math.round(
      resolverValor(
        combatiente,
        OBJETIVOS_MODIFICADOR.ARMADURA,
        armaduraBase,
      ),
    ),
  );

  const precisionBase =
    base.precision +
    coeficientes.precisionPorDestreza * atributos.destreza +
    (ataqueControlador.precision ?? 0) +
    sumarPropiedad(objetos, "precisionGlobal");
  const precision = resolverValor(
    combatiente,
    OBJETIVOS_MODIFICADOR.PRECISION,
    precisionBase,
    contextoAtaque,
  );

  const evasionBase =
    base.evasion +
    coeficientes.evasionPorDestreza * atributos.destreza +
    sumarPropiedad(objetos, "evasion");
  const evasion = resolverValor(
    combatiente,
    OBJETIVOS_MODIFICADOR.EVASION,
    evasionBase,
  );

  const probabilidadCriticoBase =
    (ataqueControlador.probabilidadCritico ?? base.probabilidadCritico) +
    sumarPropiedad(objetos, "probabilidadCriticoGlobal");
  const probabilidadCritico = limitar(
    resolverValor(
      combatiente,
      OBJETIVOS_MODIFICADOR.PROBABILIDAD_CRITICO,
      probabilidadCriticoBase,
      contextoAtaque,
    ),
    0,
    CONFIGURACION_COMBATE.limites.criticoMaximo,
  );

  const multiplicadorCriticoBase =
    (ataqueControlador.multiplicadorCritico ?? base.multiplicadorCritico) +
    sumarPropiedad(objetos, "multiplicadorCriticoAdicional");
  const multiplicadorCritico = resolverValor(
    combatiente,
    OBJETIVOS_MODIFICADOR.MULTIPLICADOR_CRITICO,
    multiplicadorCriticoBase,
    contextoAtaque,
  );

  const probabilidadBloqueoBase =
    base.probabilidadBloqueo + sumarPropiedad(objetos, "probabilidadBloqueo");
  const probabilidadBloqueo = limitar(
    resolverValor(
      combatiente,
      OBJETIVOS_MODIFICADOR.PROBABILIDAD_BLOQUEO,
      probabilidadBloqueoBase,
    ),
    0,
    CONFIGURACION_COMBATE.limites.bloqueoMaximo,
  );

  const mitigacionBloqueoBase = sumarPropiedad(objetos, "mitigacionBloqueo");
  const mitigacionBloqueo = limitar(
    resolverValor(
      combatiente,
      OBJETIVOS_MODIFICADOR.MITIGACION_BLOQUEO,
      mitigacionBloqueoBase,
    ),
    0,
    CONFIGURACION_COMBATE.limites.mitigacionBloqueoMaxima,
  );

  return {
    ...recursos,
    regeneracionVida,
    regeneracionMana,
    multiplicadorDanioMagico,
    bonificacionDanioMagicoPorcentaje: (multiplicadorDanioMagico - 1) * 100,
    multiplicadorEfectos,
    bonificacionEfectosPorcentaje: potenciaEfectos,
    potenciaEfectos,
    precision,
    evasion,
    armadura,
    probabilidadCritico,
    multiplicadorCritico,
    probabilidadBloqueo,
    mitigacionBloqueo,
    resistenciaMental:
      base.resistenciaMental +
      coeficientes.resistenciaMentalPorSabiduria * atributos.sabiduria,
    potenciaAura:
      base.potenciaAura +
      coeficientes.potenciaAuraPorCarisma * atributos.carisma,
    resistencias,
    resistenciasEfectos,
    bonificacionResistenciasEfectosPorConstitucion,
    inmunidadesEfectos: [...(base.inmunidadesEfectos ?? [])],
    danioFisico: calcularDanioFisico(combatiente, objetos, configuracionAtaque),
  };
}
