import {
  TIPOS_RELACION_ARBOL_HABILIDADES,
} from "../../juego/habilidades/ContratosArbolHabilidades.js";

// Conserva su nombre público para no introducir otra capa de presentación,
// pero ahora organiza una ruta legible por nivel de maestría. Las relaciones
// devueltas son exclusivamente modificaciones directas ya declaradas por los
// datos canónicos; no crea sinergias por estadísticas compartidas.
export class OrganizadorArbolHabilidades {
  organizar({
    idMaestria,
    habilidades = [],
    definiciones = {},
  } = {}) {
    if (typeof idMaestria !== "string" || !idMaestria.trim()) {
      throw new Error("La ruta necesita una maestría válida.");
    }

    const nodos = habilidades
      .map((habilidad) => normalizarNodo(habilidad))
      .sort(compararNodos);
    const ids = new Set(nodos.map((nodo) => nodo.id));
    const relaciones = obtenerRelacionesDirectas({
      nodos,
      definiciones,
      ids,
    });
    const niveles = agruparPorNivel(nodos);

    return Object.freeze({
      idMaestria,
      niveles: Object.freeze(niveles.map((nivel) => Object.freeze(nivel))),
      relaciones: Object.freeze(relaciones.map((relacion) => Object.freeze(relacion))),
    });
  }
}

function normalizarNodo(habilidad) {
  if (!habilidad?.id) {
    throw new Error("La ruta recibió una habilidad sin identificador.");
  }
  return Object.freeze({
    id: habilidad.id,
    requisitoNivelMaestria: Number(habilidad.requisitoNivelMaestria) || 0,
    grado: Number(habilidad.grado) || 0,
    gradoMaximo: Number(habilidad.gradoMaximo) || 1,
    nombre: habilidad.nombre ?? habilidad.id,
    tipo: habilidad.tipo ?? null,
  });
}

function compararNodos(a, b) {
  return (
    a.requisitoNivelMaestria - b.requisitoNivelMaestria ||
    a.nombre.localeCompare(b.nombre, "es") ||
    a.id.localeCompare(b.id)
  );
}

function agruparPorNivel(nodos) {
  const grupos = new Map();
  for (const nodo of nodos) {
    if (!grupos.has(nodo.requisitoNivelMaestria)) {
      grupos.set(nodo.requisitoNivelMaestria, []);
    }
    grupos.get(nodo.requisitoNivelMaestria).push(nodo);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([nivel, nodosNivel]) => ({
      nivel,
      nodos: [...nodosNivel].sort(compararNodos),
    }));
}

function obtenerRelacionesDirectas({ nodos, definiciones, ids }) {
  const relaciones = [];
  const claves = new Set();

  for (const nodo of nodos) {
    const definicion = definiciones[nodo.id];
    for (const relacion of definicion?.relacionesArbol ?? []) {
      if (
        relacion.tipo !== TIPOS_RELACION_ARBOL_HABILIDADES.MODIFICACION ||
        !ids.has(relacion.hacia)
      ) {
        continue;
      }
      agregarRelacion(relaciones, claves, {
        desde: nodo.id,
        hacia: relacion.hacia,
        tipo: TIPOS_RELACION_ARBOL_HABILIDADES.MODIFICACION,
      });
    }
  }

  for (const nodo of nodos) {
    const definicion = definiciones[nodo.id];
    if (!definicion || definicion.tipo !== "pasiva") continue;

    const modificadores = Object.values(definicion.modificadoresPorGrado ?? {})
      .flatMap((lista) => (Array.isArray(lista) ? lista : []));

    for (const modificador of modificadores) {
      const idObjetivo = modificador?.condiciones?.idHabilidad;
      if (typeof idObjetivo !== "string" || !ids.has(idObjetivo)) continue;

      agregarRelacion(relaciones, claves, {
        desde: nodo.id,
        hacia: idObjetivo,
        tipo: TIPOS_RELACION_ARBOL_HABILIDADES.MODIFICACION,
      });
    }
  }

  return relaciones.sort(
    (a, b) =>
      a.desde.localeCompare(b.desde, "es") ||
      a.hacia.localeCompare(b.hacia, "es"),
  );
}

function agregarRelacion(relaciones, claves, relacion) {
  const clave = `${relacion.desde}>${relacion.hacia}:${relacion.tipo}`;
  if (claves.has(clave)) return;
  claves.add(clave);
  relaciones.push(relacion);
}
