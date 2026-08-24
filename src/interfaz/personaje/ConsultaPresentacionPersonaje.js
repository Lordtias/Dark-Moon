import { calcularDptCombatiente } from "../../juego/combate/CalculadorDPS.js";
import { obtenerAportesAtributosPrimarios } from "../../entidad/destructible/combatiente/EstadisticasDerivadas.js";
import {
  OBJETIVOS_MODIFICADOR,
  OPERACIONES_MODIFICADOR,
} from "../../juego/modificadores/ContratosModificadoresCombatiente.js";
import { TIEMPO_REFERENCIA } from "../../juego/tiempo/SistemaTiempo.js";
import { obtenerEstadoPasivasJugador } from "./ConsultaPasivasJugador.js";
import { traducirContenido } from "../idiomas/ContextoIdioma.js";

// Este módulo es el único contrato entre las resoluciones canónicas y el
// panel. Entrega valores, unidades, operaciones y orden de presentación; la
// vista no vuelve a formar cálculos ni infiere qué representa una cifra.
const CAMPOS_RESOLUCION = Object.freeze({
  precision: { clave: "precision", unidad: "puntos" },
  dispersion: { clave: "dispersion", unidad: "porcentaje" },
  "penetracion-armadura": { clave: "penetracionArmadura", unidad: "porcentaje" },
  evasion: { clave: "evasion", unidad: "puntos" },
  armadura: { clave: "armadura", unidad: "puntos" },
  critico: { clave: "probabilidadCritico", unidad: "porcentaje" },
  bloqueo: { clave: "probabilidadBloqueo", unidad: "porcentaje" },
  "mitigacion-bloqueo": { clave: "mitigacionBloqueo", unidad: "porcentaje" },
  "regen-vida": { clave: "regeneracionVida", unidad: "puntos" },
  "regen-mana": { clave: "regeneracionMana", unidad: "puntos" },
  "dano-fisico": { clave: "danoFisico", unidad: "porcentaje" },
  "dano-magico": { clave: "danoMagico", unidad: "porcentaje" },
  "dano-habilidad": { clave: "danoHabilidad", unidad: "porcentaje" },
  "dano-fuego": { clave: "danoTipo:fuego", unidad: "porcentaje" },
  "dano-frio": { clave: "danoTipo:frio", unidad: "porcentaje" },
  "dano-rayo": { clave: "danoTipo:rayo", unidad: "porcentaje" },
  "dano-veneno": { clave: "danoTipo:veneno", unidad: "porcentaje" },
  "potencia-efectos": { clave: "potenciaEfectos", unidad: "porcentaje" },
  "potencia-quemadura": { clave: "potenciaEfecto:quemadura", unidad: "porcentaje" },
  "potencia-envenenamiento": { clave: "potenciaEfecto:envenenamiento", unidad: "porcentaje" },
  "potencia-ralentizacion": { clave: "potenciaEfecto:ralentizacion", unidad: "porcentaje" },
  "potencia-electrizacion": { clave: "potenciaEfecto:electrizacion", unidad: "porcentaje" },
  "res-fuego": { clave: "resistencia:fuego", unidad: "porcentaje" },
  "res-frio": { clave: "resistencia:frio", unidad: "porcentaje" },
  "res-rayo": { clave: "resistencia:rayo", unidad: "porcentaje" },
  "res-veneno": { clave: "resistencia:veneno", unidad: "porcentaje" },
  "res-congelamiento": { clave: "resistenciaEfecto:congelamiento", unidad: "porcentaje" },
  "res-aturdimiento": { clave: "resistenciaEfecto:aturdimiento", unidad: "porcentaje" },
  "res-envenenamiento": { clave: "resistenciaEfecto:envenenamiento", unidad: "porcentaje" },
  "res-quemadura": { clave: "resistenciaEfecto:quemadura", unidad: "porcentaje" },
  "res-mental": { clave: "resistenciaMental", unidad: "porcentaje" },
  // El motor conserva decimales para comercio; el contrato de presentación
  // siempre los expresa como puntos porcentuales.
  "ajuste-comercial": { clave: "ajusteComercial", unidad: "porcentaje", escala: 100 },
  "hallazgo-magico": { clave: "hallazgoMagico", unidad: "porcentaje" },
});

const ETIQUETAS_APORTE = Object.freeze({
  vidaMaxima: "Vida máxima",
  manaMaximo: "Maná máximo",
  precision: "Precisión",
  evasion: "Evasión",
  regeneracionVida: "Regeneración de vida",
  regeneracionMana: "Regeneración de maná",
  danoFisico: "Daño Físico",
  danoMagico: "Daño Mágico",
  danoHabilidad: "Daño de Habilidad",
  "danoTipo:fuego": "Daño de Fuego",
  "danoTipo:frio": "Daño de Frío",
  "danoTipo:rayo": "Daño de Rayo",
  "danoTipo:veneno": "Daño de Veneno",
  potenciaEfectos: "Potencia de Efectos",
  "potenciaEfecto:quemadura": "Potencia de Quemadura",
  "potenciaEfecto:envenenamiento": "Potencia de Envenenamiento",
  "potenciaEfecto:ralentizacion": "Potencia de Ralentización",
  "potenciaEfecto:electrizacion": "Potencia de Electrización",
  "resistencia:fuego": "Resistencia a Fuego",
  "resistencia:frio": "Resistencia a Frío",
  "resistencia:rayo": "Resistencia a Rayo",
  "resistencia:veneno": "Resistencia a Veneno",
  "resistenciaEfecto:congelamiento": "Resistencia a Congelamiento",
  "resistenciaEfecto:aturdimiento": "Resistencia a Aturdimiento",
  "resistenciaEfecto:envenenamiento": "Resistencia a Envenenamiento",
  "resistenciaEfecto:quemadura": "Resistencia a Quemadura",
  resistenciaMental: "Resistencia Mental",
  potenciaAura: "Potencia de Aura",
  ajusteComercial: "Ajuste comercial",
  hallazgoMagico: "Hallazgo mágico",
});

const ETIQUETAS_TIPO_DANIO = Object.freeze({
  fisico: "Daño físico",
  fuego: "Daño de Fuego",
  frio: "Daño de Frío",
  rayo: "Daño de Rayo",
  veneno: "Daño de Veneno",
});

export function crearConsultaPresentacionPersonaje({
  jugador,
  juego = null,
  configuracionHabilidades = null,
} = {}) {
  if (!jugador || typeof jugador !== "object") {
    throw new Error("La consulta de presentación necesita un jugador válido.");
  }

  const estadisticas = jugador.estadisticasDerivadas;
  const resoluciones = crearResoluciones({ jugador, estadisticas });
  const danio = crearConsultaDanio(estadisticas);
  const dpt = calcularDptCombatiente(jugador);
  const aportes = obtenerAportesAtributosPrimarios(jugador);
  const valores = crearValores({ jugador, estadisticas, resoluciones, danio, dpt });
  const detalles = crearDetalles({
    jugador,
    estadisticas,
    resoluciones,
    danio,
    dpt,
    aportes,
    valores,
    configuracionHabilidades,
  });

  return congelar({
    identidad: Object.freeze({
      nombre: jugador.nombre,
      clasePersonaje: jugador.clasePersonaje,
      nivel: jugador.nivel,
      oro: jugador.oro,
    }),
    progreso: Object.freeze({
      experiencia: jugador.experiencia,
      experienciaNecesaria: jugador.experienciaNecesaria,
      porcentajeExperiencia: jugador.porcentajeExperiencia,
      puntosAtributoDisponibles: jugador.puntosAtributoDisponibles,
    }),
    recursos: Object.freeze({
      vidaActual: jugador.vidaActual,
      vidaMaxima: jugador.vidaMaxima,
      manaActual: jugador.manaActual,
      manaMaximo: jugador.manaMaximo,
    }),
    atributos: Object.freeze({ ...jugador.atributos }),
    valores: Object.freeze(valores),
    detalles: Object.freeze(detalles),
    pasivas: Object.freeze(
      obtenerEstadoPasivasJugador({
        jugador,
        configuracion: configuracionHabilidades,
      }),
    ),
    efectos: crearEfectos({ juego, jugador }),
    usaDosManos:
      jugador.equipamiento?.obtenerObjetoEnRanura?.("arma")?.propiedades?.manos === 2,
  });
}

function crearResoluciones({ jugador, estadisticas }) {
  return {
    ...(estadisticas.resolucionesModificadores ?? {}),
    percepcion: jugador.resolverModificador(
      OBJETIVOS_MODIFICADOR.PERCEPCION,
      jugador.percepcionBase,
    ),
    alcance:
      jugador.resolverAlcanceAtaque?.() ?? crearResolucionDirecta(jugador.alcanceAtaque),
  };
}

function crearResolucionDirecta(valor) {
  return Object.freeze({
    valorBase: valor,
    resultado: valor,
    desglose: Object.freeze({
      trazaAplicacion: Object.freeze([]),
      aplicados: Object.freeze([]),
      omitidos: Object.freeze([]),
    }),
  });
}

function crearConsultaDanio(estadisticas) {
  const fuentes = (estadisticas.danioFisico?.componentes ?? []).filter(
    (fuente) => fuente?.mano === "principal" || fuente?.mano === "secundaria",
  );
  return Object.freeze({
    promedio: estadisticas.danioFisico?.promedio ?? 0,
    fuentes: Object.freeze([...fuentes]),
  });
}

function crearValores({ jugador, estadisticas, resoluciones, danio, dpt }) {
  return {
    "danio-medio": danio.promedio,
    dpt: dpt.dpt,
    "danio-arma": rangoFuenteDanio(danio, "principal"),
    "danio-secundaria": rangoFuenteDanio(danio, "secundaria"),
    precision: estadisticas.precision,
    dispersion: estadisticas.dispersion,
    "penetracion-armadura": estadisticas.penetracionArmadura,
    evasion: estadisticas.evasion,
    armadura: estadisticas.armadura,
    // Las fuentes físicas mantienen sus tiradas independientes en combate.
    // El panel muestra la suma canónica solicitada de sus aportes finales.
    critico: estadisticas.criticoAtaque?.total ?? estadisticas.probabilidadCritico,
    bloqueo: estadisticas.probabilidadBloqueo,
    "mitigacion-bloqueo": estadisticas.mitigacionBloqueo,
    "regen-vida": estadisticas.regeneracionVida,
    "regen-mana": estadisticas.regeneracionMana,
    percepcion: Math.max(0, resoluciones.percepcion.resultado),
    alcance: resoluciones.alcance.resultado ?? jugador.alcanceAtaque,
    "dano-fisico": estadisticas.danoFisico,
    "dano-magico": estadisticas.danoMagico,
    "dano-habilidad": estadisticas.danoHabilidad,
    "dano-fuego": estadisticas.danosPorTipo?.fuego ?? 0,
    "dano-frio": estadisticas.danosPorTipo?.frio ?? 0,
    "dano-rayo": estadisticas.danosPorTipo?.rayo ?? 0,
    "dano-veneno": estadisticas.danosPorTipo?.veneno ?? 0,
    "potencia-efectos": estadisticas.potenciaEfectos,
    "potencia-quemadura": estadisticas.potenciasEfectosEspecificas?.quemadura ?? 0,
    "potencia-envenenamiento": estadisticas.potenciasEfectosEspecificas?.envenenamiento ?? 0,
    "potencia-ralentizacion": estadisticas.potenciasEfectosEspecificas?.ralentizacion ?? 0,
    "potencia-electrizacion": estadisticas.potenciasEfectosEspecificas?.electrizacion ?? 0,
    "res-fuego": estadisticas.resistencias.fuego,
    "res-frio": estadisticas.resistencias.frio,
    "res-rayo": estadisticas.resistencias.rayo,
    "res-veneno": estadisticas.resistencias.veneno,
    "res-congelamiento": estadisticas.resistenciasEfectos.congelamiento,
    "res-aturdimiento": estadisticas.resistenciasEfectos.aturdimiento,
    "res-envenenamiento": estadisticas.resistenciasEfectos.envenenamiento,
    "res-quemadura": estadisticas.resistenciasEfectos.quemadura,
    "res-mental": estadisticas.resistenciaMental,
    "ajuste-comercial": estadisticas.ajusteComercial * 100,
    "hallazgo-magico": estadisticas.hallazgoMagico,
  };
}

function crearDetalles({
  jugador,
  estadisticas,
  resoluciones,
  danio,
  dpt,
  aportes,
  valores,
  configuracionHabilidades,
}) {
  const detalles = {};
  for (const [campo, descriptor] of Object.entries(CAMPOS_RESOLUCION)) {
    if (campo === "critico") continue;
    detalles[campo] = crearDetalleResolucion({
      campo,
      valorFinal: valores[campo],
      resolucion: resoluciones[descriptor.clave],
      unidad: descriptor.unidad,
      escala: descriptor.escala ?? 1,
      configuracionHabilidades,
    });
  }
  detalles.critico = crearDetalleCriticoAtaque({
    valorFinal: valores.critico,
    resumen: estadisticas.criticoAtaque,
    resolucionAlternativa: resoluciones.probabilidadCritico,
    configuracionHabilidades,
  });
  detalles.percepcion = crearDetalleResolucion({
    campo: "percepcion",
    valorFinal: valores.percepcion,
    resolucion: resoluciones.percepcion,
    unidad: "puntos",
    configuracionHabilidades,
  });
  detalles.alcance = crearDetalleResolucion({
    campo: "alcance",
    valorFinal: valores.alcance,
    resolucion: resoluciones.alcance,
    unidad: "puntos",
    configuracionHabilidades,
  });
  detalles["danio-medio"] = crearDetalleDanioMedio({ danio });
  detalles["danio-arma"] = crearDetalleDanioMano({
    danio,
    mano: "principal",
    configuracionHabilidades,
  });
  detalles["danio-secundaria"] = crearDetalleDanioMano({
    danio,
    mano: "secundaria",
    configuracionHabilidades,
  });
  detalles.dpt = crearDetalleDpt({ jugador, dpt, configuracionHabilidades });

  for (const [atributo, valor] of Object.entries(jugador.atributos)) {
    detalles[`atributo:${atributo}`] = crearDetalleAtributo({
      atributo,
      valor,
      aportes: aportes.porAtributo?.[atributo] ?? [],
    });
  }
  return detalles;
}

function crearDetalleResolucion({
  campo,
  valorFinal,
  resolucion,
  unidad,
  escala = 1,
  configuracionHabilidades,
}) {
  return congelarDetalle({
    categoria: "estadistica",
    campo,
    valorFinal,
    unidad,
    secciones: [
      crearSeccion("calculo", "Desglose", crearFilasResolucion({
        resolucion,
        unidad,
        escala,
        configuracionHabilidades,
      })),
    ],
  });
}

function crearFilasResolucion({
  resolucion,
  unidad,
  escala,
  configuracionHabilidades,
  incluirBase = true,
  etiquetaBase = "Valor base",
}) {
  const filasAscendentes = [];
  for (const paso of resolucion?.desglose?.trazaAplicacion ?? []) {
    filasAscendentes.push(
      ...crearFilasPasoTraza({
        paso,
        unidad,
        escala,
        configuracionHabilidades,
      }),
    );
  }
  if (resolucion?.limiteAplicado) {
    const limites = resolucion.limiteAplicado;
    const limite = resolucion.resultado <= limites.minimo
      ? limites.minimo
      : limites.maximo;
    filasAscendentes.push(crearFila({
      tipo: "limite",
      operacion: OPERACIONES_MODIFICADOR.LIMITAR_MAXIMO,
      etiqueta: "Límite canónico",
      valor: limite * escala,
      unidad,
    }));
  }
  if (resolucion?.limiteDominio?.aplicado === true) {
    const limite = resolucion.resultado <= resolucion.limiteDominio.minima
      ? resolucion.limiteDominio.minima
      : resolucion.limiteDominio.maxima;
    filasAscendentes.push(crearFila({
      tipo: "limite",
      operacion: OPERACIONES_MODIFICADOR.LIMITAR_MAXIMO,
      etiqueta: "Límite del dominio",
      valor: limite * escala,
      unidad,
    }));
  }
  const filasDescendentes = [...filasAscendentes].reverse();
  if (!incluirBase) return Object.freeze(filasDescendentes);
  return Object.freeze(filasDescendentes.concat(crearFila({
    tipo: "base",
    operacion: "base",
    etiqueta: etiquetaBase,
    valor: (resolucion?.valorBase ?? 0) * escala,
    unidad,
  })));
}

function crearFilasPasoTraza({ paso, unidad, escala, configuracionHabilidades }) {
  if (paso.operacion === "redondear") {
    return [crearFila({
      tipo: "informacion",
      operacion: "redondear",
      etiqueta: "Redondeo canónico",
      valor: paso.valorDespues * escala,
      unidad,
      valorAntes: paso.valorAntes * escala,
      valorDespues: paso.valorDespues * escala,
    })];
  }
  const modificadores = paso.modificador
    ? [paso.modificador]
    : paso.modificadores ?? [];
  return modificadores.map((modificador) => {
    const valor = valorPresentableModificador({ modificador, escala });
    return crearFila({
      tipo: tipoFilaModificador(modificador.operacion, valor),
      operacion: modificador.operacion,
      etiqueta: nombreFuenteModificador(modificador, configuracionHabilidades),
      valor,
      unidad: unidadPresentableModificador(modificador.operacion, unidad),
      valorAntes: paso.valorAntes * escala,
      valorDespues: paso.valorDespues * escala,
    });
  });
}

function crearDetalleCriticoAtaque({
  valorFinal,
  resumen,
  resolucionAlternativa,
  configuracionHabilidades,
}) {
  const fuentes = resumen?.fuentes ?? [];
  if (fuentes.length === 0) {
    return crearDetalleResolucion({
      campo: "critico",
      valorFinal,
      resolucion: resolucionAlternativa,
      unidad: "porcentaje",
      configuracionHabilidades,
    });
  }

  const secciones = [];
  if (fuentes.length > 1) {
    secciones.push(crearSeccion("suma", "Suma de armas", [crearFila({
      tipo: "informacion",
      operacion: "suma_critico_armas",
      etiqueta: "Suma directa",
      valor: `${formatearNumeroConsulta(valorFinal)}% = ${fuentes.map((fuente) => `${etiquetaMano(fuente.mano)} ${formatearNumeroConsulta(fuente.probabilidadCritico)}%`).join(" + ")}`,
      unidad: "texto",
    })]));
  }
  for (const fuente of fuentes) {
    secciones.push(crearSeccion(
      `fuente-${fuente.mano}`,
      `${etiquetaMano(fuente.mano)} · ${fuente.nombre}`,
      crearFilasCriticoFuente({ fuente, configuracionHabilidades }),
    ));
  }
  return congelarDetalle({
    categoria: "estadistica",
    campo: "critico",
    valorFinal,
    unidad: "porcentaje",
    secciones,
  });
}

function crearFilasCriticoFuente({ fuente, configuracionHabilidades }) {
  const filas = [crearFila({
    tipo: "informacion",
    operacion: "resultado",
    etiqueta: "Crítico final",
    valor: fuente.probabilidadCritico,
    unidad: "porcentaje",
  })];
  filas.push(...crearFilasResolucion({
    resolucion: fuente.resolucionProbabilidadCritico,
    unidad: "porcentaje",
    escala: 1,
    configuracionHabilidades,
    incluirBase: false,
  }));
  const desglose = fuente.desgloseCritico ?? {};
  for (const aporte of desglose.aportesGlobales ?? []) {
    filas.push(crearFila({
      tipo: tipoFilaValor(aporte.valor),
      operacion: "aporte_global",
      etiqueta: `Crítico global · ${aporte.nombre}`,
      valor: aporte.valor,
      unidad: "porcentaje",
    }));
  }
  if (
    Number.isFinite(desglose.ajusteLocalNoDesglosado) &&
    Math.abs(desglose.ajusteLocalNoDesglosado) > Number.EPSILON
  ) {
    filas.push(crearFila({
      tipo: tipoFilaValor(desglose.ajusteLocalNoDesglosado),
      operacion: "aporte_local",
      etiqueta: "Ajuste local del arma",
      valor: desglose.ajusteLocalNoDesglosado,
      unidad: "porcentaje",
    }));
  }
  for (const aporte of desglose.afijosLocales ?? []) {
    filas.push(crearFila({
      tipo: tipoFilaValor(aporte.valor),
      operacion: "afijo_local",
      etiqueta: `Afijo local · ${aporte.nombre}`,
      valor: aporte.valor,
      unidad: "porcentaje",
    }));
  }
  filas.push(crearFila({
    tipo: "base",
    operacion: "base",
    etiqueta: "Crítico base del arma",
    valor: desglose.valorBase ?? fuente.resolucionProbabilidadCritico?.valorBase ?? 0,
    unidad: "porcentaje",
  }));
  return Object.freeze(filas);
}

function valorPresentableModificador({ modificador, escala }) {
  const operacion = modificador.operacion;
  if (
    operacion === OPERACIONES_MODIFICADOR.MULTIPLICAR ||
    operacion === OPERACIONES_MODIFICADOR.MULTIPLICAR_REDONDEAR
  ) {
    return (modificador.valor - 1) * 100;
  }
  if (
    operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_BASE ||
    operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_TOTAL ||
    operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_MULTIPLICATIVO ||
    operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_INVERSO
  ) {
    return modificador.valor;
  }
  return modificador.valor * escala;
}

function unidadPresentableModificador(operacion, unidad) {
  if (
    operacion === OPERACIONES_MODIFICADOR.MULTIPLICAR ||
    operacion === OPERACIONES_MODIFICADOR.MULTIPLICAR_REDONDEAR ||
    operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_BASE ||
    operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_TOTAL ||
    operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_MULTIPLICATIVO ||
    operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_INVERSO
  ) {
    return "porcentaje";
  }
  return unidad;
}

function crearDetalleAtributo({ atributo, valor, aportes }) {
  const filasAportes = aportes
    .filter((aporte) => Number.isFinite(aporte?.valor) && Math.abs(aporte.valor) > Number.EPSILON)
    .map((aporte) => crearFila({
      tipo: aporte.valor < 0 ? "penalizacion" : "atributo",
      operacion: aporte.valor < 0 ? "restar" : "sumar",
      etiqueta: etiquetaAporte(aporte),
      valor: aporte.valor,
      unidad: aporte.unidad === "porcentaje" ? "porcentaje" : "puntos",
    }));
  return congelarDetalle({
    categoria: "atributo_primario",
    valorFinal: valor,
    unidad: "puntos",
    secciones: [
      crearSeccion("calculo", "Cálculo", [crearFila({
        tipo: "base",
        operacion: "base",
        etiqueta: "Valor base",
        valor,
        unidad: "puntos",
      })]),
      crearSeccion("aportes", "Aportes", filasAportes),
    ],
  });
}

function crearDetalleDanioMedio({ danio }) {
  const filas = danio.fuentes.map((fuente) => crearFila({
    tipo: "informacion",
    operacion: "resultado",
    etiqueta: etiquetaMano(fuente.mano),
    valor: crearRango(fuente.minimo, fuente.maximo),
    unidad: "rango_danio",
  }));
  return congelarDetalle({
    categoria: "danio_medio",
    valorFinal: danio.promedio,
    unidad: "puntos",
    secciones: [crearSeccion("danos-finales", "Daños finales", filas)],
  });
}

function crearDetalleDanioMano({ danio, mano, configuracionHabilidades = null }) {
  const fuente = danio.fuentes.find((item) => item.mano === mano) ?? null;
  if (!fuente) {
    return congelarDetalle({
      categoria: "danio_arma",
      valorFinal: null,
      unidad: "rango_danio",
      secciones: [],
    });
  }
  const secciones = [crearSeccion(
    "golpe",
    "Multiplicador de golpe",
    crearFilasMultiplicadorFuente({
      fuente,
      configuracionHabilidades,
    }),
  )];
  secciones.push(...(fuente.componentesDanio ?? []).map((descriptor, indice) => {
    const rango = fuente.rangosComponentes?.[indice];
    return crearSeccion(
      `componente-${indice}`,
      etiquetaTipoDanio(descriptor.tipo),
      crearFilasComponenteDanio({
        fuente,
        descriptor,
        rango,
      }),
    );
  }));
  return congelarDetalle({
    categoria: "danio_arma",
    valorFinal: crearRango(fuente.minimo, fuente.maximo),
    unidad: "rango_danio",
    secciones,
  });
}

function crearFilasMultiplicadorFuente({ fuente, configuracionHabilidades }) {
  const resolucion = fuente.resolucionMultiplicadorDanioFuente;
  const filas = [];
  if (Number.isFinite(resolucion?.resultado)) {
    filas.push(crearFila({
      tipo: "informacion",
      operacion: "resultado",
      etiqueta: "Multiplicador final del golpe",
      valor: resolucion.resultado * 100,
      unidad: "porcentaje",
    }));
  }
  filas.push(...crearFilasResolucion({
    resolucion,
    unidad: "porcentaje",
    escala: 100,
    configuracionHabilidades,
  }));
  return Object.freeze(filas);
}

function crearFilasComponenteDanio({ fuente, descriptor, rango }) {
  const filas = [crearFila({
    tipo: "informacion",
    operacion: "resultado",
    etiqueta: "Resultado final",
    valor: crearRango(rango?.minimo, rango?.maximo),
    unidad: "rango_danio",
  })];
  const escalado = descriptor.resolucionEscaladoDanio;
  if (escalado?.danioFisico?.resultado) {
    filas.push(crearFila({
      tipo: tipoFilaValor(escalado.danioFisico.resultado),
      operacion: "referencia_global",
      etiqueta: "Daño físico global resuelto",
      valor: escalado.danioFisico.resultado,
      unidad: "porcentaje",
    }));
  }
  if (escalado?.danioMagico?.resultado) {
    filas.push(crearFila({
      tipo: tipoFilaValor(escalado.danioMagico.resultado),
      operacion: "referencia_global",
      etiqueta: "Daño mágico global resuelto",
      valor: escalado.danioMagico.resultado,
      unidad: "porcentaje",
    }));
  }
  if (escalado?.danioTipo?.resultado) {
    filas.push(crearFila({
      tipo: tipoFilaValor(escalado.danioTipo.resultado),
      operacion: "referencia_global",
      etiqueta: `${etiquetaTipoDanio(descriptor.tipo)} resuelto`,
      valor: escalado.danioTipo.resultado,
      unidad: "porcentaje",
    }));
  }
  if (
    descriptor.tipo === "fisico" &&
    Number.isFinite(fuente.bonoAtributo) &&
    Math.abs(fuente.bonoAtributo) > Number.EPSILON
  ) {
    filas.push(crearFila({
      tipo: fuente.bonoAtributo < 0 ? "penalizacion" : "atributo",
      operacion: "escalado_atributo",
      etiqueta: `Escalado por ${nombreAtributo(fuente.atributoOfensivo)}`,
      valor: fuente.bonoAtributo * 100,
      unidad: "porcentaje",
    }));
  }
  filas.push(crearFila({
    tipo: "base",
    operacion: "base",
    etiqueta: "Rango base/local",
    valor: crearRango(descriptor.minimoLocal, descriptor.maximoLocal),
    unidad: "rango_danio",
  }));
  return Object.freeze(filas);
}

function crearDetalleDpt({ jugador, dpt, configuracionHabilidades }) {
  const secciones = [crearSeccion("ecuacion", "Cálculo DPT", [crearFila({
    tipo: "informacion",
    operacion: "ecuacion_dpt",
    etiqueta: "Ecuación canónica",
    valor: `${formatearNumeroConsulta(dpt.danioMedio)} × ${TIEMPO_REFERENCIA} ÷ ${formatearNumeroConsulta(dpt.costoAtaqueEfectivo)} = ${formatearNumeroConsulta(dpt.dpt)} DPT`,
    unidad: "texto",
  })])];

  const ritmo = crearFilasRitmoEfectivo({ jugador, dpt, configuracionHabilidades });
  if (ritmo.length > 0) {
    secciones.push(crearSeccion("ritmo", "Ritmo efectivo", ritmo));
  }
  secciones.push(...crearSeccionesCostoBaseAtaque(dpt.desgloseCostoBase));

  const velocidades = dpt.desgloseCostoBase.fuentes.map((fuente) => crearFila({
    tipo: "informacion",
    operacion: "velocidad_arma",
    etiqueta: `${etiquetaMano(fuente.mano)} · ${fuente.nombre}`,
    valor: Object.freeze({
      velocidadAtaque: fuente.velocidadAtaque,
      costoBase: fuente.costoBase,
    }),
    unidad: "velocidad_ataque_con_costo",
  }));
  secciones.push(crearSeccion("velocidades", "Velocidades de armas", velocidades));

  return congelarDetalle({
    categoria: "dpt",
    valorFinal: dpt.dpt,
    unidad: "dpt",
    secciones,
  });
}

function crearFilasRitmoEfectivo({ jugador, dpt, configuracionHabilidades }) {
  const filasFactores = crearFilasFactoresTemporales({
    jugador,
    configuracionHabilidades,
  });
  const requiereDetalleRitmo =
    dpt.fases.length > 1 ||
    filasFactores.length > 0 ||
    dpt.costoAtaqueEfectivo !== dpt.costoAtaqueBase;
  if (!requiereDetalleRitmo) return [];

  const filas = [crearFila({
    tipo: "informacion",
    operacion: "resultado",
    etiqueta: "Costo temporal efectivo",
    valor: dpt.costoAtaqueEfectivo,
    unidad: "temporal",
  })];
  filas.push(...filasFactores);
  for (const fase of [...dpt.fases].reverse()) {
    if (dpt.fases.length > 1) {
      filas.push(crearFila({
        tipo: "informacion",
        operacion: "costo_fase",
        etiqueta: `Costo de ${etiquetaFase(fase.fase)}`,
        valor: fase.costoBase,
        unidad: "temporal",
      }));
    }
  }
  return filas;
}

function crearFilasFactoresTemporales({ jugador, configuracionHabilidades }) {
  const bases = jugador.obtenerFactoresTemporalesBase?.() ?? {};
  const factores = [
    ["Factor temporal general", OBJETIVOS_MODIFICADOR.FACTOR_TIEMPO, bases.factorTiempo],
    ["Factor de ataque", OBJETIVOS_MODIFICADOR.FACTOR_ATAQUE, bases.factorAtaque],
  ];
  const filas = [];
  for (const [etiqueta, objetivo, base] of factores) {
    if (!Number.isFinite(base)) continue;
    const resolucion = jugador.resolverModificador(objetivo, base);
    for (const paso of resolucion.desglose?.trazaAplicacion ?? []) {
      for (const fila of crearFilasPasoTraza({
        paso,
        unidad: "porcentaje",
        escala: 1,
        configuracionHabilidades,
      })) {
        filas.push(Object.freeze({ ...fila, etiqueta: `${etiqueta} · ${fila.etiqueta}` }));
      }
    }
  }
  return filas;
}

function crearSeccionesCostoBaseAtaque(desglose) {
  if (desglose.tipo !== "dual") {
    return [crearSeccion("costo-base", "Costo base", [crearFila({
      tipo: "base",
      operacion: "base",
      etiqueta: "Costo temporal base",
      valor: desglose.costoBase,
      unidad: "temporal",
    })])];
  }
  const formulaCosto = [
    crearFila({
      tipo: "informacion",
      operacion: "resultado",
      etiqueta: "Costo dual base",
      valor: desglose.costoBase,
      unidad: "temporal",
    }),
    crearFila({
      tipo: "informacion",
      operacion: "ecuacion_costo_dual",
      etiqueta: "Construcción final",
      valor: `${formatearNumeroConsulta(desglose.costoBase)} = redondear(${desglose.fuenteCostoMayor.nombre} ${formatearNumeroConsulta(desglose.costoMayor)} + ${formatearNumeroConsulta(desglose.recargoTemporal)})`,
      unidad: "texto",
    }),
    crearFila({
      tipo: "penalizacion",
      operacion: "ecuacion_recargo_dual",
      etiqueta: "Recargo de arma más rápida",
      valor: `${formatearNumeroConsulta(desglose.recargoTemporal)} = ${formatearNumeroConsulta(desglose.recargoPorcentajeFinal)}% de ${desglose.fuenteCostoMenor.nombre} ${formatearNumeroConsulta(desglose.costoMenor)}`,
      unidad: "texto",
    }),
  ];
  const secciones = [crearSeccion("costo-dual", "Costo dual", formulaCosto)];
  const filasRecargo = crearFilasRecargoDual(desglose);
  if (filasRecargo.length > 0) {
    secciones.push(crearSeccion("recargo-dual", "Recargo dual", filasRecargo));
  }
  return secciones;
}

function crearFilasRecargoDual(desglose) {
  const resolucion = desglose.resolucionRecargoTemporalDual;
  const tienePasos = (resolucion?.desglose?.trazaAplicacion?.length ?? 0) > 0 ||
    resolucion?.limiteDominio?.aplicado === true;
  if (!tienePasos) return [];
  return [
    crearFila({
      tipo: "informacion",
      operacion: "resultado",
      etiqueta: "Recargo dual final",
      valor: desglose.recargoPorcentajeFinal,
      unidad: "porcentaje",
    }),
    ...crearFilasResolucion({
      resolucion,
      unidad: "porcentaje",
      escala: 1,
      configuracionHabilidades: null,
      etiquetaBase: "Recargo dual base",
    }),
  ];
}

function formatearNumeroConsulta(valor, decimales = 2) {
  if (!Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: decimales,
  }).format(valor);
}

function crearEfectos({ juego, jugador }) {
  const tiempo = juego?.tiempoActual;
  return Object.freeze(
    [...(juego?.obtenerEfectosTemporales?.(jugador) ?? [])]
      .sort((a, b) => (a.venceEn ?? Infinity) - (b.venceEn ?? Infinity))
      .map((efecto) => Object.freeze({
        ...efecto,
        turnosRestantes:
          Number.isFinite(efecto.venceEn) && Number.isFinite(tiempo)
            ? Math.max(0, Math.ceil((efecto.venceEn - tiempo) / TIEMPO_REFERENCIA))
            : null,
      })),
  );
}

function rangoFuenteDanio(danio, mano) {
  const fuente = danio.fuentes.find((item) => item.mano === mano);
  return fuente ? crearRango(fuente.minimo, fuente.maximo) : null;
}

function crearRango(minimo, maximo) {
  if (!Number.isFinite(minimo) || !Number.isFinite(maximo)) return null;
  return Object.freeze({ minimo, maximo });
}

function crearSeccion(id, etiqueta, filas) {
  return Object.freeze({
    id,
    etiqueta,
    filas: Object.freeze([...(filas ?? [])]),
  });
}

function crearFila({
  tipo = "informacion",
  operacion = "informacion",
  etiqueta,
  valor,
  unidad = "puntos",
  valorAntes = null,
  valorDespues = null,
}) {
  return Object.freeze({
    tipo,
    operacion,
    etiqueta,
    valor,
    unidad,
    valorAntes,
    valorDespues,
  });
}

function congelarDetalle({ categoria, campo = null, valorFinal, unidad, secciones }) {
  return Object.freeze({
    categoria,
    campo,
    valorFinal,
    unidad,
    secciones: Object.freeze([...(secciones ?? [])]),
  });
}

function tipoFilaModificador(operacion, valor) {
  if (operacion === OPERACIONES_MODIFICADOR.LIMITAR_MAXIMO) return "limite";
  if (
    operacion === OPERACIONES_MODIFICADOR.MULTIPLICAR ||
    operacion === OPERACIONES_MODIFICADOR.MULTIPLICAR_REDONDEAR ||
    operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_MULTIPLICATIVO ||
    operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_INVERSO
  ) {
    return "multiplicador";
  }
  return Number(valor) < 0 ? "penalizacion" : "bonificacion";
}

function tipoFilaValor(valor) {
  return Number(valor) < 0 ? "penalizacion" : "bonificacion";
}

function nombreFuenteModificador(modificador, configuracionHabilidades) {
  const fuente = modificador?.fuente ?? {};
  if (fuente.tipo === "pasiva" && fuente.idHabilidad) {
    const habilidad = configuracionHabilidades?.habilidades?.[fuente.idHabilidad];
    return traducirContenido(
      "habilidades",
      fuente.idHabilidad,
      "nombre",
      habilidad?.nombre ?? identificar(fuente.idHabilidad),
    );
  }
  return fuente.afijoNombre ?? fuente.objetoNombre ?? fuente.nombre ?? identificar(modificador?.origen ?? "modificador");
}

function etiquetaAporte(aporte) {
  return ETIQUETAS_APORTE[aporte.estadistica] ?? identificar(aporte.estadistica);
}

function etiquetaMano(mano) {
  if (mano === "principal") return "Arma";
  if (mano === "secundaria") return "Secundaria";
  return "Ataque";
}

function etiquetaTipoDanio(tipo) {
  return ETIQUETAS_TIPO_DANIO[tipo] ?? identificar(tipo ?? "daño");
}

function etiquetaFase(fase) {
  return fase === "preparacion" ? "preparación" : "ejecución";
}

function nombreAtributo(id) {
  return traducirContenido("atributos", id, "nombre", identificar(id));
}

function identificar(valor) {
  return String(valor ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_:.-]/g, " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function congelar(consulta) {
  return Object.freeze(consulta);
}
