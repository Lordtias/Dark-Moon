import { ContenedorObjetos } from "./ContenedorObjetos.js";

const TIPOS_ATAQUE_VALIDOS = ["cuerpoACuerpo", "distancia"];

// Representa una instancia real de cualquier objeto.
//
// Una plantilla de Objetos.json puede generar
// varias instancias independientes.
export class Objeto {
  constructor({
    id,
    nombre,
    tipo,
    descripcion = "",
    apilable = false,
    cantidadMaxima = 1,
    cantidad = 1,
    ranurasCompatibles = [],
    propiedades = {},
    contenedorObjetos = null,
  } = {}) {
    this.validarTexto(id, "id");
    this.validarTexto(nombre, "nombre");
    this.validarTexto(tipo, "tipo");

    if (typeof descripcion !== "string") {
      throw new Error(`La descripción de "${nombre}" debe ser un texto.`);
    }

    if (typeof apilable !== "boolean") {
      throw new Error(
        `La propiedad apilable de "${nombre}" debe ser booleana.`,
      );
    }

    if (!Number.isInteger(cantidadMaxima) || cantidadMaxima <= 0) {
      throw new Error(
        `La cantidad máxima de "${nombre}" debe ser mayor que 0.`,
      );
    }

    if (!apilable && cantidadMaxima !== 1) {
      throw new Error(
        `"${nombre}" no es apilable, por lo que su cantidad máxima debe ser 1.`,
      );
    }

    if (
      !Number.isInteger(cantidad) ||
      cantidad <= 0 ||
      cantidad > cantidadMaxima
    ) {
      throw new Error(
        `La cantidad de "${nombre}" debe estar entre 1 y ${cantidadMaxima}.`,
      );
    }

    if (!Array.isArray(ranurasCompatibles)) {
      throw new Error(
        `Las ranuras compatibles de "${nombre}" deben ser una lista.`,
      );
    }

    if (
      propiedades === null ||
      typeof propiedades !== "object" ||
      Array.isArray(propiedades)
    ) {
      throw new Error(`Las propiedades de "${nombre}" deben ser un objeto.`);
    }

    if (
      contenedorObjetos !== null &&
      !(contenedorObjetos instanceof ContenedorObjetos)
    ) {
      throw new Error(`El contenedor interno de "${nombre}" no es válido.`);
    }

    this.id = id.trim().toLowerCase();
    this.nombre = nombre.trim();
    this.tipo = tipo.trim().toLowerCase();

    this.descripcion = descripcion;
    this.apilable = apilable;
    this.cantidadMaxima = cantidadMaxima;
    this.cantidad = cantidad;

    this.ranurasCompatibles = this.normalizarRanuras(ranurasCompatibles);

    this.propiedades = {
      ...propiedades,
    };

    // Algunos objetos pueden contener otros objetos.
    // El quiver utiliza esta propiedad para almacenar flechas.
    this.contenedorObjetos = contenedorObjetos;

    this.validarPropiedadesPorTipo();
  }

  validarPropiedadesPorTipo() {
    if (this.esArma) {
      this.validarPropiedadesArma();
    }

    if (this.esQuiver) {
      this.validarPropiedadesQuiver();
    }

    if (this.esMunicion) {
      this.validarPropiedadesMunicion();
    }
  }

  validarPropiedadesArma() {
    const {
      danioFisicoMinimo,
      danioFisicoMaximo,
      atributoAtaque,
      precision,
      alcance,
      tipoAtaque,
      probabilidadCritico,
      multiplicadorCritico,
      manos,
      bloqueaSecundaria,
      requiereQuiver,
    } = this.propiedades;

    if (
      !Number.isFinite(danioFisicoMinimo) ||
      danioFisicoMinimo < 0 ||
      !Number.isFinite(danioFisicoMaximo) ||
      danioFisicoMaximo < danioFisicoMinimo
    ) {
      throw new Error(`El rango de daño de "${this.nombre}" no es válido.`);
    }

    this.validarTexto(atributoAtaque, "atributo de ataque");

    if (!Number.isFinite(precision)) {
      throw new Error(`La precisión de "${this.nombre}" no es válida.`);
    }

    if (!Number.isInteger(alcance) || alcance < 1) {
      throw new Error(`El alcance de "${this.nombre}" no es válido.`);
    }

    if (!TIPOS_ATAQUE_VALIDOS.includes(tipoAtaque)) {
      throw new Error(`El tipo de ataque de "${this.nombre}" no es válido.`);
    }

    if (
      !Number.isFinite(probabilidadCritico) ||
      !Number.isFinite(multiplicadorCritico)
    ) {
      throw new Error(
        `Los valores de crítico de "${this.nombre}" no son válidos.`,
      );
    }

    if (!Number.isInteger(manos) || ![1, 2].includes(manos)) {
      throw new Error(`"${this.nombre}" debe indicar si utiliza 1 o 2 manos.`);
    }

    if (typeof bloqueaSecundaria !== "boolean") {
      throw new Error(
        `"${this.nombre}" debe indicar si bloquea la ranura secundaria.`,
      );
    }

    if (typeof requiereQuiver !== "boolean") {
      throw new Error(`"${this.nombre}" debe indicar si requiere quiver.`);
    }

    if (bloqueaSecundaria && !this.ranurasCompatibles.includes("arma")) {
      throw new Error(
        `"${this.nombre}" bloquea secundaria pero no puede equiparse como arma principal.`,
      );
    }

    if (requiereQuiver) {
      this.validarTexto(this.propiedades.tipoMunicion, "tipo de munición");
    }
  }

  validarPropiedadesQuiver() {
    this.validarTexto(this.propiedades.tipoMunicion, "tipo de munición");

    if (!this.contenedorObjetos) {
      throw new Error(
        `El quiver "${this.nombre}" necesita un contenedor de munición.`,
      );
    }
  }

  validarPropiedadesMunicion() {
    this.validarTexto(this.propiedades.tipoMunicion, "tipo de munición");
  }

  validarTexto(valor, nombreCampo) {
    if (typeof valor !== "string" || valor.trim() === "") {
      throw new Error(`El campo "${nombreCampo}" del objeto es obligatorio.`);
    }
  }

  normalizarRanuras(ranuras) {
    const normalizadas = ranuras.map((ranura) => {
      this.validarTexto(ranura, "ranura compatible");

      return ranura.trim().toLowerCase();
    });

    const unicas = new Set(normalizadas);

    if (unicas.size !== normalizadas.length) {
      throw new Error(
        `El objeto "${this.nombre}" tiene ranuras compatibles repetidas.`,
      );
    }

    return [...unicas];
  }

  get esEquipable() {
    return this.ranurasCompatibles.length > 0;
  }

  get esContenedor() {
    return this.contenedorObjetos !== null;
  }

  get esArma() {
    return this.tipo === "arma";
  }

  get esQuiver() {
    return this.tipo === "quiver";
  }

  get esMunicion() {
    return this.tipo === "municion";
  }

  get manosRequeridas() {
    return this.esArma ? this.propiedades.manos : 0;
  }

  // Una espada de dos manos y una lanza
  // reservan la ranura secundaria.
  //
  // Un arco puede utilizar dos manos sin reservarla,
  // porque esa ranura se utiliza para el quiver.
  get bloqueaSecundaria() {
    return this.esArma && this.propiedades.bloqueaSecundaria === true;
  }

  get requiereQuiver() {
    return this.esArma && this.propiedades.requiereQuiver === true;
  }

  puedeEquiparseEn(nombreRanura) {
    this.validarTexto(nombreRanura, "nombre de ranura");

    const normalizada = nombreRanura.trim().toLowerCase();

    return this.ranurasCompatibles.includes(normalizada);
  }
}
