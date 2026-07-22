import { crearObjeto } from "../../objetos/FabricaObjetos.js";

import { crearObjetoGenerado } from "../objetos/GeneradorObjetoAleatorio.js";

import { crearGeneradorAleatorio } from "../generacion/GeneradorAleatorio.js";

// Genera el stock completo de un mercader.
//
// El stock se divide en:
//
// - Fijo: siempre reaparece con la misma cantidad.
// - Aleatorio: cambia después de iniciar una expedición.
export function generarStockMercader({
  configuracionMercader,
  configuracionObjetos,
  configuracionGeneracionObjetos,
  semilla,
  nivelReferencia = 1,
} = {}) {
  validarConfiguracionMercader(configuracionMercader);

  validarObjetoPlano(configuracionObjetos, "La configuración de objetos");

  validarObjetoPlano(
    configuracionGeneracionObjetos,
    "La configuración de generación de objetos",
  );

  validarSemilla(semilla);

  if (!Number.isInteger(nivelReferencia) || nivelReferencia < 1) {
    throw new Error("El nivel de referencia del stock debe ser mayor que 0.");
  }

  const aleatorio = crearGeneradorAleatorio(semilla);

  const configuracionStock = configuracionMercader.stock;

  const nivelObjeto = limitarNivelObjeto({
    nivelReferencia,

    configuracionNivel: configuracionStock.nivelObjeto,
  });

  // Los objetos fijos no reciben rarezas ni afijos
  // aleatorios. Siempre se reponen en la cantidad
  // establecida por la configuración.
  const objetosFijos = configuracionStock.fijo.map((definicion) =>
    crearObjeto({
      configuracionObjetos,

      idObjeto: definicion.id,

      cantidad: definicion.cantidad,

      nivelObjeto,
    }),
  );

  const candidatosSeleccionados = seleccionarCandidatosAleatorios({
    configuracionAleatoria: configuracionStock.aleatorio,

    aleatorio,
  });

  // El equipamiento aleatorio sí utiliza el sistema
  // actual de rarezas, niveles y afijos.
  const objetosAleatorios = candidatosSeleccionados.map((candidato) =>
    crearObjetoGenerado({
      configuracionObjetos,
      configuracionGeneracionObjetos,

      idObjeto: candidato.id,

      cantidad: 1,
      nivelObjeto,
      aleatorio,
    }),
  );

  const objetos = [...objetosFijos, ...objetosAleatorios];

  if (objetos.length > configuracionStock.capacidad) {
    throw new Error(
      `El stock generado para "${configuracionMercader.nombre}" ` +
        "supera su capacidad.",
    );
  }

  return {
    objetos,
    semilla: aleatorio.semilla,
    nivelObjeto,
    cantidadFija: objetosFijos.length,
    cantidadAleatoria: objetosAleatorios.length,
  };
}

function seleccionarCandidatosAleatorios({
  configuracionAleatoria,
  aleatorio,
}) {
  const seleccionados = [];

  let disponibles = configuracionAleatoria.candidatos.map((candidato) => ({
    ...candidato,
  }));

  for (let indice = 0; indice < configuracionAleatoria.cantidad; indice++) {
    if (disponibles.length === 0) {
      throw new Error(
        "No quedan candidatos para completar el stock aleatorio.",
      );
    }

    const seleccionado = seleccionarPonderado({
      candidatos: disponibles,
      aleatorio,
    });

    seleccionados.push(seleccionado);

    if (!configuracionAleatoria.permitirRepetidos) {
      disponibles = disponibles.filter(
        (candidato) => candidato.id !== seleccionado.id,
      );
    }
  }

  return seleccionados;
}

function seleccionarPonderado({ candidatos, aleatorio }) {
  const pesoTotal = candidatos.reduce(
    (total, candidato) => total + candidato.peso,

    0,
  );

  let valor = aleatorio.siguiente() * pesoTotal;

  for (const candidato of candidatos) {
    valor -= candidato.peso;

    if (valor < 0) {
      return candidato;
    }
  }

  return candidatos[candidatos.length - 1];
}

function limitarNivelObjeto({ nivelReferencia, configuracionNivel }) {
  return Math.max(
    configuracionNivel.minimo,

    Math.min(configuracionNivel.maximo, nivelReferencia),
  );
}

function validarConfiguracionMercader(configuracionMercader) {
  validarObjetoPlano(configuracionMercader, "La configuración del mercader");

  validarObjetoPlano(configuracionMercader.stock, "La configuración de stock");

  if (!Array.isArray(configuracionMercader.stock.fijo)) {
    throw new Error("El stock fijo debe ser una lista.");
  }

  validarObjetoPlano(
    configuracionMercader.stock.aleatorio,

    "La configuración del stock aleatorio",
  );

  if (!Array.isArray(configuracionMercader.stock.aleatorio.candidatos)) {
    throw new Error("Los candidatos del stock aleatorio deben ser una lista.");
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe formar un objeto válido.`);
  }
}

function validarSemilla(semilla) {
  const esEntero = Number.isInteger(semilla);

  const esTexto = typeof semilla === "string" && semilla.trim() !== "";

  if (!esEntero && !esTexto) {
    throw new Error("La generación del stock necesita una semilla válida.");
  }
}
