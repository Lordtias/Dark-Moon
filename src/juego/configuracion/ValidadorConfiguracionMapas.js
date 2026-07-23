// Tipos de generación implementados actualmente.
//
// Agregaremos nuevos valores cuando existan
// generadores de cavernas, laberintos u otros diseños.
const TIPOS_GENERACION_VALIDOS = ["habitaciones"];

const VARIANTES_REQUERIDAS = ["normal", "enfermo", "gigante", "elite"];

const EXPRESION_COLOR_HEXADECIMAL = /^#[0-9a-f]{6}$/i;

// Valida completamente la estructura general
// de Mapas.json.
//
// Devuelve la misma configuración cuando es válida,
// permitiendo utilizarla directamente después.
export function validarConfiguracionMapas(configuracion) {
  validarObjeto(configuracion, "la configuración de mapas");

  validarObjeto(configuracion.plantillas, "las plantillas de mapas");

  const plantillas = Object.entries(configuracion.plantillas);

  if (plantillas.length === 0) {
    throw new Error("Mapas.json debe contener al menos una plantilla.");
  }

  for (const [idPlantilla, plantilla] of plantillas) {
    validarPlantilla(idPlantilla, plantilla);
  }

  return configuracion;
}

function validarPlantilla(idPlantilla, plantilla) {
  validarTexto(idPlantilla, "id de plantilla");

  validarObjeto(plantilla, `la plantilla "${idPlantilla}"`);

  validarTexto(plantilla.nombre, `el nombre de "${idPlantilla}"`);

  validarTexto(plantilla.descripcion, `la descripción de "${idPlantilla}"`);

  validarTexto(plantilla.bioma, `el bioma de "${idPlantilla}"`);

  validarTexto(
    plantilla.recursoVisual,
    `el recurso visual de "${idPlantilla}"`,
  );

  validarRutaRecursoVisual({
    ruta: plantilla.recursoVisual,

    idPlantilla,
  });

  validarEnteroMinimo(
    plantilla.nivelDesbloqueo,
    1,
    `el nivel de desbloqueo de "${idPlantilla}"`,
  );

  validarNumeroMayorQueCero(
    plantilla.pesoSeleccion,
    `el peso de selección de "${idPlantilla}"`,
  );

  validarApariencia(idPlantilla, plantilla.apariencia);

  validarDimensiones(idPlantilla, plantilla.dimensiones);

  validarRangoEntero({
    rango: plantilla.niveles,

    descripcion: `los niveles de "${idPlantilla}"`,

    minimoPermitido: 1,
  });

  validarCoherenciaNiveles({
    idPlantilla,

    nivelDesbloqueo: plantilla.nivelDesbloqueo,

    niveles: plantilla.niveles,
  });

  validarGeneracion(idPlantilla, plantilla.generacion);

  validarEnemigos(idPlantilla, plantilla.enemigos);

  validarDestructibles(idPlantilla, plantilla.destructibles);
}

function validarRutaRecursoVisual({ ruta, idPlantilla }) {
  const rutaNormalizada = ruta.trim();

  if (
    rutaNormalizada.startsWith("/") ||
    rutaNormalizada.includes("..") ||
    !/\.(png|jpg|jpeg|webp)$/i.test(rutaNormalizada)
  ) {
    throw new Error(
      `El recurso visual de "${idPlantilla}" debe ser una ruta relativa ` +
        "a una imagen PNG, JPG, JPEG o WEBP.",
    );
  }
}

function validarApariencia(idPlantilla, apariencia) {
  validarObjeto(apariencia, `la apariencia de "${idPlantilla}"`);

  const colores = ["colorSuelo", "colorPared", "colorGrilla"];

  for (const nombreColor of colores) {
    const valor = apariencia[nombreColor];

    if (typeof valor !== "string" || !EXPRESION_COLOR_HEXADECIMAL.test(valor)) {
      throw new Error(
        `"${nombreColor}" de "${idPlantilla}" ` +
          "debe ser un color hexadecimal como #26372f.",
      );
    }
  }
}

function validarDimensiones(idPlantilla, dimensiones) {
  validarObjeto(dimensiones, `las dimensiones de "${idPlantilla}"`);

  validarRangoEntero({
    rango: dimensiones.ancho,

    descripcion: `el ancho de "${idPlantilla}"`,

    minimoPermitido: 8,
  });

  validarRangoEntero({
    rango: dimensiones.alto,

    descripcion: `el alto de "${idPlantilla}"`,

    minimoPermitido: 8,
  });
}

function validarCoherenciaNiveles({ idPlantilla, nivelDesbloqueo, niveles }) {
  if (nivelDesbloqueo < niveles.minimo) {
    throw new Error(
      `El nivel de desbloqueo de "${idPlantilla}" no puede ser ` +
        `menor que su nivel de expedición mínimo (${niveles.minimo}).`,
    );
  }

  if (nivelDesbloqueo > niveles.maximo) {
    throw new Error(
      `El nivel de desbloqueo de "${idPlantilla}" no puede superar ` +
        `su nivel de expedición máximo (${niveles.maximo}).`,
    );
  }
}

function validarGeneracion(idPlantilla, generacion) {
  validarObjeto(generacion, `la generación de "${idPlantilla}"`);

  if (!TIPOS_GENERACION_VALIDOS.includes(generacion.tipo)) {
    throw new Error(
      `El tipo de generación de "${idPlantilla}" debe ser: ` +
        `${TIPOS_GENERACION_VALIDOS.join(", ")}.`,
    );
  }

  validarRangoPorcentaje(
    generacion.porcentajeNoCaminable,

    `el porcentaje no caminable de "${idPlantilla}"`,
  );

  validarPorcentaje(
    generacion.porcentajeMinimoConectado,

    `el porcentaje conectado de "${idPlantilla}"`,
  );

  validarEnteroMinimo(
    generacion.intentosMaximos,
    1,
    `los intentos máximos de "${idPlantilla}"`,
  );
}

function validarEnemigos(idPlantilla, enemigos) {
  validarObjeto(enemigos, `los enemigos de "${idPlantilla}"`);

  validarRangoEntero({
    rango: enemigos.cantidad,

    descripcion: `la cantidad de enemigos de "${idPlantilla}"`,

    minimoPermitido: 0,
  });

  validarEnteroMinimo(
    enemigos.distanciaSeguraJugador,
    0,
    `la distancia segura de "${idPlantilla}"`,
  );

  validarEnteroMinimo(
    enemigos.distanciaMinimaEntreEnemigos,
    0,
    `la distancia entre enemigos de "${idPlantilla}"`,
  );

  validarListaPonderada(
    enemigos.permitidos,
    `los enemigos permitidos de "${idPlantilla}"`,
  );

  validarProbabilidadesVariantes(idPlantilla, enemigos.probabilidadesVariantes);
}

function validarDestructibles(idPlantilla, destructibles) {
  validarObjeto(destructibles, `los destructibles de "${idPlantilla}"`);

  validarRangoPorcentaje(
    destructibles.porcentajeCasillasCaminables,

    `el porcentaje de destructibles de "${idPlantilla}"`,
  );

  validarListaPonderada(
    destructibles.permitidos,
    `los destructibles permitidos de "${idPlantilla}"`,
  );
}

function validarListaPonderada(lista, descripcion) {
  if (!Array.isArray(lista) || lista.length === 0) {
    throw new Error(`${descripcion} debe contener al menos un elemento.`);
  }

  for (const elemento of lista) {
    validarObjeto(elemento, descripcion);

    validarTexto(elemento.id, `un id dentro de ${descripcion}`);

    validarNumeroMayorQueCero(elemento.peso, `el peso de "${elemento.id}"`);
  }
}

function validarProbabilidadesVariantes(idPlantilla, probabilidades) {
  validarObjeto(
    probabilidades,
    `las probabilidades de variantes de "${idPlantilla}"`,
  );

  let total = 0;

  for (const variante of VARIANTES_REQUERIDAS) {
    const probabilidad = probabilidades[variante];

    validarPorcentaje(
      probabilidad,
      `la probabilidad "${variante}" de "${idPlantilla}"`,
    );

    total += probabilidad;
  }

  if (total !== 100) {
    throw new Error(
      `Las probabilidades de variantes de "${idPlantilla}" ` +
        `deben sumar 100. Actualmente suman ${total}.`,
    );
  }
}

function validarRangoPorcentaje(rango, descripcion) {
  validarRangoEntero({
    rango,
    descripcion,
    minimoPermitido: 0,
    maximoPermitido: 100,
  });
}

function validarRangoEntero({
  rango,
  descripcion,
  minimoPermitido,
  maximoPermitido = null,
}) {
  validarObjeto(rango, descripcion);

  validarEnteroMinimo(rango.minimo, minimoPermitido, `${descripcion}.minimo`);

  validarEnteroMinimo(rango.maximo, minimoPermitido, `${descripcion}.maximo`);

  if (
    maximoPermitido !== null &&
    (rango.minimo > maximoPermitido || rango.maximo > maximoPermitido)
  ) {
    throw new Error(`${descripcion} no puede superar ${maximoPermitido}.`);
  }

  if (rango.maximo < rango.minimo) {
    throw new Error(
      `El máximo de ${descripcion} no puede ser menor que el mínimo.`,
    );
  }
}

function validarPorcentaje(valor, descripcion) {
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
    throw new Error(`${descripcion} debe estar entre 0 y 100.`);
  }
}

function validarEnteroMinimo(valor, minimo, descripcion) {
  if (!Number.isInteger(valor) || valor < minimo) {
    throw new Error(
      `${descripcion} debe ser un entero igual o mayor que ${minimo}.`,
    );
  }
}

function validarNumeroMayorQueCero(valor, descripcion) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser mayor que 0.`);
  }
}

function validarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe ser un texto válido.`);
  }
}

function validarObjeto(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}
