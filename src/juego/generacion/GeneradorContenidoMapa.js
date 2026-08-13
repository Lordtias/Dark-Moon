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
  generarCofresModeradosPosteriores,
  generarDestructiblesProcedurales,
  generarInteractuablesPrevios,
} from "./PobladorInteractuablesMazmorra.js";
import { crearResumenPlanPoblacion } from "./PlanificadorPoblacionMazmorra.js";

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
// - Los interactuables y destructibles procedurales.
export function generarContenidoMapa({
  plantilla,
  terreno,
  posicionJugador,
  aleatorio,
  configuracionEnemigos,
  configuracionObjetos,
  configuracionEntidadesMazmorra,
  nivelMapa = null,
  cantidadEnemigosRecurrentes = null,
} = {}) {
  validarParametros({
    plantilla,
    terreno,
    posicionJugador,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionEntidadesMazmorra,
    cantidadEnemigosRecurrentes,
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
    plantilla,
    terreno,
    posicionJugador,
    aleatorio,
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

  const cantidadEnemigosRecurrentesResuelta =
    Number.isInteger(cantidadEnemigosRecurrentes)
      ? cantidadEnemigosRecurrentes
      : calcularCantidadEnemigosRecurrentes({
          configuracion: plantilla.enemigos,
          contextoPoblacion,
        });

  const generarDestructibles = () => generarDestructiblesProcedurales({
    plantilla,
    terreno,
    posicionJugador,
    nivelMapa: nivelMapaResuelto,
    contextoPoblacion,
    posicionesBloqueadasPersistentes:
      resultadoInteractuablesPrevios.posicionesBloqueadasPersistentes,
    posicionesReservadasAcceso:
      resultadoInteractuablesPrevios.posicionesReservadasAcceso,
    objetivos: objetivosProcedurales,
    interactuables: interactuablesProcedurales,
    configuracionObjetos,
    configuracionEntidadesMazmorra,
    aleatorio,
  });
  const generarRecurrentes = () => generarEnemigosRecurrentes({
    plantilla,
    nivelMapa: nivelMapaResuelto,
    posicionJugador,
    contextoPoblacion,
    cantidadObjetivo: cantidadEnemigosRecurrentesResuelta,
    posicionesEnemigos,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
  });
  const generarJefe = () => generarEnemigoUnicoEnZona({
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
    numeroDetalleInicial: cantidadEnemigosRecurrentesResuelta + 1,
  });
  const generarEspecial = (resultadoJefe) => generarEnemigoUnicoEnZona({
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
      cantidadEnemigosRecurrentesResuelta + resultadoJefe.enemigos.length + 1,
  });

  // La identidad humana de la habitación tiene prioridad sobre contenido
  // opcional y población hostil. Las cinco mazmorras utilizan este único flujo.
  const resultadoDestructibles = generarDestructibles();
  generarCofresModeradosPosteriores({
    plantilla,
    terreno,
    posicionJugador,
    nivelMapa: nivelMapaResuelto,
    contextoPoblacion,
    objetivos: objetivosProcedurales,
    interactuables: interactuablesProcedurales,
    configuracionObjetos,
    aleatorio,
    resultadoPrevio: resultadoInteractuablesPrevios,
  });
  const resultadoJefe = generarJefe();
  const resultadoEspecial = generarEspecial(resultadoJefe);
  const resultadoRecurrentes = generarRecurrentes();

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
    cantidadObjetivo: cantidadEnemigosRecurrentesResuelta,
    resultadoRecurrentes,
  });

  const resumenInteractuables = crearResumenInteractuablesProcedurales({
    resultadoPrevio: resultadoInteractuablesPrevios,
    resultadoDestructibles,
  });
  const planPoblacion = crearResumenPlanPoblacion(contextoPoblacion);

  // El plano estructural sigue siendo la única fuente de geometría. Esta
  // metainformación se adjunta después de generarlo para que futuros perfiles,
  // NPC o quests puedan reutilizar la clasificación canónica de habitaciones.
  terreno.planPoblacion = planPoblacion;

  return {
    nivelMapa: nivelMapaResuelto,
    enemigos,
    destructibles: resultadoDestructibles.destructibles,
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
      cantidadDestructibles: resultadoDestructibles.destructibles.length,
      enemigosPorTipo,
      variantes,
      poblacionEnemigos,
      detalleEnemigos,
      detalleDestructibles: resultadoDestructibles.detalle,
      interactuablesProcedurales: resumenInteractuables,
      planPoblacion,
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
  configuracionEntidadesMazmorra,
  cantidadEnemigosRecurrentes,
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

  if (
    !configuracionEntidadesMazmorra?.porId ||
    typeof configuracionEntidadesMazmorra.porId !== "object"
  ) {
    throw new Error(
      "Se necesita la configuración canónica de entidades de mazmorra.",
    );
  }

  if (
    cantidadEnemigosRecurrentes !== null &&
    (!Number.isInteger(cantidadEnemigosRecurrentes) ||
      cantidadEnemigosRecurrentes < 0)
  ) {
    throw new Error(
      "La cantidad de enemigos recurrentes debe ser un entero igual o mayor que 0.",
    );
  }
}
