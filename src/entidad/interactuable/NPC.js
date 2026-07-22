import { Entidad } from "../Entidad.js";

import { TIPOS_INTERACCION } from "../../juego/interacciones/TiposInteraccion.js";

const TIPOS_INTERACCION_VALIDOS = new Set(Object.values(TIPOS_INTERACCION));

// Representa una entidad neutral capaz de ofrecer
// una o varias interacciones al jugador.
//
// NPC es deliberadamente genérico:
//
// - No conoce comercio, misiones ni diálogos concretos.
// - Puede poseer uno o varios roles simultáneos.
// - Puede pertenecer a cualquier facción.
// - Puede guardar datos específicos para sistemas futuros.
// - Su comportamiento se describe mediante interacciones.
//
// De esta manera un mismo NPC puede funcionar como:
//
// - Mercader.
// - Herrero.
// - Alquimista.
// - Guardia.
// - Personaje de misión.
// - Entrenador.
// - Combinación de varios roles.
export class NPC extends Entidad {
  constructor({
    id,
    nombre,

    // rol se conserva por compatibilidad con
    // configuraciones y código existentes.
    rol = "npc",

    // roles permite declarar varias funciones
    // sin crear una subclase por cada tipo de NPC.
    roles = null,

    descripcion = "",
    faccion = "neutral",

    x = 0,
    y = 0,
    simbolo = "N",
    recursoVisual = null,

    interacciones = [],

    // datos admite metadatos propios del NPC.
    //
    // Ejemplos futuros:
    //
    // {
    //   idTienda: "herrero_refugio",
    //   idDialogo: "bienvenida_herrero"
    // }
    datos = {},
  } = {}) {
    super({
      nombre,
      x,
      y,
      simbolo,
    });

    validarId(id);

    validarDescripcion(descripcion, nombre);

    validarFaccion(faccion, nombre);

    validarRecursoVisual(recursoVisual, nombre);

    if (!Array.isArray(interacciones)) {
      throw new Error(`${nombre} necesita una lista de interacciones.`);
    }

    if (interacciones.length === 0) {
      throw new Error(`${nombre} necesita al menos una interacción.`);
    }

    const rolesNormalizados = normalizarRoles({
      rol,
      roles,
      nombre,
    });

    validarDatos(datos, nombre);

    this.id = id.trim();

    // rol continúa exponiendo el rol principal
    // para no romper consumidores actuales.
    this.rol = rolesNormalizados[0];

    this.roles = Object.freeze([...rolesNormalizados]);

    this.descripcion = descripcion.trim();

    this.faccion = faccion.trim();

    this.recursoVisual = recursoVisual === null ? null : recursoVisual.trim();

    // Las interacciones se normalizan y congelan
    // para que la configuración externa no pueda
    // modificarlas después de crear el NPC.
    this.interacciones = Object.freeze(
      interacciones.map((interaccion) =>
        Object.freeze(normalizarInteraccion(interaccion, nombre)),
      ),
    );

    // Guardamos una copia independiente de los datos.
    // Los sistemas que los consulten recibirán otra copia.
    this._datos = clonarDatos(datos);
  }

  // Devuelve copias nuevas porque el sistema de
  // interacciones puede agregar información temporal,
  // como entidad, distancia y orden de selección.
  obtenerInteracciones() {
    return this.interacciones.map((interaccion) => clonarDatos(interaccion));
  }

  // Permite consultar capacidades sin depender
  // del rol principal.
  tieneRol(rol) {
    if (typeof rol !== "string" || rol.trim() === "") {
      return false;
    }

    const rolNormalizado = rol.trim();

    return this.roles.includes(rolNormalizado);
  }

  // Permite comprobar si el NPC ofrece una acción
  // sin conocer la posición de esa interacción
  // dentro de la lista.
  ofreceInteraccion(tipo) {
    if (!TIPOS_INTERACCION_VALIDOS.has(tipo)) {
      return false;
    }

    return this.interacciones.some((interaccion) => interaccion.tipo === tipo);
  }

  // Devuelve una copia de los metadatos genéricos
  // para impedir modificaciones externas accidentales.
  obtenerDatos() {
    return clonarDatos(this._datos);
  }
}

function normalizarRoles({ rol, roles, nombre }) {
  const origen = roles === null || roles === undefined ? [rol] : roles;

  if (!Array.isArray(origen)) {
    throw new Error(`Los roles de ${nombre} deben estar dentro de una lista.`);
  }

  if (origen.length === 0) {
    throw new Error(`${nombre} necesita al menos un rol.`);
  }

  const normalizados = [];

  for (const valor of origen) {
    validarRol(valor, nombre);

    const rolNormalizado = valor.trim();

    if (!normalizados.includes(rolNormalizado)) {
      normalizados.push(rolNormalizado);
    }
  }

  return normalizados;
}

function normalizarInteraccion(interaccion, nombreNpc) {
  if (
    !interaccion ||
    typeof interaccion !== "object" ||
    Array.isArray(interaccion)
  ) {
    throw new Error(`${nombreNpc} contiene una interacción inválida.`);
  }

  if (!TIPOS_INTERACCION_VALIDOS.has(interaccion.tipo)) {
    throw new Error(
      `${nombreNpc} contiene el tipo de interacción ` +
        `"${interaccion.tipo}" que no es válido.`,
    );
  }

  if (
    typeof interaccion.texto !== "string" ||
    interaccion.texto.trim() === ""
  ) {
    throw new Error(`${nombreNpc} necesita un texto de interacción válido.`);
  }

  const alcance = interaccion.alcance ?? 1;

  const prioridad = interaccion.prioridad ?? 0;

  if (!Number.isInteger(alcance) || alcance < 0) {
    throw new Error(
      `El alcance de una interacción de ${nombreNpc} ` +
        "debe ser un entero no negativo.",
    );
  }

  if (!Number.isFinite(prioridad)) {
    throw new Error(
      `La prioridad de una interacción de ${nombreNpc} ` + "debe ser numérica.",
    );
  }

  return {
    ...clonarDatos(interaccion),

    texto: interaccion.texto.trim(),

    alcance,
    prioridad,
  };
}

function validarId(id) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("Todo NPC necesita un ID válido.");
  }
}

function validarRol(rol, nombre) {
  if (typeof rol !== "string" || rol.trim() === "") {
    throw new Error(`Todo rol de ${nombre} debe ser un texto válido.`);
  }
}

function validarDescripcion(descripcion, nombre) {
  if (typeof descripcion !== "string") {
    throw new Error(`La descripción de ${nombre} debe ser un texto.`);
  }
}

function validarFaccion(faccion, nombre) {
  if (typeof faccion !== "string" || faccion.trim() === "") {
    throw new Error(`La facción de ${nombre} debe ser un texto válido.`);
  }
}

function validarRecursoVisual(recursoVisual, nombre) {
  if (
    recursoVisual !== null &&
    (typeof recursoVisual !== "string" || recursoVisual.trim() === "")
  ) {
    throw new Error(
      `El recurso visual de ${nombre} ` + "debe ser una ruta válida o null.",
    );
  }
}

function validarDatos(datos, nombre) {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    throw new Error(
      `Los datos adicionales de ${nombre} ` + "deben formar un objeto válido.",
    );
  }
}

// Crea copias recursivas de listas y objetos JSON.
//
// Los datos de configuración utilizados por los NPC
// no necesitan conservar prototipos ni métodos.
function clonarDatos(valor) {
  if (Array.isArray(valor)) {
    return valor.map(clonarDatos);
  }

  if (valor && typeof valor === "object") {
    return Object.entries(valor).reduce(
      (resultado, [clave, contenido]) => {
        resultado[clave] = clonarDatos(contenido);

        return resultado;
      },

      {},
    );
  }

  return valor;
}
