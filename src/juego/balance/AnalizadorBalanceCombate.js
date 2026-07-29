import { Player } from "../../entidad/destructible/combatiente/Player.js";
import {
  obtenerConfiguracionAtaque,
  calcularCostoManaAtaqueBasico,
} from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";
import { crearObjeto } from "../../objetos/FabricaObjetos.js";
import {
  resolverPaqueteDanio,
} from "../combate/ComponentesDanio.js";
import { calcularProbabilidadImpacto } from "../combate/SistemaCombate.js";
import { crearEnemigo } from "../fabricas/FabricaEnemigos.js";
import {
  configurarTiradasDeterministasHabilidad,
  resolverDanioHabilidad,
  resolverImpactoHabilidad,
  restaurarTiradasAleatoriasHabilidad,
} from "../habilidades/MotorDanioHabilidad.js";
import { prepararEfectosHabilidad } from "../habilidades/MotorEfectosHabilidad.js";
import {
  calcularPotenciaHabilidadObjetos,
  esBaston,
  esVarita,
} from "../magia/SistemaCatalizadores.js";
import {
  calcularCostoAccionCombatiente,
  TIEMPO_REFERENCIA,
  TIPOS_ACCION_TEMPORAL,
} from "../tiempo/SistemaTiempo.js";

const ESTADOS = Object.freeze({
  CORRECTO: "correcto",
  ADVERTENCIA: "advertencia",
  INCORRECTO: "incorrecto",
  INFORMATIVO: "informativo",
});

const RESISTENCIAS_ELEMENTALES_PRUEBA = Object.freeze([0, 25, 50, 75]);
const NIVELES_REFERENCIA_PREDETERMINADOS = Object.freeze([1, 3, 6, 10]);

// Analiza armas, habilidades, Potencia de Habilidad y arquetipos usando las
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
  const conclusiones = crearConclusiones({
    armas,
    habilidades,
    potencia,
    arquetipos,
  });

  return congelarProfundamente({
    tipoResultado: "balance_combate_motores_canonicos",
    determinista: true,
    descripcion:
      "Compara daño, impacto, crítico, tiempo, Maná, alcance, área y Potencia de Habilidad sin alterar la partida.",
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
    arquetipos,
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
}) {
  const catalizadores = Object.entries(configuracionObjetos)
    .filter(([, objeto]) => esBaston(objeto) || esVarita(objeto))
    .map(([id, objeto]) => ({
      id,
      nombre: objeto.nombre,
      familia: objeto.familiaObjeto,
      tier: objeto.tierBase,
      potenciaBase: objeto.propiedades.potenciaHabilidad,
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
        potenciaHabilidad: 0,
        cantidadCatalizadores: 0,
        tipo: "real",
      },
      {
        id: `baston_base_t${tier}`,
        nombre: baston.nombre,
        tier,
        potenciaHabilidad: baston.potenciaBase,
        cantidadCatalizadores: 1,
        tipo: "real",
      },
      {
        id: `doble_varita_base_t${tier}`,
        nombre: `Dos varitas Tier ${tier}`,
        tier,
        potenciaHabilidad: varita.potenciaBase * 2,
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
          potenciaHabilidad: baston.potenciaBase + potenciaAfijoMaxima,
          cantidadCatalizadores: 1,
          tipo: "teorico_objeto_posible",
        },
        {
          id: `doble_varita_enfocada_t${tier}`,
          nombre: `Dos varitas Tier ${tier} con afijo máximo`,
          tier,
          potenciaHabilidad:
            (varita.potenciaBase + potenciaAfijoMaxima) * 2,
          cantidadCatalizadores: 2,
          tipo: "teorico_objeto_posible",
        },
      );
    }
    filas.push(...escenarios);
  }

  const filasEvaluadas = evaluarPotencia(filas);
  return {
    tipoResultado: "configuracion_real_y_combinaciones_posibles",
    potenciaAfijoMaxima,
    filas: filasEvaluadas,
    resumen: {
      minimo: Math.min(...filasEvaluadas.map((fila) => fila.potenciaHabilidad)),
      maximo: Math.max(...filasEvaluadas.map((fila) => fila.potenciaHabilidad)),
      escenariosAltos: filasEvaluadas.filter(
        (fila) => fila.estado !== ESTADOS.CORRECTO && fila.estado !== ESTADOS.INFORMATIVO,
      ).length,
    },
  };
}

function obtenerPotenciaAfijoMaxima(configuracionGeneracionObjetos) {
  const prefijos = configuracionGeneracionObjetos?.prefijos ?? {};
  let maxima = 0;
  for (const afijo of Object.values(prefijos)) {
    const afectaPotencia = afijo.efectos?.some(
      (efecto) => efecto.propiedad === "potenciaHabilidad",
    );
    if (!afectaPotencia || afijo.estado !== "activo") continue;
    for (const grado of afijo.grados ?? []) {
      const rango = grado.valores?.potenciaHabilidad;
      if (Number.isFinite(rango?.maximo)) maxima = Math.max(maxima, rango.maximo);
    }
  }
  return maxima;
}

function evaluarPotencia(filas) {
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
        multiplicadorHabilidad: redondear(1 + fila.potenciaHabilidad / 100),
        gananciaPorcentual: fila.potenciaHabilidad,
      };
      if (fila.potenciaHabilidad === 0) {
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
          (bastonBase?.potenciaHabilidad ?? 0) -
            (dobleBase?.potenciaHabilidad ?? 0),
        );
        resultado.push({
          ...comun,
          criterio: `En Tier ${tier}, bastón y doble varita base deben quedar a no más de 2 puntos entre sí. Diferencia actual: ${diferencia}.`,
          estado: diferencia <= 2 ? ESTADOS.CORRECTO : ESTADOS.ADVERTENCIA,
        });
        continue;
      }
      const diferenciaMaxima =
        (dobleAfijo?.potenciaHabilidad ?? 0) -
        (bastonAfijo?.potenciaHabilidad ?? 0);
      const esDobleVarita = fila.id.startsWith("doble_varita_enfocada");
      resultado.push({
        ...comun,
        criterio: esDobleVarita
          ? `La doble varita usa dos afijos y puede superar al bastón máximo en ${diferenciaMaxima} puntos. Más de 10 puntos queda como advertencia de acumulación.`
          : `El bastón con afijo máximo se compara con la doble varita máxima. La diferencia actual es ${diferenciaMaxima} puntos y el riesgo adicional proviene del segundo afijo de las varitas.`,
        estado:
          esDobleVarita && diferenciaMaxima > 10
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
    potenciaHabilidad: calcularPotenciaHabilidadObjetos(
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
    for (const local of locales) {
      for (const global of globales) {
        const brutoBase =
          (local * descriptor.multiplicadorAtributo + global) *
          (descriptor.multiplicadorGolpe ?? fuente.multiplicadorGolpe ?? 1) *
          (descriptor.aplicaMultiplicadorGlobal
            ? estadisticasDanio.multiplicadorGlobal
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
  )) {
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
      habilidades: Object.keys(configuracionEjecucionHabilidades.habilidades).length,
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
    potenciaHabilidad: escenarioPotencia.potenciaHabilidad,
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
        ? definicion.probabilidadBase * (1 - resistenciaEfecto / 100)
        : definicion.probabilidadBase;
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
      ["control", "inmovilizacion", "aturdimiento"].includes(
        definicion.tipo,
      )
    ) {
      valorControlEsperado +=
        (definicion.duracion / TIEMPO_REFERENCIA) *
        (probabilidadFinal / 100);
    } else if (definicion.tipo === "modificador_factor") {
      const factor = Math.max(
        1,
        ...Object.values(definicion.valor ?? {}).filter(Number.isFinite),
      );
      valorControlEsperado +=
        (definicion.duracion / TIEMPO_REFERENCIA) *
        Math.max(0, factor - 1) *
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
    const tiempo =
      ataquesBasicos * (arma?.costoTemporal ?? 0) +
      lanzamientos * (habilidad?.costoTemporal ?? 0);
    const danio =
      ataquesBasicos * (arma?.danioEsperadoAccion ?? 0) +
      lanzamientos * (habilidad?.danioTotalEsperado ?? 0);
    const mana =
      ataquesBasicos * (arma?.costoMana ?? 0) +
      lanzamientos * (habilidad?.costoMana ?? 0);
    const danioGrupo =
      ataquesBasicos * (arma?.danioEsperadoAccion ?? 0) +
      lanzamientos * (habilidad?.danioTresObjetivos ?? 0);
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
      costoTemporal: tiempo,
      costoMana: mana,
      danioObjetivoUnico: redondear(danio),
      danioTresObjetivos: redondear(danioGrupo),
      danioPor100: tiempo > 0 ? redondear((danio / tiempo) * 100) : 0,
      danioGrupoPor100:
        tiempo > 0 ? redondear((danioGrupo / tiempo) * 100) : 0,
      dependenciaEquipo:
        (arma?.potenciaHabilidad ?? 0) > 0 || arma?.familia === "varita"
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
      "65 % rendimiento contra un objetivo y 35 % rendimiento contra tres objetivos",
  });
  return {
    tipoResultado: "comparacion_rotaciones_representativas",
    determinista: true,
    descripcion:
      "Cada escenario crea el personaje de su profesión y ejecuta sus armas y habilidades con los motores comunes.",
    filas,
    resumen: resumirEstados(filas),
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
  ).filter(
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
      potenciaHabilidad: 0,
    }
  );
}

function crearConclusiones({ armas, habilidades, potencia, arquetipos }) {
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
        id: "potencia_habilidad",
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
    ],
    decisionRecomendada: {
      aplicarCambiosAutomaticos: false,
      revisarArmas: [...armasProblematicas, ...armasAdvertencia].map(
        (fila) => fila.id,
      ),
      revisarHabilidades: [
        ...habilidadesProblematicas,
        ...habilidadesAdvertencia,
      ].map((fila) => `${fila.idHabilidad}:g${fila.grado}`),
      revisarPotencia: potenciaExcesiva.map((fila) => fila.id),
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
  if (escenario.potenciaHabilidad <= 0) return;
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
    ? escenario.potenciaHabilidad / 2
    : escenario.potenciaHabilidad;
  const propiedadesFinales = {
    ...plantilla.propiedades,
    potenciaHabilidad: potenciaPorObjeto,
  };
  const principal = crearObjeto({
    configuracionObjetos,
    idObjeto: idBase,
    propiedadesFinales,
  });
  jugador.equipamiento.equiparEnRanura("arma", principal);
  if (usaDoble) {
    const secundaria = crearObjeto({
      configuracionObjetos,
      idObjeto: idBase,
      propiedadesFinales,
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
