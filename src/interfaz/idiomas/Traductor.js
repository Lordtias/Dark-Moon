const IDIOMA_RESPALDO = "es";

export class Traductor {
  constructor({ catalogos, idioma = IDIOMA_RESPALDO } = {}) {
    validarCatalogos(catalogos);
    this.catalogos = catalogos;
    this.idioma = catalogos[idioma] ? idioma : IDIOMA_RESPALDO;
    this.avisos = new Set();
    this.suscriptores = new Set();
  }

  obtenerIdioma() {
    return this.idioma;
  }

  cambiarIdioma(idioma) {
    if (typeof idioma !== "string" || !this.catalogos[idioma]) {
      throw new Error(`Idioma no soportado: "${idioma}".`);
    }
    if (idioma === this.idioma) return false;
    this.idioma = idioma;
    for (const suscriptor of this.suscriptores) suscriptor(idioma);
    return true;
  }

  suscribir(suscriptor) {
    if (typeof suscriptor !== "function") return () => {};
    this.suscriptores.add(suscriptor);
    return () => this.suscriptores.delete(suscriptor);
  }

  traducir(clave, { parametros = {}, respaldo = "" } = {}) {
    const activo = obtenerPorRuta(this.catalogos[this.idioma], clave);
    if (typeof activo === "string" && activo.trim() !== "") {
      return interpolar(activo, parametros);
    }

    if (this.idioma !== IDIOMA_RESPALDO) {
      this.avisarFalta(clave);
    }

    const canonico = obtenerPorRuta(this.catalogos[IDIOMA_RESPALDO], clave);
    if (typeof canonico === "string" && canonico.trim() !== "") {
      return interpolar(canonico, parametros);
    }

    if (typeof respaldo === "string" && respaldo.trim() !== "") {
      return interpolar(respaldo, parametros);
    }

    return clave;
  }

  traducirContenido(categoria, id, campo, respaldo = "") {
    if (!categoria || !id || !campo) return respaldo ?? "";
    const clave = `contenido.${categoria}.${normalizarId(id)}.${campo}`;
    const activo = obtenerPorRuta(this.catalogos[this.idioma], clave);
    if (typeof activo === "string" && activo.trim() !== "") {
      return activo;
    }

    if (this.idioma !== IDIOMA_RESPALDO) this.avisarFalta(clave);

    // Para contenido jugable el respaldo explícito del objeto/configuración
    // tiene prioridad: conserva nombre/descripcion españoles como red de seguridad.
    if (typeof respaldo === "string" && respaldo.trim() !== "") {
      return respaldo;
    }

    const canonico = obtenerPorRuta(this.catalogos[IDIOMA_RESPALDO], clave);
    return typeof canonico === "string" && canonico.trim() !== ""
      ? canonico
      : respaldo ?? "";
  }

  avisarFalta(clave) {
    const firma = `${this.idioma}:${clave}`;
    if (this.avisos.has(firma)) return;
    this.avisos.add(firma);
    console.warn(`[i18n] Falta traducción ${this.idioma.toUpperCase()}: ${clave}`);
  }
}

export function validarParidadCatalogos(catalogos) {
  validarCatalogos(catalogos);
  const referencia = listarRutasTexto(catalogos[IDIOMA_RESPALDO]);
  const errores = [];
  for (const [idioma, catalogo] of Object.entries(catalogos)) {
    const rutas = listarRutasTexto(catalogo);
    for (const ruta of referencia) {
      const valor = obtenerPorRuta(catalogo, ruta);
      if (typeof valor !== "string" || valor.trim() === "") {
        errores.push(`${idioma}: falta ${ruta}`);
        continue;
      }
      const paramsEs = parametrosPlantilla(obtenerPorRuta(catalogos.es, ruta));
      const paramsIdioma = parametrosPlantilla(valor);
      if (paramsEs.join("|") !== paramsIdioma.join("|")) {
        errores.push(`${idioma}: parámetros incompatibles en ${ruta}`);
      }
    }
    for (const ruta of rutas) {
      if (!referencia.has(ruta)) errores.push(`${idioma}: clave adicional ${ruta}`);
    }
  }
  if (errores.length > 0) {
    throw new Error(`Los catálogos de idioma no tienen paridad:\n${errores.join("\n")}`);
  }
  return true;
}

function validarCatalogos(catalogos) {
  if (!catalogos || typeof catalogos !== "object" || !catalogos.es || !catalogos.en) {
    throw new Error("Se necesitan los catálogos de idioma es y en.");
  }
}

function obtenerPorRuta(objeto, ruta) {
  if (!objeto || typeof ruta !== "string") return undefined;
  return ruta.split(".").reduce((actual, parte) => actual?.[parte], objeto);
}

function listarRutasTexto(objeto, prefijo = "", salida = new Set()) {
  if (typeof objeto === "string") {
    salida.add(prefijo);
    return salida;
  }
  if (!objeto || typeof objeto !== "object" || Array.isArray(objeto)) return salida;
  for (const [clave, valor] of Object.entries(objeto)) {
    listarRutasTexto(valor, prefijo ? `${prefijo}.${clave}` : clave, salida);
  }
  return salida;
}

function parametrosPlantilla(texto) {
  if (typeof texto !== "string") return [];
  return [...texto.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]).sort();
}

function interpolar(texto, parametros) {
  return texto.replace(/\{([a-zA-Z0-9_]+)\}/g, (coincidencia, clave) =>
    Object.prototype.hasOwnProperty.call(parametros, clave)
      ? String(parametros[clave])
      : coincidencia,
  );
}

function normalizarId(id) {
  return String(id).trim().toLowerCase();
}
