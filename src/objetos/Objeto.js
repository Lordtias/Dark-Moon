import { ContenedorObjetos } from "./ContenedorObjetos.js";

import {
  PATRONES_ATAQUE,
  normalizarPatronAtaque,
} from "../juego/PatronesAtaque.js";

const TIPOS_ATAQUE_VALIDOS = ["cuerpoACuerpo", "distancia"];

// Representa una instancia real de cualquier objeto.
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
        `La propiedad apilable de "${nombre}" ` + "debe ser booleana.",
      );
    }

    if (!Number.isInteger(cantidadMaxima) || cantidadMaxima <= 0) {
      throw new Error(
        `La cantidad máxima de "${nombre}" ` + "debe ser mayor que 0.",
      );
    }

    if (!apilable && cantidadMaxima !== 1) {
      throw new Error(`"${nombre}" no es apilable y su máximo debe ser 1.`);
    }

    if (
      !Number.isInteger(cantidad) ||
      cantidad <= 0 ||
      cantidad > cantidadMaxima
    ) {
      throw new Error(
        `La cantidad de "${nombre}" debe estar entre ` +
          `1 y ${cantidadMaxima}.`,
      );
    }

    if (!Array.isArray(ranurasCompatibles)) {
      throw new Error(`Las ranuras de "${nombre}" deben ser una lista.`);
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

    this.contenedorObjetos = contenedorObjetos;

    this.validarPropiedadesPorTipo();
  }

  // Ejecuta las validaciones particulares
  // correspondientes al tipo de objeto.
  validarPropiedadesPorTipo() {
    if (this.esArma) {
      this.validarPropiedadesArma();
    }

    if (this.esArmadura) {
      this.validarPropiedadesArmadura();
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
      patronAtaque,
      probabilidadCritico,
      multiplicadorCritico,
      costoAtaque,
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

    const patronNormalizado = normalizarPatronAtaque(patronAtaque);

    if (!patronNormalizado) {
      throw new Error(`El patrón de ataque de "${this.nombre}" no es válido.`);
    }

    // Guardamos la versión normalizada para que
    // todo el juego utilice el mismo formato.
    this.propiedades.patronAtaque = patronNormalizado;

    // El patrón adyacente representa únicamente
    // las ocho casillas contiguas.
    if (patronNormalizado === PATRONES_ATAQUE.ADYACENTE && alcance !== 1) {
      throw new Error(
        `"${this.nombre}" utiliza patrón adyacente ` +
          "y por lo tanto debe tener alcance 1.",
      );
    }

    if (
      !Number.isFinite(probabilidadCritico) ||
      !Number.isFinite(multiplicadorCritico)
    ) {
      throw new Error(
        `Los valores de crítico de "${this.nombre}" ` + "no son válidos.",
      );
    }

    // El coste de ataque representa cuántas unidades
    // temporales consume utilizar el arma.
    //
    // Menor valor = arma más rápida.
    // Mayor valor = arma más lenta.
    if (!Number.isInteger(costoAtaque) || costoAtaque <= 0) {
      throw new Error(
        `El costo de ataque de "${this.nombre}" ` +
          "debe ser un entero mayor que 0.",
      );
    }

    if (!Number.isInteger(manos) || ![1, 2].includes(manos)) {
      throw new Error(`"${this.nombre}" debe usar 1 o 2 manos.`);
    }

    if (typeof bloqueaSecundaria !== "boolean") {
      throw new Error(`"${this.nombre}" debe indicar si bloquea secundaria.`);
    }

    if (typeof requiereQuiver !== "boolean") {
      throw new Error(`"${this.nombre}" debe indicar si requiere carcaj.`);
    }

    if (bloqueaSecundaria && !this.ranurasCompatibles.includes("arma")) {
      throw new Error(
        `"${this.nombre}" bloquea secundaria ` +
          "pero no puede ser arma principal.",
      );
    }

    if (requiereQuiver) {
      this.validarTexto(this.propiedades.tipoMunicion, "tipo de munición");
    }
  }

  // Valida armadura, probabilidad de bloqueo
  // y porcentaje de daño mitigado.
  validarPropiedadesArmadura() {
    const armadura = this.propiedades.armadura ?? 0;

    const probabilidadBloqueo = this.propiedades.probabilidadBloqueo ?? 0;

    const mitigacionBloqueo = this.propiedades.mitigacionBloqueo ?? 0;

    if (!Number.isFinite(armadura) || armadura < 0) {
      throw new Error(`La armadura de "${this.nombre}" no es válida.`);
    }

    if (
      !Number.isFinite(probabilidadBloqueo) ||
      probabilidadBloqueo < 0 ||
      probabilidadBloqueo > 100
    ) {
      throw new Error(
        `La probabilidad de bloqueo de "${this.nombre}" ` +
          "debe estar entre 0 y 100.",
      );
    }

    if (
      !Number.isFinite(mitigacionBloqueo) ||
      mitigacionBloqueo < 0 ||
      mitigacionBloqueo > 100
    ) {
      throw new Error(
        `La mitigación de bloqueo de "${this.nombre}" ` +
          "debe estar entre 0 y 100.",
      );
    }

    // Un objeto que permite bloquear también debe
    // indicar cuánto daño reduce ese bloqueo.
    if (probabilidadBloqueo > 0 && mitigacionBloqueo <= 0) {
      throw new Error(
        `"${this.nombre}" tiene probabilidad de bloqueo ` +
          "pero no tiene mitigación de bloqueo.",
      );
    }

    // Una mitigación sin posibilidad de bloqueo
    // nunca podría activarse.
    if (mitigacionBloqueo > 0 && probabilidadBloqueo <= 0) {
      throw new Error(
        `"${this.nombre}" tiene mitigación de bloqueo ` +
          "pero no tiene probabilidad de bloqueo.",
      );
    }
  }

  validarPropiedadesQuiver() {
    this.validarTexto(this.propiedades.tipoMunicion, "tipo de munición");

    if (!this.contenedorObjetos) {
      throw new Error(`El carcaj "${this.nombre}" necesita un contenedor.`);
    }
  }

  validarPropiedadesMunicion() {
    this.validarTexto(this.propiedades.tipoMunicion, "tipo de munición");
  }

  validarTexto(valor, nombreCampo) {
    if (typeof valor !== "string" || valor.trim() === "") {
      throw new Error(`El campo "${nombreCampo}" es obligatorio.`);
    }
  }

  normalizarRanuras(ranuras) {
    const normalizadas = ranuras.map((ranura) => {
      this.validarTexto(ranura, "ranura compatible");

      return ranura.trim().toLowerCase();
    });

    if (new Set(normalizadas).size !== normalizadas.length) {
      throw new Error(`El objeto "${this.nombre}" tiene ranuras repetidas.`);
    }

    return [...normalizadas];
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

  get esArmadura() {
    return this.tipo === "armadura";
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

  get costoAtaque() {
    return this.esArma ? this.propiedades.costoAtaque : null;
  }

  get bloqueaSecundaria() {
    return this.esArma && this.propiedades.bloqueaSecundaria === true;
  }

  get requiereQuiver() {
    return this.esArma && this.propiedades.requiereQuiver === true;
  }

  // Cantidad total almacenada dentro del objeto.
  get cantidadContenido() {
    if (!this.contenedorObjetos) {
      return 0;
    }

    return this.contenedorObjetos
      .obtenerObjetos()
      .reduce(
        (total, objeto) =>
          total + (Number.isInteger(objeto.cantidad) ? objeto.cantidad : 1),
        0,
      );
  }

  // Cantidad total de municiones del carcaj.
  get cantidadMunicion() {
    if (!this.esQuiver) {
      return 0;
    }

    return this.contenedorObjetos
      .obtenerObjetos()
      .filter((objeto) => objeto.esMunicion)
      .reduce((total, objeto) => total + objeto.cantidad, 0);
  }

  puedeEquiparseEn(nombreRanura) {
    this.validarTexto(nombreRanura, "nombre de ranura");

    return this.ranurasCompatibles.includes(nombreRanura.trim().toLowerCase());
  }
}
