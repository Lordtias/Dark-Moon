import { puedeGenerarsePlantilla } from "../objetos/ReglasProgresionObjetos.js";
import {
  MARCOS_BOTIN,
  validarMarcoBotin,
} from "./ValidadorConfiguracionBotin.js";

const TIPOS_POR_MARCO = Object.freeze({
  [MARCOS_BOTIN.EQUIPAMIENTO]: Object.freeze([
    "arma",
    "armadura",
    "quiver",
    "accesorio",
  ]),
  [MARCOS_BOTIN.COMUNES]: Object.freeze(["consumible", "municion"]),
  [MARCOS_BOTIN.MATERIALES]: Object.freeze(["material"]),
  [MARCOS_BOTIN.DESECHABLES]: Object.freeze(["desechable"]),
});

export function seleccionarMarcoBotin({
  perfil,
  marcosPermitidos,
  aleatorio,
} = {}) {
  validarAleatorio(aleatorio);
  const candidatos = obtenerCandidatosMarcosBotin({ perfil, marcosPermitidos });
  return seleccionarPonderado(candidatos, aleatorio, (entrada) => entrada.peso).marco;
}

// Devuelve exactamente la misma distribución de marcos que utiliza la
// selección real. SistemaBotin también la consulta para calcular expectativas
// sin reimplementar pesos ni reglas de elegibilidad.
export function obtenerCandidatosMarcosBotin({ perfil, marcosPermitidos } = {}) {
  validarPerfil(perfil);

  if (!Array.isArray(marcosPermitidos) || marcosPermitidos.length === 0) {
    throw new Error("La selección de botín necesita al menos un marco permitido.");
  }

  const candidatos = [...new Set(marcosPermitidos)]
    .map((marcoOriginal) => {
      const marco = validarMarcoBotin(marcoOriginal);
      const peso = perfil.pesosMarcos[marco] ?? 0;

      if (!Number.isFinite(peso) || peso < 0) {
        throw new Error(`El peso del marco "${marco}" no es válido.`);
      }

      return { marco, peso };
    })
    .filter((entrada) => entrada.peso > 0);

  if (candidatos.length === 0) {
    throw new Error(
      "Los marcos permitidos no poseen peso positivo dentro del perfil de botín.",
    );
  }

  return candidatos;
}

export function obtenerCandidatosObjetosBotin({
  configuracionObjetos,
  marco,
  nivelProgreso,
  contexto = {},
} = {}) {
  validarConfiguracionObjetos(configuracionObjetos);
  const marcoNormalizado = validarMarcoBotin(marco);

  if (!Number.isInteger(nivelProgreso) || nivelProgreso < 1) {
    throw new Error("El filtro de botín necesita un nivel de progreso mayor o igual que 1.");
  }

  const tiposPermitidos = new Set(TIPOS_POR_MARCO[marcoNormalizado]);
  const idsPermitidos = new Set(contexto.idsPermitidos ?? []);
  const idsExcluidos = new Set(contexto.idsExcluidos ?? []);
  const etiquetasRequeridas = contexto.etiquetasRequeridas ?? [];
  const etiquetasExcluidas = contexto.etiquetasExcluidas ?? [];

  return Object.entries(configuracionObjetos)
    .filter(([idObjeto, plantilla]) => {
      if (!tiposPermitidos.has(plantilla.tipo)) return false;
      if (idsPermitidos.size > 0 && !idsPermitidos.has(idObjeto)) return false;
      if (idsExcluidos.has(idObjeto)) return false;
      if (!puedeGenerarsePlantilla({ plantilla, nivelProgreso })) return false;

      const etiquetas = new Set(
        Array.isArray(plantilla.etiquetasBotin) ? plantilla.etiquetasBotin : [],
      );

      if (etiquetasRequeridas.some((etiqueta) => !etiquetas.has(etiqueta))) {
        return false;
      }

      if (etiquetasExcluidas.some((etiqueta) => etiquetas.has(etiqueta))) {
        return false;
      }

      return true;
    })
    .map(([idObjeto, plantilla]) => ({
      idObjeto,
      plantilla,
      peso: obtenerPesoBotinPlantilla(plantilla),
    }));
}

export function seleccionarObjetoBotin({ candidatos, aleatorio } = {}) {
  validarAleatorio(aleatorio);

  if (!Array.isArray(candidatos) || candidatos.length === 0) {
    throw new Error("No existen candidatos válidos para seleccionar un objeto de botín.");
  }

  return seleccionarPonderado(candidatos, aleatorio, (entrada) => entrada.peso);
}

export function obtenerTiposPorMarcoBotin(marco) {
  return [...TIPOS_POR_MARCO[validarMarcoBotin(marco)]];
}

function obtenerPesoBotinPlantilla(plantilla) {
  const peso = plantilla.generacionBotin?.peso ?? 1;

  if (!Number.isFinite(peso) || peso <= 0) {
    throw new Error(
      `El peso de botín de "${plantilla.nombre ?? "objeto sin nombre"}" debe ser mayor que 0.`,
    );
  }

  return peso;
}

function seleccionarPonderado(candidatos, aleatorio, obtenerPeso) {
  const total = candidatos.reduce((suma, candidato) => suma + obtenerPeso(candidato), 0);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("La selección ponderada necesita un peso total mayor que 0.");
  }

  const objetivo = aleatorio.siguiente() * total;
  let acumulado = 0;

  for (const candidato of candidatos) {
    acumulado += obtenerPeso(candidato);
    if (objetivo < acumulado) return candidato;
  }

  return candidatos[candidatos.length - 1];
}

function validarPerfil(perfil) {
  if (perfil === null || typeof perfil !== "object" || Array.isArray(perfil)) {
    throw new Error("Se necesita un perfil de botín válido.");
  }

  if (
    perfil.pesosMarcos === null ||
    typeof perfil.pesosMarcos !== "object" ||
    Array.isArray(perfil.pesosMarcos)
  ) {
    throw new Error("El perfil de botín necesita pesos de marcos válidos.");
  }
}

function validarConfiguracionObjetos(configuracionObjetos) {
  if (
    configuracionObjetos === null ||
    typeof configuracionObjetos !== "object" ||
    Array.isArray(configuracionObjetos)
  ) {
    throw new Error("La selección de botín necesita un catálogo de objetos válido.");
  }
}

function validarAleatorio(aleatorio) {
  if (!aleatorio || typeof aleatorio.siguiente !== "function") {
    throw new Error("La selección de botín necesita un generador aleatorio válido.");
  }
}
