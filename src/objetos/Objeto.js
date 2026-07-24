import { ContenedorObjetos } from "./ContenedorObjetos.js";
import {
  PATRONES_ATAQUE,
  normalizarPatronAtaque,
} from "../juego/combate/PatronesAtaque.js";
import { TIPOS_EFECTO_CONSUMIBLE } from "../juego/inventario/SistemaConsumibles.js";
import {
  RAREZAS_OBJETO,
  TIPOS_AFIJO_OBJETO,
  normalizarIdRarezaObjeto,
  normalizarTipoAfijoObjeto,
} from "../juego/objetos/RarezasObjeto.js";
import {
  CATEGORIAS_ARMADURA,
  normalizarCategoriaArmadura,
  normalizarFamiliaObjeto,
  normalizarNivelMinimoGeneracion,
  normalizarTierBase,
} from "../juego/objetos/MetadatosObjeto.js";
import { normalizarPropiedadesResistencias } from "../juego/combate/ComponentesDanio.js";

const TIPOS_ATAQUE_VALIDOS = ["cuerpoACuerpo", "distancia"];

// Representa una instancia real de cualquier objeto del juego.
//
// Una instancia conserva:
//
// - La plantilla base que le dio origen.
// - Su tier y familia de progresión.
// - Su rareza.
// - Su nivel de objeto.
// - Los prefijos y sufijos obtenidos.
// - Las propiedades finales que utiliza el motor.
export class Objeto {
  constructor({
    id,
    nombre,
    tipo,
    descripcion = "",

    // Ruta opcional del icono utilizado por la interfaz.
    recursoVisual = null,
    apilable = false,
    cantidadMaxima = 1,
    cantidad = 1,
    ranurasCompatibles = [],

    // Metadatos estructurales de la plantilla.
    // No cambian por rareza, nivel de objeto o afijos.
    tierBase = 1,
    nivelMinimoGeneracion = 1,
    familiaObjeto = null,
    categoriaArmadura = null,

    // Propiedades originales de la plantilla.
    propiedadesBase = null,

    // Propiedades finales utilizadas por combate,
    // equipamiento, inventario y presentación.
    propiedades = {},

    // Toda instancia tiene rareza y nivel,
    // incluso cuando es común.
    rareza = RAREZAS_OBJETO.COMUN,
    nivelObjeto = 1,

    // Los afijos se almacenan separados para conservar
    // los límites propios de prefijos y sufijos.
    prefijos = [],
    sufijos = [],
    contenedorObjetos = null,
  } = {}) {
    this.validarTexto(id, "id");
    this.validarTexto(nombre, "nombre");
    this.validarTexto(tipo, "tipo");

    if (typeof descripcion !== "string") {
      throw new Error(`La descripción de "${nombre}" debe ser un texto.`);
    }

    // El objeto puede no tener una imagen.
    // Esto permite utilizar el nombre como respaldo.
    if (
      recursoVisual !== null &&
      (typeof recursoVisual !== "string" || recursoVisual.trim() === "")
    ) {
      throw new Error(
        `El recurso visual de "${nombre}" debe ser una ruta válida.`,
      );
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

    this.validarObjetoPlano(propiedades, `Las propiedades de "${nombre}"`);
    const propiedadesBaseRecibidas = propiedadesBase ?? propiedades;
    this.validarObjetoPlano(
      propiedadesBaseRecibidas,
      `Las propiedades base de "${nombre}"`,
    );

    if (!Number.isInteger(nivelObjeto) || nivelObjeto < 1) {
      throw new Error(
        `El nivel de objeto de "${nombre}" ` +
          "debe ser un entero mayor o igual que 1.",
      );
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

    // El dominio conserva solamente la ruta.
    // No carga imágenes ni conoce Canvas o HTML.
    this.recursoVisual = recursoVisual?.trim() ?? null;
    this.apilable = apilable;
    this.cantidadMaxima = cantidadMaxima;
    this.cantidad = cantidad;
    this.ranurasCompatibles = this.normalizarRanuras(ranurasCompatibles);

    // Los metadatos se normalizan antes de validar
    // su coherencia con el tipo del objeto.
    this.tierBase = normalizarTierBase(tierBase);
    this.nivelMinimoGeneracion = normalizarNivelMinimoGeneracion(
      nivelMinimoGeneracion,
    );
    this.familiaObjeto = normalizarFamiliaObjeto(familiaObjeto);
    this.categoriaArmadura = normalizarCategoriaArmadura(categoriaArmadura);
    this.rareza = normalizarIdRarezaObjeto(rareza);
    this.nivelObjeto = nivelObjeto;

    // Las propiedades base y finales se copian para que
    // ninguna instancia modifique la plantilla JSON.
    // Las resistencias presentes quedan limitadas a 0–75.
    this.propiedadesBase = normalizarPropiedadesResistencias(
      copiarDatosConfiguracion(propiedadesBaseRecibidas),
    );
    this.propiedades = normalizarPropiedadesResistencias(
      copiarDatosConfiguracion(propiedades),
    );
    this.prefijos = this.normalizarAfijos({
      afijos: prefijos,
      tipoEsperado: TIPOS_AFIJO_OBJETO.PREFIJO,
    });
    this.sufijos = this.normalizarAfijos({
      afijos: sufijos,
      tipoEsperado: TIPOS_AFIJO_OBJETO.SUFIJO,
    });
    this.contenedorObjetos = contenedorObjetos;

    this.validarMetadatosProgresion();
    this.validarCoherenciaAfijos();
    this.validarPropiedadesPorTipo();
  }

  // Comprueba que los metadatos declarados
  // sean coherentes con el tipo del objeto.
  validarMetadatosProgresion() {
    if ((this.esArma || this.esArmadura) && this.familiaObjeto === null) {
      throw new Error(`"${this.nombre}" debe declarar una familia de objeto.`);
    }

    if (!this.esArmadura && this.categoriaArmadura !== null) {
      throw new Error(
        `"${this.nombre}" declara una categoría de armadura ` +
          "pero no es una armadura.",
      );
    }

    // Los escudos continúan utilizando el tipo armadura
    // porque aportan armadura y bloqueo, pero no pertenecen
    // a una rama de vestimenta.
    if (this.esEscudo && this.categoriaArmadura !== null) {
      throw new Error(
        `El escudo "${this.nombre}" no debe declarar ` +
          "una categoría de armadura.",
      );
    }

    if (
      this.esArmadura &&
      !this.esEscudo &&
      this.categoriaArmadura === null
    ) {
      throw new Error(
        `La armadura "${this.nombre}" debe declarar ` +
          "si es ligera, media o pesada.",
      );
    }
  }

  // Ejecuta las validaciones particulares
  // correspondientes al tipo del objeto.
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

    if (this.esConsumible) {
      this.validarPropiedadesConsumible();
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

    // Todo el juego utiliza el mismo formato normalizado.
    this.propiedades.patronAtaque = patronNormalizado;

    if (this.propiedadesBase.patronAtaque !== undefined) {
      const patronBaseNormalizado = normalizarPatronAtaque(
        this.propiedadesBase.patronAtaque,
      );
      if (patronBaseNormalizado) {
        this.propiedadesBase.patronAtaque = patronBaseNormalizado;
      }
    }

    if (
      patronNormalizado === PATRONES_ATAQUE.ADYACENTE &&
      alcance !== 1
    ) {
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
        `Los valores de crítico de "${this.nombre}" ` +
          "no son válidos.",
      );
    }

    // Menor coste significa que el arma permite
    // actuar nuevamente antes.
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
    const probabilidadBloqueo =
      this.propiedades.probabilidadBloqueo ?? 0;
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

    if (probabilidadBloqueo > 0 && mitigacionBloqueo <= 0) {
      throw new Error(
        `"${this.nombre}" tiene probabilidad de bloqueo ` +
          "pero no tiene mitigación de bloqueo.",
      );
    }

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

  // Valida la configuración común de pociones,
  // pergaminos y futuros objetos utilizables.
  validarPropiedadesConsumible() {
    const { costoConsumo, efectos } = this.propiedades;

    if (!Number.isInteger(costoConsumo) || costoConsumo <= 0) {
      throw new Error(
        `El costo de consumo de "${this.nombre}" ` +
          "debe ser un entero mayor que 0.",
      );
    }

    if (!Array.isArray(efectos) || efectos.length === 0) {
      throw new Error(
        `El consumible "${this.nombre}" ` +
          "necesita al menos un efecto.",
      );
    }

    const tiposValidos = Object.values(TIPOS_EFECTO_CONSUMIBLE);

    for (const efecto of efectos) {
      if (
        efecto === null ||
        typeof efecto !== "object" ||
        Array.isArray(efecto)
      ) {
        throw new Error(`Existe un efecto inválido en "${this.nombre}".`);
      }

      if (!tiposValidos.includes(efecto.tipo)) {
        throw new Error(
          `El efecto "${efecto.tipo}" de ` +
            `"${this.nombre}" no es válido.`,
        );
      }

      if (!Number.isFinite(efecto.cantidad) || efecto.cantidad <= 0) {
        throw new Error(
          `La cantidad del efecto "${efecto.tipo}" ` +
            `de "${this.nombre}" debe ser mayor que 0.`,
        );
      }
    }
  }

  // Normaliza una lista de afijos generados.
  // La clase comprueba su estructura, pero no decide
  // si el afijo era elegible para la generación.
  normalizarAfijos({ afijos, tipoEsperado }) {
    if (!Array.isArray(afijos)) {
      throw new Error(
        `Los ${tipoEsperado}s de "${this.nombre}" ` +
          "deben ser una lista.",
      );
    }

    return afijos.map((afijo, indice) =>
      this.normalizarAfijo({
        afijo,
        tipoEsperado,
        indice,
      }),
    );
  }

  normalizarAfijo({ afijo, tipoEsperado, indice }) {
    this.validarObjetoPlano(
      afijo,
      `El ${tipoEsperado} ${indice + 1} de "${this.nombre}"`,
    );
    this.validarTexto(afijo.id, `id del ${tipoEsperado}`);
    this.validarTexto(afijo.nombre, `nombre del ${tipoEsperado}`);

    const tipoNormalizado = normalizarTipoAfijoObjeto(afijo.tipoAfijo);
    if (tipoNormalizado !== tipoEsperado) {
      throw new Error(
        `El afijo "${afijo.id}" fue colocado como ` +
          `${tipoEsperado}, pero declara ser ${tipoNormalizado}.`,
      );
    }

    if (!Number.isInteger(afijo.grado) || afijo.grado < 1) {
      throw new Error(
        `El grado del afijo "${afijo.id}" ` +
          "debe ser un entero mayor o igual que 1.",
      );
    }

    if (
      afijo.nivelObjetoMinimo !== undefined &&
      (!Number.isInteger(afijo.nivelObjetoMinimo) ||
        afijo.nivelObjetoMinimo < 1)
    ) {
      throw new Error(
        `El nivel mínimo del afijo "${afijo.id}" no es válido.`,
      );
    }

    if (
      Number.isInteger(afijo.nivelObjetoMinimo) &&
      afijo.nivelObjetoMinimo > this.nivelObjeto
    ) {
      throw new Error(
        `El objeto "${this.nombre}" es de nivel ` +
          `${this.nivelObjeto}, pero el afijo "${afijo.id}" ` +
          `requiere nivel ${afijo.nivelObjetoMinimo}.`,
      );
    }

    this.validarObjetoPlano(
      afijo.valores,
      `Los valores del afijo "${afijo.id}"`,
    );

    for (const [propiedad, valor] of Object.entries(afijo.valores)) {
      if (
        typeof propiedad !== "string" ||
        propiedad.trim() === "" ||
        !Number.isFinite(valor)
      ) {
        throw new Error(
          `El afijo "${afijo.id}" contiene ` +
            "un valor generado inválido.",
        );
      }
    }

    if (
      afijo.grupoExclusion !== undefined &&
      afijo.grupoExclusion !== null &&
      (typeof afijo.grupoExclusion !== "string" ||
        afijo.grupoExclusion.trim() === "")
    ) {
      throw new Error(
        `El grupo de exclusión del afijo ` +
          `"${afijo.id}" no es válido.`,
      );
    }

    if (
      afijo.descripcion !== undefined &&
      typeof afijo.descripcion !== "string"
    ) {
      throw new Error(
        `La descripción del afijo "${afijo.id}" ` +
          "debe ser un texto.",
      );
    }

    // Copiamos todos los metadatos de la tirada.
    const normalizado = copiarDatosConfiguracion(afijo);
    normalizado.id = afijo.id.trim().toLowerCase();
    normalizado.nombre = afijo.nombre.trim();
    normalizado.tipoAfijo = tipoNormalizado;
    normalizado.grupoExclusion =
      typeof afijo.grupoExclusion === "string"
        ? afijo.grupoExclusion.trim().toLowerCase()
        : null;
    normalizado.valores = normalizarPropiedadesResistencias(
      copiarDatosConfiguracion(afijo.valores),
    );

    return normalizado;
  }

  // Comprueba coherencia entre todos
  // los afijos almacenados en la instancia.
  validarCoherenciaAfijos() {
    const afijos = this.afijos;

    if (afijos.length > 0 && !this.esEquipable) {
      throw new Error(
        `El objeto no equipable "${this.nombre}" ` +
          "no puede recibir afijos aleatorios.",
      );
    }

    if (this.rareza === RAREZAS_OBJETO.COMUN && afijos.length > 0) {
      throw new Error(
        `El objeto común "${this.nombre}" no puede tener afijos.`,
      );
    }

    const ids = new Set();
    const gruposExclusion = new Set();

    for (const afijo of afijos) {
      if (ids.has(afijo.id)) {
        throw new Error(
          `El objeto "${this.nombre}" contiene ` +
            `el afijo repetido "${afijo.id}".`,
        );
      }

      ids.add(afijo.id);

      if (!afijo.grupoExclusion) {
        continue;
      }

      if (gruposExclusion.has(afijo.grupoExclusion)) {
        throw new Error(
          `El objeto "${this.nombre}" contiene más de un ` +
            `afijo del grupo "${afijo.grupoExclusion}".`,
        );
      }

      gruposExclusion.add(afijo.grupoExclusion);
    }
  }

  validarTexto(valor, nombreCampo) {
    if (typeof valor !== "string" || valor.trim() === "") {
      throw new Error(`El campo "${nombreCampo}" es obligatorio.`);
    }
  }

  validarObjetoPlano(valor, descripcion) {
    if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
      throw new Error(`${descripcion} deben formar un objeto válido.`);
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

  get esConsumible() {
    return this.tipo === "consumible";
  }

  get esComun() {
    return this.rareza === RAREZAS_OBJETO.COMUN;
  }

  get esMagico() {
    return this.rareza === RAREZAS_OBJETO.MAGICO;
  }

  get esTierUno() {
    return this.tierBase === 1;
  }

  get esTierDos() {
    return this.tierBase === 2;
  }

  get esArmaduraLigera() {
    return (
      this.esArmadura &&
      this.categoriaArmadura === CATEGORIAS_ARMADURA.LIGERA
    );
  }

  get esArmaduraMedia() {
    return (
      this.esArmadura &&
      this.categoriaArmadura === CATEGORIAS_ARMADURA.MEDIA
    );
  }

  get esArmaduraPesada() {
    return (
      this.esArmadura &&
      this.categoriaArmadura === CATEGORIAS_ARMADURA.PESADA
    );
  }

  get esEscudo() {
    return this.esArmadura && this.familiaObjeto === "escudo";
  }

  get tieneAfijos() {
    return this.cantidadAfijos > 0;
  }

  // Devuelve una lista nueva para impedir que se modifiquen
  // las colecciones reemplazando directamente el resultado.
  get afijos() {
    return [...this.prefijos, ...this.sufijos];
  }

  get cantidadAfijos() {
    return this.prefijos.length + this.sufijos.length;
  }

  get manosRequeridas() {
    return this.esArma ? this.propiedades.manos : 0;
  }

  get costoAtaque() {
    return this.esArma ? this.propiedades.costoAtaque : null;
  }

  get costoConsumo() {
    return this.esConsumible ? this.propiedades.costoConsumo : null;
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

  // Cantidad total de municiones almacenadas en el carcaj.
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

// Realiza una copia profunda de valores procedentes
// de configuración o generación.
function copiarDatosConfiguracion(valor) {
  if (Array.isArray(valor)) {
    return valor.map(copiarDatosConfiguracion);
  }

  if (valor !== null && typeof valor === "object") {
    const copia = {};
    for (const [clave, contenido] of Object.entries(valor)) {
      copia[clave] = copiarDatosConfiguracion(contenido);
    }
    return copia;
  }

  return valor;
}
