import {
  TIPOS_RELACION_ARBOL_HABILIDADES,
} from "../../juego/habilidades/ContratosArbolHabilidades.js";

// Organiza visualmente cualquier maestría a partir de los mismos datos
// canónicos. No distingue entre magia, armas o armaduras y no inventa
// dependencias: solo ordena por requisito de nivel y expone relaciones que ya
// pueden inferirse de los modificadores configurados.
export class OrganizadorArbolHabilidades {
  organizar({
    idMaestria,
    habilidades = [],
    definiciones = {},
    definicionesEjecucion = {},
  } = {}) {
    if (typeof idMaestria !== "string" || !idMaestria.trim()) {
      throw new Error("El árbol necesita una maestría válida.");
    }

    const nodos = habilidades
      .map((habilidad) => normalizarNodo(habilidad))
      .sort(compararNodos);
    const ids = new Set(nodos.map((nodo) => nodo.id));
    const niveles = agruparPorNivel(nodos);
    const relaciones = obtenerRelaciones({
      idMaestria,
      nodos,
      definiciones,
      definicionesEjecucion,
      ids,
    });

    return Object.freeze({
      idMaestria,
      niveles: Object.freeze(niveles.map((nivel) => Object.freeze(nivel))),
      relaciones: Object.freeze(relaciones.map((relacion) => Object.freeze(relacion))),
    });
  }
}

function normalizarNodo(habilidad) {
  if (!habilidad?.id) {
    throw new Error("El árbol recibió una habilidad sin identificador.");
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
    .map(([nivel, nodosNivel]) => ({ nivel, nodos: ordenarPorRelaciones(nodosNivel) }));
}

function ordenarPorRelaciones(nodos) {
  // La ubicación horizontal es determinista y genérica. Las relaciones se
  // dibujan encima del resultado; no existen coordenadas por habilidad.
  return [...nodos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function obtenerRelaciones({
  idMaestria,
  nodos,
  definiciones,
  definicionesEjecucion,
  ids,
}) {
  const relaciones = [];
  const claves = new Set();

  // Las relaciones explícitas pertenecen a la configuración de la habilidad,
  // no al tipo de maestría. Permiten representar sinergias reales de armas,
  // armaduras o cualquier familia futura con el mismo árbol visual.
  for (const nodo of nodos) {
    const definicion = definiciones[nodo.id];
    for (const relacion of definicion?.relacionesArbol ?? []) {
      if (!ids.has(relacion.hacia)) continue;
      agregarRelacion(relaciones, claves, {
        desde: nodo.id,
        hacia: relacion.hacia,
        tipo: relacion.tipo,
      });
    }
  }

  for (const nodo of nodos) {
    const definicion = definiciones[nodo.id];
    if (!definicion || definicion.tipo !== "pasiva") continue;

    const modificadores = Object.values(definicion.modificadoresPorGrado ?? {})
      .flatMap((lista) => (Array.isArray(lista) ? lista : []));

    for (const modificador of modificadores) {
      const condiciones = modificador?.condiciones ?? {};
      const idObjetivo = condiciones.idHabilidad;

      // Una relación específica conserva su semántica directa: esta pasiva
      // modifica a una habilidad concreta.
      if (typeof idObjetivo === "string" && ids.has(idObjetivo)) {
        agregarRelacion(relaciones, claves, {
          desde: nodo.id,
          hacia: idObjetivo,
          tipo: TIPOS_RELACION_ARBOL_HABILIDADES.MODIFICACION,
        });
        continue;
      }

      // Las pasivas cuyo modificador es daño de habilidad y abarca toda la
      // maestría se conectan únicamente con activas que realmente producen
      // daño. No basta con que una activa sea hostil: Auras, Maldiciones y
      // controles sin daño (por ejemplo Ceguera) nunca son destinos.
      if (
        modificador.objetivo === "danoHabilidad" &&
        condiciones.maestriaHabilidad === idMaestria
      ) {
        for (const objetivo of nodos) {
          if (objetivo.id === nodo.id) continue;
          const definicionObjetivo = definicionesEjecucion[objetivo.id];
          if (!esHabilidadActivaConDanio(definicionObjetivo)) {
            continue;
          }

          agregarRelacion(relaciones, claves, {
            desde: nodo.id,
            hacia: objetivo.id,
            tipo: TIPOS_RELACION_ARBOL_HABILIDADES.SINERGIA,
          });
        }
      }
    }
  }

  return relaciones;
}

function esHabilidadActivaConDanio(definicion) {
  if (definicion?.tipo !== "activa" || !definicion.ejecucion) return false;

  const grados = Object.values(definicion.ejecucion.grados ?? {});
  return grados.some((grado) => {
    const tieneDanioDirecto = (grado?.danio ?? []).some(
      (componente) => Number(componente?.valorBase) > 0,
    );
    if (tieneDanioDirecto) return true;

    // La configuración de ejecución ya contiene las referencias de efectos
    // resueltas por el validador canónico. Así una habilidad como Nube tóxica
    // cuenta como dañina por su Envenenamiento periódico sin inferirlo desde
    // hostilidad, etiquetas visuales ni nombres de contenido.
    return (grado?.efectos ?? []).some(
      (efecto) =>
        efecto?.tipo === "danio_periodico" &&
        Number(efecto?.valorBase) > 0,
    );
  });
}

function agregarRelacion(relaciones, claves, relacion) {
  const clave = `${relacion.desde}>${relacion.hacia}:${relacion.tipo}`;
  if (claves.has(clave)) return;
  claves.add(clave);
  relaciones.push(relacion);
}
