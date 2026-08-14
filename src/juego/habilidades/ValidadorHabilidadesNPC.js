const VERSION_SOPORTADA = 1;
const TIPOS_OBJETIVO_SOPORTADOS = new Set(["aliado", "propio"]);
const PATRONES_SOPORTADOS = new Set(["libre"]);
const RECURSOS_RECUPERABLES = new Set(["vida", "mana"]);

// Valida habilidades canónicas que pertenecen a NPC y no forman parte del
// progreso de habilidades del jugador. Estas habilidades describen el hecho jugable
// que ocurrió, pero no incorporan costes, maestrías ni grados aprendibles.
export function validarHabilidadesNPC(configuracion) {
  validarObjeto(configuracion, "la configuración de habilidades NPC");
  if (configuracion.version !== VERSION_SOPORTADA) {
    throw new Error(
      `La versión de HabilidadesNPC debe ser ${VERSION_SOPORTADA}.`,
    );
  }
  validarObjeto(configuracion.habilidades, "el catálogo de habilidades NPC");

  const entradas = Object.entries(configuracion.habilidades);
  if (entradas.length === 0) {
    throw new Error("HabilidadesNPC necesita al menos una habilidad.");
  }

  const habilidades = {};
  for (const [idOriginal, definicion] of entradas) {
    const id = normalizarId(idOriginal, "el ID de una habilidad NPC");
    validarObjeto(definicion, `la habilidad NPC "${id}"`);
    validarObjeto(definicion.ejecucion, `la ejecución de "${id}"`);

    const tipoObjetivo = normalizarId(
      definicion.ejecucion.tipoObjetivo,
      `tipoObjetivo de "${id}"`,
    );
    if (!TIPOS_OBJETIVO_SOPORTADOS.has(tipoObjetivo)) {
      throw new Error(
        `La habilidad NPC "${id}" usa el tipoObjetivo no soportado ` +
          `"${tipoObjetivo}".`,
      );
    }

    const patronAtaque = normalizarId(
      definicion.ejecucion.patronAtaque,
      `patronAtaque de "${id}"`,
    );
    if (!PATRONES_SOPORTADOS.has(patronAtaque)) {
      throw new Error(
        `La habilidad NPC "${id}" usa el patrón no soportado ` +
          `"${patronAtaque}".`,
      );
    }

    if (definicion.ejecucion.requiereLineaVision !== true) {
      throw new Error(
        `La habilidad NPC "${id}" debe requerir línea de visión.`,
      );
    }
    if (definicion.ejecucion.hostil !== false) {
      throw new Error(`La habilidad NPC "${id}" no puede ser hostil.`);
    }

    validarObjeto(
      definicion.ejecucion.recuperacion,
      `la recuperación de "${id}"`,
    );
    const recurso = normalizarId(
      definicion.ejecucion.recuperacion.recurso,
      `el recurso recuperado por "${id}"`,
    );
    if (!RECURSOS_RECUPERABLES.has(recurso)) {
      throw new Error(
        `La habilidad NPC "${id}" intenta recuperar el recurso ` +
          `no soportado "${recurso}".`,
      );
    }

    habilidades[id] = {
      id,
      nombre: normalizarTexto(definicion.nombre, `el nombre de "${id}"`),
      maestria: null,
      descripcion: normalizarTexto(
        definicion.descripcion,
        `la descripción de "${id}"`,
      ),
      gradoMaximo: 1,
      ejecucion: {
        tipoObjetivo,
        patronAtaque,
        requiereLineaVision: true,
        hostil: false,
        recuperacion: { recurso },
      },
    };
  }

  return congelarProfundamente({
    version: configuracion.version,
    habilidades,
  });
}

function validarObjeto(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita un objeto válido para ${descripcion}.`);
  }
}

function normalizarId(valor, descripcion) {
  const texto = normalizarTexto(valor, descripcion).toLowerCase();
  if (!/^[a-z0-9_]+$/.test(texto)) {
    throw new Error(`${descripcion} contiene caracteres no permitidos.`);
  }
  return texto;
}

function normalizarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe ser un texto no vacío.`);
  }
  return valor.trim();
}

function congelarProfundamente(valor) {
  if (valor === null || typeof valor !== "object" || Object.isFrozen(valor)) {
    return valor;
  }
  for (const contenido of Object.values(valor)) {
    congelarProfundamente(contenido);
  }
  return Object.freeze(valor);
}
