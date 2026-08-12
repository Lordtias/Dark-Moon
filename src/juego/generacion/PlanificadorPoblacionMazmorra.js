import { calcularDatosEnemigo } from "../fabricas/FabricaEnemigos.js";
import { crearGeneradorAleatorio } from "./GeneradorAleatorio.js";
import { crearClave, seleccionarPonderado } from "./UtilidadesPoblacionMazmorra.js";

export const TIPOS_HABITACION_POBLACION = Object.freeze({
  ENTRADA: "entrada",
  AMBIENTAL: "ambiental",
  POBLACION: "poblacion",
  ESPECIAL: "especial",
});

const DIMENSIONES_PRESUPUESTO = Object.freeze([
  "ocupacion",
  "amenaza",
  "valorRecompensa",
]);

// Construye el contrato canónico de uso de habitaciones a partir del plano ya
// generado. No crea geometría: clasifica habitaciones, reserva las ambientales
// y asigna un presupuesto compartido por todos los pobladores actuales y futuros.
export function crearPlanPoblacionMazmorra({
  plantilla,
  terreno,
  posicionJugador,
  aleatorio,
} = {}) {
  validarEntradaPlan({ plantilla, terreno, posicionJugador, aleatorio });

  const idHabitacionEntrada = terreno.zonaEntrada?.idHabitacion ?? null;
  const idHabitacionEspecial = terreno.salidaEstructural?.idHabitacion ?? null;

  if (!idHabitacionEntrada || !idHabitacionEspecial) {
    throw new Error(
      "El plano necesita identificar las habitaciones de entrada y salida para planificar su población.",
    );
  }

  const clavesReservadas = new Set(
    (terreno.casillasReservadasContenido ?? []).map(crearClave),
  );
  const zonasBase = (terreno.zonasCandidatasPoblacion ?? []).map((zona) => {
    const posicionesDisponibles = (zona.casillas ?? []).filter(
      (posicion) =>
        !sonMismaPosicion(posicion, posicionJugador) &&
        !clavesReservadas.has(crearClave(posicion)),
    );

    return {
      idHabitacion: zona.idHabitacion,
      posicionesBase: posicionesDisponibles,
    };
  });
  const idsCandidatosAmbientales = zonasBase
    .filter((zona) => zona.idHabitacion !== idHabitacionEspecial)
    .map((zona) => zona.idHabitacion);
  const aleatorioReservas = crearGeneradorAleatorio(
    `${aleatorio.semilla}:${plantilla.bioma ?? plantilla.nombre}:reservas_ambientales`,
  );
  const configuracionReservas = plantilla.habitaciones.ambientales;
  const cantidadAmbientales = aleatorioReservas.entero(
    configuracionReservas.minimo,
    configuracionReservas.maximo,
  );

  if (idsCandidatosAmbientales.length < cantidadAmbientales) {
    throw new Error(
      `El mapa "${plantilla.nombre}" no dispone de ${cantidadAmbientales} habitaciones elegibles para la reserva ambiental configurada.`,
    );
  }

  const idsAmbientales = new Set(
    aleatorioReservas
      .mezclar(idsCandidatosAmbientales)
      .slice(0, cantidadAmbientales),
  );

  const configuracionPerfiles = plantilla.habitaciones?.perfiles ?? null;
  const aleatorioPerfiles = configuracionPerfiles
    ? crearGeneradorAleatorio(
        `${aleatorio.semilla}:${plantilla.bioma ?? plantilla.nombre}:perfiles_habitacion`,
      )
    : null;
  const perfilesNormalesPorHabitacion = configuracionPerfiles
    ? asignarPerfilesPorCupos({
        idsHabitaciones: zonasBase
          .map((zona) => zona.idHabitacion)
          .filter(
            (idHabitacion) =>
              idHabitacion !== idHabitacionEspecial &&
              !idsAmbientales.has(idHabitacion),
          ),
        configuracionPerfiles,
        aleatorio: aleatorioPerfiles,
        nombreMapa: plantilla.nombre,
      })
    : new Map();

  const zonas = zonasBase.map(({ idHabitacion, posicionesBase }) => {
    const esEspecial = idHabitacion === idHabitacionEspecial;
    const esAmbiental = idsAmbientales.has(idHabitacion);
    const tipoUso = esEspecial
      ? TIPOS_HABITACION_POBLACION.ESPECIAL
      : esAmbiental
        ? TIPOS_HABITACION_POBLACION.AMBIENTAL
        : TIPOS_HABITACION_POBLACION.POBLACION;
    const perfil = esAmbiental
      ? plantilla.habitaciones?.perfilAmbiental?.id ?? null
      : esEspecial
        ? plantilla.habitaciones?.perfilEspecial?.id ?? null
        : perfilesNormalesPorHabitacion.get(idHabitacion) ?? null;
    const presupuestoInicial = esAmbiental
      ? crearVectorPresupuestoCero()
      : calcularPresupuestoHabitacion({
          cantidadCasillas: posicionesBase.length,
          configuracion: plantilla.poblacion.presupuestoHabitacion,
          multiplicador: esEspecial
            ? plantilla.poblacion.multiplicadorHabitacionEspecial ?? 1
            : 1,
        });

    return {
      idHabitacion,
      tipoUso,
      esEspecial,
      esAmbiental,
      perfil,
      composicion: null,
      orientacionComposicion: null,
      origenComposicion: null,
      activaInicial:
        esEspecial ||
        (!esAmbiental &&
          aleatorio.siguiente() * 100 <
            plantilla.enemigos.probabilidadZonaPoblada),
      activadaPorCapacidad: false,
      cantidadEnemigosRecurrentes: 0,
      cantidadEnemigosUnicos: 0,
      cantidadCasillasCandidatas: posicionesBase.length,
      posicionesDisponibles: aleatorio.mezclar(posicionesBase),
      presupuestoInicial,
      presupuestoConsumido: crearVectorPresupuestoCero(),
      componentesConsumidos: [],
    };
  });
  const zonasEspeciales = zonas.filter((zona) => zona.esEspecial);

  if (zonasEspeciales.length !== 1) {
    throw new Error(
      "El plano debe producir exactamente una zona asociada a la salida estructural.",
    );
  }

  const zonasPoblables = zonas.filter((zona) => !zona.esAmbiental);

  return {
    estrategia: "presupuesto_por_habitacion",
    estrategiaHabitaciones: configuracionPerfiles
      ? "cupos_y_composiciones"
      : "poblacion_historica",
    idHabitacionEntrada,
    idHabitacionEspecial,
    cantidadHabitacionesAmbientales: idsAmbientales.size,
    idsHabitacionesAmbientales: [...idsAmbientales].sort(),
    zonaEspecial: zonasEspeciales[0],
    zonasNormales: zonas.filter(
      (zona) => !zona.esEspecial && !zona.esAmbiental,
    ),
    zonasAmbientales: zonas.filter((zona) => zona.esAmbiental),
    zonas,
    cantidadCasillasCandidatas: zonasPoblables.reduce(
      (total, zona) => total + zona.cantidadCasillasCandidatas,
      0,
    ),
    cantidadCasillasAmbientales: zonas
      .filter((zona) => zona.esAmbiental)
      .reduce((total, zona) => total + zona.cantidadCasillasCandidatas, 0),
  };
}

// Toda contribución al presupuesto se expresa como componentes. La ecuación
// canónica suma esos componentes sobre las mismas dimensiones, permitiendo que
// nuevos sistemas agreguen fuentes de coste sin crear cálculos paralelos.
export function calcularCostoPoblacion(componentes = []) {
  if (!Array.isArray(componentes)) {
    throw new Error("Los componentes de población deben formar una lista.");
  }

  const total = crearVectorPresupuestoCero();
  const detalle = componentes.map((componente, indice) => {
    validarComponente(componente, indice);
    const normalizado = {
      tipo: componente.tipo,
      ocupacion: normalizarCosto(componente.ocupacion),
      amenaza: normalizarCosto(componente.amenaza),
      valorRecompensa: normalizarCosto(componente.valorRecompensa),
    };

    for (const dimension of DIMENSIONES_PRESUPUESTO) {
      total[dimension] += normalizado[dimension];
    }

    return normalizado;
  });

  return {
    ...redondearVector(total),
    componentes: detalle,
  };
}

export function calcularCostoEnemigoPoblacion({
  configuracionEnemigos,
  configuracionObjetos,
  idPlantilla,
  nivel,
  idVariante = null,
  tablaBotinAdicional = [],
} = {}) {
  const datos = calcularDatosEnemigo({
    configuracionEnemigos,
    idPlantilla,
    nivel,
    idVariante,
  });
  const tablaBotin = [
    ...(datos.tablaBotin ?? []),
    ...(tablaBotinAdicional ?? []),
  ];

  return calcularCostoPoblacion([
    {
      tipo: "presencia_fisica",
      ocupacion: 1,
    },
    {
      tipo: "amenaza_enemigo",
      amenaza: datos.experienciaOtorgada ?? 0,
    },
    {
      tipo: "botin_esperado",
      valorRecompensa: calcularValorEsperadoTablaBotin({
        tablaBotin,
        configuracionObjetos,
      }),
    },
  ]);
}

export function calcularCostoCofrePoblacion({
  tablaBotin,
  configuracionObjetos,
} = {}) {
  return calcularCostoPoblacion([
    {
      tipo: "presencia_fisica",
      ocupacion: 1,
    },
    {
      tipo: "botin_esperado",
      valorRecompensa: calcularValorEsperadoTablaBotin({
        tablaBotin,
        configuracionObjetos,
      }),
    },
  ]);
}

export function calcularCostoDestructiblePoblacion({
  tablaBotin = [],
  configuracionObjetos = null,
} = {}) {
  return calcularCostoPoblacion([
    {
      tipo: "presencia_fisica",
      ocupacion: 1,
    },
    {
      tipo: "botin_esperado",
      valorRecompensa:
        tablaBotin.length > 0
          ? calcularValorEsperadoTablaBotin({
              tablaBotin,
              configuracionObjetos,
            })
          : 0,
    },
  ]);
}

export function puedeConsumirPresupuesto(zona, costo) {
  validarZonaPresupuesto(zona);
  validarCosto(costo);

  return DIMENSIONES_PRESUPUESTO.every(
    (dimension) =>
      zona.presupuestoConsumido[dimension] + costo[dimension] <=
      zona.presupuestoInicial[dimension] + 1e-9,
  );
}

export function consumirPresupuesto({ zona, costo, origen } = {}) {
  validarZonaPresupuesto(zona);
  validarCosto(costo);

  if (typeof origen !== "string" || origen.trim() === "") {
    throw new Error("El consumo de presupuesto necesita un origen válido.");
  }

  if (!puedeConsumirPresupuesto(zona, costo)) {
    return false;
  }

  for (const dimension of DIMENSIONES_PRESUPUESTO) {
    zona.presupuestoConsumido[dimension] = redondear(
      zona.presupuestoConsumido[dimension] + costo[dimension],
      2,
    );
  }
  zona.componentesConsumidos.push({
    origen: origen.trim(),
    ocupacion: costo.ocupacion,
    amenaza: costo.amenaza,
    valorRecompensa: costo.valorRecompensa,
  });

  return true;
}

export function crearResumenPlanPoblacion(plan) {
  if (!plan || !Array.isArray(plan.zonas)) {
    throw new Error("Se necesita un plan de población válido para resumirlo.");
  }

  return {
    estrategia: plan.estrategia,
    estrategiaHabitaciones: plan.estrategiaHabitaciones ?? "poblacion_historica",
    idHabitacionEntrada: plan.idHabitacionEntrada,
    idHabitacionEspecial: plan.idHabitacionEspecial,
    cantidadHabitacionesAmbientales: plan.cantidadHabitacionesAmbientales,
    idsHabitacionesAmbientales: [...plan.idsHabitacionesAmbientales],
    cantidadCasillasCandidatas: plan.cantidadCasillasCandidatas,
    cantidadCasillasAmbientales: plan.cantidadCasillasAmbientales,
    habitaciones: plan.zonas.map((zona) => ({
      idHabitacion: zona.idHabitacion,
      tipoUso: zona.tipoUso,
      perfil: zona.perfil,
      composicion: zona.composicion ?? null,
      orientacionComposicion: zona.orientacionComposicion ?? null,
      origenComposicion: zona.origenComposicion
        ? { ...zona.origenComposicion }
        : null,
      zonaEspecial: zona.esEspecial,
      ambiental: zona.esAmbiental,
      cantidadCasillasCandidatas: zona.cantidadCasillasCandidatas,
      presupuestoInicial: { ...zona.presupuestoInicial },
      presupuestoConsumido: { ...zona.presupuestoConsumido },
      presupuestoDisponible: crearVectorDisponible(zona),
      cantidadComponentesConsumidos: zona.componentesConsumidos.length,
    })),
  };
}

export function calcularValorEsperadoTablaBotin({
  tablaBotin,
  configuracionObjetos,
} = {}) {
  if (!Array.isArray(tablaBotin)) {
    throw new Error("La tabla de botín debe formar una lista.");
  }
  if (
    configuracionObjetos === null ||
    typeof configuracionObjetos !== "object" ||
    Array.isArray(configuracionObjetos)
  ) {
    throw new Error(
      "Se necesita la configuración de objetos para estimar el valor esperado del botín.",
    );
  }

  const total = tablaBotin.reduce((acumulado, entrada) => {
    const plantillaObjeto = configuracionObjetos[entrada.idObjeto];
    if (!plantillaObjeto) {
      throw new Error(
        `No existe el objeto "${entrada.idObjeto}" usado para calcular el valor esperado del botín.`,
      );
    }

    const probabilidad = Number(entrada.probabilidad ?? 0) / 100;
    const cantidadMinima = Number(entrada.cantidadMinima ?? 1);
    const cantidadMaxima = Number(
      entrada.cantidadMaxima ?? entrada.cantidadMinima ?? 1,
    );
    const cantidadEsperada = (cantidadMinima + cantidadMaxima) / 2;
    const valorBase = Number(plantillaObjeto.valorBase ?? 0);

    return acumulado + probabilidad * cantidadEsperada * valorBase;
  }, 0);

  return redondear(total, 2);
}

function asignarPerfilesPorCupos({
  idsHabitaciones,
  configuracionPerfiles,
  aleatorio,
  nombreMapa,
}) {
  if (!Array.isArray(idsHabitaciones)) {
    throw new Error("La asignación de perfiles necesita habitaciones normales.");
  }
  if (!aleatorio) {
    throw new Error(
      "La asignación por cupos necesita un generador aleatorio derivado.",
    );
  }

  const perfiles = configuracionPerfiles.normales.map((perfil) => ({
    ...perfil,
    asignadas: 0,
  }));
  const idsMezclados = aleatorio.mezclar([...idsHabitaciones]);
  const asignaciones = [];

  for (const perfil of perfiles) {
    for (let indice = 0; indice < perfil.cupo.minimo; indice++) {
      asignaciones.push(perfil.id);
      perfil.asignadas += 1;
    }
  }

  if (asignaciones.length > idsMezclados.length) {
    throw new Error(
      `Los cupos mínimos de "${nombreMapa}" requieren más habitaciones normales de las disponibles.`,
    );
  }

  while (asignaciones.length < idsMezclados.length) {
    const candidatos = perfiles
      .filter((perfil) => perfil.asignadas < perfil.cupo.maximo)
      .map((perfil) => ({
        id: perfil.id,
        peso: perfil.pesoRestante,
        perfil,
      }));

    if (candidatos.length === 0) {
      throw new Error(
        `Los cupos máximos de "${nombreMapa}" no cubren todas sus habitaciones normales.`,
      );
    }

    const seleccionado = seleccionarPonderado(candidatos, aleatorio);
    seleccionado.perfil.asignadas += 1;
    asignaciones.push(seleccionado.id);
  }

  const perfilesMezclados = aleatorio.mezclar(asignaciones);
  return new Map(
    idsMezclados.map((idHabitacion, indice) => [
      idHabitacion,
      perfilesMezclados[indice],
    ]),
  );
}

function calcularPresupuestoHabitacion({
  cantidadCasillas,
  configuracion,
  multiplicador = 1,
}) {
  const resultado = {};

  for (const dimension of DIMENSIONES_PRESUPUESTO) {
    const regla = configuracion[dimension];
    const calculado = cantidadCasillas * (regla.por100Casillas / 100);
    const base = Math.max(regla.minimo, calculado);
    const limitado = Number.isFinite(regla.maximo)
      ? Math.min(base, regla.maximo)
      : base;
    resultado[dimension] = redondear(limitado * multiplicador, 2);
  }

  return resultado;
}

function crearVectorDisponible(zona) {
  const resultado = {};
  for (const dimension of DIMENSIONES_PRESUPUESTO) {
    resultado[dimension] = redondear(
      Math.max(
        0,
        zona.presupuestoInicial[dimension] -
          zona.presupuestoConsumido[dimension],
      ),
      2,
    );
  }
  return resultado;
}

function crearVectorPresupuestoCero() {
  return {
    ocupacion: 0,
    amenaza: 0,
    valorRecompensa: 0,
  };
}

function redondearVector(vector) {
  return Object.fromEntries(
    DIMENSIONES_PRESUPUESTO.map((dimension) => [
      dimension,
      redondear(vector[dimension], 2),
    ]),
  );
}

function validarEntradaPlan({ plantilla, terreno, posicionJugador, aleatorio }) {
  if (!plantilla?.habitaciones?.ambientales) {
    throw new Error(
      "La plantilla necesita configuración canónica de población y habitaciones ambientales.",
    );
  }
  if (!plantilla.poblacion.presupuestoHabitacion) {
    throw new Error(
      "La plantilla necesita un presupuesto canónico por habitación.",
    );
  }
  if (!Array.isArray(terreno?.zonasCandidatasPoblacion)) {
    throw new Error("El terreno necesita zonas candidatas de población.");
  }
  if (
    !posicionJugador ||
    !Number.isInteger(posicionJugador.x) ||
    !Number.isInteger(posicionJugador.y)
  ) {
    throw new Error("La planificación necesita una posición válida del jugador.");
  }
  if (
    !aleatorio ||
    typeof aleatorio.siguiente !== "function" ||
    typeof aleatorio.mezclar !== "function"
  ) {
    throw new Error("La planificación necesita un generador aleatorio válido.");
  }
}

function validarZonaPresupuesto(zona) {
  if (!zona?.presupuestoInicial || !zona?.presupuestoConsumido) {
    throw new Error("La zona no posee un presupuesto de población válido.");
  }
}

function validarCosto(costo) {
  for (const dimension of DIMENSIONES_PRESUPUESTO) {
    if (!Number.isFinite(costo?.[dimension]) || costo[dimension] < 0) {
      throw new Error(`El coste de ${dimension} debe ser un número no negativo.`);
    }
  }
}

function validarComponente(componente, indice) {
  if (
    !componente ||
    typeof componente !== "object" ||
    Array.isArray(componente) ||
    typeof componente.tipo !== "string" ||
    componente.tipo.trim() === ""
  ) {
    throw new Error(
      `El componente de presupuesto ${indice + 1} debe ser un objeto con tipo válido.`,
    );
  }
}

function normalizarCosto(valor) {
  if (valor === undefined) return 0;
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error("Los costes de población deben ser números no negativos.");
  }
  return valor;
}

function sonMismaPosicion(a, b) {
  return a?.x === b?.x && a?.y === b?.y;
}

function redondear(valor, decimales) {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}
