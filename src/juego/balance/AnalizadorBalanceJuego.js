import { CONFIGURACION_COMBATE } from "../../config/ConfiguracionCombate.js";
import { calcularRecursosMaximos } from "../../entidad/destructible/combatiente/EstadisticasDerivadas.js";
import { calcularCostoBaseAtaque } from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";
import { analizarBalanceProgresion } from "./AnalizadorBalanceProgresion.js";
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
import { ProgresoMagicoJugador } from "../maestrias/ProgresoMagicoJugador.js";
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
// Los escenarios de Constitución, recarga, espera y pociones se marcan como
// teóricos y nunca alteran una instancia de jugador ni los JSON jugables.
export function crearAnalizadorBalanceJuego({
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionMapas,
  configuracionProgresoMagico,
  configuracionEjecucionHabilidades,
  objetivosBalance,
} = {}) {
  validarEntrada({
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
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
    progresion: () => obtener("progresion", crearInformeProgresion),
    maestrias: () => obtener("maestrias", crearInformeMaestrias),
    mana: () => obtener("mana", crearInformeMana),
    habilidades: () => obtener("habilidades", crearInformeHabilidades),
    armas: () => obtener("armas", crearInformeArmas),
    constitucion: () => obtener("constitucion", crearInformeConstitucion),
    escenariosTeoricos: () =>
      obtener("escenariosTeoricos", crearInformeEscenariosTeoricos),
    lineaBase: () =>
      obtener("lineaBase", () =>
        crearInformeLineaBase({
          progresion: analizador.progresion(),
          maestrias: analizador.maestrias(),
          mana: analizador.mana(),
          habilidades: analizador.habilidades(),
          armas: analizador.armas(),
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
  mana,
  habilidades,
  armas,
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
      id: "constitucion_no_implementada",
      nivel: "informacion",
      mensaje:
        "El aporte de Constitución a resistencias se calcula solo como escenario teórico.",
    },
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
    versionInforme: 1,
    tipoResultado: "linea_base",
    determinista: true,
    origenes: {
      progresionGeneral: "SistemaProgresion y FabricaEnemigos",
      progresionMagica: "ProgresoMagicoJugador",
      recursos: "EstadisticasDerivadas y CalculadorAtributosMagicos",
      catalizadores: "SistemaCatalizadores y ConfiguracionAtaque",
      escenarios: "cálculos teóricos aislados",
    },
    resumen: {
      nivelesAnalizados: progresion.tablaNiveles.length,
      mapasAnalizados: progresion.detalleMapas.length,
      habilidadesAnalizadas: habilidades.resumen.cantidadHabilidades,
      gradosAnalizados: habilidades.resumen.cantidadGrados,
      armasAnalizadas: armas.resumen.cantidadArmas,
      profesionesAnalizadas: mana.resumen.cantidadProfesiones,
      puntosUniversalesIniciales:
        dependencias.configuracionProgresoMagico.reglas
          .puntosUniversalesIniciales,
      rutaCumpleObjetivo: progresion.resumen.cumpleObjetivo,
    },
    progresion,
    maestrias,
    mana,
    habilidades,
    armas,
    constitucion,
    escenariosTeoricos,
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
      const puedeSubirDesde3Hasta6 = habilidad.requisitoNivelMaestria <= 3;

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
  const experienciaInicial =
    configuracionProgresoMagico.reglas.experienciaPorNivel
      .slice(0, nivelInicial)
      .reduce((total, valor) => total + valor, 0);

  if (experienciaInicial > 0) {
    progreso.agregarExperienciaMaestria({
      idMaestria,
      cantidad: experienciaInicial,
    });
  }

  let usos = 0;
  let manaTotal = 0;
  while (
    progreso.obtenerResumen().maestrias[idMaestria].nivel < nivelObjetivo
  ) {
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
  const manaIntermedia = intermedia.ejecucion.grados[gradoIntermedia].costoMana;
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

  return {
    tipoResultado: "calculo_teorico_canonico",
    determinista: true,
    descripcionPerfil:
      "Los 27 puntos iniciales se reparten de forma proporcional y reproducible según los pesos de cada profesión. Los puntos de nivel se asignan al atributo de mayor peso.",
    pulsoTemporal: TIEMPO_REFERENCIA,
    costosPorCategoria,
    resumen: {
      cantidadProfesiones: Object.keys(configuracionPersonaje.profesiones)
        .length,
      nivelesPorProfesion: 10,
    },
    filas,
    filasDestacadas: filas.filter((fila) =>
      NIVELES_RECURSOS_DESTACADOS.includes(fila.nivel),
    ),
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
        prioridad: (profesion.pesosAtributos[id] ?? 0) / (asignados[id] + 1),
      }))
      .sort((a, b) => b.prioridad - a.prioridad || a.indice - b.indice);
    if (candidatos.length === 0) {
      throw new Error(
        `No se pudieron distribuir los atributos de ${profesion.nombre}.`,
      );
    }
    const elegido = candidatos[0].id;
    atributos[elegido] += 1;
    asignados[elegido] += 1;
  }

  const prioritario = obtenerAtributoPrioritario(profesion);
  atributos[prioritario] += Math.max(0, nivel - 1);
  return atributos;
}

function obtenerAtributoPrioritario(profesion) {
  return Object.entries(profesion.pesosAtributos).sort(
    ([idA, pesoA], [idB, pesoB]) => pesoB - pesoA || idA.localeCompare(idB),
  )[0][0];
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
  if (
    !Number.isFinite(efecto.valorBase) ||
    !Number.isFinite(efecto.intervalo)
  ) {
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
  const tiers = [
    ...new Set(armas.filter((arma) => arma.esVarita).map((arma) => arma.tier)),
  ];
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
  const configuracion =
    objetivosBalance.escenariosTeoricos.constitucionResistenciasEfectos;
  const filas = configuracion.valoresConstitucionPrueba.map((constitucion) => {
    const bono = calcularBonoConstitucion(constitucion, configuracion);
    return {
      constitucion,
      bonoResistencia: bono,
      probabilidadFinalBase100: redondear(100 * (1 - bono / 100)),
      probabilidadFinalBase40: redondear(40 * (1 - bono / 100)),
      probabilidadFinalBase30: redondear(30 * (1 - bono / 100)),
      probabilidadFinalBase20: redondear(20 * (1 - bono / 100)),
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
        bonoResistencia: calcularBonoConstitucion(
          atributos.constitucion,
          configuracion,
        ),
      });
    }
  }

  const apilamiento = [];
  for (const constitucion of [8, 15, 28]) {
    const bono = calcularBonoConstitucion(constitucion, configuracion);
    for (const resistenciaEquipo of [0, 25, 50, 75]) {
      apilamiento.push({
        constitucion,
        bonoConstitucion: bono,
        resistenciaEquipo,
        resistenciaFinal: Math.min(
          configuracion.limiteResistenciaFinal,
          bono + resistenciaEquipo,
        ),
      });
    }
  }

  return {
    tipoResultado: "escenario_teorico_no_implementado",
    determinista: true,
    implementado: false,
    formula: "min(10, floor(max(0, Constitución - 8) / 2)) y límite final 75 %",
    resistenciasAfectadas: [...RESISTENCIAS_EFECTOS_VISIBLES],
    configuracion: { ...configuracion },
    filas,
    perfiles,
    apilamiento,
  };
}

function calcularBonoConstitucion(constitucion, configuracion) {
  return Math.min(
    configuracion.bonificacionMaxima,
    Math.floor(
      Math.max(0, constitucion - configuracion.atributoReferencia) /
        configuracion.puntosPorPorcentaje,
    ),
  );
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
