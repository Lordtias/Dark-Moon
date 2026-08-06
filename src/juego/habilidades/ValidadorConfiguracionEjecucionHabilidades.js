import {
  TIPOS_DANIO_VALIDOS,
  normalizarTipoDanio,
} from "../combate/ComponentesDanio.js";
import {
  normalizarCatalogoEfectos,
  resolverReferenciaEfecto,
} from "../efectos/CatalogoEfectos.js";
import { normalizarConfiguracionZonaTemporal } from "../zonas/ContratosZonasTemporales.js";
import {
  ORIENTACIONES_LINEA,
  TIPOS_FORMA_IMPACTO,
} from "./GeometriaHabilidades.js";
import {
  POLITICAS_OBSTACULOS_HABILIDAD,
  validarPoliticaObstaculosHabilidad,
} from "./ResolucionEspacialHabilidades.js";

const TIPOS_OBJETIVO = Object.freeze(["enemigo", "casilla", "propio"]);
const PATRONES_PERMITIDOS = Object.freeze(["adyacente", "lineal", "libre"]);

export function validarConfiguracionEjecucionHabilidades(
  configuracionHabilidades,
  configuracionEfectos,
) {
  validarObjeto(configuracionHabilidades, "la configuración de habilidades");
  const catalogoEfectos = normalizarCatalogoEfectos(configuracionEfectos);
  validarEnteroPositivo(configuracionHabilidades.version, "la versión");
  validarObjeto(
    configuracionHabilidades.habilidades,
    "el catálogo de habilidades",
  );

  const habilidades = {};
  for (const [idOriginal, definicionOriginal] of Object.entries(
    configuracionHabilidades.habilidades,
  )) {
    const id = normalizarId(idOriginal);
    validarObjeto(definicionOriginal, `la habilidad "${id}"`);

    const gradoMaximo = definicionOriginal.gradoMaximo;
    validarEnteroPositivo(gradoMaximo, `el grado máximo de "${id}"`);
    const icono = normalizarIcono(definicionOriginal.icono, id);
    const descripcion = normalizarTextoOpcional(definicionOriginal.descripcion);
    const ejecucion = definicionOriginal.ejecucion
      ? normalizarEjecucion({
          idHabilidad: id,
          gradoMaximo,
          ejecucion: definicionOriginal.ejecucion,
          catalogoEfectos,
        })
      : null;

    habilidades[id] = {
      id,
      nombre: normalizarTexto(definicionOriginal.nombre, `nombre de "${id}"`),
      maestria: normalizarId(definicionOriginal.maestria),
      requisitoNivelMaestria: definicionOriginal.requisitoNivelMaestria,
      gradoMaximo,
      icono,
      descripcion,
      ejecucion,
    };
  }

  return congelarProfundamente({
    version: configuracionHabilidades.version,
    versionEfectos: catalogoEfectos.version,
    habilidades,
    efectos: catalogoEfectos.efectos,
  });
}

function normalizarEjecucion({
  idHabilidad,
  gradoMaximo,
  ejecucion,
  catalogoEfectos,
}) {
  validarObjeto(ejecucion, `la ejecución de "${idHabilidad}"`);
  const tipoObjetivo = normalizarId(ejecucion.tipoObjetivo);
  if (!TIPOS_OBJETIVO.includes(tipoObjetivo)) {
    throw new Error(
      `La habilidad "${idHabilidad}" usa el tipo de objetivo desconocido "${tipoObjetivo}".`,
    );
  }
  const patronAtaque = normalizarId(ejecucion.patronAtaque);
  if (!PATRONES_PERMITIDOS.includes(patronAtaque)) {
    throw new Error(
      `La habilidad "${idHabilidad}" usa el patrón desconocido "${patronAtaque}".`,
    );
  }
  if (typeof ejecucion.requiereLineaVision !== "boolean") {
    throw new Error(
      `La habilidad "${idHabilidad}" debe declarar requiereLineaVision como booleano.`,
    );
  }
  if (typeof ejecucion.hostil !== "boolean") {
    throw new Error(
      `La habilidad "${idHabilidad}" debe declarar hostil como booleano.`,
    );
  }

  validarObjeto(ejecucion.grados, `los grados de "${idHabilidad}"`);
  const grados = {};
  for (let grado = 1; grado <= gradoMaximo; grado += 1) {
    const definicionGrado = ejecucion.grados[String(grado)];
    validarObjeto(
      definicionGrado,
      `la ejecución de "${idHabilidad}" en grado ${grado}`,
    );
    validarEnteroPositivo(
      definicionGrado.costoMana,
      `el coste de Maná de "${idHabilidad}" grado ${grado}`,
    );
    validarNumeroPositivo(
      definicionGrado.costoTemporalBase,
      `el coste temporal de "${idHabilidad}" grado ${grado}`,
    );
    validarEnteroPositivo(
      definicionGrado.alcance,
      `el alcance de "${idHabilidad}" grado ${grado}`,
    );
    const formaImpacto = normalizarFormaImpacto({
      formaImpacto: definicionGrado.formaImpacto,
      idHabilidad,
      grado,
      tipoObjetivo,
    });
    const danio = normalizarDanio(definicionGrado.danio, idHabilidad, grado);
    const efectos = normalizarEfectos(
      definicionGrado.efectos,
      idHabilidad,
      grado,
      catalogoEfectos,
    );
    if (danio.length === 0 && efectos.length === 0) {
      throw new Error(
        `La habilidad "${idHabilidad}" grado ${grado} no posee daño ni efectos.`,
      );
    }
    const zonaTemporal = definicionGrado.zonaTemporal
      ? normalizarConfiguracionZonaTemporal(definicionGrado.zonaTemporal, {
          etiqueta: `la zona temporal de "${idHabilidad}" grado ${grado}`,
        })
      : null;

    grados[grado] = {
      costoMana: definicionGrado.costoMana,
      costoTemporalBase: definicionGrado.costoTemporalBase,
      alcance: definicionGrado.alcance,
      formaImpacto,
      danio,
      efectos,
      zonaTemporal,
    };
  }

  if (Object.keys(ejecucion.grados).length !== gradoMaximo) {
    throw new Error(
      `La habilidad "${idHabilidad}" debe definir exactamente ${gradoMaximo} grados jugables.`,
    );
  }
  return {
    tipoObjetivo,
    patronAtaque,
    requiereLineaVision: ejecucion.requiereLineaVision,
    hostil: ejecucion.hostil,
    grados,
  };
}

function normalizarFormaImpacto({
  formaImpacto,
  idHabilidad,
  grado,
  tipoObjetivo,
}) {
  const definicion = formaImpacto ?? { tipo: TIPOS_FORMA_IMPACTO.INDIVIDUAL };
  validarObjeto(
    definicion,
    `la forma de impacto de "${idHabilidad}" grado ${grado}`,
  );
  const tipo = normalizarId(definicion.tipo);
  if (!Object.values(TIPOS_FORMA_IMPACTO).includes(tipo)) {
    throw new Error(
      `La habilidad "${idHabilidad}" grado ${grado} usa la forma de impacto desconocida "${tipo}".`,
    );
  }

  if (tipo === TIPOS_FORMA_IMPACTO.RADIO) {
    validarEnteroPositivo(
      definicion.radio,
      `el radio de "${idHabilidad}" grado ${grado}`,
    );
    const politicaObstaculos = normalizarId(
      definicion.politicaObstaculos ??
        POLITICAS_OBSTACULOS_HABILIDAD.VISION_DESDE_CENTRO,
    );
    validarPoliticaObstaculosHabilidad(politicaObstaculos);
    return { tipo, radio: definicion.radio, politicaObstaculos };
  }

  if (tipo === TIPOS_FORMA_IMPACTO.CADENA) {
    if (tipoObjetivo !== "enemigo") {
      throw new Error(
        `La habilidad "${idHabilidad}" grado ${grado} necesita objetivo enemigo para usar cadena.`,
      );
    }
    validarEnteroPositivo(
      definicion.maximoObjetivos,
      `el máximo de objetivos de "${idHabilidad}" grado ${grado}`,
    );
    validarEnteroPositivo(
      definicion.alcanceSalto,
      `el alcance de salto de "${idHabilidad}" grado ${grado}`,
    );
    const factorDanioPorSalto = definicion.factorDanioPorSalto ?? 1;
    validarNumeroPositivo(
      factorDanioPorSalto,
      `el factor de daño por salto de "${idHabilidad}" grado ${grado}`,
    );
    if (factorDanioPorSalto > 1) {
      throw new Error(
        `El factor de daño por salto de "${idHabilidad}" grado ${grado} no puede superar 1.`,
      );
    }
    const politicaObstaculos = normalizarId(
      definicion.politicaObstaculos ??
        POLITICAS_OBSTACULOS_HABILIDAD.VISION_ENTRE_SALTOS,
    );
    validarPoliticaObstaculosHabilidad(politicaObstaculos);
    return {
      tipo,
      maximoObjetivos: definicion.maximoObjetivos,
      alcanceSalto: definicion.alcanceSalto,
      factorDanioPorSalto,
      politicaObstaculos,
    };
  }

  if (tipo === TIPOS_FORMA_IMPACTO.LINEA) {
    validarEnteroPositivo(
      definicion.longitud,
      `la longitud de "${idHabilidad}" grado ${grado}`,
    );
    const ancho = definicion.ancho ?? 1;
    validarEnteroPositivo(ancho, `el ancho de "${idHabilidad}" grado ${grado}`);
    const orientacion = normalizarId(
      definicion.orientacion ?? ORIENTACIONES_LINEA.HACIA_OBJETIVO,
    );
    if (!Object.values(ORIENTACIONES_LINEA).includes(orientacion)) {
      throw new Error(
        `La orientación "${orientacion}" de "${idHabilidad}" grado ${grado} no es válida.`,
      );
    }
    return {
      tipo,
      longitud: definicion.longitud,
      ancho,
      orientacion,
    };
  }

  return { tipo: TIPOS_FORMA_IMPACTO.INDIVIDUAL };
}

function normalizarDanio(componentes, idHabilidad, grado) {
  if (componentes === undefined) return [];
  if (!Array.isArray(componentes)) {
    throw new Error(
      `El daño de "${idHabilidad}" grado ${grado} debe ser un arreglo.`,
    );
  }
  return componentes.map((componente, indice) => {
    validarObjeto(
      componente,
      `el componente ${indice + 1} de "${idHabilidad}" grado ${grado}`,
    );
    validarEnteroNoNegativo(
      componente.valorBase,
      `el daño base de "${idHabilidad}" grado ${grado}`,
    );
    const tipo = normalizarTipoDanio(componente.tipo);
    if (!TIPOS_DANIO_VALIDOS.includes(tipo)) {
      throw new Error(
        `El daño de "${idHabilidad}" grado ${grado} usa el tipo "${tipo}" desconocido.`,
      );
    }
    return { tipo, valorBase: componente.valorBase };
  });
}

function normalizarEfectos(
  efectos,
  idHabilidad,
  grado,
  catalogoEfectos,
) {
  if (efectos === undefined) return [];
  if (!Array.isArray(efectos)) {
    throw new Error(
      `Los efectos de "${idHabilidad}" grado ${grado} deben ser un arreglo.`,
    );
  }
  return efectos.map((efecto, indice) =>
    resolverReferenciaEfecto({
      catalogo: catalogoEfectos,
      referencia: efecto,
      etiqueta: `el efecto ${indice + 1} de "${idHabilidad}" grado ${grado}`,
    }),
  );
}

function normalizarIcono(icono, idHabilidad) {
  if (icono === null || icono === undefined || icono === "") return null;
  const ruta = normalizarTexto(icono, `icono de "${idHabilidad}"`);
  if (!ruta.toLowerCase().endsWith(".png")) {
    throw new Error(`El icono de "${idHabilidad}" debe ser un archivo PNG.`);
  }
  if (ruta.includes("..") || ruta.startsWith("/") || ruta.includes(":")) {
    throw new Error(
      `El icono de "${idHabilidad}" debe usar una ruta relativa segura.`,
    );
  }
  return ruta;
}

function normalizarTextoOpcional(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  return normalizarTexto(valor, "el texto opcional");
}

function normalizarTexto(valor, etiqueta) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`Debe definirse ${etiqueta}.`);
  }
  return valor.trim();
}

function normalizarId(valor) {
  return normalizarTexto(valor, "un identificador").toLowerCase();
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

function validarEnteroNoNegativo(valor, etiqueta) {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new Error(`${etiqueta} debe ser un entero mayor o igual que 0.`);
  }
}

function validarNumeroPositivo(valor, etiqueta) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${etiqueta} debe ser un número mayor que 0.`);
  }
}

function congelarProfundamente(valor) {
  if (!valor || typeof valor !== "object" || Object.isFrozen(valor))
    return valor;
  for (const elemento of Object.values(valor)) congelarProfundamente(elemento);
  return Object.freeze(valor);
}
