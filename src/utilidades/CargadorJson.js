// Carga JSON mediante fetch sin decidir cómo debe validarse su contenido.
//
// Los consumidores continúan siendo responsables de las reglas propias de
// cada catálogo o configuración. Esta utilidad unifica únicamente transporte,
// control HTTP y parseo JSON.
export async function cargarJson(
  ruta,
  descripcion = `el archivo "${ruta}"`,
  { cache } = {},
) {
  if (typeof ruta !== "string" || ruta.trim() === "") {
    throw new Error("Se necesita una ruta válida para cargar JSON.");
  }

  const opcionesFetch = cache === undefined ? undefined : { cache };
  const respuesta = await fetch(ruta, opcionesFetch);

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo cargar ${descripcion}. Código HTTP: ${respuesta.status}`,
    );
  }

  try {
    return await respuesta.json();
  } catch (error) {
    throw new Error(
      `El archivo de ${descripcion} no contiene un JSON válido. ${error.message}`,
    );
  }
}
