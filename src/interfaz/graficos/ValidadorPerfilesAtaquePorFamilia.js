const VERSION_SOPORTADA = 1;
const SECUENCIAS_OBLIGATORIAS = Object.freeze([
  "simple",
  "dual",
  "estocada",
  "proyectil",
  "proyectil_dual",
]);
const FALLBACKS_OBLIGATORIOS = Object.freeze([
  "ataque_natural",
  "familia_desconocida",
]);
const CAMPOS_SONIDO = Object.freeze([
  "preparacion",
  "ataque",
  "impacto",
]);
const TOLERANCIA_PROPORCIONES = 0.000001;

export function validarPerfilesAtaquePorFamilia({
  configuracion,
  configuracionObjetos,
} = {}) {
  validarObjetoPlano(configuracion, "los perfiles de ataque por familia");
  validarObjetoPlano(configuracionObjetos, "la configuración de objetos");

  if (configuracion.version !== VERSION_SOPORTADA) {
    throw new Error(
      `La versión de PerfilesAtaquePorFamilia debe ser ${VERSION_SOPORTADA}.`,
    );
  }

  validarRitmoVisual(configuracion.ritmoVisual);
  validarSecuencias(configuracion.secuencias);
  validarPerfiles({
    perfiles: configuracion.familias,
    secuencias: configuracion.secuencias,
    descripcion: "las familias de ataque",
  });
  validarPerfiles({
    perfiles: configuracion.fallbacks,
    secuencias: configuracion.secuencias,
    descripcion: "los fallbacks de ataque",
  });
  validarFallbacksObligatorios(configuracion.fallbacks);
  validarProyectilesElementales({
    proyectiles: configuracion.proyectilesElementales,
    configuracionObjetos,
  });
  validarConexionFamilias({
    familiasConfiguradas: configuracion.familias,
    configuracionObjetos,
  });

  return congelarProfundamente(configuracion);
}

function validarRitmoVisual(ritmoVisual) {
  validarObjetoPlano(ritmoVisual, "la configuración de ritmo visual");
  validarNumeroPositivo(
    ritmoVisual.milisegundosPorUnidadTemporal,
    "ritmoVisual.milisegundosPorUnidadTemporal",
  );
  validarEnteroPositivo(
    ritmoVisual.duracionMinimaMs,
    "ritmoVisual.duracionMinimaMs",
  );
  validarEnteroPositivo(
    ritmoVisual.duracionMaximaMs,
    "ritmoVisual.duracionMaximaMs",
  );

  if (ritmoVisual.duracionMinimaMs > ritmoVisual.duracionMaximaMs) {
    throw new Error(
      "La duración mínima del ritmo visual no puede superar la máxima.",
    );
  }
}

function validarSecuencias(secuencias) {
  validarObjetoPlano(secuencias, "las secuencias visuales de ataque");

  for (const idSecuencia of SECUENCIAS_OBLIGATORIAS) {
    if (!Object.hasOwn(secuencias, idSecuencia)) {
      throw new Error(
        `Falta la secuencia visual obligatoria "${idSecuencia}".`,
      );
    }
  }

  for (const [idSecuencia, fases] of Object.entries(secuencias)) {
    validarTextoNoVacio(idSecuencia, "el ID de una secuencia visual");
    validarObjetoPlano(fases, `la secuencia visual "${idSecuencia}"`);

    const entradas = Object.entries(fases);
    if (entradas.length === 0) {
      throw new Error(
        `La secuencia visual "${idSecuencia}" necesita al menos una fase.`,
      );
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

function validarPerfiles({ perfiles, secuencias, descripcion }) {
  validarObjetoPlano(perfiles, descripcion);

  for (const [idPerfil, perfil] of Object.entries(perfiles)) {
    validarTextoNoVacio(idPerfil, `un ID dentro de ${descripcion}`);
    validarObjetoPlano(perfil, `el perfil "${idPerfil}"`);
    validarTextoNoVacio(
      perfil.secuencia,
      `la secuencia del perfil "${idPerfil}"`,
    );

    if (!Object.hasOwn(secuencias, perfil.secuencia)) {
      throw new Error(
        `El perfil "${idPerfil}" referencia la secuencia inexistente ` +
          `"${perfil.secuencia}".`,
      );
    }

    validarAnimacion(perfil.animacion, idPerfil);
    validarSonido(perfil.sonido, idPerfil);
  }
}

function validarAnimacion(animacion, idPerfil) {
  validarObjetoPlano(animacion, `la animación del perfil "${idPerfil}"`);
  validarTextoNoVacio(animacion.tipo, `animacion.tipo de "${idPerfil}"`);
  validarTextoNoVacio(animacion.tamano, `animacion.tamano de "${idPerfil}"`);
  validarTextoNoVacio(animacion.sentido, `animacion.sentido de "${idPerfil}"`);
  validarNumeroPositivo(animacion.escala, `animacion.escala de "${idPerfil}"`);
  validarNumeroNoNegativo(
    animacion.amplitudGrados,
    `animacion.amplitudGrados de "${idPerfil}"`,
  );
  validarNumeroEnRango(
    animacion.avanceCasilla,
    0,
    1,
    `animacion.avanceCasilla de "${idPerfil}"`,
  );
  if (animacion.tamanoVisualPx !== undefined) {
    validarNumeroPositivo(
      animacion.tamanoVisualPx,
      `animacion.tamanoVisualPx de "${idPerfil}"`,
    );
  }
  if (animacion.longitudVisualCasillas !== undefined) {
    validarNumeroPositivo(
      animacion.longitudVisualCasillas,
      `animacion.longitudVisualCasillas de "${idPerfil}"`,
    );
  }
  if (animacion.orientacionBaseGrados !== undefined) {
    validarNumeroFinito(
      animacion.orientacionBaseGrados,
      `animacion.orientacionBaseGrados de "${idPerfil}"`,
    );
  }
  if (animacion.tipo === "flecha") {
    validarNumeroPositivo(
      animacion.tamanoVisualPx,
      `animacion.tamanoVisualPx de "${idPerfil}"`,
    );
    validarNumeroFinito(
      animacion.orientacionBaseGrados,
      `animacion.orientacionBaseGrados de "${idPerfil}"`,
    );
  }
  if (animacion.tipo === "estocada_recurso") {
    validarNumeroPositivo(
      animacion.longitudVisualCasillas,
      `animacion.longitudVisualCasillas de "${idPerfil}"`,
    );
    validarNumeroFinito(
      animacion.orientacionBaseGrados,
      `animacion.orientacionBaseGrados de "${idPerfil}"`,
    );
  }
}

function validarSonido(sonido, idPerfil) {
  validarObjetoPlano(sonido, `el sonido del perfil "${idPerfil}"`);

  for (const campo of CAMPOS_SONIDO) {
    if (!Object.hasOwn(sonido, campo)) {
      throw new Error(
        `El perfil "${idPerfil}" necesita el campo sonido.${campo}.`,
      );
    }

    const valor = sonido[campo];
    if (valor !== null) {
      validarTextoNoVacio(valor, `sonido.${campo} de "${idPerfil}"`);
    }
  }
}

function validarFallbacksObligatorios(fallbacks) {
  for (const idFallback of FALLBACKS_OBLIGATORIOS) {
    if (!Object.hasOwn(fallbacks, idFallback)) {
      throw new Error(`Falta el fallback de ataque "${idFallback}".`);
    }
  }
}

function validarProyectilesElementales({
  proyectiles,
  configuracionObjetos,
}) {
  validarObjetoPlano(proyectiles, "los proyectiles elementales");
  const elementosObligatorios = ["fuego", "frio", "rayo", "veneno"];

  for (const elemento of elementosObligatorios) {
    if (!Object.hasOwn(proyectiles, elemento)) {
      throw new Error(
        `Falta el perfil del proyectil elemental "${elemento}".`,
      );
    }
  }

  for (const [elemento, perfil] of Object.entries(proyectiles)) {
    if (!elementosObligatorios.includes(elemento)) {
      throw new Error(
        `El proyectil elemental "${elemento}" no corresponde a un elemento soportado.`,
      );
    }
    validarObjetoPlano(perfil, `el proyectil elemental "${elemento}"`);
    validarTextoNoVacio(perfil.forma, `forma de "${elemento}"`);
    validarTextoNoVacio(perfil.estela, `estela de "${elemento}"`);
    for (const campoOpcional of ["textura", "impacto"]) {
      if (Object.hasOwn(perfil, campoOpcional)) {
        validarTextoNoVacio(
          perfil[campoOpcional],
          `${campoOpcional} de "${elemento}"`,
        );
      }
    }
    validarTextoNoVacio(
      perfil.colorPrincipal,
      `colorPrincipal de "${elemento}"`,
    );
    validarTextoNoVacio(
      perfil.colorSecundario,
      `colorSecundario de "${elemento}"`,
    );
    validarNumeroPositivo(perfil.escala, `escala de "${elemento}"`);
    validarNumeroPositivo(
      perfil.tamanoVisualPx,
      `tamanoVisualPx de "${elemento}"`,
    );
  }

  for (const [idObjeto, plantilla] of Object.entries(configuracionObjetos)) {
    if (
      plantilla?.tipo !== "arma" ||
      plantilla?.familiaObjeto !== "varita"
    ) {
      continue;
    }

    const elemento = plantilla.propiedades?.elementoAtaqueBasico;
    validarTextoNoVacio(
      elemento,
      `elementoAtaqueBasico de la varita "${idObjeto}"`,
    );
    if (!Object.hasOwn(proyectiles, elemento)) {
      throw new Error(
        `La varita "${idObjeto}" usa el elemento "${elemento}" sin perfil visual.`,
      );
    }
  }
}

function validarConexionFamilias({
  familiasConfiguradas,
  configuracionObjetos,
}) {
  const familiasArmas = new Set();

  for (const [idObjeto, plantilla] of Object.entries(configuracionObjetos)) {
    if (plantilla?.tipo !== "arma") {
      continue;
    }

    validarTextoNoVacio(
      plantilla.familiaObjeto,
      `familiaObjeto del arma "${idObjeto}"`,
    );
    familiasArmas.add(plantilla.familiaObjeto);
  }

  for (const familia of familiasArmas) {
    if (!Object.hasOwn(familiasConfiguradas, familia)) {
      throw new Error(
        `La familia de arma "${familia}" no tiene un perfil de presentación.`,
      );
    }
  }

  for (const familia of Object.keys(familiasConfiguradas)) {
    if (!familiasArmas.has(familia)) {
      throw new Error(
        `El perfil de presentación "${familia}" no está conectado con ` +
          "ninguna familia de Armas.json.",
      );
    }
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (
    valor === null ||
    typeof valor !== "object" ||
    Array.isArray(valor)
  ) {
    throw new Error(`Se necesita un objeto válido para ${descripcion}.`);
  }
}

function validarTextoNoVacio(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe ser un texto no vacío.`);
  }
}

function validarNumeroFinito(valor, descripcion) {
  if (!Number.isFinite(valor)) {
    throw new Error(`${descripcion} debe ser un número finito.`);
  }
}

function validarNumeroPositivo(valor, descripcion) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un número mayor que 0.`);
  }
}

function validarNumeroNoNegativo(valor, descripcion) {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`${descripcion} debe ser un número mayor o igual que 0.`);
  }
}

function validarEnteroPositivo(valor, descripcion) {
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un entero mayor que 0.`);
  }
}

function validarNumeroEnRango(valor, minimo, maximo, descripcion) {
  if (!Number.isFinite(valor) || valor < minimo || valor > maximo) {
    throw new Error(
      `${descripcion} debe estar entre ${minimo} y ${maximo}.`,
    );
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
