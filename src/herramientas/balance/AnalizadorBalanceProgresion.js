import { calcularDatosEnemigo } from "../../juego/fabricas/FabricaEnemigos.js";
import { crearGeneradorAleatorio } from "../../juego/generacion/GeneradorAleatorio.js";
import { generarTerreno } from "../../juego/generacion/GeneradorTerreno.js";
import {
  calcularCantidadEnemigosRecurrentes,
  crearContextoPoblacion,
} from "../../juego/generacion/PobladorEnemigosMazmorra.js";
import {
  CONFIGURACION_RECOMPENSAS_EXPERIENCIA,
  calcularExperienciaNecesaria,
  calcularRecompensaExperiencia,
} from "../../juego/progresion/SistemaProgresion.js";

const CANTIDAD_MUESTRAS_POBLACION = 24;
const cacheCantidadRecurrenteEsperada = new WeakMap();

const ESTADOS_BALANCE = Object.freeze({
  CORRECTO: "correcto",
  DEMASIADO_RAPIDO: "demasiado_rapido",
  DEMASIADO_LENTO: "demasiado_lento",
});

// Analiza la experiencia de mapas utilizando las mismas dos fuentes que el
// juego real: FabricaEnemigos calcula la XP base final y SistemaProgresion
// aplica diferencia de nivel y redondeo por enemigo. Las probabilidades de
// población se usan solamente para obtener el valor esperado de una expedición.
export function analizarBalanceProgresion({
  configuracionMapas,
  configuracionEnemigos,
  objetivosBalance,
} = {}) {
  validarParametros({
    configuracionMapas,
    configuracionEnemigos,
    objetivosBalance,
  });
  validarObjetivosBalance({ objetivosBalance, configuracionMapas });

  const detalleMapas = crearFilasTodosLosMapas({
    configuracionMapas,
    configuracionEnemigos,
  });
  const rutaRecomendada = crearFilasRutaRecomendada({
    configuracionMapas,
    configuracionEnemigos,
    objetivosBalance,
  });

  return congelarProfundamente({
    tipoResultado: "calculo_teorico_canonico",
    determinista: true,
    configuracion: {
      nivelMaximoContenido: objetivosBalance.nivelMaximoContenido,
      factorBaseExperiencia:
        CONFIGURACION_RECOMPENSAS_EXPERIENCIA.factorBaseExperienciaEnemigos,
      rangoExpedicionesObjetivo: {
        ...objetivosBalance.rangoExpedicionesObjetivo,
      },
    },
    resumen: crearResumen({ rutaRecomendada, objetivosBalance }),
    rutaRecomendada,
    detalleMapas,
  });
}

// Calcula la XP esperada de una expedición concreta. El resultado es exacto
// para cada combinación enemigo/variante y estadístico solo al promediar las
// densidad estructural y probabilidades configuradas en el mapa.
export function calcularExperienciaEsperadaMapa({
  plantillaMapa,
  nivelMapa,
  nivelJugador,
  configuracionEnemigos,
} = {}) {
  validarNivelDentroMapa({ plantillaMapa, nivelMapa });
  validarNivel({ nivel: nivelJugador, descripcion: "El nivel del jugador" });
  validarConfiguracionEnemigos(configuracionEnemigos);

  const recurrentes = calcularPoblacionRecurrente({
    plantillaMapa,
    configuracion: plantillaMapa.enemigos,
    nivelMapa,
    nivelJugador,
    configuracionEnemigos,
  });
  const especial = calcularPoblacionUnica({
    configuracion: plantillaMapa.encuentroEspecial ?? null,
    nivelMapa,
    nivelJugador,
    configuracionEnemigos,
  });
  const jefe = calcularPoblacionUnica({
    configuracion: plantillaMapa.jefe ?? null,
    nivelMapa,
    nivelJugador,
    configuracionEnemigos,
  });

  const experienciaBruta =
    recurrentes.experienciaBrutaEsperada +
    especial.experienciaBrutaEsperada +
    jefe.experienciaBrutaEsperada;
  const experienciaAjustada =
    recurrentes.experienciaEsperada +
    especial.experienciaEsperada +
    jefe.experienciaEsperada;
  const cantidadEnemigosEsperada =
    recurrentes.cantidadEsperada +
    especial.cantidadEsperada +
    jefe.cantidadEsperada;

  return congelarProfundamente({
    nivelJugador,
    nivelMapa,
    cantidadEnemigosEsperada: redondear(cantidadEnemigosEsperada),
    experienciaBruta: redondear(experienciaBruta),
    experienciaAjustada: redondear(experienciaAjustada),
    experienciaPromedioPorEnemigo:
      cantidadEnemigosEsperada > 0
        ? redondear(experienciaAjustada / cantidadEnemigosEsperada)
        : 0,
    recurrentes,
    especial,
    jefe,
  });
}

function crearFilasTodosLosMapas({
  configuracionMapas,
  configuracionEnemigos,
}) {
  const filas = [];

  for (const [idMapa, plantillaMapa] of Object.entries(
    configuracionMapas.plantillas,
  )) {
    for (
      let nivelMapa = plantillaMapa.niveles.minimo;
      nivelMapa <= plantillaMapa.niveles.maximo;
      nivelMapa += 1
    ) {
      const resultado = calcularExperienciaEsperadaMapa({
        plantillaMapa,
        nivelMapa,
        nivelJugador: nivelMapa,
        configuracionEnemigos,
      });

      filas.push({
        idMapa,
        mapa: plantillaMapa.nombre,
        nivelMapa,
        cantidadRecurrentesPromedio: resultado.recurrentes.cantidadEsperada,
        cantidadEnemigosPromedio: resultado.cantidadEnemigosEsperada,
        probabilidadEspecial: resultado.especial.probabilidadAparicion,
        probabilidadJefe: resultado.jefe.probabilidadAparicion,
        experienciaRecurrentes: resultado.recurrentes.experienciaEsperada,
        experienciaEspecial: resultado.especial.experienciaEsperada,
        experienciaJefe: resultado.jefe.experienciaEsperada,
        experienciaBruta: resultado.experienciaBruta,
        experienciaAjustada: resultado.experienciaAjustada,
        experienciaPromedioPorEnemigo: resultado.experienciaPromedioPorEnemigo,
      });
    }
  }

  return filas;
}

function crearFilasRutaRecomendada({
  configuracionMapas,
  configuracionEnemigos,
  objetivosBalance,
}) {
  const { minimo, maximo } = objetivosBalance.rangoExpedicionesObjetivo;

  return objetivosBalance.rutaRecomendada.map((paso) => {
    const plantillaMapa = configuracionMapas.plantillas[paso.idMapa];
    const resultado = calcularExperienciaEsperadaMapa({
      plantillaMapa,
      nivelMapa: paso.nivelMapa,
      nivelJugador: paso.nivelJugador,
      configuracionEnemigos,
    });
    const experienciaNecesaria = calcularExperienciaNecesaria(
      paso.nivelJugador,
    );
    const expedicionesEsperadas =
      resultado.experienciaAjustada > 0
        ? experienciaNecesaria / resultado.experienciaAjustada
        : Infinity;
    const enemigosEsperados =
      resultado.experienciaPromedioPorEnemigo > 0
        ? experienciaNecesaria / resultado.experienciaPromedioPorEnemigo
        : Infinity;

    return {
      nivelJugador: paso.nivelJugador,
      siguienteNivel: paso.nivelJugador + 1,
      idMapa: paso.idMapa,
      mapa: plantillaMapa.nombre,
      nivelMapa: paso.nivelMapa,
      experienciaNecesaria,
      experienciaBruta: resultado.experienciaBruta,
      experienciaEsperada: resultado.experienciaAjustada,
      cantidadEnemigosExpedicion: resultado.cantidadEnemigosEsperada,
      enemigosEsperados: numeroFinitoRedondeado(enemigosEsperados),
      expedicionesEsperadas: numeroFinitoRedondeado(expedicionesEsperadas),
      estado: clasificarExpediciones({
        expedicionesEsperadas,
        minimo,
        maximo,
      }),
    };
  });
}

function calcularPoblacionRecurrente({
  plantillaMapa,
  configuracion,
  nivelMapa,
  nivelJugador,
  configuracionEnemigos,
}) {
  validarConfiguracionPoblacion({
    configuracion,
    descripcion: "la población recurrente",
  });

  const cantidadEsperada = calcularCantidadRecurrenteEsperada({
    plantillaMapa,
    configuracion,
  });
  const porEnemigo = calcularValoresPonderadosEnemigo({
    permitidos: configuracion.permitidos,
    probabilidadesVariantes: configuracion.probabilidadesVariantes,
    nivelMapa,
    nivelJugador,
    configuracionEnemigos,
  });

  return congelarProfundamente({
    configurada: true,
    cantidadEsperada: redondear(cantidadEsperada),
    probabilidadAparicion: 100,
    experienciaBrutaPorEnemigo: porEnemigo.experienciaBruta,
    experienciaPorEnemigo: porEnemigo.experienciaAjustada,
    experienciaBrutaEsperada: redondear(
      cantidadEsperada * porEnemigo.experienciaBruta,
    ),
    experienciaEsperada: redondear(
      cantidadEsperada * porEnemigo.experienciaAjustada,
    ),
  });
}

function calcularCantidadRecurrenteEsperada({
  plantillaMapa,
  configuracion,
}) {
  if (!plantillaMapa || typeof plantillaMapa !== "object") {
    throw new Error(
      "El análisis de población necesita la plantilla estructural del mapa.",
    );
  }

  const cacheada = cacheCantidadRecurrenteEsperada.get(plantillaMapa);
  if (Number.isFinite(cacheada)) {
    return cacheada;
  }

  let total = 0;
  const identidadMapa =
    typeof plantillaMapa.nombre === "string" && plantillaMapa.nombre.trim() !== ""
      ? plantillaMapa.nombre.trim()
      : "mapa";

  for (let indice = 0; indice < CANTIDAD_MUESTRAS_POBLACION; indice += 1) {
    const aleatorio = crearGeneradorAleatorio(
      `balance:poblacion:${identidadMapa}:${indice}`,
    );
    const terreno = generarTerreno({ plantilla: plantillaMapa, aleatorio });
    const contextoPoblacion = crearContextoPoblacion({
      terreno,
      posicionJugador: terreno.posicionInicialSugerida,
      aleatorio,
      configuracion,
    });

    total += calcularCantidadEnemigosRecurrentes({
      configuracion,
      contextoPoblacion,
    });
  }

  const cantidadEsperada = total / CANTIDAD_MUESTRAS_POBLACION;
  cacheCantidadRecurrenteEsperada.set(plantillaMapa, cantidadEsperada);
  return cantidadEsperada;
}

function calcularPoblacionUnica({
  configuracion,
  nivelMapa,
  nivelJugador,
  configuracionEnemigos,
}) {
  if (configuracion === null || configuracion === undefined) {
    return congelarProfundamente({
      configurada: false,
      cantidadEsperada: 0,
      probabilidadAparicion: 0,
      experienciaBrutaPorEnemigo: 0,
      experienciaPorEnemigo: 0,
      experienciaBrutaEsperada: 0,
      experienciaEsperada: 0,
    });
  }

  validarConfiguracionPoblacion({
    configuracion,
    descripcion: "la población única",
    requiereDensidad: false,
  });
  const probabilidadAparicion = configuracion.probabilidadAparicion;
  const cantidadEsperada = probabilidadAparicion / 100;
  const porEnemigo = calcularValoresPonderadosEnemigo({
    permitidos: configuracion.permitidos,
    probabilidadesVariantes: configuracion.probabilidadesVariantes,
    nivelMapa,
    nivelJugador,
    configuracionEnemigos,
  });

  return congelarProfundamente({
    configurada: true,
    cantidadEsperada: redondear(cantidadEsperada),
    probabilidadAparicion,
    experienciaBrutaPorEnemigo: porEnemigo.experienciaBruta,
    experienciaPorEnemigo: porEnemigo.experienciaAjustada,
    experienciaBrutaEsperada: redondear(
      cantidadEsperada * porEnemigo.experienciaBruta,
    ),
    experienciaEsperada: redondear(
      cantidadEsperada * porEnemigo.experienciaAjustada,
    ),
  });
}

function calcularValoresPonderadosEnemigo({
  permitidos,
  probabilidadesVariantes,
  nivelMapa,
  nivelJugador,
  configuracionEnemigos,
}) {
  validarListaPonderada(permitidos);
  validarProbabilidadesVariantes(probabilidadesVariantes);

  const pesoTotal = permitidos.reduce(
    (total, entrada) => total + entrada.peso,
    0,
  );
  let experienciaBruta = 0;
  let experienciaAjustada = 0;

  for (const entrada of permitidos) {
    const pesoPlantilla = entrada.peso / pesoTotal;

    for (const [idVariante, probabilidad] of Object.entries(
      probabilidadesVariantes,
    )) {
      if (probabilidad === 0) continue;

      const datos = calcularDatosEnemigo({
        configuracionEnemigos,
        idPlantilla: entrada.id,
        nivel: nivelMapa,
        idVariante: idVariante === "normal" ? null : idVariante,
      });
      const recompensa = calcularRecompensaExperiencia({
        experienciaBase: datos.experienciaOtorgada,
        nivelJugador,
        nivelEnemigo: nivelMapa,
      });
      const pesoCombinacion = pesoPlantilla * (probabilidad / 100);

      experienciaBruta += datos.experienciaOtorgada * pesoCombinacion;
      experienciaAjustada += recompensa.experienciaFinal * pesoCombinacion;
    }
  }

  return {
    experienciaBruta: redondear(experienciaBruta),
    experienciaAjustada: redondear(experienciaAjustada),
  };
}

function crearResumen({ rutaRecomendada, objetivosBalance }) {
  const cantidades = {
    correcto: 0,
    demasiadoRapido: 0,
    demasiadoLento: 0,
  };

  for (const fila of rutaRecomendada) {
    if (fila.estado === ESTADOS_BALANCE.CORRECTO) cantidades.correcto += 1;
    if (fila.estado === ESTADOS_BALANCE.DEMASIADO_RAPIDO) {
      cantidades.demasiadoRapido += 1;
    }
    if (fila.estado === ESTADOS_BALANCE.DEMASIADO_LENTO) {
      cantidades.demasiadoLento += 1;
    }
  }

  const expediciones = rutaRecomendada
    .map((fila) => fila.expedicionesEsperadas)
    .filter(Number.isFinite);
  const enemigos = rutaRecomendada
    .map((fila) => fila.enemigosEsperados)
    .filter(Number.isFinite);

  return {
    nivelesAnalizados: rutaRecomendada.length,
    nivelesCorrectos: cantidades.correcto,
    nivelesDemasiadoRapidos: cantidades.demasiadoRapido,
    nivelesDemasiadoLentos: cantidades.demasiadoLento,
    expedicionesMinimas:
      expediciones.length > 0 ? redondear(Math.min(...expediciones)) : null,
    expedicionesMaximas:
      expediciones.length > 0 ? redondear(Math.max(...expediciones)) : null,
    enemigosMinimos:
      enemigos.length > 0 ? redondear(Math.min(...enemigos)) : null,
    enemigosMaximos:
      enemigos.length > 0 ? redondear(Math.max(...enemigos)) : null,
    cumpleObjetivo:
      cantidades.demasiadoRapido === 0 && cantidades.demasiadoLento === 0,
    rangoObjetivo: { ...objetivosBalance.rangoExpedicionesObjetivo },
  };
}

function clasificarExpediciones({ expedicionesEsperadas, minimo, maximo }) {
  if (expedicionesEsperadas < minimo) {
    return ESTADOS_BALANCE.DEMASIADO_RAPIDO;
  }
  if (expedicionesEsperadas > maximo) {
    return ESTADOS_BALANCE.DEMASIADO_LENTO;
  }
  return ESTADOS_BALANCE.CORRECTO;
}

function validarObjetivosBalance({ objetivosBalance, configuracionMapas }) {
  validarObjeto({
    valor: objetivosBalance,
    descripcion: "la configuración de objetivos de balance",
  });
  if (
    !Number.isInteger(objetivosBalance.nivelMaximoContenido) ||
    objetivosBalance.nivelMaximoContenido < 1
  ) {
    throw new Error("El nivel máximo de contenido no es válido.");
  }

  const rango = objetivosBalance.rangoExpedicionesObjetivo;
  if (
    !rango ||
    !Number.isFinite(rango.minimo) ||
    !Number.isFinite(rango.maximo) ||
    rango.minimo <= 0 ||
    rango.maximo < rango.minimo
  ) {
    throw new Error("El rango objetivo de expediciones no es válido.");
  }

  const factorEsperado = objetivosBalance.factorBaseExperienciaEsperado;
  const factorReal =
    CONFIGURACION_RECOMPENSAS_EXPERIENCIA.factorBaseExperienciaEnemigos;
  if (factorEsperado !== factorReal) {
    throw new Error(
      "El factor base declarado en ObjetivosBalance.json " +
        `es ${factorEsperado}, pero el sistema utiliza ${factorReal}.`,
    );
  }

  if (
    !Array.isArray(objetivosBalance.rutaRecomendada) ||
    objetivosBalance.rutaRecomendada.length === 0
  ) {
    throw new Error(
      "La ruta recomendada de balance debe contener al menos un paso.",
    );
  }

  const nivelesJugador = new Set();
  for (const paso of objetivosBalance.rutaRecomendada) {
    validarNivel({
      nivel: paso.nivelJugador,
      descripcion: "El nivel del jugador de la ruta",
    });
    validarNivel({
      nivel: paso.nivelMapa,
      descripcion: "El nivel del mapa de la ruta",
    });
    if (nivelesJugador.has(paso.nivelJugador)) {
      throw new Error(
        `El nivel ${paso.nivelJugador} está repetido en la ruta recomendada.`,
      );
    }
    nivelesJugador.add(paso.nivelJugador);

    const plantillaMapa = configuracionMapas.plantillas[paso.idMapa];
    if (!plantillaMapa) {
      throw new Error(
        `La ruta recomienda el mapa inexistente "${paso.idMapa}".`,
      );
    }
    validarNivelDentroMapa({ plantillaMapa, nivelMapa: paso.nivelMapa });
    if (paso.nivelJugador < plantillaMapa.nivelDesbloqueo) {
      throw new Error(
        `El mapa "${paso.idMapa}" está bloqueado para el nivel ` +
          `${paso.nivelJugador}.`,
      );
    }
  }
}

function validarParametros({
  configuracionMapas,
  configuracionEnemigos,
  objetivosBalance,
}) {
  validarObjeto({
    valor: configuracionMapas,
    descripcion: "la configuración de mapas",
  });
  validarObjeto({
    valor: configuracionMapas.plantillas,
    descripcion: "las plantillas de mapas",
  });
  validarConfiguracionEnemigos(configuracionEnemigos);
  validarObjeto({
    valor: objetivosBalance,
    descripcion: "los objetivos de balance",
  });
}

function validarConfiguracionEnemigos(configuracionEnemigos) {
  validarObjeto({
    valor: configuracionEnemigos,
    descripcion: "la configuración de enemigos",
  });
  validarObjeto({
    valor: configuracionEnemigos.plantillas,
    descripcion: "las plantillas de enemigos",
  });
  validarObjeto({
    valor: configuracionEnemigos.variantes,
    descripcion: "las variantes de enemigos",
  });
}

function validarConfiguracionPoblacion({
  configuracion,
  descripcion,
  requiereDensidad = true,
}) {
  validarObjeto({ valor: configuracion, descripcion });
  validarListaPonderada(configuracion.permitidos);
  validarProbabilidadesVariantes(configuracion.probabilidadesVariantes);

  if (requiereDensidad) {
    if (
      !Number.isFinite(configuracion.densidadPor100Casillas) ||
      configuracion.densidadPor100Casillas < 0
    ) {
      throw new Error(`La densidad de ${descripcion} no es válida.`);
    }
    if (
      !Number.isFinite(configuracion.probabilidadZonaPoblada) ||
      configuracion.probabilidadZonaPoblada < 0 ||
      configuracion.probabilidadZonaPoblada > 100
    ) {
      throw new Error(
        `La probabilidad de zona poblada de ${descripcion} no es válida.`,
      );
    }
    return;
  }

  if (
    !Number.isFinite(configuracion.probabilidadAparicion) ||
    configuracion.probabilidadAparicion < 0 ||
    configuracion.probabilidadAparicion > 100
  ) {
    throw new Error(
      `La probabilidad de aparición de ${descripcion} no es válida.`,
    );
  }
}

function validarProbabilidadesVariantes(probabilidades) {
  validarObjeto({
    valor: probabilidades,
    descripcion: "las probabilidades de variantes",
  });
  const total = Object.values(probabilidades).reduce((suma, probabilidad) => {
    if (!Number.isFinite(probabilidad) || probabilidad < 0) {
      throw new Error("Existe una probabilidad de variante inválida.");
    }
    return suma + probabilidad;
  }, 0);
  if (total !== 100) {
    throw new Error("Las probabilidades de variantes deben sumar 100.");
  }
}

function validarListaPonderada(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    throw new Error(
      "La selección ponderada debe contener al menos una entrada.",
    );
  }
  for (const entrada of lista) {
    if (
      typeof entrada.id !== "string" ||
      entrada.id.trim() === "" ||
      !Number.isFinite(entrada.peso) ||
      entrada.peso <= 0
    ) {
      throw new Error("Existe una entrada ponderada inválida.");
    }
  }
}

function validarNivelDentroMapa({ plantillaMapa, nivelMapa }) {
  validarObjeto({ valor: plantillaMapa, descripcion: "la plantilla de mapa" });
  validarNivel({ nivel: nivelMapa, descripcion: "El nivel del mapa" });
  if (
    nivelMapa < plantillaMapa.niveles.minimo ||
    nivelMapa > plantillaMapa.niveles.maximo
  ) {
    throw new Error(
      `El nivel ${nivelMapa} está fuera del rango de "${plantillaMapa.nombre}".`,
    );
  }
}

function validarNivel({ nivel, descripcion }) {
  if (!Number.isInteger(nivel) || nivel < 1) {
    throw new Error(`${descripcion} debe ser un entero mayor que 0.`);
  }
}

function validarObjeto({ valor, descripcion }) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita ${descripcion} válida.`);
  }
}

function numeroFinitoRedondeado(valor) {
  return Number.isFinite(valor) ? redondear(valor) : null;
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
