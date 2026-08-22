import { limitar } from "../../../utilidades/Numeros.js";
import { CONFIGURACION_COMBATE } from "../../../config/ConfiguracionCombate.js";
import { CONFIGURACION_MAGIA } from "../../../config/ConfiguracionMagia.js";
import { obtenerConfiguracionAtaque } from "./ConfiguracionAtaque.js";
import {
  TIPOS_DANIO,
  crearDescriptoresDanioElementalLocal,
  normalizarTipoDanio,
} from "../../../juego/combate/ComponentesDanio.js";
import {
  normalizarResistenciaEfectiva,
  obtenerLimitesResistenciaEfectiva,
} from "../../../juego/combate/ContratosResistencias.js";
import {
  calcularManaMaximo,
  calcularMultiplicadorDanioMagico,
  calcularMultiplicadorEfectos,
  calcularRegeneracionMana,
} from "../../../juego/magia/CalculadorAtributosMagicos.js";
import {
  IDS_RESISTENCIA_EFECTO,
  PROPIEDAD_RESISTENCIA_EFECTO,
  calcularAporteResistenciasEfectosPorConstitucion,
} from "../../../juego/efectos/ResistenciasEfectos.js";
import { esVarita } from "../../../juego/magia/SistemaCatalizadores.js";
import { OBJETIVOS_MODIFICADOR } from "../../../juego/modificadores/ContratosModificadoresCombatiente.js";
import { ATRIBUTOS_COMBATIENTE_CANONICOS } from "./ContratosAtributosCombatiente.js";

const RESISTENCIAS = ["fuego", "frio", "rayo", "veneno"];
const RESISTENCIAS_POR_SABIDURIA = new Set(["fuego", "frio", "rayo"]);
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

function resolverValorConDesglose(combatiente, objetivo, valorBase, contexto, desgloses, clave = objetivo) {
  if (!combatiente?.sistemaModificadoresCombatiente) {
    desgloses[clave] = Object.freeze({ objetivo, valorBase, resultado: valorBase, desglose: Object.freeze({ aplicados: Object.freeze([]), omitidos: Object.freeze([]) }) });
    return valorBase;
  }
  const resolucion = combatiente.resolverModificador(objetivo, valorBase, contexto ?? {});
  desgloses[clave] = resolucion;
  return resolucion.resultado;
}

function normalizarResolucionResistenciaEfectiva(
  valor,
  descripcion,
  desgloses,
  clave,
) {
  const resultado = normalizarResistenciaEfectiva(valor, descripcion);
  const resolucion = desgloses[clave];
  const limites = obtenerLimitesResistenciaEfectiva();
  const resultadoAntesLimite = resolucion?.resultado ?? valor;
  desgloses[clave] = Object.freeze({
    ...(resolucion ?? {}),
    resultadoAntesLimite,
    resultado,
    limiteDominio: Object.freeze({
      minima: limites.minima,
      maxima: limites.maxima,
      aplicado: resultado !== resultadoAntesLimite,
    }),
  });
  return resultado;
}

function calcularBasesSuerte(combatiente) {
  const reglas = combatiente?.reglasSuerte;
  const suerte = combatiente?.atributos?.suerte;
  if (!reglas || !Number.isFinite(suerte)) {
    return { ajusteComercial: 0, hallazgoMagico: 0 };
  }

  const comercial = reglas.ajusteComercial;
  const hallazgo = reglas.hallazgoMagico;
  return {
    ajusteComercial: limitar(
      (suerte - comercial.referencia) * comercial.variacionPorPunto,
      comercial.minimo,
      comercial.maximo,
    ),
    hallazgoMagico: limitar(
      Math.max(0, suerte - hallazgo.referencia) * hallazgo.variacionPesoPorPunto,
      hallazgo.minimo,
      hallazgo.maximo,
    ),
  };
}

function resolverSuerteLimitada({
  combatiente,
  objetivo,
  valorBase,
  minimo,
  maximo,
  resolucionesModificadores,
  clave,
}) {
  const valorResuelto = resolverValorConDesglose(
    combatiente,
    objetivo,
    valorBase,
    {},
    resolucionesModificadores,
    clave,
  );
  const resultado = limitar(valorResuelto, minimo, maximo);
  const resolucion = resolucionesModificadores[clave];
  if (resolucion && resultado !== valorResuelto) {
    resolucionesModificadores[clave] = Object.freeze({
      ...resolucion,
      resultado,
      limiteAplicado: Object.freeze({ minimo, maximo }),
    });
  }
  return resultado;
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

function crearDesgloseAportesArmadura({ baseArmadura = 0, objetos = [], multiplicadorLocal = 1 } = {}) {
  const aportes = {
    ligera: 0,
    media: 0,
    pesada: 0,
    escudo: 0,
    otras: Math.max(0, Number.isFinite(baseArmadura) ? baseArmadura : 0),
  };

  for (const objeto of objetos) {
    const aporte = objeto?.propiedades?.armadura ?? 0;
    if (!Number.isFinite(aporte) || aporte <= 0) continue;

    if (objeto?.familiaObjeto === "escudo") {
      aportes.escudo += aporte;
      continue;
    }

    if (["ligera", "media", "pesada"].includes(objeto?.categoriaArmadura)) {
      aportes[objeto.categoriaArmadura] += aporte;
      continue;
    }

    aportes.otras += aporte;
  }

  for (const clave of Object.keys(aportes)) {
    aportes[clave] *= multiplicadorLocal;
  }

  const totalClasificable = Object.values(aportes).reduce((total, valor) => total + valor, 0);
  return Object.freeze({
    ...aportes,
    totalClasificable,
  });
}

function ajustarDesgloseArmaduraFinal(desgloseBase, armaduraFinal) {
  const categorias = ["ligera", "media", "pesada", "escudo", "otras"];
  const totalBase = desgloseBase?.totalClasificable ?? 0;
  const final = Math.max(0, Number.isFinite(armaduraFinal) ? armaduraFinal : 0);
  if (totalBase <= 0) {
    return Object.freeze({
      ligera: 0,
      media: 0,
      pesada: 0,
      escudo: 0,
      otras: final,
      totalClasificable: final,
    });
  }

  const resultado = {};
  if (final <= totalBase) {
    const factor = final / totalBase;
    for (const categoria of categorias) {
      resultado[categoria] = (desgloseBase[categoria] ?? 0) * factor;
    }
  } else {
    for (const categoria of categorias) {
      resultado[categoria] = desgloseBase[categoria] ?? 0;
    }
    // Bonificaciones globales (pasivas, auras, maldiciones inversas, etc.) no
    // se atribuyen artificialmente a una familia de equipo para entregar XP.
    resultado.otras += final - totalBase;
  }

  return Object.freeze({
    ...resultado,
    totalClasificable: final,
  });
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
function calcularComponenteDanio(
  combatiente,
  fuente,
  objetos,
  esAtaqueDual,
  contextoDinamico = {},
) {
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

  const contextoFuente = {
    ...crearContextoFuenteAtaque(combatiente, fuente, esAtaqueDual),
    ...contextoDinamico,
  };
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
  const dispersion = limitar(
    resolverValor(
      combatiente,
      OBJETIVOS_MODIFICADOR.DISPERSION,
      propiedades.dispersion ?? 0,
      contextoFuente,
    ),
    CONFIGURACION_COMBATE.dispersion.minima,
    CONFIGURACION_COMBATE.dispersion.maxima,
  );
  const penetracionArmadura = limitar(
    resolverValor(
      combatiente,
      OBJETIVOS_MODIFICADOR.PENETRACION_ARMADURA,
      propiedades.penetracionArmadura ?? 0,
      contextoFuente,
    ),
    CONFIGURACION_COMBATE.penetracionArmadura.minima,
    CONFIGURACION_COMBATE.penetracionArmadura.maxima,
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
  const resolucionMultiplicadorDanioFuente = combatiente.resolverModificador(
    OBJETIVOS_MODIFICADOR.MULTIPLICADOR_DANIO_FUENTE,
    fuente.multiplicadorGolpe,
    contextoFuente,
  );
  const multiplicadorGolpe = resolucionMultiplicadorDanioFuente.resultado;

  return {
    nombre: fuente.nombre,
    objeto: fuente.objeto,
    mano: fuente.mano,
    multiplicadorGolpe,
    resolucionMultiplicadorDanioFuente,
    atributoOfensivo,
    valorAtributo,
    minimoLocal,
    maximoLocal,
    bonoAtributo,
    multiplicadorAtributo,
    precision,
    dispersion,
    penetracionArmadura,
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
function calcularDanioFisico(combatiente, objetos, configuracionAtaque, contextoDinamico = {}) {
  const componentesBase = configuracionAtaque.fuentesDanio.map((fuente) =>
    calcularComponenteDanio(
      combatiente,
      fuente,
      objetos,
      configuracionAtaque.esAtaqueDual,
      contextoDinamico,
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

export function calcularEstadisticasDerivadas(combatiente, contextoDinamico = {}) {
  const resolucionesModificadores = {};
  const basesSuerte = calcularBasesSuerte(combatiente);
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
    ...contextoDinamico,
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
    resolverValorConDesglose(
      combatiente, OBJETIVOS_MODIFICADOR.REGENERACION_VIDA, regeneracionVidaBase, {}, resolucionesModificadores, "regeneracionVida",
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
    resolverValorConDesglose(
      combatiente, OBJETIVOS_MODIFICADOR.REGENERACION_MANA, regeneracionManaBase, {}, resolucionesModificadores, "regeneracionMana",
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
  const potenciaEfectos = resolverValorConDesglose(
    combatiente, OBJETIVOS_MODIFICADOR.POTENCIA_EFECTOS, potenciaEfectosBase, {}, resolucionesModificadores, "potenciaEfectos",
  );
  const multiplicadorEfectos = Math.max(0.01, 1 + potenciaEfectos / 100);

  const resistencias = {};
  for (const resistencia of RESISTENCIAS) {
    const nombrePropiedad =
      `resistencia${resistencia[0].toUpperCase()}` + resistencia.slice(1);
    const atributoControlador = RESISTENCIAS_POR_SABIDURIA.has(resistencia)
      ? atributos.sabiduria
      : atributos.constitucion;
    const valorBase =
      base.resistencias[resistencia] +
      coeficientes.resistenciaPorPuntoRespectoReferencia *
        (atributoControlador - coeficientes.referenciaResistencias) +
      sumarPropiedad(objetos, nombrePropiedad);

    const valorResuelto = resolverValorConDesglose(
      combatiente, OBJETIVO_RESISTENCIA_ELEMENTAL[resistencia], valorBase, {}, resolucionesModificadores, `resistencia:${resistencia}`,
    );
    resistencias[resistencia] = normalizarResolucionResistenciaEfectiva(
      valorResuelto,
      `La resistencia efectiva a ${resistencia}`,
      resolucionesModificadores,
      `resistencia:${resistencia}`,
    );
  }

  const aporteResistenciasEfectosPorConstitucion =
    combatiente.aplicaBonoConstitucionResistenciasEfectos === true
      ? calcularAporteResistenciasEfectosPorConstitucion(
          atributos.constitucion,
        )
      : 0;
  const resistenciasEfectos = {};
  for (const idResistencia of IDS_RESISTENCIA_EFECTO) {
    const propiedad = PROPIEDAD_RESISTENCIA_EFECTO[idResistencia];
    const valorBase =
      (base.resistenciasEfectos?.[idResistencia] ?? 0) +
      aporteResistenciasEfectosPorConstitucion +
      sumarPropiedad(objetos, propiedad);
    const valorResuelto = resolverValorConDesglose(
      combatiente, OBJETIVO_RESISTENCIA_EFECTO[idResistencia], valorBase, {}, resolucionesModificadores, `resistenciaEfecto:${idResistencia}`,
    );
    resistenciasEfectos[idResistencia] = normalizarResolucionResistenciaEfectiva(
      valorResuelto,
      `La resistencia efectiva a ${idResistencia}`,
      resolucionesModificadores,
      `resistenciaEfecto:${idResistencia}`,
    );
  }

  const armaduraPlana = base.armadura + sumarPropiedad(objetos, "armadura");
  const armaduraPorcentual =
    sumarPropiedad(objetos, "armaduraAumentadaPorcentaje") / 100;
  const multiplicadorArmaduraLocal = 1 + armaduraPorcentual;
  const armaduraBase = armaduraPlana * multiplicadorArmaduraLocal;
  const desgloseArmaduraBase = crearDesgloseAportesArmadura({
    baseArmadura: base.armadura,
    objetos,
    multiplicadorLocal: multiplicadorArmaduraLocal,
  });
  const armadura = Math.max(
    0,
    Math.round(
      resolverValorConDesglose(
        combatiente, OBJETIVOS_MODIFICADOR.ARMADURA, armaduraBase, {}, resolucionesModificadores, "armadura",
      ),
    ),
  );
  const desgloseArmadura = ajustarDesgloseArmaduraFinal(
    desgloseArmaduraBase,
    armadura,
  );

  const precisionBase =
    base.precision +
    coeficientes.precisionPorDestreza * atributos.destreza +
    (ataqueControlador.precision ?? 0) +
    sumarPropiedad(objetos, "precisionGlobal");
  const precision = resolverValorConDesglose(
    combatiente, OBJETIVOS_MODIFICADOR.PRECISION, precisionBase, contextoAtaque, resolucionesModificadores, "precision",
  );
  const dispersion = limitar(
    resolverValorConDesglose(
      combatiente,
      OBJETIVOS_MODIFICADOR.DISPERSION,
      ataqueControlador.dispersion ?? 0,
      contextoAtaque,
      resolucionesModificadores,
      "dispersion",
    ),
    CONFIGURACION_COMBATE.dispersion.minima,
    CONFIGURACION_COMBATE.dispersion.maxima,
  );
  const penetracionArmadura = limitar(
    resolverValorConDesglose(
      combatiente,
      OBJETIVOS_MODIFICADOR.PENETRACION_ARMADURA,
      ataqueControlador.penetracionArmadura ?? 0,
      contextoAtaque,
      resolucionesModificadores,
      "penetracionArmadura",
    ),
    CONFIGURACION_COMBATE.penetracionArmadura.minima,
    CONFIGURACION_COMBATE.penetracionArmadura.maxima,
  );

  const evasionBase =
    base.evasion +
    coeficientes.evasionPorDestreza * atributos.destreza +
    sumarPropiedad(objetos, "evasion");
  const evasion = resolverValorConDesglose(
    combatiente, OBJETIVOS_MODIFICADOR.EVASION, evasionBase, {}, resolucionesModificadores, "evasion",
  );

  const probabilidadCriticoBase =
    (ataqueControlador.probabilidadCritico ?? base.probabilidadCritico) +
    sumarPropiedad(objetos, "probabilidadCriticoGlobal");
  const probabilidadCritico = limitar(
    resolverValorConDesglose(
      combatiente, OBJETIVOS_MODIFICADOR.PROBABILIDAD_CRITICO, probabilidadCriticoBase, contextoAtaque, resolucionesModificadores, "probabilidadCritico",
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
    resolverValorConDesglose(
      combatiente, OBJETIVOS_MODIFICADOR.PROBABILIDAD_BLOQUEO, probabilidadBloqueoBase, {}, resolucionesModificadores, "probabilidadBloqueo",
    ),
    0,
    CONFIGURACION_COMBATE.limites.bloqueoMaximo,
  );

  const mitigacionBloqueoBase = sumarPropiedad(objetos, "mitigacionBloqueo");
  const mitigacionBloqueo = limitar(
    resolverValorConDesglose(
      combatiente,
      OBJETIVOS_MODIFICADOR.MITIGACION_BLOQUEO,
      mitigacionBloqueoBase,
      {},
      resolucionesModificadores,
      "mitigacionBloqueo",
    ),
    0,
    CONFIGURACION_COMBATE.limites.mitigacionBloqueoMaxima,
  );

  const reglasSuerte = combatiente?.reglasSuerte;
  const ajusteComercial = resolverSuerteLimitada({
    combatiente,
    objetivo: OBJETIVOS_MODIFICADOR.AJUSTE_COMERCIAL,
    valorBase: basesSuerte.ajusteComercial,
    minimo: reglasSuerte?.ajusteComercial?.minimo ?? 0,
    maximo: reglasSuerte?.ajusteComercial?.maximo ?? 0,
    resolucionesModificadores,
    clave: "ajusteComercial",
  });
  const hallazgoMagico = resolverSuerteLimitada({
    combatiente,
    objetivo: OBJETIVOS_MODIFICADOR.HALLAZGO_MAGICO,
    valorBase: basesSuerte.hallazgoMagico,
    minimo: reglasSuerte?.hallazgoMagico?.minimo ?? 0,
    maximo: reglasSuerte?.hallazgoMagico?.maximo ?? 0,
    resolucionesModificadores,
    clave: "hallazgoMagico",
  });

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
    dispersion,
    penetracionArmadura,
    evasion,
    armadura,
    desgloseArmadura,
    probabilidadCritico,
    multiplicadorCritico,
    probabilidadBloqueo,
    mitigacionBloqueo,
    ajusteComercial,
    hallazgoMagico,
    resistenciaMental: normalizarResolucionResistenciaEfectiva(
      resolverValorConDesglose(
        combatiente, OBJETIVOS_MODIFICADOR.RESISTENCIA_MENTAL,
        base.resistenciaMental +
          coeficientes.resistenciaPorPuntoRespectoReferencia *
            (atributos.sabiduria - coeficientes.referenciaResistencias),
        {}, resolucionesModificadores, "resistenciaMental",
      ),
      "La Resistencia Mental efectiva",
      resolucionesModificadores,
      "resistenciaMental",
    ),
    potenciaAura:
      base.potenciaAura +
      coeficientes.potenciaAuraPorPuntoRespectoDiez *
        (atributos.constitucion - 10),
    // Lectura aditiva: conserva las resoluciones ya ejecutadas en este cálculo.
    resolucionesModificadores: Object.freeze({ ...resolucionesModificadores }),
    resistencias,
    resistenciasEfectos,
    aporteResistenciasEfectosPorConstitucion,
    inmunidadesEfectos: [...(base.inmunidadesEfectos ?? [])],
    danioFisico: calcularDanioFisico(combatiente, objetos, configuracionAtaque, contextoDinamico),
  };
}

// Consulta canónica de lectura para presentación. Explica la participación
// actual de los atributos primarios sin modificar ni sustituir el cálculo de
// estadísticas derivadas y sin ampliar el contrato de su objeto resultado.
export function obtenerAportesAtributosPrimarios(combatiente) {
  if (!combatiente?.atributos) {
    throw new Error("Se necesita un combatiente válido para consultar aportes de atributos.");
  }
  const aporteResistenciasEfectosPorConstitucion =
    combatiente.aplicaBonoConstitucionResistenciasEfectos === true
      ? calcularAporteResistenciasEfectosPorConstitucion(
          combatiente.atributos.constitucion,
        )
      : 0;
  return crearAportesAtributos({
    atributos: combatiente.atributos,
    configuracionAtaque: obtenerConfiguracionAtaque(combatiente),
    aporteResistenciasEfectosPorConstitucion,
    reglasSuerte: combatiente.reglasSuerte ?? null,
  });
}

function crearAportesAtributos({
  atributos,
  configuracionAtaque,
  aporteResistenciasEfectosPorConstitucion,
  reglasSuerte,
}) {
  const combate = CONFIGURACION_COMBATE.atributos;
  const magia = CONFIGURACION_MAGIA;
  const referencia = magia.referenciaAtributos;
  const porAtributo = Object.fromEntries(
    ATRIBUTOS_COMBATIENTE_CANONICOS.map(
      (id) => [id, []],
    ),
  );
  const porEstadistica = {};

  const agregar = (atributo, estadistica, valor, unidad = "numero", opciones = {}) => {
    if (!Number.isFinite(valor)) return;
    const aporte = Object.freeze({
      atributo,
      estadistica,
      valor,
      unidad,
      sobreBase: opciones.sobreBase !== false,
      nota: opciones.nota ?? null,
    });
    porAtributo[atributo].push(aporte);
    (porEstadistica[estadistica] ??= []).push(aporte);
  };

  const atributoAtaque = configuracionAtaque?.propiedadesControladoras?.atributoAtaque;
  const ataqueEsVarita = esVarita(configuracionAtaque?.armaControladora);
  for (const atributoArmaDirecta of ["fuerza", "destreza", "sabiduria"]) {
    const aporte = Object.freeze({
      atributo: atributoArmaDirecta,
      estadistica: "danioFisico",
      valor:
        combate.danioPorPuntoRespectoDiez *
        ((atributos[atributoArmaDirecta] ?? 10) - 10) *
        100,
      unidad: "porcentaje",
      sobreBase: true,
      nota: `armas_${atributoArmaDirecta}`,
    });
    porAtributo[atributoArmaDirecta].push(aporte);
    if (!ataqueEsVarita && atributoAtaque === atributoArmaDirecta) {
      (porEstadistica.danioFisico ??= []).push(aporte);
    }
  }

  agregar(
    "destreza",
    "precision",
    combate.precisionPorDestreza * atributos.destreza,
  );
  agregar(
    "destreza",
    "evasion",
    combate.evasionPorDestreza * atributos.destreza,
  );

  agregar(
    "constitucion",
    "vidaMaxima",
    combate.vidaPorConstitucion * atributos.constitucion,
  );
  agregar(
    "constitucion",
    "regeneracionVida",
    combate.regeneracionVidaPorConstitucion * (atributos.constitucion - 10),
  );
  agregar(
    "constitucion",
    "resistencia:veneno",
    combate.resistenciaPorPuntoRespectoReferencia *
      (atributos.constitucion - combate.referenciaResistencias),
    "porcentaje",
  );
  for (const id of IDS_RESISTENCIA_EFECTO) {
    agregar(
      "constitucion",
      `resistenciaEfecto:${id}`,
      aporteResistenciasEfectosPorConstitucion,
      "porcentaje",
    );
  }
  agregar(
    "constitucion",
    "potenciaAura",
    combate.potenciaAuraPorPuntoRespectoDiez *
      (atributos.constitucion - 10),
    "porcentaje",
  );

  agregar(
    "inteligencia",
    "manaMaximo",
    magia.mana.porInteligenciaRespectoDiez *
      (atributos.inteligencia - referencia),
  );
  agregar(
    "inteligencia",
    "danioMagico",
    magia.multiplicadores.danioMagico.inteligencia *
      (atributos.inteligencia - referencia) *
      100,
    "porcentaje",
  );
  agregar(
    "inteligencia",
    "potenciaEfectos",
    magia.multiplicadores.efectos.inteligencia *
      (atributos.inteligencia - referencia) *
      100,
    "porcentaje",
  );

  agregar(
    "sabiduria",
    "manaMaximo",
    magia.mana.porSabiduriaRespectoDiez *
      (atributos.sabiduria - referencia),
  );
  agregar(
    "sabiduria",
    "regeneracionMana",
    magia.regeneracionMana.porSabiduria * atributos.sabiduria,
  );
  agregar(
    "sabiduria",
    "danioMagico",
    magia.multiplicadores.danioMagico.sabiduria *
      (atributos.sabiduria - referencia) *
      100,
    "porcentaje",
  );
  agregar(
    "sabiduria",
    "potenciaEfectos",
    magia.multiplicadores.efectos.sabiduria *
      (atributos.sabiduria - referencia) *
      100,
    "porcentaje",
  );
  for (const id of RESISTENCIAS_POR_SABIDURIA) {
    agregar(
      "sabiduria",
      `resistencia:${id}`,
      combate.resistenciaPorPuntoRespectoReferencia *
        (atributos.sabiduria - combate.referenciaResistencias),
      "porcentaje",
    );
  }
  agregar(
    "sabiduria",
    "resistenciaMental",
    combate.resistenciaPorPuntoRespectoReferencia *
      (atributos.sabiduria - combate.referenciaResistencias),
    "porcentaje",
  );

  if (reglasSuerte) {
    const basesSuerte = calcularBasesSuerte({ atributos, reglasSuerte });
    agregar(
      "suerte",
      "ajusteComercial",
      basesSuerte.ajusteComercial * 100,
      "porcentaje",
    );
    agregar(
      "suerte",
      "hallazgoMagico",
      basesSuerte.hallazgoMagico,
      "porcentaje",
    );
  }

  if (ataqueEsVarita) {
    const aporteInteligencia = porAtributo.inteligencia.find(
      (aporte) => aporte.estadistica === "danioMagico",
    );
    const aporteSabiduria = porAtributo.sabiduria.find(
      (aporte) => aporte.estadistica === "danioMagico",
    );
    porEstadistica.danioFisico = Object.freeze(
      [aporteInteligencia, aporteSabiduria].filter(Boolean),
    );
  }

  return Object.freeze({
    porAtributo: Object.freeze(
      Object.fromEntries(
        Object.entries(porAtributo).map(([id, aportes]) => [
          id,
          Object.freeze([...aportes]),
        ]),
      ),
    ),
    porEstadistica: Object.freeze(
      Object.fromEntries(
        Object.entries(porEstadistica).map(([id, aportes]) => [
          id,
          Object.freeze([...aportes]),
        ]),
      ),
    ),
  });
}
