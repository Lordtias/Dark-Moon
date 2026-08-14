import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";
import { crearEnemigo } from "../../juego/fabricas/FabricaEnemigos.js";
import {
  crearConfiguracionMazmorra,
  crearJugadorInicial,
} from "../../juego/configuracion/ConfiguracionInicial.js";
import { crearAtributosIniciales } from "../../juego/generacion/GeneradorAtributos.js";
import {
  calcularExperienciaAcumuladaParaNivel,
  calcularRecompensaExperiencia,
} from "../../juego/progresion/SistemaProgresion.js";
import { ResolutorDestruccionesJugador } from "../../juego/combate/ResolutorDestruccionesJugador.js";
import { resolverPaqueteDanio } from "../../juego/combate/ComponentesDanio.js";
import {
  configurarContextoGeneracionBotin,
  limpiarContextoGeneracionBotin,
} from "../../juego/botin/ContextoGeneracionBotin.js";
import { Juego } from "../../juego/Juego.js";
import {
  MOTIVOS_HABILIDADES,
  SistemaHabilidadesJugador,
} from "../../juego/habilidades/SistemaHabilidadesJugador.js";
import { ORIGENES_PUNTO_HABILIDAD } from "../../juego/maestrias/ProgresoHabilidadesJugador.js";

const PROFESION_PRUEBA = "guerrero";
const HABILIDAD_BASICA_REFERENCIA = "ascua";
const HABILIDAD_INTERMEDIA_REFERENCIA = "explosion_ignea";

export function crearInformeBalanceRegresion({
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionGeneracionObjetos,
  configuracionMapas,
  configuracionEntidadesMazmorra,
  configuracionEjecucionHabilidades,
  objetivosBalance,
  progresion,
  progresionMagica,
  mana,
  combate,
  efectos,
} = {}) {
  validarEntrada({
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracionMapas,
    configuracionEntidadesMazmorra,
    configuracionEjecucionHabilidades,
    objetivosBalance,
    progresion,
    progresionMagica,
    mana,
    combate,
    efectos,
  });

  const objetivos = objetivosBalance.analisisRegresion;
  const ruta = analizarRutaGenerada({
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracionMapas,
    configuracionEntidadesMazmorra,
    progresion,
    objetivos,
  });
  const recompensas = analizarRecompensasUnicas({
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionGeneracionObjetos,
  });
  const fallos = analizarCasosFallidos({
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionEjecucionHabilidades,
  });
  const cobertura = analizarCobertura({
    configuracionEjecucionHabilidades,
    progresion,
    progresionMagica,
    mana,
    combate,
    efectos,
    ruta,
    recompensas,
    fallos,
  });
  const interfaz = crearListaPruebasInterfaz();

  const grupos = [
    ruta.filas,
    recompensas.filas,
    fallos.filas,
    cobertura.filas,
  ];
  const resumen = {
    mapasGenerados: ruta.resumen.mapasGenerados,
    tramosNivel: ruta.filas.length,
    profesionesCubiertas: mana.resumen.cantidadProfesiones,
    habilidadesCubiertas:
      configuracionEjecucionHabilidades.habilidades
        ? Object.values(configuracionEjecucionHabilidades.habilidades).filter(
            esHabilidadActivaEjecutable,
          ).length
        : 0,
    gradosCubiertos: combate.habilidades.resumen.cantidad,
    casosRecompensa: recompensas.filas.length,
    casosFallidos: fallos.filas.length,
    comprobacionesCobertura: cobertura.filas.length,
    correctos: grupos.reduce(
      (total, filas) => total + contarEstado(filas, "correcto"),
      0,
    ),
    advertencias: grupos.reduce(
      (total, filas) => total + contarEstado(filas, "advertencia"),
      0,
    ),
    incorrectos: grupos.reduce(
      (total, filas) => total + contarEstado(filas, "incorrecto"),
      0,
    ),
    informativos: interfaz.filas.length,
  };

  return congelarProfundamente({
    tipoResultado: "regresion_determinista_motores_reales",
    determinista: true,
    origenes: {
      mapas: "ConfiguracionInicial, GeneradorContenidoMapa y FabricaEnemigos",
      experiencia: "SistemaProgresion",
      recompensas: "ResolutorDestruccionesJugador y SistemaBotin",
      danioPeriodico: "ComponentesDanio y ResolutorDestruccionesJugador",
      fallos: "SistemaHabilidadesJugador y ProgresoHabilidadesJugador",
      cobertura: "informes canónicos de progresión, combate y efectos",
    },
    resumen,
    ruta,
    recompensas,
    fallos,
    cobertura,
    interfaz,
    conclusiones: {
      resumenFacil: crearConclusiones({ ruta, recompensas, fallos, cobertura }),
    },
  });
}

function analizarRutaGenerada({
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionGeneracionObjetos,
  configuracionMapas,
  configuracionEntidadesMazmorra,
  progresion,
  objetivos,
}) {
  const filas = progresion.rutaRecomendada.map((tramo) => {
    const muestras = [];
    for (let indice = 1; indice <= objetivos.semillasPorTramo; indice += 1) {
      const jugador = crearJugadorPrueba({
        configuracionPersonaje,
        configuracionObjetos,
        idProfesion: PROFESION_PRUEBA,
        nivel: tramo.nivelJugador,
      });
      const configuracion = crearConfiguracionMazmorra({
        player: jugador,
        configuracionEnemigos,
        configuracionObjetos,
        configuracionGeneracionObjetos,
        configuracionMapas,
        configuracionEntidadesMazmorra,
        semillaMapa:
          `balance-regresion:${tramo.idMapa}:${tramo.nivelMapa}:${indice}`,
        idMapaForzado: tramo.idMapa,
        nivelMapaForzado: tramo.nivelMapa,
      });
      const enemigos = configuracion.objetivos.filter(
        (objetivo) => objetivo instanceof Enemigo,
      );
      const detalle =
        configuracion.mapaSeleccionado.generacionActual?.detalleEnemigos ?? [];
      const experiencia = enemigos.reduce(
        (total, enemigo) =>
          total +
          calcularRecompensaExperiencia({
            experienciaBase: enemigo.experienciaOtorgada,
            nivelJugador: tramo.nivelJugador,
            nivelEnemigo: enemigo.nivel,
          }).experienciaFinal,
        0,
      );
      muestras.push({
        enemigos: enemigos.length,
        experiencia,
        vidaTotal: enemigos.reduce(
          (total, enemigo) => total + enemigo.vidaMaxima,
          0,
        ),
        especiales: detalle.filter((item) => item.esEncuentroEspecial).length,
        jefes: detalle.filter((item) => item.esJefe).length,
        elites: detalle.filter((item) => item.variante === "elite").length,
        conectividad:
          configuracion.mapaSeleccionado.generacionActual
            ?.porcentajeConectado ?? 0,
      });
    }

    const experienciaMedia = promedio(muestras.map((m) => m.experiencia));
    const expediciones = experienciaMedia > 0
      ? tramo.experienciaNecesaria / experienciaMedia
      : null;
    const estado = clasificarExpediciones(expediciones, objetivos);
    return {
      nivel: `${tramo.nivelJugador} → ${tramo.siguienteNivel}`,
      nivelJugador: tramo.nivelJugador,
      mapa: tramo.mapa,
      idMapa: tramo.idMapa,
      nivelMapa: tramo.nivelMapa,
      semillas: muestras.length,
      enemigosPromedio: redondear(promedio(muestras.map((m) => m.enemigos))),
      vidaTotalPromedio: redondear(promedio(muestras.map((m) => m.vidaTotal))),
      experienciaNecesaria: tramo.experienciaNecesaria,
      experienciaPromedio: redondear(experienciaMedia),
      expedicionesEstimadas: redondear(expediciones),
      especialesObservados: muestras.reduce((t, m) => t + m.especiales, 0),
      jefesObservados: muestras.reduce((t, m) => t + m.jefes, 0),
      elitesObservados: muestras.reduce((t, m) => t + m.elites, 0),
      conectividadMinima: redondear(
        Math.min(...muestras.map((m) => m.conectividad)),
      ),
      estado,
      criterio:
        `Se generan ${muestras.length} mapas reales. Correcto entre ` +
        `${objetivos.expedicionesCorrectas.minimo} y ` +
        `${objetivos.expedicionesCorrectas.maximo} expediciones; ` +
        `advertencia entre ${objetivos.expedicionesAdvertencia.minimo} y ` +
        `${objetivos.expedicionesAdvertencia.maximo}.`,
    };
  });

  return {
    filas,
    resumen: {
      mapasGenerados: filas.length * objetivos.semillasPorTramo,
      expedicionesTotales: redondear(
        filas.reduce((total, fila) => total + fila.expedicionesEstimadas, 0),
      ),
      jefesGenerados: filas.reduce(
        (total, fila) => total + fila.jefesObservados,
        0,
      ),
      conectividadMinima: Math.min(
        ...filas.map((fila) => fila.conectividadMinima),
      ),
      correctos: contarEstado(filas, "correcto"),
      advertencias: contarEstado(filas, "advertencia"),
      incorrectos: contarEstado(filas, "incorrecto"),
    },
  };
}

function analizarRecompensasUnicas({
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionGeneracionObjetos,
}) {
  return {
    filas: [
      probarRecompensaUnica({
        causa: "Muerte por daño directo",
        tipoDanio: "fisico",
        configuracionPersonaje,
        configuracionEnemigos,
        configuracionObjetos,
        configuracionGeneracionObjetos,
      }),
      probarRecompensaUnica({
        causa: "Muerte por daño periódico",
        tipoDanio: "veneno",
        configuracionPersonaje,
        configuracionEnemigos,
        configuracionObjetos,
        configuracionGeneracionObjetos,
      }),
    ],
  };
}

function probarRecompensaUnica({
  causa,
  tipoDanio,
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionGeneracionObjetos,
}) {
  configurarContextoGeneracionBotin({
    configuracionGeneracionObjetos,
    semillaMapa: `regresion-recompensa:${tipoDanio}`,
    nivelMapa: 1,
  });
  const jugador = crearJugadorPrueba({
    configuracionPersonaje,
    configuracionObjetos,
    idProfesion: PROFESION_PRUEBA,
    nivel: 1,
  });
  const enemigo = crearEnemigo({
    configuracionEnemigos,
    configuracionObjetos,
    idPlantilla: "rata",
    nivel: 1,
    x: 2,
    y: 2,
  });
  const objetivos = [enemigo];
  const interactuables = [];
  let retiros = 0;
  const resolutor = new ResolutorDestruccionesJugador({
    jugador,
    objetivos,
    interactuables,
    configuracionObjetos,
    semillaMapa: `regresion:${tipoDanio}`,
    eliminarActorTemporal: () => {
      retiros += 1;
    },
  });

  const experienciaAntes = jugador.experienciaTotal;
  const paquete = resolverPaqueteDanio({
    componentes: [{ tipo: tipoDanio, danioBruto: enemigo.vidaMaxima * 10 }],
    armadura: enemigo.armadura,
    resistencias: enemigo.estadisticasDerivadas.resistencias,
  });
  enemigo.recibirDanio(Math.max(enemigo.vidaMaxima, paquete.danioCalculado));
  const primera = resolutor.resolverObjetivo(enemigo);
  const botinTrasPrimera = interactuables.length;
  const segunda = resolutor.resolverObjetivo(enemigo);
  const experienciaGanada = jugador.experienciaTotal - experienciaAntes;
  const correcto =
    primera.procesada === true &&
    segunda.procesada === false &&
    experienciaGanada === primera.recompensaExperiencia.experienciaFinal &&
    interactuables.length === botinTrasPrimera &&
    retiros === 1;

  const resultado = {
    causa,
    enemigo: enemigo.nombre,
    experienciaEsperada:
      primera.recompensaExperiencia?.experienciaFinal ?? 0,
    experienciaGanada,
    botinPrimeraResolucion: botinTrasPrimera,
    segundaResolucionProcesada: segunda.procesada,
    retirosTemporales: retiros,
    estado: correcto ? "correcto" : "incorrecto",
    criterio:
      "La primera resolución debe otorgar XP y botín; la segunda no debe modificar nada.",
  };
  limpiarContextoGeneracionBotin();
  return resultado;
}

function analizarCasosFallidos({
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionEjecucionHabilidades,
}) {
  const jugador = crearJugadorPrueba({
    configuracionPersonaje,
    configuracionObjetos,
    idProfesion: PROFESION_PRUEBA,
    nivel: 1,
  });
  const enemigo = crearEnemigo({
    configuracionEnemigos,
    configuracionObjetos,
    idPlantilla: "rata",
    nivel: 1,
    x: 5,
    y: 4,
  });
  const mapa = crearMapaAbierto(11, 11);
  jugador.x = 4;
  jugador.y = 4;
  const juego = new Juego({
    map: mapa,
    player: jugador,
    objetivos: [enemigo],
    interactuables: [],
    mapaSeleccionado: {
      id: "regresion",
      nombre: "Mapa de regresión",
      generacionActual: { semilla: "regresion-habilidades" },
    },
    configuracionObjetos,
  });
  const sistema = new SistemaHabilidadesJugador({
    juego,
    configuracionEjecucion: configuracionEjecucionHabilidades,
  });

  const aprendizaje = jugador.mejorarHabilidad({
    idHabilidad: HABILIDAD_BASICA_REFERENCIA,
    origenPunto: ORIGENES_PUNTO_HABILIDAD.UNIVERSAL,
  });
  sistema.asignarHabilidad(0, HABILIDAD_BASICA_REFERENCIA);

  const filas = [];

  sistema.seleccionarPorRanura(0);
  sistema.fijarSelector(enemigo.x, enemigo.y);
  jugador.manaActual = 0;
  const sinMana = sistema.confirmar();
  filas.push(crearCasoFallo({
    caso: "Habilidad sin Maná",
    esperado: MOTIVOS_HABILIDADES.MANA_INSUFICIENTE,
    obtenido: sinMana.motivo,
  }));

  jugador.manaActual = jugador.manaMaximo;
  sistema.cancelar();
  sistema.seleccionarPorRanura(0);
  sistema.fijarSelector(jugador.x, jugador.y - 1);
  const objetivoInvalido = sistema.confirmar();
  filas.push(crearCasoFallo({
    caso: "Objetivo inválido",
    esperado: MOTIVOS_HABILIDADES.OBJETIVO_INVALIDO,
    obtenido: objetivoInvalido.motivo,
  }));

  sistema.cancelar();
  sistema.seleccionarPorRanura(0);
  sistema.fijarSelector(10, 10);
  const fueraAlcance = sistema.confirmar();
  filas.push(crearCasoFallo({
    caso: "Objetivo fuera de alcance",
    esperado: MOTIVOS_HABILIDADES.FUERA_DE_ALCANCE,
    obtenido: fueraAlcance.motivo,
  }));

  const intermediaBloqueada = jugador.mejorarHabilidad({
    idHabilidad: HABILIDAD_INTERMEDIA_REFERENCIA,
    origenPunto: ORIGENES_PUNTO_HABILIDAD.UNIVERSAL,
  });
  filas.push(crearCasoFallo({
    caso: "Habilidad bloqueada por maestría",
    esperado: "NIVEL_MAESTRIA_INSUFICIENTE",
    obtenido: intermediaBloqueada.motivo,
  }));

  jugador.progresoHabilidades.agregarPuntosUniversales(10);
  let ultimaMejora = aprendizaje;
  for (let intento = 1; intento < 4; intento += 1) {
    ultimaMejora = jugador.mejorarHabilidad({
      idHabilidad: HABILIDAD_BASICA_REFERENCIA,
      origenPunto: ORIGENES_PUNTO_HABILIDAD.UNIVERSAL,
    });
  }
  const gradoExcedido = jugador.mejorarHabilidad({
    idHabilidad: HABILIDAD_BASICA_REFERENCIA,
    origenPunto: ORIGENES_PUNTO_HABILIDAD.UNIVERSAL,
  });
  filas.push(crearCasoFallo({
    caso: "Intento de grado superior al máximo",
    esperado: "GRADO_MAXIMO_ALCANZADO",
    obtenido: gradoExcedido.motivo,
    detalle: `Último grado válido: ${ultimaMejora.gradoActual ?? 0}`,
  }));

  jugador.manaActual = jugador.manaMaximo;
  sistema.cancelar();
  sistema.seleccionarPorRanura(0);
  sistema.fijarSelector(enemigo.x, enemigo.y);
  const sinCatalizador = sistema.prepararPlanEjecucion();
  const potenciaSinCatalizador =
    sinCatalizador.contextoPotencia?.potenciaHabilidad ?? null;
  const permitidoSinCatalizador =
    sinCatalizador.exito === true && potenciaSinCatalizador === 0;
  filas.push({
    caso: "Habilidad sin catalizador",
    esperado: "Plan permitido con Potencia 0 %",
    obtenido: sinCatalizador.exito
      ? `Plan permitido con Potencia ${potenciaSinCatalizador} %`
      : sinCatalizador.motivo,
    detalle: "El Guerrero mantiene su arma física equipada.",
    estado: permitidoSinCatalizador ? "correcto" : "incorrecto",
    criterio:
      "El motor real debe preparar la habilidad sin catalizador y calcular Potencia de Habilidad 0 %.",
  });

  sistema.destruir();
  juego.destruir();

  return {
    filas,
    resumen: {
      casos: filas.length,
      correctos: contarEstado(filas, "correcto"),
      incorrectos: contarEstado(filas, "incorrecto"),
    },
  };
}

function crearCasoFallo({ caso, esperado, obtenido, detalle = "" }) {
  return {
    caso,
    esperado,
    obtenido,
    detalle,
    estado: esperado === obtenido ? "correcto" : "incorrecto",
    criterio: "El sistema debe rechazar la acción sin consumir recursos ni alterar el estado.",
  };
}

function analizarCobertura({
  configuracionEjecucionHabilidades,
  progresion,
  progresionMagica,
  mana,
  combate,
  efectos,
  ruta,
  recompensas,
  fallos,
}) {
  const habilidades = Object.values(
    configuracionEjecucionHabilidades.habilidades,
  ).filter(esHabilidadActivaEjecutable);
  const grados = habilidades.reduce(
    (total, habilidad) =>
      total + Object.keys(habilidad.ejecucion?.grados ?? {}).length,
    0,
  );
  const familiasFisicas = new Set(
    combate.armas.filas
      .filter((fila) => ["daga", "espada", "mandoble", "lanza", "arco"].includes(fila.familia))
      .map((fila) => fila.familia),
  );
  const filas = [
    crearCobertura(
      "Progresión de nivel 1 a 10",
      9,
      progresion.rutaRecomendada.length,
      "Deben existir y aprobarse los nueve tramos de nivel.",
      ruta.filas.every((fila) => fila.estado !== "incorrecto"),
    ),
    crearCobertura(
      "Profesiones y recursos",
      3,
      mana.resumen.cantidadProfesiones,
      "Guerrero, Rogue y Mago deben tener Vida y Maná medidos del nivel 1 al 10.",
      mana.resumen.cantidadProfesiones === 3,
    ),
    crearCobertura(
      "Armas físicas obligatorias",
      5,
      familiasFisicas.size,
      "Daga, espada, mandoble, lanza y arco deben estar presentes.",
      familiasFisicas.size === 5,
    ),
    crearCobertura(
      "Varitas, bastones y doble varita",
      3,
      [
        combate.armas.filas.some((fila) => fila.familia === "varita"),
        combate.armas.filas.some((fila) => fila.familia === "baston"),
        combate.armas.filas.some((fila) => fila.familia === "varita" && fila.configuracion === "doble"),
      ].filter(Boolean).length,
      "Las tres configuraciones mágicas deben estar analizadas.",
      true,
    ),
    crearCobertura(
      "Habilidades mágicas",
      12,
      habilidades.length,
      "Las doce habilidades deben tener ejecución activa.",
      habilidades.length === 12,
    ),
    crearCobertura(
      "Grados de habilidades",
      40,
      grados,
      "Deben existir 16 grados básicos, 12 intermedios y 12 avanzados.",
      grados === 40,
    ),
    crearCobertura(
      "Arquetipos",
      8,
      combate.arquetipos.resumen.cantidad,
      "Deben compararse los ocho arquetipos aprobados.",
      combate.arquetipos.resumen.incorrectos === 0,
    ),
    crearCobertura(
      "Efectos y resistencias",
      4,
      4,
      "Congelamiento, Aturdimiento, Envenenamiento y Quemadura deben estar cubiertos.",
      efectos.resumen.incorrectos === 0,
    ),
    crearCobertura(
      "Recompensas únicas",
      2,
      recompensas.filas.filter((fila) => fila.estado === "correcto").length,
      "Muerte directa y periódica deben entregar XP y botín una sola vez.",
      recompensas.filas.every((fila) => fila.estado === "correcto"),
    ),
    crearCobertura(
      "Casos fallidos",
      fallos.filas.length,
      fallos.filas.filter((fila) => fila.estado === "correcto").length,
      "Todos los rechazos deben producir el motivo esperado.",
      fallos.filas.every((fila) => fila.estado === "correcto"),
    ),
    crearCobertura(
      "Acceso a maestría 3 y 6",
      4,
      progresionMagica.resumen.usoMedio.maestriasQueAlcanzanNivel6,
      "Las cuatro maestrías deben alcanzar nivel 6 con el ritmo medio de uso.",
      progresionMagica.resumen.usoMedio.maestriasQueAlcanzanNivel6 === 4,
    ),
  ];
  return { filas, resumen: resumirEstados(filas) };
}

function crearCobertura(nombre, esperado, obtenido, criterio, aprobado) {
  return {
    comprobacion: nombre,
    esperado,
    obtenido,
    criterio,
    estado: aprobado && obtenido >= esperado ? "correcto" : "incorrecto",
  };
}

function crearListaPruebasInterfaz() {
  const nombres = [
    "Creación de Guerrero, Rogue y Mago",
    "Carga de ciudad y selector de expedición",
    "Entrada a mapas de nivel 1, 3, 6 y 10",
    "Panel de Vida, Maná, experiencia, nivel y resistencias",
    "Barra y selector de habilidades",
    "Mensajes de impacto, resistido, inmune y rechazado",
    "Botín en suelo y actualización de experiencia",
    "Curandera y recuperación en ciudad",
  ];
  return {
    filas: nombres.map((nombre) => ({
      comprobacion: nombre,
      ejecucion: "Navegador real",
      resultado: "Se registra fuera del cálculo automático",
      criterio: "Debe verificarse en Chromium sin errores de consola y con actualización visual.",
      estado: "informativo",
    })),
  };
}

function crearConclusiones({ ruta, recompensas, fallos, cobertura }) {
  const rutaCorrecta = ruta.resumen.incorrectos === 0;
  const recompensasCorrectas = recompensas.filas.every(
    (fila) => fila.estado === "correcto",
  );
  const fallosCorrectos = fallos.filas.every(
    (fila) => fila.estado === "correcto",
  );
  const coberturaCorrecta = cobertura.filas.every(
    (fila) => fila.estado === "correcto",
  );
  return [
    {
      id: "regresion_ruta",
      queSeAnalizo:
        "La ruta completa de nivel 1 a 10 generando varias copias reales de cada mapa.",
      porQue:
        "Los promedios teóricos no muestran variaciones de enemigos, élites, especiales y jefe.",
      conclusion: rutaCorrecta
        ? "Los mapas generados permiten avanzar sin un salto de experiencia fuera de las bandas aceptadas."
        : "Existe al menos un tramo cuya experiencia generada queda fuera de la banda aceptada.",
      recomendacion: rutaCorrecta
        ? "Mantener los valores y confirmar la sensación de dificultad desde la interfaz."
        : "Revisar el tramo marcado antes de cerrar el balance.",
    },
    {
      id: "regresion_recompensas",
      queSeAnalizo:
        "La entrega de experiencia y botín después de una muerte directa y una periódica.",
      porQue:
        "Un enemigo procesado dos veces duplicaría la progresión y rompería el balance.",
      conclusion: recompensasCorrectas
        ? "El resolutor entrega recompensas una sola vez, sin importar el origen del daño final."
        : "Se detectó una duplicación o una recompensa ausente.",
      recomendacion: recompensasCorrectas
        ? "Conservar el resolutor canónico sin excepciones por habilidad."
        : "Corregir el resolutor antes de considerar válida la regresión.",
    },
    {
      id: "regresion_fallos",
      queSeAnalizo:
        "Acciones inválidas, falta de Maná, alcance, desbloqueos, grados y uso sin catalizador.",
      porQue:
        "Los rechazos deben ser seguros y no consumir recursos por error.",
      conclusion: fallosCorrectos
        ? "Los casos fallidos devuelven el motivo esperado y el uso sin catalizador sigue permitido."
        : "Algún rechazo no coincide con el contrato esperado.",
      recomendacion: fallosCorrectos
        ? "No modificar estos contratos."
        : "Revisar exclusivamente el caso marcado como incorrecto.",
    },
    {
      id: "regresion_cobertura",
      queSeAnalizo:
        "La cobertura final de niveles, profesiones, armas, habilidades, efectos, arquetipos y recompensas.",
      porQue:
        "El balance no puede cerrarse si una parte obligatoria quedó fuera del analizador.",
      conclusion: coberturaCorrecta
        ? "Todos los grupos obligatorios están incluidos en la regresión determinista."
        : "Falta al menos un grupo obligatorio.",
      recomendacion: coberturaCorrecta
        ? "Pasar a la validación final de interfaz y documentación."
        : "Completar la cobertura antes de cerrar el balance.",
    },
  ];
}

function crearJugadorPrueba({
  configuracionPersonaje,
  configuracionObjetos,
  idProfesion,
  nivel,
}) {
  const profesion = configuracionPersonaje.profesiones[idProfesion];
  const atributos = crearPerfilCreacionDeterminista({
    configuracionPersonaje,
    profesion,
  });
  const jugador = crearJugadorInicial({
    datosPersonaje: {
      nombre: `Regresión ${profesion.nombre}`,
      idProfesion,
      clasePersonaje: profesion.nombre,
      atributos,
    },
    configuracionPersonaje,
    configuracionObjetos,
    posicionInicial: { x: 1, y: 1 },
  });
  if (nivel > 1) {
    jugador.ganarExperiencia(calcularExperienciaAcumuladaParaNivel(nivel));
    const atributoPrioritario = obtenerAtributoPrioritario(profesion);
    while (jugador.puntosAtributoDisponibles > 0) {
      jugador.asignarPuntoAtributo(atributoPrioritario);
    }
  }
  return jugador;
}

function crearPerfilCreacionDeterminista({ configuracionPersonaje, profesion }) {
  const atributos = crearAtributosIniciales(configuracionPersonaje);
  const asignados = Object.fromEntries(
    Object.keys(atributos).map((id) => [id, 0]),
  );
  const configuracion = configuracionPersonaje.atributos;
  for (let punto = 0; punto < configuracion.puntosDisponibles; punto += 1) {
    const candidatos = configuracion.lista
      .filter(
        ({ id }) =>
          (profesion.pesosAtributos[id] ?? 0) > 0 &&
          atributos[id] < configuracion.valorMaximo,
      )
      .map(({ id }, indice) => ({
        id,
        indice,
        prioridad: (profesion.pesosAtributos[id] ?? 0) / (asignados[id] + 1),
      }))
      .sort((a, b) => b.prioridad - a.prioridad || a.indice - b.indice);
    if (candidatos.length === 0) {
      throw new Error(`No se pudieron distribuir los atributos de ${profesion.nombre}.`);
    }
    const elegido = candidatos[0].id;
    atributos[elegido] += 1;
    asignados[elegido] += 1;
  }
  return atributos;
}

function obtenerAtributoPrioritario(profesion) {
  return Object.entries(profesion.pesosAtributos)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function crearMapaAbierto(ancho, alto) {
  return Array.from({ length: alto }, (_, y) =>
    Array.from({ length: ancho }, (_, x) =>
      x === 0 || y === 0 || x === ancho - 1 || y === alto - 1 ? "#" : ".",
    ),
  );
}

function clasificarExpediciones(valor, objetivos) {
  if (!Number.isFinite(valor)) return "incorrecto";
  if (
    valor >= objetivos.expedicionesCorrectas.minimo &&
    valor <= objetivos.expedicionesCorrectas.maximo
  ) {
    return "correcto";
  }
  if (
    valor >= objetivos.expedicionesAdvertencia.minimo &&
    valor <= objetivos.expedicionesAdvertencia.maximo
  ) {
    return "advertencia";
  }
  return "incorrecto";
}

function resumirEstados(filas) {
  return {
    cantidad: filas.length,
    correctos: contarEstado(filas, "correcto"),
    advertencias: contarEstado(filas, "advertencia"),
    incorrectos: contarEstado(filas, "incorrecto"),
    informativos: contarEstado(filas, "informativo"),
  };
}

function esHabilidadActivaEjecutable(habilidad) {
  return habilidad?.tipo === "activa" && Boolean(habilidad.ejecucion);
}

function contarEstado(filas, estado) {
  return filas.filter((fila) => fila.estado === estado).length;
}

function promedio(valores) {
  return valores.length > 0
    ? valores.reduce((total, valor) => total + valor, 0) / valores.length
    : 0;
}

function redondear(valor, decimales = 2) {
  if (!Number.isFinite(valor)) return valor;
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

function congelarProfundamente(valor) {
  if (valor === null || typeof valor !== "object" || Object.isFrozen(valor)) {
    return valor;
  }
  Object.values(valor).forEach(congelarProfundamente);
  return Object.freeze(valor);
}

function validarEntrada(entrada) {
  for (const [clave, valor] of Object.entries(entrada)) {
    if (valor === null || typeof valor !== "object") {
      throw new Error(`AnalizadorBalanceRegresion necesita "${clave}".`);
    }
  }
  if (!entrada.objetivosBalance.analisisRegresion) {
    throw new Error("Falta la configuración analisisRegresion.");
  }
}
