import { crearObjeto } from "../../objetos/FabricaObjetos.js";

import { crearObjetoGenerado } from "../objetos/GeneradorObjetoAleatorio.js";

import { crearGeneradorAleatorio } from "../generacion/GeneradorAleatorio.js";

import {
  obtenerNivelMinimoGeneracionPlantilla,
  puedeGenerarsePlantilla,
  validarPlantillaDisponible,
} from "../objetos/ReglasProgresionObjetos.js";

import { obtenerMetadatosSeleccionComercialPlantilla } from "./MetadatosComercialesObjeto.js";

// Genera el stock completo de un mercader.
//
// El stock se divide en:
//
// - Fijo:
//   Siempre reaparece con la misma cantidad.
//
// - Aleatorio:
//   Selecciona primero un grupo comercial y luego
//   una plantilla compatible dentro de ese grupo.
//
// El peso del grupo no depende de cuántos objetos
// existan dentro de él. Por eso agregar una nueva
// espada Tier I no aumenta el peso total de las
// armas Tier I ni obliga a editar Comercio.json.
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
  validarNivelReferencia(nivelReferencia);

  const aleatorio = crearGeneradorAleatorio(semilla);

  const configuracionStock = configuracionMercader.stock;

  const nivelObjeto = limitarNivelObjeto({
    nivelReferencia,
    configuracionNivel: configuracionStock.nivelObjeto,
  });

  const idsFijos = new Set();

  // Los objetos fijos no reciben rarezas
  // ni afijos aleatorios.
  //
  // Al ser una selección explícita, siguen
  // identificándose por ID, pero deben respetar
  // progresión y disponibilidad comercial.
  const objetosFijos = configuracionStock.fijo.map((definicion) => {
    const idObjeto = definicion.id.trim().toLowerCase();

    const plantilla = configuracionObjetos[idObjeto];

    if (!plantilla) {
      throw new Error(
        `El stock fijo referencia el objeto inexistente "${idObjeto}".`,
      );
    }

    validarPlantillaDisponible({
      plantilla,
      idObjeto,
      nivelProgreso: nivelReferencia,
      contexto: `El stock fijo de "${configuracionMercader.nombre}"`,
    });

    const metadatosComerciales = obtenerMetadatosSeleccionComercialPlantilla({
      plantilla,
      nombreObjeto: plantilla.nombre ?? idObjeto,
    });

    if (!metadatosComerciales.habilitado) {
      throw new Error(
        `El stock fijo de "${configuracionMercader.nombre}" ` +
          `no puede incluir "${plantilla.nombre ?? idObjeto}" ` +
          "porque no está habilitado para comercio.",
      );
    }

    idsFijos.add(idObjeto);

    return crearObjeto({
      configuracionObjetos,
      idObjeto,
      cantidad: definicion.cantidad,
      nivelObjeto,
    });
  });

  const catalogoComercial = crearCatalogoComercial({
    configuracionObjetos,
    nivelReferencia,
    idsExcluidos: idsFijos,
  });

  const gruposResueltos = resolverGruposComerciales({
    grupos: configuracionStock.aleatorio.grupos,
    catalogoDisponible: catalogoComercial.disponibles,
  });

  const candidatosSeleccionados = seleccionarObjetosAleatoriosPorGrupos({
    configuracionAleatoria: configuracionStock.aleatorio,
    gruposResueltos,
    aleatorio,
    nombreMercader: configuracionMercader.nombre,
    nivelReferencia,
  });

  // El equipamiento aleatorio sí utiliza
  // rarezas, niveles y afijos.
  const objetosAleatorios = candidatosSeleccionados.map((seleccion) =>
    crearObjetoGenerado({
      configuracionObjetos,
      configuracionGeneracionObjetos,
      idObjeto: seleccion.id,
      cantidad: 1,
      nivelObjeto,

      // El desbloqueo utiliza el
      // progreso de la expedición.
      nivelProgreso: nivelReferencia,

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
    nivelReferencia,
    cantidadFija: objetosFijos.length,
    cantidadAleatoria: objetosAleatorios.length,
    cantidadPlantillasDisponibles: catalogoComercial.disponibles.length,
    cantidadPlantillasBloqueadas: catalogoComercial.bloqueadas.length,
    idsPlantillasDisponibles: catalogoComercial.disponibles.map(
      (candidato) => candidato.id,
    ),
    idsPlantillasBloqueadas: catalogoComercial.bloqueadas.map(
      (candidato) => candidato.id,
    ),
    gruposDisponibles: gruposResueltos.map((grupo) => ({
      id: grupo.id,
      peso: grupo.peso,
      cantidadCandidatos: grupo.candidatos.length,
      idsCandidatos: grupo.candidatos.map((candidato) => candidato.id),
    })),
    seleccionesAleatorias: candidatosSeleccionados.map((seleccion) => ({
      idObjeto: seleccion.id,
      idGrupo: seleccion.idGrupo,
    })),
  };
}

// Construye automáticamente el catálogo comercial
// desde todas las plantillas existentes.
//
// Una plantilla queda disponible cuando:
//
// - Está marcada como vendible.
// - Su configuración comercio.habilitado no es false.
// - Cumple nivelMinimoGeneracion.
// - No pertenece al stock fijo de este mercader.
function crearCatalogoComercial({
  configuracionObjetos,
  nivelReferencia,
  idsExcluidos,
}) {
  const disponibles = [];
  const bloqueadas = [];

  for (const [idObjeto, plantilla] of Object.entries(configuracionObjetos)) {
    const metadatosComerciales = obtenerMetadatosSeleccionComercialPlantilla({
      plantilla,
      nombreObjeto: plantilla.nombre ?? idObjeto,
    });

    const nivelMinimoGeneracion =
      obtenerNivelMinimoGeneracionPlantilla(plantilla);

    const candidato = {
      id: idObjeto,
      plantilla,
      peso: metadatosComerciales.pesoSeleccion,
      etiquetas: metadatosComerciales.etiquetas,
      nivelMinimoGeneracion,
    };

    if (idsExcluidos.has(idObjeto)) {
      bloqueadas.push({
        ...candidato,
        motivo: "stock_fijo",
      });
      continue;
    }

    if (!metadatosComerciales.habilitado) {
      bloqueadas.push({
        ...candidato,
        motivo: "comercio_deshabilitado",
      });
      continue;
    }

    if (
      !puedeGenerarsePlantilla({
        plantilla,
        nivelProgreso: nivelReferencia,
      })
    ) {
      bloqueadas.push({
        ...candidato,
        motivo: "nivel_minimo",
      });
      continue;
    }

    disponibles.push(candidato);
  }

  return {
    disponibles,
    bloqueadas,
  };
}

// Resuelve una vez los candidatos que pertenecen
// a cada grupo comercial.
//
// Los grupos pueden filtrar por:
//
// - tipo;
// - tier;
// - familia;
// - categoría de armadura;
// - etiquetas comerciales;
// - inclusiones y exclusiones concretas.
function resolverGruposComerciales({ grupos, catalogoDisponible }) {
  return grupos.map((grupo) => ({
    id: grupo.id,
    peso: grupo.peso,
    filtros: grupo.filtros,
    candidatos: catalogoDisponible.filter((candidato) =>
      cumpleFiltrosGrupo({
        candidato,
        filtros: grupo.filtros,
      }),
    ),
  }));
}

// Realiza la selección en dos etapas:
//
// 1. Selecciona un grupo según su peso.
// 2. Selecciona una plantilla dentro del grupo
//    según comercio.pesoSeleccion.
//
// Esto evita que el peso global de una categoría
// cambie cuando se agregan nuevas plantillas.
function seleccionarObjetosAleatoriosPorGrupos({
  configuracionAleatoria,
  gruposResueltos,
  aleatorio,
  nombreMercader,
  nivelReferencia,
}) {
  const cantidadNecesaria = configuracionAleatoria.cantidad;

  const idsUnicosDisponibles = new Set(
    gruposResueltos.flatMap((grupo) =>
      grupo.candidatos.map((candidato) => candidato.id),
    ),
  );

  if (
    !configuracionAleatoria.permitirRepetidos &&
    idsUnicosDisponibles.size < cantidadNecesaria
  ) {
    throw new Error(
      `"${nombreMercader}" necesita seleccionar ` +
        `${cantidadNecesaria} objetos distintos en nivel ` +
        `${nivelReferencia}, pero los grupos solamente ofrecen ` +
        `${idsUnicosDisponibles.size} plantillas únicas.`,
    );
  }

  if (cantidadNecesaria > 0 && idsUnicosDisponibles.size === 0) {
    throw new Error(
      `"${nombreMercader}" no tiene grupos con objetos disponibles ` +
        `para el nivel ${nivelReferencia}.`,
    );
  }

  const seleccionados = [];
  const idsSeleccionados = new Set();

  for (let indice = 0; indice < cantidadNecesaria; indice++) {
    const gruposActivos = gruposResueltos
      .map((grupo) => ({
        ...grupo,
        candidatos: grupo.candidatos.filter(
          (candidato) =>
            configuracionAleatoria.permitirRepetidos ||
            !idsSeleccionados.has(candidato.id),
        ),
      }))
      .filter((grupo) => grupo.candidatos.length > 0);

    if (gruposActivos.length === 0) {
      throw new Error(
        `No quedan grupos disponibles para completar el stock de ` +
          `"${nombreMercader}".`,
      );
    }

    const grupoSeleccionado = seleccionarPonderado({
      candidatos: gruposActivos,
      aleatorio,
      descripcion: "los grupos comerciales",
    });

    const candidatoSeleccionado = seleccionarPonderado({
      candidatos: grupoSeleccionado.candidatos,
      aleatorio,
      descripcion: `el grupo "${grupoSeleccionado.id}"`,
    });

    seleccionados.push({
      ...candidatoSeleccionado,
      idGrupo: grupoSeleccionado.id,
    });

    idsSeleccionados.add(candidatoSeleccionado.id);
  }

  return seleccionados;
}

function cumpleFiltrosGrupo({ candidato, filtros }) {
  const plantilla = candidato.plantilla;

  if (!coincideValorPermitido(plantilla.tipo, filtros.tipos)) {
    return false;
  }

  if (!coincideValorPermitido(plantilla.tierBase ?? 1, filtros.tiers)) {
    return false;
  }

  if (!coincideValorPermitido(plantilla.familiaObjeto, filtros.familias)) {
    return false;
  }

  if (
    !coincideValorPermitido(
      plantilla.categoriaArmadura,
      filtros.categoriasArmadura,
    )
  ) {
    return false;
  }

  if (!coincideValorPermitido(candidato.id, filtros.idsIncluidos)) {
    return false;
  }

  if (incluyeValor(candidato.id, filtros.idsExcluidos)) {
    return false;
  }

  if (incluyeValor(plantilla.familiaObjeto, filtros.familiasExcluidas)) {
    return false;
  }

  if (
    !contieneTodasLasEtiquetas(candidato.etiquetas, filtros.etiquetasRequeridas)
  ) {
    return false;
  }

  if (contieneAlgunaEtiqueta(candidato.etiquetas, filtros.etiquetasExcluidas)) {
    return false;
  }

  return true;
}

function coincideValorPermitido(valor, permitidos) {
  return (
    !Array.isArray(permitidos) ||
    permitidos.length === 0 ||
    permitidos.includes(valor)
  );
}

function incluyeValor(valor, lista) {
  return Array.isArray(lista) && lista.includes(valor);
}

function contieneTodasLasEtiquetas(etiquetasObjeto, etiquetasRequeridas) {
  if (!Array.isArray(etiquetasRequeridas) || etiquetasRequeridas.length === 0) {
    return true;
  }

  return etiquetasRequeridas.every((etiqueta) =>
    etiquetasObjeto.includes(etiqueta),
  );
}

function contieneAlgunaEtiqueta(etiquetasObjeto, etiquetasExcluidas) {
  if (!Array.isArray(etiquetasExcluidas) || etiquetasExcluidas.length === 0) {
    return false;
  }

  return etiquetasExcluidas.some((etiqueta) =>
    etiquetasObjeto.includes(etiqueta),
  );
}

function seleccionarPonderado({ candidatos, aleatorio, descripcion }) {
  const pesoTotal = candidatos.reduce(
    (total, candidato) => total + candidato.peso,
    0,
  );

  if (!Number.isFinite(pesoTotal) || pesoTotal <= 0) {
    throw new Error(`El peso total de ${descripcion} debe ser mayor que 0.`);
  }

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

  if (!Array.isArray(configuracionMercader.stock.aleatorio.grupos)) {
    throw new Error("Los grupos del stock aleatorio deben formar una lista.");
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe formar un objeto válido.`);
  }
}

function validarNivelReferencia(nivelReferencia) {
  if (!Number.isInteger(nivelReferencia) || nivelReferencia < 1) {
    throw new Error("El nivel de referencia del stock debe ser mayor que 0.");
  }
}

function validarSemilla(semilla) {
  const esEntero = Number.isInteger(semilla);

  const esTexto = typeof semilla === "string" && semilla.trim() !== "";

  if (!esEntero && !esTexto) {
    throw new Error("La generación del stock necesita una semilla válida.");
  }
}
