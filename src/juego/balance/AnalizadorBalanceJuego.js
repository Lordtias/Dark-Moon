import { CONFIGURACION_COMBATE } from "../../config/ConfiguracionCombate.js";
import { calcularRecursosMaximos } from "../../entidad/destructible/combatiente/EstadisticasDerivadas.js";
import { calcularCostoBaseAtaque } from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";
import { analizarBalanceProgresion } from "./AnalizadorBalanceProgresion.js";
import { crearInformeBalanceCombate } from "./AnalizadorBalanceCombate.js";
import { crearInformeBalanceEfectos } from "./AnalizadorBalanceEfectos.js";
import { crearInformeBalanceRegresion } from "./AnalizadorBalanceRegresion.js";
import { calcularBonoResistenciasEfectosPorConstitucion } from "../efectos/ResistenciasEfectos.js";
import { crearAtributosIniciales } from "../generacion/GeneradorAtributos.js";
import {
  calcularMultiplicadorDanioMagico,
  calcularMultiplicadorEfectos,
  calcularRegeneracionMana,
} from "../magia/CalculadorAtributosMagicos.js";
import {
  calcularPotenciaHabilidadObjetos,
  esBaston,
  esVarita,
  validarCatalogoCatalizadores,
} from "../magia/SistemaCatalizadores.js";
import {
  ORIGENES_PUNTO_HABILIDAD,
  ProgresoMagicoJugador,
} from "../maestrias/ProgresoMagicoJugador.js";
import {
  calcularExperienciaAcumuladaParaNivel,
  calcularExperienciaNecesaria,
  crearTablaProgresion,
} from "../progresion/SistemaProgresion.js";
import { TIEMPO_REFERENCIA } from "../tiempo/SistemaTiempo.js";

const NIVELES_RECURSOS_DESTACADOS = Object.freeze([1, 3, 6, 10]);
const RESISTENCIAS_EFECTOS_VISIBLES = Object.freeze([
  "congelamiento",
  "aturdimiento",
  "envenenamiento",
  "quemadura",
]);

// Orquesta cálculos de balance sin sustituir los motores del juego.
//
// - Progresión general: SistemaProgresion + FabricaEnemigos.
// - Progresión mágica: ProgresoMagicoJugador.
// - Vida y Maná: EstadisticasDerivadas + CalculadorAtributosMagicos.
// - Catalizadores y doble varita: SistemaCatalizadores y ConfiguracionAtaque.
//
// Constitución utiliza la fórmula real del jugador. Recarga, espera y
// pociones continúan como escenarios teóricos que no alteran la partida.
export function crearAnalizadorBalanceJuego({
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionGeneracionObjetos = null,
  configuracionMapas,
  configuracionProgresoMagico,
  configuracionEjecucionHabilidades,
  objetivosBalance,
} = {}) {
  validarEntrada({
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracionMapas,
    configuracionProgresoMagico,
    configuracionEjecucionHabilidades,
    objetivosBalance,
  });
  validarCatalogoCatalizadores(configuracionObjetos);

  const dependencias = Object.freeze({
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracionMapas,
    configuracionProgresoMagico,
    configuracionEjecucionHabilidades,
    objetivosBalance,
  });
  const cache = new Map();

  const obtener = (clave, creador) => {
    if (!cache.has(clave)) {
      cache.set(clave, congelarProfundamente(creador(dependencias)));
    }
    return cache.get(clave);
  };

  const analizador = {
    progresion: () =>
      obtener("progresion", crearInformeProgresion),
    maestrias: () =>
      obtener("maestrias", crearInformeMaestrias),
    progresionMagica: () =>
      obtener("progresionMagica", () =>
        crearInformeProgresionMagica({
          ...dependencias,
          progresion: analizador.progresion(),
        }),
      ),
    puntosHabilidad: () =>
      obtener("puntosHabilidad", crearInformePuntosHabilidad),
    mana: () =>
      obtener("mana", crearInformeMana),
    sostenibilidadMana: () =>
      obtener("sostenibilidadMana", () =>
        crearInformeSostenibilidadMana({
          ...dependencias,
          mana: analizador.mana(),
          habilidades: analizador.habilidades(),
          armas: analizador.armas(),
        }),
      ),
    habilidades: () =>
      obtener("habilidades", crearInformeHabilidades),
    armas: () =>
      obtener("armas", crearInformeArmas),
    combate: () =>
      obtener("combate", crearInformeBalanceCombate),
    danioArmas: () => analizador.combate().armas,
    danioHabilidades: () => analizador.combate().habilidades,
    potenciaHabilidad: () => analizador.combate().potencia,
    arquetipos: () => analizador.combate().arquetipos,
    pruebasFocalizadas: () => analizador.combate().pruebasFocalizadas,
    efectos: () =>
      obtener("efectos", crearInformeBalanceEfectos),
    regresion: () =>
      obtener("regresion", () =>
        crearInformeBalanceRegresion({
          ...dependencias,
          progresion: analizador.progresion(),
          progresionMagica: analizador.progresionMagica(),
          mana: analizador.mana(),
          combate: analizador.combate(),
          efectos: analizador.efectos(),
        }),
      ),
    probabilidadesEfectos: () => analizador.efectos().probabilidades,
    contratosEfectos: () => analizador.efectos().contratos,
    inmunidadesEfectos: () => analizador.efectos().inmunidades,
    enemigosResistencias: () => analizador.efectos().enemigos,
    afijosResistencias: () => analizador.efectos().afijos,
    constitucion: () =>
      obtener("constitucion", crearInformeConstitucion),
    escenariosTeoricos: () =>
      obtener("escenariosTeoricos", crearInformeEscenariosTeoricos),
    lineaBase: () =>
      obtener("lineaBase", () =>
        crearInformeLineaBase({
          progresion: analizador.progresion(),
          maestrias: analizador.maestrias(),
          progresionMagica: analizador.progresionMagica(),
          puntosHabilidad: analizador.puntosHabilidad(),
          mana: analizador.mana(),
          sostenibilidadMana: analizador.sostenibilidadMana(),
          habilidades: analizador.habilidades(),
          armas: analizador.armas(),
          combate: analizador.combate(),
          efectos: analizador.efectos(),
          regresion: analizador.regresion(),
          constitucion: analizador.constitucion(),
          escenariosTeoricos: analizador.escenariosTeoricos(),
          dependencias,
        }),
      ),
  };

  return Object.freeze(analizador);
}

function crearInformeLineaBase({
  progresion,
  maestrias,
  progresionMagica,
  puntosHabilidad,
  mana,
  sostenibilidadMana,
  habilidades,
  armas,
  combate,
  efectos,
  regresion,
  constitucion,
  escenariosTeoricos,
  dependencias,
}) {
  const accesoriosNaturales = Object.values(
    dependencias.configuracionObjetos,
  ).filter((objeto) =>
    objeto.ranurasCompatibles?.some((ranura) =>
      ["collar", "anillo_derecho", "anillo_izquierdo"].includes(ranura),
    ),
  );

  const advertencias = [
    {
      id: "arco_sin_recarga",
      nivel: "informacion",
      mensaje:
        "El arco consume una acción de ataque, pero no tiene una acción de recarga separada.",
    },
    {
      id: "habilidades_sin_enfriamiento",
      nivel: "informacion",
      mensaje:
        "Las habilidades tienen costo temporal, pero no enfriamiento posterior.",
    },
    {
      id: "sin_pocion_mana",
      nivel: "informacion",
      mensaje: "El catálogo actual no contiene pociones de Maná.",
    },
  ];

  if (accesoriosNaturales.length === 0) {
    advertencias.push({
      id: "sin_accesorios_naturales",
      nivel: "pendiente_contenido",
      mensaje:
        "No existen accesorios naturales para medir todavía la frecuencia real de afijos de resistencia.",
    });
  }

  return {
    versionInforme: 7,
    tipoResultado: "linea_base",
    determinista: true,
    origenes: {
      progresionGeneral: "SistemaProgresion y FabricaEnemigos",
      progresionMagica: "ProgresoMagicoJugador y ruta de enemigos estimados",
      puntosHabilidad: "ProgresoMagicoJugador",
      recursos: "EstadisticasDerivadas y CalculadorAtributosMagicos",
      catalizadores: "SistemaCatalizadores y ConfiguracionAtaque",
      efectos: "SistemaEfectosTemporales, FabricaEnemigos y catálogo de afijos",
      escenarios: "Constitución real y cálculos teóricos aislados",
    },
    resumen: {
      nivelesAnalizados: progresion.tablaNiveles.length,
      mapasAnalizados: progresion.detalleMapas.length,
      habilidadesAnalizadas: habilidades.resumen.cantidadHabilidades,
      gradosAnalizados: habilidades.resumen.cantidadGrados,
      armasAnalizadas: armas.resumen.cantidadArmas,
      simulacionesCombate: combate.habilidades.resumen.simulaciones,
      armasCombateAnalizadas: combate.armas.resumen.cantidad,
      profesionesAnalizadas: mana.resumen.cantidadProfesiones,
      puntosUniversalesIniciales:
        dependencias.configuracionProgresoMagico.reglas
          .puntosUniversalesIniciales,
      rutaCumpleObjetivo: progresion.resumen.cumpleObjetivo,
      expedicionesEstimadasNivel10: redondear(
        progresion.rutaRecomendada.reduce(
          (total, fila) => total + fila.expedicionesEsperadas,
          0,
        ),
      ),
      ritmoMagicoMedio: progresionMagica.resumen.usoMedio,
      puntosArbolCompleto: puntosHabilidad.resumen.costoArbolCompleto,
      casosVaritaCostoCasiNulo:
        sostenibilidadMana.resumen.casosVaritaCostoCasiNulo,
      pruebasFocalizadas: combate.pruebasFocalizadas.resumen.casos,
      casosEfectos: efectos.resumen.casosProbabilidad +
        efectos.resumen.contratosProbados +
        efectos.resumen.inmunidadesProbadas,
      enemigosEfectosAnalizados: efectos.resumen.enemigosVariantesAnalizados,
      mapasRegresionGenerados: regresion.resumen.mapasGenerados,
      casosRegresion: regresion.resumen.correctos +
        regresion.resumen.advertencias + regresion.resumen.incorrectos,
    },
    progresion,
    maestrias,
    progresionMagica,
    puntosHabilidad,
    mana,
    sostenibilidadMana,
    habilidades,
    armas,
    combate,
    efectos,
    regresion,
    constitucion,
    escenariosTeoricos,
    conclusiones: combinarConclusiones(
      crearConclusionesProgresionRecursos({
        progresion,
        progresionMagica,
        puntosHabilidad,
        mana,
        sostenibilidadMana,
        escenariosTeoricos,
      }),
      combate.conclusiones,
      efectos.conclusiones,
      regresion.conclusiones,
    ),
    advertencias,
  };
}

function crearInformeProgresion({
  configuracionMapas,
  configuracionEnemigos,
  configuracionProgresoMagico,
  objetivosBalance,
}) {
  const mapas = analizarBalanceProgresion({
    configuracionMapas,
    configuracionEnemigos,
    objetivosBalance,
  });
  const tablaNiveles = crearTablaProgresion(
    objetivosBalance.nivelMaximoContenido,
  ).map((fila) => ({
    ...fila,
    experienciaAcumuladaParaSiguiente:
      fila.experienciaAcumulada + fila.experienciaParaSiguiente,
    puntosAtributoAcumulados: Math.max(0, fila.nivel - 1),
    puntosUniversalesAcumulados:
      configuracionProgresoMagico.reglas.puntosUniversalesIniciales +
      Math.max(0, fila.nivel - 1) *
        configuracionProgresoMagico.reglas.puntosUniversalesPorNivelGeneral,
  }));

  return {
    tipoResultado: "calculo_teorico_canonico",
    determinista: true,
    resumen: mapas.resumen,
    configuracion: mapas.configuracion,
    tablaNiveles,
    rutaRecomendada: mapas.rutaRecomendada,
    detalleMapas: mapas.detalleMapas,
  };
}

function crearInformeMaestrias({
  configuracionProgresoMagico,
  configuracionEjecucionHabilidades,
}) {
  const umbrales = crearUmbralesMaestria(configuracionProgresoMagico);
  const filas = [];

  for (const habilidad of Object.values(
    configuracionEjecucionHabilidades.habilidades,
  )) {
    const categoria = obtenerCategoriaHabilidad(
      habilidad.requisitoNivelMaestria,
    );

    for (const [gradoTexto, grado] of Object.entries(
      habilidad.ejecucion.grados,
    )) {
      const gradoNumero = Number(gradoTexto);
      const experienciaPorUso = obtenerExperienciaRealPorUso({
        configuracionProgresoMagico,
        idMaestria: habilidad.maestria,
        manaConsumido: grado.costoMana,
      });
      const puedeSubirHasta3 = habilidad.requisitoNivelMaestria === 0;
      const puedeSubirDesde3Hasta6 =
        habilidad.requisitoNivelMaestria <= 3;

      filas.push({
        idHabilidad: habilidad.id,
        habilidad: habilidad.nombre,
        maestria: habilidad.maestria,
        categoria,
        grado: gradoNumero,
        costoMana: grado.costoMana,
        experienciaPorUso,
        usosDesdeCeroANivel3: puedeSubirHasta3
          ? simularUsosMaestria({
              configuracionProgresoMagico,
              idMaestria: habilidad.maestria,
              manaConsumido: grado.costoMana,
              nivelObjetivo: 3,
            }).usos
          : null,
        manaDesdeCeroANivel3: puedeSubirHasta3
          ? simularUsosMaestria({
              configuracionProgresoMagico,
              idMaestria: habilidad.maestria,
              manaConsumido: grado.costoMana,
              nivelObjetivo: 3,
            }).manaTotal
          : null,
        usosDesdeNivel3ANivel6: puedeSubirDesde3Hasta6
          ? simularUsosMaestria({
              configuracionProgresoMagico,
              idMaestria: habilidad.maestria,
              manaConsumido: grado.costoMana,
              nivelInicial: 3,
              nivelObjetivo: 6,
            }).usos
          : null,
        manaDesdeNivel3ANivel6: puedeSubirDesde3Hasta6
          ? simularUsosMaestria({
              configuracionProgresoMagico,
              idMaestria: habilidad.maestria,
              manaConsumido: grado.costoMana,
              nivelInicial: 3,
              nivelObjetivo: 6,
            }).manaTotal
          : null,
      });
    }
  }

  const rutasDesbloqueo = Object.keys(
    configuracionProgresoMagico.maestrias,
  ).flatMap((idMaestria) =>
    crearRutasDesbloqueoMaestria({
      idMaestria,
      configuracionProgresoMagico,
      configuracionEjecucionHabilidades,
    }),
  );

  return {
    tipoResultado: "simulacion_determinista_motor_real",
    determinista: true,
    reglas: {
      ...configuracionProgresoMagico.reglas,
      experienciaPorNivel: [
        ...configuracionProgresoMagico.reglas.experienciaPorNivel,
      ],
    },
    umbrales,
    filas,
    rutasDesbloqueo,
  };
}

function crearInformeProgresionMagica({
  configuracionProgresoMagico,
  configuracionEjecucionHabilidades,
  objetivosBalance,
  progresion,
}) {
  const configuracion = objetivosBalance.analisisProgresionMagica;
  if (
    !configuracion ||
    !Array.isArray(configuracion.usosHabilidadPorEnemigo) ||
    !Array.isArray(configuracion.estrategiasPuntos)
  ) {
    throw new Error(
      "ObjetivosBalance.json no define el análisis de progresión mágica.",
    );
  }

  const filas = [];
  for (const idMaestria of Object.keys(configuracionProgresoMagico.maestrias)) {
    for (const usosPorEnemigo of configuracion.usosHabilidadPorEnemigo) {
      for (const estrategia of configuracion.estrategiasPuntos) {
        filas.push(
          simularRutaProgresionMagica({
            idMaestria,
            usosPorEnemigo,
            estrategia,
            configuracionProgresoMagico,
            configuracionEjecucionHabilidades,
            rutaRecomendada: progresion.rutaRecomendada,
          }),
        );
      }
    }
  }

  const usoMedio = resumirUsoMagico({
    filas: filas.filter(
      (fila) =>
        fila.usosPorEnemigo === 2 &&
        fila.estrategia === "conservar_universales",
    ),
    usosPorEnemigo: 2,
  });
  const resumenPorIntensidad = configuracion.usosHabilidadPorEnemigo.map(
    (usosPorEnemigo) =>
      resumirUsoMagico({
        filas: filas.filter(
          (fila) =>
            fila.usosPorEnemigo === usosPorEnemigo &&
            fila.estrategia === "conservar_universales",
        ),
        usosPorEnemigo,
      }),
  );

  return {
    tipoResultado: "simulacion_determinista_motor_real",
    determinista: true,
    descripcion:
      "Simula una especialización elemental usando ProgresoMagicoJugador. La cantidad de usos se obtiene al multiplicar los enemigos estimados de la ruta por 1, 2 o 3 lanzamientos efectivos.",
    configuracion: {
      usosHabilidadPorEnemigo: [...configuracion.usosHabilidadPorEnemigo],
      estrategiasPuntos: [...configuracion.estrategiasPuntos],
      redondeoEnemigos: "Math.round por tramo de nivel",
    },
    resumen: {
      cantidadEscenarios: filas.length,
      usoMedio,
      resumenPorIntensidad,
    },
    filas,
  };
}

function simularRutaProgresionMagica({
  idMaestria,
  usosPorEnemigo,
  estrategia,
  configuracionProgresoMagico,
  configuracionEjecucionHabilidades,
  rutaRecomendada,
}) {
  if (!Number.isInteger(usosPorEnemigo) || usosPorEnemigo <= 0) {
    throw new Error("Los usos de habilidad por enemigo deben ser positivos.");
  }
  if (
    !["conservar_universales", "especializacion_total"].includes(estrategia)
  ) {
    throw new Error(`La estrategia de puntos "${estrategia}" no existe.`);
  }

  const progreso = new ProgresoMagicoJugador({
    configuracion: configuracionProgresoMagico,
    idProfesion: "mago",
  });
  const habilidades = Object.values(
    configuracionEjecucionHabilidades.habilidades,
  )
    .filter((habilidad) => habilidad.maestria === idMaestria)
    .sort(
      (a, b) =>
        a.requisitoNivelMaestria - b.requisitoNivelMaestria ||
        a.id.localeCompare(b.id),
    );

  gastarPuntosEspecializacion({
    progreso,
    habilidades,
    idMaestria,
    estrategia,
  });

  let usosTotales = 0;
  let manaTotal = 0;
  let accesoNivel3 = null;
  let accesoNivel6 = null;
  let arbolCompleto = null;
  const recorrido = [];

  for (const tramo of rutaRecomendada) {
    const usosTramo = Math.max(
      1,
      Math.round(tramo.enemigosEsperados * usosPorEnemigo),
    );

    for (let uso = 0; uso < usosTramo; uso += 1) {
      gastarPuntosEspecializacion({
        progreso,
        habilidades,
        idMaestria,
        estrategia,
      });
      const resumenAntes = progreso.obtenerResumen();
      const maestriaAntes = resumenAntes.maestrias[idMaestria];
      const habilidad = [...habilidades]
        .reverse()
        .find(
          (actual) =>
            maestriaAntes.nivel >= actual.requisitoNivelMaestria &&
            resumenAntes.habilidades[actual.id].grado > 0,
        );
      if (!habilidad) {
        throw new Error(
          `No existe una habilidad aprendida para simular ${idMaestria}.`,
        );
      }
      const grado = resumenAntes.habilidades[habilidad.id].grado;
      const costoMana = habilidad.ejecucion.grados[grado].costoMana;

      usosTotales += 1;
      manaTotal += costoMana;
      progreso.registrarEjecucionEfectiva({
        idEjecucion: `balance:${idMaestria}:${usosPorEnemigo}:${estrategia}:${usosTotales}`,
        idMaestria,
        manaConsumido: costoMana,
        ejecucionEfectiva: true,
      });
      gastarPuntosEspecializacion({
        progreso,
        habilidades,
        idMaestria,
        estrategia,
      });

      const resumenDespues = progreso.obtenerResumen();
      const nivelMaestria = resumenDespues.maestrias[idMaestria].nivel;
      if (accesoNivel3 === null && nivelMaestria >= 3) {
        accesoNivel3 = crearHitoProgresionMagica({
          nivelGeneral: tramo.nivelJugador,
          usosTotales,
          manaTotal,
        });
      }
      if (accesoNivel6 === null && nivelMaestria >= 6) {
        accesoNivel6 = crearHitoProgresionMagica({
          nivelGeneral: tramo.nivelJugador,
          usosTotales,
          manaTotal,
        });
      }
      if (
        arbolCompleto === null &&
        habilidades.every(
          (actual) =>
            resumenDespues.habilidades[actual.id].grado === actual.gradoMaximo,
        )
      ) {
        arbolCompleto = {
          ...crearHitoProgresionMagica({
            nivelGeneral: tramo.nivelJugador,
            usosTotales,
            manaTotal,
          }),
          nivelMaestria,
        };
      }
    }

    progreso.agregarPuntosUniversales(
      configuracionProgresoMagico.reglas.puntosUniversalesPorNivelGeneral,
    );
    gastarPuntosEspecializacion({
      progreso,
      habilidades,
      idMaestria,
      estrategia,
    });
    const resumenTramo = progreso.obtenerResumen();
    recorrido.push({
      nivelGeneralAlcanzado: tramo.siguienteNivel,
      nivelMaestria: resumenTramo.maestrias[idMaestria].nivel,
      experienciaMaestria:
        resumenTramo.maestrias[idMaestria].experienciaTotal,
      usosTotales,
      manaTotal,
      puntosUniversales: resumenTramo.puntosUniversales,
      puntosEspecificos:
        resumenTramo.maestrias[idMaestria].puntosEspecificos,
      grados: Object.fromEntries(
        habilidades.map((habilidad) => [
          habilidad.id,
          resumenTramo.habilidades[habilidad.id].grado,
        ]),
      ),
    });
  }

  const resumenFinal = progreso.obtenerResumen();
  return {
    maestria: idMaestria,
    usosPorEnemigo,
    estrategia,
    nombreEstrategia:
      estrategia === "conservar_universales"
        ? "Conservar universales"
        : "Especialización total",
    accesoNivel3,
    accesoNivel6,
    arbolCompleto,
    nivelMaestriaFinal: resumenFinal.maestrias[idMaestria].nivel,
    experienciaMaestriaFinal:
      resumenFinal.maestrias[idMaestria].experienciaTotal,
    usosTotales,
    manaTotal,
    puntosUniversalesRestantes: resumenFinal.puntosUniversales,
    puntosEspecificosRestantes:
      resumenFinal.maestrias[idMaestria].puntosEspecificos,
    gradosFinales: Object.fromEntries(
      habilidades.map((habilidad) => [
        habilidad.id,
        resumenFinal.habilidades[habilidad.id].grado,
      ]),
    ),
    recorrido,
  };
}

function gastarPuntosEspecializacion({
  progreso,
  habilidades,
  idMaestria,
  estrategia,
}) {
  let huboMejora = true;
  while (huboMejora) {
    huboMejora = false;
    const resumen = progreso.obtenerResumen();
    const maestria = resumen.maestrias[idMaestria];
    const objetivo = habilidades.find(
      (habilidad) =>
        maestria.nivel >= habilidad.requisitoNivelMaestria &&
        resumen.habilidades[habilidad.id].grado < habilidad.gradoMaximo,
    );
    if (!objetivo) return;

    if (maestria.puntosEspecificos > 0) {
      const resultado = progreso.mejorarHabilidad({
        idHabilidad: objetivo.id,
        origenPunto: ORIGENES_PUNTO_HABILIDAD.ESPECIFICO,
        idMaestriaPunto: idMaestria,
      });
      if (resultado.exito) {
        huboMejora = true;
        continue;
      }
    }

    const gradoActual = resumen.habilidades[objetivo.id].grado;
    const puedeUsarUniversal =
      resumen.puntosUniversales > 0 &&
      (estrategia === "especializacion_total" || gradoActual === 0);
    if (puedeUsarUniversal) {
      const resultado = progreso.mejorarHabilidad({
        idHabilidad: objetivo.id,
        origenPunto: ORIGENES_PUNTO_HABILIDAD.UNIVERSAL,
      });
      if (resultado.exito) {
        huboMejora = true;
      }
    }
  }
}

function crearHitoProgresionMagica({ nivelGeneral, usosTotales, manaTotal }) {
  return { nivelGeneral, usosTotales, manaTotal };
}

function resumirUsoMagico({ filas, usosPorEnemigo }) {
  const niveles3 = filas
    .map((fila) => fila.accesoNivel3?.nivelGeneral)
    .filter(Number.isFinite);
  const niveles6 = filas
    .map((fila) => fila.accesoNivel6?.nivelGeneral)
    .filter(Number.isFinite);
  const nivelesArbol = filas
    .map((fila) => fila.arbolCompleto?.nivelGeneral)
    .filter(Number.isFinite);
  return {
    usosPorEnemigo,
    nivelMinimoMaestria3: niveles3.length ? Math.min(...niveles3) : null,
    nivelMaximoMaestria3: niveles3.length ? Math.max(...niveles3) : null,
    nivelMinimoMaestria6: niveles6.length ? Math.min(...niveles6) : null,
    nivelMaximoMaestria6: niveles6.length ? Math.max(...niveles6) : null,
    maestriasQueAlcanzanNivel6: niveles6.length,
    nivelMinimoArbolCompleto: nivelesArbol.length
      ? Math.min(...nivelesArbol)
      : null,
    nivelMaximoArbolCompleto: nivelesArbol.length
      ? Math.max(...nivelesArbol)
      : null,
  };
}

function crearInformePuntosHabilidad({
  configuracionProgresoMagico,
  configuracionEjecucionHabilidades,
}) {
  const habilidadesModelo = Object.values(
    configuracionEjecucionHabilidades.habilidades,
  )
    .filter((habilidad) => habilidad.maestria === "fuego")
    .sort(
      (a, b) =>
        a.requisitoNivelMaestria - b.requisitoNivelMaestria ||
        a.id.localeCompare(b.id),
    );
  const costos = Object.fromEntries(
    habilidadesModelo.map((habilidad) => [
      obtenerCategoriaHabilidad(habilidad.requisitoNivelMaestria),
      habilidad.gradoMaximo,
    ]),
  );
  const costoBasicaIntermedia = costos.basica + costos.intermedia;
  const costoArbolCompleto = costoBasicaIntermedia + costos.avanzada;
  const iniciales =
    configuracionProgresoMagico.reglas.puntosUniversalesIniciales;

  const hitos = [
    {
      nivelMaestria: 3,
      puntosEspecificos: 3,
      puntosUniversalesMinimos: iniciales,
      puntosTotales: 3 + iniciales,
      objetivo: "Habilidad básica en grado máximo",
      puntosNecesarios: costos.basica,
      alcanza: 3 + iniciales >= costos.basica,
    },
    {
      nivelMaestria: 6,
      puntosEspecificos: 6,
      puntosUniversalesMinimos: iniciales,
      puntosTotales: 6 + iniciales,
      objetivo: "Básica e intermedia en grado máximo",
      puntosNecesarios: costoBasicaIntermedia,
      alcanza: 6 + iniciales >= costoBasicaIntermedia,
    },
    {
      nivelMaestria: 8,
      puntosEspecificos: 8,
      puntosUniversalesMinimos: iniciales + 1,
      puntosTotales: 8 + iniciales + 1,
      objetivo: "Árbol elemental completo usando un universal adicional",
      puntosNecesarios: costoArbolCompleto,
      alcanza: 8 + iniciales + 1 >= costoArbolCompleto,
    },
    {
      nivelMaestria: 9,
      puntosEspecificos: 9,
      puntosUniversalesMinimos: iniciales,
      puntosTotales: 9 + iniciales,
      objetivo: "Árbol elemental completo sin gastar más universales",
      puntosNecesarios: costoArbolCompleto,
      alcanza: 9 + iniciales >= costoArbolCompleto,
    },
  ];

  const universalesPorNivel = [1, 3, 6, 10].map((nivelGeneral) => ({
    nivelGeneral,
    puntosUniversalesAcumulados:
      iniciales +
      Math.max(0, nivelGeneral - 1) *
        configuracionProgresoMagico.reglas.puntosUniversalesPorNivelGeneral,
  }));

  return {
    tipoResultado: "calculo_teorico_contrato_canonico",
    determinista: true,
    resumen: {
      costoBasica: costos.basica,
      costoIntermedia: costos.intermedia,
      costoAvanzada: costos.avanzada,
      costoArbolCompleto,
      puntosUniversalesIniciales: iniciales,
      puntosUniversalesPorNivel:
        configuracionProgresoMagico.reglas.puntosUniversalesPorNivelGeneral,
      puntoEspecificoPorNivelMaestria: 1,
    },
    hitos,
    universalesPorNivel,
    conclusion:
      "La ruta natural permite maximizar la básica cerca de maestría 3, la intermedia cerca de maestría 6 y el árbol completo entre maestría 8 y 9. Gastar universales acelera la especialización a cambio de renunciar a otras maestrías.",
  };
}


function crearUmbralesMaestria(configuracionProgresoMagico) {
  let acumulada = 0;
  return configuracionProgresoMagico.reglas.experienciaPorNivel.map(
    (experiencia, indice) => {
      acumulada += experiencia;
      return {
        nivelAlcanzado: indice + 1,
        experienciaTramo: experiencia,
        experienciaAcumulada: acumulada,
        puntosEspecificosAcumulados: indice + 1,
      };
    },
  );
}

function obtenerExperienciaRealPorUso({
  configuracionProgresoMagico,
  idMaestria,
  manaConsumido,
}) {
  const progreso = new ProgresoMagicoJugador({
    configuracion: configuracionProgresoMagico,
    idProfesion: "mago",
  });
  return progreso.registrarEjecucionEfectiva({
    idEjecucion: `balance:${idMaestria}:${manaConsumido}`,
    idMaestria,
    manaConsumido,
    ejecucionEfectiva: true,
  }).experienciaGanada;
}

function simularUsosMaestria({
  configuracionProgresoMagico,
  idMaestria,
  manaConsumido,
  nivelInicial = 0,
  nivelObjetivo,
}) {
  const progreso = new ProgresoMagicoJugador({
    configuracion: configuracionProgresoMagico,
    idProfesion: "mago",
  });
  const experienciaInicial = configuracionProgresoMagico.reglas
    .experienciaPorNivel.slice(0, nivelInicial)
    .reduce((total, valor) => total + valor, 0);

  if (experienciaInicial > 0) {
    progreso.agregarExperienciaMaestria({
      idMaestria,
      cantidad: experienciaInicial,
    });
  }

  let usos = 0;
  let manaTotal = 0;
  while (progreso.obtenerResumen().maestrias[idMaestria].nivel < nivelObjetivo) {
    usos += 1;
    manaTotal += manaConsumido;
    progreso.registrarEjecucionEfectiva({
      idEjecucion: `balance:${idMaestria}:${nivelInicial}:${nivelObjetivo}:${usos}`,
      idMaestria,
      manaConsumido,
      ejecucionEfectiva: true,
    });
    if (usos > 10000) {
      throw new Error("La simulación de maestría superó 10.000 usos.");
    }
  }

  return { usos, manaTotal };
}

function crearRutasDesbloqueoMaestria({
  idMaestria,
  configuracionProgresoMagico,
  configuracionEjecucionHabilidades,
}) {
  const habilidades = Object.values(
    configuracionEjecucionHabilidades.habilidades,
  ).filter((habilidad) => habilidad.maestria === idMaestria);
  const basica = habilidades.find(
    (habilidad) => habilidad.requisitoNivelMaestria === 0,
  );
  const intermedia = habilidades.find(
    (habilidad) => habilidad.requisitoNivelMaestria === 3,
  );

  return [
    crearRutaDesbloqueo({
      idMaestria,
      nombre: "Grados iniciales",
      basica,
      gradoBasica: 1,
      intermedia,
      gradoIntermedia: 1,
      configuracionProgresoMagico,
    }),
    crearRutaDesbloqueo({
      idMaestria,
      nombre: "Grados máximos disponibles",
      basica,
      gradoBasica: basica.gradoMaximo,
      intermedia,
      gradoIntermedia: intermedia.gradoMaximo,
      configuracionProgresoMagico,
    }),
  ];
}

function crearRutaDesbloqueo({
  idMaestria,
  nombre,
  basica,
  gradoBasica,
  intermedia,
  gradoIntermedia,
  configuracionProgresoMagico,
}) {
  const manaBasica = basica.ejecucion.grados[gradoBasica].costoMana;
  const manaIntermedia =
    intermedia.ejecucion.grados[gradoIntermedia].costoMana;
  const progreso = new ProgresoMagicoJugador({
    configuracion: configuracionProgresoMagico,
    idProfesion: "mago",
  });
  let usosBasica = 0;
  let usosIntermedia = 0;
  let manaTotal = 0;

  while (progreso.obtenerResumen().maestrias[idMaestria].nivel < 3) {
    usosBasica += 1;
    manaTotal += manaBasica;
    progreso.registrarEjecucionEfectiva({
      idEjecucion: `ruta:${idMaestria}:${nombre}:b:${usosBasica}`,
      idMaestria,
      manaConsumido: manaBasica,
      ejecucionEfectiva: true,
    });
  }
  while (progreso.obtenerResumen().maestrias[idMaestria].nivel < 6) {
    usosIntermedia += 1;
    manaTotal += manaIntermedia;
    progreso.registrarEjecucionEfectiva({
      idEjecucion: `ruta:${idMaestria}:${nombre}:i:${usosIntermedia}`,
      idMaestria,
      manaConsumido: manaIntermedia,
      ejecucionEfectiva: true,
    });
  }

  return {
    maestria: idMaestria,
    escenario: nombre,
    habilidadBasica: basica.nombre,
    gradoBasica,
    manaBasica,
    usosBasicaHastaNivel3: usosBasica,
    habilidadIntermedia: intermedia.nombre,
    gradoIntermedia,
    manaIntermedia,
    usosIntermediaDesdeNivel3Hasta6: usosIntermedia,
    usosTotales: usosBasica + usosIntermedia,
    manaTotal,
  };
}

function crearInformeMana({
  configuracionPersonaje,
  configuracionEjecucionHabilidades,
}) {
  const costosPorCategoria = obtenerCostosManaPorCategoria(
    configuracionEjecucionHabilidades,
  );
  const filas = [];

  for (const [idProfesion, profesion] of Object.entries(
    configuracionPersonaje.profesiones,
  )) {
    for (let nivel = 1; nivel <= 10; nivel += 1) {
      const atributos = crearPerfilAtributosProfesion({
        configuracionPersonaje,
        idProfesion,
        nivel,
      });
      const recursos = calcularRecursosMaximos({
        nivel,
        atributos,
        estadisticasBase: profesion.estadisticasBase,
        objetosEquipados: [],
      });
      const regeneracionMana = calcularRegeneracionMana({
        regeneracionBase: profesion.estadisticasBase.regeneracionMana,
        sabiduria: atributos.sabiduria,
        manaMaximo: recursos.manaMaximo,
      });

      filas.push({
        idProfesion,
        profesion: profesion.nombre,
        nivel,
        atributos,
        atributoPrioritario: obtenerAtributoPrioritario(profesion),
        vidaMaxima: recursos.vidaMaxima,
        manaMaximo: recursos.manaMaximo,
        regeneracionManaPorPulso: redondear(regeneracionMana),
        pulsosParaRecuperarTodo:
          regeneracionMana > 0
            ? redondear(recursos.manaMaximo / regeneracionMana)
            : null,
        multiplicadorDanioMagico: redondear(
          calcularMultiplicadorDanioMagico(atributos),
        ),
        multiplicadorEfectos: redondear(
          calcularMultiplicadorEfectos(atributos),
        ),
        lanzamientosBasicaBarata: calcularUsosRecurso(
          recursos.manaMaximo,
          costosPorCategoria.basica.minimo,
        ),
        lanzamientosBasicaCara: calcularUsosRecurso(
          recursos.manaMaximo,
          costosPorCategoria.basica.maximo,
        ),
        lanzamientosIntermediaBarata: calcularUsosRecurso(
          recursos.manaMaximo,
          costosPorCategoria.intermedia.minimo,
        ),
        lanzamientosIntermediaCara: calcularUsosRecurso(
          recursos.manaMaximo,
          costosPorCategoria.intermedia.maximo,
        ),
        lanzamientosAvanzadaBarata: calcularUsosRecurso(
          recursos.manaMaximo,
          costosPorCategoria.avanzada.minimo,
        ),
        lanzamientosAvanzadaCara: calcularUsosRecurso(
          recursos.manaMaximo,
          costosPorCategoria.avanzada.maximo,
        ),
        ataquesUnaVarita: calcularUsosRecurso(recursos.manaMaximo, 1),
        ataquesDobleVarita: calcularUsosRecurso(recursos.manaMaximo, 2),
      });
    }
  }

  const perfilesAlternativosMago = crearPerfilesAlternativosMago({
    configuracionPersonaje,
    niveles: NIVELES_RECURSOS_DESTACADOS,
  });

  return {
    tipoResultado: "calculo_teorico_canonico",
    determinista: true,
    descripcionPerfil:
      "Los 27 puntos iniciales se reparten de forma proporcional y reproducible según los pesos de cada profesión. El informe compara distintas decisiones para los puntos obtenidos al subir de nivel.",
    pulsoTemporal: TIEMPO_REFERENCIA,
    costosPorCategoria,
    resumen: {
      cantidadProfesiones: Object.keys(configuracionPersonaje.profesiones).length,
      nivelesPorProfesion: 10,
      estrategiasMago: perfilesAlternativosMago.length,
    },
    filas,
    filasDestacadas: filas.filter((fila) =>
      NIVELES_RECURSOS_DESTACADOS.includes(fila.nivel),
    ),
    perfilesAlternativosMago,
  };
}

function obtenerCostosManaPorCategoria(configuracionEjecucionHabilidades) {
  const agrupados = {
    basica: [],
    intermedia: [],
    avanzada: [],
  };
  for (const habilidad of Object.values(
    configuracionEjecucionHabilidades.habilidades,
  )) {
    const categoria = obtenerCategoriaHabilidad(
      habilidad.requisitoNivelMaestria,
    );
    for (const grado of Object.values(habilidad.ejecucion.grados)) {
      agrupados[categoria].push(grado.costoMana);
    }
  }
  return Object.fromEntries(
    Object.entries(agrupados).map(([categoria, costos]) => [
      categoria,
      {
        minimo: Math.min(...costos),
        maximo: Math.max(...costos),
      },
    ]),
  );
}

function crearPerfilAtributosProfesion({
  configuracionPersonaje,
  idProfesion,
  nivel,
  estrategiaNivel = "prioritario",
}) {
  const profesion = configuracionPersonaje.profesiones[idProfesion];
  const atributos = crearAtributosIniciales(configuracionPersonaje);
  const asignados = Object.fromEntries(
    Object.keys(atributos).map((id) => [id, 0]),
  );
  const maximoCreacion = configuracionPersonaje.atributos.valorMaximo;

  for (
    let punto = 0;
    punto < configuracionPersonaje.atributos.puntosDisponibles;
    punto += 1
  ) {
    const candidatos = configuracionPersonaje.atributos.lista
      .filter(
        ({ id }) =>
          (profesion.pesosAtributos[id] ?? 0) > 0 &&
          atributos[id] < maximoCreacion,
      )
      .map(({ id }, indice) => ({
        id,
        indice,
        prioridad:
          (profesion.pesosAtributos[id] ?? 0) / (asignados[id] + 1),
      }))
      .sort(
        (a, b) => b.prioridad - a.prioridad || a.indice - b.indice,
      );
    if (candidatos.length === 0) {
      throw new Error(
        `No se pudieron distribuir los atributos de ${profesion.nombre}.`,
      );
    }
    const elegido = candidatos[0].id;
    atributos[elegido] += 1;
    asignados[elegido] += 1;
  }

  asignarPuntosNivel({
    atributos,
    cantidad: Math.max(0, nivel - 1),
    estrategiaNivel,
    profesion,
  });
  return atributos;
}

function asignarPuntosNivel({
  atributos,
  cantidad,
  estrategiaNivel,
  profesion,
}) {
  if (estrategiaNivel === "prioritario" || estrategiaNivel === "inteligencia") {
    const atributo =
      estrategiaNivel === "inteligencia"
        ? "inteligencia"
        : obtenerAtributoPrioritario(profesion);
    atributos[atributo] += cantidad;
    return;
  }
  if (estrategiaNivel === "sabiduria") {
    atributos.sabiduria += cantidad;
    return;
  }
  if (estrategiaNivel === "equilibrada") {
    for (let punto = 0; punto < cantidad; punto += 1) {
      const atributo =
        atributos.inteligencia <= atributos.sabiduria
          ? "inteligencia"
          : "sabiduria";
      atributos[atributo] += 1;
    }
    return;
  }
  throw new Error(`La estrategia de atributos "${estrategiaNivel}" no existe.`);
}

function crearPerfilesAlternativosMago({ configuracionPersonaje, niveles }) {
  const profesion = configuracionPersonaje.profesiones.mago;
  const estrategias = [
    { id: "inteligencia", nombre: "Priorizar Inteligencia" },
    { id: "equilibrada", nombre: "Equilibrar INT/SAB" },
    { id: "sabiduria", nombre: "Priorizar Sabiduría" },
  ];
  const filas = [];

  for (const estrategia of estrategias) {
    for (const nivel of niveles) {
      const atributos = crearPerfilAtributosProfesion({
        configuracionPersonaje,
        idProfesion: "mago",
        nivel,
        estrategiaNivel: estrategia.id,
      });
      const recursos = calcularRecursosMaximos({
        nivel,
        atributos,
        estadisticasBase: profesion.estadisticasBase,
        objetosEquipados: [],
      });
      const regeneracionMana = calcularRegeneracionMana({
        regeneracionBase: profesion.estadisticasBase.regeneracionMana,
        sabiduria: atributos.sabiduria,
        manaMaximo: recursos.manaMaximo,
      });
      filas.push({
        estrategia: estrategia.id,
        nombreEstrategia: estrategia.nombre,
        nivel,
        inteligencia: atributos.inteligencia,
        sabiduria: atributos.sabiduria,
        manaMaximo: recursos.manaMaximo,
        regeneracionManaPorPulso: redondear(regeneracionMana),
        pulsosParaRecuperarTodo:
          regeneracionMana > 0
            ? redondear(recursos.manaMaximo / regeneracionMana)
            : null,
        multiplicadorDanioMagico: redondear(
          calcularMultiplicadorDanioMagico(atributos),
        ),
        multiplicadorEfectos: redondear(
          calcularMultiplicadorEfectos(atributos),
        ),
      });
    }
  }
  return filas;
}

function obtenerAtributoPrioritario(profesion) {
  return Object.entries(profesion.pesosAtributos).sort(
    ([idA, pesoA], [idB, pesoB]) => pesoB - pesoA || idA.localeCompare(idB),
  )[0][0];
}

function crearInformeSostenibilidadMana({
  objetivosBalance,
  mana,
  habilidades,
  armas,
}) {
  const configuracion = objetivosBalance.analisisMana;
  if (!configuracion) {
    throw new Error("ObjetivosBalance.json no define el análisis de Maná.");
  }
  const perfiles = mana.filasDestacadas;
  const habilidadesFilas = [];

  for (const perfil of perfiles) {
    for (const habilidad of habilidades.filas) {
      habilidadesFilas.push(
        crearFilaSostenibilidad({
          perfil,
          tipoAccion: "habilidad",
          idAccion: `${habilidad.idHabilidad}:${habilidad.grado}`,
          accion: `${habilidad.habilidad} G${habilidad.grado}`,
          categoria: habilidad.categoria,
          costoMana: habilidad.costoMana,
          costoTemporal: habilidad.costoTemporal,
          costoNetoIrrelevante: configuracion.costoNetoIrrelevante,
        }),
      );
    }
  }

  const varitasFilas = [];
  const varitasRepresentativas = armas.filas.filter(
    (arma, indice, todas) =>
      arma.esVarita &&
      todas.findIndex(
        (otra) => otra.esVarita && otra.tier === arma.tier,
      ) === indice,
  );
  for (const perfil of perfiles) {
    for (const varita of varitasRepresentativas) {
      varitasFilas.push(
        crearFilaSostenibilidad({
          perfil,
          tipoAccion: "varita_simple",
          idAccion: varita.id,
          accion: `${varita.nombre} (una)` ,
          categoria: `tier_${varita.tier}`,
          costoMana: varita.costoMana,
          costoTemporal: varita.costoTemporal,
          costoNetoIrrelevante: configuracion.costoNetoIrrelevante,
        }),
      );
    }
    for (const doble of armas.dobleVarita) {
      varitasFilas.push(
        crearFilaSostenibilidad({
          perfil,
          tipoAccion: "doble_varita",
          idAccion: `doble_varita_tier_${doble.tier}`,
          accion: `Doble varita Tier ${doble.tier}`,
          categoria: `tier_${doble.tier}`,
          costoMana: doble.costoMana,
          costoTemporal: doble.costoTemporal,
          costoNetoIrrelevante: configuracion.costoNetoIrrelevante,
        }),
      );
    }
  }

  const casosVaritaCostoCasiNulo = varitasFilas.filter((fila) =>
    ["sostenible_por_regeneracion", "costo_casi_nulo"].includes(fila.estado),
  ).length;
  const perfilesRecuperacionLenta = perfiles.filter(
    (perfil) =>
      perfil.pulsosParaRecuperarTodo >= configuracion.pulsosRecuperacionLenta,
  );

  return {
    tipoResultado: "calculo_teorico_con_motores_canonicos",
    determinista: true,
    descripcion:
      "El costo neto resta la regeneración promedio que ocurre durante el tiempo de la propia acción. El resultado no incluye movimiento ni esperas, que mejorarían la recuperación.",
    configuracion: { ...configuracion },
    resumen: {
      casosHabilidad: habilidadesFilas.length,
      casosVarita: varitasFilas.length,
      casosVaritaCostoCasiNulo,
      perfilesRecuperacionLenta: perfilesRecuperacionLenta.length,
    },
    habilidades: habilidadesFilas,
    varitas: varitasFilas,
    perfilesMago: mana.perfilesAlternativosMago,
    perfilesRecuperacionLenta,
  };
}

function crearFilaSostenibilidad({
  perfil,
  tipoAccion,
  idAccion,
  accion,
  categoria,
  costoMana,
  costoTemporal,
  costoNetoIrrelevante,
}) {
  const regeneracionDuranteAccion =
    perfil.regeneracionManaPorPulso * (costoTemporal / TIEMPO_REFERENCIA);
  const costoNetoPromedio = costoMana - regeneracionDuranteAccion;
  let estado = "limitado_por_mana";
  if (costoNetoPromedio <= 0) {
    estado = "sostenible_por_regeneracion";
  } else if (costoNetoPromedio <= costoNetoIrrelevante) {
    estado = "costo_casi_nulo";
  }

  return {
    idProfesion: perfil.idProfesion,
    profesion: perfil.profesion,
    nivel: perfil.nivel,
    manaMaximo: perfil.manaMaximo,
    regeneracionManaPorPulso: perfil.regeneracionManaPorPulso,
    tipoAccion,
    idAccion,
    accion,
    categoria,
    costoMana,
    costoTemporal,
    regeneracionDuranteAccion: redondear(regeneracionDuranteAccion),
    costoNetoPromedio: redondear(costoNetoPromedio),
    accionesAproximadasHastaAgotar:
      costoNetoPromedio > 0
        ? Math.max(1, Math.floor(perfil.manaMaximo / costoNetoPromedio))
        : null,
    estado,
  };
}

function crearConclusionesProgresionRecursos({
  progresion,
  progresionMagica,
  puntosHabilidad,
  mana,
  sostenibilidadMana,
  escenariosTeoricos,
}) {
  const expedicionesTotales = redondear(
    progresion.rutaRecomendada.reduce(
      (total, fila) => total + fila.expedicionesEsperadas,
      0,
    ),
  );
  const expediciones = progresion.rutaRecomendada.map(
    (fila) => fila.expedicionesEsperadas,
  );
  const usoBajo = progresionMagica.resumen.resumenPorIntensidad.find(
    (fila) => fila.usosPorEnemigo === 1,
  );
  const usoMedio = progresionMagica.resumen.resumenPorIntensidad.find(
    (fila) => fila.usosPorEnemigo === 2,
  );
  const usoAlto = progresionMagica.resumen.resumenPorIntensidad.find(
    (fila) => fila.usosPorEnemigo === 3,
  );
  const magoNivel1 = mana.filas.find(
    (fila) => fila.idProfesion === "mago" && fila.nivel === 1,
  );
  const magoNivel10 = mana.filas.find(
    (fila) => fila.idProfesion === "mago" && fila.nivel === 10,
  );

  return {
    resumenFacil: [
      {
        id: "experiencia_general",
        queSeAnalizo:
          "Cuántos mapas y enemigos hacen falta para pasar del nivel 1 al 10.",
        porQue:
          "Para comprobar que el personaje no suba demasiado rápido ni quede bloqueado.",
        conclusion:
          `La ruta completa necesita unas ${expedicionesTotales} expediciones. Cada nivel requiere entre ${redondear(
            Math.min(...expediciones),
          )} y ${redondear(Math.max(...expediciones))} expediciones. No aparece un bloqueo ni un salto brusco de experiencia.`,
        recomendacion:
          "Mantener por ahora la experiencia general y volver a revisarla junto con la dificultad real de los combates.",
      },
      {
        id: "ritmo_maestria",
        queSeAnalizo:
          "Cuándo se alcanzan maestría 3 y 6 usando una, dos o tres habilidades por enemigo.",
        porQue:
          "Para comprobar que las habilidades intermedias y avanzadas aparezcan durante la progresión normal.",
        conclusion:
          `Con dos usos por enemigo, maestría 3 llega entre nivel general ${usoMedio.nivelMinimoMaestria3} y ${usoMedio.nivelMaximoMaestria3}, y maestría 6 entre ${usoMedio.nivelMinimoMaestria6} y ${usoMedio.nivelMaximoMaestria6}. Con un solo uso el progreso es lento; con tres usos es rápido.`,
        recomendacion:
          "No cambiar todavía la experiencia de maestría. El bloque de daño debe confirmar cuántos lanzamientos necesita realmente cada enemigo.",
      },
      {
        id: "puntos_habilidad",
        queSeAnalizo:
          "Cuántos puntos universales y específicos hacen falta para mejorar un árbol elemental.",
        porQue:
          "Para evitar que una habilidad se maximice sin esfuerzo o que falten puntos para avanzar.",
        conclusion:
          puntosHabilidad.conclusion,
        recomendacion:
          "Mantener un punto universal por nivel y un punto específico por nivel de maestría.",
      },
      {
        id: "mana",
        queSeAnalizo:
          "Reserva, regeneración y cantidad de acciones mágicas posibles para Guerrero, Rogue y Mago.",
        porQue:
          "Para comprobar que el Mago pueda jugar y que los híbridos no obtengan magia ilimitada.",
        conclusion:
          `El Mago pasa de ${magoNivel1.manaMaximo} a ${magoNivel10.manaMaximo} de Maná. La reserva alcanza para varias habilidades avanzadas, pero recuperar toda la barra priorizando Inteligencia pasa de ${magoNivel1.pulsosParaRecuperarTodo} a ${magoNivel10.pulsosParaRecuperarTodo} pulsos. Priorizar Sabiduría reduce esa espera a cambio de daño directo.`,
        recomendacion:
          "Mantener por ahora el Maná máximo y la regeneración. Comparar después el consumo contra la duración real de mapas y jefes.",
      },
      {
        id: "varitas",
        queSeAnalizo:
          "Cuánto Maná pierden realmente una varita y dos varitas después de considerar la regeneración durante el ataque.",
        porQue:
          "Para comprobar que el coste de los ataques mágicos básicos tenga importancia.",
        conclusion:
          `${sostenibilidadMana.resumen.casosVaritaCostoCasiNulo} escenarios de varita resultan sostenibles o tienen un coste neto casi nulo. El coste de una varita es especialmente poco relevante para Rogue y Mago.`,
        recomendacion:
          "No aumentar todavía el coste. Primero hay que comparar el daño de varitas y bastones en el análisis de combate.",
      },
      {
        id: "pociones_mana",
        queSeAnalizo:
          "Qué aportarían pociones fijas y porcentuales sin agregarlas al juego.",
        porQue:
          "Para saber si son necesarias antes de crear otro consumible.",
        conclusion:
          escenariosTeoricos.estadoActual.existePocionMana
            ? "Ya existe una fuente consumible de recuperación de Maná."
            : "No existe una poción de Maná y las mediciones actuales no demuestran todavía que sea necesaria para mapas normales.",
        recomendacion:
          "Posponer la poción. Si los jefes agotan al Mago, probar primero una recuperación del 25 % con coste temporal 100.",
      },
    ],
    decisionRecomendada: {
      modificarExperienciaGeneral: false,
      modificarPuntosHabilidad: false,
      modificarManaMaximo: false,
      modificarRegeneracionMana: false,
      modificarExperienciaMaestria: false,
      agregarPocionMana: false,
      revisarCostoVaritasConDanio: true,
      motivo:
        "La progresión general y los puntos son coherentes. Las dudas restantes dependen del daño y de la cantidad real de acciones por combate.",
    },
    sensibilidadMaestria: { usoBajo, usoMedio, usoAlto },
  };
}


function crearInformeHabilidades({ configuracionEjecucionHabilidades }) {
  const filas = [];

  for (const habilidad of Object.values(
    configuracionEjecucionHabilidades.habilidades,
  )) {
    const categoria = obtenerCategoriaHabilidad(
      habilidad.requisitoNivelMaestria,
    );

    for (const [gradoTexto, grado] of Object.entries(
      habilidad.ejecucion.grados,
    )) {
      const efectos = grado.efectos.map((efecto) => ({
        id: efecto.efectoId,
        nombre: efecto.nombreEfecto,
        probabilidadBase: efecto.probabilidadBase,
        duracion: efecto.duracion,
        resistenciaId: efecto.resistenciaId,
        inmunidadId: efecto.inmunidadId,
        politicaAcumulacion: efecto.politicaAcumulacion,
        danioPeriodicoBaseTotal: calcularDanioPeriodicoBase(efecto),
      }));
      const danioDirectoBase = grado.danio.reduce(
        (total, componente) => total + componente.valorBase,
        0,
      );
      const danioPeriodicoBase = efectos.reduce(
        (total, efecto) => total + efecto.danioPeriodicoBaseTotal,
        0,
      );

      filas.push({
        idHabilidad: habilidad.id,
        habilidad: habilidad.nombre,
        maestria: habilidad.maestria,
        categoria,
        requisitoNivelMaestria: habilidad.requisitoNivelMaestria,
        grado: Number(gradoTexto),
        costoMana: grado.costoMana,
        costoTemporal: grado.costoTemporalBase,
        enfriamientoPosterior: 0,
        alcance: grado.alcance,
        formaImpacto: resumirFormaImpacto(grado.formaImpacto),
        danioDirectoBase,
        danioPeriodicoBase,
        danioPotencialBase: danioDirectoBase + danioPeriodicoBase,
        efectos,
      });
    }
  }

  return {
    tipoResultado: "inventario_configuracion_validada",
    determinista: true,
    resumen: {
      cantidadHabilidades: Object.keys(
        configuracionEjecucionHabilidades.habilidades,
      ).length,
      cantidadGrados: filas.length,
      basicas: filas.filter((fila) => fila.categoria === "basica").length,
      intermedias: filas.filter((fila) => fila.categoria === "intermedia")
        .length,
      avanzadas: filas.filter((fila) => fila.categoria === "avanzada").length,
    },
    filas,
  };
}

function calcularDanioPeriodicoBase(efecto) {
  if (!Number.isFinite(efecto.valorBase) || !Number.isFinite(efecto.intervalo)) {
    return 0;
  }
  return efecto.valorBase * Math.floor(efecto.duracion / efecto.intervalo);
}

function resumirFormaImpacto(formaImpacto) {
  if (!formaImpacto || formaImpacto.tipo === "individual") {
    return "individual";
  }
  if (formaImpacto.tipo === "radio") {
    return `radio ${formaImpacto.radio}`;
  }
  if (formaImpacto.tipo === "cadena") {
    return `cadena ${formaImpacto.maximoObjetivos}`;
  }
  if (formaImpacto.tipo === "linea") {
    return `línea ${formaImpacto.longitud}×${formaImpacto.ancho}`;
  }
  return formaImpacto.tipo;
}

function crearInformeArmas({ configuracionObjetos }) {
  const armas = Object.entries(configuracionObjetos)
    .filter(([, objeto]) => objeto.tipo === "arma")
    .map(([id, objeto]) => {
      const propiedades = objeto.propiedades;
      const minimo = esVarita(objeto)
        ? propiedades.danioElementalMinimo
        : propiedades.danioFisicoMinimo;
      const maximo = esVarita(objeto)
        ? propiedades.danioElementalMaximo
        : propiedades.danioFisicoMaximo;

      return {
        id,
        nombre: objeto.nombre,
        tier: objeto.tierBase,
        familia: objeto.familiaObjeto,
        tipoAtaque: propiedades.tipoAtaque,
        danioMinimoNominal: minimo,
        danioMaximoNominal: maximo,
        danioPromedioNominal: redondear((minimo + maximo) / 2),
        costoTemporal: propiedades.costoAtaque,
        alcance: propiedades.alcance,
        probabilidadCritico: propiedades.probabilidadCritico,
        multiplicadorCritico: propiedades.multiplicadorCritico,
        costoMana: propiedades.costoManaAtaqueBasico ?? 0,
        potenciaHabilidad: propiedades.potenciaHabilidad ?? 0,
        requiereMunicion: propiedades.requiereQuiver === true,
        recargaSeparada: false,
        esVarita: esVarita(objeto),
        esBaston: esBaston(objeto),
      };
    });

  const dobleVarita = [];
  const tiers = [...new Set(armas.filter((arma) => arma.esVarita).map((arma) => arma.tier))];
  for (const tier of tiers) {
    const varita = Object.values(configuracionObjetos).find(
      (objeto) => esVarita(objeto) && objeto.tierBase === tier,
    );
    dobleVarita.push({
      tier,
      costoTemporal: calcularCostoBaseAtaque({
        esAtaqueDual: true,
        armaPrincipal: varita,
        armaSecundaria: varita,
      }),
      costoMana: 2 * varita.propiedades.costoManaAtaqueBasico,
      potenciaHabilidad: calcularPotenciaHabilidadObjetos([varita, varita]),
      multiplicadorManoPrincipal:
        CONFIGURACION_COMBATE.dosArmas.multiplicadorManoPrincipal,
      multiplicadorManoSecundaria:
        CONFIGURACION_COMBATE.dosArmas.multiplicadorManoSecundaria,
    });
  }

  return {
    tipoResultado: "inventario_configuracion_validada",
    determinista: true,
    resumen: {
      cantidadArmas: armas.length,
      cantidadVaritas: armas.filter((arma) => arma.esVarita).length,
      cantidadBastones: armas.filter((arma) => arma.esBaston).length,
      arcosSinRecargaSeparada: armas.filter(
        (arma) => arma.familia === "arco" && !arma.recargaSeparada,
      ).length,
    },
    filas: armas,
    dobleVarita,
  };
}

function crearInformeConstitucion({
  configuracionPersonaje,
  objetivosBalance,
}) {
  const valoresPrueba =
    objetivosBalance.escenariosTeoricos.constitucionResistenciasEfectos
      .valoresConstitucionPrueba;
  const configuracion =
    CONFIGURACION_COMBATE.resistenciasEfectos.constitucion;
  const filas = valoresPrueba.map((constitucion) => {
    const bono =
      calcularBonoResistenciasEfectosPorConstitucion(constitucion);
    return {
      constitucion,
      bonoResistencia: bono,
      probabilidadFinalBase100: redondear(100 * (1 - bono / 100)),
      probabilidadFinalBase40: redondear(40 * (1 - bono / 100)),
      probabilidadFinalBase30: redondear(30 * (1 - bono / 100)),
      probabilidadFinalBase20: redondear(20 * (1 - bono / 100)),
      estado: "correcto",
      criterio:
        `Fórmula activa: máximo ${configuracion.bonificacionMaxima} % y ` +
        "sin convertir resistencia en inmunidad.",
    };
  });

  const perfiles = [];
  for (const [idProfesion, profesion] of Object.entries(
    configuracionPersonaje.profesiones,
  )) {
    for (const nivel of NIVELES_RECURSOS_DESTACADOS) {
      const atributos = crearPerfilAtributosProfesion({
        configuracionPersonaje,
        idProfesion,
        nivel,
      });
      perfiles.push({
        idProfesion,
        profesion: profesion.nombre,
        nivel,
        constitucion: atributos.constitucion,
        bonoResistencia:
          calcularBonoResistenciasEfectosPorConstitucion(
            atributos.constitucion,
          ),
      });
    }
  }

  const apilamiento = [];
  for (const constitucion of [8, 15, 28]) {
    const bono =
      calcularBonoResistenciasEfectosPorConstitucion(constitucion);
    for (const resistenciaEquipo of [0, 25, 50, 75]) {
      apilamiento.push({
        constitucion,
        bonoConstitucion: bono,
        resistenciaEquipo,
        resistenciaFinal: Math.min(
          CONFIGURACION_COMBATE.resistencias.maxima,
          bono + resistenciaEquipo,
        ),
      });
    }
  }

  return {
    tipoResultado: "configuracion_jugable_validada",
    determinista: true,
    implementado: true,
    formula:
      `min(${configuracion.bonificacionMaxima}, ` +
      `floor(max(0, Constitución - ${configuracion.referencia}) / ` +
      `${configuracion.puntosPorPorcentaje})) y límite final ` +
      `${CONFIGURACION_COMBATE.resistencias.maxima} %`,
    resistenciasAfectadas: [...RESISTENCIAS_EFECTOS_VISIBLES],
    configuracion: { ...configuracion },
    filas,
    perfiles,
    apilamiento,
  };
}

function crearInformeEscenariosTeoricos({
  configuracionObjetos,
  configuracionEjecucionHabilidades,
  configuracionPersonaje,
  objetivosBalance,
}) {
  const escenarios = objetivosBalance.escenariosTeoricos;
  const recarga = escenarios.recargaArco.costoTemporalRecarga;
  const arcos = Object.entries(configuracionObjetos)
    .filter(([, objeto]) => objeto.familiaObjeto === "arco")
    .map(([id, objeto]) => {
      const propiedades = objeto.propiedades;
      const promedio =
        (propiedades.danioFisicoMinimo + propiedades.danioFisicoMaximo) / 2;
      const cicloActual = propiedades.costoAtaque;
      const cicloConRecarga = cicloActual + recarga;
      const multiplicadorCompensacion = cicloConRecarga / cicloActual;
      return {
        id,
        arco: objeto.nombre,
        tier: objeto.tierBase,
        danioPromedioNominal: redondear(promedio),
        cicloActual,
        cicloConRecarga,
        danioPor100Actual: redondear((promedio / cicloActual) * 100),
        danioPor100ConRecarga: redondear((promedio / cicloConRecarga) * 100),
        multiplicadorDanioParaIgualar: redondear(multiplicadorCompensacion),
        danioPromedioParaIgualar: redondear(
          promedio * multiplicadorCompensacion,
        ),
      };
    });

  const espera = escenarios.esperaHabilidadesBasicas.costoTemporalEspera;
  const habilidadesBasicas = [];
  for (const habilidad of Object.values(
    configuracionEjecucionHabilidades.habilidades,
  ).filter((habilidad) => habilidad.requisitoNivelMaestria === 0)) {
    for (const [gradoTexto, grado] of Object.entries(
      habilidad.ejecucion.grados,
    )) {
      const danioDirecto = grado.danio.reduce(
        (total, componente) => total + componente.valorBase,
        0,
      );
      const danioPeriodico = grado.efectos.reduce(
        (total, efecto) => total + calcularDanioPeriodicoBase(efecto),
        0,
      );
      const danioPotencial = danioDirecto + danioPeriodico;
      const cicloConEspera = grado.costoTemporalBase + espera;
      habilidadesBasicas.push({
        idHabilidad: habilidad.id,
        habilidad: habilidad.nombre,
        grado: Number(gradoTexto),
        danioPotencialBase: danioPotencial,
        cicloActual: grado.costoTemporalBase,
        cicloConEspera,
        danioPotencialPor100Actual: redondear(
          (danioPotencial / grado.costoTemporalBase) * 100,
        ),
        danioPotencialPor100ConEspera: redondear(
          (danioPotencial / cicloConEspera) * 100,
        ),
        reduccionRendimientoPorcentual: redondear(
          (1 - grado.costoTemporalBase / cicloConEspera) * 100,
        ),
      });
    }
  }

  const pocionesMana = [];
  const perfilesMana = crearInformeMana({
    configuracionPersonaje,
    configuracionEjecucionHabilidades,
  }).filasDestacadas;
  for (const perfil of perfilesMana) {
    for (const cantidad of escenarios.pocionesMana.recuperacionesFijasPrueba) {
      pocionesMana.push(
        crearFilaPocionMana({
          perfil,
          escenario: `${cantidad} Maná fijo`,
          recuperacion: Math.min(cantidad, perfil.manaMaximo),
          costoTemporal: escenarios.pocionesMana.costoTemporalConsumo,
        }),
      );
    }
    for (const porcentaje of escenarios.pocionesMana
      .recuperacionesPorcentualesPrueba) {
      pocionesMana.push(
        crearFilaPocionMana({
          perfil,
          escenario: `${porcentaje} % del Maná máximo`,
          recuperacion: Math.round(perfil.manaMaximo * (porcentaje / 100)),
          costoTemporal: escenarios.pocionesMana.costoTemporalConsumo,
        }),
      );
    }
  }

  return {
    tipoResultado: "escenarios_teoricos_no_implementados",
    determinista: true,
    implementado: false,
    estadoActual: {
      arcoTieneRecargaSeparada: false,
      habilidadesTienenEnfriamiento: false,
      existePocionMana: Object.values(configuracionObjetos).some(
        (objeto) =>
          objeto.tipo === "consumible" &&
          objeto.propiedades?.efectos?.some(
            (efecto) => efecto.tipo === "recuperarMana",
          ),
      ),
    },
    arcos,
    habilidadesBasicas,
    pocionesMana,
  };
}

function crearFilaPocionMana({
  perfil,
  escenario,
  recuperacion,
  costoTemporal,
}) {
  return {
    idProfesion: perfil.idProfesion,
    profesion: perfil.profesion,
    nivel: perfil.nivel,
    manaMaximo: perfil.manaMaximo,
    escenario,
    recuperacion,
    costoTemporal,
    lanzamientosAdicionalesCosto3: calcularUsosRecurso(recuperacion, 3),
    lanzamientosAdicionalesCosto6: calcularUsosRecurso(recuperacion, 6),
    lanzamientosAdicionalesCosto10: calcularUsosRecurso(recuperacion, 10),
    ataquesAdicionalesUnaVarita: calcularUsosRecurso(recuperacion, 1),
    ataquesAdicionalesDobleVarita: calcularUsosRecurso(recuperacion, 2),
  };
}

function obtenerCategoriaHabilidad(requisitoNivelMaestria) {
  if (requisitoNivelMaestria === 0) return "basica";
  if (requisitoNivelMaestria === 3) return "intermedia";
  if (requisitoNivelMaestria === 6) return "avanzada";
  return "desconocida";
}

function calcularUsosRecurso(recurso, costo) {
  return costo > 0 ? Math.floor(recurso / costo) : null;
}

function validarEntrada(entrada) {
  for (const [nombre, valor] of Object.entries(entrada)) {
    if (nombre === "configuracionGeneracionObjetos" && valor === null) {
      continue;
    }
    if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
      throw new Error(`El analizador necesita ${nombre} válido.`);
    }
  }
  if (!entrada.configuracionPersonaje.profesiones) {
    throw new Error("La configuración de personaje no contiene profesiones.");
  }
  if (!entrada.configuracionEnemigos.plantillas) {
    throw new Error("La configuración de enemigos no contiene plantillas.");
  }
  if (!entrada.configuracionMapas.plantillas) {
    throw new Error("La configuración de mapas no contiene plantillas.");
  }
  if (!entrada.configuracionProgresoMagico.reglas) {
    throw new Error("La configuración de progreso mágico no está validada.");
  }
  if (!entrada.configuracionEjecucionHabilidades.habilidades) {
    throw new Error("La configuración de habilidades no está validada.");
  }
  if (!entrada.objetivosBalance.escenariosTeoricos) {
    throw new Error("ObjetivosBalance.json no contiene escenarios teóricos.");
  }
}

function combinarConclusiones(...informes) {
  return {
    resumenFacil: informes.flatMap(
      (informe) => informe?.resumenFacil ?? [],
    ),
  };
}

function redondear(valor) {
  return Number(valor.toFixed(2));
}

function congelarProfundamente(valor) {
  if (!valor || typeof valor !== "object" || Object.isFrozen(valor)) {
    return valor;
  }
  for (const contenido of Object.values(valor)) {
    congelarProfundamente(contenido);
  }
  return Object.freeze(valor);
}
