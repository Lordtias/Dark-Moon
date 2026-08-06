import { normalizarTipoDanio } from "../combate/ComponentesDanio.js";
import {
  FACTORES_TEMPORALES_MODIFICABLES,
  POLITICAS_ACUMULACION_VALIDAS,
  TIPOS_EFECTO_TEMPORAL,
  TIPOS_EFECTO_TEMPORAL_VALIDOS,
} from "./ContratosEfectosTemporales.js";

export const MODOS_RESISTENCIA_EFECTO = Object.freeze({
  NINGUNA: "ninguna",
  REDUCIR_PROBABILIDAD_APLICACION: "reducir_probabilidad_aplicacion",
  REDUCIR_DURACION: "reducir_duracion",
  REDUCIR_DANIO: "reducir_danio",
});

export const POLITICAS_POTENCIA_EFECTO = Object.freeze({
  REEMPLAZAR: "reemplazar",
  CONSERVAR_MAYOR: "conservar_mayor",
});

const MODOS_RESISTENCIA_VALIDOS = Object.freeze(
  Object.values(MODOS_RESISTENCIA_EFECTO),
);
const POLITICAS_POTENCIA_VALIDAS = Object.freeze(
  Object.values(POLITICAS_POTENCIA_EFECTO),
);

export function normalizarCatalogoEfectos(configuracion) {
  validarObjeto(configuracion, "la configuración de efectos");
  validarEnteroPositivo(configuracion.version, "la versión de efectos");
  validarObjeto(configuracion.efectos, "el catálogo de efectos");

  const efectos = {};
  for (const [idOriginal, definicionOriginal] of Object.entries(
    configuracion.efectos,
  )) {
    const id = normalizarId(idOriginal);
    efectos[id] = normalizarDefinicionCatalogo({
      id,
      definicion: definicionOriginal,
    });
  }

  if (Object.keys(efectos).length === 0) {
    throw new Error("El catálogo de efectos no puede estar vacío.");
  }

  for (const efecto of Object.values(efectos)) {
    for (const efectoEliminadoId of efecto.eliminaEfectosAlAplicarse) {
      if (efectoEliminadoId === efecto.id) {
        throw new Error(
          `El efecto "${efecto.id}" no puede eliminarse a sí mismo al aplicarse.`,
        );
      }
      if (!efectos[efectoEliminadoId]) {
        throw new Error(
          `El efecto "${efecto.id}" intenta eliminar el efecto desconocido ` +
            `"${efectoEliminadoId}".`,
        );
      }
    }
  }

  return congelarProfundamente({
    version: configuracion.version,
    efectos,
  });
}

export function resolverReferenciaEfecto({
  catalogo,
  referencia,
  etiqueta = "el efecto",
} = {}) {
  if (!catalogo?.efectos) {
    throw new Error("No se cargó el catálogo canónico de efectos.");
  }
  validarObjeto(referencia, etiqueta);

  const efectoId = normalizarId(referencia.efectoId);
  const efecto = catalogo.efectos[efectoId];
  if (!efecto) {
    throw new Error(`${etiqueta} referencia el efecto desconocido "${efectoId}".`);
  }

  const perfilAplicacion = normalizarId(referencia.perfilAplicacion);
  const perfil = efecto.perfilesAplicacion[perfilAplicacion];
  if (!perfil) {
    throw new Error(
      `${etiqueta} usa el perfil desconocido "${perfilAplicacion}" ` +
        `para el efecto "${efectoId}".`,
    );
  }

  validarEnteroPositivo(referencia.duracion, `la duración de ${etiqueta}`);
  const probabilidadBase = referencia.probabilidadBase ?? 100;
  validarPorcentaje(probabilidadBase, `la probabilidad base de ${etiqueta}`);

  const maximo = referencia.maximo ?? perfil.maximoPredeterminado;
  const incremento = referencia.incremento ?? perfil.incrementoPredeterminado;
  validarNumeroPositivo(maximo, `el máximo de ${etiqueta}`);
  validarNumeroPositivo(incremento, `el incremento de ${etiqueta}`);

  const magnitud = normalizarMagnitudReferencia({
    referencia,
    tipo: efecto.tipo,
    etiqueta,
  });

  return {
    id: efectoId,
    efectoId,
    nombreEfecto: efecto.nombre,
    perfilAplicacion,
    tipo: efecto.tipo,
    grupoAcumulacion: efecto.grupoAcumulacion,
    duracion: referencia.duracion,
    probabilidadBase,
    politicaAcumulacion: perfil.politicaAcumulacion,
    politicaPotencia: perfil.politicaPotencia,
    maximo,
    incremento,
    resistenciaId: efecto.resistencia.id,
    modoResistencia: efecto.resistencia.modo,
    inmunidadId: efecto.inmunidadId,
    eliminarAlAdquirirInmunidad: efecto.eliminarAlAdquirirInmunidad,
    eliminaEfectosAlAplicarse: [...efecto.eliminaEfectosAlAplicarse],
    etiquetas: [...efecto.etiquetas, ...normalizarEtiquetas(referencia.etiquetas)],
    beneficioso: efecto.beneficioso,
    ...magnitud,
  };
}

function normalizarDefinicionCatalogo({ id, definicion }) {
  validarObjeto(definicion, `el efecto "${id}"`);
  const tipo = normalizarId(definicion.tipo);
  if (!TIPOS_EFECTO_TEMPORAL_VALIDOS.includes(tipo)) {
    throw new Error(`El efecto "${id}" usa el tipo desconocido "${tipo}".`);
  }

  const resistencia = normalizarResistenciaCatalogo(
    definicion.resistencia,
    id,
  );
  const inmunidadId = normalizarIdOpcional(definicion.inmunidadId);
  if (
    resistencia.modo ===
      MODOS_RESISTENCIA_EFECTO.REDUCIR_PROBABILIDAD_APLICACION &&
    resistencia.id === null
  ) {
    throw new Error(
      `El efecto "${id}" necesita una resistencia para reducir su probabilidad.`,
    );
  }

  validarObjeto(
    definicion.perfilesAplicacion,
    `los perfiles del efecto "${id}"`,
  );
  const perfilesAplicacion = {};
  for (const [idPerfilOriginal, perfilOriginal] of Object.entries(
    definicion.perfilesAplicacion,
  )) {
    const idPerfil = normalizarId(idPerfilOriginal);
    validarObjeto(perfilOriginal, `el perfil "${idPerfil}" de "${id}"`);
    const politicaAcumulacion = normalizarId(
      perfilOriginal.politicaAcumulacion,
    );
    if (!POLITICAS_ACUMULACION_VALIDAS.includes(politicaAcumulacion)) {
      throw new Error(
        `El perfil "${idPerfil}" de "${id}" usa la acumulación desconocida ` +
          `"${politicaAcumulacion}".`,
      );
    }
    const politicaPotencia = normalizarId(
      perfilOriginal.politicaPotencia ??
        POLITICAS_POTENCIA_EFECTO.REEMPLAZAR,
    );
    if (!POLITICAS_POTENCIA_VALIDAS.includes(politicaPotencia)) {
      throw new Error(
        `El perfil "${idPerfil}" de "${id}" usa la política de potencia ` +
          `desconocida "${politicaPotencia}".`,
      );
    }
    const maximoPredeterminado = perfilOriginal.maximoPredeterminado ?? 1;
    const incrementoPredeterminado =
      perfilOriginal.incrementoPredeterminado ?? 1;
    validarNumeroPositivo(
      maximoPredeterminado,
      `el máximo del perfil "${idPerfil}"`,
    );
    validarNumeroPositivo(
      incrementoPredeterminado,
      `el incremento del perfil "${idPerfil}"`,
    );
    perfilesAplicacion[idPerfil] = {
      id: idPerfil,
      politicaAcumulacion,
      politicaPotencia,
      maximoPredeterminado,
      incrementoPredeterminado,
    };
  }

  if (Object.keys(perfilesAplicacion).length === 0) {
    throw new Error(`El efecto "${id}" necesita al menos un perfil.`);
  }

  return {
    id,
    nombre: normalizarTexto(definicion.nombre, `el nombre de "${id}"`),
    tipo,
    grupoAcumulacion: normalizarId(definicion.grupoAcumulacion ?? id),
    etiquetas: normalizarEtiquetas(definicion.etiquetas),
    beneficioso: definicion.beneficioso === true,
    resistencia,
    inmunidadId,
    eliminarAlAdquirirInmunidad:
      definicion.eliminarAlAdquirirInmunidad === true,
    eliminaEfectosAlAplicarse: normalizarEtiquetas(
      definicion.eliminaEfectosAlAplicarse,
    ),
    perfilesAplicacion,
  };
}

function normalizarResistenciaCatalogo(resistencia, idEfecto) {
  const recibida = resistencia ?? {
    id: null,
    modo: MODOS_RESISTENCIA_EFECTO.NINGUNA,
  };
  validarObjeto(recibida, `la resistencia del efecto "${idEfecto}"`);
  const modo = normalizarId(
    recibida.modo ?? MODOS_RESISTENCIA_EFECTO.NINGUNA,
  );
  if (!MODOS_RESISTENCIA_VALIDOS.includes(modo)) {
    throw new Error(
      `El efecto "${idEfecto}" usa el modo de resistencia desconocido ` +
        `"${modo}".`,
    );
  }
  return {
    id: normalizarIdOpcional(recibida.id),
    modo,
  };
}

function normalizarMagnitudReferencia({ referencia, tipo, etiqueta }) {
  if (tipo === TIPOS_EFECTO_TEMPORAL.DANIO_PERIODICO) {
    validarNumeroPositivo(referencia.valorBase, `el daño periódico de ${etiqueta}`);
    validarEnteroPositivo(referencia.intervalo, `el intervalo de ${etiqueta}`);
    if (referencia.intervalo > referencia.duracion) {
      throw new Error(`El intervalo de ${etiqueta} no puede superar su duración.`);
    }
    return {
      valorBase: referencia.valorBase,
      tipoDanio: normalizarTipoDanio(referencia.tipoDanio),
      intervalo: referencia.intervalo,
    };
  }

  if (tipo === TIPOS_EFECTO_TEMPORAL.MODIFICADOR_FACTOR) {
    validarObjeto(referencia.valor, `el valor de ${etiqueta}`);
    const valor = {};
    for (const [factor, multiplicador] of Object.entries(referencia.valor)) {
      if (!FACTORES_TEMPORALES_MODIFICABLES.includes(factor)) {
        throw new Error(
          `${etiqueta} intenta modificar el factor desconocido "${factor}".`,
        );
      }
      validarNumeroPositivo(
        multiplicador,
        `el multiplicador ${factor} de ${etiqueta}`,
      );
      valor[factor] = multiplicador;
    }
    if (Object.keys(valor).length === 0) {
      throw new Error(`${etiqueta} debe modificar al menos un factor.`);
    }
    return { valor, intervalo: null };
  }

  const valorBase = referencia.valorBase ?? 1;
  validarNumeroPositivo(valorBase, `el valor de ${etiqueta}`);
  return { valorBase, intervalo: null };
}

function normalizarEtiquetas(etiquetas = []) {
  if (!Array.isArray(etiquetas)) {
    throw new Error("Las etiquetas de efecto deben estar dentro de una lista.");
  }
  return [...new Set(etiquetas.map((etiqueta) => normalizarId(etiqueta)))];
}

function normalizarIdOpcional(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  return normalizarId(valor);
}

function normalizarId(valor) {
  return normalizarTexto(valor, "un identificador").toLowerCase();
}

function normalizarTexto(valor, etiqueta) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`Debe definirse ${etiqueta}.`);
  }
  return valor.trim();
}

function validarObjeto(valor, etiqueta) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Debe definirse ${etiqueta} como un objeto.`);
  }
}

function validarEnteroPositivo(valor, etiqueta) {
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`${etiqueta} debe ser un entero mayor que 0.`);
  }
}

function validarNumeroPositivo(valor, etiqueta) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${etiqueta} debe ser un número mayor que 0.`);
  }
}

function validarPorcentaje(valor, etiqueta) {
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
    throw new Error(`${etiqueta} debe estar entre 0 y 100.`);
  }
}

function congelarProfundamente(valor) {
  if (!valor || typeof valor !== "object" || Object.isFrozen(valor)) {
    return valor;
  }
  for (const elemento of Object.values(valor)) {
    congelarProfundamente(elemento);
  }
  return Object.freeze(valor);
}
