import { ContenedorObjetos } from "../objetos/ContenedorObjetos.js";

// Conserva el estado mutable de un mercader durante toda la partida.
//
// La configuración define qué puede generar el mercader. Esta clase guarda
// el resultado concreto: stock actual, semilla y número de renovaciones.
export class EstadoMercader {
  constructor({ id, nombre, capacidadStock } = {}) {
    validarId(id);
    validarNombre(nombre);

    if (!Number.isInteger(capacidadStock) || capacidadStock <= 0) {
      throw new Error(
        `La capacidad de stock de "${nombre}" debe ser un entero mayor que 0.`,
      );
    }

    this.id = id.trim().toLowerCase();
    this.nombre = nombre.trim();
    this.capacidadStock = capacidadStock;

    this._stock = new ContenedorObjetos({
      capacidad: capacidadStock,
    });

    this._numeroRenovaciones = 0;
    this._semillaUltimaRenovacion = null;
    this._expedicionUltimaRenovacion = 0;
    this._nivelUltimaRenovacion = 1;
  }

  get stock() {
    return this._stock;
  }

  get numeroRenovaciones() {
    return this._numeroRenovaciones;
  }

  get semillaUltimaRenovacion() {
    return this._semillaUltimaRenovacion;
  }

  get expedicionUltimaRenovacion() {
    return this._expedicionUltimaRenovacion;
  }

  get nivelUltimaRenovacion() {
    return this._nivelUltimaRenovacion;
  }

  // Reemplaza el stock completo de forma atómica.
  //
  // Las compras y ventas futuras modificarán el contenedor actual. Una nueva
  // expedición, en cambio, creará otro contenedor con el stock renovado.
  reemplazarStock({
    objetos,
    semilla,
    numeroExpedicion = 0,
    nivelReferencia = 1,
  } = {}) {
    if (!Array.isArray(objetos)) {
      throw new Error(`El stock de "${this.nombre}" debe ser una lista.`);
    }

    if (objetos.length > this.capacidadStock) {
      throw new Error(
        `El stock generado para "${this.nombre}" supera su capacidad.`,
      );
    }

    validarSemilla(semilla);

    if (!Number.isInteger(numeroExpedicion) || numeroExpedicion < 0) {
      throw new Error("El número de expedición del stock no es válido.");
    }

    if (!Number.isInteger(nivelReferencia) || nivelReferencia < 1) {
      throw new Error("El nivel de referencia del stock no es válido.");
    }

    this._stock = new ContenedorObjetos({
      capacidad: this.capacidadStock,
      objetosIniciales: objetos,
    });

    this._numeroRenovaciones++;
    this._semillaUltimaRenovacion = semilla;
    this._expedicionUltimaRenovacion = numeroExpedicion;
    this._nivelUltimaRenovacion = nivelReferencia;

    return this.obtenerResumen();
  }

  obtenerResumen() {
    return {
      id: this.id,
      nombre: this.nombre,
      capacidadStock: this.capacidadStock,
      espaciosOcupados: this._stock.obtenerObjetos().length,
      numeroRenovaciones: this._numeroRenovaciones,
      semillaUltimaRenovacion: this._semillaUltimaRenovacion,
      expedicionUltimaRenovacion: this._expedicionUltimaRenovacion,
      nivelUltimaRenovacion: this._nivelUltimaRenovacion,

      objetos: this._stock.obtenerObjetos().map((objeto) => ({
        id: objeto.id,
        nombre: objeto.nombre,
        cantidad: objeto.cantidad,
        rareza: objeto.rareza,
        nivelObjeto: objeto.nivelObjeto,
      })),
    };
  }
}

function validarId(id) {
  if (typeof id !== "string" || !/^[a-z0-9_]+$/.test(id.trim())) {
    throw new Error("EstadoMercader necesita un ID válido.");
  }
}

function validarNombre(nombre) {
  if (typeof nombre !== "string" || nombre.trim() === "") {
    throw new Error("EstadoMercader necesita un nombre válido.");
  }
}

function validarSemilla(semilla) {
  const esEntero = Number.isInteger(semilla);

  const esTexto = typeof semilla === "string" && semilla.trim() !== "";

  if (!esEntero && !esTexto) {
    throw new Error("La renovación del mercader necesita una semilla válida.");
  }
}
