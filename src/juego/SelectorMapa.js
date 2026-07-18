// Selecciona una plantilla utilizando los pesos
// configurados en Mapas.json.
//
// Los pesos no necesitan sumar 100.
//
// Por ejemplo:
//
// - Alcantarilla: 1
// - Cementerio: 1
// - Especial: 1
//
// produce la misma probabilidad para los tres.
export function seleccionarPlantillaMapa(
  configuracionMapas,
  generarAleatorio = Math.random,
) {
  const plantillas = Object.entries(configuracionMapas?.plantillas ?? {});

  if (plantillas.length === 0) {
    throw new Error("No existen plantillas de mapa disponibles.");
  }

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

  let acumulado = 0;

  const valorSeleccionado = valorAleatorio * pesoTotal;

  for (const [idPlantilla, plantilla] of plantillas) {
    acumulado += plantilla.pesoSeleccion;

    if (valorSeleccionado < acumulado) {
      return {
        id: idPlantilla,

        ...clonarConfiguracion(plantilla),
      };
    }
  }

  // Protección ante posibles errores de precisión.
  const [idUltima, ultimaPlantilla] = plantillas[plantillas.length - 1];

  return {
    id: idUltima,

    ...clonarConfiguracion(ultimaPlantilla),
  };
}

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
