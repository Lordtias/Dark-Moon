// Selecciona una plantilla utilizando los pesos
// configurados en Mapas.json.
//
// Los pesos no necesitan sumar 100.
export function seleccionarPlantillaMapa(
  configuracionMapas,
  generarAleatorio = Math.random,
) {
  const plantillas = obtenerEntradasPlantillas(configuracionMapas);

  const valorAleatorio = generarAleatorio();

  if (
    !Number.isFinite(valorAleatorio) ||
    valorAleatorio < 0 ||
    valorAleatorio >= 1
  ) {
    throw new Error(
      "El generador aleatorio debe devolver un valor entre 0 y 1.",
    );
  }

  const pesoTotal = plantillas.reduce(
    (total, [, plantilla]) => total + plantilla.pesoSeleccion,

    0,
  );

  const valorSeleccionado = valorAleatorio * pesoTotal;

  let pesoAcumulado = 0;

  for (const [idPlantilla, plantilla] of plantillas) {
    pesoAcumulado += plantilla.pesoSeleccion;

    if (valorSeleccionado < pesoAcumulado) {
      return crearResultadoPlantilla(idPlantilla, plantilla);
    }
  }

  // Protección ante posibles diferencias
  // mínimas de precisión decimal.
  const [idUltimaPlantilla, ultimaPlantilla] =
    plantillas[plantillas.length - 1];

  return crearResultadoPlantilla(idUltimaPlantilla, ultimaPlantilla);
}

// Obtiene directamente una plantilla por su ID.
//
// Esta función se utiliza principalmente para
// pruebas reproducibles mediante la URL.
export function obtenerPlantillaMapa(configuracionMapas, idPlantilla) {
  if (typeof idPlantilla !== "string" || idPlantilla.trim() === "") {
    throw new Error("Se necesita un ID válido para seleccionar un mapa.");
  }

  const plantillas = configuracionMapas?.plantillas ?? {};

  const idNormalizado = idPlantilla.trim();

  const plantilla = plantillas[idNormalizado];

  if (!plantilla) {
    const idsDisponibles = Object.keys(plantillas);

    throw new Error(
      `No existe la plantilla de mapa "${idNormalizado}". ` +
        `Mapas disponibles: ${idsDisponibles.join(", ")}.`,
    );
  }

  return crearResultadoPlantilla(idNormalizado, plantilla);
}

function obtenerEntradasPlantillas(configuracionMapas) {
  const plantillas = Object.entries(configuracionMapas?.plantillas ?? {});

  if (plantillas.length === 0) {
    throw new Error("No existen plantillas de mapa disponibles.");
  }

  return plantillas;
}

function crearResultadoPlantilla(idPlantilla, plantilla) {
  return {
    id: idPlantilla,

    ...clonarConfiguracion(plantilla),
  };
}

// Evita modificar accidentalmente los valores
// originales provenientes de Mapas.json.
function clonarConfiguracion(valor) {
  if (Array.isArray(valor)) {
    return valor.map((elemento) => clonarConfiguracion(elemento));
  }

  if (valor !== null && typeof valor === "object") {
    const copia = {};

    for (const [clave, contenido] of Object.entries(valor)) {
      copia[clave] = clonarConfiguracion(contenido);
    }

    return copia;
  }

  return valor;
}
