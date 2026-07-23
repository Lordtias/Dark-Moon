import { BotinSuelo } from "../../entidad/interactuable/BotinSuelo.js";

import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";

import { crearObjetoGenerado } from "../objetos/GeneradorObjetoAleatorio.js";

import {
  generarNivelObjeto,
  obtenerNivelBaseObjeto,
} from "../objetos/GeneradorNivelObjeto.js";

import {
  obtenerNivelMinimoGeneracionPlantilla,
  puedeGenerarsePlantilla,
} from "../objetos/ReglasProgresionObjetos.js";

import { RAREZAS_OBJETO } from "../objetos/RarezasObjeto.js";

import { obtenerContextoGeneracionBotin } from "./ContextoGeneracionBotin.js";

// La ventana de botín queda visualmente
// más estable cuando conserva algunas
// posiciones disponibles.
//
// Si una casilla recibe nuevos drops más
// adelante, el contenedor será reconstruido
// con la capacidad necesaria.
const CAPACIDAD_MINIMA_BOTIN = 6;

const RAREZAS_FORZADAS_VALIDAS = new Set(Object.values(RAREZAS_OBJETO));

// Resuelve la tabla de una fuente y coloca
// los objetos generados dentro del mapa.
//
// La fuente puede ser:
//
// - Un enemigo.
// - Un destructible.
// - Un jefe.
// - Cualquier entidad futura que tenga:
//
//   x
//   y
//   tablaBotin
export function generarBotinEnSuelo({
  fuente,
  configuracionObjetos,
  aleatorio,
  interactuables,
} = {}) {
  validarFuente(fuente);

  validarConfiguracionObjetos(configuracionObjetos);

  validarGeneradorAleatorioBotin(aleatorio);

  if (!Array.isArray(interactuables)) {
    throw new Error("Los interactuables deben estar dentro de una lista.");
  }

  const contextoGeneracion = obtenerContextoGeneracionBotin();

  const nivelBaseObjeto = obtenerNivelBaseObjeto({
    fuente,
    nivelMapa: contextoGeneracion.nivelMapa,
  });

  const resultadoTabla = resolverTablaBotin({
    tablaBotin: fuente.tablaBotin,
    configuracionObjetos,
    configuracionGeneracionObjetos:
      contextoGeneracion.configuracionGeneracionObjetos,

    // Esta secuencia conserva las tiradas
    // tradicionales de la tabla.
    aleatorioBotin: aleatorio,

    // Esta segunda secuencia se utiliza
    // solamente para construir instancias.
    aleatorioObjetos: contextoGeneracion.aleatorioObjetos,

    nivelBaseObjeto,
  });

  // Una tabla puede no entregar ningún objeto.
  //
  // En ese caso no se crea una entidad vacía.
  if (resultadoTabla.objetosGenerados.length === 0) {
    return {
      ...resultadoTabla,
      botin: null,
      botinCreado: false,
      botinActualizado: false,
    };
  }

  const resultadoSuelo = crearOActualizarBotinSuelo({
    x: fuente.x,
    y: fuente.y,
    objetosNuevos: resultadoTabla.objetosGenerados,
    interactuables,
  });

  return {
    ...resultadoTabla,
    ...resultadoSuelo,
  };
}

// Procesa independientemente cada entrada
// de una tabla de botín.
//
// Formato:
//
// {
//   "idObjeto": "espada_acero",
//   "probabilidad": 100,
//   "cantidadMinima": 1,
//   "cantidadMaxima": 1,
//   "rarezaForzada": "magico"
// }
//
// rarezaForzada es opcional. Cuando existe,
// la instancia utiliza esa rareza siempre que
// la plantilla y el nivel permitan generarla.
export function resolverTablaBotin({
  tablaBotin,
  configuracionObjetos,
  configuracionGeneracionObjetos,
  aleatorioBotin,
  aleatorioObjetos,
  nivelBaseObjeto = 1,
} = {}) {
  if (!Array.isArray(tablaBotin)) {
    throw new Error("La tabla de botín debe ser una lista.");
  }

  validarConfiguracionObjetos(configuracionObjetos);

  validarConfiguracionGeneracionObjetos(configuracionGeneracionObjetos);

  validarGeneradorAleatorioBotin(aleatorioBotin);

  validarGeneradorAleatorioObjetos(aleatorioObjetos);

  if (!Number.isInteger(nivelBaseObjeto) || nivelBaseObjeto < 1) {
    throw new Error(
      "El nivel base del botín debe ser un entero mayor o igual que 1.",
    );
  }

  const objetosGenerados = [];
  const resultadosTiradas = [];

  tablaBotin.forEach((entrada, indice) => {
    const normalizada = normalizarEntradaBotin({
      entrada,
      indice,
      configuracionObjetos,
    });

    // Siempre realizamos la tirada porcentual,
    // incluso cuando el objeto aún no está
    // disponible por nivel.
    //
    // Esto mantiene estable la secuencia
    // tradicional de la tabla de botín.
    const tirada = aleatorioBotin.siguiente() * 100;

    const exitoProbabilidad = tirada < normalizada.probabilidad;

    const plantilla = configuracionObjetos[normalizada.idObjeto];

    const habilitadaPorNivel = puedeGenerarsePlantilla({
      plantilla,
      nivelProgreso: nivelBaseObjeto,
    });

    // Una entrada bloqueada no consume
    // la tirada de cantidad ni la secuencia
    // dedicada a crear instancias.
    if (!habilitadaPorNivel) {
      resultadosTiradas.push({
        ...normalizada,
        tirada,
        exitoProbabilidad,
        habilitadaPorNivel: false,
        bloqueadaPorNivel: true,
        exito: false,
        cantidad: 0,
        cantidadPilas: 0,
        objetos: [],
      });

      return;
    }

    if (!exitoProbabilidad) {
      resultadosTiradas.push({
        ...normalizada,
        tirada,
        exitoProbabilidad: false,
        habilitadaPorNivel: true,
        bloqueadaPorNivel: false,
        exito: false,
        cantidad: 0,
        cantidadPilas: 0,
        objetos: [],
      });

      return;
    }

    const cantidad = aleatorioBotin.entero(
      normalizada.cantidadMinima,
      normalizada.cantidadMaxima,
    );

    const objetosEntrada = crearObjetosParaCantidad({
      configuracionObjetos,
      configuracionGeneracionObjetos,
      idObjeto: normalizada.idObjeto,
      cantidadTotal: cantidad,

      // El nivel base funciona como
      // nivel de progreso de la fuente.
      nivelProgreso: nivelBaseObjeto,

      // También funciona como centro
      // de la distribución del nivel
      // concreto de las instancias.
      nivelBaseObjeto,

      rarezaForzada: normalizada.rarezaForzada,

      aleatorioObjetos,
    });

    objetosGenerados.push(...objetosEntrada);

    resultadosTiradas.push({
      ...normalizada,
      tirada,
      exitoProbabilidad: true,
      habilitadaPorNivel: true,
      bloqueadaPorNivel: false,
      exito: true,
      cantidad,
      cantidadPilas: objetosEntrada.length,

      // Este detalle permite revisar
      // la integración desde consola.
      objetos: objetosEntrada.map(crearDetalleObjetoGenerado),
    });
  });

  const objetosConsolidados = consolidarPilasCompatibles(objetosGenerados);

  const resumen = crearResumenObjetos(objetosConsolidados);

  return {
    objetosGenerados: objetosConsolidados,
    resultadosTiradas,
    resumen,
    resumenTexto: crearResumenTexto(resumen),
    cantidadTipos: resumen.length,
    cantidadPilas: objetosConsolidados.length,
    cantidadUnidades: resumen.reduce(
      (total, entrada) => total + entrada.cantidad,
      0,
    ),
  };
}

// Crea tantas pilas como sean necesarias
// para representar la cantidad obtenida.
//
// Los objetos no apilables realizan una generación
// independiente por unidad.
//
// Los objetos apilables comparten una única tirada
// de nivel porque actualmente su nivel no modifica
// su comportamiento.
function crearObjetosParaCantidad({
  configuracionObjetos,
  configuracionGeneracionObjetos,
  idObjeto,
  cantidadTotal,
  nivelBaseObjeto,
  nivelProgreso,
  rarezaForzada,
  aleatorioObjetos,
}) {
  const plantilla = configuracionObjetos[idObjeto];

  const apilable = plantilla.apilable === true;

  const cantidadMaxima = apilable ? (plantilla.cantidadMaxima ?? 1) : 1;

  if (!Number.isInteger(cantidadMaxima) || cantidadMaxima <= 0) {
    throw new Error(
      `El objeto "${idObjeto}" tiene una cantidad máxima inválida.`,
    );
  }

  const objetos = [];

  if (!apilable) {
    for (let indice = 0; indice < cantidadTotal; indice++) {
      const nivelObjeto = generarNivelObjeto({
        nivelBase: nivelBaseObjeto,
        configuracionNivelObjeto:
          configuracionGeneracionObjetos.reglas.nivelObjeto,
        aleatorio: aleatorioObjetos,
      });

      objetos.push(
        crearObjetoGenerado({
          configuracionObjetos,
          configuracionGeneracionObjetos,
          idObjeto,
          cantidad: 1,
          nivelObjeto,
          nivelProgreso,
          rarezaForzada,
          aleatorio: aleatorioObjetos,
        }),
      );
    }

    return objetos;
  }

  const nivelObjeto = generarNivelObjeto({
    nivelBase: nivelBaseObjeto,
    configuracionNivelObjeto: configuracionGeneracionObjetos.reglas.nivelObjeto,
    aleatorio: aleatorioObjetos,
  });

  let cantidadRestante = cantidadTotal;

  while (cantidadRestante > 0) {
    const cantidadPila = Math.min(cantidadRestante, cantidadMaxima);

    objetos.push(
      crearObjetoGenerado({
        configuracionObjetos,
        configuracionGeneracionObjetos,
        idObjeto,
        cantidad: cantidadPila,
        nivelObjeto,
        nivelProgreso,
        rarezaForzada,
        aleatorio: aleatorioObjetos,
      }),
    );

    cantidadRestante -= cantidadPila;
  }

  return objetos;
}

// Mantiene una sola pila mientras exista
// espacio disponible para objetos compatibles.
function consolidarPilasCompatibles(objetos) {
  if (!Array.isArray(objetos)) {
    throw new Error("Los objetos de botín deben estar dentro de una lista.");
  }

  const resultado = [];

  for (const objeto of objetos) {
    if (!objeto) {
      throw new Error("El botín no puede contener objetos vacíos.");
    }

    if (!objeto.apilable) {
      resultado.push(objeto);
      continue;
    }

    let cantidadRestante = objeto.cantidad;

    for (const pilaDestino of resultado) {
      if (!sonPilasCompatibles(objeto, pilaDestino)) {
        continue;
      }

      const espacioDisponible =
        pilaDestino.cantidadMaxima - pilaDestino.cantidad;

      if (espacioDisponible <= 0) {
        continue;
      }

      const cantidadAMover = Math.min(espacioDisponible, cantidadRestante);

      pilaDestino.cantidad += cantidadAMover;

      cantidadRestante -= cantidadAMover;

      if (cantidadRestante === 0) {
        break;
      }
    }

    if (cantidadRestante > 0) {
      objeto.cantidad = cantidadRestante;

      resultado.push(objeto);
    }
  }

  return resultado;
}

function sonPilasCompatibles(objetoA, objetoB) {
  return (
    objetoA !== objetoB &&
    objetoA.apilable === true &&
    objetoB.apilable === true &&
    objetoA.id === objetoB.id &&
    objetoA.cantidadMaxima === objetoB.cantidadMaxima &&
    objetoA.rareza === objetoB.rareza &&
    objetoA.cantidadAfijos === 0 &&
    objetoB.cantidadAfijos === 0
  );
}

// Busca una pila de botín existente
// dentro de la misma casilla.
//
// Cuando ya existe, reconstruye una única
// entidad con el contenido anterior y nuevo.
function crearOActualizarBotinSuelo({ x, y, objetosNuevos, interactuables }) {
  const indiceExistente = interactuables.findIndex(
    (interactuable) =>
      interactuable instanceof BotinSuelo &&
      interactuable.x === x &&
      interactuable.y === y,
  );

  const botinExistente =
    indiceExistente >= 0 ? interactuables[indiceExistente] : null;

  const objetosExistentes = botinExistente
    ? botinExistente.contenedorObjetos.obtenerObjetos()
    : [];

  const objetosCombinados = consolidarPilasCompatibles([
    ...objetosExistentes,
    ...objetosNuevos,
  ]);

  const capacidad = Math.max(CAPACIDAD_MINIMA_BOTIN, objetosCombinados.length);

  const botinActualizado = new BotinSuelo({
    nombre: botinExistente?.nombre ?? "Botín",
    x,
    y,
    simbolo: botinExistente?.simbolo ?? "*",
    recursoVisual: botinExistente?.recursoVisual ?? null,
    contenedorObjetos: new ContenedorObjetos({
      capacidad,
      objetosIniciales: objetosCombinados,
    }),
  });

  if (indiceExistente >= 0) {
    interactuables[indiceExistente] = botinActualizado;
  } else {
    interactuables.push(botinActualizado);
  }

  return {
    botin: botinActualizado,
    botinCreado: indiceExistente === -1,
    botinActualizado: indiceExistente >= 0,
  };
}

// Agrupa los objetos generados para
// construir mensajes claros en el registro.
function crearResumenObjetos(objetos) {
  const resumenPorFirma = new Map();

  for (const objeto of objetos) {
    const cantidad = objeto.apilable ? objeto.cantidad : 1;

    const firma = crearFirmaObjeto(objeto);

    if (!resumenPorFirma.has(firma)) {
      resumenPorFirma.set(firma, {
        idObjeto: objeto.id,
        nombre: crearNombreResumenObjeto(objeto),
        cantidad: 0,
        rareza: objeto.rareza,
        nivelObjeto: objeto.nivelObjeto,
        afijos: objeto.afijos,
      });
    }

    resumenPorFirma.get(firma).cantidad += cantidad;
  }

  return [...resumenPorFirma.values()];
}

function crearFirmaObjeto(objeto) {
  const firmaAfijos = objeto.afijos
    .map((afijo) =>
      [
        afijo.tipoAfijo,
        afijo.id,
        afijo.grado,
        JSON.stringify(afijo.valores),
      ].join(":"),
    )
    .join("|");

  return [objeto.id, objeto.rareza, objeto.nivelObjeto, firmaAfijos].join("::");
}

function crearNombreResumenObjeto(objeto) {
  if (objeto.rareza === "comun") {
    return objeto.nombre;
  }

  return (
    `${objeto.nombre} [` +
    `${formatearRareza(objeto.rareza)}, nivel ` +
    `${objeto.nivelObjeto}]`
  );
}

function formatearRareza(rareza) {
  if (typeof rareza !== "string" || rareza.trim() === "") {
    return "Sin rareza";
  }

  const normalizada = rareza.trim().toLowerCase();

  return normalizada.charAt(0).toUpperCase() + normalizada.slice(1);
}

function crearResumenTexto(resumen) {
  return resumen
    .map((entrada) => `${entrada.cantidad} ` + `${entrada.nombre}`)
    .join(", ");
}

function crearDetalleObjetoGenerado(objeto) {
  return {
    idObjeto: objeto.id,
    nombre: objeto.nombre,
    rareza: objeto.rareza,
    nivelObjeto: objeto.nivelObjeto,
    tierBase: objeto.tierBase,
    nivelMinimoGeneracion: objeto.nivelMinimoGeneracion,
    prefijos: objeto.prefijos.map((afijo) => afijo.nombre),
    sufijos: objeto.sufijos.map((afijo) => afijo.nombre),
  };
}

function normalizarEntradaBotin({ entrada, indice, configuracionObjetos }) {
  if (
    entrada === null ||
    typeof entrada !== "object" ||
    Array.isArray(entrada)
  ) {
    throw new Error(
      `La entrada ${indice + 1} de la tabla de botín no es válida.`,
    );
  }

  if (typeof entrada.idObjeto !== "string" || entrada.idObjeto.trim() === "") {
    throw new Error(
      `La entrada ${indice + 1} de la tabla de botín ` +
        "necesita un ID de objeto.",
    );
  }

  const idObjeto = entrada.idObjeto.trim().toLowerCase();

  const plantilla = configuracionObjetos[idObjeto];

  if (!plantilla) {
    throw new Error(
      "La tabla de botín referencia el objeto inexistente " + `"${idObjeto}".`,
    );
  }

  const probabilidad = entrada.probabilidad;

  if (
    !Number.isFinite(probabilidad) ||
    probabilidad < 0 ||
    probabilidad > 100
  ) {
    throw new Error(
      `La probabilidad de "${idObjeto}" debe estar entre 0 y 100.`,
    );
  }

  const cantidadMinima = entrada.cantidadMinima ?? 1;

  const cantidadMaxima = entrada.cantidadMaxima ?? cantidadMinima;

  if (
    !Number.isInteger(cantidadMinima) ||
    !Number.isInteger(cantidadMaxima) ||
    cantidadMinima <= 0 ||
    cantidadMaxima < cantidadMinima
  ) {
    throw new Error(`Las cantidades de "${idObjeto}" no son válidas.`);
  }

  const rarezaForzada = normalizarRarezaForzada({
    rarezaForzada: entrada.rarezaForzada ?? null,
    idObjeto,
  });

  return {
    idObjeto,
    probabilidad,
    cantidadMinima,
    cantidadMaxima,
    rarezaForzada,
    nivelMinimoGeneracion: obtenerNivelMinimoGeneracionPlantilla(plantilla),
  };
}

function normalizarRarezaForzada({ rarezaForzada, idObjeto }) {
  if (rarezaForzada === null) {
    return null;
  }

  if (typeof rarezaForzada !== "string" || rarezaForzada.trim() === "") {
    throw new Error(
      `La rareza forzada de "${idObjeto}" debe ser un texto válido.`,
    );
  }

  const normalizada = rarezaForzada.trim().toLowerCase();

  if (!RAREZAS_FORZADAS_VALIDAS.has(normalizada)) {
    throw new Error(
      `La rareza forzada "${rarezaForzada}" de "${idObjeto}" no es válida.`,
    );
  }

  return normalizada;
}

function validarFuente(fuente) {
  if (!fuente || typeof fuente !== "object") {
    throw new Error("Se necesita una fuente válida para generar botín.");
  }

  if (!Number.isInteger(fuente.x) || !Number.isInteger(fuente.y)) {
    throw new Error("La fuente del botín necesita coordenadas enteras.");
  }

  if (!Array.isArray(fuente.tablaBotin)) {
    throw new Error("La fuente necesita una tabla de botín válida.");
  }
}

function validarConfiguracionObjetos(configuracionObjetos) {
  if (
    configuracionObjetos === null ||
    typeof configuracionObjetos !== "object" ||
    Array.isArray(configuracionObjetos)
  ) {
    throw new Error("Se necesita una configuración de objetos válida.");
  }
}

function validarConfiguracionGeneracionObjetos(configuracion) {
  if (
    configuracion === null ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion) ||
    !configuracion.reglas ||
    !configuracion.rarezas ||
    !configuracion.prefijos ||
    !configuracion.sufijos
  ) {
    throw new Error(
      "Se necesita una configuración válida de rarezas y afijos.",
    );
  }
}

function validarGeneradorAleatorioBotin(aleatorio) {
  if (
    !aleatorio ||
    typeof aleatorio.siguiente !== "function" ||
    typeof aleatorio.entero !== "function"
  ) {
    throw new Error(
      "Se necesita un generador aleatorio válido para la tabla de botín.",
    );
  }
}

function validarGeneradorAleatorioObjetos(aleatorio) {
  if (
    !aleatorio ||
    typeof aleatorio.siguiente !== "function" ||
    typeof aleatorio.entero !== "function" ||
    typeof aleatorio.elegir !== "function"
  ) {
    throw new Error(
      "Se necesita un generador aleatorio válido para crear los objetos del botín.",
    );
  }
}
