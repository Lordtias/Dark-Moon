import { Entidad } from "../Entidad.js";

import { TIPOS_INTERACCION } from "../../juego/interacciones/TiposInteraccion.js";

import { normalizarSolicitudTransicionMapa } from "../../partida/TransicionesMapa.js";

export const RECURSO_VISUAL_PORTAL_ACTIVO_PREDETERMINADO =
  "assets/imagenes/interactuables/portal_magico_activado.png";
export const RECURSO_VISUAL_PORTAL_INACTIVO_PREDETERMINADO =
  "assets/imagenes/interactuables/portal_magico_desactivado.png";

// Alias de compatibilidad con el contrato anterior.
export const RECURSO_VISUAL_PORTAL_PREDETERMINADO =
  RECURSO_VISUAL_PORTAL_ACTIVO_PREDETERMINADO;

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
// Los portales mágicos sin recurso específico disponen de sprites separados
// para activo/inactivo. Si un consumidor proporciona un recursoVisual propio
// (por ejemplo, una puerta de ciudad), se conserva como representación de ambos
// estados salvo que también suministre recursoVisualInactivo explícitamente.
export class PortalMapa extends Entidad {
  constructor({
    nombre = "Portal",
    x = 0,
    y = 0,
    simbolo = "O",

    recursoVisual = undefined,
    recursoVisualActivo = undefined,
    recursoVisualInactivo = undefined,

    textoInteraccion = "Usar portal",
    alcance = 1,
    prioridad = 90,

    tipoInteraccion = TIPOS_INTERACCION.TRANSICION_MAPA,

    solicitudTransicionMapa = null,

    activo = true,
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

    if (typeof activo !== "boolean") {
      throw new Error(`El estado activo de ${this.nombre} debe ser booleano.`);
    }

    if (!TIPOS_INTERACCION_PORTAL_VALIDOS.has(tipoInteraccion)) {
      throw new Error(
        `El tipo de interacción "${tipoInteraccion}" ` +
          `no es válido para ${this.nombre}.`,
      );
    }

    const recursos = resolverRecursosVisualesPortal({
      recursoVisual,
      recursoVisualActivo,
      recursoVisualInactivo,
    });
    validarRecursoVisual(recursos.activo, "activo", this.nombre);
    validarRecursoVisual(recursos.inactivo, "inactivo", this.nombre);

    this.recursoVisualActivo = normalizarRecursoVisual(recursos.activo);
    this.recursoVisualInactivo = normalizarRecursoVisual(recursos.inactivo);
    this.atenuarInactivo =
      this.recursoVisualActivo === this.recursoVisualInactivo;

    this.textoInteraccion = textoInteraccion.trim();

    this.alcance = alcance;

    this.prioridad = prioridad;

    this.tipoInteraccion = tipoInteraccion;

    this.activo = activo;

    // Solamente las transiciones inmediatas necesitan
    // contener una solicitud concreta.
    if (
      activo &&
      tipoInteraccion === TIPOS_INTERACCION.TRANSICION_MAPA &&
      solicitudTransicionMapa === null
    ) {
      throw new Error(
        `${this.nombre} activo necesita una solicitud de transición válida.`,
      );
    }

    this.solicitudTransicionMapa =
      tipoInteraccion === TIPOS_INTERACCION.TRANSICION_MAPA &&
      solicitudTransicionMapa !== null
        ? normalizarSolicitudTransicionMapa(solicitudTransicionMapa)
        : null;

    this.actualizarEstadoRepresentable();
  }

  activar() {
    if (
      this.tipoInteraccion === TIPOS_INTERACCION.TRANSICION_MAPA &&
      !this.solicitudTransicionMapa
    ) {
      throw new Error(
        `${this.nombre} no puede activarse sin una solicitud de transición.`,
      );
    }

    this.activo = true;
    this.actualizarEstadoRepresentable();
    return this.activo;
  }

  desactivar() {
    this.activo = false;
    this.actualizarEstadoRepresentable();
    return this.activo;
  }

  actualizarEstadoRepresentable() {
    this.recursoVisual = this.activo
      ? this.recursoVisualActivo
      : this.recursoVisualInactivo;
  }

  obtenerInteracciones() {
    if (!this.activo) {
      return [];
    }

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

function resolverRecursosVisualesPortal({
  recursoVisual,
  recursoVisualActivo,
  recursoVisualInactivo,
}) {
  const hayRecursoGenerico = recursoVisual !== undefined;
  const hayRecursoActivo = recursoVisualActivo !== undefined;
  const activo = hayRecursoActivo
    ? recursoVisualActivo
    : hayRecursoGenerico
      ? recursoVisual
      : RECURSO_VISUAL_PORTAL_ACTIVO_PREDETERMINADO;

  const inactivo =
    recursoVisualInactivo !== undefined
      ? recursoVisualInactivo
      : !hayRecursoGenerico && !hayRecursoActivo
        ? RECURSO_VISUAL_PORTAL_INACTIVO_PREDETERMINADO
        : activo;

  return { activo, inactivo };
}

function validarRecursoVisual(recurso, estado, nombre) {
  if (
    recurso !== null &&
    (typeof recurso !== "string" || recurso.trim() === "")
  ) {
    throw new Error(
      `El recurso visual de ${nombre} en estado ${estado} debe ser una ruta válida o null.`,
    );
  }
}

function normalizarRecursoVisual(recurso) {
  return recurso === null ? null : recurso.trim();
}
