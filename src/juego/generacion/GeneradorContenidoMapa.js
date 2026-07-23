import { crearEnemigo } from "../fabricas/FabricaEnemigos.js";

import { crearDestructible } from "../fabricas/FabricaDestructibles.js";

import { resolverEncuentroEspecial } from "./GeneradorEncuentroEspecial.js";

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

const TIPOS_ENEMIGO_UNICO = Object.freeze({
  ESPECIAL: "especial",
  JEFE: "jefe",
});

// Genera todas las entidades que ocuparán
// el terreno procedural.
//
// La misma semilla controla:
//
// - El nivel del mapa.
// - La cantidad de enemigos recurrentes.
// - Los tipos y variantes recurrentes.
// - La aparición del encuentro especial.
// - La plantilla y variante del encuentro especial.
// - La selección y posición del jefe.
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

  // Todos los enemigos de la expedición se crean
  // utilizando el mismo nivel del mapa.
  const nivelMapa = aleatorio.entero(
    plantilla.niveles.minimo,
    plantilla.niveles.maximo,
  );

  // Mezclamos las casillas una vez y eliminamos
  // la posición ocupada por el jugador.
  const posicionesDisponibles = aleatorio
    .mezclar(terreno.casillasCaminables)
    .filter((posicion) => !sonMismaPosicion(posicion, posicionJugador));

  const resultadoRecurrentes = generarEnemigosRecurrentes({
    plantilla,
    nivelMapa,
    posicionJugador,
    posicionesDisponibles,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
  });

  // El jefe obligatorio se coloca antes del encuentro
  // especial opcional. De esta forma, una tirada especial
  // nunca puede ocupar la última posición válida reservada
  // para el objetivo principal de la expedición.
  const resultadoJefe = generarEnemigoUnicoEnMapa({
    plantilla,
    configuracion: plantilla.jefe ?? null,
    tipo: TIPOS_ENEMIGO_UNICO.JEFE,
    obligatorio: plantilla.jefe !== undefined && plantilla.jefe !== null,
    nivelMapa,
    posicionJugador,
    posicionesDisponibles,
    posicionesEnemigos: resultadoRecurrentes.posicionesEnemigos,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
    numeroDetalleInicial: resultadoRecurrentes.enemigos.length + 1,
  });

  const resultadoEspecial = generarEnemigoUnicoEnMapa({
    plantilla,
    configuracion: plantilla.encuentroEspecial ?? null,
    tipo: TIPOS_ENEMIGO_UNICO.ESPECIAL,
    obligatorio: false,
    nivelMapa,
    posicionJugador,
    posicionesDisponibles,
    posicionesEnemigos: resultadoRecurrentes.posicionesEnemigos,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
    numeroDetalleInicial:
      resultadoRecurrentes.enemigos.length + resultadoJefe.enemigos.length + 1,
  });

  const enemigos = [
    ...resultadoRecurrentes.enemigos,
    ...resultadoJefe.enemigos,
    ...resultadoEspecial.enemigos,
  ];

  const detalleEnemigos = [
    ...resultadoRecurrentes.detalle,
    ...resultadoJefe.detalle,
    ...resultadoEspecial.detalle,
  ];

  const enemigosPorTipo = combinarConteosMultiples([
    resultadoRecurrentes.enemigosPorTipo,
    resultadoJefe.enemigosPorTipo,
    resultadoEspecial.enemigosPorTipo,
  ]);

  const variantes = combinarConteosMultiples([
    resultadoRecurrentes.variantes,
    resultadoJefe.variantes,
    resultadoEspecial.variantes,
  ]);

  const resultadoDestructibles = generarDestructibles({
    plantilla,
    terreno,
    posicionJugador,
    posicionesDisponibles,
    aleatorio,
  });

  return {
    nivelMapa,
    enemigos,
    destructibles: resultadoDestructibles.destructibles,
    objetivos: [...enemigos, ...resultadoDestructibles.destructibles],
    resumen: {
      nivelMapa,
      cantidadEnemigos: enemigos.length,
      cantidadEnemigosRecurrentes: resultadoRecurrentes.enemigos.length,
      cantidadEnemigosEspeciales: resultadoEspecial.enemigos.length,
      cantidadJefes: resultadoJefe.enemigos.length,
      encuentroEspecial: resultadoEspecial.resumen,
      jefe: resultadoJefe.resumen,
      cantidadDestructibles: resultadoDestructibles.destructibles.length,
      cantidadDestructiblesObjetivo: resultadoDestructibles.cantidadObjetivo,
      cantidadDestructiblesNoColocados:
        resultadoDestructibles.cantidadNoColocada,
      porcentajeDestructibles: resultadoDestructibles.porcentajeSeleccionado,
      enemigosPorTipo,
      variantes,
      detalleEnemigos,
      detalleDestructibles: resultadoDestructibles.detalle,
    },
  };
}

// Genera exclusivamente la población habitual
// declarada dentro de plantilla.enemigos.
//
// Los enemigos poco frecuentes y los jefes no deben
// aparecer dentro de esta lista ponderada.
function generarEnemigosRecurrentes({
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
    const indicePosicion = buscarIndicePosicionEnemigo({
      posicionesDisponibles,
      posicionJugador,
      posicionesEnemigos,
      distanciaSeguraJugador: configuracion.distanciaSeguraJugador,
      distanciaMinimaEntreEnemigos: configuracion.distanciaMinimaEntreEnemigos,
    });

    if (indicePosicion === -1) {
      throw new Error(
        `El mapa "${plantilla.nombre}" no tiene espacio ` +
          `para colocar ${cantidad} enemigos recurrentes ` +
          "respetando las distancias.",
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
      esEncuentroEspecial: false,
      esJefe: false,
    });
  }

  return {
    enemigos,
    posicionesEnemigos,
    detalle,
    enemigosPorTipo,
    variantes,
  };
}

// Resuelve y coloca una entidad única configurada
// como encuentro especial o jefe.
//
// Los encuentros especiales son opcionales: si no existe
// una posición válida, el mapa continúa sin ellos.
//
// Los jefes son obligatorios: si fueron configurados y no
// pueden colocarse, la generación falla para impedir crear
// una Sala de guerra sin su objetivo principal.
function generarEnemigoUnicoEnMapa({
  plantilla,
  configuracion,
  tipo,
  obligatorio,
  nivelMapa,
  posicionJugador,
  posicionesDisponibles,
  posicionesEnemigos,
  aleatorio,
  configuracionEnemigos,
  configuracionObjetos,
  numeroDetalleInicial,
}) {
  validarTipoEnemigoUnico({
    tipo,
    obligatorio,
  });

  const resolucion = resolverEncuentroEspecial({
    configuracion,
    aleatorio,
  });

  const esJefe = tipo === TIPOS_ENEMIGO_UNICO.JEFE;

  const esEncuentroEspecial = tipo === TIPOS_ENEMIGO_UNICO.ESPECIAL;

  const resumenBase = {
    configurado: resolucion.configurado,
    tipo,
    obligatorio,
    probabilidadAparicion: resolucion.probabilidadAparicion,
    tirada: resolucion.tirada,
    tiradaExitosa: resolucion.aparece,
    colocado: false,
    omitidoPorEspacio: false,
    idEnemigo: resolucion.idEnemigo,
    nombre: null,
    variante: resolucion.variante,
    nivel: nivelMapa,
    x: null,
    y: null,
  };

  if (!resolucion.aparece) {
    if (obligatorio && resolucion.configurado) {
      throw new Error(
        `El jefe configurado de "${plantilla.nombre}" ` +
          "no superó su tirada obligatoria de aparición.",
      );
    }

    return crearResultadoEnemigoUnicoVacio(resumenBase);
  }

  const configuracionPosicion = plantilla.enemigos;

  const indicePosicion = buscarIndicePosicionEnemigo({
    posicionesDisponibles,
    posicionJugador,
    posicionesEnemigos,
    distanciaSeguraJugador: configuracionPosicion.distanciaSeguraJugador,
    distanciaMinimaEntreEnemigos:
      configuracionPosicion.distanciaMinimaEntreEnemigos,
  });

  if (indicePosicion === -1) {
    if (obligatorio) {
      throw new Error(
        `El jefe "${resolucion.idEnemigo}" de ` +
          `"${plantilla.nombre}" no pudo colocarse ` +
          "respetando las distancias.",
      );
    }

    console.warn(
      `[Mapa] El encuentro especial "${resolucion.idEnemigo}" ` +
        `fue seleccionado para "${plantilla.nombre}", ` +
        "pero no pudo colocarse respetando las distancias.",
    );

    return crearResultadoEnemigoUnicoVacio({
      ...resumenBase,
      omitidoPorEspacio: true,
    });
  }

  const [posicion] = posicionesDisponibles.splice(indicePosicion, 1);

  const enemigo = crearEnemigo({
    configuracionEnemigos,
    configuracionObjetos,
    idPlantilla: resolucion.idEnemigo,
    nivel: nivelMapa,
    idVariante: resolucion.idVariante,
    x: posicion.x,
    y: posicion.y,
  });

  agregarBotinAdicional({
    enemigo,
    tablaBotinAdicional: resolucion.tablaBotinAdicional,
    descripcion: esJefe ? "del jefe" : "del encuentro especial",
  });

  posicionesEnemigos.push({
    ...posicion,
  });

  return {
    enemigos: [enemigo],
    detalle: [
      {
        numero: numeroDetalleInicial,
        nombre: enemigo.nombre,
        tipo: resolucion.idEnemigo,
        variante: resolucion.variante,
        nivel: nivelMapa,
        x: posicion.x,
        y: posicion.y,
        esEncuentroEspecial,
        esJefe,
        probabilidadEncuentro: resolucion.probabilidadAparicion,
        tiradaEncuentro: resolucion.tirada,
        cantidadEntradasBotinAdicional: resolucion.tablaBotinAdicional.length,
      },
    ],
    enemigosPorTipo: {
      [resolucion.idEnemigo]: 1,
    },
    variantes: {
      [resolucion.variante]: 1,
    },
    resumen: {
      ...resumenBase,
      colocado: true,
      nombre: enemigo.nombre,
      x: posicion.x,
      y: posicion.y,
    },
  };
}

function crearResultadoEnemigoUnicoVacio(resumen) {
  return {
    enemigos: [],
    detalle: [],
    enemigosPorTipo: {},
    variantes: {},
    resumen,
  };
}

function agregarBotinAdicional({ enemigo, tablaBotinAdicional, descripcion }) {
  if (!Array.isArray(tablaBotinAdicional)) {
    throw new Error(`El botín adicional ${descripcion} debe ser una lista.`);
  }

  enemigo.tablaBotin.push(
    ...tablaBotinAdicional.map((entrada) => ({
      ...entrada,
    })),
  );
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

    posicionesBloqueadas.add(clave);

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

  const cantidadNoColocada = cantidadObjetivo - destructibles.length;

  if (cantidadNoColocada > 0) {
    console.warn(
      `[Mapa] "${plantilla.nombre}" colocó ` +
        `${destructibles.length} de ${cantidadObjetivo} ` +
        "destructibles para conservar la conectividad.",
    );
  }

  return {
    destructibles,
    detalle,
    porcentajeSeleccionado,
    cantidadObjetivo,
    cantidadNoColocada,
  };
}

function buscarIndicePosicionEnemigo({
  posicionesDisponibles,
  posicionJugador,
  posicionesEnemigos,
  distanciaSeguraJugador,
  distanciaMinimaEntreEnemigos,
}) {
  return posicionesDisponibles.findIndex((posicion) =>
    posicionValidaParaEnemigo({
      posicion,
      posicionJugador,
      posicionesEnemigos,
      distanciaSeguraJugador,
      distanciaMinimaEntreEnemigos,
    }),
  );
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

function seleccionarPonderado(elementos, aleatorio) {
  if (!Array.isArray(elementos) || elementos.length === 0) {
    throw new Error("No se puede realizar una selección ponderada vacía.");
  }

  const pesoTotal = elementos.reduce((total, elemento) => {
    if (!Number.isFinite(elemento.peso) || elemento.peso <= 0) {
      throw new Error(`El peso de "${elemento.id}" debe ser mayor que 0.`);
    }

    return total + elemento.peso;
  }, 0);

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

function combinarConteosMultiples(conteos) {
  return conteos.reduce(
    (resultado, conteo) => combinarConteos(resultado, conteo),
    {},
  );
}

function combinarConteos(conteoA, conteoB) {
  const resultado = {
    ...conteoA,
  };

  for (const [clave, cantidad] of Object.entries(conteoB)) {
    resultado[clave] = (resultado[clave] ?? 0) + cantidad;
  }

  return resultado;
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

function validarTipoEnemigoUnico({ tipo, obligatorio }) {
  if (!Object.values(TIPOS_ENEMIGO_UNICO).includes(tipo)) {
    throw new Error(`El tipo de enemigo único "${tipo}" no es válido.`);
  }

  if (typeof obligatorio !== "boolean") {
    throw new Error("La obligatoriedad del enemigo único debe ser booleana.");
  }
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
