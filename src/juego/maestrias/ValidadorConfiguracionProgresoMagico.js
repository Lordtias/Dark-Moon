const IDS_MAESTRIAS_CONGELADAS = Object.freeze([
  "fuego",
  "frio",
  "rayo",
  "veneno",
]);

const IDS_PROFESIONES_ACTUALES = Object.freeze(["guerrero", "rogue", "mago"]);

// Valida y normaliza los dos catálogos que definen la progresión mágica.
//
// La lógica de dominio no consulta nombres visibles ni conoce profesiones
// concretas. Es el JSON quien determina qué profesión puede aprender cada
// maestría y qué requisito posee cada habilidad.
export function validarConfiguracionProgresoMagico({
  configuracionMaestrias,
  configuracionHabilidades,
} = {}) {
  validarObjetoPlano(configuracionMaestrias, "la configuración de maestrías");
  validarObjetoPlano(
    configuracionHabilidades,
    "la configuración de habilidades",
  );

  validarVersion(configuracionMaestrias.version, "maestrías");
  validarVersion(configuracionHabilidades.version, "habilidades");

  const reglas = normalizarReglas(configuracionMaestrias.reglas);
  const maestrias = normalizarMaestrias(configuracionMaestrias.maestrias);
  const habilidades = normalizarHabilidades({
    habilidades: configuracionHabilidades.habilidades,
    maestrias,
  });

  validarDistribucionHabilidades({
    maestrias,
    habilidades,
  });

  return congelarProfundamente({
    version: Math.max(
      configuracionMaestrias.version,
      configuracionHabilidades.version,
    ),
    reglas,
    maestrias,
    habilidades,
  });
}

function normalizarReglas(reglas) {
  validarObjetoPlano(reglas, "las reglas de progresión mágica");

  validarEnteroNoNegativo(
    reglas.puntosUniversalesIniciales,
    "Los puntos universales iniciales",
  );
  validarEnteroPositivo(
    reglas.puntosUniversalesPorNivelGeneral,
    "Los puntos universales por nivel general",
  );

  if (
    !Number.isFinite(reglas.factorExperienciaPorMana) ||
    reglas.factorExperienciaPorMana <= 0
  ) {
    throw new Error("El factor de experiencia por Maná debe ser mayor que 0.");
  }

  validarEnteroPositivo(
    reglas.nivelMaximoMaestria,
    "El nivel máximo de maestría",
  );

  if (
    !Array.isArray(reglas.experienciaPorNivel) ||
    reglas.experienciaPorNivel.length !== reglas.nivelMaximoMaestria
  ) {
    throw new Error(
      "La curva de maestría debe definir un umbral por cada nivel.",
    );
  }

  const experienciaPorNivel = reglas.experienciaPorNivel.map(
    (valor, indice) => {
      validarEnteroPositivo(valor, `La experiencia del nivel ${indice + 1}`);
      return valor;
    },
  );

  return {
    puntosUniversalesIniciales: reglas.puntosUniversalesIniciales,
    puntosUniversalesPorNivelGeneral: reglas.puntosUniversalesPorNivelGeneral,
    factorExperienciaPorMana: reglas.factorExperienciaPorMana,
    nivelMaximoMaestria: reglas.nivelMaximoMaestria,
    experienciaPorNivel,
  };
}

function normalizarMaestrias(maestrias) {
  validarObjetoPlano(maestrias, "el catálogo de maestrías");

  const idsRecibidos = Object.keys(maestrias).map(normalizarId).sort();
  const idsEsperados = [...IDS_MAESTRIAS_CONGELADAS].sort();

  if (JSON.stringify(idsRecibidos) !== JSON.stringify(idsEsperados)) {
    throw new Error(
      "La etapa necesita exactamente las maestrías Fuego, Frío, Rayo y Veneno.",
    );
  }

  const resultado = {};

  for (const idMaestria of IDS_MAESTRIAS_CONGELADAS) {
    const definicion = maestrias[idMaestria];
    validarObjetoPlano(definicion, `la maestría "${idMaestria}"`);
    validarTexto(definicion.nombre, `nombre de ${idMaestria}`);
    validarTexto(definicion.categoria, `categoría de ${idMaestria}`);

    if (!Array.isArray(definicion.profesionesPermitidas)) {
      throw new Error(
        `La maestría "${idMaestria}" debe declarar profesiones permitidas.`,
      );
    }

    const profesionesPermitidas = definicion.profesionesPermitidas.map(
      (idProfesion) => {
        const normalizada = normalizarId(idProfesion);
        if (!IDS_PROFESIONES_ACTUALES.includes(normalizada)) {
          throw new Error(
            `La profesión "${normalizada}" de ${idMaestria} no existe.`,
          );
        }
        return normalizada;
      },
    );

    if (
      profesionesPermitidas.length === 0 ||
      new Set(profesionesPermitidas).size !== profesionesPermitidas.length
    ) {
      throw new Error(
        `Las profesiones de "${idMaestria}" están vacías o repetidas.`,
      );
    }

    resultado[idMaestria] = {
      id: idMaestria,
      nombre: definicion.nombre.trim(),
      categoria: normalizarId(definicion.categoria),
      profesionesPermitidas,
    };
  }

  return resultado;
}

function normalizarHabilidades({ habilidades, maestrias }) {
  validarObjetoPlano(habilidades, "el catálogo de habilidades");

  const resultado = {};

  for (const [idOriginal, definicion] of Object.entries(habilidades)) {
    const idHabilidad = normalizarId(idOriginal);
    validarObjetoPlano(definicion, `la habilidad "${idHabilidad}"`);
    validarTexto(definicion.nombre, `nombre de ${idHabilidad}`);

    const idMaestria = normalizarId(definicion.maestria);
    if (!maestrias[idMaestria]) {
      throw new Error(
        `La habilidad "${idHabilidad}" referencia la maestría desconocida "${idMaestria}".`,
      );
    }

    validarEnteroNoNegativo(
      definicion.requisitoNivelMaestria,
      `El requisito de "${idHabilidad}"`,
    );
    validarEnteroPositivo(
      definicion.gradoMaximo,
      `El grado máximo de "${idHabilidad}"`,
    );

    if (resultado[idHabilidad]) {
      throw new Error(`La habilidad "${idHabilidad}" está repetida.`);
    }

    resultado[idHabilidad] = {
      id: idHabilidad,
      nombre: definicion.nombre.trim(),
      maestria: idMaestria,
      requisitoNivelMaestria: definicion.requisitoNivelMaestria,
      gradoMaximo: definicion.gradoMaximo,
    };
  }

  return resultado;
}

function validarDistribucionHabilidades({ maestrias, habilidades }) {
  const distribucionEsperada = [
    { requisito: 0, gradoMaximo: 4 },
    { requisito: 3, gradoMaximo: 3 },
    { requisito: 6, gradoMaximo: 3 },
  ];

  for (const idMaestria of Object.keys(maestrias)) {
    const habilidadesMaestria = Object.values(habilidades)
      .filter((habilidad) => habilidad.maestria === idMaestria)
      .sort((a, b) => a.requisitoNivelMaestria - b.requisitoNivelMaestria);

    if (habilidadesMaestria.length !== 3) {
      throw new Error(
        `La maestría "${idMaestria}" debe tener tres habilidades.`,
      );
    }

    habilidadesMaestria.forEach((habilidad, indice) => {
      const esperado = distribucionEsperada[indice];
      if (
        habilidad.requisitoNivelMaestria !== esperado.requisito ||
        habilidad.gradoMaximo !== esperado.gradoMaximo
      ) {
        throw new Error(
          `La distribución de grados de "${idMaestria}" debe ser 4/3/3 con requisitos 0/3/6.`,
        );
      }
    });
  }
}

function validarVersion(version, descripcion) {
  validarEnteroPositivo(version, `La versión del catálogo de ${descripcion}`);
}

function validarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe ser un texto válido.`);
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita ${descripcion} válida.`);
  }
}

function validarEnteroPositivo(valor, descripcion) {
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un entero mayor que 0.`);
  }
}

function validarEnteroNoNegativo(valor, descripcion) {
  if (!Number.isSafeInteger(valor) || valor < 0) {
    throw new Error(`${descripcion} debe ser un entero igual o mayor que 0.`);
  }
}

function normalizarId(valor) {
  validarTexto(valor, "El identificador");
  return valor.trim().toLowerCase();
}

function congelarProfundamente(valor) {
  if (valor === null || typeof valor !== "object") {
    return valor;
  }

  for (const contenido of Object.values(valor)) {
    congelarProfundamente(contenido);
  }

  return Object.freeze(valor);
}
