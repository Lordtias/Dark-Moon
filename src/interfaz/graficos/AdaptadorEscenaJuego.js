import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";

import { TIPOS_ENTIDAD_VISUAL } from "./TiposEscena.js";

// Convierte el estado completo de Juego
// en una escena gráfica sencilla.
//
// La escena contiene únicamente:
//
// - Mapa.
// - Apariencia del bioma.
// - Rango y selector de combate.
// - Selector de interacción.
// - Entidades visibles.
//
// El selector de interacción reutiliza el dibujo
// de esquinas que ya posee Canvas.
//
// Esto no reutiliza el estado del combate:
// solamente aprovecha el mismo contrato visual.
export function crearEscenaJuego(juego) {
  validarJuego(juego);

  const combateActivo = juego.modoCombateActivo === true;

  const interaccionActiva = juego.modoInteraccionActivo === true;

  // RenderizadorCanvas2D actualmente recibe
  // el selector dentro del bloque "combate".
  //
  // Mientras el modo de interacción está activo,
  // entregamos el selector en ese mismo espacio,
  // pero sin casillas atacables.
  const selectorMapaActivo = combateActivo || interaccionActiva;

  return {
    mapa: {
      casillas: juego.map,

      // Copiamos la apariencia para evitar
      // entregar una referencia directa
      // a la configuración del mapa.
      apariencia: {
        ...juego.mapaSeleccionado?.apariencia,
      },
    },

    combate: {
      activo: selectorMapaActivo,

      casillasAtacables: combateActivo ? obtenerCasillasAtacables(juego) : [],

      selector: combateActivo
        ? crearSelectorCombateVisual(juego)
        : interaccionActiva
          ? crearSelectorInteraccionVisual(juego)
          : null,
    },

    // Los interactuables se dibujan primero.
    // El jugador queda al final para conservarse
    // visible cuando comparte una casilla con botín.
    entidades: [
      ...juego.interactuables.map((interactuable) =>
        crearEntidadVisual(
          interactuable,

          TIPOS_ENTIDAD_VISUAL.INTERACTUABLE,
        ),
      ),

      ...juego.objetivos
        .filter((objetivo) => objetivo.estaDestruido !== true)
        .map((objetivo) =>
          crearEntidadVisual(
            objetivo,

            objetivo instanceof Enemigo
              ? TIPOS_ENTIDAD_VISUAL.ENEMIGO
              : TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE,
          ),
        ),

      crearEntidadVisual(
        juego.player,

        TIPOS_ENTIDAD_VISUAL.JUGADOR,
      ),
    ],
  };
}

// Comprueba que el adaptador haya recibido
// una partida válida.
function validarJuego(juego) {
  if (!juego || typeof juego !== "object") {
    throw new Error("Se necesita una partida válida para crear la escena.");
  }

  if (!Array.isArray(juego.map) || juego.map.length === 0) {
    throw new Error("La escena necesita un mapa válido.");
  }

  if (!juego.player) {
    throw new Error("La escena necesita un jugador.");
  }

  if (!Array.isArray(juego.objetivos)) {
    throw new Error("La escena necesita una lista de objetivos.");
  }

  if (!Array.isArray(juego.interactuables)) {
    throw new Error("La escena necesita una lista de interactuables.");
  }
}

// Obtiene todas las casillas que ya cumplen
// las reglas de ataque del juego.
function obtenerCasillasAtacables(juego) {
  const casillas = [];

  for (let y = 0; y < juego.map.length; y++) {
    for (let x = 0; x < juego.map[y].length; x++) {
      if (!juego.esCasillaAtacable(x, y)) {
        continue;
      }

      casillas.push({
        x,
        y,
      });
    }
  }

  return casillas;
}

// Convierte el selector interno del combate
// en una representación gráfica independiente.
function crearSelectorCombateVisual(juego) {
  const selector = juego.selectorCombate;

  if (!selector) {
    return null;
  }

  return {
    x: selector.x,

    y: selector.y,

    esValido: juego.esCasillaAtacable(selector.x, selector.y),
  };
}

// Convierte el selector de interacción
// al mismo formato visual utilizado por Canvas.
//
// Las opciones del selector siempre representan
// entidades interactuables válidas.
function crearSelectorInteraccionVisual(juego) {
  const selector = juego.selectorInteraccion;

  if (!selector || !selector.entidad) {
    return null;
  }

  return {
    x: selector.x,

    y: selector.y,

    esValido: true,
  };
}

// Convierte una entidad del dominio
// en un objeto plano para representación.
function crearEntidadVisual(entidad, tipo) {
  const vidaActual = Number.isFinite(entidad.vidaActual)
    ? entidad.vidaActual
    : null;

  const vidaMaxima = Number.isFinite(entidad.vidaMaxima)
    ? entidad.vidaMaxima
    : null;

  const estaViva = entidad.estaVivo !== false && entidad.estaDestruido !== true;

  return {
    tipo,

    nombre: entidad.nombre,

    x: entidad.x,

    y: entidad.y,

    simbolo:
      tipo === TIPOS_ENTIDAD_VISUAL.JUGADOR && !estaViva
        ? "X"
        : entidad.simbolo,

    estaViva,

    // Solo los enemigos controlados por IA
    // pueden mostrar agresividad.
    estaAgresiva:
      tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO && entidad.estaAgresivo === true,

    vidaActual,
    vidaMaxima,

    mostrarBarraVida:
      tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO &&
      vidaActual !== null &&
      vidaMaxima !== null &&
      vidaActual > 0 &&
      vidaActual < vidaMaxima,

    recursoVisual: entidad.recursoVisual ?? null,
  };
}
