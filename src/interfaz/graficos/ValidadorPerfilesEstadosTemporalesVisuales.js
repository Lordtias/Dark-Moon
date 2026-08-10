import {
  validarObjetoPlano,
  validarTextoNoVacio,
  validarEnteroPositivo,
  validarNumeroPositivo,
  validarColorHexadecimal,
  congelarProfundamente,
} from "./ValidacionesConfiguracionVisual.js";

const VERSION_SOPORTADA = 2;
const CANALES_VALIDOS = Object.freeze([
  "pies",
  "laterales",
  "contorno",
  "superior",
  "lateral_izquierdo",
  "lateral_derecho",
]);
const MOTIVOS_NO_APLICADO = Object.freeze([
  "resistencia",
  "inmunidad",
  "duplicado",
]);

export function validarPerfilesEstadosTemporalesVisuales({
  configuracion,
  configuracionEfectos,
} = {}) {
  validarObjetoPlano(configuracion, "los perfiles visuales de estados temporales");
  validarObjetoPlano(
    configuracionEfectos?.efectos,
    "el catálogo canónico de efectos temporales",
  );

  if (configuracion.version !== VERSION_SOPORTADA) {
    throw new Error(
      `La versión de PerfilesEstadosTemporalesVisuales debe ser ${VERSION_SOPORTADA}.`,
    );
  }

  validarPerfiles(configuracion.estados);
  validarFeedbackNoAplicado(configuracion.feedbackNoAplicado);
  validarConexionCatalogo({
    perfiles: configuracion.estados,
    efectos: configuracionEfectos.efectos,
  });

  return congelarProfundamente(configuracion);
}

function validarPerfiles(perfiles) {
  validarObjetoPlano(perfiles, "los perfiles de estados temporales");

  for (const [idEfecto, perfil] of Object.entries(perfiles)) {
    validarTextoNoVacio(idEfecto, "el ID de un estado temporal visual");
    validarObjetoPlano(perfil, `el perfil de "${idEfecto}"`);

    for (const campo of [
      "forma",
      "movimiento",
      "textura",
      "feedbackAplicacion",
      "textoEstado",
      "pulsoTick",
    ]) {
      validarTextoNoVacio(perfil[campo], `${campo} de "${idEfecto}"`);
    }
    if (!CANALES_VALIDOS.includes(perfil.canal)) {
      throw new Error(`El canal visual de "${idEfecto}" no está soportado.`);
    }
    validarColorHexadecimal(
      perfil.colorPrincipal,
      `colorPrincipal de "${idEfecto}"`,
    );
    validarColorHexadecimal(
      perfil.colorSecundario,
      `colorSecundario de "${idEfecto}"`,
    );
    validarNumeroPositivo(
      perfil.tamanoVisualPx,
      `tamanoVisualPx de "${idEfecto}"`,
    );
    validarEnteroPositivo(
      perfil.densidadMaxima,
      `densidadMaxima de "${idEfecto}"`,
    );
    if (typeof perfil.mostrarMultiplicador !== "boolean") {
      throw new Error(
        `mostrarMultiplicador de "${idEfecto}" debe ser booleano.`,
      );
    }
  }
}

function validarFeedbackNoAplicado(configuracion) {
  validarObjetoPlano(configuracion, "el feedback de efectos no aplicados");
  for (const motivo of MOTIVOS_NO_APLICADO) {
    const perfil = configuracion[motivo];
    validarObjetoPlano(perfil, `feedbackNoAplicado.${motivo}`);
    validarTextoNoVacio(perfil.texto, `texto de ${motivo}`);
    validarTextoNoVacio(perfil.forma, `forma de ${motivo}`);
    validarColorHexadecimal(
      perfil.colorPrincipal,
      `colorPrincipal de ${motivo}`,
    );
    validarColorHexadecimal(
      perfil.colorSecundario,
      `colorSecundario de ${motivo}`,
    );
  }
}

function validarConexionCatalogo({ perfiles, efectos }) {
  const idsPerfiles = new Set(Object.keys(perfiles));
  const idsEfectos = new Set(Object.keys(efectos));

  for (const idEfecto of idsEfectos) {
    if (!idsPerfiles.has(idEfecto)) {
      throw new Error(
        `El efecto canónico "${idEfecto}" no tiene perfil visual.`,
      );
    }
  }
  for (const idPerfil of idsPerfiles) {
    if (!idsEfectos.has(idPerfil)) {
      throw new Error(
        `El perfil visual "${idPerfil}" no corresponde a un efecto canónico.`,
      );
    }
  }
}
