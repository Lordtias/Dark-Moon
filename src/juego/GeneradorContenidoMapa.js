import { crearEnemigo } from "./FabricaEnemigos.js";

import { crearDestructible } from "./FabricaDestructibles.js";

const DIRECCIONES_CARDINALES = [
  {
    x: 1,
    y: 0,
  },
  {
    x: -1,
    y: 0,
  },
  {
    x: 0,
    y: 1,
  },
  {
    x: 0,
    y: -1,
  },
];

// Genera todas las entidades que ocuparán
// el terreno procedural.
//
// La misma semilla controla:
//
// - El nivel del mapa.
// - La cantidad de enemigos.
// - Los tipos de enemigos.
// - Las variantes.
// - Las posiciones.
// - Los destructibles.
export function generarContenidoMapa({
  plantilla,
  terreno,
  posicionJugador,
  aleatorio,
  configuracionEnemigos,
  configuracionObjetos,
} = {}) {
  validarParametros({
    plantilla,
    terreno,
    posicionJugador,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
  });

  // Por ahora cada mapa posee un único nivel.
  //
  // Todos sus enemigos se crean con ese nivel.
  // Más adelante podremos agregar diferencias
  // individuales alrededor del nivel del mapa.
  const nivelMapa = aleatorio.entero(
    plantilla.niveles.minimo,
    plantilla.niveles.maximo,
  );

  // Mezclamos las casillas una vez y eliminamos
  // la posición ocupada por el jugador.
  const posicionesDisponibles = aleatorio
    .mezclar(terreno.casillasCaminables)
    .filter((posicion) => !sonMismaPosicion(posicion, posicionJugador));

  const resultadoEnemigos = generarEnemigos({
    plantilla,
    nivelMapa,
    posicionJugador,
    posicionesDisponibles,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
  });

  const resultadoDestructibles = generarDestructibles({
    plantilla,
    terreno,
    posicionJugador,
    posicionesDisponibles,
    aleatorio,
  });

  return {
    nivelMapa,

    enemigos: resultadoEnemigos.enemigos,

    destructibles: resultadoDestructibles.destructibles,

    objetivos: [
      ...resultadoEnemigos.enemigos,

      ...resultadoDestructibles.destructibles,
    ],

    resumen: {
      nivelMapa,

      cantidadEnemigos: resultadoEnemigos.enemigos.length,

      cantidadDestructibles: resultadoDestructibles.destructibles.length,

      porcentajeDestructibles: resultadoDestructibles.porcentajeSeleccionado,

      enemigosPorTipo: resultadoEnemigos.enemigosPorTipo,

      variantes: resultadoEnemigos.variantes,

      detalleEnemigos: resultadoEnemigos.detalle,

      detalleDestructibles: resultadoDestructibles.detalle,
    },
  };
}

function generarEnemigos({
  plantilla,
  nivelMapa,
  posicionJugador,
  posicionesDisponibles,
  aleatorio,
  configuracionEnemigos,
  configuracionObjetos,
}) {
  const configuracion = plantilla.enemigos;

  const cantidad = aleatorio.entero(
    configuracion.cantidad.minimo,

    configuracion.cantidad.maximo,
  );

  const posicionesEnemigos = [];
  const enemigos = [];
  const detalle = [];

  const enemigosPorTipo = {};
  const variantes = {};

  for (let indice = 0; indice < cantidad; indice++) {
    const indicePosicion = posicionesDisponibles.findIndex((posicion) =>
      posicionValidaParaEnemigo({
        posicion,
        posicionJugador,
        posicionesEnemigos,

        distanciaSeguraJugador: configuracion.distanciaSeguraJugador,

        distanciaMinimaEntreEnemigos:
          configuracion.distanciaMinimaEntreEnemigos,
      }),
    );

    if (indicePosicion === -1) {
      throw new Error(
        `El mapa "${plantilla.nombre}" no tiene espacio ` +
          `para colocar ${cantidad} enemigos respetando las distancias.`,
      );
    }

    const [posicion] = posicionesDisponibles.splice(indicePosicion, 1);

    const enemigoPermitido = seleccionarPonderado(
      configuracion.permitidos,

      aleatorio,
    );

    const idVariante = seleccionarVariante(
      configuracion.probabilidadesVariantes,

      aleatorio,
    );

    const enemigo = crearEnemigo({
      configuracionEnemigos,
      configuracionObjetos,

      idPlantilla: enemigoPermitido.id,

      nivel: nivelMapa,

      idVariante,

      x: posicion.x,

      y: posicion.y,
    });

    enemigos.push(enemigo);

    posicionesEnemigos.push({
      ...posicion,
    });

    incrementarConteo(enemigosPorTipo, enemigoPermitido.id);

    incrementarConteo(variantes, idVariante ?? "normal");

    detalle.push({
      numero: indice + 1,

      nombre: enemigo.nombre,

      tipo: enemigoPermitido.id,

      variante: idVariante ?? "normal",

      nivel: nivelMapa,

      x: posicion.x,

      y: posicion.y,
    });
  }

  return {
    enemigos,
    detalle,
    enemigosPorTipo,
    variantes,
  };
}

function generarDestructibles({
  plantilla,
  terreno,
  posicionJugador,
  posicionesDisponibles,
  aleatorio,
}) {
  const configuracion = plantilla.destructibles;

  const porcentajeSeleccionado = aleatorio.entero(
    configuracion.porcentajeCasillasCaminables.minimo,

    configuracion.porcentajeCasillasCaminables.maximo,
  );

  const cantidadCalculada = Math.round(
    terreno.casillasCaminables.length * (porcentajeSeleccionado / 100),
  );

  // Si el porcentaje es mayor que cero,
  // intentamos colocar al menos un destructible.
  const cantidadObjetivo =
    porcentajeSeleccionado > 0 ? Math.max(1, cantidadCalculada) : 0;

  if (cantidadObjetivo > posicionesDisponibles.length) {
    throw new Error(
      `El mapa "${plantilla.nombre}" no tiene espacio ` +
        `para colocar ${cantidadObjetivo} destructibles.`,
    );
  }

  const clavesCaminables = new Set(
    terreno.casillasCaminables.map((posicion) => crearClave(posicion)),
  );

  const posicionesBloqueadas = new Set();

  const candidatas = aleatorio.mezclar(posicionesDisponibles);

  const destructibles = [];
  const detalle = [];

  for (const posicion of candidatas) {
    if (destructibles.length >= cantidadObjetivo) {
      break;
    }

    const clave = crearClave(posicion);

    // Probamos temporalmente la posición.
    posicionesBloqueadas.add(clave);

    // Un destructible funciona como un obstáculo
    // permanente. Solo se conserva si el resto
    // del suelo continúa conectado.
    const mantieneConectividad = comprobarConectividad({
      clavesCaminables,
      posicionesBloqueadas,
      posicionInicial: posicionJugador,
    });

    if (!mantieneConectividad) {
      posicionesBloqueadas.delete(clave);

      continue;
    }

    const destructiblePermitido = seleccionarPonderado(
      configuracion.permitidos,

      aleatorio,
    );

    const destructible = crearDestructible({
      id: destructiblePermitido.id,

      x: posicion.x,

      y: posicion.y,
    });

    destructibles.push(destructible);

    detalle.push({
      numero: destructibles.length,

      tipo: destructiblePermitido.id,

      nombre: destructible.nombre,

      x: posicion.x,

      y: posicion.y,
    });
  }

  if (destructibles.length < cantidadObjetivo) {
    throw new Error(
      `El mapa "${plantilla.nombre}" solamente permitió colocar ` +
        `${destructibles.length} de ${cantidadObjetivo} destructibles ` +
        "sin romper la conectividad.",
    );
  }

  return {
    destructibles,
    detalle,
    porcentajeSeleccionado,
  };
}

function posicionValidaParaEnemigo({
  posicion,
  posicionJugador,
  posicionesEnemigos,
  distanciaSeguraJugador,
  distanciaMinimaEntreEnemigos,
}) {
  const distanciaJugador = calcularDistanciaCuadricula(
    posicion,
    posicionJugador,
  );

  if (distanciaJugador < distanciaSeguraJugador) {
    return false;
  }

  return posicionesEnemigos.every(
    (enemigoExistente) =>
      calcularDistanciaCuadricula(posicion, enemigoExistente) >=
      distanciaMinimaEntreEnemigos,
  );
}

// Comprueba que todas las casillas de suelo
// continúen accesibles después de colocar
// destructibles.
//
// Los enemigos no se consideran bloqueos
// permanentes porque pueden moverse.
function comprobarConectividad({
  clavesCaminables,
  posicionesBloqueadas,
  posicionInicial,
}) {
  const claveInicial = crearClave(posicionInicial);

  if (
    !clavesCaminables.has(claveInicial) ||
    posicionesBloqueadas.has(claveInicial)
  ) {
    return false;
  }

  const pendientes = [
    {
      ...posicionInicial,
    },
  ];

  const visitadas = new Set([claveInicial]);

  let indicePendiente = 0;

  while (indicePendiente < pendientes.length) {
    const actual = pendientes[indicePendiente];

    indicePendiente++;

    for (const direccion of DIRECCIONES_CARDINALES) {
      const siguiente = {
        x: actual.x + direccion.x,

        y: actual.y + direccion.y,
      };

      const claveSiguiente = crearClave(siguiente);

      if (
        !clavesCaminables.has(claveSiguiente) ||
        posicionesBloqueadas.has(claveSiguiente) ||
        visitadas.has(claveSiguiente)
      ) {
        continue;
      }

      visitadas.add(claveSiguiente);

      pendientes.push(siguiente);
    }
  }

  const cantidadDisponible = clavesCaminables.size - posicionesBloqueadas.size;

  return visitadas.size === cantidadDisponible;
}

// Selecciona un elemento mediante pesos.
//
// Los pesos no necesitan sumar 100.
function seleccionarPonderado(elementos, aleatorio) {
  if (!Array.isArray(elementos) || elementos.length === 0) {
    throw new Error("No se puede realizar una selección ponderada vacía.");
  }

  const pesoTotal = elementos.reduce(
    (total, elemento) => {
      if (!Number.isFinite(elemento.peso) || elemento.peso <= 0) {
        throw new Error(`El peso de "${elemento.id}" debe ser mayor que 0.`);
      }

      return total + elemento.peso;
    },

    0,
  );

  const valorSeleccionado = aleatorio.siguiente() * pesoTotal;

  let acumulado = 0;

  for (const elemento of elementos) {
    acumulado += elemento.peso;

    if (valorSeleccionado < acumulado) {
      return elemento;
    }
  }

  return elementos[elementos.length - 1];
}

// Las probabilidades de variantes sí suman 100,
// pero se procesan como pesos para mantener
// una única lógica de selección.
function seleccionarVariante(probabilidades, aleatorio) {
  const opciones = Object.entries(probabilidades)
    .filter(([, probabilidad]) => probabilidad > 0)
    .map(([id, probabilidad]) => ({
      id,
      peso: probabilidad,
    }));

  const seleccion = seleccionarPonderado(opciones, aleatorio);

  return seleccion.id === "normal" ? null : seleccion.id;
}

function incrementarConteo(conteo, clave) {
  conteo[clave] = (conteo[clave] ?? 0) + 1;
}

// Utilizamos distancia Chebyshev porque coincide
// con el movimiento en ocho direcciones.
function calcularDistanciaCuadricula(origen, destino) {
  return Math.max(
    Math.abs(destino.x - origen.x),

    Math.abs(destino.y - origen.y),
  );
}

function sonMismaPosicion(posicionA, posicionB) {
  return posicionA.x === posicionB.x && posicionA.y === posicionB.y;
}

function crearClave(posicion) {
  return `${posicion.x},` + `${posicion.y}`;
}

function validarParametros({
  plantilla,
  terreno,
  posicionJugador,
  aleatorio,
  configuracionEnemigos,
  configuracionObjetos,
}) {
  if (!plantilla || typeof plantilla !== "object") {
    throw new Error(
      "Se necesita una plantilla para generar el contenido del mapa.",
    );
  }

  if (
    !terreno ||
    !Array.isArray(terreno.casillasCaminables) ||
    terreno.casillasCaminables.length === 0
  ) {
    throw new Error("Se necesita un terreno con casillas caminables.");
  }

  if (
    !posicionJugador ||
    !Number.isInteger(posicionJugador.x) ||
    !Number.isInteger(posicionJugador.y)
  ) {
    throw new Error("Se necesita una posición válida para el jugador.");
  }

  if (
    !aleatorio ||
    typeof aleatorio.entero !== "function" ||
    typeof aleatorio.siguiente !== "function" ||
    typeof aleatorio.mezclar !== "function"
  ) {
    throw new Error("Se necesita un generador aleatorio válido.");
  }

  if (!configuracionEnemigos || typeof configuracionEnemigos !== "object") {
    throw new Error("Se necesita la configuración de enemigos.");
  }

  if (!configuracionObjetos || typeof configuracionObjetos !== "object") {
    throw new Error("Se necesita la configuración de objetos.");
  }
}
