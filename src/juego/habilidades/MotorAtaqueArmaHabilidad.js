import {
  consumirRecursosAtaque,
  contarMunicionCompatible,
  obtenerConfiguracionAtaque,
  obtenerDescriptorMunicionCompatible,
  verificarRequisitosMunicionAtaque,
} from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";
import {
  activarPreparacionAccion,
  obtenerPreparacionAccion,
  retirarPreparacionAccion,
} from "../acciones/PreparacionAccionesCombatiente.js";
import {
  calcularCostoBaseFaseHabilidadArma,
  FASES_ACCION_COMPUESTA,
} from "../acciones/CostosAccionCompuesta.js";
import {
  obtenerDesgloseProbabilidadImpactoFuente,
  resolverSecuenciaFuenteAtaque,
} from "../combate/SistemaCombate.js";
import {
  procesarEventoEstadoTacticoCombatiente,
  TIPOS_EVENTO_ESTADO_TACTICO,
} from "../estado/EstadosTacticosCombatiente.js";
import {
  resolverDesplazamientoTactico,
} from "../movimiento/ResolutorDesplazamientoTactico.js";
import {
  TIPOS_FUENTE_EXPERIENCIA_MAESTRIA,
} from "../maestrias/ContratosExperienciaMaestrias.js";

const TIPO_PREPARACION_ATAQUE_ARMA = "ataque_arma";

export function esHabilidadAtaqueArma(habilidad) {
  return Boolean(habilidad?.ejecucion?.ataqueArma);
}

export function obtenerEtiquetaAccionHabilidadArma(habilidad) {
  const etiqueta = habilidad?.ejecucion?.ataqueArma?.etiquetaContexto;
  if (typeof etiqueta !== "string" || etiqueta.trim() === "") {
    throw new Error(
      `La habilidad de arma "${habilidad?.id ?? "desconocida"}" no declara etiquetaContexto.`,
    );
  }
  return etiqueta.trim().toLowerCase();
}

export function validarPreparacionHabilidadArma({
  combatiente,
  habilidad,
  gradoConfig,
  retirarSiInvalida = false,
} = {}) {
  validarContratoHabilidadArma({ combatiente, habilidad, gradoConfig });
  const descriptor = habilidad.ejecucion.ataqueArma;
  if (!descriptor.requierePreparacion) {
    return Object.freeze({
      valida: true,
      requierePreparacion: false,
      estado: null,
      requisitos: null,
    });
  }

  const configuracionAtaque = obtenerConfiguracionAtaque(combatiente);
  const cantidadMunicion = obtenerCantidadMunicionRequerida({
    descriptor,
    gradoConfig,
  });
  const requisitos = verificarRequisitosMunicionAtaque(combatiente, {
    requiereMunicion: descriptor.requiereMunicion,
    cantidadMunicionRequerida: cantidadMunicion,
  });
  const estado = obtenerPreparacionAccion(combatiente);
  const valida = Boolean(
    estado &&
      estado.datos?.tipoAccion === TIPO_PREPARACION_ATAQUE_ARMA &&
      estado.datos?.idAccion === habilidad.id &&
      estado.datos?.idHabilidad === habilidad.id &&
      estado.datos?.grado === gradoConfig.gradoResuelto &&
      estado.datos?.arma === configuracionAtaque.armaControladora &&
      estado.datos?.requiereMunicion === descriptor.requiereMunicion &&
      estado.datos?.consumeMunicion === descriptor.consumeMunicion &&
      (!descriptor.requiereMunicion || estado.datos?.quiver === configuracionAtaque.quiver) &&
      (!descriptor.requiereMunicion || estado.datos?.tipoMunicion === configuracionAtaque.tipoMunicion) &&
      estado.datos?.cantidadMunicionRequerida === cantidadMunicion &&
      requisitos.disponible,
  );
  if (!valida && retirarSiInvalida && estado?.datos?.idAccion === habilidad.id) {
    retirarPreparacionAccion(combatiente);
  }
  return Object.freeze({
    valida,
    requierePreparacion: true,
    estado: valida ? estado : null,
    requisitos,
    configuracionAtaque,
    cantidadMunicion,
  });
}

export function prepararHabilidadArma({
  combatiente,
  habilidad,
  gradoConfig,
  grado,
} = {}) {
  const configuracionGrado = {
    ...gradoConfig,
    gradoResuelto: grado,
  };
  const validacion = validarPreparacionHabilidadArma({
    combatiente,
    habilidad,
    gradoConfig: configuracionGrado,
    retirarSiInvalida: false,
  });
  if (!validacion.requierePreparacion) {
    return Object.freeze({
      preparado: true,
      yaPreparado: true,
      requierePreparacion: false,
      costoBase: 0,
      estado: null,
      requisitos: validacion.requisitos,
    });
  }
  if (validacion.valida) {
    return Object.freeze({
      preparado: true,
      yaPreparado: true,
      requierePreparacion: true,
      costoBase: 0,
      estado: validacion.estado,
      requisitos: validacion.requisitos,
    });
  }
  if (validacion.requisitos?.disponible === false) {
    return Object.freeze({
      preparado: false,
      yaPreparado: false,
      requierePreparacion: true,
      costoBase: 0,
      estado: null,
      requisitos: validacion.requisitos,
    });
  }

  const configuracionAtaque = validacion.configuracionAtaque ??
    obtenerConfiguracionAtaque(combatiente);
  const cantidadMunicion = validacion.cantidadMunicion ??
    obtenerCantidadMunicionRequerida({
      descriptor: habilidad.ejecucion.ataqueArma,
      gradoConfig,
    });
  const estado = activarPreparacionAccion(combatiente, {
    tipoAccion: TIPO_PREPARACION_ATAQUE_ARMA,
    nombre: habilidad.nombre,
    descripcion: `${habilidad.nombre} está preparada para ejecutarse.`,
    icono: habilidad.icono ?? null,
    datos: {
      idAccion: habilidad.id,
      idHabilidad: habilidad.id,
      grado,
      arma: configuracionAtaque.armaControladora,
      quiver: configuracionAtaque.quiver,
      tipoMunicion: configuracionAtaque.tipoMunicion,
      requiereMunicion: habilidad.ejecucion.ataqueArma.requiereMunicion,
      consumeMunicion: habilidad.ejecucion.ataqueArma.consumeMunicion,
      cantidadMunicionRequerida: cantidadMunicion,
    },
  });
  const costoBase = calcularCostoBaseFaseHabilidadArma({
    combatiente,
    configuracionAtaque,
    fase: FASES_ACCION_COMPUESTA.PREPARACION,
    idHabilidad: habilidad.id,
    factorPreparacion: gradoConfig.ataqueArma.factorPreparacion,
  });
  return Object.freeze({
    preparado: true,
    yaPreparado: false,
    requierePreparacion: true,
    costoBase,
    estado,
    requisitos: validacion.requisitos,
  });
}

export function obtenerCostoEjecucionHabilidadArma({
  combatiente,
  habilidad,
} = {}) {
  const configuracionAtaque = obtenerConfiguracionAtaque(combatiente);
  return calcularCostoBaseFaseHabilidadArma({
    combatiente,
    configuracionAtaque,
    fase: FASES_ACCION_COMPUESTA.EJECUCION,
    idHabilidad: habilidad.id,
    factorPreparacion: 1,
  });
}

export function obtenerDesgloseImpactoHabilidadArma({
  combatiente,
  habilidad,
  objetivo,
} = {}) {
  if (!combatiente || !objetivo) return null;
  const etiquetaAccion = obtenerEtiquetaAccionHabilidadArma(habilidad);
  const estadisticas = obtenerEstadisticasContextuales({
    combatiente,
    habilidad,
    etiquetaAccion,
  });
  const fuente = estadisticas.danioFisico?.componentes?.[0] ?? null;
  if (!fuente) return null;
  return obtenerDesgloseProbabilidadImpactoFuente({
    atacante: combatiente,
    objetivo,
    fuente,
  });
}

export function ejecutarHabilidadArma({
  juego,
  combatiente,
  habilidad,
  grado,
  gradoConfig,
  objetivo = null,
  posicionObjetivo = null,
} = {}) {
  validarContratoHabilidadArma({ combatiente, habilidad, gradoConfig });
  const permiteObjetivoLibre = habilidad.ejecucion.tipoObjetivo === "libre";
  if (objetivo?.estaDestruido === true) {
    throw new Error("La habilidad de arma no puede usar un objetivo destruido.");
  }
  if (!objetivo && !permiteObjetivoLibre) {
    throw new Error("La habilidad de arma necesita un objetivo activo.");
  }
  const posicionObjetivoResuelta = objetivo
    ? { x: objetivo.x, y: objetivo.y }
    : normalizarPosicionObjetivoLibre(posicionObjetivo);
  const descriptor = habilidad.ejecucion.ataqueArma;
  const cantidadMunicion = obtenerCantidadMunicionRequerida({
    descriptor,
    gradoConfig,
  });
  const configuracionGrado = { ...gradoConfig, gradoResuelto: grado };
  const preparacion = validarPreparacionHabilidadArma({
    combatiente,
    habilidad,
    gradoConfig: configuracionGrado,
    retirarSiInvalida: true,
  });
  if (descriptor.requierePreparacion && !preparacion.valida) {
    throw new Error("La preparación de la habilidad de arma ya no es válida.");
  }

  const requisitos = verificarRequisitosMunicionAtaque(combatiente, {
    requiereMunicion: descriptor.requiereMunicion,
    cantidadMunicionRequerida: cantidadMunicion,
  });
  if (!requisitos.disponible) {
    throw new Error(requisitos.mensaje ?? "No hay recursos suficientes para disparar.");
  }

  const etiquetaAccion = obtenerEtiquetaAccionHabilidadArma(habilidad);
  const etiquetasEjecucion = [
    "ataque_arma",
    ...(descriptor.etiquetasEjecucion ?? []),
  ];

  const estadisticas = obtenerEstadisticasContextuales({
    combatiente,
    habilidad,
    etiquetaAccion,
  });
  const configuracionDanio = estadisticas.danioFisico;
  const fuentes = configuracionDanio?.componentes ?? [];
  if (fuentes.length !== 1) {
    throw new Error("La habilidad de arma necesita una única fuente controladora.");
  }

  const recursoMunicion = consumirRecursosAtaque(combatiente, {
    requiereMunicion: descriptor.requiereMunicion,
    consumirMunicion: descriptor.consumeMunicion,
    cantidadMunicion,
    consumirManaAtaqueBasico: false,
  });
  if (descriptor.requierePreparacion) retirarPreparacionAccion(combatiente);

  const posicionObjetivoOriginal = posicionObjetivoResuelta;
  const resultadoAtaque = objetivo
    ? resolverSecuenciaFuenteAtaque({
        atacante: combatiente,
        objetivo,
        fuente: fuentes[0],
        configuracionDanio,
        cantidadGolpes: gradoConfig.ataqueArma.cantidadProyectiles,
        factorDanio: gradoConfig.ataqueArma.factorDanioArma,
      })
    : crearResultadoDisparoSinObjetivo({
        fuente: fuentes[0],
        cantidadProyectiles: gradoConfig.ataqueArma.cantidadProyectiles,
        factorDanio: gradoConfig.ataqueArma.factorDanioArma,
      });
  resultadoAtaque.municionRestante = recursoMunicion.restante;
  resultadoAtaque.municionUtilizada = recursoMunicion.municionUtilizada;

  // La política de cada estado decide si estas etiquetas lo consumen o
  // interrumpen. Los modificadores contextuales ya fueron resueltos usando
  // etiquetaContexto, por lo que no hacen falta ramas por habilidad.
  procesarEventoEstadoTacticoCombatiente(
    combatiente,
    TIPOS_EVENTO_ESTADO_TACTICO.ACCION_EJECUTADA,
    { etiquetas: etiquetasEjecucion },
  );

  const experienciaMaestria = objetivo
    ? registrarExperienciaArma({
        combatiente,
        resultadoAtaque,
        habilidad,
      })
    : Object.freeze({ exito: false, experienciaGanada: 0, resultados: Object.freeze([]) });

  const impactos = objetivo
    ? crearImpactosProyectiles({ resultadoAtaque, objetivo })
    : crearImpactosProyectilesSinObjetivo({
        resultadoAtaque,
        posicionObjetivo: posicionObjetivoResuelta,
      });
  const desplazamientoPendiente = gradoConfig.ataqueArma.distanciaDesplazamiento > 0
    ? Object.freeze({
        posicionObjetivoOriginal: Object.freeze({ ...posicionObjetivoOriginal }),
        distancia: gradoConfig.ataqueArma.distanciaDesplazamiento,
        reglaEspacial: gradoConfig.ataqueArma.desplazamientoTactico.reglaEspacial,
        formaVisual: gradoConfig.ataqueArma.desplazamientoTactico.formaVisual,
      })
    : null;

  return Object.freeze({
    resultadoAtaque,
    impactos,
    recursoMunicion,
    recursoProyectil:
      recursoMunicion.municionUtilizada ??
      obtenerDescriptorMunicionCompatible(obtenerConfiguracionAtaque(combatiente)),
    experienciaMaestria,
    desplazamientoPendiente,
    costoEjecucion: obtenerCostoEjecucionHabilidadArma({
      combatiente,
      habilidad,
    }),
    cantidadMunicionDisponible: descriptor.requiereMunicion
      ? contarMunicionCompatible(obtenerConfiguracionAtaque(combatiente))
      : null,
  });
}

export function ejecutarDesplazamientoPosteriorHabilidadArma({
  juego,
  combatiente,
  desplazamientoPendiente,
} = {}) {
  if (!desplazamientoPendiente) return null;
  const objetivo = desplazamientoPendiente.posicionObjetivoOriginal;
  const direccion = {
    x: Math.sign(combatiente.x - objetivo.x),
    y: Math.sign(combatiente.y - objetivo.y),
  };
  if (direccion.x === 0 && direccion.y === 0) return null;

  const desplazamiento = resolverDesplazamientoTactico({
    sistemaEspacial: juego.sistemaEspacial,
    actor: combatiente,
    direccion,
    distancia: desplazamientoPendiente.distancia,
    reglaEspacial: desplazamientoPendiente.reglaEspacial,
    formaVisual: desplazamientoPendiente.formaVisual,
    notificarMovimientoActor: (datos) => juego.notificarMovimientoActor(datos),
  });
  if (desplazamiento.movido) {
    procesarEventoEstadoTacticoCombatiente(
      combatiente,
      TIPOS_EVENTO_ESTADO_TACTICO.MOVIMIENTO,
      {
        origen: desplazamiento.origen,
        destino: desplazamiento.destino,
        tactico: true,
      },
    );
  }
  return desplazamiento;
}

function obtenerEstadisticasContextuales({
  combatiente,
  habilidad,
  etiquetaAccion,
}) {
  const contexto = {
    tipoAccion: "habilidad",
    idHabilidad: habilidad.id,
    etiquetaAccion,
  };
  return typeof combatiente.obtenerEstadisticasDerivadasContextuales === "function"
    ? combatiente.obtenerEstadisticasDerivadasContextuales(contexto)
    : combatiente.estadisticasDerivadas;
}

function obtenerCantidadMunicionRequerida({ descriptor, gradoConfig }) {
  if (!descriptor?.requiereMunicion) return 0;
  const cantidad = gradoConfig?.ataqueArma?.cantidadMunicion;
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new Error("La habilidad de arma requiere una cantidad de munición válida por grado.");
  }
  return cantidad;
}

function normalizarPosicionObjetivoLibre(posicion) {
  if (!Number.isInteger(posicion?.x) || !Number.isInteger(posicion?.y)) {
    throw new Error("La habilidad de objetivo libre necesita una casilla válida.");
  }
  return { x: posicion.x, y: posicion.y };
}

function crearResultadoDisparoSinObjetivo({
  fuente,
  cantidadProyectiles,
  factorDanio,
}) {
  if (!Number.isInteger(cantidadProyectiles) || cantidadProyectiles <= 0) {
    throw new Error("El disparo libre necesita una cantidad de proyectiles válida.");
  }
  const golpes = Array.from({ length: cantidadProyectiles }, (_, indice) => ({
    nombreFuente: fuente?.nombre ?? null,
    idFuente: fuente?.objeto?.id ?? null,
    familiaArma: fuente?.objeto?.familiaObjeto ?? null,
    mano: fuente?.mano ?? null,
    multiplicadorGolpe: factorDanio,
    orden: indice,
    impacto: false,
    bloqueado: false,
    critico: false,
    danio: 0,
    danioCalculado: 0,
    danioBruto: 0,
    componentesDanio: [],
  }));
  return {
    impacto: false,
    bloqueado: false,
    critico: false,
    danio: 0,
    danioCalculado: 0,
    danioBruto: 0,
    golpesProgramados: cantidadProyectiles,
    golpesRealizados: cantidadProyectiles,
    golpes,
  };
}

function crearImpactosProyectilesSinObjetivo({
  resultadoAtaque,
  posicionObjetivo,
}) {
  return (resultadoAtaque.golpes ?? []).map((golpe, indice) => ({
    objetivoEntidad: null,
    posicionObjetivo: { ...posicionObjetivo },
    orden: indice,
    multiplicadorDanio: golpe.multiplicadorGolpe ?? 1,
    impacto: false,
    critico: false,
    objetivoDerrotado: false,
    danio: {
      ...golpe,
      danio: 0,
      vidaObjetivoAntes: null,
      vidaObjetivoDespues: null,
      vidaObjetivoMaxima: null,
    },
    efectos: [],
  }));
}

function crearImpactosProyectiles({ resultadoAtaque, objetivo }) {
  const golpes = resultadoAtaque.golpes ?? [];
  const vidaFinal = Number.isFinite(objetivo.vidaActual) ? objetivo.vidaActual : null;
  const vidaMaxima = Number.isFinite(objetivo.vidaMaxima) ? objetivo.vidaMaxima : null;
  const danioTotal = golpes.reduce((total, golpe) => total + (golpe.danio ?? 0), 0);
  let vidaReconstruida = vidaFinal === null
    ? null
    : Math.min(vidaMaxima ?? Infinity, vidaFinal + danioTotal);

  return golpes.map((golpe, indice) => {
    const vidaAntes = vidaReconstruida;
    if (vidaReconstruida !== null) {
      vidaReconstruida = Math.max(0, vidaReconstruida - (golpe.danio ?? 0));
    }
    return {
      objetivoEntidad: objetivo,
      posicionObjetivo: { x: objetivo.x, y: objetivo.y },
      orden: indice,
      multiplicadorDanio: golpe.multiplicadorGolpe ?? 1,
      impacto: golpe.impacto === true,
      critico: golpe.critico === true,
      objetivoDerrotado:
        vidaAntes !== null && vidaAntes > 0 && vidaReconstruida === 0,
      danio: {
        ...golpe,
        danio: golpe.danio ?? 0,
        vidaObjetivoAntes: vidaAntes,
        vidaObjetivoDespues: vidaReconstruida,
        vidaObjetivoMaxima: vidaMaxima,
      },
      efectos: [],
    };
  });
}

function registrarExperienciaArma({ combatiente, resultadoAtaque, habilidad }) {
  if (typeof combatiente.registrarExperienciaMaestria !== "function") return null;
  const resultados = [];
  (resultadoAtaque.golpes ?? []).forEach((golpe, indice) => {
    if (golpe.impacto !== true || !Number.isFinite(golpe.danio) || golpe.danio <= 0) return;
    resultados.push(
      combatiente.registrarExperienciaMaestria({
        idEvento: resultadoAtaque.idResolucion,
        idComponente: `habilidad:${habilidad.id}:proyectil:${indice + 1}`,
        tipo: TIPOS_FUENTE_EXPERIENCIA_MAESTRIA.DANIO_APLICADO_ARMA,
        cantidad: golpe.danio,
        familiaArma: golpe.familiaArma,
      }),
    );
  });
  return Object.freeze({
    exito: resultados.some((resultado) => resultado?.exito === true),
    experienciaGanada: resultados.reduce(
      (total, resultado) => total + (resultado?.experienciaGanada ?? 0),
      0,
    ),
    resultados: Object.freeze(resultados),
  });
}

function validarContratoHabilidadArma({ combatiente, habilidad, gradoConfig }) {
  if (!combatiente || typeof combatiente !== "object") {
    throw new Error("La habilidad de arma necesita un combatiente.");
  }
  if (!esHabilidadAtaqueArma(habilidad)) {
    throw new Error("La habilidad no declara el contrato de ataque de arma.");
  }
  if (!gradoConfig?.ataqueArma) {
    throw new Error("El grado de la habilidad no declara parámetros de ataque de arma.");
  }
}
