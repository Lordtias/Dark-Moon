import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";
import { NPC } from "../../entidad/interactuable/NPC.js";
import { obtenerPerfilEstadoTemporalVisual } from "./ContextoPerfilesEstadosTemporalesVisuales.js";
import { obtenerPerfilZonaTemporalVisual } from "./ContextoPerfilesZonasTemporalesVisuales.js";
import {
  obtenerRecursosVisualesDireccionalesConfigurados,
  obtenerRutasRecursosVisualesCombatiente,
} from "../../juego/configuracion/RecursosVisualesCombatientes.js";

import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "./TiposEscena.js";

const IDS_VISUALES_ENTIDADES = new WeakMap();
let siguienteIdVisualEntidad = 1;

// La identidad visual vive únicamente en memoria. No modifica las entidades,
// no se persiste y permite relacionar una secuencia de escenas con los eventos
// que describen sus movimientos y acciones.
export function obtenerIdVisualEntidad(entidad) {
  if (!entidad || typeof entidad !== "object") {
    throw new Error("La identidad visual necesita una entidad válida.");
  }

  if (!IDS_VISUALES_ENTIDADES.has(entidad)) {
    IDS_VISUALES_ENTIDADES.set(
      entidad,
      `entidad-visual-${siguienteIdVisualEntidad++}`,
    );
  }

  return IDS_VISUALES_ENTIDADES.get(entidad);
}

// Convierte el estado completo de Juego
// en una escena gráfica sencilla.
//
// La escena contiene únicamente:
//
// - Mapa.
// - Apariencia del bioma.
// - Rango y selector de combate.
// - Selector de interacción.
// - Selector de habilidad.
// - Solicitudes neutrales de orientación visual.
// - Entidades visibles.
//
// Los selectores comparten un único contrato visual neutral de esquinas.
export function crearRecursosVisualesMapa(
  juego,
  { configuracionPersonaje = null, configuracionEnemigos = null } = {},
) {
  validarJuego(juego);

  const entidades = [
    { entidad: juego.player, tipo: TIPOS_ENTIDAD_VISUAL.JUGADOR },
    ...(Array.isArray(juego.interactuables) ? juego.interactuables : []).map(
      (entidad) => ({ entidad, tipo: TIPOS_ENTIDAD_VISUAL.INTERACTUABLE }),
    ),
    ...(Array.isArray(juego.objetivos) ? juego.objetivos : []).map((entidad) => ({
      entidad,
      tipo:
        entidad instanceof Enemigo
          ? TIPOS_ENTIDAD_VISUAL.ENEMIGO
          : TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE,
    })),
  ];

  return Object.freeze([
    ...new Set(
      entidades.flatMap(({ entidad, tipo }) =>
        obtenerRecursosVisualesPrecarga(
          entidad,
          obtenerConfiguracionRecursoVisualCombatiente({
            entidad,
            tipo,
            configuracionPersonaje,
            configuracionEnemigos,
          }),
        ),
      ),
    ),
  ]);
}

export function crearEscenaJuego(
  juego,
  {
    habilidad = null,
    configuracionPersonaje = null,
    configuracionEnemigos = null,
    orientacionesSolicitadas = [],
  } = {},
) {
  validarJuego(juego);

  const combateActivo = juego.modoCombateActivo === true;
  const interaccionActiva = juego.modoInteraccionActivo === true;
  const habilidadActiva = habilidad?.activo === true;

  const visibilidad = obtenerVisibilidadEscena(juego);
  const casillasVisibles = new Set(
    visibilidad.casillasVisibles.map(({ x, y }) => `${x},${y}`),
  );

  // El bloque visual "combate" conserva un contrato común para los selectores
  // sin mezclar las reglas de combate, interacción y habilidades.
  const selectorMapaActivo =
    combateActivo || interaccionActiva || habilidadActiva;
  const selectorVisual = combateActivo
    ? crearSelectorCombateVisual(juego, casillasVisibles)
    : interaccionActiva
      ? crearSelectorInteraccionVisual(juego, casillasVisibles)
      : habilidadActiva
        ? crearSelectorHabilidadVisual(habilidad, juego, casillasVisibles)
        : null;

  return {
    mapa: {
      casillas: juego.map,

      // Copiamos la apariencia para evitar
      // entregar una referencia directa
      // a la configuración del mapa.
      apariencia: {
        ...juego.mapaSeleccionado?.apariencia,
      },
      visibilidad,
      perfilesHabitacion: crearPerfilesHabitacionVisuales(juego),
    },

    zonasTemporales: copiarZonasTemporales(
      typeof juego.obtenerZonasTemporales === "function"
        ? juego.obtenerZonasTemporales()
        : [],
    ),

    combate: {
      activo: selectorMapaActivo,
      habilidad: habilidadActiva
        ? copiarDescriptorHabilidadVisual(habilidad.habilidad)
        : null,
      modo: combateActivo
        ? "combate"
        : interaccionActiva
          ? "interaccion"
          : habilidadActiva
            ? "habilidad"
            : null,
      casillasAtacables: combateActivo
        ? obtenerCasillasAtacables(juego)
        : habilidadActiva
          ? copiarPosiciones(habilidad.casillasSeleccionables)
          : [],
      casillasAfectadas: habilidadActiva
        ? copiarPosiciones(habilidad.casillasAfectadas)
        : [],
      objetivosAfectados: habilidadActiva
        ? copiarObjetivosHabilidadVisibles({
            juego,
            lista: habilidad.objetivosAfectados,
            casillasVisibles,
          })
        : [],
      recorrido: habilidadActiva
        ? copiarObjetivosHabilidad(habilidad.recorrido)
        : [],
      selector: selectorVisual,
    },

    // La orientación visual es un contrato neutral: describe qué entidad debe
    // mirar desde una posición hacia otra, sin indicar qué sistema jugable
    // originó la intención. Por ahora la selección táctica orienta al jugador.
    orientacionesVisuales: [
      ...crearOrientacionesVisualesJugador({
        jugador: juego.player,
        selector: selectorVisual,
      }),
      ...crearOrientacionesVisualesSolicitadas(orientacionesSolicitadas),
    ],

    // Los interactuables se dibujan primero.
    // El jugador queda al final para conservarse
    // visible cuando comparte una casilla con botín.
    entidades: [
      ...juego.interactuables
        .filter((interactuable) => !juego.objetivos.includes(interactuable))
        .filter(
          (interactuable) =>
            !(interactuable instanceof NPC) ||
            casillasVisibles.has(`${interactuable.x},${interactuable.y}`),
        )
        .map((interactuable) =>
          crearEntidadVisual(
            interactuable,
            TIPOS_ENTIDAD_VISUAL.INTERACTUABLE,
            juego,
            { configuracionPersonaje, configuracionEnemigos },
          ),
        ),

      ...juego.objetivos
        .filter((objetivo) => objetivo.estaDestruido !== true)
        .filter(
          (objetivo) =>
            !(objetivo instanceof Enemigo) ||
            casillasVisibles.has(`${objetivo.x},${objetivo.y}`),
        )
        .map((objetivo) =>
          crearEntidadVisual(
            objetivo,
            objetivo instanceof Enemigo
              ? TIPOS_ENTIDAD_VISUAL.ENEMIGO
              : TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE,
            juego,
            { configuracionPersonaje, configuracionEnemigos },
          ),
        ),

      crearEntidadVisual(
        juego.player,
        TIPOS_ENTIDAD_VISUAL.JUGADOR,
        juego,
        { configuracionPersonaje, configuracionEnemigos },
      ),
    ],
  };
}

function crearPerfilesHabitacionVisuales(juego) {
  const plano = juego.planoMazmorra;
  const perfiles = plano?.planPoblacion?.habitaciones;
  if (!Array.isArray(perfiles) || !Array.isArray(plano?.habitaciones)) {
    return [];
  }

  const perfilPorHabitacion = new Map(
    perfiles.map((entrada) => [entrada.idHabitacion, entrada.perfil]),
  );

  return plano.habitaciones
    .map((habitacion) => ({
      idHabitacion: habitacion.id,
      perfil: perfilPorHabitacion.get(habitacion.id) ?? null,
      casillas: copiarPosiciones(habitacion.casillas ?? []),
    }))
    .filter((entrada) => entrada.perfil !== null);
}

function obtenerVisibilidadEscena(juego) {
  const estado =
    typeof juego.obtenerEstadoVisibilidadJugador === "function"
      ? juego.obtenerEstadoVisibilidadJugador()
      : {
          campoVisible: false,
          descubrimiento: false,
          alcance: null,
          casillasVisibles: obtenerTodasLasCasillas(juego.map),
          casillasDescubiertas: obtenerTodasLasCasillas(juego.map),
        };

  return {
    campoVisible: estado.campoVisible === true,
    descubrimiento: estado.descubrimiento === true,
    alcance: Number.isFinite(estado.alcance) ? estado.alcance : null,
    casillasVisibles: copiarPosiciones(estado.casillasVisibles),
    casillasDescubiertas: copiarPosiciones(estado.casillasDescubiertas),
  };
}

function obtenerTodasLasCasillas(mapa) {
  const casillas = [];
  for (let y = 0; y < mapa.length; y++) {
    for (let x = 0; x < mapa[y].length; x++) {
      casillas.push({ x, y });
    }
  }
  return casillas;
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
function crearSelectorCombateVisual(juego, casillasVisibles) {
  const selector = juego.selectorCombate;

  if (!selector) {
    return null;
  }

  return {
    x: selector.x,
    y: selector.y,
    esValido:
      !hayEnemigoOcultoEn(juego, casillasVisibles, selector.x, selector.y) &&
      juego.esCasillaAtacable(selector.x, selector.y),
  };
}

// Convierte el selector de interacción
// al mismo formato visual utilizado por Canvas.
//
// Las opciones del selector siempre representan
// entidades interactuables válidas.
function crearSelectorInteraccionVisual(juego, casillasVisibles) {
  const selector = juego.selectorInteraccion;

  if (!selector || !selector.entidad) {
    return null;
  }

  if (
    selector.entidad instanceof NPC &&
    !casillasVisibles.has(`${selector.x},${selector.y}`)
  ) {
    return null;
  }

  return {
    x: selector.x,
    y: selector.y,
    esValido: true,
  };
}

// Convierte la selección de una habilidad en el contrato visual común.
// La casilla se marca como válida únicamente cuando contiene un objetivo y
// también cumple alcance, patrón y línea de visión.
function crearSelectorHabilidadVisual(habilidad, juego, casillasVisibles) {
  const selector = habilidad?.selector;

  if (!selector) {
    return null;
  }

  return {
    x: selector.x,
    y: selector.y,
    esValido:
      selector.puedeEjecutar === true &&
      !hayEnemigoOcultoEn(juego, casillasVisibles, selector.x, selector.y),
  };
}

function crearOrientacionesVisualesJugador({ jugador, selector } = {}) {
  if (
    !jugador ||
    !Number.isFinite(jugador.x) ||
    !Number.isFinite(jugador.y) ||
    !Number.isFinite(selector?.x) ||
    !Number.isFinite(selector?.y)
  ) {
    return [];
  }

  const origen = { x: jugador.x, y: jugador.y };
  const objetivo = { x: selector.x, y: selector.y };

  if (origen.x === objetivo.x && origen.y === objetivo.y) {
    return [];
  }

  return [
    {
      idVisual: obtenerIdVisualEntidad(jugador),
      origen,
      objetivo,
    },
  ];
}

function crearOrientacionesVisualesSolicitadas(solicitudes = []) {
  if (!Array.isArray(solicitudes)) {
    return [];
  }

  return solicitudes.flatMap((solicitud) => {
    if (
      !solicitud?.entidad ||
      !Number.isFinite(solicitud?.origen?.x) ||
      !Number.isFinite(solicitud?.origen?.y) ||
      !Number.isFinite(solicitud?.objetivo?.x) ||
      !Number.isFinite(solicitud?.objetivo?.y)
    ) {
      return [];
    }

    if (
      solicitud.origen.x === solicitud.objetivo.x &&
      solicitud.origen.y === solicitud.objetivo.y
    ) {
      return [];
    }

    return [
      {
        idVisual: obtenerIdVisualEntidad(solicitud.entidad),
        origen: { x: solicitud.origen.x, y: solicitud.origen.y },
        objetivo: { x: solicitud.objetivo.x, y: solicitud.objetivo.y },
      },
    ];
  });
}

function copiarDescriptorHabilidadVisual(habilidad) {
  if (!habilidad || typeof habilidad !== "object") return null;
  return {
    id: habilidad.id ?? null,
    nombre: habilidad.nombre ?? null,
    maestria: habilidad.maestria ?? null,
    grado: habilidad.grado ?? null,
    tipoObjetivo: habilidad.tipoObjetivo ?? null,
    formaImpacto: copiarValorSimple(habilidad.formaImpacto),
    zonaTemporal: copiarValorSimple(habilidad.zonaTemporal),
  };
}

function copiarValorSimple(valor) {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map(copiarValorSimple);
  return Object.fromEntries(
    Object.entries(valor).map(([clave, contenido]) => [
      clave,
      copiarValorSimple(contenido),
    ]),
  );
}

function copiarPosiciones(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map(({ x, y }) => ({ x, y }));
}

function copiarObjetivosHabilidad(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map(({ x, y, orden = 0 }) => ({ x, y, orden }));
}

function copiarObjetivosHabilidadVisibles({
  juego,
  lista,
  casillasVisibles,
}) {
  if (!Array.isArray(lista)) return [];

  return copiarObjetivosHabilidad(
    lista.filter(
      ({ x, y }) => !hayEnemigoOcultoEn(juego, casillasVisibles, x, y),
    ),
  );
}

function hayEnemigoOcultoEn(juego, casillasVisibles, x, y) {
  const enemigo = juego.objetivos.find(
    (objetivo) =>
      objetivo instanceof Enemigo &&
      objetivo.estaDestruido !== true &&
      objetivo.x === x &&
      objetivo.y === y,
  );

  return Boolean(enemigo) && !casillasVisibles.has(`${x},${y}`);
}

function copiarZonasTemporales(lista) {
  if (!Array.isArray(lista)) return [];

  return lista.map((zona) => {
    const apariencia = zona.apariencia ?? "generica";
    return {
      id: zona.id,
      idHabilidad: zona.idHabilidad ?? null,
      nombre: zona.nombre,
      grado: Number.isInteger(zona.grado) ? zona.grado : 1,
      apariencia,
      grupoSuperposicion: zona.grupoSuperposicion ?? null,
      politicaSuperposicion: zona.politicaSuperposicion ?? null,
      activadores: Array.isArray(zona.activadores)
        ? [...zona.activadores]
        : [],
      creadaEn: zona.creadaEn,
      venceEn: zona.venceEn,
      duracion: zona.duracion ?? null,
      proximaActivacionEn: zona.proximaActivacion,
      tiempoRestante: zona.tiempoRestante,
      casillas: copiarPosiciones(zona.casillas),
      perfilVisual: obtenerPerfilZonaTemporalVisual(apariencia),
    };
  });
}

// Convierte una entidad del dominio
// en un objeto plano para representación.
function crearEntidadVisual(
  entidad,
  tipo,
  juego,
  { configuracionPersonaje = null, configuracionEnemigos = null } = {},
) {
  const vidaActual = Number.isFinite(entidad.vidaActual)
    ? entidad.vidaActual
    : null;

  const vidaMaxima = Number.isFinite(entidad.vidaMaxima)
    ? entidad.vidaMaxima
    : null;

  const estaViva = entidad.estaVivo !== false && entidad.estaDestruido !== true;
  const configuracionRecursoVisual =
    obtenerConfiguracionRecursoVisualCombatiente({
      entidad,
      tipo,
      configuracionPersonaje,
      configuracionEnemigos,
    });
  const recursosVisualesDireccionales = configuracionRecursoVisual
    ? obtenerRecursosVisualesDireccionalesConfigurados(
        configuracionRecursoVisual,
        { descripcion: `el recurso visual de ${entidad.nombre}` },
      )
    : Object.freeze({});

  return {
    idVisual: obtenerIdVisualEntidad(entidad),
    tipo,
    nombre: entidad.nombre,
    x: entidad.x,
    y: entidad.y,
    simbolo:
      tipo === TIPOS_ENTIDAD_VISUAL.JUGADOR && !estaViva
        ? "X"
        : entidad.simbolo,
    estaViva,
    ocultablePorFov:
      entidad instanceof Enemigo || entidad instanceof NPC,

    // El backend gráfico recibe un estado textual
    // en lugar del booleano propio de Enemigo.
    //
    // Esto permite ampliar la representación visual
    // sin acoplarla al dominio o a una tecnología.
    estadoHostilidad:
      tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO
        ? entidad.estaAgresivo === true
          ? ESTADOS_HOSTILIDAD_VISUAL.AGRESIVO
          : ESTADOS_HOSTILIDAD_VISUAL.PASIVO
        : null,

    vidaActual,
    vidaMaxima,
    mostrarBarraVida:
      tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO &&
      vidaActual !== null &&
      vidaMaxima !== null &&
      vidaActual > 0 &&
      vidaActual < vidaMaxima,

    idVariante:
      tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO
        ? entidad.idVariante ?? null
        : null,

    recursoVisual: entidad.recursoVisual ?? null,
    recursosVisualesDireccionales,
    recursosVisualesPrecarga: obtenerRecursosVisualesPrecarga(
      entidad,
      configuracionRecursoVisual,
    ),
    activo: typeof entidad.activo === "boolean" ? entidad.activo : null,
    atenuarInactivo:
      typeof entidad.atenuarInactivo === "boolean"
        ? entidad.atenuarInactivo
        : true,
    efectosTemporales: crearEfectosTemporalesVisuales(juego, entidad),
  };
}

function obtenerConfiguracionRecursoVisualCombatiente({
  entidad,
  tipo,
  configuracionPersonaje,
  configuracionEnemigos,
}) {
  if (tipo === TIPOS_ENTIDAD_VISUAL.JUGADOR) {
    return (
      configuracionPersonaje?.profesiones?.[entidad?.idProfesion]
        ?.recursoVisual ?? null
    );
  }

  if (tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO) {
    return (
      configuracionEnemigos?.plantillas?.[entidad?.idPlantilla]
        ?.recursoVisual ?? null
    );
  }

  return null;
}

function obtenerRecursosVisualesPrecarga(
  entidad,
  configuracionRecursoVisual = null,
) {
  const candidatas = [
    entidad?.recursoVisual,
    entidad?.recursoVisualCerrada,
    entidad?.recursoVisualAbierta,
    entidad?.recursoVisualCerrado,
    entidad?.recursoVisualAbierto,
    entidad?.recursoVisualActivo,
    entidad?.recursoVisualInactivo,
    ...(configuracionRecursoVisual
      ? obtenerRutasRecursosVisualesCombatiente(configuracionRecursoVisual, {
          descripcion: `el recurso visual de ${entidad?.nombre ?? "combatiente"}`,
        })
      : []),
  ];

  return [
    ...new Set(
      candidatas
        .filter((ruta) => typeof ruta === "string")
        .map((ruta) => ruta.trim())
        .filter(Boolean),
    ),
  ];
}

function crearEfectosTemporalesVisuales(juego, entidad) {
  if (typeof juego?.obtenerEfectosTemporales !== "function") return [];

  const efectos = juego.obtenerEfectosTemporales(entidad);
  if (!Array.isArray(efectos)) return [];

  return efectos.map((efecto) => {
    const catalogoEfectoId = efecto.efectoId ?? null;
    return {
      id: efecto.id ?? null,
      catalogoEfectoId,
      nombre: efecto.nombreEfecto ?? catalogoEfectoId,
      tipo: efecto.tipo ?? null,
      perfilAplicacion: efecto.perfilAplicacion ?? null,
      intensidad: Number.isFinite(efecto.intensidad) ? efecto.intensidad : 1,
      cantidad: Number.isFinite(efecto.cantidad) ? efecto.cantidad : 1,
      maximo: Number.isFinite(efecto.maximo) ? efecto.maximo : 1,
      aplicadoEn: Number.isFinite(efecto.aplicadoEn) ? efecto.aplicadoEn : null,
      venceEn: Number.isFinite(efecto.venceEn) ? efecto.venceEn : null,
      proximoTick: Number.isFinite(efecto.proximoTick) ? efecto.proximoTick : null,
      beneficioso: efecto.beneficioso === true,
      etiquetas: Array.isArray(efecto.etiquetas) ? [...efecto.etiquetas] : [],
      suspendido: efecto.suspendido === true,
      perfilVisual: obtenerPerfilEstadoTemporalVisual(catalogoEfectoId),
    };
  });
}
