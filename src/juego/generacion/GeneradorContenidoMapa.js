import {
  TIPOS_ENEMIGO_UNICO,
  calcularCantidadEnemigosRecurrentes,
  crearContextoPoblacion,
  crearResumenPoblacionEnemigos,
  generarEnemigoUnicoEnZona,
  generarEnemigosRecurrentes,
} from "./PobladorEnemigosMazmorra.js";
import {
  crearResumenInteractuablesProcedurales,
  generarBarrilesProcedurales,
  generarInteractuablesPrevios,
} from "./PobladorInteractuablesMazmorra.js";

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
// - Los interactuables procedurales y barriles.
export function generarContenidoMapa({
  plantilla,
  terreno,
  posicionJugador,
  aleatorio,
  configuracionEnemigos,
  configuracionObjetos,
  nivelMapa = null,
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
  const nivelMapaResuelto = Number.isInteger(nivelMapa)
    ? nivelMapa
    : aleatorio.entero(
        plantilla.niveles.minimo,
        plantilla.niveles.maximo,
      );

  const contextoPoblacion = crearContextoPoblacion({
    terreno,
    posicionJugador,
    aleatorio,
    configuracion: plantilla.enemigos,
  });

  const objetivosProcedurales = [];
  const interactuablesProcedurales = [];

  // Los interactuables que deben reservar espacio se resuelven antes que los
  // enemigos. Así el cofre importante de la zona especial está garantizado y
  // la población restante se adapta al espacio que realmente queda libre.
  const resultadoInteractuablesPrevios = generarInteractuablesPrevios({
    plantilla,
    terreno,
    posicionJugador,
    nivelMapa: nivelMapaResuelto,
    contextoPoblacion,
    objetivos: objetivosProcedurales,
    interactuables: interactuablesProcedurales,
    configuracionObjetos,
    aleatorio,
  });

  const posicionesEnemigos = [];

  const cantidadEnemigosRecurrentes = calcularCantidadEnemigosRecurrentes({
    configuracion: plantilla.enemigos,
    contextoPoblacion,
  });

  // Los enemigos únicos se resuelven primero para garantizar que la zona
  // especial preserve espacio para su objetivo principal. El orden lógico
  // del resumen continúa mostrando recurrentes, jefe y especial.
  const resultadoJefe = generarEnemigoUnicoEnZona({
    plantilla,
    configuracion: plantilla.jefe ?? null,
    tipo: TIPOS_ENEMIGO_UNICO.JEFE,
    obligatorio: plantilla.jefe !== undefined && plantilla.jefe !== null,
    nivelMapa: nivelMapaResuelto,
    posicionJugador,
    zona: contextoPoblacion.zonaEspecial,
    posicionesEnemigos,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
    numeroDetalleInicial: cantidadEnemigosRecurrentes + 1,
  });

  const resultadoEspecial = generarEnemigoUnicoEnZona({
    plantilla,
    configuracion: plantilla.encuentroEspecial ?? null,
    tipo: TIPOS_ENEMIGO_UNICO.ESPECIAL,
    obligatorio: false,
    nivelMapa: nivelMapaResuelto,
    posicionJugador,
    zona: contextoPoblacion.zonaEspecial,
    posicionesEnemigos,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
    numeroDetalleInicial:
      cantidadEnemigosRecurrentes + resultadoJefe.enemigos.length + 1,
  });

  const resultadoRecurrentes = generarEnemigosRecurrentes({
    plantilla,
    nivelMapa: nivelMapaResuelto,
    posicionJugador,
    contextoPoblacion,
    cantidadObjetivo: cantidadEnemigosRecurrentes,
    posicionesEnemigos,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
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

  const poblacionEnemigos = crearResumenPoblacionEnemigos({
    configuracion: plantilla.enemigos,
    contextoPoblacion,
    cantidadObjetivo: cantidadEnemigosRecurrentes,
    resultadoRecurrentes,
  });

  const resultadoBarriles = generarBarrilesProcedurales({
    plantilla,
    terreno,
    posicionJugador,
    contextoPoblacion,
    posicionesBloqueadasPersistentes:
      resultadoInteractuablesPrevios.posicionesBloqueadasPersistentes,
    objetivos: objetivosProcedurales,
    interactuables: interactuablesProcedurales,
    aleatorio,
  });

  const resumenInteractuables = crearResumenInteractuablesProcedurales({
    resultadoPrevio: resultadoInteractuablesPrevios,
    resultadoBarriles,
  });

  return {
    nivelMapa: nivelMapaResuelto,
    enemigos,
    destructibles: resultadoBarriles.barriles,
    barriles: resultadoBarriles.barriles,
    interactuables: interactuablesProcedurales,
    objetivos: [...enemigos, ...objetivosProcedurales],
    resumen: {
      nivelMapa: nivelMapaResuelto,
      cantidadEnemigos: enemigos.length,
      cantidadEnemigosRecurrentes: resultadoRecurrentes.enemigos.length,
      cantidadEnemigosEspeciales: resultadoEspecial.enemigos.length,
      cantidadJefes: resultadoJefe.enemigos.length,
      encuentroEspecial: resultadoEspecial.resumen,
      jefe: resultadoJefe.resumen,
      cantidadDestructibles: resultadoBarriles.barriles.length,
      cantidadDestructiblesObjetivo: resultadoBarriles.cantidadObjetivo,
      cantidadDestructiblesNoColocados:
        resultadoBarriles.cantidadNoColocada,
      porcentajeDestructibles: resultadoBarriles.densidadPor100Casillas,
      enemigosPorTipo,
      variantes,
      poblacionEnemigos,
      detalleEnemigos,
      detalleDestructibles: resultadoBarriles.detalle,
      interactuablesProcedurales: resumenInteractuables,
    },
  };
}

// Genera exclusivamente la población habitual
// declarada dentro de plantilla.enemigos.
//
// Los enemigos poco frecuentes y los jefes no deben
// aparecer dentro de esta lista ponderada.
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
    !Array.isArray(terreno.casillasTransitables) ||
    terreno.casillasTransitables.length === 0
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
