import { Entidad } from "../Entidad.js";
import { TIPOS_INTERACCION } from "../../juego/interacciones/TiposInteraccion.js";
import {
  crearMensajeTraducible,
  crearParametroEntidadMensaje,
  TIPOS_MENSAJE_JUEGO,
} from "../../juego/mensajes/MensajesJuego.js";

export const ORIENTACIONES_PUERTA = Object.freeze({
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
});

export const RECURSOS_VISUALES_PUERTA_PREDETERMINADOS = Object.freeze({
  [ORIENTACIONES_PUERTA.HORIZONTAL]: Object.freeze({
    cerrada: "assets/imagenes/interactuables/puerta_mazmorra_cerrada_horizontal.png",
    abierta: "assets/imagenes/interactuables/puerta_mazmorra_abierta_horizontal.png",
  }),
  [ORIENTACIONES_PUERTA.VERTICAL]: Object.freeze({
    cerrada: "assets/imagenes/interactuables/puerta_mazmorra_cerrada_vertical.png",
    abierta: "assets/imagenes/interactuables/puerta_mazmorra_abierta_vertical.png",
  }),
});

// Puerta interactuable integrada al sistema espacial canónico.
//
// Cerrada:
// - bloquea movimiento;
// - bloquea visión.
//
// Abierta:
// - permite movimiento;
// - permite visión.
//
// La orientación es un dato representable y no modifica las reglas espaciales.
// Se decide a partir del acceso estructural para que Phaser no tenga que
// inferirla desde el mapa.
export class Puerta extends Entidad {
  constructor({
    nombre = "Puerta",
    x = 0,
    y = 0,
    abierta = false,
    orientacion = ORIENTACIONES_PUERTA.VERTICAL,
    recursoVisualCerrada = undefined,
    recursoVisualAbierta = undefined,
    simboloCerrada = "+",
    simboloAbierta = "/",
    alcance = 1,
    prioridad = 85,
  } = {}) {
    validarBooleano(abierta, "abierta", nombre);
    const orientacionNormalizada = normalizarOrientacion(orientacion, nombre);
    const recursosPredeterminados =
      RECURSOS_VISUALES_PUERTA_PREDETERMINADOS[orientacionNormalizada];
    const recursoCerradaResuelto =
      recursoVisualCerrada === undefined
        ? recursosPredeterminados.cerrada
        : recursoVisualCerrada;
    const recursoAbiertaResuelto =
      recursoVisualAbierta === undefined
        ? recursosPredeterminados.abierta
        : recursoVisualAbierta;

    validarRecursoVisual(recursoCerradaResuelto, "cerrada", nombre);
    validarRecursoVisual(recursoAbiertaResuelto, "abierta", nombre);
    validarSimbolo(simboloCerrada, "cerrada", nombre);
    validarSimbolo(simboloAbierta, "abierta", nombre);

    if (!Number.isInteger(alcance) || alcance < 0) {
      throw new Error(`El alcance de ${nombre} debe ser un entero no negativo.`);
    }
    if (!Number.isFinite(prioridad)) {
      throw new Error(`La prioridad de ${nombre} debe ser numérica.`);
    }

    super({
      nombre,
      x,
      y,
      simbolo: abierta ? simboloAbierta : simboloCerrada,
      bloqueaMovimiento: !abierta,
      bloqueaVision: !abierta,
    });

    this.abierta = abierta;
    this.orientacion = orientacionNormalizada;
    this.recursoVisualCerrada = normalizarRecursoVisual(recursoCerradaResuelto);
    this.recursoVisualAbierta = normalizarRecursoVisual(recursoAbiertaResuelto);
    this.simboloCerrada = simboloCerrada.trim();
    this.simboloAbierta = simboloAbierta.trim();
    this.alcance = alcance;
    this.prioridad = prioridad;

    this.actualizarEstadoRepresentable();
  }

  abrir() {
    if (this.abierta) return false;
    this.abierta = true;
    this.actualizarEstadoRepresentable();
    return true;
  }

  cerrar() {
    if (!this.abierta) return false;
    this.abierta = false;
    this.actualizarEstadoRepresentable();
    return true;
  }

  activar({ contexto = null } = {}) {
    if (this.abierta && this.estaOcupadaPorOtraEntidad(contexto)) {
      return {
        exito: false,
        mensaje: crearMensajeTraducible(
          "mensajes.interacciones.puertaOcupada",
          {
            parametros: {
              entidad: crearParametroEntidadMensaje(this),
            },
            tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
            respaldo: `No podés cerrar ${this.nombre} mientras alguien ocupa el paso.`,
          },
        ),
        redibujar: false,
        puertaAbierta: true,
      };
    }

    this.abierta = !this.abierta;
    this.actualizarEstadoRepresentable();

    return {
      exito: true,
      mensaje: crearMensajeTraducible(
        this.abierta
          ? "mensajes.interacciones.puertaAbierta"
          : "mensajes.interacciones.puertaCerrada",
        {
          parametros: {
            entidad: crearParametroEntidadMensaje(this),
          },
          tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
          respaldo: this.abierta
            ? `Abriste ${this.nombre}.`
            : `Cerraste ${this.nombre}.`,
        },
      ),
      redibujar: true,
      puertaAbierta: this.abierta,
    };
  }

  estaOcupadaPorOtraEntidad(contexto) {
    const sistemaEspacial = contexto?.juego?.sistemaEspacial;
    if (typeof sistemaEspacial?.obtenerEntidadesEn !== "function") {
      return false;
    }

    return sistemaEspacial
      .obtenerEntidadesEn(this.x, this.y)
      .some((entidad) => entidad !== this);
  }

  obtenerInteracciones() {
    return [
      {
        tipo: TIPOS_INTERACCION.ACTIVAR,
        texto: this.abierta ? "Cerrar puerta" : "Abrir puerta",
        alcance: this.alcance,
        prioridad: this.prioridad,
      },
    ];
  }

  actualizarEstadoRepresentable() {
    this.configurarObstruccionEspacial({
      bloqueaMovimiento: !this.abierta,
      bloqueaVision: !this.abierta,
    });

    this.simbolo = this.abierta ? this.simboloAbierta : this.simboloCerrada;
    this.recursoVisual = this.abierta
      ? this.recursoVisualAbierta
      : this.recursoVisualCerrada;
  }
}

function normalizarOrientacion(orientacion, nombre) {
  if (typeof orientacion !== "string") {
    throw new Error(`La orientación de ${nombre} debe ser válida.`);
  }

  const normalizada = orientacion.trim().toLowerCase();
  if (!Object.values(ORIENTACIONES_PUERTA).includes(normalizada)) {
    throw new Error(
      `La orientación de ${nombre} debe ser "horizontal" o "vertical".`,
    );
  }
  return normalizada;
}

function validarBooleano(valor, campo, nombre) {
  if (typeof valor !== "boolean") {
    throw new Error(`${campo} de ${nombre} debe ser booleano.`);
  }
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

function validarSimbolo(simbolo, estado, nombre) {
  if (typeof simbolo !== "string" || simbolo.trim() === "") {
    throw new Error(
      `El símbolo de ${nombre} en estado ${estado} debe ser válido.`,
    );
  }
}
