import { BotinSuelo } from "../../entidad/interactuable/BotinSuelo.js";
import { PortalMapa } from "../../entidad/interactuable/PortalMapa.js";
import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";
import { crearObjetosDesdeDefiniciones } from "../../objetos/FabricaObjetos.js";
import {
  crearSolicitudTransicionMapa,
  TIPOS_TRANSICION_MAPA,
} from "../../juego/interacciones/TransicionesMapa.js";
import { consultarTerrenoMapa } from "../../juego/espacio/SistemaEspacial.js";

const DEFINICIONES_BOTIN_PRUEBA = Object.freeze([
  { id: "pocion_curacion", cantidad: 1 },
  { id: "flecha_madera", cantidad: 8 },
  { id: "daga_hierro", cantidad: 1 },
]);

const DIRECCIONES_INTERACTUABLES_PRUEBA = Object.freeze([
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
]);

// Agrega recursos controlados exclusivamente para pruebas manuales.
// La configuración canónica de la mazmorra ya debe existir antes de llamar
// esta función; aquí solamente se anexan interactuables de diagnóstico.
export function agregarRecursosPruebaMapa({
  configuracionMapa,
  configuracionObjetos,
  botinPrueba = false,
  portalPrueba = false,
} = {}) {
  if (!configuracionMapa || typeof configuracionMapa !== "object") {
    throw new Error("Se necesita una configuración de mapa para agregar recursos de prueba.");
  }

  const mapa = configuracionMapa.map;
  const player = configuracionMapa.player;
  const objetivos = Array.isArray(configuracionMapa.objetivos)
    ? configuracionMapa.objetivos
    : [];
  const interactuables = Array.isArray(configuracionMapa.interactuables)
    ? configuracionMapa.interactuables
    : [];
  const posicionesOcupadas = interactuables
    .filter(
      (entidad) => Number.isInteger(entidad?.x) && Number.isInteger(entidad?.y),
    )
    .map((entidad) => ({ x: entidad.x, y: entidad.y }));
  const agregados = [];

  if (botinPrueba) {
    const objetos = crearObjetosDesdeDefiniciones({
      configuracionObjetos,
      definiciones: DEFINICIONES_BOTIN_PRUEBA,
    });
    const posicion = obtenerPosicionInteractuablePrueba({
      mapa,
      player,
      objetivos,
      posicionesOcupadas,
    });
    const botin = new BotinSuelo({
      nombre: "Botín de prueba",
      x: posicion.x,
      y: posicion.y,
      contenedorObjetos: new ContenedorObjetos({
        capacidad: 6,
        objetosIniciales: objetos,
      }),
    });

    interactuables.push(botin);
    agregados.push(botin);
    posicionesOcupadas.push(posicion);
  }

  if (portalPrueba) {
    const posicion = obtenerPosicionInteractuablePrueba({
      mapa,
      player,
      objetivos,
      posicionesOcupadas,
    });
    const portal = new PortalMapa({
      nombre: "Portal inestable",
      x: posicion.x,
      y: posicion.y,
      simbolo: "O",
      textoInteraccion: "Atravesar portal",
      solicitudTransicionMapa: crearSolicitudTransicionMapa({
        tipo: TIPOS_TRANSICION_MAPA.NUEVA_EXPEDICION,
        datos: {
          portalPrueba: true,
        },
      }),
    });

    interactuables.push(portal);
    agregados.push(portal);
    posicionesOcupadas.push(posicion);
  }

  return agregados;
}

function obtenerPosicionInteractuablePrueba({
  mapa,
  player,
  objetivos,
  posicionesOcupadas,
}) {
  if (!player || !Number.isInteger(player.x) || !Number.isInteger(player.y)) {
    throw new Error("Los recursos de prueba necesitan un jugador posicionado.");
  }

  for (const direccion of DIRECCIONES_INTERACTUABLES_PRUEBA) {
    const x = player.x + direccion.x;
    const y = player.y + direccion.y;
    const terreno = consultarTerrenoMapa(mapa, x, y);

    if (!terreno.dentroMapa || terreno.bloqueaMovimiento) {
      continue;
    }

    const ocupadoPorObjetivo = objetivos.some(
      (objetivo) =>
        objetivo.estaDestruido !== true && objetivo.x === x && objetivo.y === y,
    );
    const ocupadoPorInteractuable = posicionesOcupadas.some(
      (posicion) => posicion.x === x && posicion.y === y,
    );

    if (!ocupadoPorObjetivo && !ocupadoPorInteractuable) {
      return { x, y };
    }
  }

  return { x: player.x, y: player.y };
}
