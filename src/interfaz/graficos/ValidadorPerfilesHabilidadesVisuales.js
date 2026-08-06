import { validarPerfilPatronVisualHabilidad } from "./PatronesVisualesHabilidades.js";

const VERSION_SOPORTADA = 1;
const FASES_SONIDO = Object.freeze([
  "preparacion",
  "lanzamiento",
  "impacto",
]);
const NIVELES_VISUALES = Object.freeze([
  "basica",
  "intermedia",
  "avanzada",
  "npc",
  "enemigo",
]);
const TOLERANCIA_PROPORCIONES = 0.000001;

export function validarPerfilesHabilidadesVisuales({
  configuracion,
  configuracionHabilidades,
} = {}) {
  validarObjetoPlano(configuracion, "los perfiles visuales de habilidades");
  validarObjetoPlano(
    configuracionHabilidades?.habilidades,
    "el catálogo canónico de habilidades",
  );

  if (configuracion.version !== VERSION_SOPORTADA) {
    throw new Error(
      `La versión de PerfilesHabilidadesVisuales debe ser ${VERSION_SOPORTADA}.`,
    );
  }

  validarSecuencias(configuracion.secuencias);
  validarPerfiles({
    perfiles: configuracion.habilidades,
    secuencias: configuracion.secuencias,
  });
  validarConexionCatalogo({
    perfiles: configuracion.habilidades,
    habilidades: configuracionHabilidades.habilidades,
  });

  return congelarProfundamente(configuracion);
}

function validarSecuencias(secuencias) {
  validarObjetoPlano(secuencias, "las secuencias visuales de habilidades");
  if (Object.keys(secuencias).length === 0) {
    throw new Error("Debe existir al menos una secuencia visual de habilidad.");
  }

  for (const [idSecuencia, fases] of Object.entries(secuencias)) {
    validarTextoNoVacio(idSecuencia, "el ID de una secuencia visual");
    validarObjetoPlano(fases, `la secuencia "${idSecuencia}"`);
    const entradas = Object.entries(fases);
    if (entradas.length === 0) {
      throw new Error(`La secuencia "${idSecuencia}" necesita fases.`);
    }

    let suma = 0;
    for (const [idFase, proporcion] of entradas) {
      validarTextoNoVacio(idFase, `una fase de "${idSecuencia}"`);
      validarNumeroPositivo(
        proporcion,
        `secuencias.${idSecuencia}.${idFase}`,
      );
      suma += proporcion;
    }

    if (Math.abs(suma - 1) > TOLERANCIA_PROPORCIONES) {
      throw new Error(
        `Las proporciones de la secuencia "${idSecuencia}" deben sumar 1.`,
      );
    }
  }
}

function validarPerfiles({ perfiles, secuencias }) {
  validarObjetoPlano(perfiles, "los perfiles de habilidades");

  for (const [idHabilidad, perfil] of Object.entries(perfiles)) {
    validarTextoNoVacio(idHabilidad, "el ID de una habilidad visual");
    validarObjetoPlano(perfil, `el perfil de "${idHabilidad}"`);

    if (!NIVELES_VISUALES.includes(perfil.nivelVisual)) {
      throw new Error(
        `El nivel visual de "${idHabilidad}" no está soportado.`,
      );
    }
    validarTextoNoVacio(perfil.secuencia, `secuencia de "${idHabilidad}"`);
    if (!Object.hasOwn(secuencias, perfil.secuencia)) {
      throw new Error(
        `La habilidad "${idHabilidad}" referencia la secuencia inexistente ` +
          `"${perfil.secuencia}".`,
      );
    }

    for (const campo of ["forma", "movimiento", "textura", "estela", "impacto"]) {
      validarTextoNoVacio(perfil[campo], `${campo} de "${idHabilidad}"`);
    }
    validarColorHexadecimal(
      perfil.colorPrincipal,
      `colorPrincipal de "${idHabilidad}"`,
    );
    validarColorHexadecimal(
      perfil.colorSecundario,
      `colorSecundario de "${idHabilidad}"`,
    );
    validarNumeroPositivo(
      perfil.tamanoVisualPx,
      `tamanoVisualPx de "${idHabilidad}"`,
    );
    validarEscalas(perfil.escalaPorGrado, idHabilidad);
    validarSonido(perfil.sonido, idHabilidad);
    validarPerfilPatronVisualHabilidad(perfil, idHabilidad);
  }
}

function validarConexionCatalogo({ perfiles, habilidades }) {
  const idsPerfiles = new Set(Object.keys(perfiles));
  const idsHabilidades = new Set(Object.keys(habilidades));

  for (const idHabilidad of idsHabilidades) {
    if (!idsPerfiles.has(idHabilidad)) {
      throw new Error(
        `La habilidad canónica "${idHabilidad}" no tiene perfil visual.`,
      );
    }
  }

  for (const idPerfil of idsPerfiles) {
    if (!idsHabilidades.has(idPerfil)) {
      throw new Error(
        `El perfil visual "${idPerfil}" no corresponde a una habilidad canónica.`,
      );
    }
  }
}

function validarEscalas(escalas, idHabilidad) {
  if (!Array.isArray(escalas) || escalas.length === 0) {
    throw new Error(
      `La habilidad "${idHabilidad}" necesita escalaPorGrado.`,
    );
  }
  escalas.forEach((valor, indice) => {
    validarNumeroPositivo(
      valor,
      `escalaPorGrado[${indice}] de "${idHabilidad}"`,
    );
  });
}

function validarSonido(sonido, idHabilidad) {
  validarObjetoPlano(sonido, `el sonido de "${idHabilidad}"`);
  for (const fase of FASES_SONIDO) {
    if (!Object.hasOwn(sonido, fase)) {
      throw new Error(
        `La habilidad "${idHabilidad}" necesita sonido.${fase}.`,
      );
    }
    if (sonido[fase] !== null) {
      validarTextoNoVacio(
        sonido[fase],
        `sonido.${fase} de "${idHabilidad}"`,
      );
    }
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita un objeto válido para ${descripcion}.`);
  }
}

function validarTextoNoVacio(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe ser un texto no vacío.`);
  }
}

function validarNumeroPositivo(valor, descripcion) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un número mayor que 0.`);
  }
}

function validarColorHexadecimal(valor, descripcion) {
  if (typeof valor !== "string" || !/^#[0-9a-f]{6}$/i.test(valor)) {
    throw new Error(`${descripcion} debe usar el formato hexadecimal #RRGGBB.`);
  }
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
