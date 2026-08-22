import { limitar } from "../../utilidades/Numeros.js";
import { Player } from "../../entidad/destructible/combatiente/Player.js";
import {
  obtenerConfiguracionAtaque,
  calcularCostoManaAtaqueBasico,
} from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";
import { crearObjeto } from "../../objetos/FabricaObjetos.js";
import { crearObjetoGenerado } from "../../juego/objetos/GeneradorObjetoAleatorio.js";
import { crearGeneradorAleatorio } from "../../juego/generacion/GeneradorAleatorio.js";
import {
  resolverPaqueteDanio,
} from "../../juego/combate/ComponentesDanio.js";
import { calcularProbabilidadConResistencia } from "../../juego/combate/ContratosResistencias.js";
import { calcularProbabilidadImpacto } from "../../juego/combate/SistemaCombate.js";
import { crearEnemigo } from "../../juego/fabricas/FabricaEnemigos.js";
import {
  configurarTiradasDeterministasHabilidad,
  resolverDanioHabilidad,
  resolverImpactoHabilidad,
  restaurarTiradasAleatoriasHabilidad,
} from "../../juego/habilidades/MotorDanioHabilidad.js";
import { prepararEfectosHabilidad } from "../../juego/habilidades/MotorEfectosHabilidad.js";
import { SistemaEfectosTemporales } from "../../juego/efectos/SistemaEfectosTemporales.js";
import { SistemaZonasTemporales } from "../../juego/zonas/SistemaZonasTemporales.js";
import { SistemaEspacial } from "../../juego/espacio/SistemaEspacial.js";
import {
  calcularDanioHabilidadObjetos,
  esBaston,
  esVarita,
} from "../../juego/magia/SistemaCatalizadores.js";
import {
  calcularCostoAccionCombatiente,
  TIEMPO_REFERENCIA,
  TIPOS_ACCION_TEMPORAL,
} from "../../juego/tiempo/SistemaTiempo.js";

const ESTADOS = Object.freeze({
  CORRECTO: "correcto",
  ADVERTENCIA: "advertencia",
  INCORRECTO: "incorrecto",
  INFORMATIVO: "informativo",
});

const RESISTENCIAS_ELEMENTALES_PRUEBA = Object.freeze([0, 25, 50, 75]);
const NIVELES_REFERENCIA_PREDETERMINADOS = Object.freeze([1, 3, 6, 10]);
const PREFIJOS_ESCALADOS_GLOBALES = Object.freeze([
  "enfocado",
  "marcial",
  "mistico",
  "igneo",
  "gelido",
  "fulgurante",
  "toxico",
  "incandescente",
  "virulento",
  "entorpecedor",
  "sobrecargado",
  "catalitico",
]);

// Analiza armas, habilidades, Daño de Habilidad y arquetipos usando las
// configuraciones y motores canónicos del juego. El módulo no modifica ninguna
// instancia persistente ni replica una fórmula de daño ajena a los motores.
export function crearInformeBalanceCombate({
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionGeneracionObjetos,
  configuracionEjecucionHabilidades,
  objetivosBalance,
} = {}) {
  validarEntrada({
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionEjecucionHabilidades,
    objetivosBalance,
  });

  const configuracion = normalizarConfiguracionAnalisis(
    objetivosBalance.analisisCombate,
  );
  const referencias = crearReferenciasEnemigos({
    configuracionEnemigos,
    configuracionObjetos,
    niveles: configuracion.nivelesReferencia,
  });
  const potencia = crearEscenariosPotencia({
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracion,
  });
  const escaladosGlobales = crearInformeEscaladosGlobales({
    configuracionPersonaje,
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracionEjecucionHabilidades,
    objetivosBalance,
  });
  const armas = crearInformeArmasCombate({
    configuracionPersonaje,
    configuracionObjetos,
    referencias,
    configuracion,
  });
  const habilidades = crearInformeHabilidadesCombate({
    configuracionPersonaje,
    configuracionObjetos,
    configuracionEjecucionHabilidades,
    referencias,
    potencia,
    configuracion,
  });
  const arquetipos = crearInformeArquetipos({
    configuracionPersonaje,
    configuracionObjetos,
    configuracionEjecucionHabilidades,
    referencias,
    potencia,
    configuracion,
  });
  const pruebasFocalizadas = crearInformePruebasFocalizadas({
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionEjecucionHabilidades,
    referencias,
    potencia,
    habilidades,
    configuracion,
  });
  const conclusiones = crearConclusiones({
    armas,
    habilidades,
    potencia,
    escaladosGlobales,
    arquetipos,
    pruebasFocalizadas,
  });

  return congelarProfundamente({
    tipoResultado: "balance_combate_motores_canonicos",
    determinista: true,
    descripcion:
      "Compara daño, impacto, crítico, tiempo, Maná, alcance, área y Daño de Habilidad sin alterar la partida.",
    origenes: {
      atributosYEquipo: "Player, Equipamiento y EstadisticasDerivadas",
      impacto: "SistemaCombate.calcularProbabilidadImpacto",
      mitigacion: "ComponentesDanio.resolverPaqueteDanio",
      habilidades: "MotorDanioHabilidad y MotorEfectosHabilidad",
      tiempo: "SistemaTiempo.calcularCostoAccionCombatiente",
      enemigosReferencia: "FabricaEnemigos.crearEnemigo",
    },
    configuracion,
    referencias,
    armas,
    habilidades,
    potencia,
    escaladosGlobales,
    arquetipos,
    pruebasFocalizadas,
    conclusiones,
  });
}

function crearReferenciasEnemigos({
  configuracionEnemigos,
  configuracionObjetos,
  niveles,
}) {
  const filas = [];
  for (const nivel of niveles) {
    const candidatos = [];
    for (const [idPlantilla, plantilla] of Object.entries(
      configuracionEnemigos.plantillas,
    )) {
      const minimo = plantilla.nivelesPermitidos?.minimo;
      const maximo = plantilla.nivelesPermitidos?.maximo;
      if (!Number.isInteger(minimo) || !Number.isInteger(maximo)) continue;
      if (nivel < minimo || nivel > maximo) continue;
      const enemigo = crearEnemigo({
        configuracionEnemigos,
        configuracionObjetos,
        idPlantilla,
        nivel,
      });
      candidatos.push({
        idPlantilla,
        nombre: enemigo.nombre,
        nivel,
        vida: enemigo.vidaMaxima,
        armadura: enemigo.estadisticasDerivadas.armadura ?? 0,
        evasion: enemigo.estadisticasDerivadas.evasion ?? 0,
        resistencias: {
          ...(enemigo.estadisticasDerivadas.resistencias ?? {}),
        },
      });
    }
    if (candidatos.length === 0) {
      throw new Error(`No existen enemigos válidos para el nivel ${nivel}.`);
    }
    filas.push({
      nivel,
      cantidadEnemigos: candidatos.length,
      vida: redondear(mediana(candidatos.map((fila) => fila.vida))),
      armadura: redondear(mediana(candidatos.map((fila) => fila.armadura))),
      evasion: redondear(mediana(candidatos.map((fila) => fila.evasion))),
      resistencias: Object.fromEntries(
        ["fuego", "frio", "rayo", "veneno"].map((tipo) => [
          tipo,
          redondear(
            mediana(
              candidatos.map((fila) => fila.resistencias?.[tipo] ?? 0),
            ),
          ),
        ]),
      ),
      criterio:
        "Referencia estadística: mediana de instancias reales de enemigos que admiten este nivel.",
      estado: ESTADOS.INFORMATIVO,
    });
  }
  return {
    tipoResultado: "referencias_instancias_reales",
    filas,
  };
}

function crearEscenariosPotencia({
  configuracionObjetos,
  configuracionGeneracionObjetos,
  configuracion,
}) {
  const catalizadores = Object.entries(configuracionObjetos)
    .filter(([, objeto]) => esBaston(objeto) || esVarita(objeto))
    .map(([id, objeto]) => ({
      id,
      nombre: objeto.nombre,
      familia: objeto.familiaObjeto,
      tier: objeto.tierBase,
      potenciaBase: objeto.propiedades.danoHabilidad,
    }));
  const potenciaAfijoMaxima = obtenerPotenciaAfijoMaxima(
    configuracionGeneracionObjetos,
  );
  const filas = [];
  const tiers = [...new Set(catalizadores.map((fila) => fila.tier))].sort(
    (a, b) => a - b,
  );

  for (const tier of tiers) {
    const baston = catalizadores.find(
      (fila) => fila.tier === tier && fila.familia === "baston",
    );
    const varita = catalizadores.find(
      (fila) => fila.tier === tier && fila.familia === "varita",
    );
    if (!baston || !varita) continue;
    const escenarios = [
      {
        id: `sin_catalizador_t${tier}`,
        nombre: "Sin catalizador",
        tier,
        danoHabilidad: 0,
        cantidadCatalizadores: 0,
        tipo: "real",
      },
      {
        id: `baston_base_t${tier}`,
        nombre: baston.nombre,
        tier,
        danoHabilidad: baston.potenciaBase,
        cantidadCatalizadores: 1,
        tipo: "real",
      },
      {
        id: `doble_varita_base_t${tier}`,
        nombre: `Dos varitas Tier ${tier}`,
        tier,
        danoHabilidad: varita.potenciaBase * 2,
        cantidadCatalizadores: 2,
        tipo: "real",
      },
    ];
    if (potenciaAfijoMaxima > 0) {
      escenarios.push(
        {
          id: `baston_enfocado_t${tier}`,
          nombre: `${baston.nombre} con afijo máximo`,
          tier,
          danoHabilidad: baston.potenciaBase + potenciaAfijoMaxima,
          cantidadCatalizadores: 1,
          tipo: "teorico_objeto_posible",
        },
        {
          id: `doble_varita_enfocada_t${tier}`,
          nombre: `Dos varitas Tier ${tier} con afijo máximo`,
          tier,
          danoHabilidad:
            (varita.potenciaBase + potenciaAfijoMaxima) * 2,
          cantidadCatalizadores: 2,
          tipo: "teorico_objeto_posible",
        },
      );
    }
    filas.push(...escenarios);
  }

  const filasEvaluadas = evaluarPotencia(
    filas,
    configuracion.pruebasFocalizadas.ventajaMaximaDobleVaritaPorcentaje,
  );
  return {
    tipoResultado: "configuracion_real_y_combinaciones_posibles",
    potenciaAfijoMaxima,
    filas: filasEvaluadas,
    resumen: {
      minimo: Math.min(...filasEvaluadas.map((fila) => fila.danoHabilidad)),
      maximo: Math.max(...filasEvaluadas.map((fila) => fila.danoHabilidad)),
      escenariosAltos: filasEvaluadas.filter(
        (fila) => fila.estado !== ESTADOS.CORRECTO && fila.estado !== ESTADOS.INFORMATIVO,
      ).length,
    },
  };
}

function obtenerPotenciaAfijoMaxima(configuracionGeneracionObjetos) {
  const prefijos = configuracionGeneracionObjetos?.prefijos ?? {};
  const rarezasActivas = new Set(
    Object.entries(configuracionGeneracionObjetos?.rarezas ?? {})
      .filter(([, rareza]) => rareza?.generacionHabilitada === true)
      .map(([idRareza]) => idRareza),
  );
  let maxima = 0;
  for (const afijo of Object.values(prefijos)) {
    const afectaPotencia = afijo.efectos?.some(
      (efecto) => efecto.propiedad === "danoHabilidad",
    );
    const esObtenible = afijo.rarezasPermitidas?.some((idRareza) =>
      rarezasActivas.has(idRareza),
    );
    if (!afectaPotencia || !esObtenible) continue;
    for (const grado of afijo.grados ?? []) {
      const rango = grado.valores?.danoHabilidad;
      if (Number.isFinite(rango?.maximo)) maxima = Math.max(maxima, rango.maximo);
    }
  }
  return maxima;
}

function evaluarPotencia(
  filas,
  ventajaMaximaDobleVaritaPorcentaje = 15,
) {
  const porTier = new Map();
  for (const fila of filas) {
    if (!porTier.has(fila.tier)) porTier.set(fila.tier, []);
    porTier.get(fila.tier).push(fila);
  }
  const resultado = [];
  for (const [tier, filasTier] of porTier) {
    const bastonBase = filasTier.find((fila) => fila.id.startsWith("baston_base"));
    const dobleBase = filasTier.find((fila) => fila.id.startsWith("doble_varita_base"));
    const bastonAfijo = filasTier.find((fila) => fila.id.startsWith("baston_enfocado"));
    const dobleAfijo = filasTier.find((fila) => fila.id.startsWith("doble_varita_enfocada"));
    for (const fila of filasTier) {
      const comun = {
        ...fila,
        multiplicadorDanioHabilidad: redondear(1 + fila.danoHabilidad / 100),
        gananciaPorcentual: fila.danoHabilidad,
      };
      if (fila.danoHabilidad === 0) {
        resultado.push({
          ...comun,
          criterio:
            "Sin catalizador es una opción válida para híbridos y debe rendir menos que el equipo especializado.",
          estado: ESTADOS.INFORMATIVO,
        });
        continue;
      }
      if (fila.tipo === "real") {
        const diferencia = Math.abs(
          (bastonBase?.danoHabilidad ?? 0) -
            (dobleBase?.danoHabilidad ?? 0),
        );
        resultado.push({
          ...comun,
          criterio: `En Tier ${tier}, bastón y doble varita base deben quedar a no más de 2 puntos entre sí. Diferencia actual: ${diferencia}.`,
          estado: diferencia <= 2 ? ESTADOS.CORRECTO : ESTADOS.ADVERTENCIA,
        });
        continue;
      }
      const diferenciaMaxima =
        (dobleAfijo?.danoHabilidad ?? 0) -
        (bastonAfijo?.danoHabilidad ?? 0);
      const ventajaMultiplicador = bastonAfijo
        ? ((1 + (dobleAfijo?.danoHabilidad ?? 0) / 100) /
            (1 + bastonAfijo.danoHabilidad / 100) -
            1) *
          100
        : 0;
      const esDobleVarita = fila.id.startsWith("doble_varita_enfocada");
      resultado.push({
        ...comun,
        ventajaSobreBastonPorcentaje: redondear(ventajaMultiplicador),
        criterio: esDobleVarita
          ? `La doble varita usa dos afijos. Se evalúa la ventaja del multiplicador final, no la diferencia bruta de ${diferenciaMaxima} puntos. Correcto: hasta ${ventajaMaximaDobleVaritaPorcentaje} % sobre el bastón máximo.`
          : `El bastón con afijo máximo se compara con la doble varita máxima. La diferencia bruta es ${diferenciaMaxima} puntos, pero la decisión usa el multiplicador final.`,
        estado:
          esDobleVarita &&
          ventajaMultiplicador > ventajaMaximaDobleVaritaPorcentaje
            ? ESTADOS.ADVERTENCIA
            : ESTADOS.CORRECTO,
      });
    }
  }
  return resultado;
}

function crearInformeArmasCombate({
  configuracionPersonaje,
  configuracionObjetos,
  referencias,
  configuracion,
}) {
  const filas = [];
  for (const [idArma, plantilla] of Object.entries(configuracionObjetos)) {
    if (plantilla.tipo !== "arma") continue;
    filas.push(
      crearFilaArma({
        configuracionPersonaje,
        configuracionObjetos,
        referencias,
        idArma,
        idArmaSecundaria: null,
        configuracion,
      }),
    );
  }

  for (const idVarita of Object.keys(configuracionObjetos).filter((id) =>
    esVarita(configuracionObjetos[id]),
  )) {
    filas.push(
      crearFilaArma({
        configuracionPersonaje,
        configuracionObjetos,
        referencias,
        idArma: idVarita,
        idArmaSecundaria: idVarita,
        configuracion,
      }),
    );
  }

  aplicarEvaluacionRelativa({
    filas,
    obtenerGrupo: (fila) => `tier_${fila.tier}:${fila.rolComparacion}`,
    obtenerValor: (fila) => fila.indiceComparacion,
    bandas: configuracion.bandasRelativas,
    descripcionValor:
      "índice de daño esperado por tiempo ajustado ligeramente por alcance y costes",
  });

  return {
    tipoResultado: "calculo_teorico_motores_canonicos",
    determinista: true,
    descripcion:
      "El daño esperado incluye probabilidad de impacto, crítico, armadura, resistencias y tiempo efectivo contra un enemigo de referencia del mismo tramo.",
    formulaIndice:
      "daño esperado por 100 de tiempo × bono de alcance ÷ penalización de Maná y munición",
    filas,
    resumen: resumirEstados(filas),
  };
}

function crearFilaArma({
  configuracionPersonaje,
  configuracionObjetos,
  referencias,
  idArma,
  idArmaSecundaria,
  idProfesionForzada = null,
}) {
  const plantilla = configuracionObjetos[idArma];
  const nivel = plantilla.tierBase >= 2 ? 6 : Math.max(1, plantilla.nivelMinimoGeneracion ?? 1);
  const idProfesion =
    idProfesionForzada ?? seleccionarProfesionParaArma(plantilla);
  const jugador = crearJugadorPrueba({
    configuracionPersonaje,
    idProfesion,
    nivel,
  });
  const arma = crearObjeto({ configuracionObjetos, idObjeto: idArma });
  jugador.equipamiento.equiparEnRanura("arma", arma);
  let secundaria = null;
  if (idArmaSecundaria) {
    secundaria = crearObjeto({
      configuracionObjetos,
      idObjeto: idArmaSecundaria,
    });
    jugador.equipamiento.equiparEnRanura("secundaria", secundaria);
  }
  const referencia = obtenerReferenciaMasCercana(referencias.filas, nivel);
  const objetivo = crearObjetivoPrueba({
    nivel,
    armadura: referencia.armadura,
    evasion: referencia.evasion,
    resistencias: referencia.resistencias,
  });
  const estadisticas = jugador.estadisticasDerivadas;
  const configuracionAtaque = obtenerConfiguracionAtaque(jugador);
  const costoTemporal = calcularCostoAccionCombatiente({
    combatiente: jugador,
    tipoAccion: TIPOS_ACCION_TEMPORAL.ATAQUE,
    costoBase: configuracionAtaque.costoAtaqueBase,
  });
  const fuentes = estadisticas.danioFisico.componentes.map((fuente) =>
    calcularFuenteEsperada({
      jugador,
      objetivo,
      fuente,
      estadisticasDanio: estadisticas.danioFisico,
    }),
  );
  const danioSinCritico = fuentes.reduce(
    (total, fuente) => total + fuente.danioSinCriticoConImpacto,
    0,
  );
  const danioCritico = fuentes.reduce(
    (total, fuente) => total + fuente.danioCriticoConImpacto,
    0,
  );
  const danioEsperado = fuentes.reduce(
    (total, fuente) => total + fuente.danioEsperadoAccion,
    0,
  );
  const costoMana = calcularCostoManaAtaqueBasico(configuracionAtaque);
  const alcance = configuracionAtaque.propiedadesControladoras.alcance;
  const requiereMunicion = configuracionAtaque.requiereQuiver === true;
  const danioPor100 = costoTemporal > 0 ? (danioEsperado / costoTemporal) * 100 : 0;
  const bonoAlcance = 1 + Math.min(5, Math.max(0, alcance - 1)) * 0.04;
  const penalizacionCoste = 1 + costoMana * 0.05 + (requiereMunicion ? 0.05 : 0);
  const indiceComparacion = danioPor100 * bonoAlcance / penalizacionCoste;

  return {
    id: idArmaSecundaria ? `doble:${idArma}` : idArma,
    nombre: idArmaSecundaria
      ? `Dos unidades de ${plantilla.nombre.toLocaleLowerCase("es")}`
      : plantilla.nombre,
    configuracion: idArmaSecundaria ? "doble" : "simple",
    familia: plantilla.familiaObjeto,
    rolComparacion: obtenerRolComparacionArma({
      plantilla,
      esDoble: Boolean(idArmaSecundaria),
    }),
    tier: plantilla.tierBase,
    nivel,
    profesionReferencia: configuracionPersonaje.profesiones[idProfesion].nombre,
    atributoAtaque: plantilla.propiedades.atributoAtaque,
    objetivoReferencia: `Enemigo mediano nivel ${referencia.nivel}`,
    vidaObjetivo: referencia.vida,
    armaduraObjetivo: referencia.armadura,
    evasionObjetivo: referencia.evasion,
    alcance,
    costoTemporal,
    costoMana,
    requiereMunicion,
    danoHabilidad: calcularDanioHabilidadObjetos(
      [arma, secundaria].filter(Boolean),
    ),
    probabilidadImpactoPromedio: redondear(
      promedio(fuentes.map((fuente) => fuente.probabilidadImpacto)),
    ),
    probabilidadCriticoPromedio: redondear(
      promedio(fuentes.map((fuente) => fuente.probabilidadCritico)),
    ),
    danioSinCritico: redondear(danioSinCritico),
    danioCritico: redondear(danioCritico),
    danioEsperadoAccion: redondear(danioEsperado),
    danioEsperadoPor100: redondear(danioPor100),
    danioEsperadoPorMana:
      costoMana > 0 ? redondear(danioEsperado / costoMana) : null,
    indiceComparacion: redondear(indiceComparacion),
    fuentes,
  };
}

function calcularFuenteEsperada({
  jugador,
  objetivo,
  fuente,
  estadisticasDanio,
}) {
  const probabilidadImpacto = calcularProbabilidadImpacto(
    jugador,
    objetivo,
    fuente.precision,
  );
  const danioSinCriticoImpacto = promedioDanioFuente({
    fuente,
    estadisticasDanio,
    objetivo,
    critico: false,
  });
  const danioCriticoImpacto = promedioDanioFuente({
    fuente,
    estadisticasDanio,
    objetivo,
    critico: true,
  });
  const probabilidadCritico = fuente.probabilidadCritico;
  const esperadoEnImpacto =
    danioSinCriticoImpacto * (1 - probabilidadCritico / 100) +
    danioCriticoImpacto * (probabilidadCritico / 100);
  return {
    mano: fuente.mano,
    nombre: fuente.nombre,
    probabilidadImpacto: redondear(probabilidadImpacto),
    probabilidadCritico: redondear(probabilidadCritico),
    danioSinCriticoImpacto: redondear(danioSinCriticoImpacto),
    danioCriticoImpacto: redondear(danioCriticoImpacto),
    danioSinCriticoConImpacto: redondear(
      danioSinCriticoImpacto * (probabilidadImpacto / 100),
    ),
    danioCriticoConImpacto: redondear(
      danioCriticoImpacto * (probabilidadImpacto / 100),
    ),
    danioEsperadoAccion: redondear(
      esperadoEnImpacto * (probabilidadImpacto / 100),
    ),
  };
}

function promedioDanioFuente({
  fuente,
  estadisticasDanio,
  objetivo,
  critico,
}) {
  let total = 0;
  for (const descriptor of fuente.componentesDanio) {
    const locales = crearRangoEnteros(
      descriptor.minimoLocal ?? descriptor.minimo ?? 0,
      descriptor.maximoLocal ?? descriptor.maximo ?? 0,
    );
    const globales = descriptor.aplicaDanioPlanoGlobal
      ? crearRangoEnteros(
          estadisticasDanio.danioPlanoGlobal.minimo,
          estadisticasDanio.danioPlanoGlobal.maximo,
        )
      : [0];
    let acumulado = 0;
    let casos = 0;
    const multiplicadorDanioGlobal = Number.isFinite(
      descriptor.multiplicadorDanioGlobal,
    )
      ? descriptor.multiplicadorDanioGlobal
      : estadisticasDanio.multiplicadorGlobal;
    for (const local of locales) {
      for (const global of globales) {
        const brutoBase =
          (local * descriptor.multiplicadorAtributo + global) *
          (descriptor.multiplicadorGolpe ?? fuente.multiplicadorGolpe ?? 1) *
          (descriptor.aplicaMultiplicadorGlobal
            ? multiplicadorDanioGlobal
            : 1);
        const bruto =
          critico && descriptor.aplicaCritico !== false
            ? brutoBase * fuente.multiplicadorCritico
            : brutoBase;
        acumulado += resolverPaqueteDanio({
          componentes: [{ tipo: descriptor.tipo, danioBruto: bruto }],
          armadura: objetivo.estadisticasDerivadas.armadura,
          resistencias: objetivo.estadisticasDerivadas.resistencias,
          bloqueo: { activo: false, mitigacion: 0 },
        }).danioCalculado;
        casos += 1;
      }
    }
    total += casos > 0 ? acumulado / casos : 0;
  }
  return total;
}

function crearInformeHabilidadesCombate({
  configuracionPersonaje,
  configuracionObjetos,
  configuracionEjecucionHabilidades,
  referencias,
  potencia,
  configuracion,
}) {
  const filasCompletas = [];
  const escenariosPotenciaBase = potencia.filas.filter((fila) =>
    ["sin_catalizador", "baston_base", "doble_varita_base"].some((prefijo) =>
      fila.id.startsWith(prefijo),
    ),
  );
  const escenariosPotenciaAltos = potencia.filas.filter((fila) =>
    fila.id.includes("enfocado") || fila.id.includes("enfocada"),
  );

  for (const habilidad of Object.values(
    configuracionEjecucionHabilidades.habilidades,
  ).filter(esHabilidadActivaEjecutable)) {
    const categoria = categoriaHabilidad(habilidad.requisitoNivelMaestria);
    for (const [gradoTexto, grado] of Object.entries(
      habilidad.ejecucion.grados,
    )) {
      const gradoNumero = Number(gradoTexto);
      const nivel = nivelRepresentativoHabilidad(categoria, gradoNumero);
      const tier = nivel >= 6 ? 2 : 1;
      const referencia = obtenerReferenciaMasCercana(referencias.filas, nivel);
      const escenarios = [
        ...escenariosPotenciaBase.filter((fila) => fila.tier === tier),
        ...escenariosPotenciaAltos.filter((fila) => fila.tier === tier),
      ];
      for (const escenarioPotencia of escenarios) {
        for (const resistencia of RESISTENCIAS_ELEMENTALES_PRUEBA) {
          filasCompletas.push(
            crearFilaHabilidad({
              configuracionPersonaje,
              configuracionObjetos,
              habilidad,
              categoria,
              grado,
              gradoNumero,
              nivel,
              referencia,
              escenarioPotencia,
              resistenciaElemental: resistencia,
              resistenciaEfecto: resistencia,
              configuracion,
            }),
          );
        }
      }
    }
  }

  const filasPrincipales = seleccionarFilasPrincipalesHabilidades(
    filasCompletas,
  );
  aplicarEvaluacionRelativa({
    filas: filasPrincipales,
    obtenerGrupo: (fila) => `${fila.categoria}:g${fila.grado}`,
    obtenerValor: (fila) => fila.indiceComparacion,
    bandas: configuracion.bandasRelativasHabilidades,
    descripcionValor:
      "daño esperado por tiempo, objetivos probables y utilidad de control",
  });
  for (const fila of filasPrincipales) {
    const habilidadConfigurada =
      configuracionEjecucionHabilidades.habilidades[fila.idHabilidad];
    const gradoConfigurado = habilidadConfigurada?.ejecucion?.grados?.[fila.grado];

    if (gradoConfigurado?.zonaTemporal) {
      fila.estado = ESTADOS.INFORMATIVO;
      fila.criterio =
        "La habilidad crea una zona persistente. Esta fila general mide una sola activación; su balance definitivo corresponde al análisis focalizado de toda la duración de la zona.";
      continue;
    }

    if (!fila.requiereReaplicaciones) continue;
    fila.estado = ESTADOS.INFORMATIVO;
    fila.criterio =
      "La habilidad aumenta con reaplicaciones. Esta fila mide la primera aplicación; su balance definitivo corresponde al análisis de acumulación.";
  }

  const resistenciaMaximos = filasCompletas.filter((fila) => {
    const habilidad = configuracionEjecucionHabilidades.habilidades[fila.idHabilidad];
    return (
      fila.grado === habilidad.gradoMaximo &&
      fila.escenarioPotencia.startsWith("baston_base")
    );
  });
  const potenciaMaximos = filasCompletas.filter((fila) => {
    const habilidad = configuracionEjecucionHabilidades.habilidades[fila.idHabilidad];
    return fila.grado === habilidad.gradoMaximo && fila.resistenciaElemental === 0;
  });

  return {
    tipoResultado: "mixto_simulacion_determinista_y_calculo_teorico",
    determinista: true,
    descripcion:
      "El daño directo se ejecuta con MotorDanioHabilidad. El daño periódico y el control se calculan desde definiciones preparadas por MotorEfectosHabilidad y se mitigan con ComponentesDanio.",
    filas: filasCompletas,
    filasPrincipales,
    resistenciaMaximos,
    potenciaMaximos,
    resumen: {
      ...resumirEstados(filasPrincipales),
      habilidades: Object.values(
        configuracionEjecucionHabilidades.habilidades,
      ).filter(esHabilidadActivaEjecutable).length,
      grados: filasPrincipales.length,
      simulaciones: filasCompletas.length,
    },
  };
}

function crearFilaHabilidad({
  configuracionPersonaje,
  configuracionObjetos,
  habilidad,
  categoria,
  grado,
  gradoNumero,
  nivel,
  referencia,
  escenarioPotencia,
  resistenciaElemental,
  resistenciaEfecto,
  idProfesion = "mago",
}) {
  const jugador = crearJugadorPrueba({
    configuracionPersonaje,
    idProfesion,
    nivel,
  });
  equiparEscenarioPotencia({
    jugador,
    configuracionObjetos,
    escenario: escenarioPotencia,
  });
  const resistencias = {
    fuego: resistenciaElemental,
    frio: resistenciaElemental,
    rayo: resistenciaElemental,
    veneno: resistenciaElemental,
  };
  const objetivoNoCritico = crearObjetivoPrueba({
    nivel,
    armadura: referencia.armadura,
    evasion: referencia.evasion,
    resistencias,
  });
  const objetivoCritico = crearObjetivoPrueba({
    nivel,
    armadura: referencia.armadura,
    evasion: referencia.evasion,
    resistencias,
  });

  const { noCritico, critico } = resolverDirectoDeterminista({
    jugador,
    objetivoNoCritico,
    objetivoCritico,
    componentesDanio: grado.danio,
    idEjecucion: `balance:${habilidad.id}:${gradoNumero}`,
  });

  const objetivoEfectos = crearObjetivoPrueba({
    nivel,
    armadura: referencia.armadura,
    evasion: referencia.evasion,
    resistencias,
    resistenciasEfectos: {
      congelamiento: resistenciaEfecto,
      aturdimiento: resistenciaEfecto,
      envenenamiento: resistenciaEfecto,
      quemadura: resistenciaEfecto,
    },
  });
  const efectos = prepararEfectosHabilidad({
    lanzador: jugador,
    objetivo: objetivoEfectos,
    efectosConfigurados: grado.efectos,
    idEjecucion: `balance:${habilidad.id}:${gradoNumero}:efectos`,
  });
  const resumenEfectos = calcularResumenEfectos({
    efectos,
    objetivo: objetivoEfectos,
    resistenciaEfecto,
  });
  const probabilidadImpacto = noCritico.probabilidadImpacto;
  const probabilidadCritico = noCritico.probabilidadCritico;
  const directoEsperadoEnImpacto =
    noCritico.danioFinal * (1 - probabilidadCritico / 100) +
    critico.danioFinal * (probabilidadCritico / 100);
  const directoEsperado =
    directoEsperadoEnImpacto * (probabilidadImpacto / 100);
  const periodicoEsperado =
    resumenEfectos.danioPeriodicoEsperado * (probabilidadImpacto / 100);
  const totalEsperado = directoEsperado + periodicoEsperado;
  const objetivosTeoricos = obtenerMaximoObjetivos(grado.formaImpacto);
  const objetivosComparacion = Math.min(3, objetivosTeoricos);
  const objetivosEsperadosBalance = obtenerObjetivosEsperadosBalance(
    grado.formaImpacto,
  );
  const totalTresObjetivos = totalEsperado * objetivosComparacion;
  const danioPor100 = (totalEsperado / grado.costoTemporalBase) * 100;
  const danioPorMana = grado.costoMana > 0 ? totalEsperado / grado.costoMana : null;
  const indiceComparacion =
    ((totalEsperado * objetivosEsperadosBalance) / grado.costoTemporalBase) *
      100 +
    resumenEfectos.valorControlEsperado * 10;

  return {
    id: `${habilidad.id}:g${gradoNumero}:${escenarioPotencia.id}:r${resistenciaElemental}`,
    idHabilidad: habilidad.id,
    habilidad: habilidad.nombre,
    maestria: habilidad.maestria,
    categoria,
    grado: gradoNumero,
    nivelReferencia: nivel,
    profesionReferencia: configuracionPersonaje.profesiones[idProfesion].nombre,
    objetivoReferencia: `Enemigo mediano nivel ${referencia.nivel}`,
    escenarioPotencia: escenarioPotencia.id,
    nombrePotencia: escenarioPotencia.nombre,
    danoHabilidad: escenarioPotencia.danoHabilidad,
    resistenciaElemental,
    resistenciaEfecto,
    costoMana: grado.costoMana,
    costoTemporal: grado.costoTemporalBase,
    alcance: grado.alcance,
    formaImpacto: resumirFormaImpacto(grado.formaImpacto),
    maximoObjetivosTeoricos: objetivosTeoricos,
    objetivosComparacion,
    objetivosEsperadosBalance,
    requiereReaplicaciones: resumenEfectos.requiereReaplicaciones,
    probabilidadImpacto: redondear(probabilidadImpacto),
    probabilidadCritico: redondear(probabilidadCritico),
    danioSinCritico: noCritico.danioFinal,
    danioCritico: critico.danioFinal,
    danioDirectoEsperado: redondear(directoEsperado),
    danioPeriodicoEsperado: redondear(periodicoEsperado),
    danioTotalEsperado: redondear(totalEsperado),
    danioEsperadoPor100: redondear(danioPor100),
    danioEsperadoPorMana: danioPorMana === null ? null : redondear(danioPorMana),
    danioTresObjetivos: redondear(totalTresObjetivos),
    valorControlEsperado: redondear(resumenEfectos.valorControlEsperado),
    probabilidadAplicacionEfecto: redondear(
      resumenEfectos.probabilidadAplicacionPromedio,
    ),
    indiceComparacion: redondear(indiceComparacion),
    efectos: resumenEfectos.detalle,
  };
}

function resolverDirectoDeterminista({
  jugador,
  objetivoNoCritico,
  objetivoCritico,
  componentesDanio,
  idEjecucion,
}) {
  const tieneDanio = Array.isArray(componentesDanio) && componentesDanio.length > 0;
  let noCritico;
  let critico;
  try {
    configurarTiradasDeterministasHabilidad({
      impacto: [1],
      critico: [100],
      efecto: [1],
    });
    noCritico = tieneDanio
      ? resolverDanioHabilidad({
          lanzador: jugador,
          objetivo: objetivoNoCritico,
          componentesConfigurados: componentesDanio,
          idEjecucion: `${idEjecucion}:normal`,
          resolverImpacto: true,
          resolverCritico: true,
        })
      : {
          ...resolverImpactoHabilidad({
            lanzador: jugador,
            objetivo: objetivoNoCritico,
            idEjecucion: `${idEjecucion}:normal`,
            resolverImpacto: true,
            resolverCritico: true,
          }),
          danioFinal: 0,
        };
    configurarTiradasDeterministasHabilidad({
      impacto: [1],
      critico: [1],
      efecto: [1],
    });
    critico = tieneDanio
      ? resolverDanioHabilidad({
          lanzador: jugador,
          objetivo: objetivoCritico,
          componentesConfigurados: componentesDanio,
          idEjecucion: `${idEjecucion}:critico`,
          resolverImpacto: true,
          resolverCritico: true,
        })
      : {
          ...resolverImpactoHabilidad({
            lanzador: jugador,
            objetivo: objetivoCritico,
            idEjecucion: `${idEjecucion}:critico`,
            resolverImpacto: true,
            resolverCritico: true,
          }),
          danioFinal: 0,
        };
  } finally {
    restaurarTiradasAleatoriasHabilidad();
  }
  return { noCritico, critico };
}

function calcularResumenEfectos({ efectos, objetivo, resistenciaEfecto }) {
  let danioPeriodicoEsperado = 0;
  let valorControlEsperado = 0;
  let requiereReaplicaciones = false;
  const probabilidades = [];
  const detalle = [];
  for (const preparado of efectos) {
    const definicion = preparado.definicion;
    const probabilidadFinal =
      definicion.modoResistencia === "probabilidad"
        ? calcularProbabilidadConResistencia(
            definicion.probabilidadBase,
            resistenciaEfecto,
          )
        : limitar(definicion.probabilidadBase, 0, 100);
    probabilidades.push(probabilidadFinal);
    let danioTotal = 0;
    if ((definicion.maximo ?? 1) > 1 || (definicion.intensidadInicial ?? 1) > 1) {
      requiereReaplicaciones = true;
    }
    if (definicion.tipo === "danio_periodico") {
      const ticks = Math.floor(definicion.duracion / definicion.intervalo);
      const danioTick = resolverPaqueteDanio({
        componentes: definicion.componentesDanio,
        armadura: objetivo.estadisticasDerivadas.armadura,
        resistencias: objetivo.estadisticasDerivadas.resistencias,
        bloqueo: { activo: false, mitigacion: 0 },
      }).danioCalculado;
      danioTotal = danioTick * ticks;
      danioPeriodicoEsperado += danioTotal * (probabilidadFinal / 100);
    } else if (
      ["control", "bloqueo_total", "bloqueo_habilidades"].includes(
        definicion.tipo,
      )
    ) {
      valorControlEsperado +=
        (definicion.duracion / TIEMPO_REFERENCIA) *
        (probabilidadFinal / 100);
    } else if (definicion.tipo === "modificador_combatiente") {
      const magnitud = (definicion.modificadores ?? []).reduce(
        (total, descriptor) => total + Math.abs(descriptor.valor ?? 0),
        0,
      );
      valorControlEsperado +=
        (definicion.duracion / TIEMPO_REFERENCIA) *
        magnitud *
        (probabilidadFinal / 100);
    }
    detalle.push({
      idEfecto: preparado.idEfecto,
      tipo: definicion.tipo,
      probabilidadFinal: redondear(probabilidadFinal),
      danioPeriodicoTotal: danioTotal,
      duracion: definicion.duracion,
    });
  }
  return {
    danioPeriodicoEsperado,
    valorControlEsperado,
    probabilidadAplicacionPromedio:
      probabilidades.length > 0 ? promedio(probabilidades) : 0,
    requiereReaplicaciones,
    detalle,
  };
}

function seleccionarFilasPrincipalesHabilidades(filas) {
  return filas.filter((fila) => {
    const esResistenciaBase = fila.resistenciaElemental === 0;
    const escenarioEsperado = fila.nivelReferencia >= 6
      ? fila.escenarioPotencia.startsWith("baston_base_t2")
      : fila.escenarioPotencia.startsWith("baston_base_t1");
    return esResistenciaBase && escenarioEsperado;
  });
}

function crearInformeArquetipos({
  configuracionPersonaje,
  configuracionObjetos,
  configuracionEjecucionHabilidades,
  referencias,
  potencia,
  configuracion,
}) {
  const filas = [];
  for (const escenario of configuracion.arquetipos) {
    const arma = crearArmaArquetipo({
      escenario,
      configuracionPersonaje,
      configuracionObjetos,
      referencias,
    });
    const habilidad = crearHabilidadArquetipo({
      escenario,
      configuracionPersonaje,
      configuracionObjetos,
      configuracionEjecucionHabilidades,
      referencias,
      potencia,
      configuracion,
    });
    const ataquesBasicos = escenario.ataquesBasicos ?? 0;
    const lanzamientos = escenario.lanzamientos ?? 0;
    const rotacionHabilidad = crearRotacionHabilidadArquetipo({
      escenario,
      filaHabilidad: habilidad,
      lanzamientos,
      configuracionPersonaje,
      configuracionObjetos,
      configuracionEjecucionHabilidades,
      potencia,
    });
    const tiempo =
      ataquesBasicos * (arma?.costoTemporal ?? 0) +
      lanzamientos * (habilidad?.costoTemporal ?? 0);
    const danio =
      ataquesBasicos * (arma?.danioEsperadoAccion ?? 0) +
      rotacionHabilidad.danioObjetivoUnico;
    const mana =
      ataquesBasicos * (arma?.costoMana ?? 0) +
      lanzamientos * (habilidad?.costoMana ?? 0);
    const jugadorReferencia = crearJugadorPrueba({
      configuracionPersonaje,
      idProfesion: escenario.profesion,
      nivel: escenario.nivel,
    });
    const manaMaximo = Math.max(0, jugadorReferencia.manaMaximo ?? 0);
    const manaConsumidoPorcentaje =
      manaMaximo > 0 ? (mana / manaMaximo) * 100 : 0;
    const danioGrupoEsperado =
      ataquesBasicos * (arma?.danioEsperadoAccion ?? 0) +
      rotacionHabilidad.danioGrupoEsperado;
    const danioGrupoPotencial =
      ataquesBasicos * (arma?.danioEsperadoAccion ?? 0) +
      rotacionHabilidad.danioGrupoPotencial;
    filas.push({
      id: escenario.id,
      nombre: escenario.nombre,
      profesion:
        configuracionPersonaje.profesiones[escenario.profesion]?.nombre ??
        escenario.profesion,
      nivel: escenario.nivel,
      arma: arma?.nombre ?? "Sin arma",
      habilidad: habilidad
        ? `${habilidad.habilidad} G${habilidad.grado}`
        : "Sin habilidad",
      ataquesBasicos,
      lanzamientos,
      modeloRotacionHabilidad: rotacionHabilidad.modelo,
      costoTemporal: tiempo,
      costoMana: mana,
      manaMaximo,
      manaConsumidoPorcentaje: redondear(manaConsumidoPorcentaje),
      danioObjetivoUnico: redondear(danio),
      danioGrupoEsperado: redondear(danioGrupoEsperado),
      danioTresObjetivos: redondear(danioGrupoPotencial),
      danioPor100: tiempo > 0 ? redondear((danio / tiempo) * 100) : 0,
      danioGrupoPor100:
        tiempo > 0
          ? redondear((danioGrupoEsperado / tiempo) * 100)
          : 0,
      dependenciaEquipo:
        (arma?.danoHabilidad ?? 0) > 0 || arma?.familia === "varita"
          ? "alta"
          : habilidad
            ? "media"
            : "baja",
    });
  }
  aplicarEvaluacionRelativa({
    filas,
    obtenerGrupo: () => "arquetipos",
    obtenerValor: (fila) =>
      fila.danioPor100 * 0.65 + fila.danioGrupoPor100 * 0.35,
    bandas: configuracion.bandasRelativasArquetipos,
    descripcionValor:
      "65 % rendimiento contra un objetivo y 35 % rendimiento grupal esperado según la forma de impacto",
  });
  for (const fila of filas) {
    if (
      fila.estado === ESTADOS.INCORRECTO &&
      fila.costoMana > 0 &&
      fila.manaConsumidoPorcentaje >= 30
    ) {
      fila.estado = ESTADOS.ADVERTENCIA;
      fila.criterio +=
        ` El daño explosivo supera la banda, pero consume ${redondear(
          fila.manaConsumidoPorcentaje,
        )} % de la reserva; se mantiene como advertencia hasta medir un combate completo.`;
    }
  }
  return {
    tipoResultado: "comparacion_rotaciones_representativas",
    determinista: true,
    descripcion:
      "Cada escenario crea el personaje de su profesión y ejecuta sus armas y habilidades con los motores comunes.",
    filas,
    resumen: resumirEstados(filas),
  };
}

function crearRotacionHabilidadArquetipo({
  escenario,
  filaHabilidad,
  lanzamientos,
  configuracionPersonaje,
  configuracionObjetos,
  configuracionEjecucionHabilidades,
  potencia,
}) {
  if (!filaHabilidad || lanzamientos <= 0) {
    return {
      modelo: "sin_habilidad",
      danioObjetivoUnico: 0,
      danioGrupoEsperado: 0,
      danioGrupoPotencial: 0,
    };
  }

  const habilidad =
    configuracionEjecucionHabilidades.habilidades[
      filaHabilidad.idHabilidad
    ];
  const grado = habilidad?.ejecucion?.grados?.[String(filaHabilidad.grado)];
  const tieneDanioPeriodico = grado?.efectos?.some(
    (efecto) => efecto.tipo === "danio_periodico",
  );
  const directoObjetivo =
    filaHabilidad.danioDirectoEsperado * lanzamientos;
  let periodicoObjetivo =
    filaHabilidad.danioPeriodicoEsperado * lanzamientos;
  let modelo = "multiplicacion_acciones_independientes";

  if (tieneDanioPeriodico && lanzamientos > 1) {
    const escenarioPotencia = obtenerEscenarioPotencia(
      potencia,
      filaHabilidad.escenarioPotencia,
    );
    const probabilidadAplicacion = limitar(
      (filaHabilidad.probabilidadImpacto / 100) *
        (filaHabilidad.probabilidadAplicacionEfecto / 100),
      0,
      1,
    );
    const secuencia = simularSecuenciaEfectoEsperada({
      configuracionPersonaje,
      configuracionObjetos,
      habilidad,
      grado,
      nivel: escenario.nivel,
      idProfesion: escenario.profesion,
      escenarioPotencia,
      instantes: crearInstantesLanzamiento(
        lanzamientos,
        grado.costoTemporalBase,
      ),
      probabilidadAplicacion,
      resistencias: { fuego: 0, frio: 0, rayo: 0, veneno: 0 },
      resistenciasEfectos: {
        congelamiento: 0,
        aturdimiento: 0,
        envenenamiento: 0,
        quemadura: 0,
      },
    });
    periodicoObjetivo = secuencia.danioPeriodicoEsperado;
    modelo = "secuencia_real_una_instancia";
  }

  const objetivosPotenciales = Math.max(
    1,
    filaHabilidad.objetivosComparacion ?? 1,
  );
  const objetivosEsperados = Math.max(
    1,
    filaHabilidad.objetivosEsperadosBalance ?? 1,
  );
  const danioObjetivoUnico = directoObjetivo + periodicoObjetivo;
  return {
    modelo,
    danioObjetivoUnico,
    danioGrupoEsperado: danioObjetivoUnico * objetivosEsperados,
    danioGrupoPotencial: danioObjetivoUnico * objetivosPotenciales,
  };
}

function crearArmaArquetipo({
  escenario,
  configuracionPersonaje,
  configuracionObjetos,
  referencias,
}) {
  if (!escenario.familiaArma) return null;
  const candidatas = Object.entries(configuracionObjetos)
    .filter(([, plantilla]) =>
      plantilla.tipo === "arma" &&
      plantilla.familiaObjeto === escenario.familiaArma &&
      (plantilla.nivelMinimoGeneracion ?? 1) <= escenario.nivel,
    )
    .sort(([, a], [, b]) => (b.tierBase ?? 1) - (a.tierBase ?? 1));
  const [idArma] = candidatas[0] ?? [];
  if (!idArma) return null;
  return crearFilaArma({
    configuracionPersonaje,
    configuracionObjetos,
    referencias,
    idArma,
    idArmaSecundaria: null,
    idProfesionForzada: escenario.profesion,
  });
}

function crearHabilidadArquetipo({
  escenario,
  configuracionPersonaje,
  configuracionObjetos,
  configuracionEjecucionHabilidades,
  referencias,
  potencia,
  configuracion,
}) {
  if (!escenario.usaHabilidad) return null;
  const candidatas = Object.values(
    configuracionEjecucionHabilidades.habilidades,
  ).filter(esHabilidadActivaEjecutable).filter(
    (habilidad) =>
      !escenario.categoriaHabilidad ||
      categoriaHabilidad(habilidad.requisitoNivelMaestria) ===
        escenario.categoriaHabilidad,
  );
  const escenarioPotencia = elegirPotenciaArquetipo({
    escenario,
    potencia,
  });
  const filas = candidatas.map((habilidad) => {
    const categoria = categoriaHabilidad(habilidad.requisitoNivelMaestria);
    const gradoNumero = habilidad.gradoMaximo;
    const grado = habilidad.ejecucion.grados[String(gradoNumero)];
    const nivel = escenario.nivel;
    const referencia = obtenerReferenciaMasCercana(referencias.filas, nivel);
    return crearFilaHabilidad({
      configuracionPersonaje,
      configuracionObjetos,
      habilidad,
      categoria,
      grado,
      gradoNumero,
      nivel,
      referencia,
      escenarioPotencia,
      resistenciaElemental: 0,
      resistenciaEfecto: 0,
      idProfesion: escenario.profesion,
      configuracion,
    });
  });
  return filas.sort((a, b) => b.indiceComparacion - a.indiceComparacion)[0] ?? null;
}

function elegirPotenciaArquetipo({ escenario, potencia }) {
  const tier = escenario.nivel >= 6 ? 2 : 1;
  const prefijo = escenario.conCatalizador
    ? "baston_base"
    : "sin_catalizador";
  return (
    potencia.filas.find((fila) =>
      fila.tier === tier && fila.id.startsWith(`${prefijo}_t${tier}`),
    ) ?? {
      id: `sin_catalizador_t${tier}`,
      nombre: "Sin catalizador",
      tier,
      danoHabilidad: 0,
    }
  );
}

function crearInformePruebasFocalizadas({
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionEjecucionHabilidades,
  referencias,
  potencia,
  habilidades,
  configuracion,
}) {
  const reglas = configuracion.pruebasFocalizadas;
  const jefe = crearReferenciaEnemigoEspecifico({
    configuracionEnemigos,
    configuracionObjetos,
    idPlantilla: reglas.idJefeReferencia,
    nivel: reglas.nivelJefeReferencia,
  });
  const bastonBaseT2 = obtenerEscenarioPotencia(
    potencia,
    "baston_base_t2",
  );
  const bastonBaseT1 = obtenerEscenarioPotencia(
    potencia,
    "baston_base_t1",
  );

  const incinerar = analizarIncinerarFocalizado({
    configuracionPersonaje,
    configuracionObjetos,
    configuracionEjecucionHabilidades,
    referencias,
    habilidades,
    jefe,
    escenarioPotencia: bastonBaseT2,
    reglas,
  });
  const rafagaGlacial = analizarRafagaGlacialFocalizada({
    configuracionPersonaje,
    configuracionObjetos,
    configuracionEjecucionHabilidades,
    referencias,
    habilidades,
    jefe,
    escenarioPotencia: bastonBaseT2,
    reglas,
  });
  const nubeToxica = analizarNubeToxicaFocalizada({
    configuracionPersonaje,
    configuracionObjetos,
    configuracionEjecucionHabilidades,
    habilidades,
    escenarioPotencia: bastonBaseT1,
    reglas,
  });
  const plagaCorrosiva = analizarPlagaCorrosivaFocalizada({
    configuracionPersonaje,
    configuracionObjetos,
    configuracionEjecucionHabilidades,
    habilidades,
    potencia,
    reglas,
  });
  const dobleVarita = analizarDobleVaritaFocalizada({
    potencia,
    habilidades,
    reglas,
  });
  const mana = analizarManaFocalizado({
    configuracionPersonaje,
    configuracionObjetos,
    configuracionEjecucionHabilidades,
    potencia,
    reglas,
  });

  const conclusiones = crearConclusionesPruebasFocalizadas({
    incinerar,
    rafagaGlacial,
    nubeToxica,
    plagaCorrosiva,
    dobleVarita,
    mana,
  });

  return {
    tipoResultado: "pruebas_focalizadas_motores_canonicos",
    determinista: true,
    descripcion:
      "Revisa las advertencias del análisis general mediante secuencias reales de efectos, zonas, regeneración y Daño de Habilidad.",
    jefeReferencia: jefe,
    incinerar,
    rafagaGlacial,
    nubeToxica,
    plagaCorrosiva,
    dobleVarita,
    mana,
    conclusiones,
    resumen: {
      casos: [
        ...incinerar.filas,
        ...rafagaGlacial.filas,
        ...nubeToxica.filas,
        ...plagaCorrosiva.filas,
        ...dobleVarita.filas,
        ...mana.filas,
      ].length,
      ...resumirEstados([
        ...incinerar.filas,
        ...rafagaGlacial.filas,
        ...nubeToxica.filas,
        ...plagaCorrosiva.filas,
        ...dobleVarita.filas,
        ...mana.filas,
      ]),
    },
  };
}

function analizarIncinerarFocalizado({
  configuracionPersonaje,
  configuracionObjetos,
  configuracionEjecucionHabilidades,
  referencias,
  habilidades,
  jefe,
  escenarioPotencia,
  reglas,
}) {
  const habilidad = obtenerHabilidadRequerida(
    configuracionEjecucionHabilidades,
    "incinerar",
  );
  const gradoNumero = 3;
  const grado = habilidad.ejecucion.grados[String(gradoNumero)];
  const filaMediana = obtenerFilaPrincipalHabilidad({
    habilidades,
    idHabilidad: habilidad.id,
    grado: gradoNumero,
  });
  const referenciaNivel10 = obtenerReferenciaMasCercana(
    referencias.filas,
    reglas.nivelJefeReferencia,
  );
  const filaJefe = crearFilaHabilidad({
    configuracionPersonaje,
    configuracionObjetos,
    habilidad,
    categoria: "avanzada",
    grado,
    gradoNumero,
    nivel: reglas.nivelJefeReferencia,
    referencia: jefe,
    escenarioPotencia,
    resistenciaElemental: jefe.resistencias.fuego ?? 0,
    resistenciaEfecto: jefe.resistenciasEfectos.quemadura ?? 0,
  });
  const lanzamientos = reglas.lanzamientosRotacionAvanzada;
  const instantes = crearInstantesLanzamiento(
    lanzamientos,
    grado.costoTemporalBase,
  );
  const probabilidadEfectoJefe = limitar(
    (filaJefe.probabilidadImpacto / 100) *
      (filaJefe.probabilidadAplicacionEfecto / 100),
    0,
    1,
  );
  const secuenciaJefe = simularSecuenciaEfectoEsperada({
    configuracionPersonaje,
    configuracionObjetos,
    habilidad,
    grado,
    nivel: reglas.nivelJefeReferencia,
    escenarioPotencia,
    instantes,
    probabilidadAplicacion: probabilidadEfectoJefe,
    resistencias: jefe.resistencias,
    resistenciasEfectos: jefe.resistenciasEfectos,
  });
  const manaRotacion = simularManaRotacion({
    configuracionPersonaje,
    configuracionObjetos,
    idProfesion: "mago",
    nivel: reglas.nivelJefeReferencia,
    escenarioPotencia,
    acciones: Array.from({ length: lanzamientos }, () => ({
      costoMana: grado.costoMana,
      costoTemporal: grado.costoTemporalBase,
    })),
  });
  const directoRotacion = filaJefe.danioDirectoEsperado * lanzamientos;
  const totalRotacion = directoRotacion + secuenciaJefe.danioPeriodicoEsperado;
  const porcentajeVidaJefe = jefe.vida > 0
    ? (totalRotacion / jefe.vida) * 100
    : 0;
  const estadoJefe = porcentajeVidaJefe >=
    reglas.porcentajeVidaJefeIncorrectoRotacion
    ? ESTADOS.INCORRECTO
    : porcentajeVidaJefe >= reglas.porcentajeVidaJefeAdvertenciaRotacion
      ? ESTADOS.ADVERTENCIA
      : ESTADOS.CORRECTO;

  const filasGrupo = reglas.objetivosGrupoIncinerar.map((objetivos) => ({
    id: `incinerar_grupo_${objetivos}`,
    escenario: `Una Incinerar G3 sobre ${objetivos} objetivo${objetivos === 1 ? "" : "s"}`,
    objetivo: `Enemigo mediano nivel ${referenciaNivel10.nivel}`,
    lanzamientos: 1,
    objetivos,
    manaGastado: grado.costoMana,
    tiempoAcciones: grado.costoTemporalBase,
    danioDirectoEsperado: redondear(
      filaMediana.danioDirectoEsperado * objetivos,
    ),
    danioPeriodicoEsperado: redondear(
      filaMediana.danioPeriodicoEsperado * objetivos,
    ),
    danioTotalEsperado: redondear(
      filaMediana.danioTotalEsperado * objetivos,
    ),
    porcentajeVidaObjetivo: redondear(
      (filaMediana.danioTotalEsperado / referenciaNivel10.vida) * 100,
    ),
    criterio:
      "La línea puede premiar una buena alineación. Se informa por 1–3 objetivos; el balance contra jefes se decide en la rotación sostenida.",
    estado: objetivos === 1 ? ESTADOS.INFORMATIVO : ESTADOS.CORRECTO,
  }));

  const filaRotacion = {
    id: "incinerar_jefe_tres_lanzamientos",
    escenario: `${lanzamientos} Incinerar G3 consecutivas`,
    objetivo: `${jefe.nombre} nivel ${jefe.nivel}`,
    lanzamientos,
    objetivos: 1,
    manaGastado: manaRotacion.manaGastado,
    manaRegenerado: manaRotacion.manaRegenerado,
    manaNeto: manaRotacion.manaNeto,
    manaRestantePorcentaje: manaRotacion.manaRestantePorcentaje,
    tiempoAcciones: manaRotacion.tiempoTotal,
    danioDirectoEsperado: redondear(directoRotacion),
    danioPeriodicoEsperado: redondear(
      secuenciaJefe.danioPeriodicoEsperado,
    ),
    danioTotalEsperado: redondear(totalRotacion),
    vidaObjetivo: jefe.vida,
    porcentajeVidaObjetivo: redondear(porcentajeVidaJefe),
    quemaduraSinAcumulacion: secuenciaJefe.maximoInstancias <= 1,
    criterio:
      `Una rotación corta no debería quitar ${reglas.porcentajeVidaJefeIncorrectoRotacion} % o más de la Vida del jefe. Desde ${reglas.porcentajeVidaJefeAdvertenciaRotacion} % queda como advertencia. La Quemadura debe mantener una sola instancia.`,
    estado:
      secuenciaJefe.maximoInstancias > 1 ? ESTADOS.INCORRECTO : estadoJefe,
  };

  return {
    filas: [...filasGrupo, filaRotacion],
    detalleSecuenciaJefe: secuenciaJefe,
    conclusion:
      filaRotacion.estado === ESTADOS.CORRECTO
        ? "La advertencia de Incinerar G3 se reduce al simular correctamente la Quemadura: tres lanzamientos renuevan una sola instancia y no triplican todo el daño periódico."
        : "Incinerar G3 conserva una señal alta contra el jefe y necesita revisar su daño antes de cambiar otros recursos.",
    recomendacion:
      filaRotacion.estado === ESTADOS.CORRECTO
        ? "Mantener sus valores actuales y confirmar la sensación durante la regresión jugable final."
        : "Proponer una reducción numérica antes de la regresión final.",
  };
}

function analizarRafagaGlacialFocalizada({
  configuracionPersonaje,
  configuracionObjetos,
  configuracionEjecucionHabilidades,
  referencias,
  habilidades,
  jefe,
  escenarioPotencia,
  reglas,
}) {
  const habilidad = obtenerHabilidadRequerida(
    configuracionEjecucionHabilidades,
    "rafaga_glacial",
  );
  const filas = [];
  const contratos = [];

  for (const gradoNumero of [2, 3]) {
    const grado = habilidad.ejecucion.grados[String(gradoNumero)];
    const filaNormal = obtenerFilaPrincipalHabilidad({
      habilidades,
      idHabilidad: habilidad.id,
      grado: gradoNumero,
    });
    const filaJefe = crearFilaHabilidad({
      configuracionPersonaje,
      configuracionObjetos,
      habilidad,
      categoria: "avanzada",
      grado,
      gradoNumero,
      nivel: reglas.nivelJefeReferencia,
      referencia: jefe,
      escenarioPotencia,
      resistenciaElemental: jefe.resistencias.frio ?? 0,
      resistenciaEfecto: jefe.resistenciasEfectos.congelamiento ?? 0,
    });
    const contrato = probarContratoCongelamiento({
      configuracionPersonaje,
      configuracionObjetos,
      habilidad,
      grado,
      gradoNumero,
      escenarioPotencia,
      nivel: reglas.nivelJefeReferencia,
    });
    contratos.push(contrato);

    for (const objetivo of [
      { id: "normal", nombre: "Enemigo normal", fila: filaNormal },
      { id: "jefe", nombre: jefe.nombre, fila: filaJefe },
    ]) {
      const probabilidadCongelar = limitar(
        (objetivo.fila.probabilidadImpacto / 100) *
          (objetivo.fila.probabilidadAplicacionEfecto / 100),
        0,
        1,
      );
      const accionesBloqueadasEsperadas =
        probabilidadCongelar * (grado.efectos[0].duracion / TIEMPO_REFERENCIA);
      const estado = !contrato.aprobado
        ? ESTADOS.INCORRECTO
        : accionesBloqueadasEsperadas >= 0.45
          ? ESTADOS.CORRECTO
          : accionesBloqueadasEsperadas >= 0.25
            ? ESTADOS.ADVERTENCIA
            : ESTADOS.INFORMATIVO;
      filas.push({
        id: `rafaga_g${gradoNumero}_${objetivo.id}`,
        grado: gradoNumero,
        objetivo: objetivo.nombre,
        duracion: grado.efectos[0].duracion,
        probabilidadCongelar: redondear(probabilidadCongelar * 100),
        accionesBloqueadasEsperadas: redondear(accionesBloqueadasEsperadas),
        bloqueoTotal: contrato.bloqueoTotal,
        duplicadoRechazado: contrato.duplicadoRechazado,
        unaSolaInstancia: contrato.maximoInstancias === 1,
        criterio:
          "Congelamiento debe impedir toda acción durante su duración, conservar una sola instancia y no renovarse al reaplicarse. La resistencia puede reducir la expectativa contra jefes.",
        estado,
      });
    }
  }

  return {
    filas,
    contratos,
    conclusion:
      "Ráfaga glacial combina daño moderado con 60% de probabilidad base de Congelamiento. El control ya no depende de la distancia porque bloquea todas las acciones del objetivo.",
    recomendacion:
      "Mantener daño, Maná y duraciones actuales y validar en juego que la probabilidad del 60% resulte potente sin volver el control demasiado constante.",
  };
}

function analizarNubeToxicaFocalizada({
  configuracionPersonaje,
  configuracionObjetos,
  configuracionEjecucionHabilidades,
  habilidades,
  escenarioPotencia,
  reglas,
}) {
  const habilidad = obtenerHabilidadRequerida(
    configuracionEjecucionHabilidades,
    "nube_toxica",
  );
  const gradoNumero = 1;
  const grado = habilidad.ejecucion.grados[String(gradoNumero)];
  const filaPrincipal = obtenerFilaPrincipalHabilidad({
    habilidades,
    idHabilidad: habilidad.id,
    grado: gradoNumero,
  });
  const probabilidadAplicacion = limitar(
    (filaPrincipal.probabilidadImpacto / 100) *
      (filaPrincipal.probabilidadAplicacionEfecto / 100),
    0,
    1,
  );
  const esperadaUnObjetivo = simularZonaEsperadaUnObjetivo({
    configuracionPersonaje,
    configuracionObjetos,
    habilidad,
    grado,
    escenarioPotencia,
    nivel: filaPrincipal.nivelReferencia,
    probabilidadAplicacion,
  });
  const contratoTresObjetivos = simularZonaConPatron({
    configuracionPersonaje,
    configuracionObjetos,
    habilidad,
    grado,
    escenarioPotencia,
    nivel: filaPrincipal.nivelReferencia,
    cantidadObjetivos: 3,
    patronAplicaciones: Array(9).fill(true),
  });
  const entradaTardia = probarEntradaTardiaZona({
    configuracionPersonaje,
    configuracionObjetos,
    habilidad,
    grado,
    escenarioPotencia,
    nivel: filaPrincipal.nivelReferencia,
  });

  const filas = reglas.objetivosNube.map((objetivos) => {
    const total = esperadaUnObjetivo.danioPeriodicoEsperado * objetivos;
    const estado = objetivos === 1
      ? ESTADOS.INFORMATIVO
      : contratoTresObjetivos.maximoInstanciasPorObjetivo <= 1 &&
          entradaTardia.aplicoAlEntrar
        ? ESTADOS.CORRECTO
        : ESTADOS.INCORRECTO;
    return {
      id: `nube_g1_${objetivos}_objetivos`,
      escenario: `${objetivos} objetivo${objetivos === 1 ? "" : "s"} dentro durante toda la zona`,
      objetivos,
      activacionesPorObjetivo: esperadaUnObjetivo.activaciones,
      ticksEsperadosPorObjetivo: redondear(
        esperadaUnObjetivo.ticksEsperados,
      ),
      duracionZona: grado.zonaTemporal.duracion,
      ultimoTickEsperado: esperadaUnObjetivo.ultimoInstante,
      mana: grado.costoMana,
      danioTotalEsperado: redondear(total),
      danioPorMana: redondear(total / grado.costoMana),
      unaInstanciaPorObjetivo:
        contratoTresObjetivos.maximoInstanciasPorObjetivo <= 1,
      aplicaAlEntrar: entradaTardia.aplicoAlEntrar,
      criterio:
        objetivos === 1
          ? "Es una habilidad de área persistente; contra un solo objetivo se informa, pero no se exige que iguale a una habilidad individual."
          : "Con tres objetivos debe aprovechar al crear, por intervalo y al entrar sin generar efectos paralelos. Una sola instancia por objetivo es obligatoria.",
      estado,
    };
  });

  return {
    filas,
    esperadaUnObjetivo,
    contratoTresObjetivos,
    entradaTardia,
    conclusion:
      "La advertencia inicial de Nube tóxica G1 provenía de contar solo la primera aplicación. La zona real renueva el veneno y prolonga sus ticks; con varios objetivos cumple su función de área.",
    recomendacion:
      "Mantener sus valores actuales. No aumentar el daño basándose únicamente en la primera aplicación.",
  };
}

function analizarPlagaCorrosivaFocalizada({
  configuracionPersonaje,
  configuracionObjetos,
  configuracionEjecucionHabilidades,
  habilidades,
  potencia,
}) {
  const habilidad = obtenerHabilidadRequerida(
    configuracionEjecucionHabilidades,
    "plaga_corrosiva",
  );
  const filas = [];
  const detalles = [];

  for (const gradoNumero of [1, 2, 3]) {
    const grado = habilidad.ejecucion.grados[String(gradoNumero)];
    const fila = obtenerFilaPrincipalHabilidad({
      habilidades,
      idHabilidad: habilidad.id,
      grado: gradoNumero,
    });
    const escenarioPotencia = obtenerEscenarioPotencia(
      potencia,
      fila.nivelReferencia >= 6 ? "baston_base_t2" : "baston_base_t1",
    );
    const aplicaciones = grado.efectos[0].maximo;
    const instantes = crearInstantesLanzamiento(
      aplicaciones,
      grado.costoTemporalBase,
    );
    const probabilidadAplicacion = limitar(
      (fila.probabilidadImpacto / 100) *
        (fila.probabilidadAplicacionEfecto / 100),
      0,
      1,
    );
    const secuencia = simularSecuenciaEfectoEsperada({
      configuracionPersonaje,
      configuracionObjetos,
      habilidad,
      grado,
      nivel: fila.nivelReferencia,
      escenarioPotencia,
      instantes,
      probabilidadAplicacion,
      resistencias: { fuego: 0, frio: 0, rayo: 0, veneno: 0 },
      resistenciasEfectos: {
        congelamiento: 0,
        aturdimiento: 0,
        envenenamiento: 0,
        quemadura: 0,
      },
    });
    detalles.push(secuencia);
    const directo = fila.danioDirectoEsperado * aplicaciones;
    const total = directo + secuencia.danioPeriodicoEsperado;
    const tiempoAcciones = grado.costoTemporalBase * aplicaciones;
    const alcanzaMaximo =
      secuencia.simulacionExitoTotal.maximaIntensidad === aplicaciones;
    const unaInstancia =
      secuencia.simulacionExitoTotal.maximoInstancias <= 1;
    filas.push({
      id: `plaga_g${gradoNumero}_maximo`,
      grado: gradoNumero,
      aplicaciones,
      intensidadMaximaConfigurada: aplicaciones,
      intensidadMaximaComprobada:
        secuencia.simulacionExitoTotal.maximaIntensidad,
      probabilidadAlcanzarMaximo: redondear(
        Math.pow(probabilidadAplicacion, aplicaciones) * 100,
      ),
      unaInstancia,
      mana: grado.costoMana * aplicaciones,
      tiempoAcciones,
      danioDirectoEsperado: redondear(directo),
      danioPeriodicoEsperado: redondear(
        secuencia.danioPeriodicoEsperado,
      ),
      danioTotalEsperado: redondear(total),
      danioPor100Accion: redondear((total / tiempoAcciones) * 100),
      danioPorMana: redondear(total / (grado.costoMana * aplicaciones)),
      criterio:
        "Debe alcanzar su intensidad configurada tras las reaplicaciones, conservar una sola instancia y pagar ese crecimiento con varios lanzamientos y Maná.",
      estado:
        alcanzaMaximo && unaInstancia
          ? ESTADOS.CORRECTO
          : ESTADOS.INCORRECTO,
    });
  }

  return {
    filas,
    detalles,
    conclusion:
      "Plaga corrosiva funciona como daño de preparación: necesita dos o tres lanzamientos para alcanzar el máximo, conserva una sola instancia y no crea temporizadores paralelos.",
    recomendacion:
      "Mantener sus valores. Su mayor daño sostenido queda compensado por el coste de acciones, Maná y la probabilidad de completar todas las aplicaciones.",
  };
}

function analizarDobleVaritaFocalizada({ potencia, habilidades, reglas }) {
  const filas = [];
  for (const tier of [1, 2]) {
    const bastonBase = obtenerEscenarioPotencia(
      potencia,
      `baston_base_t${tier}`,
    );
    const dobleBase = obtenerEscenarioPotencia(
      potencia,
      `doble_varita_base_t${tier}`,
    );
    const bastonEnfocado = obtenerEscenarioPotencia(
      potencia,
      `baston_enfocado_t${tier}`,
    );
    const dobleEnfocado = obtenerEscenarioPotencia(
      potencia,
      `doble_varita_enfocada_t${tier}`,
    );

    const comparacionBase = compararEscenariosPotenciaHabilidades({
      habilidades,
      escenarioReferencia: bastonBase,
      escenarioComparado: dobleBase,
    });
    const comparacionEnfocada = compararEscenariosPotenciaHabilidades({
      habilidades,
      escenarioReferencia: bastonEnfocado,
      escenarioComparado: dobleEnfocado,
    });
    const ventajaAdicionalAfijos =
      ((1 + comparacionEnfocada.ventajaAgregada / 100) /
        (1 + comparacionBase.ventajaAgregada / 100) -
        1) *
      100;
    const ventajaTeoricaBase =
      ((1 + dobleBase.danoHabilidad / 100) /
        (1 + bastonBase.danoHabilidad / 100) -
        1) *
      100;
    const ventajaTeoricaEnfocada =
      ((1 + dobleEnfocado.danoHabilidad / 100) /
        (1 + bastonEnfocado.danoHabilidad / 100) -
        1) *
      100;
    const ventajaTeoricaAdicional =
      ((1 + ventajaTeoricaEnfocada / 100) /
        (1 + ventajaTeoricaBase / 100) -
        1) *
      100;
    const ventajaEvaluada = Math.max(
      ventajaAdicionalAfijos,
      ventajaTeoricaAdicional,
    );
    const estado =
      ventajaEvaluada <= reglas.ventajaMaximaDobleVaritaPorcentaje
        ? ESTADOS.CORRECTO
        : ESTADOS.ADVERTENCIA;

    filas.push({
      id: `doble_varita_afijos_t${tier}`,
      tier,
      potenciaBastonBase: bastonBase.danoHabilidad,
      potenciaDobleVaritaBase: dobleBase.danoHabilidad,
      potenciaBastonMaxima: bastonEnfocado.danoHabilidad,
      potenciaDobleVaritaMaxima: dobleEnfocado.danoHabilidad,
      ventajaBaseDanioPorcentaje: redondear(
        comparacionBase.ventajaAgregada,
      ),
      ventajaMaximaDanioPorcentaje: redondear(
        comparacionEnfocada.ventajaAgregada,
      ),
      ventajaAdicionalAfijosPorcentaje: redondear(
        ventajaAdicionalAfijos,
      ),
      ventajaTeoricaAdicionalPorcentaje: redondear(
        ventajaTeoricaAdicional,
      ),
      ventajaIndividualMaximaPorcentaje: redondear(
        comparacionEnfocada.ventajaIndividualMaxima,
      ),
      habilidadesComparadas: comparacionEnfocada.cantidad,
      criterio:
        `Se descuenta la ventaja que la doble varita ya posee por precisión, crítico y equipo base. Correcto: los dos afijos pueden aportar hasta ${reglas.ventajaMaximaDobleVaritaPorcentaje} % adicional frente al bastón con un afijo. El máximo individual se informa, pero no decide solo porque el redondeo de daños pequeños puede exagerarlo.`,
      estado,
    });
  }
  return {
    filas,
    conclusion:
      filas.every((fila) => fila.estado === ESTADOS.CORRECTO)
        ? "La doble varita máxima supera al bastón máximo, pero la parte adicional causada específicamente por equipar dos afijos queda dentro del límite propuesto."
        : "Los dos afijos de doble varita añaden una ventaja superior al límite incluso después de descontar la diferencia del equipo base.",
    recomendacion:
      filas.every((fila) => fila.estado === ESTADOS.CORRECTO)
        ? "Mantener la Potencia, los afijos y la regla canónica de doble varita."
        : "Revisar el valor máximo del afijo antes de modificar la regla canónica.",
  };
}

function compararEscenariosPotenciaHabilidades({
  habilidades,
  escenarioReferencia,
  escenarioComparado,
}) {
  const pares = [];
  const filasReferencia = habilidades.filas.filter(
    (fila) =>
      fila.resistenciaElemental === 0 &&
      fila.escenarioPotencia === escenarioReferencia.id,
  );
  for (const referencia of filasReferencia) {
    const comparada = habilidades.filas.find(
      (fila) =>
        fila.idHabilidad === referencia.idHabilidad &&
        fila.grado === referencia.grado &&
        fila.resistenciaElemental === 0 &&
        fila.escenarioPotencia === escenarioComparado.id,
    );
    if (!comparada || referencia.danioTotalEsperado <= 0) continue;
    pares.push({
      referencia: referencia.danioTotalEsperado,
      comparada: comparada.danioTotalEsperado,
      ventaja:
        ((comparada.danioTotalEsperado / referencia.danioTotalEsperado) - 1) *
        100,
    });
  }
  const totalReferencia = pares.reduce(
    (total, par) => total + par.referencia,
    0,
  );
  const totalComparado = pares.reduce(
    (total, par) => total + par.comparada,
    0,
  );
  return {
    cantidad: pares.length,
    ventajaAgregada:
      totalReferencia > 0
        ? ((totalComparado / totalReferencia) - 1) * 100
        : 0,
    ventajaMediana: mediana(pares.map((par) => par.ventaja)),
    ventajaIndividualMaxima:
      pares.length > 0 ? Math.max(...pares.map((par) => par.ventaja)) : 0,
  };
}

function analizarManaFocalizado({
  configuracionPersonaje,
  configuracionObjetos,
  configuracionEjecucionHabilidades,
  potencia,
  reglas,
}) {
  const definiciones = [
    { id: "incinerar", grado: 3, lanzamientos: 3 },
    { id: "rafaga_glacial", grado: 3, lanzamientos: 3 },
    { id: "plaga_corrosiva", grado: 3, lanzamientos: 3 },
    { id: "nube_toxica", grado: 1, lanzamientos: 1 },
  ];
  const escenarioPotencia = obtenerEscenarioPotencia(
    potencia,
    "baston_base_t2",
  );
  const filas = definiciones.map((definicion) => {
    const habilidad = obtenerHabilidadRequerida(
      configuracionEjecucionHabilidades,
      definicion.id,
    );
    const grado = habilidad.ejecucion.grados[String(definicion.grado)];
    const simulacion = simularManaRotacion({
      configuracionPersonaje,
      configuracionObjetos,
      idProfesion: "mago",
      nivel: 10,
      escenarioPotencia,
      acciones: Array.from({ length: definicion.lanzamientos }, () => ({
        costoMana: grado.costoMana,
        costoTemporal: grado.costoTemporalBase,
      })),
    });
    const estado = simulacion.manaRestantePorcentaje >=
      reglas.reservaManaCorrectaMinimaPorcentaje
      ? ESTADOS.CORRECTO
      : simulacion.manaRestantePorcentaje >=
          reglas.reservaManaAdvertenciaMinimaPorcentaje
        ? ESTADOS.ADVERTENCIA
        : ESTADOS.INCORRECTO;
    return {
      id: `mana_${definicion.id}_g${definicion.grado}`,
      habilidad: habilidad.nombre,
      grado: definicion.grado,
      lanzamientos: definicion.lanzamientos,
      manaMaximo: simulacion.manaMaximo,
      manaGastado: simulacion.manaGastado,
      manaRegenerado: simulacion.manaRegenerado,
      manaNeto: simulacion.manaNeto,
      manaRestante: simulacion.manaRestante,
      manaRestantePorcentaje: simulacion.manaRestantePorcentaje,
      tiempo: simulacion.tiempoTotal,
      criterio:
        `Una rotación focalizada debe dejar al menos ${reglas.reservaManaCorrectaMinimaPorcentaje} % de la reserva para quedar Correcta. Entre ${reglas.reservaManaAdvertenciaMinimaPorcentaje} % y ${reglas.reservaManaCorrectaMinimaPorcentaje} % es Advertencia.`,
      estado,
    };
  });
  return {
    filas,
    conclusion:
      filas.every((fila) => fila.estado !== ESTADOS.INCORRECTO)
        ? "Las rotaciones focalizadas no vacían al Mago. La regeneración ayuda, pero el Maná sigue siendo un límite visible para repetir habilidades avanzadas."
        : "Alguna rotación focalizada deja al Mago prácticamente sin recursos.",
    recomendacion:
      filas.every((fila) => fila.estado !== ESTADOS.INCORRECTO)
        ? "No agregar todavía pociones de Maná ni aumentar la regeneración. Confirmar los jefes en la regresión jugable."
        : "Comparar una poción del 25 % antes de modificar la regeneración base.",
  };
}

function simularSecuenciaEfectoEsperada({
  configuracionPersonaje,
  configuracionObjetos,
  habilidad,
  grado,
  nivel,
  idProfesion = "mago",
  escenarioPotencia,
  instantes,
  probabilidadAplicacion,
  resistencias,
  resistenciasEfectos,
}) {
  const cantidad = instantes.length;
  let danioPeriodicoEsperado = 0;
  let ticksEsperados = 0;
  let ultimoInstanteEsperado = 0;
  let maximoInstancias = 0;
  let maximaIntensidadEsperada = 0;
  let simulacionExitoTotal = null;

  for (let mascara = 0; mascara < 2 ** cantidad; mascara += 1) {
    const patron = Array.from({ length: cantidad }, (_, indice) =>
      Boolean(mascara & (1 << indice)),
    );
    const exitos = patron.filter(Boolean).length;
    const fallos = cantidad - exitos;
    const peso =
      Math.pow(probabilidadAplicacion, exitos) *
      Math.pow(1 - probabilidadAplicacion, fallos);
    if (peso === 0) continue;
    const simulacion = simularSecuenciaEfectoConPatron({
      configuracionPersonaje,
      configuracionObjetos,
      habilidad,
      grado,
      nivel,
      idProfesion,
      escenarioPotencia,
      instantes,
      patronAplicaciones: patron,
      resistencias,
      resistenciasEfectos,
    });
    danioPeriodicoEsperado += simulacion.danioPeriodico * peso;
    ticksEsperados += simulacion.ticks * peso;
    ultimoInstanteEsperado += simulacion.ultimoInstante * peso;
    maximoInstancias = Math.max(maximoInstancias, simulacion.maximoInstancias);
    maximaIntensidadEsperada += simulacion.maximaIntensidad * peso;
    if (exitos === cantidad) simulacionExitoTotal = simulacion;
  }

  return {
    aplicaciones: cantidad,
    probabilidadAplicacion: redondear(probabilidadAplicacion * 100),
    danioPeriodicoEsperado: redondear(danioPeriodicoEsperado),
    ticksEsperados: redondear(ticksEsperados),
    ultimoInstanteEsperado: redondear(ultimoInstanteEsperado),
    maximoInstancias,
    maximaIntensidadEsperada: redondear(maximaIntensidadEsperada),
    simulacionExitoTotal,
  };
}

function simularSecuenciaEfectoConPatron({
  configuracionPersonaje,
  configuracionObjetos,
  habilidad,
  grado,
  nivel,
  idProfesion = "mago",
  escenarioPotencia,
  instantes,
  patronAplicaciones,
  resistencias,
  resistenciasEfectos,
}) {
  const jugador = crearJugadorPrueba({
    configuracionPersonaje,
    idProfesion,
    nivel,
  });
  equiparEscenarioPotencia({
    jugador,
    configuracionObjetos,
    escenario: escenarioPotencia,
  });
  const objetivo = crearObjetivoPrueba({
    nivel,
    resistencias,
    resistenciasEfectos,
  });
  let tiempoActual = 0;
  const sistema = new SistemaEfectosTemporales({
    obtenerTiempoActual: () => tiempoActual,
  });
  const eventos = [];
  let maximoInstancias = 0;
  let maximaIntensidad = 0;

  const registrarEstado = () => {
    const activos = sistema.obtenerEfectosObjetivo(objetivo);
    maximoInstancias = Math.max(maximoInstancias, activos.length);
    maximaIntensidad = Math.max(
      maximaIntensidad,
      0,
      ...activos.map((efecto) => efecto.intensidad ?? 1),
    );
  };
  const procesarHasta = (destino) => {
    while (true) {
      const siguiente = sistema.obtenerSiguienteInstante();
      if (siguiente === null || siguiente > destino) break;
      tiempoActual = siguiente;
      const resultado = sistema.procesarEventosEn(siguiente);
      eventos.push(...resultado.eventos);
      registrarEstado();
    }
    tiempoActual = destino;
  };

  for (let indice = 0; indice < instantes.length; indice += 1) {
    procesarHasta(instantes[indice]);
    if (!patronAplicaciones[indice]) continue;
    const preparadas = prepararEfectosHabilidad({
      lanzador: jugador,
      objetivo,
      efectosConfigurados: grado.efectos,
      idEjecucion: `balance-foco:${habilidad.id}:${indice}`,
    });
    for (const preparada of preparadas) {
      const resultado = sistema.aplicar(preparada.definicion, {
        obtenerTiradaAplicacion: () => 1,
      });
      eventos.push(...(resultado.eventos ?? []));
      registrarEstado();
    }
  }

  while (sistema.obtenerSiguienteInstante() !== null) {
    const siguiente = sistema.obtenerSiguienteInstante();
    tiempoActual = siguiente;
    const resultado = sistema.procesarEventosEn(siguiente);
    eventos.push(...resultado.eventos);
    registrarEstado();
  }

  const ticks = eventos.filter(
    (evento) => evento.tipo === "danio_periodico_aplicado",
  );
  const danioPeriodico = ticks.reduce(
    (total, evento) => total + (evento.danio ?? 0),
    0,
  );
  sistema.destruir();
  return {
    patronAplicaciones: [...patronAplicaciones],
    danioPeriodico,
    ticks: ticks.length,
    maximoInstancias,
    maximaIntensidad,
    ultimoInstante: tiempoActual,
    eventosAplicacion: eventos
      .filter((evento) =>
        [
          "efecto_aplicado",
          "efecto_renovado",
          "efecto_intensificado",
          "efecto_rechazado",
        ].includes(evento.tipo),
      )
      .map((evento) => ({
        tipo: evento.tipo,
        intensidad: evento.intensidad,
        venceEn: evento.venceEn,
      })),
  };
}

function probarContratoCongelamiento({
  configuracionPersonaje,
  configuracionObjetos,
  habilidad,
  grado,
  gradoNumero,
  escenarioPotencia,
  nivel,
}) {
  const jugador = crearJugadorPrueba({
    configuracionPersonaje,
    idProfesion: "mago",
    nivel,
  });
  equiparEscenarioPotencia({
    jugador,
    configuracionObjetos,
    escenario: escenarioPotencia,
  });
  const objetivo = crearObjetivoPrueba({ nivel });
  let tiempoActual = 0;
  const sistema = new SistemaEfectosTemporales({
    obtenerTiempoActual: () => tiempoActual,
  });
  const preparar = (sufijo) =>
    prepararEfectosHabilidad({
      lanzador: jugador,
      objetivo,
      efectosConfigurados: grado.efectos,
      idEjecucion: `balance-rafaga:g${gradoNumero}:${sufijo}`,
    })[0].definicion;
  const primera = sistema.aplicar(preparar("primera"), {
    obtenerTiradaAplicacion: () => 1,
  });
  const duplicada = sistema.aplicar(preparar("duplicada"), {
    obtenerTiradaAplicacion: () => 1,
  });
  const maximoInstancias = sistema.obtenerEfectosObjetivo(objetivo).length;
  tiempoActual = grado.efectos[0].duracion - 1;
  const activoAntesVencer = sistema.estaBajoBloqueoTotal(objetivo);
  tiempoActual = grado.efectos[0].duracion;
  sistema.procesarEventosEn(tiempoActual);
  const inactivoAlVencer = !sistema.estaBajoBloqueoTotal(objetivo);
  sistema.destruir();
  return {
    grado: gradoNumero,
    primeraAplicada: primera.aplicado === true,
    duplicadoRechazado:
      duplicada.estadoAplicacion === "rechazado_por_politica" &&
      duplicada.motivo === "duplicado",
    maximoInstancias,
    activoAntesVencer,
    inactivoAlVencer,
    bloqueoTotal: activoAntesVencer,
    aprobado:
      primera.aplicado === true &&
      duplicada.estadoAplicacion === "rechazado_por_politica" &&
      maximoInstancias === 1 &&
      activoAntesVencer &&
      inactivoAlVencer,
  };
}

function simularZonaEsperadaUnObjetivo({
  configuracionPersonaje,
  configuracionObjetos,
  habilidad,
  grado,
  escenarioPotencia,
  nivel,
  probabilidadAplicacion,
}) {
  const activaciones = contarActivacionesZona(grado.zonaTemporal);
  let danioPeriodicoEsperado = 0;
  let ticksEsperados = 0;
  let ultimoInstante = 0;
  let maximoInstanciasPorObjetivo = 0;
  let simulacionExitoTotal = null;
  for (let mascara = 0; mascara < 2 ** activaciones; mascara += 1) {
    const patron = Array.from({ length: activaciones }, (_, indice) =>
      Boolean(mascara & (1 << indice)),
    );
    const exitos = patron.filter(Boolean).length;
    const fallos = activaciones - exitos;
    const peso =
      Math.pow(probabilidadAplicacion, exitos) *
      Math.pow(1 - probabilidadAplicacion, fallos);
    if (peso === 0) continue;
    const simulacion = simularZonaConPatron({
      configuracionPersonaje,
      configuracionObjetos,
      habilidad,
      grado,
      escenarioPotencia,
      nivel,
      cantidadObjetivos: 1,
      patronAplicaciones: patron,
    });
    danioPeriodicoEsperado += simulacion.danioPeriodico * peso;
    ticksEsperados += simulacion.ticks * peso;
    ultimoInstante += simulacion.ultimoInstante * peso;
    maximoInstanciasPorObjetivo = Math.max(
      maximoInstanciasPorObjetivo,
      simulacion.maximoInstanciasPorObjetivo,
    );
    if (exitos === activaciones) simulacionExitoTotal = simulacion;
  }
  return {
    activaciones,
    probabilidadAplicacion: redondear(probabilidadAplicacion * 100),
    danioPeriodicoEsperado: redondear(danioPeriodicoEsperado),
    ticksEsperados: redondear(ticksEsperados),
    ultimoInstante: redondear(ultimoInstante),
    maximoInstanciasPorObjetivo,
    simulacionExitoTotal,
  };
}

function simularZonaConPatron({
  configuracionPersonaje,
  configuracionObjetos,
  habilidad,
  grado,
  escenarioPotencia,
  nivel,
  cantidadObjetivos,
  patronAplicaciones,
}) {
  const jugador = crearJugadorPrueba({
    configuracionPersonaje,
    idProfesion: "mago",
    nivel,
  });
  equiparEscenarioPotencia({
    jugador,
    configuracionObjetos,
    escenario: escenarioPotencia,
  });
  jugador.x = 0;
  jugador.y = 0;
  const posiciones = [
    { x: 2, y: 2 },
    { x: 2, y: 1 },
    { x: 3, y: 2 },
    { x: 2, y: 3 },
    { x: 1, y: 2 },
  ];
  const objetivos = Array.from({ length: cantidadObjetivos }, (_, indice) => {
    const objetivo = crearObjetivoPrueba({ nivel });
    Object.assign(objetivo, posiciones[indice]);
    return objetivo;
  });
  const mapa = Array.from({ length: 5 }, () => Array(5).fill("."));
  let tiempoActual = 0;
  let indiceAplicacion = 0;
  const eventos = [];
  const sistemaEfectos = new SistemaEfectosTemporales({
    obtenerTiempoActual: () => tiempoActual,
  });
  let maximoInstanciasPorObjetivo = 0;
  const registrarInstancias = () => {
    for (const objetivo of objetivos) {
      maximoInstanciasPorObjetivo = Math.max(
        maximoInstanciasPorObjetivo,
        sistemaEfectos.obtenerEfectosObjetivo(objetivo).length,
      );
    }
  };
  const sistemaEspacial = new SistemaEspacial({
    mapa,
    obtenerEntidades: () => objetivos,
  });
  const sistemaZonas = new SistemaZonasTemporales({
    mapa,
    sistemaEspacial,
    obtenerTiempoActual: () => tiempoActual,
    obtenerActores: () => objetivos,
    esObjetivoValido: () => true,
    aplicarContenido: ({ zona, objetivo, instante }) => {
      const aplicar = patronAplicaciones[indiceAplicacion] === true;
      indiceAplicacion += 1;
      if (!aplicar) {
        return {
          impacto: false,
          critico: false,
          objetivoDerrotado: false,
          efectos: [],
        };
      }
      const preparadas = prepararEfectosHabilidad({
        lanzador: jugador,
        objetivo,
        efectosConfigurados: zona.contenido.efectos,
        idEjecucion: `balance-nube:${instante}:${indiceAplicacion}`,
      });
      const resultados = preparadas.map((preparada) =>
        sistemaEfectos.aplicar(preparada.definicion, {
          obtenerTiradaAplicacion: () => 1,
        }),
      );
      for (const resultado of resultados) {
        eventos.push(...(resultado.eventos ?? []));
      }
      registrarInstancias();
      return {
        impacto: true,
        critico: false,
        objetivoDerrotado: false,
        efectos: resultados,
      };
    },
  });
  sistemaZonas.crear({
    idEjecucion: "balance-nube-zona",
    idHabilidad: habilidad.id,
    nombre: habilidad.nombre,
    grado: 1,
    fuente: jugador,
    hostil: true,
    casillas: posiciones.slice(0, cantidadObjetivos),
    configuracion: grado.zonaTemporal,
    contenido: {
      danio: grado.danio,
      efectos: grado.efectos,
    },
    contextoDanioHabilidad: null,
  });
  registrarInstancias();

  while (true) {
    const siguienteEfecto = sistemaEfectos.obtenerSiguienteInstante();
    const siguienteZona = sistemaZonas.obtenerSiguienteInstante();
    const candidatos = [siguienteEfecto, siguienteZona].filter(Number.isFinite);
    if (candidatos.length === 0) break;
    const siguiente = Math.min(...candidatos);
    tiempoActual = siguiente;
    if (sistemaEfectos.obtenerSiguienteInstante() === siguiente) {
      const resultado = sistemaEfectos.procesarEventosEn(siguiente);
      eventos.push(...resultado.eventos);
      registrarInstancias();
    }
    if (sistemaZonas.obtenerSiguienteInstante() === siguiente) {
      const resultado = sistemaZonas.procesarEventosEn(siguiente);
      eventos.push(...(resultado.eventos ?? []));
      registrarInstancias();
    }
  }

  const ticks = eventos.filter(
    (evento) => evento.tipo === "danio_periodico_aplicado",
  );
  const danioPeriodico = ticks.reduce(
    (total, evento) => total + (evento.danio ?? 0),
    0,
  );
  sistemaZonas.destruir();
  sistemaEfectos.destruir();
  return {
    cantidadObjetivos,
    aplicacionesConsumidas: indiceAplicacion,
    danioPeriodico,
    ticks: ticks.length,
    ultimoInstante: tiempoActual,
    maximoInstanciasPorObjetivo,
  };
}

function probarEntradaTardiaZona({
  configuracionPersonaje,
  configuracionObjetos,
  habilidad,
  grado,
  escenarioPotencia,
  nivel,
}) {
  const jugador = crearJugadorPrueba({
    configuracionPersonaje,
    idProfesion: "mago",
    nivel,
  });
  equiparEscenarioPotencia({
    jugador,
    configuracionObjetos,
    escenario: escenarioPotencia,
  });
  const objetivo = crearObjetivoPrueba({ nivel });
  objetivo.x = 0;
  objetivo.y = 0;
  const mapa = Array.from({ length: 5 }, () => Array(5).fill("."));
  let tiempoActual = 0;
  const sistemaEfectos = new SistemaEfectosTemporales({
    obtenerTiempoActual: () => tiempoActual,
  });
  let aplicaciones = 0;
  const sistemaEspacial = new SistemaEspacial({
    mapa,
    obtenerEntidades: () => [objetivo],
  });
  const sistemaZonas = new SistemaZonasTemporales({
    mapa,
    sistemaEspacial,
    obtenerTiempoActual: () => tiempoActual,
    obtenerActores: () => [objetivo],
    esObjetivoValido: () => true,
    aplicarContenido: ({ zona, objetivo: destino, instante }) => {
      aplicaciones += 1;
      const preparadas = prepararEfectosHabilidad({
        lanzador: jugador,
        objetivo: destino,
        efectosConfigurados: zona.contenido.efectos,
        idEjecucion: `balance-nube-entrada:${instante}`,
      });
      for (const preparada of preparadas) {
        sistemaEfectos.aplicar(preparada.definicion, {
          obtenerTiradaAplicacion: () => 1,
        });
      }
      return {
        impacto: true,
        critico: false,
        objetivoDerrotado: false,
        efectos: preparadas,
      };
    },
  });
  sistemaZonas.crear({
    idEjecucion: "balance-nube-entrada",
    idHabilidad: habilidad.id,
    nombre: habilidad.nombre,
    grado: 1,
    fuente: jugador,
    hostil: true,
    casillas: [{ x: 2, y: 2 }],
    configuracion: grado.zonaTemporal,
    contenido: { danio: grado.danio, efectos: grado.efectos },
  });
  tiempoActual = 150;
  const resultado = sistemaZonas.procesarMovimiento({
    actor: objetivo,
    origen: { x: 0, y: 0 },
    destino: { x: 2, y: 2 },
  });
  objetivo.x = 2;
  objetivo.y = 2;
  const aplicoAlEntrar =
    aplicaciones === 1 &&
    resultado.eventos.some(
      (evento) => evento.tipo === "actor_entro_zona_temporal",
    ) &&
    sistemaEfectos.obtenerEfectosObjetivo(objetivo).length === 1;
  sistemaZonas.destruir();
  sistemaEfectos.destruir();
  return {
    instanteEntrada: 150,
    aplicaciones,
    aplicoAlEntrar,
  };
}

function simularManaRotacion({
  configuracionPersonaje,
  configuracionObjetos,
  idProfesion,
  nivel,
  escenarioPotencia,
  acciones,
}) {
  const jugador = crearJugadorPrueba({
    configuracionPersonaje,
    idProfesion,
    nivel,
  });
  equiparEscenarioPotencia({
    jugador,
    configuracionObjetos,
    escenario: escenarioPotencia,
  });
  const manaMaximo = jugador.manaMaximo;
  let tiempoActual = 0;
  let siguientePulso = TIEMPO_REFERENCIA;
  let manaGastado = 0;
  let manaRegenerado = 0;
  for (const accion of acciones) {
    const gastado = jugador.gastarMana(accion.costoMana);
    if (!gastado) break;
    manaGastado += accion.costoMana;
    const destino = tiempoActual + accion.costoTemporal;
    while (siguientePulso <= destino) {
      manaRegenerado += jugador.procesarPulsoRegeneracion().manaRecuperado;
      siguientePulso += TIEMPO_REFERENCIA;
    }
    tiempoActual = destino;
  }
  return {
    manaMaximo,
    manaGastado,
    manaRegenerado,
    manaNeto: manaGastado - manaRegenerado,
    manaRestante: jugador.manaActual,
    manaRestantePorcentaje: redondear(
      (jugador.manaActual / manaMaximo) * 100,
    ),
    tiempoTotal: tiempoActual,
  };
}

function crearConclusionesPruebasFocalizadas({
  incinerar,
  rafagaGlacial,
  nubeToxica,
  plagaCorrosiva,
  dobleVarita,
  mana,
}) {
  return {
    resumenFacil: [
      {
        id: "foco_incinerar",
        queSeAnalizo:
          "Incinerar G3 contra grupos y contra el Señor de la Guerra durante tres lanzamientos consecutivos.",
        porQue:
          "El análisis anterior podía sobrevalorarla al multiplicar la Quemadura completa por cada lanzamiento.",
        conclusion: incinerar.conclusion,
        recomendacion: incinerar.recomendacion,
      },
      {
        id: "foco_rafaga",
        queSeAnalizo:
          "Ráfaga glacial G2 y G3, incluyendo su 60% base, resistencia de jefe, bloqueo total y rechazo de reaplicación.",
        porQue:
          "Su valor avanzado proviene de combinar daño moderado con la posibilidad de negar completamente una acción.",
        conclusion: rafagaGlacial.conclusion,
        recomendacion: rafagaGlacial.recomendacion,
      },
      {
        id: "foco_nube",
        queSeAnalizo:
          "Nube tóxica G1 durante toda la vida de la zona, con uno y tres objetivos y entrada tardía.",
        porQue:
          "La tabla anterior contaba la primera aplicación y no toda la zona persistente.",
        conclusion: nubeToxica.conclusion,
        recomendacion: nubeToxica.recomendacion,
      },
      {
        id: "foco_plaga",
        queSeAnalizo:
          "Plaga corrosiva en todos sus grados hasta alcanzar la intensidad máxima.",
        porQue:
          "La primera aplicación no representa su daño sostenido ni su coste de preparación.",
        conclusion: plagaCorrosiva.conclusion,
        recomendacion: plagaCorrosiva.recomendacion,
      },
      {
        id: "foco_doble_varita",
        queSeAnalizo:
          "Bastón y doble varita con los afijos máximos, comparando el daño final real y no solo los puntos de Potencia.",
        porQue:
          "La diferencia de 14–16 puntos parecía alta, pero los multiplicadores finales reducen esa ventaja relativa.",
        conclusion: dobleVarita.conclusion,
        recomendacion: dobleVarita.recomendacion,
      },
      {
        id: "foco_mana",
        queSeAnalizo:
          "Maná gastado, regenerado y restante durante las rotaciones focalizadas.",
        porQue:
          "Una habilidad fuerte puede ser válida si su uso sostenido consume una parte importante de la reserva.",
        conclusion: mana.conclusion,
        recomendacion: mana.recomendacion,
      },
    ],
    decisionRecomendada: {
      aplicarCambiosNumericos: false,
      mantenerValoresActuales: [
        "incinerar",
        "rafaga_glacial",
        "nube_toxica",
        "plaga_corrosiva",
        "dano_habilidad",
        "mana",
      ],
      pendientePruebaInterfaz: [
        "frecuencia y valor táctico del Congelamiento total",
        "alineación real de Incinerar",
        "ocupación real de Nube tóxica",
        "sostenibilidad contra el jefe completo",
      ],
    },
  };
}

function crearReferenciaEnemigoEspecifico({
  configuracionEnemigos,
  configuracionObjetos,
  idPlantilla,
  nivel,
}) {
  const enemigo = crearEnemigo({
    configuracionEnemigos,
    configuracionObjetos,
    idPlantilla,
    nivel,
  });
  return {
    idPlantilla,
    nombre: enemigo.nombre,
    nivel,
    vida: enemigo.vidaMaxima,
    armadura: enemigo.estadisticasDerivadas.armadura ?? 0,
    evasion: enemigo.estadisticasDerivadas.evasion ?? 0,
    resistencias: {
      ...(enemigo.estadisticasDerivadas.resistencias ?? {}),
    },
    resistenciasEfectos: {
      ...(enemigo.estadisticasDerivadas.resistenciasEfectos ?? {}),
    },
    inmunidadesEfectos: [
      ...(enemigo.estadisticasDerivadas.inmunidadesEfectos ?? []),
    ],
  };
}

function obtenerHabilidadRequerida(configuracion, idHabilidad) {
  const habilidad = configuracion.habilidades[idHabilidad];
  if (!habilidad) {
    throw new Error(`No existe la habilidad focalizada "${idHabilidad}".`);
  }
  return habilidad;
}

function obtenerFilaPrincipalHabilidad({ habilidades, idHabilidad, grado }) {
  const fila = habilidades.filasPrincipales.find(
    (candidata) =>
      candidata.idHabilidad === idHabilidad && candidata.grado === grado,
  );
  if (!fila) {
    throw new Error(
      `No existe la fila principal de ${idHabilidad} grado ${grado}.`,
    );
  }
  return fila;
}

function obtenerEscenarioPotencia(potencia, id) {
  const escenario = potencia.filas.find((fila) => fila.id === id);
  if (!escenario) {
    throw new Error(`No existe el escenario de Potencia "${id}".`);
  }
  return escenario;
}

function crearInstantesLanzamiento(cantidad, costoTemporal) {
  return Array.from({ length: cantidad }, (_, indice) => indice * costoTemporal);
}

function contarActivacionesZona(configuracion) {
  let cantidad = configuracion.activadores.includes("al_crear") ? 1 : 0;
  if (
    configuracion.activadores.includes("por_intervalo") &&
    configuracion.intervalo > 0
  ) {
    cantidad += Math.max(
      0,
      Math.ceil(configuracion.duracion / configuracion.intervalo) - 1,
    );
  }
  return cantidad;
}

// Mide los ejes globales mediante instancias reales: Player, equipamiento,
// MotorDanioHabilidad, MotorEfectosHabilidad y SistemaEfectosTemporales.
// No introduce una fórmula paralela ni habilita rarezas que el juego mantiene
// desactivadas; las combinaciones raras se identifican como techo controlado.
function crearInformeEscaladosGlobales({
  configuracionPersonaje,
  configuracionObjetos,
  configuracionGeneracionObjetos,
  configuracionEjecucionHabilidades,
  objetivosBalance,
}) {
  if (!configuracionGeneracionObjetos) {
    return {
      tipoResultado: "escalados_globales_no_disponible",
      determinista: true,
      descripcion:
        "No se recibió el catálogo de rarezas y afijos; se conserva el informe principal sin inventar valores.",
      configuracion: null,
      filas: [],
      afijos: [],
      rarezas: [],
      resumenEjes: resumirEstados([]),
      resumen: resumirEstados([]),
    };
  }

  const configuracion = normalizarConfiguracionEscaladosGlobales(
    objetivosBalance.analisisEscaladosGlobales,
  );
  const referencias = {
    fuego: obtenerReferenciaHabilidadEscalado({
      configuracionEjecucionHabilidades,
      referencia: configuracion.habilidades.fuego,
    }),
    veneno: obtenerReferenciaHabilidadEscalado({
      configuracionEjecucionHabilidades,
      referencia: configuracion.habilidades.veneno,
    }),
    frio: obtenerReferenciaHabilidadEscalado({
      configuracionEjecucionHabilidades,
      referencia: configuracion.habilidades.frio,
    }),
    rayo: obtenerReferenciaHabilidadEscalado({
      configuracionEjecucionHabilidades,
      referencia: configuracion.habilidades.rayo,
    }),
    congelamiento: obtenerReferenciaHabilidadEscalado({
      configuracionEjecucionHabilidades,
      referencia: configuracion.habilidades.congelamiento,
    }),
    aturdimiento: obtenerReferenciaHabilidadEscalado({
      configuracionEjecucionHabilidades,
      referencia: configuracion.habilidades.aturdimiento,
    }),
    supresion: obtenerReferenciaHabilidadEscalado({
      configuracionEjecucionHabilidades,
      referencia: configuracion.habilidades.supresion,
    }),
  };

  const crearMago = (equipo) =>
    crearJugadorConEquipoEscalado({
      configuracionPersonaje,
      configuracionObjetos,
      configuracionGeneracionObjetos,
      configuracion,
      idProfesion: "mago",
      equipo,
    });
  const medirMagia = (equipo, referencia) =>
    medirHabilidadEscalada({
      jugador: crearMago(equipo),
      configuracionEjecucionHabilidades,
      referencia,
    });

  const equipoBaseMagico = crearEquipoBaseMagico(configuracion);
  const fuegoBase = medirMagia(equipoBaseMagico, referencias.fuego);
  const fuegoEnfocado = medirMagia(
    crearEquipoConPrefijo({
      configuracion,
      idPrefijo: "enfocado",
      ranuras: ["arma"],
      rareza: "magico",
    }),
    referencias.fuego,
  );
  const fuegoMistico = medirMagia(
    crearEquipoConPrefijo({
      configuracion,
      idPrefijo: "mistico",
      ranuras: ["arma"],
      rareza: "raro",
    }),
    referencias.fuego,
  );
  const fuegoAfinidad = medirMagia(
    crearEquipoConPrefijo({
      configuracion,
      idPrefijo: "igneo",
      ranuras: ["arma", "collar", "anillo_derecho", "anillo_izquierdo"],
      rareza: "magico",
    }),
    referencias.fuego,
  );
  const fuegoCatalitico = medirMagia(
    crearEquipoConPrefijo({
      configuracion,
      idPrefijo: "catalitico",
      ranuras: ["arma"],
      rareza: "raro",
    }),
    referencias.fuego,
  );
  const fuegoIncandescente = medirMagia(
    crearEquipoConPrefijo({
      configuracion,
      idPrefijo: "incandescente",
      ranuras: ["arma", "collar", "anillo_derecho", "anillo_izquierdo"],
      rareza: "magico",
    }),
    referencias.fuego,
  );

  const magoAfinidadPasiva = crearMago(equipoBaseMagico);
  aprenderPasivaEscalada({
    jugador: magoAfinidadPasiva,
    configuracionEjecucionHabilidades,
    idHabilidad: "afinidad_ignea",
    grado: 1,
  });
  const fuegoAfinidadPasiva = medirHabilidadEscalada({
    jugador: magoAfinidadPasiva,
    configuracionEjecucionHabilidades,
    referencia: referencias.fuego,
  });

  const venenoBase = medirMagia(equipoBaseMagico, referencias.veneno);
  const venenoVirulento = medirMagia(
    crearEquipoConPrefijo({
      configuracion,
      idPrefijo: "virulento",
      ranuras: ["arma", "collar", "anillo_derecho", "anillo_izquierdo"],
      rareza: "magico",
    }),
    referencias.veneno,
  );
  const frioBase = medirMagia(equipoBaseMagico, referencias.frio);
  const frioEntorpecedor = medirMagia(
    crearEquipoConPrefijo({
      configuracion,
      idPrefijo: "entorpecedor",
      ranuras: ["arma", "collar", "anillo_derecho", "anillo_izquierdo"],
      rareza: "magico",
    }),
    referencias.frio,
  );
  const rayoBase = medirMagia(equipoBaseMagico, referencias.rayo);
  const rayoSobrecargado = medirMagia(
    crearEquipoConPrefijo({
      configuracion,
      idPrefijo: "sobrecargado",
      ranuras: ["arma", "collar", "anillo_derecho", "anillo_izquierdo"],
      rareza: "magico",
    }),
    referencias.rayo,
  );
  const congelamientoBase = medirMagia(
    equipoBaseMagico,
    referencias.congelamiento,
  );
  const congelamientoCatalitico = medirMagia(
    crearEquipoConPrefijo({
      configuracion,
      idPrefijo: "catalitico",
      ranuras: ["arma"],
      rareza: "raro",
    }),
    referencias.congelamiento,
  );
  const aturdimientoBase = medirMagia(
    equipoBaseMagico,
    referencias.aturdimiento,
  );
  const aturdimientoCatalitico = medirMagia(
    crearEquipoConPrefijo({
      configuracion,
      idPrefijo: "catalitico",
      ranuras: ["arma"],
      rareza: "raro",
    }),
    referencias.aturdimiento,
  );

  const fisicoBase = medirArmaFisicaEscalada({
    jugador: crearJugadorConEquipoEscalado({
      configuracionPersonaje,
      configuracionObjetos,
      configuracionGeneracionObjetos,
      configuracion,
      idProfesion: "guerrero",
      equipo: crearEquipoFisico(configuracion),
    }),
  });
  const fisicoMarcial = medirArmaFisicaEscalada({
    jugador: crearJugadorConEquipoEscalado({
      configuracionPersonaje,
      configuracionObjetos,
      configuracionGeneracionObjetos,
      configuracion,
      idProfesion: "guerrero",
      equipo: crearEquipoFisico(configuracion, ["marcial"], "raro"),
    }),
  });

  const magoSuprimido = crearMago(equipoBaseMagico);
  const fuegoAntesSupresion = medirHabilidadEscalada({
    jugador: magoSuprimido,
    configuracionEjecucionHabilidades,
    referencia: referencias.fuego,
  });
  const sistemaSupresion = aplicarEfectoTemporalEscalado({
    lanzador: magoSuprimido,
    objetivo: magoSuprimido,
    referencia: referencias.supresion,
  });
  const fuegoConSupresion = medirHabilidadEscalada({
    jugador: magoSuprimido,
    configuracionEjecucionHabilidades,
    referencia: referencias.fuego,
  });
  sistemaSupresion.destruir();

  const techoRaro = medirMagia(
    crearEquipoTechoRaro(configuracion),
    referencias.fuego,
  );

  const filas = [
    crearFilaEscalado({
      id: "dano_fisico_marcial",
      eje: "Daño Físico",
      fuente: "Marcial G3 máximo",
      alcance: "Raro controlado — no generable",
      medida: "Daño físico esperado de Espada de acero templado",
      valorBase: fisicoBase.danioAplicado,
      valorResultado: fisicoMarcial.danioAplicado,
      directoBase: fisicoBase.danioAplicado,
      directoResultado: fisicoMarcial.danioAplicado,
      efectoBase: null,
      efectoResultado: null,
      evaluacion: evaluarCambioEsperado({
        cambioDirecto: calcularVariacionPorcentual(
          fisicoBase.danioAplicado,
          fisicoMarcial.danioAplicado,
        ),
        descripcion:
          "Debe modificar únicamente el componente físico de un arma real.",
      }),
    }),
    crearFilaEscalado({
      id: "dano_magico_mistico",
      eje: "Daño Mágico",
      fuente: "Místico G3 máximo",
      alcance: "Raro controlado — no generable",
      medida: "Daño directo bruto de Incinerar G3",
      valorBase: fuegoBase.directoBruto,
      valorResultado: fuegoMistico.directoBruto,
      directoBase: fuegoBase.directoBruto,
      directoResultado: fuegoMistico.directoBruto,
      efectoBase: fuegoBase.efectoBruto,
      efectoResultado: fuegoMistico.efectoBruto,
      evaluacion: evaluarSeparacionEjes({
        cambioDirecto: calcularVariacionPorcentual(
          fuegoBase.directoBruto,
          fuegoMistico.directoBruto,
        ),
        cambioEfecto: calcularVariacionPorcentual(
          fuegoBase.efectoBruto,
          fuegoMistico.efectoBruto,
        ),
        debeCambiarDirecto: true,
        debeCambiarEfecto: false,
        descripcion:
          "Daño Mágico escala el daño directo elemental y no la Quemadura.",
      }),
    }),
    crearFilaEscalado({
      id: "dano_habilidad_enfocado",
      eje: "Daño de Habilidad",
      fuente: "Enfocado G3 máximo",
      alcance: "Mágico activo — arma",
      medida: "Daño directo bruto de Incinerar G3",
      valorBase: fuegoBase.directoBruto,
      valorResultado: fuegoEnfocado.directoBruto,
      directoBase: fuegoBase.directoBruto,
      directoResultado: fuegoEnfocado.directoBruto,
      efectoBase: fuegoBase.efectoBruto,
      efectoResultado: fuegoEnfocado.efectoBruto,
      evaluacion: evaluarSeparacionEjes({
        cambioDirecto: calcularVariacionPorcentual(
          fuegoBase.directoBruto,
          fuegoEnfocado.directoBruto,
        ),
        cambioEfecto: calcularVariacionPorcentual(
          fuegoBase.efectoBruto,
          fuegoEnfocado.efectoBruto,
        ),
        debeCambiarDirecto: true,
        debeCambiarEfecto: false,
        descripcion:
          "Daño de Habilidad debe ser la capa exterior del daño directo y no tocar efectos.",
      }),
    }),
    crearFilaEscalado({
      id: "afinidad_ignea_pasiva",
      eje: "Afinidad de Fuego",
      fuente: "Afinidad ígnea aprendida",
      alcance: "Pasiva activa",
      medida: "Daño directo bruto de Incinerar G3",
      valorBase: fuegoBase.directoBruto,
      valorResultado: fuegoAfinidadPasiva.directoBruto,
      directoBase: fuegoBase.directoBruto,
      directoResultado: fuegoAfinidadPasiva.directoBruto,
      efectoBase: fuegoBase.efectoBruto,
      efectoResultado: fuegoAfinidadPasiva.efectoBruto,
      evaluacion: evaluarSeparacionEjes({
        cambioDirecto: calcularVariacionPorcentual(
          fuegoBase.directoBruto,
          fuegoAfinidadPasiva.directoBruto,
        ),
        cambioEfecto: calcularVariacionPorcentual(
          fuegoBase.efectoBruto,
          fuegoAfinidadPasiva.efectoBruto,
        ),
        debeCambiarDirecto: true,
        debeCambiarEfecto: false,
        descripcion:
          "La afinidad pasiva suma al daño directo de su elemento y no potencia la Quemadura.",
      }),
    }),
    crearFilaEscalado({
      id: "afinidad_ignea_techo_magico",
      eje: "Afinidad de Fuego",
      fuente: "Ígneo G3 máximo en arma, collar y dos anillos",
      alcance: "Mágico activo — cuatro fuentes",
      medida: "Daño directo bruto de Incinerar G3",
      valorBase: fuegoBase.directoBruto,
      valorResultado: fuegoAfinidad.directoBruto,
      directoBase: fuegoBase.directoBruto,
      directoResultado: fuegoAfinidad.directoBruto,
      efectoBase: fuegoBase.efectoBruto,
      efectoResultado: fuegoAfinidad.efectoBruto,
      evaluacion: combinarEvaluaciones([
        evaluarTechoActivo({
          variacion: calcularVariacionPorcentual(
            fuegoBase.directoBruto,
            fuegoAfinidad.directoBruto,
          ),
          rango: configuracion.limites.afinidadDirecta,
          descripcion:
            "El techo especializado obtenible debe quedar dentro de la banda aprobada de afinidad directa.",
        }),
        evaluarSeparacionEjes({
          cambioDirecto: calcularVariacionPorcentual(
            fuegoBase.directoBruto,
            fuegoAfinidad.directoBruto,
          ),
          cambioEfecto: calcularVariacionPorcentual(
            fuegoBase.efectoBruto,
            fuegoAfinidad.efectoBruto,
          ),
          debeCambiarDirecto: true,
          debeCambiarEfecto: false,
          descripcion:
            "La afinidad acumulada no debe filtrar hacia la potencia de efectos.",
        }),
      ]),
    }),
    crearFilaEscalado({
      id: "potencia_efectos_catalitico",
      eje: "Potencia de Efectos",
      fuente: "Catalítico G3 máximo",
      alcance: "Raro controlado — no generable",
      medida: fuegoCatalitico.medidaEfecto,
      valorBase: fuegoBase.efectoBruto,
      valorResultado: fuegoCatalitico.efectoBruto,
      directoBase: fuegoBase.directoBruto,
      directoResultado: fuegoCatalitico.directoBruto,
      efectoBase: fuegoBase.efectoBruto,
      efectoResultado: fuegoCatalitico.efectoBruto,
      evaluacion: evaluarSeparacionEjes({
        cambioDirecto: calcularVariacionPorcentual(
          fuegoBase.directoBruto,
          fuegoCatalitico.directoBruto,
        ),
        cambioEfecto: calcularVariacionPorcentual(
          fuegoBase.efectoBruto,
          fuegoCatalitico.efectoBruto,
        ),
        debeCambiarDirecto: false,
        debeCambiarEfecto: true,
        descripcion:
          "Potencia de Efectos general sólo debe modificar la magnitud de la Quemadura.",
      }),
    }),
    ...crearFilasPotenciaEspecifica({
      configuracion,
      filas: [
        {
          id: "potencia_quemadura_techo_magico",
          eje: "Potencia de Quemadura",
          fuente: "Incandescente G3 máximo en cuatro fuentes",
          base: fuegoBase,
          resultado: fuegoIncandescente,
        },
        {
          id: "potencia_envenenamiento_techo_magico",
          eje: "Potencia de Envenenamiento",
          fuente: "Virulento G3 máximo en cuatro fuentes",
          base: venenoBase,
          resultado: venenoVirulento,
        },
        {
          id: "potencia_ralentizacion_techo_magico",
          eje: "Potencia de Ralentización",
          fuente: "Entorpecedor G3 máximo en cuatro fuentes",
          base: frioBase,
          resultado: frioEntorpecedor,
        },
        {
          id: "potencia_electrizacion_techo_magico",
          eje: "Potencia de Electrización",
          fuente: "Sobrecargado G3 máximo en cuatro fuentes",
          base: rayoBase,
          resultado: rayoSobrecargado,
        },
      ],
    }),
    crearFilaEscalado({
      id: "potencia_congelamiento_binario",
      eje: "Potencia de Efectos",
      fuente: "Catalítico G3 máximo",
      alcance: "Raro controlado — no generable",
      medida: "Duración de Congelamiento de Ráfaga glacial G3",
      valorBase: congelamientoBase.duracionEfecto,
      valorResultado: congelamientoCatalitico.duracionEfecto,
      directoBase: congelamientoBase.directoBruto,
      directoResultado: congelamientoCatalitico.directoBruto,
      efectoBase: congelamientoBase.duracionEfecto,
      efectoResultado: congelamientoCatalitico.duracionEfecto,
      evaluacion: evaluarSeparacionEjes({
        cambioDirecto: calcularVariacionPorcentual(
          congelamientoBase.directoBruto,
          congelamientoCatalitico.directoBruto,
        ),
        cambioEfecto: calcularVariacionPorcentual(
          congelamientoBase.duracionEfecto,
          congelamientoCatalitico.duracionEfecto,
        ),
        debeCambiarDirecto: false,
        debeCambiarEfecto: false,
        descripcion:
          "Congelamiento es binario: Potencia de Efectos no debe cambiar su duración ni el daño directo.",
      }),
    }),
    crearFilaEscalado({
      id: "potencia_aturdimiento_binario",
      eje: "Potencia de Efectos",
      fuente: "Catalítico G3 máximo",
      alcance: "Raro controlado — no generable",
      medida: "Duración de Aturdimiento de Descarga fulminante G3",
      valorBase: aturdimientoBase.duracionEfecto,
      valorResultado: aturdimientoCatalitico.duracionEfecto,
      directoBase: aturdimientoBase.directoBruto,
      directoResultado: aturdimientoCatalitico.directoBruto,
      efectoBase: aturdimientoBase.duracionEfecto,
      efectoResultado: aturdimientoCatalitico.duracionEfecto,
      evaluacion: evaluarSeparacionEjes({
        cambioDirecto: calcularVariacionPorcentual(
          aturdimientoBase.directoBruto,
          aturdimientoCatalitico.directoBruto,
        ),
        cambioEfecto: calcularVariacionPorcentual(
          aturdimientoBase.duracionEfecto,
          aturdimientoCatalitico.duracionEfecto,
        ),
        debeCambiarDirecto: false,
        debeCambiarEfecto: false,
        descripcion:
          "Aturdimiento es binario: Potencia de Efectos no debe cambiar su duración ni el daño directo.",
      }),
    }),
    crearFilaEscalado({
      id: "maldicion_supresion_temporal",
      eje: "Modificadores temporales",
      fuente: "Supresión G3 aplicada por SistemaEfectosTemporales",
      alcance: "Maldición activa",
      medida: "Daño directo bruto de Incinerar G3",
      valorBase: fuegoAntesSupresion.directoBruto,
      valorResultado: fuegoConSupresion.directoBruto,
      directoBase: fuegoAntesSupresion.directoBruto,
      directoResultado: fuegoConSupresion.directoBruto,
      efectoBase: fuegoAntesSupresion.efectoBruto,
      efectoResultado: fuegoConSupresion.efectoBruto,
      evaluacion: evaluarCambioEsperado({
        cambioDirecto: calcularVariacionPorcentual(
          fuegoAntesSupresion.directoBruto,
          fuegoConSupresion.directoBruto,
        ),
        cambioEfecto: calcularVariacionPorcentual(
          fuegoAntesSupresion.efectoBruto,
          fuegoConSupresion.efectoBruto,
        ),
        debeSerNegativo: true,
        descripcion:
          "La maldición temporal debe reducir Daño de Habilidad y Potencia de Efectos mientras está vigente.",
      }),
    }),
    crearFilaEscalado({
      id: "techo_raro_controlado",
      eje: "Techo combinado",
      fuente: "Místico + Enfocado + afinidad + Catalítico + potencia específica",
      alcance: "Raro controlado — no generable",
      medida: "Daño directo bruto de Incinerar G3",
      valorBase: fuegoBase.directoBruto,
      valorResultado: techoRaro.directoBruto,
      directoBase: fuegoBase.directoBruto,
      directoResultado: techoRaro.directoBruto,
      efectoBase: fuegoBase.efectoBruto,
      efectoResultado: techoRaro.efectoBruto,
      evaluacion: {
        estado: ESTADOS.INFORMATIVO,
        criterio:
          "Techo futuro deliberadamente medido sin activar Raro; sirve como límite de diseño y no como resultado del botín actual.",
      },
    }),
  ];
  const disponibilidad = crearInformeDisponibilidadAfijosEscalados({
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracion,
  });

  return {
    tipoResultado: "escalados_globales_motores_y_generador_canonicos",
    determinista: true,
    descripcion:
      "Cada comparación crea un jugador, equipa objetos reales y resuelve daño o efectos con los motores canónicos. Las muestras de frecuencia usan el generador real con semilla fija.",
    configuracion: {
      nivelReferencia: configuracion.nivelReferencia,
      nivelObjeto: configuracion.nivelObjeto,
      muestrasGeneracion: configuracion.muestrasGeneracion,
      limites: copiarDatosBalance(configuracion.limites),
    },
    filas,
    afijos: disponibilidad.afijos,
    rarezas: disponibilidad.rarezas,
    resumenEjes: resumirEstados(filas),
    resumen: resumirEstados([
      ...filas,
      ...disponibilidad.afijos,
      ...disponibilidad.rarezas,
    ]),
  };
}

function normalizarConfiguracionEscaladosGlobales(configuracion = {}) {
  const referencias = configuracion.referencias ?? {};
  return {
    nivelReferencia: numeroEnteroPositivo(
      configuracion.nivelReferencia,
      10,
    ),
    nivelObjeto: numeroEnteroPositivo(configuracion.nivelObjeto, 10),
    muestrasGeneracion: numeroEnteroPositivo(
      configuracion.muestrasGeneracion,
      2000,
    ),
    semillaGeneracion:
      typeof configuracion.semillaGeneracion === "string" &&
      configuracion.semillaGeneracion.trim() !== ""
        ? configuracion.semillaGeneracion.trim()
        : "balance-escalados-globales-v1",
    limites: {
      afinidadDirecta: normalizarRangoEscalado(
        configuracion.limites?.afinidadDirecta,
        { minimo: 40, maximo: 50 },
      ),
      potenciaEfecto: normalizarRangoEscalado(
        configuracion.limites?.potenciaEfecto,
        { minimo: 45, maximo: 55 },
      ),
    },
    objetos: {
      armaFisica: referencias.armaFisica ?? "espada_acero_templado",
      armaMagica: referencias.armaMagica ?? "baston_maestro",
      collar: referencias.collar ?? "collar_rubi_magistral",
      anillo: referencias.anillo ?? "anillo_rubi_magistral",
    },
    habilidades: {
      fuego: referencias.fuego ?? {
        idHabilidad: "incinerar",
        grado: 3,
        idEfecto: "quemadura",
      },
      veneno: referencias.veneno ?? {
        idHabilidad: "aguijon_toxico",
        grado: 4,
        idEfecto: "envenenamiento",
      },
      frio: referencias.frio ?? {
        idHabilidad: "esquirla_hielo",
        grado: 4,
        idEfecto: "ralentizacion",
      },
      rayo: referencias.rayo ?? {
        idHabilidad: "chispa",
        grado: 4,
        idEfecto: "electrizacion",
      },
      congelamiento: referencias.congelamiento ?? {
        idHabilidad: "rafaga_glacial",
        grado: 3,
        idEfecto: "congelamiento",
      },
      aturdimiento: referencias.aturdimiento ?? {
        idHabilidad: "descarga_fulminante",
        grado: 3,
        idEfecto: "aturdimiento",
      },
      supresion: referencias.supresion ?? {
        idHabilidad: "supresion",
        grado: 3,
        idEfecto: "supresion",
      },
    },
  };
}

function numeroEnteroPositivo(valor, respaldo) {
  return Number.isInteger(valor) && valor > 0 ? valor : respaldo;
}

function normalizarRangoEscalado(rango, respaldo) {
  const minimo = Number.isFinite(rango?.minimo) ? rango.minimo : respaldo.minimo;
  const maximo = Number.isFinite(rango?.maximo) ? rango.maximo : respaldo.maximo;
  if (maximo < minimo) return { ...respaldo };
  return { minimo, maximo };
}

function obtenerReferenciaHabilidadEscalado({
  configuracionEjecucionHabilidades,
  referencia,
}) {
  const idHabilidad = String(referencia?.idHabilidad ?? "").trim().toLowerCase();
  const grado = referencia?.grado;
  const habilidad = configuracionEjecucionHabilidades.habilidades[idHabilidad];
  const configuracionGrado = habilidad?.ejecucion?.grados?.[grado];
  if (!habilidad || !configuracionGrado) {
    throw new Error(
      `La referencia de escalado ${idHabilidad}:g${grado} no es una habilidad activa válida.`,
    );
  }
  return {
    idHabilidad,
    habilidad,
    grado: Number(grado),
    configuracionGrado,
    idEfecto: referencia.idEfecto ?? null,
  };
}

function crearEquipoBaseMagico(configuracion) {
  return [{ ranura: "arma", idObjeto: configuracion.objetos.armaMagica }];
}

function crearEquipoFisico(configuracion, prefijos = [], rareza = "comun") {
  return [
    {
      ranura: "arma",
      idObjeto: configuracion.objetos.armaFisica,
      prefijos,
      rareza,
    },
  ];
}

function crearEquipoConPrefijo({ configuracion, idPrefijo, ranuras, rareza }) {
  const idsPorRanura = {
    arma: configuracion.objetos.armaMagica,
    collar: configuracion.objetos.collar,
    anillo_derecho: configuracion.objetos.anillo,
    anillo_izquierdo: configuracion.objetos.anillo,
  };
  return ranuras.map((ranura) => ({
    ranura,
    idObjeto: idsPorRanura[ranura],
    prefijos: [idPrefijo],
    rareza,
  }));
}

function crearEquipoTechoRaro(configuracion) {
  return [
    {
      ranura: "arma",
      idObjeto: configuracion.objetos.armaMagica,
      rareza: "raro",
      prefijos: ["mistico", "enfocado", "igneo"],
    },
    ...["collar", "anillo_derecho", "anillo_izquierdo"].map((ranura) => ({
      ranura,
      idObjeto:
        ranura === "collar"
          ? configuracion.objetos.collar
          : configuracion.objetos.anillo,
      rareza: "raro",
      prefijos: ["igneo", "catalitico", "incandescente"],
    })),
  ];
}

function crearJugadorConEquipoEscalado({
  configuracionPersonaje,
  configuracionObjetos,
  configuracionGeneracionObjetos,
  configuracion,
  idProfesion,
  equipo,
}) {
  const jugador = crearJugadorPrueba({
    configuracionPersonaje,
    idProfesion,
    nivel: configuracion.nivelReferencia,
  });
  for (const entrada of equipo) {
    const prefijos = (entrada.prefijos ?? []).map((idAfijo) =>
      crearInstanciaAfijoMaxima({
        configuracionGeneracionObjetos,
        idAfijo,
        nivelObjeto: configuracion.nivelObjeto,
      }),
    );
    const objeto = crearObjeto({
      configuracionObjetos,
      idObjeto: entrada.idObjeto,
      rareza: prefijos.length > 0 ? entrada.rareza ?? "magico" : "comun",
      nivelObjeto: configuracion.nivelObjeto,
      prefijos,
    });
    jugador.equipamiento.equiparEnRanura(entrada.ranura, objeto);
  }
  return jugador;
}

function crearInstanciaAfijoMaxima({
  configuracionGeneracionObjetos,
  idAfijo,
  nivelObjeto,
}) {
  const idNormalizado = String(idAfijo).trim().toLowerCase();
  const afijo = configuracionGeneracionObjetos.prefijos[idNormalizado];
  if (!afijo) throw new Error(`No existe el prefijo de escalado "${idNormalizado}".`);
  const grado = [...(afijo.grados ?? [])]
    .filter((actual) => actual.nivelObjetoMinimo <= nivelObjeto)
    .sort((a, b) => a.grado - b.grado)
    .at(-1);
  if (!grado) {
    throw new Error(
      `El prefijo "${idNormalizado}" no tiene un grado disponible para nivel ${nivelObjeto}.`,
    );
  }
  return {
    id: idNormalizado,
    nombre: afijo.nombre,
    tipoAfijo: afijo.tipoAfijo,
    descripcion: afijo.descripcion,
    grupoExclusion: afijo.grupoExclusion,
    grado: grado.grado,
    nivelObjetoMinimo: grado.nivelObjetoMinimo,
    efectos: copiarDatosBalance(afijo.efectos),
    valores: Object.fromEntries(
      Object.entries(grado.valores).map(([propiedad, rango]) => [
        propiedad,
        rango.maximo,
      ]),
    ),
  };
}

function aprenderPasivaEscalada({
  jugador,
  configuracionEjecucionHabilidades,
  idHabilidad,
  grado,
}) {
  const habilidad = configuracionEjecucionHabilidades.habilidades[idHabilidad];
  if (!habilidad || habilidad.tipo !== "pasiva") {
    throw new Error(`La pasiva de escalado "${idHabilidad}" no existe.`);
  }
  const estado = jugador.exportarProgresoHabilidades();
  const maestria = estado.maestrias[habilidad.maestria];
  if (!maestria) {
    throw new Error(
      `El perfil de balance no dispone de la maestría "${habilidad.maestria}".`,
    );
  }
  maestria.nivel = Math.max(maestria.nivel, habilidad.requisitoNivelMaestria);
  maestria.experiencia = 0;
  maestria.experienciaTotal = 0;
  estado.gradosHabilidades[idHabilidad] = grado;
  jugador.restaurarProgresoHabilidades(estado);
}

function medirArmaFisicaEscalada({ jugador }) {
  const estadisticas = jugador.estadisticasDerivadas;
  const objetivo = crearObjetivoPrueba({ nivel: jugador.nivel });
  const danioAplicado = estadisticas.danioFisico.componentes.reduce(
    (total, fuente) =>
      total +
      promedioDanioFuente({
        fuente,
        estadisticasDanio: estadisticas.danioFisico,
        objetivo,
        critico: false,
      }),
    0,
  );
  return { danioAplicado: redondear(danioAplicado) };
}

function medirHabilidadEscalada({
  jugador,
  configuracionEjecucionHabilidades,
  referencia,
}) {
  const objetivoDirecto = crearObjetivoPrueba({ nivel: jugador.nivel });
  let directo;
  let preparados;
  try {
    configurarTiradasDeterministasHabilidad({
      impacto: [1],
      critico: [100],
      efecto: [1],
    });
    directo = resolverDanioHabilidad({
      lanzador: jugador,
      objetivo: objetivoDirecto,
      componentesConfigurados: referencia.configuracionGrado.danio,
      idEjecucion: `balance-escalados:${referencia.idHabilidad}:g${referencia.grado}`,
      resolverImpacto: true,
      resolverCritico: true,
    });
    preparados = prepararEfectosHabilidad({
      lanzador: jugador,
      objetivo: crearObjetivoPrueba({ nivel: jugador.nivel }),
      efectosConfigurados: referencia.configuracionGrado.efectos,
      idEjecucion: `balance-escalados:${referencia.idHabilidad}:g${referencia.grado}:efecto`,
    });
  } finally {
    restaurarTiradasAleatoriasHabilidad();
  }
  const preparado = preparados.find(
    (actual) => actual.idEfecto === referencia.idEfecto,
  );
  const efecto = preparado
    ? medirEfectoPreparadoEscalado(preparado)
    : { medida: "Sin efecto", bruto: null, aplicado: null };
  return {
    directoBruto: redondear(
      directo.componentes.reduce(
        (total, componente) => total + componente.danioBruto,
        0,
      ),
    ),
    directoAplicado: redondear(directo.danioFinal),
    efectoBruto: efecto.bruto === null ? null : redondear(efecto.bruto),
    efectoAplicado:
      efecto.aplicado === null ? null : redondear(efecto.aplicado),
    medidaEfecto: efecto.medida,
    operacionEfecto: efecto.operacion,
    duracionEfecto: preparado?.definicion?.duracion ?? null,
  };
}

function medirEfectoPreparadoEscalado(preparado) {
  const definicion = preparado.definicion;
  const objetivo = definicion.objetivo;
  const sistema = new SistemaEfectosTemporales({
    obtenerTiempoActual: () => 0,
  });
  try {
    const aplicacion = sistema.aplicar(definicion, {
      obtenerTiradaAplicacion: () => 1,
    });
    if (!aplicacion.aplicado) {
      throw new Error(
        `No se pudo aplicar ${preparado.nombreEfecto} durante la medición de escalados.`,
      );
    }
    if (Array.isArray(definicion.componentesDanio)) {
      const bruto = definicion.componentesDanio.reduce(
        (total, componente) => total + componente.danioBruto,
        0,
      );
      const instante = definicion.intervalo ?? 1;
      const tick = sistema.procesarEventosEn(instante).eventos.find(
        (evento) => evento.tipo === "danio_periodico_aplicado",
      );
      return {
        medida: `Daño periódico por tick de ${preparado.nombreEfecto}`,
        bruto,
        aplicado: tick?.danio ?? tick?.danioCalculado ?? null,
        operacion: null,
      };
    }
    const activo = sistema.obtenerEfectosObjetivo(objetivo)[0];
    if (Array.isArray(activo?.modificadores) && activo.modificadores.length > 0) {
      return {
        medida: `Magnitud de ${preparado.nombreEfecto}`,
        bruto: activo.modificadores[0].valor,
        aplicado: activo.modificadores[0].valor,
        operacion: activo.modificadores[0].operacion,
      };
    }
    return {
      medida: `Valor de ${preparado.nombreEfecto}`,
      bruto: activo?.valor ?? definicion.valor ?? null,
      aplicado: activo?.valor ?? definicion.valor ?? null,
      operacion: null,
    };
  } finally {
    sistema.destruir();
  }
}

function aplicarEfectoTemporalEscalado({ lanzador, objetivo, referencia }) {
  const preparado = prepararEfectosHabilidad({
    lanzador,
    objetivo,
    efectosConfigurados: referencia.configuracionGrado.efectos,
    idEjecucion: `balance-escalados:${referencia.idHabilidad}:g${referencia.grado}:temporal`,
  }).find((actual) => actual.idEfecto === referencia.idEfecto);
  if (!preparado) {
    throw new Error(
      `La habilidad ${referencia.idHabilidad} no prepara ${referencia.idEfecto}.`,
    );
  }
  const sistema = new SistemaEfectosTemporales({ obtenerTiempoActual: () => 0 });
  const resultado = sistema.aplicar(preparado.definicion, {
    obtenerTiradaAplicacion: () => 1,
  });
  if (!resultado.aplicado) {
    sistema.destruir();
    throw new Error(`No se pudo aplicar ${referencia.idEfecto} en la medición temporal.`);
  }
  return sistema;
}

function crearFilasPotenciaEspecifica({ configuracion, filas }) {
  return filas.map(({ id, eje, fuente, base, resultado }) => {
    const variacionEvaluadaPorcentual = calcularVariacionPotenciaEfecto({
      base: base.efectoBruto,
      resultado: resultado.efectoBruto,
      operacion: resultado.operacionEfecto ?? base.operacionEfecto,
    });
    const usaReferenciaNeutra =
      (resultado.operacionEfecto ?? base.operacionEfecto) === "multiplicar";
    return crearFilaEscalado({
      id,
      eje,
      fuente,
      alcance: "Mágico activo — cuatro fuentes",
      medida: resultado.medidaEfecto,
      valorBase: base.efectoBruto,
      valorResultado: resultado.efectoBruto,
      directoBase: base.directoBruto,
      directoResultado: resultado.directoBruto,
      efectoBase: base.efectoBruto,
      efectoResultado: resultado.efectoBruto,
      variacionEvaluadaPorcentual,
      descripcionVariacionEvaluada: usaReferenciaNeutra
        ? "Fuerza del control respecto del neutro ×1"
        : "Magnitud del efecto",
      evaluacion: combinarEvaluaciones([
        evaluarTechoActivo({
          variacion: variacionEvaluadaPorcentual,
          rango: configuracion.limites.potenciaEfecto,
          descripcion:
            usaReferenciaNeutra
              ? "El techo especializado obtenible debe quedar dentro de la banda aprobada de potencia específica; los modificadores multiplicativos se comparan por su distancia desde ×1."
              : "El techo especializado obtenible debe quedar dentro de la banda aprobada de potencia específica.",
        }),
        evaluarSeparacionEjes({
          cambioDirecto: calcularVariacionPorcentual(
            base.directoBruto,
            resultado.directoBruto,
          ),
          cambioEfecto: calcularVariacionPorcentual(
            base.efectoBruto,
            resultado.efectoBruto,
          ),
          debeCambiarDirecto: false,
          debeCambiarEfecto: true,
          descripcion:
            "La potencia específica debe afectar sólo su efecto y no el daño directo de la habilidad.",
        }),
      ]),
    });
  });
}

function crearFilaEscalado({
  id,
  eje,
  fuente,
  alcance,
  medida,
  valorBase,
  valorResultado,
  directoBase,
  directoResultado,
  efectoBase,
  efectoResultado,
  variacionEvaluadaPorcentual = null,
  descripcionVariacionEvaluada = null,
  evaluacion,
}) {
  const variacionPorcentual = calcularVariacionPorcentual(
    valorBase,
    valorResultado,
  );
  return {
    id,
    eje,
    fuente,
    alcance,
    medida,
    valorBase: valorBase === null ? null : redondear(valorBase),
    valorResultado: valorResultado === null ? null : redondear(valorResultado),
    variacionPorcentual,
    variacionEvaluadaPorcentual:
      variacionEvaluadaPorcentual ?? variacionPorcentual,
    descripcionVariacionEvaluada,
    directoBase: directoBase === null ? null : redondear(directoBase),
    directoResultado:
      directoResultado === null ? null : redondear(directoResultado),
    efectoBase: efectoBase === null ? null : redondear(efectoBase),
    efectoResultado:
      efectoResultado === null ? null : redondear(efectoResultado),
    criterio: evaluacion.criterio,
    estado: evaluacion.estado,
  };
}

function calcularVariacionPotenciaEfecto({ base, resultado, operacion }) {
  if (operacion === "multiplicar" && base > 1 && resultado > 1) {
    return calcularVariacionPorcentual(base - 1, resultado - 1);
  }
  return calcularVariacionPorcentual(base, resultado);
}

function calcularVariacionPorcentual(base, resultado) {
  if (!Number.isFinite(base) || !Number.isFinite(resultado) || base === 0) {
    return null;
  }
  return redondear(((resultado - base) / Math.abs(base)) * 100);
}

function evaluarCambioEsperado({
  cambioDirecto,
  cambioEfecto = null,
  debeSerNegativo = false,
  descripcion,
}) {
  const directoCorrecto = Number.isFinite(cambioDirecto) &&
    (debeSerNegativo ? cambioDirecto < 0 : cambioDirecto > 0);
  const efectoCorrecto = cambioEfecto === null ||
    (debeSerNegativo ? cambioEfecto < 0 : true);
  return {
    estado: directoCorrecto && efectoCorrecto ? ESTADOS.CORRECTO : ESTADOS.INCORRECTO,
    criterio: descripcion,
  };
}

function evaluarSeparacionEjes({
  cambioDirecto,
  cambioEfecto,
  debeCambiarDirecto,
  debeCambiarEfecto,
  descripcion,
}) {
  const directoCorrecto = debeCambiarDirecto
    ? Number.isFinite(cambioDirecto) && Math.abs(cambioDirecto) > 0.01
    : cambioDirecto === null || Math.abs(cambioDirecto) <= 0.01;
  const efectoCorrecto = debeCambiarEfecto
    ? Number.isFinite(cambioEfecto) && Math.abs(cambioEfecto) > 0.01
    : cambioEfecto === null || Math.abs(cambioEfecto) <= 0.01;
  return {
    estado: directoCorrecto && efectoCorrecto ? ESTADOS.CORRECTO : ESTADOS.INCORRECTO,
    criterio: descripcion,
  };
}

function evaluarTechoActivo({ variacion, rango, descripcion }) {
  const dentro = Number.isFinite(variacion) &&
    variacion >= rango.minimo &&
    variacion <= rango.maximo;
  const cerca = Number.isFinite(variacion) &&
    variacion >= rango.minimo - 5 &&
    variacion <= rango.maximo + 5;
  return {
    estado: dentro
      ? ESTADOS.CORRECTO
      : cerca
        ? ESTADOS.ADVERTENCIA
        : ESTADOS.INCORRECTO,
    criterio: `${descripcion} Objetivo: +${rango.minimo} % a +${rango.maximo} %; resultado: ${variacion ?? "—"} %.`,
  };
}

function combinarEvaluaciones(evaluaciones) {
  const estados = evaluaciones.map((evaluacion) => evaluacion.estado);
  return {
    estado: estados.includes(ESTADOS.INCORRECTO)
      ? ESTADOS.INCORRECTO
      : estados.includes(ESTADOS.ADVERTENCIA)
        ? ESTADOS.ADVERTENCIA
        : ESTADOS.CORRECTO,
    criterio: evaluaciones.map((evaluacion) => evaluacion.criterio).join(" "),
  };
}

function crearInformeDisponibilidadAfijosEscalados({
  configuracionObjetos,
  configuracionGeneracionObjetos,
  configuracion,
}) {
  const perfiles = [
    { id: configuracion.objetos.armaMagica, etiqueta: "Bastón maestro" },
    { id: configuracion.objetos.collar, etiqueta: "Collar magistral" },
  ];
  const conteos = Object.fromEntries(
    perfiles.map((perfil) => [
      perfil.id,
      {
        rarezas: {},
        prefijos: Object.fromEntries(
          PREFIJOS_ESCALADOS_GLOBALES.map((id) => [id, 0]),
        ),
      },
    ]),
  );
  for (const perfil of perfiles) {
    const aleatorio = crearGeneradorAleatorio(
      `${configuracion.semillaGeneracion}:${perfil.id}`,
    );
    for (
      let indice = 0;
      indice < configuracion.muestrasGeneracion;
      indice += 1
    ) {
      const objeto = crearObjetoGenerado({
        configuracionObjetos,
        configuracionGeneracionObjetos,
        idObjeto: perfil.id,
        nivelObjeto: configuracion.nivelObjeto,
        nivelProgreso: configuracion.nivelReferencia,
        aleatorio,
      });
      conteos[perfil.id].rarezas[objeto.rareza] =
        (conteos[perfil.id].rarezas[objeto.rareza] ?? 0) + 1;
      for (const afijo of objeto.prefijos ?? []) {
        if (Object.hasOwn(conteos[perfil.id].prefijos, afijo.id)) {
          conteos[perfil.id].prefijos[afijo.id] += 1;
        }
      }
    }
  }

  const rarezasActivas = new Set(
    Object.entries(configuracionGeneracionObjetos.rarezas)
      .filter(([, rareza]) => rareza.generacionHabilitada === true)
      .map(([idRareza]) => idRareza),
  );
  const afijos = PREFIJOS_ESCALADOS_GLOBALES.map((idAfijo) => {
    const afijo = configuracionGeneracionObjetos.prefijos[idAfijo];
    const rarasPermitidas = [...(afijo?.rarezasPermitidas ?? [])];
    const esObtenible = rarasPermitidas.some((idRareza) =>
      rarezasActivas.has(idRareza),
    );
    const tasas = perfiles.map((perfil) =>
      redondear(
        (conteos[perfil.id].prefijos[idAfijo] /
          configuracion.muestrasGeneracion) *
          100,
      ),
    );
    return {
      idAfijo,
      afijo: afijo?.nombre ?? idAfijo,
      pesoBase: afijo?.pesoBase ?? 0,
      rarezasPermitidas: rarasPermitidas,
      generableAhora: esObtenible,
      tasaArma: tasas[0],
      tasaAccesorio: tasas[1],
      muestraPorPerfil: configuracion.muestrasGeneracion,
      estado: esObtenible
        ? tasas.some((tasa) => tasa > 0)
          ? ESTADOS.CORRECTO
          : ESTADOS.INCORRECTO
        : ESTADOS.INFORMATIVO,
      criterio: esObtenible
        ? "La frecuencia se obtiene del generador real con rarezas activas, pesos y compatibilidades actuales."
        : "El afijo queda preparado para Raro, pero Raro permanece deshabilitado y su tasa actual debe ser 0 %.",
    };
  });
  const rarezas = perfiles.flatMap((perfil) =>
    Object.entries(configuracionGeneracionObjetos.rarezas).map(
      ([idRareza, rareza]) => {
        const tasa = redondear(
          ((conteos[perfil.id].rarezas[idRareza] ?? 0) /
            configuracion.muestrasGeneracion) *
            100,
        );
        const habilitada = rareza.generacionHabilitada === true;
        return {
          id: `${perfil.id}:${idRareza}`,
          perfil: perfil.etiqueta,
          rareza: rareza.nombre ?? idRareza,
          pesoBase: rareza.pesoBase ?? 0,
          generacionHabilitada: habilitada,
          tasa,
          muestra: configuracion.muestrasGeneracion,
          estado: habilitada
            ? tasa > 0
              ? ESTADOS.CORRECTO
              : ESTADOS.INCORRECTO
            : tasa === 0
              ? ESTADOS.INFORMATIVO
              : ESTADOS.INCORRECTO,
          criterio: habilitada
            ? "La rareza habilitada debe aparecer en la muestra del generador real."
            : "La rareza permanece deshabilitada y su tasa actual debe ser 0 %.",
        };
      },
    ),
  );
  return { afijos, rarezas };
}

function copiarDatosBalance(valor) {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map(copiarDatosBalance);
  return Object.fromEntries(
    Object.entries(valor).map(([clave, contenido]) => [
      clave,
      copiarDatosBalance(contenido),
    ]),
  );
}


function crearConclusiones({
  armas,
  habilidades,
  potencia,
  escaladosGlobales,
  arquetipos,
  pruebasFocalizadas,
}) {
  const armasProblematicas = armas.filas.filter(
    (fila) => fila.estado === ESTADOS.INCORRECTO,
  );
  const armasAdvertencia = armas.filas.filter(
    (fila) => fila.estado === ESTADOS.ADVERTENCIA,
  );
  const habilidadesProblematicas = habilidades.filasPrincipales.filter(
    (fila) => fila.estado === ESTADOS.INCORRECTO,
  );
  const habilidadesAdvertencia = habilidades.filasPrincipales.filter(
    (fila) => fila.estado === ESTADOS.ADVERTENCIA,
  );
  const potenciaExcesiva = potencia.filas.filter(
    (fila) => fila.estado === ESTADOS.INCORRECTO || fila.estado === ESTADOS.ADVERTENCIA,
  );
  const arquetiposProblematicos = arquetipos.filas.filter(
    (fila) => fila.estado === ESTADOS.INCORRECTO,
  );
  const escaladosProblematicos = escaladosGlobales.filas.filter(
    (fila) => fila.estado === ESTADOS.INCORRECTO,
  );
  const escaladosAdvertencia = escaladosGlobales.filas.filter(
    (fila) => fila.estado === ESTADOS.ADVERTENCIA,
  );
  const disponibilidadGlobalProblematicos = [
    ...escaladosGlobales.afijos,
    ...escaladosGlobales.rarezas,
  ].filter(
    (fila) => fila.estado === ESTADOS.INCORRECTO,
  );

  return {
    resumenFacil: [
      {
        id: "armas_danio",
        queSeAnalizo:
          "Daño esperado, impacto, crítico, tiempo, alcance, Maná y munición de todas las armas y de la doble varita.",
        porQue:
          "Para detectar armas claramente inferiores o superiores dentro de su mismo Tier.",
        conclusion:
          armasProblematicas.length === 0
            ? `No hay armas fuera de la banda extrema. ${armasAdvertencia.length} configuraciones requieren comparación manual por alcance o coste.`
            : `${armasProblematicas.length} configuraciones quedan fuera de la banda extrema y necesitan un ajuste o una explicación táctica suficiente.`,
        recomendacion:
          "Revisar primero las filas marcadas como Incorrecto y después las Advertencias; no cambiar una arma solo por tener menos daño si compensa con alcance o control del riesgo.",
      },
      {
        id: "habilidades_danio",
        queSeAnalizo:
          "Las doce habilidades, todos sus grados, daño directo, periódico, crítico, área, Maná, tiempo y resistencias.",
        porQue:
          "Para comprobar que cada categoría tenga opciones útiles sin que una habilidad domine todas las situaciones.",
        conclusion:
          habilidadesProblematicas.length === 0
            ? `No hay grados fuera de la banda extrema. ${habilidadesAdvertencia.length} grados necesitan revisión por su utilidad especial o área.`
            : `${habilidadesProblematicas.length} grados quedan fuera de la banda extrema frente a sus pares.`,
        recomendacion:
          "No ajustar por daño nominal: revisar el resultado completo con área, efectos y coste de Maná.",
      },
      {
        id: "dano_habilidad",
        queSeAnalizo:
          "Habilidades sin catalizador, con bastón, con doble varita y con el afijo de Potencia máximo disponible.",
        porQue:
          "Para comprobar que especializarse mejore las habilidades sin crear combinaciones excesivas.",
        conclusion:
          potenciaExcesiva.length === 0
            ? "Las combinaciones medidas permanecen dentro de límites normales o de advertencia."
            : `${potenciaExcesiva.length} combinaciones máximas quedan como advertencia por acumulación de afijos en doble varita.`,
        recomendacion:
          "Mantener las reglas canónicas y decidir únicamente si los valores máximos de afijo necesitan un tope o ajuste.",
      },
      {
        id: "escalados_globales",
        queSeAnalizo:
          "Daño Físico, Daño Mágico, Daño de Habilidad, afinidades, Potencia de Efectos, potencias específicas, Supresión y la disponibilidad de sus afijos.",
        porQue:
          "Para confirmar en combate real que cada escala afecta sólo su capa canónica y que los techos activos no exceden la banda aprobada.",
        conclusion:
          escaladosProblematicos.length === 0 &&
          disponibilidadGlobalProblematicos.length === 0
            ? `Los ${escaladosGlobales.filas.length} recorridos canónicos conservan separación de ejes. ${escaladosAdvertencia.length} quedan como advertencia y Raro/Único siguen fuera del botín activo.`
            : `${escaladosProblematicos.length + disponibilidadGlobalProblematicos.length} mediciones de escalado o disponibilidad requieren una decisión antes de cambiar contratos o valores.`,
        recomendacion:
          "Mantener pesos y rarezas mientras las tasas activas se sostengan; revisar únicamente las filas no correctas antes de ampliar el botín o tocar un contrato canónico.",
      },
      {
        id: "arquetipos",
        queSeAnalizo:
          "Rotaciones representativas de Guerrero, Rogue, Mago e híbridos contra uno y tres objetivos.",
        porQue:
          "Para detectar configuraciones inviables o una opción que domine daño individual y grupal al mismo tiempo.",
        conclusion:
          arquetiposProblematicos.length === 0
            ? "Ningún arquetipo queda completamente fuera de la banda amplia de rendimiento."
            : `${arquetiposProblematicos.length} arquetipos quedan fuera de la banda amplia y requieren revisión.`,
        recomendacion:
          "Usar estas rotaciones como señal inicial y confirmar cualquier cambio con pruebas reales de combate antes de modificar números.",
      },
      ...pruebasFocalizadas.conclusiones.resumenFacil,
    ],
    decisionRecomendada: {
      aplicarCambiosAutomaticos: false,
      pruebasFocalizadas:
        pruebasFocalizadas.conclusiones.decisionRecomendada,
      revisarArmas: [...armasProblematicas, ...armasAdvertencia].map(
        (fila) => fila.id,
      ),
      revisarHabilidades: [
        ...habilidadesProblematicas,
        ...habilidadesAdvertencia,
      ].map((fila) => `${fila.idHabilidad}:g${fila.grado}`),
      revisarPotencia: potenciaExcesiva.map((fila) => fila.id),
      revisarEscaladosGlobales: [
        ...escaladosProblematicos,
        ...escaladosAdvertencia,
        ...disponibilidadGlobalProblematicos,
      ].map((fila) => fila.id ?? fila.idAfijo),
      revisarArquetipos: arquetiposProblematicos.map((fila) => fila.id),
    },
  };
}

function crearJugadorPrueba({ configuracionPersonaje, idProfesion, nivel }) {
  const profesion = configuracionPersonaje.profesiones[idProfesion];
  if (!profesion) throw new Error(`No existe la profesión "${idProfesion}".`);
  return new Player({
    nombre: `Balance ${profesion.nombre}`,
    idProfesion,
    clasePersonaje: profesion.nombre,
    nivel,
    atributos: crearPerfilAtributosProfesion({
      configuracionPersonaje,
      idProfesion,
      nivel,
    }),
    estadisticasBase: profesion.estadisticasBase,
    ataqueNatural: profesion.ataqueNatural ?? null,
    capacidadInventario: 0,
    equipamientoInicial: [],
    reglasSuerte: configuracionPersonaje.reglasSuerte,
  });
}

function crearPerfilAtributosProfesion({
  configuracionPersonaje,
  idProfesion,
  nivel,
}) {
  const profesion = configuracionPersonaje.profesiones[idProfesion];
  const atributos = Object.fromEntries(
    configuracionPersonaje.atributos.lista.map(({ id }) => [
      id,
      configuracionPersonaje.atributos.valorMinimo,
    ]),
  );
  const asignados = Object.fromEntries(
    Object.keys(atributos).map((id) => [id, 0]),
  );
  for (
    let punto = 0;
    punto < configuracionPersonaje.atributos.puntosDisponibles;
    punto += 1
  ) {
    const candidatos = configuracionPersonaje.atributos.lista
      .filter(
        ({ id }) =>
          (profesion.pesosAtributos[id] ?? 0) > 0 &&
          atributos[id] < configuracionPersonaje.atributos.valorMaximo,
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
    const elegido = candidatos[0]?.id;
    if (!elegido) throw new Error(`No se pudo crear el perfil de ${idProfesion}.`);
    atributos[elegido] += 1;
    asignados[elegido] += 1;
  }
  const prioritario = Object.entries(profesion.pesosAtributos).sort(
    ([idA, pesoA], [idB, pesoB]) => pesoB - pesoA || idA.localeCompare(idB),
  )[0][0];
  atributos[prioritario] += Math.max(0, nivel - 1);
  return atributos;
}

function equiparEscenarioPotencia({ jugador, configuracionObjetos, escenario }) {
  if (escenario.danoHabilidad <= 0) return;
  const tier = escenario.tier;
  const usaDoble = escenario.id.startsWith("doble_varita");
  const familia = usaDoble ? "varita" : "baston";
  const idBase = Object.keys(configuracionObjetos).find(
    (id) =>
      configuracionObjetos[id].familiaObjeto === familia &&
      configuracionObjetos[id].tierBase === tier,
  );
  if (!idBase) throw new Error(`No existe ${familia} Tier ${tier}.`);
  const plantilla = configuracionObjetos[idBase];
  const potenciaPorObjeto = usaDoble
    ? escenario.danoHabilidad / 2
    : escenario.danoHabilidad;
  const configuracionEscenario = {
    ...configuracionObjetos,
    [idBase]: {
      ...plantilla,
      propiedades: {
        ...plantilla.propiedades,
        danoHabilidad: potenciaPorObjeto,
      },
    },
  };
  const principal = crearObjeto({
    configuracionObjetos: configuracionEscenario,
    idObjeto: idBase,
  });
  jugador.equipamiento.equiparEnRanura("arma", principal);
  if (usaDoble) {
    const secundaria = crearObjeto({
      configuracionObjetos: configuracionEscenario,
      idObjeto: idBase,
    });
    jugador.equipamiento.equiparEnRanura("secundaria", secundaria);
  }
}

function crearObjetivoPrueba({
  nivel,
  armadura = 0,
  evasion = 0,
  resistencias = {},
  resistenciasEfectos = {},
}) {
  let vidaActual = 1_000_000;
  return {
    nombre: "Objetivo de balance",
    nivel,
    get vidaActual() {
      return vidaActual;
    },
    get estaVivo() {
      return vidaActual > 0;
    },
    get estaDestruido() {
      return vidaActual <= 0;
    },
    estadisticasDerivadas: {
      armadura,
      evasion,
      resistencias: {
        fuego: 0,
        frio: 0,
        rayo: 0,
        veneno: 0,
        ...resistencias,
      },
      resistenciasEfectos: {
        congelamiento: 0,
        aturdimiento: 0,
        envenenamiento: 0,
        quemadura: 0,
        ...resistenciasEfectos,
      },
      inmunidadesEfectos: [],
    },
    recibirDanio(cantidad) {
      const aplicado = Math.max(0, Math.min(vidaActual, cantidad));
      vidaActual -= aplicado;
      return aplicado;
    },
    estaDerrotado() {
      return vidaActual <= 0;
    },
  };
}

function obtenerRolComparacionArma({ plantilla, esDoble }) {
  if (esDoble) return "doble_varita";
  if (plantilla.familiaObjeto === "varita") return "varita";
  if (plantilla.familiaObjeto === "baston") return "baston";
  if (plantilla.familiaObjeto === "arco") return "arco";
  return "fisica_cuerpo";
}

function obtenerObjetivosEsperadosBalance(formaImpacto) {
  if (!formaImpacto || formaImpacto.tipo === "individual") return 1;
  if (formaImpacto.tipo === "cadena") {
    return Math.min(2, Math.max(1, formaImpacto.maximoObjetivos ?? 1));
  }
  if (formaImpacto.tipo === "linea") {
    return Math.min(1.75, obtenerMaximoObjetivos(formaImpacto));
  }
  if (formaImpacto.tipo === "radio") {
    return Math.min(2, obtenerMaximoObjetivos(formaImpacto));
  }
  return 1;
}

function seleccionarProfesionParaArma(plantilla) {
  const atributo = plantilla.propiedades.atributoAtaque;
  if (atributo === "destreza") return "rogue";
  if (atributo === "inteligencia" || atributo === "sabiduria") return "mago";
  return "guerrero";
}

function aplicarEvaluacionRelativa({
  filas,
  obtenerGrupo,
  obtenerValor,
  bandas,
  descripcionValor,
}) {
  const grupos = new Map();
  for (const fila of filas) {
    const grupo = obtenerGrupo(fila);
    if (!grupos.has(grupo)) grupos.set(grupo, []);
    grupos.get(grupo).push(fila);
  }
  for (const [grupo, filasGrupo] of grupos) {
    const valores = filasGrupo.map(obtenerValor).filter(Number.isFinite);
    const referencia = mediana(valores);
    for (const fila of filasGrupo) {
      if (valores.length < 2) {
        fila.referenciaGrupo = redondear(referencia);
        fila.proporcionReferencia = 100;
        fila.criterio =
          `El grupo ${grupo} todavía tiene un solo elemento comparable. Se muestra el resultado, pero no se lo declara equilibrado sin un par.`;
        fila.estado = ESTADOS.INFORMATIVO;
        continue;
      }
      const valor = obtenerValor(fila);
      const proporcion = referencia > 0 ? valor / referencia : 1;
      fila.referenciaGrupo = redondear(referencia);
      fila.proporcionReferencia = redondear(proporcion * 100);
      fila.criterio =
        `Se compara el ${descripcionValor} con la mediana de ${grupo}. ` +
        `Correcto: ${Math.round(bandas.correctoMinimo * 100)}–${Math.round(
          bandas.correctoMaximo * 100,
        )} %. Advertencia: ${Math.round(
          bandas.advertenciaMinimo * 100,
        )}–${Math.round(bandas.advertenciaMaximo * 100)} %.`;
      fila.estado = evaluarProporcion(proporcion, bandas);
    }
  }
}

function evaluarProporcion(proporcion, bandas) {
  if (
    proporcion >= bandas.correctoMinimo &&
    proporcion <= bandas.correctoMaximo
  ) {
    return ESTADOS.CORRECTO;
  }
  if (
    proporcion >= bandas.advertenciaMinimo &&
    proporcion <= bandas.advertenciaMaximo
  ) {
    return ESTADOS.ADVERTENCIA;
  }
  return ESTADOS.INCORRECTO;
}

function normalizarConfiguracionAnalisis(configuracion = {}) {
  const bandasPredeterminadas = {
    correctoMinimo: 0.7,
    correctoMaximo: 1.4,
    advertenciaMinimo: 0.5,
    advertenciaMaximo: 1.7,
  };
  return {
    nivelesReferencia:
      configuracion.nivelesReferencia ?? [...NIVELES_REFERENCIA_PREDETERMINADOS],
    bandasRelativas: {
      ...bandasPredeterminadas,
      ...(configuracion.bandasRelativas ?? {}),
    },
    bandasRelativasHabilidades: {
      correctoMinimo: 0.65,
      correctoMaximo: 1.5,
      advertenciaMinimo: 0.45,
      advertenciaMaximo: 1.85,
      ...(configuracion.bandasRelativasHabilidades ?? {}),
    },
    bandasRelativasArquetipos: {
      correctoMinimo: 0.6,
      correctoMaximo: 1.55,
      advertenciaMinimo: 0.4,
      advertenciaMaximo: 1.9,
      ...(configuracion.bandasRelativasArquetipos ?? {}),
    },
    arquetipos:
      configuracion.arquetipos ?? crearArquetiposPredeterminados(),
    pruebasFocalizadas: {
      idJefeReferencia: "senor_guerra",
      nivelJefeReferencia: 10,
      lanzamientosRotacionAvanzada: 3,
      objetivosGrupoIncinerar: [1, 2, 3],
      objetivosNube: [1, 3],
      ventajaMaximaDobleVaritaPorcentaje: 15,
      reservaManaCorrectaMinimaPorcentaje: 40,
      reservaManaAdvertenciaMinimaPorcentaje: 20,
      porcentajeVidaJefeAdvertenciaRotacion: 70,
      porcentajeVidaJefeIncorrectoRotacion: 100,
      ...(configuracion.pruebasFocalizadas ?? {}),
    },
  };
}

function crearArquetiposPredeterminados() {
  return [
    {
      id: "guerrero_fisico",
      nombre: "Guerrero físico",
      profesion: "guerrero",
      nivel: 10,
      familiaArma: "mandoble",
      usaHabilidad: false,
      ataquesBasicos: 3,
      lanzamientos: 0,
    },
    {
      id: "rogue_fisico",
      nombre: "Rogue físico",
      profesion: "rogue",
      nivel: 10,
      familiaArma: "daga",
      usaHabilidad: false,
      ataquesBasicos: 3,
      lanzamientos: 0,
    },
    {
      id: "mago_especializado",
      nombre: "Mago especializado",
      profesion: "mago",
      nivel: 10,
      familiaArma: "baston",
      usaHabilidad: true,
      categoriaHabilidad: "avanzada",
      conCatalizador: true,
      ataquesBasicos: 0,
      lanzamientos: 3,
    },
    {
      id: "guerrero_magico",
      nombre: "Guerrero con habilidades mágicas",
      profesion: "guerrero",
      nivel: 10,
      familiaArma: "espada",
      usaHabilidad: true,
      categoriaHabilidad: "basica",
      conCatalizador: false,
      ataquesBasicos: 2,
      lanzamientos: 1,
    },
    {
      id: "rogue_magico",
      nombre: "Rogue con habilidades mágicas",
      profesion: "rogue",
      nivel: 10,
      familiaArma: "daga",
      usaHabilidad: true,
      categoriaHabilidad: "basica",
      conCatalizador: false,
      ataquesBasicos: 2,
      lanzamientos: 1,
    },
    {
      id: "mago_fisico",
      nombre: "Mago con ataques físicos",
      profesion: "mago",
      nivel: 10,
      familiaArma: "baston",
      usaHabilidad: false,
      ataquesBasicos: 3,
      lanzamientos: 0,
    },
    {
      id: "hibrido_catalizador",
      nombre: "Híbrido con catalizador",
      profesion: "rogue",
      nivel: 10,
      familiaArma: "varita",
      usaHabilidad: true,
      categoriaHabilidad: "intermedia",
      conCatalizador: true,
      ataquesBasicos: 2,
      lanzamientos: 1,
    },
    {
      id: "hibrido_sin_catalizador",
      nombre: "Híbrido sin catalizador",
      profesion: "guerrero",
      nivel: 10,
      familiaArma: "lanza",
      usaHabilidad: true,
      categoriaHabilidad: "intermedia",
      conCatalizador: false,
      ataquesBasicos: 2,
      lanzamientos: 1,
    },
  ];
}

function nivelRepresentativoHabilidad(categoria, grado) {
  if (categoria === "basica") return [1, 3, 6, 10][grado - 1] ?? 10;
  if (categoria === "intermedia") return [3, 6, 10][grado - 1] ?? 10;
  if (categoria === "avanzada") return [6, 8, 10][grado - 1] ?? 10;
  return 10;
}

function esHabilidadActivaEjecutable(habilidad) {
  return habilidad?.tipo === "activa" && Boolean(habilidad.ejecucion);
}

function categoriaHabilidad(requisito) {
  if (requisito === 0) return "basica";
  if (requisito === 3) return "intermedia";
  if (requisito === 6) return "avanzada";
  return "desconocida";
}

function obtenerMaximoObjetivos(formaImpacto) {
  if (!formaImpacto || formaImpacto.tipo === "individual") return 1;
  if (formaImpacto.tipo === "cadena") {
    return Math.max(1, formaImpacto.maximoObjetivos ?? 1);
  }
  if (formaImpacto.tipo === "linea") {
    return Math.max(1, (formaImpacto.longitud ?? 1) * (formaImpacto.ancho ?? 1));
  }
  if (formaImpacto.tipo === "radio") {
    const radio = Math.max(0, formaImpacto.radio ?? 0);
    return Math.max(1, (radio * 2 + 1) ** 2 - 1);
  }
  return 1;
}

function resumirFormaImpacto(formaImpacto) {
  if (!formaImpacto || formaImpacto.tipo === "individual") return "individual";
  if (formaImpacto.tipo === "radio") return `radio ${formaImpacto.radio}`;
  if (formaImpacto.tipo === "cadena") return `cadena ${formaImpacto.maximoObjetivos}`;
  if (formaImpacto.tipo === "linea") {
    return `línea ${formaImpacto.longitud}×${formaImpacto.ancho}`;
  }
  return formaImpacto.tipo;
}

function obtenerReferenciaMasCercana(referencias, nivel) {
  return [...referencias].sort(
    (a, b) => Math.abs(a.nivel - nivel) - Math.abs(b.nivel - nivel),
  )[0];
}

function crearRangoEnteros(minimo, maximo) {
  const desde = Math.ceil(minimo);
  const hasta = Math.floor(maximo);
  if (hasta <= desde) return [desde];
  return Array.from({ length: hasta - desde + 1 }, (_, indice) => desde + indice);
}

function resumirEstados(filas) {
  return {
    cantidad: filas.length,
    correctos: filas.filter((fila) => fila.estado === ESTADOS.CORRECTO).length,
    advertencias: filas.filter((fila) => fila.estado === ESTADOS.ADVERTENCIA).length,
    incorrectos: filas.filter((fila) => fila.estado === ESTADOS.INCORRECTO).length,
    informativos: filas.filter((fila) => fila.estado === ESTADOS.INFORMATIVO).length,
  };
}

function mediana(valores) {
  if (!Array.isArray(valores) || valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const centro = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? (ordenados[centro - 1] + ordenados[centro]) / 2
    : ordenados[centro];
}

function promedio(valores) {
  if (!Array.isArray(valores) || valores.length === 0) return 0;
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

function redondear(valor) {
  return Number(Number(valor).toFixed(2));
}

function validarEntrada(entrada) {
  for (const [nombre, valor] of Object.entries(entrada)) {
    if (nombre === "configuracionGeneracionObjetos") continue;
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
      throw new Error(`El análisis de combate necesita ${nombre} válido.`);
    }
  }
}

function congelarProfundamente(valor) {
  if (!valor || typeof valor !== "object" || Object.isFrozen(valor)) return valor;
  for (const contenido of Object.values(valor)) congelarProfundamente(contenido);
  return Object.freeze(valor);
}
