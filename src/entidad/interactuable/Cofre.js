import { Entidad } from "../Entidad.js";
import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";
import { TIPOS_INTERACCION } from "../../juego/interacciones/TiposInteraccion.js";

export const RECURSO_VISUAL_COFRE_CERRADO_PREDETERMINADO =
  "assets/imagenes/interactuables/cofre_cerrado.png";
export const RECURSO_VISUAL_COFRE_ABIERTO_PREDETERMINADO =
  "assets/imagenes/interactuables/cofre_abierto.png";

// Alias de compatibilidad con el primer contrato de E2.A.
export const RECURSO_VISUAL_COFRE_PREDETERMINADO =
  RECURSO_VISUAL_COFRE_CERRADO_PREDETERMINADO;

// Cofre persistente del mapa.
//
// No calcula botín ni rareza. Recibe un ContenedorObjetos ya resuelto por el
// sistema canónico de botín/población. A diferencia de BotinSuelo, permanece
// en el mapa cuando queda vacío. Su representación se deriva del mismo estado:
// mientras contiene objetos se muestra cerrado y cuando queda vacío utiliza el
// sprite abierto, sin necesidad de mantener una segunda bandera visual.
export class Cofre extends Entidad {
  constructor({
    nombre = "Cofre",
    x = 0,
    y = 0,
    simbolo = "C",
    recursoVisual = undefined,
    recursoVisualCerrado = undefined,
    recursoVisualAbierto = RECURSO_VISUAL_COFRE_ABIERTO_PREDETERMINADO,
    contenedorObjetos,
    bloqueaMovimiento = true,
    bloqueaVision = false,
    alcance = 1,
    prioridad = 95,
  } = {}) {
    if (!(contenedorObjetos instanceof ContenedorObjetos)) {
      throw new Error(`${nombre} necesita un contenedor de objetos válido.`);
    }

    const recursoCerradoResuelto =
      recursoVisualCerrado !== undefined
        ? recursoVisualCerrado
        : recursoVisual !== undefined
          ? recursoVisual
          : RECURSO_VISUAL_COFRE_CERRADO_PREDETERMINADO;

    validarRecursoVisual(recursoCerradoResuelto, "cerrado", nombre);
    validarRecursoVisual(recursoVisualAbierto, "abierto", nombre);

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
      simbolo,
      bloqueaMovimiento,
      bloqueaVision,
    });

    this.recursoVisualCerrado = normalizarRecursoVisual(recursoCerradoResuelto);
    this.recursoVisualAbierto = normalizarRecursoVisual(recursoVisualAbierto);
    this.contenedorObjetos = contenedorObjetos;
    this.alcance = alcance;
    this.prioridad = prioridad;

    // Contrato explícito utilizado por SistemaInteraccionJugador.
    this.retirarAlVaciar = false;
  }

  get recursoVisual() {
    return this.estaVacio
      ? this.recursoVisualAbierto
      : this.recursoVisualCerrado;
  }

  get estaVacio() {
    return this.contenedorObjetos.estaVacio();
  }

  get cantidadObjetos() {
    return this.contenedorObjetos.obtenerObjetos().length;
  }

  obtenerInteracciones() {
    if (this.estaVacio) return [];

    return [
      {
        tipo: TIPOS_INTERACCION.ABRIR_CONTENEDOR,
        texto: "Abrir cofre",
        alcance: this.alcance,
        prioridad: this.prioridad,
        contenedorObjetos: this.contenedorObjetos,
      },
    ];
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
