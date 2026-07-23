import {
  CONFIGURACION_RECOMPENSAS_EXPERIENCIA,
  calcularExperienciaNecesaria,
  obtenerAjusteExperienciaEnemigo,
} from "../progresion/SistemaProgresion.js";

const ESTADOS_BALANCE = Object.freeze({
  CORRECTO: "correcto",
  DEMASIADO_RAPIDO: "demasiado_rapido",
  DEMASIADO_LENTO: "demasiado_lento",
});

// Analiza todos los niveles disponibles en cada mapa
// y la ruta principal definida en ObjetivosBalance.json.
//
// Los cálculos utilizan valores esperados:
//
// - Promedio entre cantidad mínima y máxima.
// - Promedio ponderado de plantillas.
// - Probabilidad media de variantes.
// - Probabilidad de encuentros especiales.
// - Jefes obligatorios o probabilísticos.
export function analizarBalanceProgresion({
  configuracionMapas,
  plantillasEnemigos,
  variantesEnemigos,
  objetivosBalance,
} = {}) {
  validarParametros({
    configuracionMapas,
    plantillasEnemigos,
    variantesEnemigos,
    objetivosBalance,
  });

  validarObjetivosBalance({
    objetivosBalance,
    configuracionMapas,
  });

  const filasMapas = crearFilasTodosLosMapas({
    configuracionMapas,
    plantillasEnemigos,
    variantesEnemigos,
  });

  const filasRuta = crearFilasRutaRecomendada({
    configuracionMapas,
    plantillasEnemigos,
    variantesEnemigos,
    objetivosBalance,
  });

  const resumen = crearResumen({
    filasRuta,
    objetivosBalance,
  });

  return {
    generadoEn: new Date().toISOString(),

    configuracion: {
      nivelMaximoContenido: objetivosBalance.nivelMaximoContenido,

      factorBaseExperiencia:
        CONFIGURACION_RECOMPENSAS_EXPERIENCIA.factorBaseExperienciaEnemigos,

      rangoExpedicionesObjetivo: {
        ...objetivosBalance.rangoExpedicionesObjetivo,
      },
    },

    resumen,
    rutaRecomendada: filasRuta,
    detalleMapas: filasMapas,
  };
}

// Calcula la XP esperada de una expedición concreta.
export function calcularExperienciaEsperadaMapa({
  plantillaMapa,
  nivelMapa,
  nivelJugador,
  plantillasEnemigos,
  variantesEnemigos,
} = {}) {
  validarNivelDentroMapa({
    plantillaMapa,
    nivelMapa,
  });

  validarNivel({
    nivel: nivelJugador,

    descripcion: "El nivel del jugador",
  });

  const recurrentes = calcularPoblacionRecurrente({
    configuracion: plantillaMapa.enemigos,

    nivelMapa,
    plantillasEnemigos,
    variantesEnemigos,
  });

  const especial = calcularPoblacionUnica({
    configuracion: plantillaMapa.encuentroEspecial ?? null,

    nivelMapa,
    plantillasEnemigos,
    variantesEnemigos,
  });

  const jefe = calcularPoblacionUnica({
    configuracion: plantillaMapa.jefe ?? null,

    nivelMapa,
    plantillasEnemigos,
    variantesEnemigos,
  });

  const experienciaBruta =
    recurrentes.experienciaEsperada +
    especial.experienciaEsperada +
    jefe.experienciaEsperada;

  const ajuste = obtenerAjusteExperienciaEnemigo({
    nivelJugador,
    nivelEnemigo: nivelMapa,
  });

  // El juego redondea la XP individual de cada enemigo.
  //
  // El análisis aplica el factor al total esperado,
  // por lo que funciona como una aproximación estadística.
  const experienciaAjustada = experienciaBruta * ajuste.factorTotal;

  return {
    nivelJugador,
    nivelMapa,

    experienciaBruta: redondear(experienciaBruta),

    experienciaAjustada: redondear(experienciaAjustada),

    factorExperiencia: ajuste.factorTotal,

    multiplicadorDiferencia: ajuste.multiplicadorDiferencia,

    diferenciaNiveles: ajuste.diferenciaNiveles,

    recurrentes,
    especial,
    jefe,
  };
}

function crearFilasTodosLosMapas({
  configuracionMapas,
  plantillasEnemigos,
  variantesEnemigos,
}) {
  const filas = [];

  for (const [idMapa, plantillaMapa] of Object.entries(
    configuracionMapas.plantillas,
  )) {
    for (
      let nivelMapa = plantillaMapa.niveles.minimo;
      nivelMapa <= plantillaMapa.niveles.maximo;
      nivelMapa++
    ) {
      const resultado = calcularExperienciaEsperadaMapa({
        plantillaMapa,
        nivelMapa,

        // El detalle general compara siempre
        // una expedición del mismo nivel.
        nivelJugador: nivelMapa,

        plantillasEnemigos,
        variantesEnemigos,
      });

      filas.push({
        idMapa,
        mapa: plantillaMapa.nombre,
        nivelMapa,

        cantidadRecurrentesPromedio: resultado.recurrentes.cantidadEsperada,

        probabilidadEspecial: resultado.especial.probabilidadAparicion,

        probabilidadJefe: resultado.jefe.probabilidadAparicion,

        experienciaRecurrentes: resultado.recurrentes.experienciaEsperada,

        experienciaEspecial: resultado.especial.experienciaEsperada,

        experienciaJefe: resultado.jefe.experienciaEsperada,

        experienciaBruta: resultado.experienciaBruta,

        experienciaAjustada: resultado.experienciaAjustada,
      });
    }
  }

  return filas;
}

function crearFilasRutaRecomendada({
  configuracionMapas,
  plantillasEnemigos,
  variantesEnemigos,
  objetivosBalance,
}) {
  const { minimo, maximo } = objetivosBalance.rangoExpedicionesObjetivo;

  return objetivosBalance.rutaRecomendada.map((paso) => {
    const plantillaMapa = configuracionMapas.plantillas[paso.idMapa];

    const resultado = calcularExperienciaEsperadaMapa({
      plantillaMapa,

      nivelMapa: paso.nivelMapa,

      nivelJugador: paso.nivelJugador,

      plantillasEnemigos,
      variantesEnemigos,
    });

    const experienciaNecesaria = calcularExperienciaNecesaria(
      paso.nivelJugador,
    );

    const expedicionesEsperadas =
      resultado.experienciaAjustada > 0
        ? experienciaNecesaria / resultado.experienciaAjustada
        : Infinity;

    const estado = clasificarExpediciones({
      expedicionesEsperadas,
      minimo,
      maximo,
    });

    return {
      nivelJugador: paso.nivelJugador,

      siguienteNivel: paso.nivelJugador + 1,

      idMapa: paso.idMapa,

      mapa: plantillaMapa.nombre,

      nivelMapa: paso.nivelMapa,

      experienciaNecesaria,

      experienciaBruta: resultado.experienciaBruta,

      experienciaEsperada: resultado.experienciaAjustada,

      expedicionesEsperadas: Number.isFinite(expedicionesEsperadas)
        ? redondear(expedicionesEsperadas)
        : null,

      estado,

      diferenciaNiveles: resultado.diferenciaNiveles,

      factorExperiencia: resultado.factorExperiencia,
    };
  });
}

function calcularPoblacionRecurrente({
  configuracion,
  nivelMapa,
  plantillasEnemigos,
  variantesEnemigos,
}) {
  validarConfiguracionPoblacion({
    configuracion,
    descripcion: "la población recurrente",
  });

  const cantidadEsperada = promedio(
    configuracion.cantidad.minimo,

    configuracion.cantidad.maximo,
  );

  const experienciaPlantilla = calcularExperienciaPonderadaPlantillas({
    permitidos: configuracion.permitidos,
    nivelMapa,
    plantillasEnemigos,
  });

  const multiplicadorVariantes = calcularMultiplicadorVariantesEsperado({
    probabilidades: configuracion.probabilidadesVariantes,

    variantesEnemigos,
  });

  const experienciaEsperada =
    cantidadEsperada * experienciaPlantilla * multiplicadorVariantes;

  return {
    configurada: true,
    cantidadEsperada: redondear(cantidadEsperada),
    probabilidadAparicion: 100,
    experienciaPlantilla: redondear(experienciaPlantilla),
    multiplicadorVariantes: redondear(multiplicadorVariantes),
    experienciaEsperada: redondear(experienciaEsperada),
  };
}

function calcularPoblacionUnica({
  configuracion,
  nivelMapa,
  plantillasEnemigos,
  variantesEnemigos,
}) {
  if (configuracion === null || configuracion === undefined) {
    return {
      configurada: false,
      cantidadEsperada: 0,
      probabilidadAparicion: 0,
      experienciaPlantilla: 0,
      multiplicadorVariantes: 0,
      experienciaEsperada: 0,
    };
  }

  validarConfiguracionPoblacion({
    configuracion,
    descripcion: "la población única",
    requiereCantidad: false,
  });

  const probabilidadAparicion = configuracion.probabilidadAparicion;

  const experienciaPlantilla = calcularExperienciaPonderadaPlantillas({
    permitidos: configuracion.permitidos,
    nivelMapa,
    plantillasEnemigos,
  });

  const multiplicadorVariantes = calcularMultiplicadorVariantesEsperado({
    probabilidades: configuracion.probabilidadesVariantes,
    variantesEnemigos,
  });

  const cantidadEsperada = probabilidadAparicion / 100;

  const experienciaEsperada =
    cantidadEsperada * experienciaPlantilla * multiplicadorVariantes;

  return {
    configurada: true,
    cantidadEsperada: redondear(cantidadEsperada),
    probabilidadAparicion,
    experienciaPlantilla: redondear(experienciaPlantilla),
    multiplicadorVariantes: redondear(multiplicadorVariantes),
    experienciaEsperada: redondear(experienciaEsperada),
  };
}

function calcularExperienciaPonderadaPlantillas({
  permitidos,
  nivelMapa,
  plantillasEnemigos,
}) {
  validarListaPonderada(permitidos);

  const pesoTotal = permitidos.reduce(
    (total, entrada) => total + entrada.peso,
    0,
  );

  return permitidos.reduce((total, entrada) => {
    const plantillaEnemigo = plantillasEnemigos[entrada.id];

    if (!plantillaEnemigo) {
      throw new Error(`No existe la plantilla de enemigo "${entrada.id}".`);
    }

    const experiencia = calcularExperienciaPlantilla({
      plantillaEnemigo,
      nivel: nivelMapa,
    });

    return total + experiencia * (entrada.peso / pesoTotal);
  }, 0);
}

function calcularExperienciaPlantilla({ plantillaEnemigo, nivel }) {
  const nivelesPermitidos = plantillaEnemigo.nivelesPermitidos;

  if (
    !nivelesPermitidos ||
    nivel < nivelesPermitidos.minimo ||
    nivel > nivelesPermitidos.maximo
  ) {
    throw new Error(`${plantillaEnemigo.nombre} no permite el nivel ${nivel}.`);
  }

  let experiencia = plantillaEnemigo.baseNivel1.experienciaOtorgada;

  const reglaEscalado = plantillaEnemigo.escalado?.experienciaOtorgada;

  if (reglaEscalado) {
    const cantidadAumentos = Math.floor(
      (nivel - 1) / reglaEscalado.cadaNiveles,
    );

    experiencia += cantidadAumentos * reglaEscalado.aumento;
  }

  const hitos = Array.isArray(plantillaEnemigo.hitos)
    ? [...plantillaEnemigo.hitos].sort(
        (hitoA, hitoB) => hitoA.nivel - hitoB.nivel,
      )
    : [];

  for (const hito of hitos) {
    if (nivel < hito.nivel) {
      continue;
    }

    if (hito.cambios?.experienciaOtorgada !== undefined) {
      experiencia = hito.cambios.experienciaOtorgada;
    }
  }

  if (!Number.isFinite(experiencia) || experiencia < 0) {
    throw new Error(
      `La experiencia calculada de "${plantillaEnemigo.nombre}" no es válida.`,
    );
  }

  return experiencia;
}

function calcularMultiplicadorVariantesEsperado({
  probabilidades,
  variantesEnemigos,
}) {
  if (
    probabilidades === null ||
    typeof probabilidades !== "object" ||
    Array.isArray(probabilidades)
  ) {
    throw new Error("Las probabilidades de variantes no son válidas.");
  }

  let totalProbabilidades = 0;
  let multiplicadorEsperado = 0;

  for (const [idVariante, probabilidad] of Object.entries(probabilidades)) {
    if (!Number.isFinite(probabilidad) || probabilidad < 0) {
      throw new Error(
        `La probabilidad de la variante "${idVariante}" no es válida.`,
      );
    }

    totalProbabilidades += probabilidad;

    const multiplicador =
      idVariante === "normal"
        ? 1
        : obtenerMultiplicadorVariante({
            idVariante,
            variantesEnemigos,
          });

    multiplicadorEsperado += (probabilidad / 100) * multiplicador;
  }

  if (totalProbabilidades !== 100) {
    throw new Error("Las probabilidades de variantes deben sumar 100.");
  }

  return multiplicadorEsperado;
}

function obtenerMultiplicadorVariante({ idVariante, variantesEnemigos }) {
  const variante = variantesEnemigos[idVariante];

  if (!variante) {
    throw new Error(`No existe la variante "${idVariante}".`);
  }

  const multiplicador = variante.multiplicadorExperiencia ?? 1;

  if (!Number.isFinite(multiplicador) || multiplicador < 0) {
    throw new Error(
      `La variante "${idVariante}" tiene un multiplicador de experiencia inválido.`,
    );
  }

  return multiplicador;
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

function crearResumen({ filasRuta, objetivosBalance }) {
  const cantidades = {
    correcto: 0,
    demasiadoRapido: 0,
    demasiadoLento: 0,
  };

  for (const fila of filasRuta) {
    switch (fila.estado) {
      case ESTADOS_BALANCE.CORRECTO:
        cantidades.correcto++;
        break;

      case ESTADOS_BALANCE.DEMASIADO_RAPIDO:
        cantidades.demasiadoRapido++;
        break;

      case ESTADOS_BALANCE.DEMASIADO_LENTO:
        cantidades.demasiadoLento++;
        break;
    }
  }

  const expediciones = filasRuta
    .map((fila) => fila.expedicionesEsperadas)
    .filter(Number.isFinite);

  return {
    nivelesAnalizados: filasRuta.length,

    nivelesCorrectos: cantidades.correcto,

    nivelesDemasiadoRapidos: cantidades.demasiadoRapido,

    nivelesDemasiadoLentos: cantidades.demasiadoLento,

    expedicionesMinimas:
      expediciones.length > 0 ? redondear(Math.min(...expediciones)) : null,

    expedicionesMaximas:
      expediciones.length > 0 ? redondear(Math.max(...expediciones)) : null,

    cumpleObjetivo:
      cantidades.demasiadoRapido === 0 && cantidades.demasiadoLento === 0,

    rangoObjetivo: {
      ...objetivosBalance.rangoExpedicionesObjetivo,
    },
  };
}

function validarObjetivosBalance({ objetivosBalance, configuracionMapas }) {
  if (
    objetivosBalance === null ||
    typeof objetivosBalance !== "object" ||
    Array.isArray(objetivosBalance)
  ) {
    throw new Error("La configuración de objetivos de balance no es válida.");
  }

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

    validarNivelDentroMapa({
      plantillaMapa,
      nivelMapa: paso.nivelMapa,
    });

    if (paso.nivelJugador < plantillaMapa.nivelDesbloqueo) {
      throw new Error(
        `El mapa "${paso.idMapa}" todavía está bloqueado para ` +
          `el jugador de nivel ${paso.nivelJugador}.`,
      );
    }
  }
}

function validarParametros({
  configuracionMapas,
  plantillasEnemigos,
  variantesEnemigos,
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

  validarObjeto({
    valor: plantillasEnemigos,
    descripcion: "las plantillas de enemigos",
  });

  validarObjeto({
    valor: variantesEnemigos,
    descripcion: "las variantes de enemigos",
  });

  validarObjeto({
    valor: objetivosBalance,
    descripcion: "los objetivos de balance",
  });
}

function validarConfiguracionPoblacion({
  configuracion,
  descripcion,
  requiereCantidad = true,
}) {
  validarObjeto({
    valor: configuracion,
    descripcion,
  });

  validarListaPonderada(configuracion.permitidos);

  validarObjeto({
    valor: configuracion.probabilidadesVariantes,

    descripcion: `las variantes de ${descripcion}`,
  });

  if (requiereCantidad) {
    const cantidad = configuracion.cantidad;

    if (
      !cantidad ||
      !Number.isInteger(cantidad.minimo) ||
      !Number.isInteger(cantidad.maximo) ||
      cantidad.minimo < 0 ||
      cantidad.maximo < cantidad.minimo
    ) {
      throw new Error(`La cantidad de ${descripcion} no es válida.`);
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
  validarObjeto({
    valor: plantillaMapa,
    descripcion: "la plantilla de mapa",
  });

  validarNivel({
    nivel: nivelMapa,

    descripcion: "El nivel del mapa",
  });

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

function promedio(minimo, maximo) {
  return (minimo + maximo) / 2;
}

function redondear(valor) {
  return Number(valor.toFixed(2));
}
