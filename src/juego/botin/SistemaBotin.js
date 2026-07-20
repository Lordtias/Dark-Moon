import { BotinSuelo } from "../../entidad/interactuable/BotinSuelo.js";

import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";

import { crearObjeto } from "../../objetos/FabricaObjetos.js";

// La ventana de botín queda visualmente más estable
// cuando conserva algunas posiciones disponibles.
//
// Si una casilla recibe nuevos drops más adelante,
// el contenedor será reconstruido con la capacidad
// necesaria para alojarlos.
const CAPACIDAD_MINIMA_BOTIN = 6;

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

  validarGeneradorAleatorio(aleatorio);

  if (!Array.isArray(interactuables)) {
    throw new Error("Los interactuables deben estar dentro de una lista.");
  }

  const resultadoTabla = resolverTablaBotin({
    tablaBotin: fuente.tablaBotin,

    configuracionObjetos,
    aleatorio,
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
// Formato de una entrada:
//
// {
//     "idObjeto": "cola_rata",
//     "probabilidad": 70,
//     "cantidadMinima": 1,
//     "cantidadMaxima": 1
// }
export function resolverTablaBotin({
  tablaBotin,
  configuracionObjetos,
  aleatorio,
} = {}) {
  if (!Array.isArray(tablaBotin)) {
    throw new Error("La tabla de botín debe ser una lista.");
  }

  validarConfiguracionObjetos(configuracionObjetos);

  validarGeneradorAleatorio(aleatorio);

  const objetosGenerados = [];
  const resultadosTiradas = [];

  tablaBotin.forEach((entrada, indice) => {
    const normalizada = normalizarEntradaBotin({
      entrada,
      indice,
      configuracionObjetos,
    });

    // Siempre realizamos una tirada,
    // incluso con probabilidades de 0 o 100.
    //
    // Esto mantiene una secuencia pseudoaleatoria
    // consistente y fácil de reproducir.
    const tirada = aleatorio.siguiente() * 100;

    const exito = tirada < normalizada.probabilidad;

    if (!exito) {
      resultadosTiradas.push({
        ...normalizada,

        tirada,

        exito: false,

        cantidad: 0,

        cantidadPilas: 0,
      });

      return;
    }

    const cantidad = aleatorio.entero(
      normalizada.cantidadMinima,

      normalizada.cantidadMaxima,
    );

    const objetosEntrada = crearObjetosParaCantidad({
      configuracionObjetos,

      idObjeto: normalizada.idObjeto,

      cantidadTotal: cantidad,
    });

    objetosGenerados.push(...objetosEntrada);

    resultadosTiradas.push({
      ...normalizada,

      tirada,

      exito: true,

      cantidad,

      cantidadPilas: objetosEntrada.length,
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
// Ejemplo:
//
// 65 flechas con máximo 50:
//
// - Pila de 50.
// - Pila de 15.
function crearObjetosParaCantidad({
  configuracionObjetos,
  idObjeto,
  cantidadTotal,
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

  let cantidadRestante = cantidadTotal;

  while (cantidadRestante > 0) {
    const cantidadPila = Math.min(cantidadRestante, cantidadMaxima);

    objetos.push(
      crearObjeto({
        configuracionObjetos,
        idObjeto,
        cantidad: cantidadPila,
      }),
    );

    cantidadRestante -= cantidadPila;
  }

  return objetos;
}

// Mantiene una sola pila mientras exista
// espacio disponible para objetos compatibles.
//
// Los objetos no apilables se conservan
// como instancias independientes.
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
    objetoA.cantidadMaxima === objetoB.cantidadMaxima
  );
}

// Busca una pila de botín existente
// dentro de la misma casilla.
//
// Cuando ya existe, reconstruimos esa única entidad
// con su contenido anterior y los nuevos objetos.
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

// Agrupa los objetos generados para construir
// mensajes claros en el registro.
//
// Varias pilas de flechas aparecerían como
// una sola línea con su cantidad total.
function crearResumenObjetos(objetos) {
  const resumenPorId = new Map();

  for (const objeto of objetos) {
    const cantidad = objeto.apilable ? objeto.cantidad : 1;

    if (!resumenPorId.has(objeto.id)) {
      resumenPorId.set(objeto.id, {
        idObjeto: objeto.id,

        nombre: objeto.nombre,

        cantidad: 0,
      });
    }

    resumenPorId.get(objeto.id).cantidad += cantidad;
  }

  return [...resumenPorId.values()];
}

function crearResumenTexto(resumen) {
  return resumen
    .map((entrada) => `${entrada.cantidad} ` + `${entrada.nombre}`)
    .join(", ");
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

  if (!configuracionObjetos[idObjeto]) {
    throw new Error(
      `La tabla de botín referencia el objeto inexistente ` + `"${idObjeto}".`,
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

  return {
    idObjeto,
    probabilidad,
    cantidadMinima,
    cantidadMaxima,
  };
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

function validarGeneradorAleatorio(aleatorio) {
  if (
    !aleatorio ||
    typeof aleatorio.siguiente !== "function" ||
    typeof aleatorio.entero !== "function"
  ) {
    throw new Error("Se necesita un generador aleatorio válido para el botín.");
  }
}
