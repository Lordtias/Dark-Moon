import {
  TIPOS_RELACION_ARBOL_HABILIDADES,
} from "../../juego/habilidades/ContratosArbolHabilidades.js";

const CANTIDAD_CARRILES_MINIMA = 5;

// Organiza visualmente cualquier maestría a partir de los mismos datos
// canónicos. El nivel de maestría conserva exclusivamente el eje vertical y
// la conectividad real del grafo distribuye el eje horizontal. No distingue
// entre magia, armas o armaduras ni contiene posiciones por habilidad.
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

    const nodosBase = habilidades
      .map((habilidad) => normalizarNodo(habilidad))
      .sort(compararNodos);
    const ids = new Set(nodosBase.map((nodo) => nodo.id));
    const relaciones = obtenerRelaciones({
      idMaestria,
      nodos: nodosBase,
      definiciones,
      definicionesEjecucion,
      ids,
    });
    const nodos = asignarPosicionesHorizontales(nodosBase, relaciones);
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
    .map(([nivel, nodosNivel]) => ({
      nivel,
      nodos: [...nodosNivel].sort(
        (a, b) =>
          a.posicionHorizontal - b.posicionHorizontal ||
          a.nombre.localeCompare(b.nombre, "es"),
      ),
    }));
}

function asignarPosicionesHorizontales(nodos, relaciones) {
  if (nodos.length === 0) return [];

  const conectividad = crearMapaConectividad(nodos, relaciones);
  const grupos = new Map();
  for (const nodo of nodos) {
    if (!grupos.has(nodo.requisitoNivelMaestria)) {
      grupos.set(nodo.requisitoNivelMaestria, []);
    }
    grupos.get(nodo.requisitoNivelMaestria).push(nodo);
  }

  const maximoPorNivel = Math.max(...[...grupos.values()].map((grupo) => grupo.length));
  const cantidadCarriles = Math.max(
    CANTIDAD_CARRILES_MINIMA,
    maximoPorNivel + 2,
  );
  const carrilPorId = new Map();

  for (const nodosNivel of grupos.values()) {
    const ocupados = new Set();
    const porConectividad = [...nodosNivel].sort((a, b) => {
      const conexionesA = conectividad.get(a.id);
      const conexionesB = conectividad.get(b.id);
      return (
        conexionesB.total - conexionesA.total ||
        compararNodos(a, b)
      );
    });

    for (const nodo of porConectividad) {
      const preferido = obtenerCarrilPreferido(
        conectividad.get(nodo.id),
        cantidadCarriles,
      );
      const carril = obtenerCarrilLibreMasCercano(
        preferido,
        ocupados,
        cantidadCarriles,
      );
      ocupados.add(carril);
      carrilPorId.set(nodo.id, carril);
    }
  }

  return nodos.map((nodo) => {
    const carril = carrilPorId.get(nodo.id);
    return Object.freeze({
      ...nodo,
      // Se deja un margen equivalente a un carril a cada lado. Así un nodo
      // nunca depende de coordenadas de contenido ni queda pegado al borde.
      posicionHorizontal: (carril + 1) / (cantidadCarriles + 1),
    });
  });
}

function crearMapaConectividad(nodos, relaciones) {
  const mapa = new Map(
    nodos.map((nodo) => [
      nodo.id,
      { entradas: 0, salidas: 0, total: 0 },
    ]),
  );

  for (const relacion of relaciones) {
    const origen = mapa.get(relacion.desde);
    const destino = mapa.get(relacion.hacia);
    if (!origen || !destino) continue;
    origen.salidas += 1;
    origen.total += 1;
    destino.entradas += 1;
    destino.total += 1;
  }
  return mapa;
}

function obtenerCarrilPreferido(conexiones, cantidadCarriles) {
  const ultimo = cantidadCarriles - 1;
  if (!conexiones || conexiones.total === 0) {
    return Math.round(ultimo / 2);
  }

  // Una fuente pura se desplaza hacia el primer tercio y un destino puro
  // hacia el último. Los nodos mixtos se acercan al centro según su balance.
  // La regla usa únicamente conexiones entrantes/salientes del grafo.
  if (conexiones.salidas > 0 && conexiones.entradas === 0) {
    return Math.round(ultimo * 0.25);
  }
  if (conexiones.entradas > 0 && conexiones.salidas === 0) {
    return Math.round(ultimo * 0.75);
  }

  const balance =
    (conexiones.entradas - conexiones.salidas) / conexiones.total;
  const fraccion = 0.5 + balance * 0.18;
  return limitarEntero(
    Math.round(ultimo * fraccion),
    0,
    ultimo,
  );
}

function obtenerCarrilLibreMasCercano(preferido, ocupados, cantidadCarriles) {
  if (!ocupados.has(preferido)) return preferido;

  for (let distancia = 1; distancia < cantidadCarriles; distancia += 1) {
    const izquierda = preferido - distancia;
    const derecha = preferido + distancia;
    if (izquierda >= 0 && !ocupados.has(izquierda)) return izquierda;
    if (derecha < cantidadCarriles && !ocupados.has(derecha)) return derecha;
  }

  throw new Error("No existe un carril horizontal libre para el árbol de habilidades.");
}

function limitarEntero(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
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
  // no al tipo de maestría. "modificacion" representa una modificación
  // específica de la habilidad destino; "sinergia", una interacción mediante
  // una estadística, estado o contexto compartido.
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

      // Las pasivas de daño global se conectan solamente con activas que
      // producen daño directo. Los efectos periódicos pertenecen a Potencia
      // de Efectos y no convierten por sí solos una habilidad en destino.
      const modificaDanioHabilidad =
        modificador.objetivo === "danoHabilidad" &&
        condiciones.maestriaHabilidad === idMaestria;
      const tipoDanio =
        modificador.objetivo === "danoTipo"
          ? condiciones.tipoDanio
          : null;

      if (modificaDanioHabilidad || typeof tipoDanio === "string") {
        for (const objetivo of nodos) {
          if (objetivo.id === nodo.id) continue;
          const definicionObjetivo = definicionesEjecucion[objetivo.id];
          const coincide = tipoDanio
            ? esHabilidadActivaConTipoDanio(definicionObjetivo, tipoDanio)
            : esHabilidadActivaConDanioDirecto(definicionObjetivo);
          if (!coincide) continue;

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

function esHabilidadActivaConDanioDirecto(definicion) {
  if (definicion?.tipo !== "activa" || !definicion.ejecucion) return false;
  if (definicion.ejecucion.ataqueArma) return true;
  return Object.values(definicion.ejecucion.grados ?? {}).some((grado) =>
    (grado?.danio ?? []).some((componente) => Number(componente?.valorBase) > 0),
  );
}

function esHabilidadActivaConTipoDanio(definicion, tipoDanio) {
  if (definicion?.tipo !== "activa" || !definicion.ejecucion) return false;
  return Object.values(definicion.ejecucion.grados ?? {}).some((grado) =>
    (grado?.danio ?? []).some(
      (componente) =>
        componente?.tipo === tipoDanio && Number(componente?.valorBase) > 0,
    ),
  );
}

function agregarRelacion(relaciones, claves, relacion) {
  const clave = `${relacion.desde}>${relacion.hacia}:${relacion.tipo}`;
  if (claves.has(clave)) return;
  claves.add(clave);
  relaciones.push(relacion);
}
