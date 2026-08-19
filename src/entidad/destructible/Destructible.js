import { Entidad } from "../Entidad.js";
import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";
import { TIPOS_INTERACCION } from "../../juego/interacciones/TiposInteraccion.js";

// Contrato canónico para toda entidad física que puede recibir daño.
// Las diferencias visuales y de balance se inyectan por configuración; esta
// clase no conoce nombres de mapas ni variantes concretas como caja o vasija.
export class Destructible extends Entidad {
  constructor({
    nombre,
    x = 0,
    y = 0,
    simbolo = "?",
    recursoVisual = null,
    vidaMaxima,
    armadura = 0,
    capacidadContenedor = 0,
    objetosIniciales = [],
    solicitudBotin = null,
    bloqueaMovimiento = true,
    bloqueaVision = false,
    bloqueaCruceDiagonal = true,
    alcanceInteraccion = 1,
    prioridadInteraccion = 90,
    textoInteraccion = null,
    familiaEntidad = null,
    idVariante = null,
  } = {}) {
    if (!Number.isInteger(vidaMaxima) || vidaMaxima <= 0) {
      throw new Error(
        `${nombre ?? "La entidad"} debe tener una vida máxima ` +
          "entera mayor que 0.",
      );
    }

    if (!Number.isInteger(armadura) || armadura < 0) {
      throw new Error(
        `La armadura de ${nombre ?? "la entidad"} debe ser un entero ` +
          "igual o mayor que 0.",
      );
    }

    if (!Number.isInteger(capacidadContenedor) || capacidadContenedor < 0) {
      throw new Error(
        `La capacidad del contenedor de ${nombre} debe ser un entero ` +
          "igual o mayor que 0.",
      );
    }

    if (!Array.isArray(objetosIniciales)) {
      throw new Error(`Los objetos iniciales de ${nombre} deben ser una lista.`);
    }

    if (objetosIniciales.length > 0 && capacidadContenedor <= 0) {
      throw new Error(
        `${nombre} no puede recibir objetos iniciales sin capacidad de contenedor.`,
      );
    }

    if (
      solicitudBotin !== null &&
      (typeof solicitudBotin !== "object" || Array.isArray(solicitudBotin))
    ) {
      throw new Error(`La solicitud de botín de ${nombre} debe ser un objeto o null.`);
    }

    if (
      recursoVisual !== null &&
      (typeof recursoVisual !== "string" || recursoVisual.trim() === "")
    ) {
      throw new Error(
        `El recurso visual de ${nombre ?? "la entidad"} debe ser una ruta válida o null.`,
      );
    }

    if (!Number.isInteger(alcanceInteraccion) || alcanceInteraccion < 0) {
      throw new Error(
        `El alcance de interacción de ${nombre ?? "la entidad"} debe ser un entero no negativo.`,
      );
    }

    if (!Number.isFinite(prioridadInteraccion)) {
      throw new Error(
        `La prioridad de interacción de ${nombre ?? "la entidad"} debe ser numérica.`,
      );
    }

    super({
      nombre,
      x,
      y,
      simbolo,
      bloqueaMovimiento,
      bloqueaVision,
      bloqueaCruceDiagonal,
    });

    this.vidaMaxima = vidaMaxima;
    this.vidaActual = vidaMaxima;
    this.armadura = armadura;
    this.recursoVisual = recursoVisual === null ? null : recursoVisual.trim();
    this.familiaEntidad = normalizarTextoOpcional(familiaEntidad);
    this.idVariante = normalizarTextoOpcional(idVariante);
    this.id = this.idVariante;

    this.contenedorObjetos =
      capacidadContenedor > 0
        ? new ContenedorObjetos({
            capacidad: capacidadContenedor,
            objetosIniciales,
          })
        : null;

    this.solicitudBotin = solicitudBotin === null
      ? null
      : JSON.parse(JSON.stringify(solicitudBotin));
    this.alcanceInteraccion = alcanceInteraccion;
    this.prioridadInteraccion = prioridadInteraccion;
    this.textoInteraccion =
      typeof textoInteraccion === "string" && textoInteraccion.trim() !== ""
        ? textoInteraccion.trim()
        : `Revisar ${nombre ?? "contenedor"}`;

    // Los recipientes físicos permanecen en el mapa cuando se vacían: su
    // destrucción posterior sigue pudiendo liberar la casilla, pero nunca
    // vuelve a crear el contenido que ya fue retirado.
    this.retirarAlVaciar = false;
  }

  get estaDestruido() {
    return this.vidaActual <= 0;
  }

  get estaVacio() {
    return this.contenedorObjetos?.estaVacio?.() ?? true;
  }

  get cantidadObjetos() {
    return this.contenedorObjetos?.obtenerObjetos?.().length ?? 0;
  }

  recibirDanio(cantidad) {
    if (!Number.isFinite(cantidad)) {
      throw new Error(
        `El daño recibido por ${this.nombre} debe ser un número válido.`,
      );
    }

    const vidaAnterior = this.vidaActual;
    const danioSolicitado = Math.max(0, Math.floor(cantidad));
    this.vidaActual = Math.max(0, this.vidaActual - danioSolicitado);
    return vidaAnterior - this.vidaActual;
  }

  obtenerInteracciones() {
    if (
      this.estaDestruido ||
      !this.contenedorObjetos ||
      this.contenedorObjetos.estaVacio()
    ) {
      return [];
    }

    return [
      {
        tipo: TIPOS_INTERACCION.ABRIR_CONTENEDOR,
        texto: this.textoInteraccion,
        alcance: this.alcanceInteraccion,
        prioridad: this.prioridadInteraccion,
        contenedorObjetos: this.contenedorObjetos,
      },
    ];
  }
}

function normalizarTextoOpcional(valor) {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;
}
