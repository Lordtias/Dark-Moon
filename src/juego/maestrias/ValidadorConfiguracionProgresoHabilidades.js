import { normalizarDescriptorModificador } from "../modificadores/ContratosModificadoresCombatiente.js";
import { normalizarFuenteExperienciaMaestria } from "./ContratosExperienciaMaestrias.js";

export const TIPOS_HABILIDAD = Object.freeze({
  ACTIVA: "activa",
  PASIVA: "pasiva",
});

// Valida y normaliza los catálogos generales de progresión de habilidades.
//
// El contrato no conoce maestrías, categorías ni profesiones concretas. Los
// JSON determinan qué familias existen, cómo ganan XP y qué habilidades o
// pasivas contiene cada maestría.
export function validarConfiguracionProgresoHabilidades({
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
  const categorias = normalizarCategorias(configuracionMaestrias.categorias);
  const maestrias = normalizarMaestrias({
    maestrias: configuracionMaestrias.maestrias,
    categorias,
  });
  const habilidades = normalizarHabilidades({
    habilidades: configuracionHabilidades.habilidades,
    maestrias,
    nivelMaximoMaestria: reglas.nivelMaximoMaestria,
  });

  return congelarProfundamente({
    version: Math.max(
      configuracionMaestrias.version,
      configuracionHabilidades.version,
    ),
    reglas,
    categorias,
    maestrias,
    habilidades,
  });
}

function normalizarReglas(reglas) {
  validarObjetoPlano(reglas, "las reglas de progresión de habilidades");

  validarEnteroNoNegativo(
    reglas.puntosUniversalesIniciales,
    "Los puntos universales iniciales",
  );
  validarEnteroPositivo(
    reglas.puntosUniversalesPorNivelGeneral,
    "Los puntos universales por nivel general",
  );
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

  const clavesPermitidas = new Set([
    "puntosUniversalesIniciales",
    "puntosUniversalesPorNivelGeneral",
    "nivelMaximoMaestria",
    "experienciaPorNivel",
  ]);
  for (const clave of Object.keys(reglas)) {
    if (!clavesPermitidas.has(clave)) {
      throw new Error(`La regla de progresión desconocida "${clave}" no existe.`);
    }
  }

  return {
    puntosUniversalesIniciales: reglas.puntosUniversalesIniciales,
    puntosUniversalesPorNivelGeneral: reglas.puntosUniversalesPorNivelGeneral,
    nivelMaximoMaestria: reglas.nivelMaximoMaestria,
    experienciaPorNivel,
  };
}

function normalizarCategorias(categorias) {
  validarObjetoPlano(categorias, "el catálogo de categorías");
  const entradas = Object.entries(categorias);
  if (entradas.length === 0) {
    throw new Error("Debe existir al menos una categoría de maestrías.");
  }

  const resultado = {};
  for (const [idOriginal, definicion] of entradas) {
    const idCategoria = normalizarId(idOriginal);
    if (resultado[idCategoria]) {
      throw new Error(`La categoría "${idCategoria}" está repetida.`);
    }
    validarObjetoPlano(definicion, `la categoría "${idCategoria}"`);
    validarTexto(definicion.nombre, `nombre de ${idCategoria}`);
    validarEnteroNoNegativo(definicion.orden, `El orden de ${idCategoria}`);

    resultado[idCategoria] = {
      id: idCategoria,
      nombre: definicion.nombre.trim(),
      orden: definicion.orden,
    };
  }
  return resultado;
}

function normalizarMaestrias({ maestrias, categorias }) {
  validarObjetoPlano(maestrias, "el catálogo de maestrías");
  const resultado = {};

  for (const [idOriginal, definicion] of Object.entries(maestrias)) {
    const idMaestria = normalizarId(idOriginal);
    if (resultado[idMaestria]) {
      throw new Error(`La maestría "${idMaestria}" está repetida.`);
    }

    validarObjetoPlano(definicion, `la maestría "${idMaestria}"`);
    validarTexto(definicion.nombre, `nombre de ${idMaestria}`);
    validarTexto(definicion.categoria, `categoría de ${idMaestria}`);
    validarEnteroNoNegativo(definicion.orden, `El orden de ${idMaestria}`);

    const idCategoria = normalizarId(definicion.categoria);
    if (!categorias[idCategoria]) {
      throw new Error(
        `La maestría "${idMaestria}" referencia la categoría desconocida "${idCategoria}".`,
      );
    }

    if (!Array.isArray(definicion.profesionesPermitidas)) {
      throw new Error(
        `La maestría "${idMaestria}" debe declarar profesiones permitidas.`,
      );
    }

    const profesionesPermitidas = definicion.profesionesPermitidas.map(
      (idProfesion) => normalizarId(idProfesion),
    );
    if (
      profesionesPermitidas.length === 0 ||
      new Set(profesionesPermitidas).size !== profesionesPermitidas.length
    ) {
      throw new Error(
        `Las profesiones de "${idMaestria}" están vacías o repetidas.`,
      );
    }

    if (
      !Array.isArray(definicion.fuentesExperiencia) ||
      definicion.fuentesExperiencia.length === 0
    ) {
      throw new Error(
        `La maestría "${idMaestria}" debe declarar al menos una fuente de experiencia.`,
      );
    }
    const fuentesExperiencia = definicion.fuentesExperiencia.map(
      (fuente, indice) =>
        normalizarFuenteExperienciaMaestria(fuente, {
          etiqueta: `la fuente ${indice + 1} de la maestría "${idMaestria}"`,
        }),
    );

    resultado[idMaestria] = {
      id: idMaestria,
      nombre: definicion.nombre.trim(),
      categoria: idCategoria,
      orden: definicion.orden,
      profesionesPermitidas,
      fuentesExperiencia,
    };
  }

  return resultado;
}

function normalizarHabilidades({
  habilidades,
  maestrias,
  nivelMaximoMaestria,
}) {
  validarObjetoPlano(habilidades, "el catálogo de habilidades");
  const resultado = {};

  for (const [idOriginal, definicion] of Object.entries(habilidades)) {
    const idHabilidad = normalizarId(idOriginal);
    if (resultado[idHabilidad]) {
      throw new Error(`La habilidad "${idHabilidad}" está repetida.`);
    }

    validarObjetoPlano(definicion, `la habilidad "${idHabilidad}"`);
    validarTexto(definicion.nombre, `nombre de ${idHabilidad}`);

    const idMaestria = normalizarId(definicion.maestria);
    if (!maestrias[idMaestria]) {
      throw new Error(
        `La habilidad "${idHabilidad}" referencia la maestría desconocida "${idMaestria}".`,
      );
    }

    const tipo = normalizarId(definicion.tipo);
    if (!Object.values(TIPOS_HABILIDAD).includes(tipo)) {
      throw new Error(
        `La habilidad "${idHabilidad}" usa el tipo desconocido "${tipo}".`,
      );
    }

    validarEnteroNoNegativo(
      definicion.requisitoNivelMaestria,
      `El requisito de "${idHabilidad}"`,
    );
    if (definicion.requisitoNivelMaestria > nivelMaximoMaestria) {
      throw new Error(
        `El requisito de "${idHabilidad}" supera el nivel máximo de maestría.`,
      );
    }
    validarEnteroPositivo(
      definicion.gradoMaximo,
      `El grado máximo de "${idHabilidad}"`,
    );

    let modificadoresPorGrado = null;
    if (tipo === TIPOS_HABILIDAD.ACTIVA) {
      validarObjetoPlano(
        definicion.ejecucion,
        `la ejecución de la habilidad activa "${idHabilidad}"`,
      );
      if (definicion.modificadoresPorGrado !== undefined) {
        throw new Error(
          `La habilidad activa "${idHabilidad}" no puede declarar modificadores pasivos.`,
        );
      }
    } else {
      if (definicion.ejecucion !== undefined && definicion.ejecucion !== null) {
        throw new Error(
          `La habilidad pasiva "${idHabilidad}" no puede declarar ejecución directa.`,
        );
      }
      modificadoresPorGrado = normalizarModificadoresPasiva({
        idHabilidad,
        gradoMaximo: definicion.gradoMaximo,
        modificadoresPorGrado: definicion.modificadoresPorGrado,
      });
    }

    resultado[idHabilidad] = {
      id: idHabilidad,
      nombre: definicion.nombre.trim(),
      maestria: idMaestria,
      tipo,
      requisitoNivelMaestria: definicion.requisitoNivelMaestria,
      gradoMaximo: definicion.gradoMaximo,
      modificadoresPorGrado,
    };
  }

  return resultado;
}

function normalizarModificadoresPasiva({
  idHabilidad,
  gradoMaximo,
  modificadoresPorGrado,
}) {
  validarObjetoPlano(
    modificadoresPorGrado,
    `los modificadores de la pasiva "${idHabilidad}"`,
  );
  if (Object.keys(modificadoresPorGrado).length !== gradoMaximo) {
    throw new Error(
      `La pasiva "${idHabilidad}" debe definir exactamente ${gradoMaximo} grados de modificadores.`,
    );
  }

  const resultado = {};
  for (let grado = 1; grado <= gradoMaximo; grado += 1) {
    const lista = modificadoresPorGrado[String(grado)];
    if (!Array.isArray(lista) || lista.length === 0) {
      throw new Error(
        `La pasiva "${idHabilidad}" grado ${grado} necesita modificadores.`,
      );
    }
    resultado[grado] = lista.map((descriptor, indice) =>
      normalizarDescriptorModificador(
        {
          ...descriptor,
          id:
            descriptor?.id ??
            `pasiva:${idHabilidad}:grado:${grado}:${indice + 1}`,
          origen: descriptor?.origen ?? "pasiva",
          fuente:
            descriptor?.fuente ??
            Object.freeze({
              tipo: "pasiva",
              idHabilidad,
              grado,
            }),
        },
        { origenPredeterminado: "pasiva" },
      ),
    );
  }
  return resultado;
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
