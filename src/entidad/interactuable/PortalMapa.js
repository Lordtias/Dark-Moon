import { Entidad } from "../Entidad.js";

import { TIPOS_INTERACCION } from "../../juego/interacciones/TiposInteraccion.js";

import { normalizarSolicitudTransicionMapa } from "../../Partida/TransicionesMapa.js";

export const RECURSO_VISUAL_PORTAL_PREDETERMINADO =
  "assets/imagenes/interactuables/portal_magico.png";

const TIPOS_INTERACCION_PORTAL_VALIDOS = new Set([
  TIPOS_INTERACCION.TRANSICION_MAPA,
  TIPOS_INTERACCION.SELECCIONAR_MAZMORRA,
]);

// Representa una puerta, portal, escalera o salida
// capaz de ofrecer una interacción relacionada con mapas.
//
// Una salida normal entrega una solicitud de transición.
// La entrada principal de la ciudad puede solicitar primero
// que el jugador elija una mazmorra.
//
// Cuando no se define una imagen concreta, utiliza
// el portal mágico genérico. Una puerta o escalera puede
// reemplazarlo desde su configuración mediante recursoVisual.
export class PortalMapa extends Entidad {
  constructor({
    nombre = "Portal",
    x = 0,
    y = 0,
    simbolo = "O",

    recursoVisual = RECURSO_VISUAL_PORTAL_PREDETERMINADO,

    textoInteraccion = "Usar portal",
    alcance = 1,
    prioridad = 90,

    tipoInteraccion = TIPOS_INTERACCION.TRANSICION_MAPA,

    solicitudTransicionMapa = null,
  } = {}) {
    super({
      nombre,
      x,
      y,
      simbolo,
    });

    if (
      typeof textoInteraccion !== "string" ||
      textoInteraccion.trim() === ""
    ) {
      throw new Error(
        `${this.nombre} necesita un texto de interacción válido.`,
      );
    }

    if (!Number.isInteger(alcance) || alcance < 0) {
      throw new Error(
        `El alcance de ${this.nombre} debe ser un entero no negativo.`,
      );
    }

    if (!Number.isFinite(prioridad)) {
      throw new Error(`La prioridad de ${this.nombre} debe ser numérica.`);
    }

    if (
      recursoVisual !== null &&
      (typeof recursoVisual !== "string" || recursoVisual.trim() === "")
    ) {
      throw new Error(
        `El recurso visual de ${this.nombre} ` +
          "debe ser una ruta válida o null.",
      );
    }

    if (!TIPOS_INTERACCION_PORTAL_VALIDOS.has(tipoInteraccion)) {
      throw new Error(
        `El tipo de interacción "${tipoInteraccion}" ` +
          `no es válido para ${this.nombre}.`,
      );
    }

    this.recursoVisual = recursoVisual === null ? null : recursoVisual.trim();

    this.textoInteraccion = textoInteraccion.trim();

    this.alcance = alcance;

    this.prioridad = prioridad;

    this.tipoInteraccion = tipoInteraccion;

    // Solamente las transiciones inmediatas necesitan
    // contener una solicitud concreta.
    this.solicitudTransicionMapa =
      tipoInteraccion === TIPOS_INTERACCION.TRANSICION_MAPA
        ? normalizarSolicitudTransicionMapa(solicitudTransicionMapa)
        : null;
  }

  obtenerInteracciones() {
    const interaccion = {
      tipo: this.tipoInteraccion,

      texto: this.textoInteraccion,

      alcance: this.alcance,

      prioridad: this.prioridad,
    };

    if (this.solicitudTransicionMapa) {
      interaccion.solicitudTransicionMapa = {
        tipo: this.solicitudTransicionMapa.tipo,

        datos: {
          ...this.solicitudTransicionMapa.datos,
        },
      };
    }

    return [interaccion];
  }
}
