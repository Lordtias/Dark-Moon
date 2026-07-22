import { Entidad } from "../Entidad.js";

import { TIPOS_INTERACCION } from "../../juego/interacciones/TiposInteraccion.js";

import { normalizarSolicitudTransicionMapa } from "../../Partida/TransicionesMapa.js";

// Representa una puerta, portal, escalera o salida
// capaz de solicitar un cambio de mapa.
//
// PortalMapa no conoce ControladorPartida ni crea mapas.
// Solamente ofrece una interacción con una solicitud
// independiente de la tecnología visual.
export class PortalMapa extends Entidad {
  constructor({
    nombre = "Portal",
    x = 0,
    y = 0,
    simbolo = "O",
    recursoVisual = null,
    textoInteraccion = "Usar portal",
    alcance = 1,
    prioridad = 90,
    solicitudTransicionMapa,
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
        `El recurso visual de ${this.nombre} debe ser una ruta válida o null.`,
      );
    }

    this.recursoVisual = recursoVisual === null ? null : recursoVisual.trim();

    this.textoInteraccion = textoInteraccion.trim();

    this.alcance = alcance;
    this.prioridad = prioridad;

    this.solicitudTransicionMapa = normalizarSolicitudTransicionMapa(
      solicitudTransicionMapa,
    );
  }

  // Devuelve la solicitud, pero no realiza
  // directamente el cambio de mapa.
  obtenerInteracciones() {
    return [
      {
        tipo: TIPOS_INTERACCION.TRANSICION_MAPA,

        texto: this.textoInteraccion,

        alcance: this.alcance,

        prioridad: this.prioridad,

        solicitudTransicionMapa: {
          tipo: this.solicitudTransicionMapa.tipo,

          datos: {
            ...this.solicitudTransicionMapa.datos,
          },
        },
      },
    ];
  }
}
