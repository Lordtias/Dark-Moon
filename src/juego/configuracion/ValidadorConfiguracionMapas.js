import { validarEstructuraSolicitudBotin } from "../botin/ContratoBotin.js";

const TIPOS_GENERACION_VALIDOS = ["habitaciones"];

const VARIANTES_REQUERIDAS = ["normal", "enfermo", "gigante", "elite"];


const EXPRESION_COLOR_HEXADECIMAL = /^#[0-9a-f]{6}$/i;

// Valida el contrato combinado de las configuraciones canónicas de mapas.
// Cada mazmorra puede vivir en su propio JSON sin cambiar este contrato.
//
// Además de las reglas de terreno y acceso,
// comprueba la separación entre:
//
// - Enemigos recurrentes.
// - Encuentros especiales opcionales.
// - Jefes obligatorios.
//
// Un mismo enemigo no puede participar en más
// de una de estas poblaciones dentro del mismo mapa.
export function validarConfiguracionMapas(configuracion) {
  validarObjeto(configuracion, "la configuración de mapas");

  validarObjeto(configuracion.plantillas, "las plantillas de mapas");

  const plantillas = Object.entries(configuracion.plantillas);

  if (plantillas.length === 0) {
    throw new Error("La configuración de mapas debe contener al menos una plantilla.");
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

  validarGeneracion(idPlantilla, plantilla.generacion, plantilla.dimensiones);

  validarPoblacion(idPlantilla, plantilla.poblacion);

  const idsRecurrentes = validarEnemigos(idPlantilla, plantilla.enemigos);

  const idsEspeciales = validarEncuentroEspecial({
    idPlantilla,
    encuentroEspecial: plantilla.encuentroEspecial,
    idsExcluidos: idsRecurrentes,
  });

  validarJefe({
    idPlantilla,
    jefe: plantilla.jefe,
    idsExcluidos: unirConjuntos(idsRecurrentes, idsEspeciales),
  });

  validarInteractuables(idPlantilla, plantilla.interactuables);
  validarHabitaciones({
    idPlantilla,
    habitaciones: plantilla.habitaciones,
    generacion: plantilla.generacion,
    destructibles: plantilla.interactuables.destructibles,
  });
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

function validarGeneracion(idPlantilla, generacion, dimensiones) {
  validarObjeto(generacion, `la generación de "${idPlantilla}"`);

  if (!TIPOS_GENERACION_VALIDOS.includes(generacion.tipo)) {
    throw new Error(
      `El tipo de generación de "${idPlantilla}" debe ser: ` +
        `${TIPOS_GENERACION_VALIDOS.join(", ")}.`,
    );
  }

  validarObjeto(generacion.sectores, `los sectores de "${idPlantilla}"`);

  validarRangoEntero({
    rango: generacion.sectores.cantidad,
    descripcion: `la cantidad de sectores de "${idPlantilla}"`,
    minimoPermitido: 2,
  });

  validarRangoEntero({
    rango: generacion.sectores.separacion,
    descripcion: `la separación de sectores de "${idPlantilla}"`,
    minimoPermitido: 0,
  });

  validarObjeto(
    generacion.habitaciones,
    `las habitaciones de "${idPlantilla}"`,
  );

  validarRangoEntero({
    rango: generacion.habitaciones.ancho,
    descripcion: `el ancho de habitación de "${idPlantilla}"`,
    minimoPermitido: 3,
  });

  validarRangoEntero({
    rango: generacion.habitaciones.alto,
    descripcion: `el alto de habitación de "${idPlantilla}"`,
    minimoPermitido: 3,
  });

  if (generacion.habitaciones.ancho.maximo > dimensiones.ancho.minimo - 2) {
    throw new Error(
      `El ancho máximo de habitación de "${idPlantilla}" no cabe ` +
        "dentro del ancho mínimo del mapa.",
    );
  }

  if (generacion.habitaciones.alto.maximo > dimensiones.alto.minimo - 2) {
    throw new Error(
      `El alto máximo de habitación de "${idPlantilla}" no cabe ` +
        "dentro del alto mínimo del mapa.",
    );
  }

  validarObjeto(generacion.pasillos, `los pasillos de "${idPlantilla}"`);

  validarEnteroMinimo(
    generacion.pasillos.ancho,
    1,
    `el ancho de pasillo de "${idPlantilla}"`,
  );

  if (generacion.pasillos.ancho > 3) {
    throw new Error(
      `El ancho de pasillo de "${idPlantilla}" no puede superar 3 casillas.`,
    );
  }

  validarRangoEntero({
    rango: generacion.pasillos.conexionesExtra,
    descripcion: `las conexiones extra de "${idPlantilla}"`,
    minimoPermitido: 0,
  });

  const maximoConexionesPosibles =
    (generacion.sectores.cantidad.minimo *
      (generacion.sectores.cantidad.minimo - 1)) /
    2;
  const conexionesPrincipalesNecesarias =
    generacion.sectores.cantidad.minimo - 1;

  const maximoConexionesExtraDisponibles =
    maximoConexionesPosibles - conexionesPrincipalesNecesarias;

  if (
    generacion.pasillos.conexionesExtra.maximo >
    maximoConexionesExtraDisponibles
  ) {
    throw new Error(
      `Las conexiones extra máximas de "${idPlantilla}" superan ` +
        "las conexiones disponibles para su cantidad mínima de sectores.",
    );
  }

  validarEnteroMinimo(
    generacion.intentosMaximos,
    1,
    `los intentos máximos de "${idPlantilla}"`,
  );
}

function validarPoblacion(idPlantilla, poblacion) {
  validarObjeto(poblacion, `la población de "${idPlantilla}"`);

  validarObjeto(
    poblacion.presupuestoHabitacion,
    `el presupuesto por habitación de "${idPlantilla}"`,
  );

  for (const dimension of ["ocupacion", "amenaza", "valorRecompensa"]) {
    const regla = poblacion.presupuestoHabitacion[dimension];
    validarObjeto(
      regla,
      `el presupuesto de ${dimension} de "${idPlantilla}"`,
    );
    validarNumeroMayorQueCero(
      regla.por100Casillas,
      `el presupuesto de ${dimension} por 100 casillas de "${idPlantilla}"`,
    );
    if (!Number.isFinite(regla.minimo) || regla.minimo < 0) {
      throw new Error(
        `El mínimo de presupuesto de ${dimension} de "${idPlantilla}" debe ser un número no negativo.`,
      );
    }
    if (
      regla.maximo !== undefined &&
      (!Number.isFinite(regla.maximo) || regla.maximo < regla.minimo)
    ) {
      throw new Error(
        `El máximo de presupuesto de ${dimension} de "${idPlantilla}" debe ser un número igual o mayor que su mínimo.`,
      );
    }
  }

  validarNumeroMayorQueCero(
    poblacion.multiplicadorHabitacionEspecial,
    `el multiplicador de la habitación especial de "${idPlantilla}"`,
  );

  if (
    poblacion.habitacionesAmbientales !== undefined ||
    poblacion.perfilesHabitacion !== undefined
  ) {
    throw new Error(
      `La configuración de habitaciones de "${idPlantilla}" debe declararse en la sección canónica "habitaciones".`,
    );
  }
}

const ORIENTACIONES_COMPOSICION = new Set(["horizontal", "vertical"]);
const SIMBOLO_VACIO_COMPOSICION = ".";
const SIMBOLO_OPCIONAL_COMPOSICION = "?";

function validarHabitaciones({
  idPlantilla,
  habitaciones,
  generacion,
  destructibles,
}) {
  validarObjeto(habitaciones, `las habitaciones de "${idPlantilla}"`);
  validarRangoEntero({
    rango: habitaciones.ambientales,
    descripcion: `las habitaciones ambientales de "${idPlantilla}"`,
    minimoPermitido: 1,
    maximoPermitido: 3,
  });

  const cantidadMinimaSectores = generacion.sectores.cantidad.minimo;
  if (habitaciones.ambientales.maximo > cantidadMinimaSectores - 2) {
    throw new Error(
      `La reserva ambiental máxima de "${idPlantilla}" debe dejar al menos una habitación de entrada y una habitación especial.`,
    );
  }

  if (habitaciones.perfiles === undefined) {
    throw new Error(
      `"${idPlantilla}" debe declarar perfiles canónicos por cupos y composiciones.`,
    );
  }

  validarObjeto(
    habitaciones.perfiles,
    `los perfiles dirigidos de "${idPlantilla}"`,
  );
  if (habitaciones.perfiles.estrategia !== "cupos") {
    throw new Error(
      `La estrategia de perfiles de "${idPlantilla}" debe ser "cupos".`,
    );
  }

  validarPerfilFijo({
    idPlantilla,
    perfil: habitaciones.perfilAmbiental,
    descripcion: "ambiental",
    destructibles,
    dimensionesHabitacion: generacion.habitaciones,
    permitirVacio: true,
  });
  validarPerfilFijo({
    idPlantilla,
    perfil: habitaciones.perfilEspecial,
    descripcion: "especial",
    destructibles,
    dimensionesHabitacion: generacion.habitaciones,
    permitirVacio: false,
  });

  const normales = habitaciones.perfiles.normales;
  if (!Array.isArray(normales) || normales.length === 0) {
    throw new Error(
      `Los perfiles normales de "${idPlantilla}" deben contener al menos un perfil.`,
    );
  }

  const ids = new Set([
    habitaciones.perfilAmbiental.id.trim(),
    habitaciones.perfilEspecial.id.trim(),
  ]);
  let sumaMinimos = 0;
  let sumaMaximos = 0;

  for (const perfil of normales) {
    validarObjeto(perfil, `un perfil normal de "${idPlantilla}"`);
    validarTexto(perfil.id, `el ID de un perfil normal de "${idPlantilla}"`);
    validarRangoEntero({
      rango: perfil.cupo,
      descripcion: `el cupo del perfil "${perfil.id}" de "${idPlantilla}"`,
      minimoPermitido: 0,
    });
    validarNumeroMayorQueCero(
      perfil.pesoRestante,
      `el peso restante del perfil "${perfil.id}" de "${idPlantilla}"`,
    );
    if (perfil.cupo.maximo < perfil.cupo.minimo) {
      throw new Error(
        `El máximo del perfil "${perfil.id}" de "${idPlantilla}" no puede ser menor que su mínimo.`,
      );
    }

    const id = perfil.id.trim();
    if (ids.has(id)) {
      throw new Error(
        `El perfil de habitación "${id}" está repetido en "${idPlantilla}".`,
      );
    }
    ids.add(id);
    sumaMinimos += perfil.cupo.minimo;
    sumaMaximos += perfil.cupo.maximo;

    validarComposicionesPerfil({
      idPlantilla,
      idPerfil: id,
      composiciones: perfil.composiciones,
      destructibles,
      dimensionesHabitacion: generacion.habitaciones,
      permitirVacio: false,
    });
  }

  const normalesMinimosPosibles =
    generacion.sectores.cantidad.minimo - 2 - habitaciones.ambientales.maximo;
  const normalesMaximosPosibles =
    generacion.sectores.cantidad.maximo - 2 - habitaciones.ambientales.minimo;

  if (sumaMinimos > normalesMinimosPosibles) {
    throw new Error(
      `Los mínimos de perfiles de "${idPlantilla}" requieren ${sumaMinimos} habitaciones normales, pero el mapa puede generar solo ${normalesMinimosPosibles}.`,
    );
  }
  if (sumaMaximos < normalesMaximosPosibles) {
    throw new Error(
      `Los máximos de perfiles de "${idPlantilla}" cubren ${sumaMaximos} habitaciones normales, pero el mapa puede generar ${normalesMaximosPosibles}.`,
    );
  }
}

function validarPerfilFijo({
  idPlantilla,
  perfil,
  descripcion,
  destructibles,
  dimensionesHabitacion,
  permitirVacio,
}) {
  validarObjeto(perfil, `el perfil ${descripcion} de "${idPlantilla}"`);
  validarTexto(perfil.id, `el ID del perfil ${descripcion} de "${idPlantilla}"`);
  validarComposicionesPerfil({
    idPlantilla,
    idPerfil: perfil.id,
    composiciones: perfil.composiciones,
    destructibles,
    dimensionesHabitacion,
    permitirVacio,
  });
}

function validarComposicionesPerfil({
  idPlantilla,
  idPerfil,
  composiciones,
  destructibles,
  dimensionesHabitacion,
  permitirVacio,
}) {
  if (!Array.isArray(composiciones) || composiciones.length < 2) {
    throw new Error(
      `El perfil "${idPerfil}" de "${idPlantilla}" debe definir al menos una composición horizontal y una vertical.`,
    );
  }

  const idsComposiciones = new Set();
  const orientaciones = new Set();
  const dimensionesComposiciones = [];
  const idsDestructibles = new Set(
    (destructibles.permitidos ?? []).map(({ id }) => id),
  );

  for (const composicion of composiciones) {
    validarObjeto(
      composicion,
      `una composición del perfil "${idPerfil}" de "${idPlantilla}"`,
    );
    validarTexto(
      composicion.id,
      `el ID de una composición del perfil "${idPerfil}" de "${idPlantilla}"`,
    );
    if (idsComposiciones.has(composicion.id)) {
      throw new Error(
        `La composición "${composicion.id}" está repetida en el perfil "${idPerfil}" de "${idPlantilla}".`,
      );
    }
    idsComposiciones.add(composicion.id);

    if (!ORIENTACIONES_COMPOSICION.has(composicion.orientacion)) {
      throw new Error(
        `La composición "${composicion.id}" de "${idPlantilla}" debe ser horizontal o vertical.`,
      );
    }
    orientaciones.add(composicion.orientacion);
    validarNumeroMayorQueCero(
      composicion.peso ?? 1,
      `el peso de la composición "${composicion.id}" de "${idPlantilla}"`,
    );

    const dimensiones = validarGrillaComposicion({
      idPlantilla,
      idPerfil,
      composicion,
      idsDestructibles,
      permitirVacio,
    });
    dimensionesComposiciones.push({
      id: composicion.id,
      ...dimensiones,
    });
  }

  for (const orientacion of ORIENTACIONES_COMPOSICION) {
    if (!orientaciones.has(orientacion)) {
      throw new Error(
        `El perfil "${idPerfil}" de "${idPlantilla}" necesita una composición ${orientacion}.`,
      );
    }
  }

  const anchoMinimoHabitacion = dimensionesHabitacion.ancho.minimo;
  const altoMinimoHabitacion = dimensionesHabitacion.alto.minimo;
  const anchoMaximoHabitacion = dimensionesHabitacion.ancho.maximo;
  const altoMaximoHabitacion = dimensionesHabitacion.alto.maximo;

  const composicionesUtilizables = dimensionesComposiciones.filter(
    ({ ancho, alto }) =>
      ancho <= anchoMaximoHabitacion && alto <= altoMaximoHabitacion,
  );
  if (composicionesUtilizables.length !== dimensionesComposiciones.length) {
    const inalcanzable = dimensionesComposiciones.find(
      ({ ancho, alto }) =>
        ancho > anchoMaximoHabitacion || alto > altoMaximoHabitacion,
    );
    throw new Error(
      `La composición "${inalcanzable.id}" del perfil "${idPerfil}" de "${idPlantilla}" no cabe ni en la habitación máxima configurada.`,
    );
  }

  if (
    !composicionesUtilizables.some(
      ({ ancho, alto }) =>
        ancho <= anchoMinimoHabitacion && alto <= altoMinimoHabitacion,
    )
  ) {
    throw new Error(
      `El perfil "${idPerfil}" de "${idPlantilla}" necesita al menos una composición que quepa en la habitación mínima configurada.`,
    );
  }
}

function validarGrillaComposicion({
  idPlantilla,
  idPerfil,
  composicion,
  idsDestructibles,
  permitirVacio,
}) {
  if (!Array.isArray(composicion.grilla) || composicion.grilla.length === 0) {
    throw new Error(
      `La composición "${composicion.id}" de "${idPlantilla}" necesita una grilla.`,
    );
  }
  const ancho = composicion.grilla[0]?.length ?? 0;
  if (ancho === 0) {
    throw new Error(`La grilla "${composicion.id}" no puede estar vacía.`);
  }
  if (
    composicion.grilla.some(
      (fila) => typeof fila !== "string" || fila.length !== ancho,
    )
  ) {
    throw new Error(
      `Todas las filas de "${composicion.id}" deben tener el mismo ancho.`,
    );
  }

  const leyenda = composicion.leyenda ?? {};
  validarObjeto(leyenda, `la leyenda de "${composicion.id}"`);
  let cantidadObligatoria = 0;
  let usaOpcional = false;

  for (const fila of composicion.grilla) {
    for (const simbolo of fila) {
      if (simbolo === SIMBOLO_VACIO_COMPOSICION) continue;
      if (simbolo === SIMBOLO_OPCIONAL_COMPOSICION) {
        usaOpcional = true;
        continue;
      }
      const entrada = leyenda[simbolo];
      if (!entrada) {
        throw new Error(
          `El símbolo "${simbolo}" de "${composicion.id}" no existe en su leyenda.`,
        );
      }
      validarTexto(entrada.id, `la entidad del símbolo "${simbolo}" en "${composicion.id}"`);
      if (!idsDestructibles.has(entrada.id)) {
        throw new Error(
          `La composición "${composicion.id}" usa "${entrada.id}", que no está permitido por "${idPlantilla}".`,
        );
      }
      cantidadObligatoria += 1;
    }
  }

  if (!permitirVacio && cantidadObligatoria === 0) {
    throw new Error(
      `La composición "${composicion.id}" del perfil "${idPerfil}" debe contener al menos una entidad obligatoria.`,
    );
  }

  for (const simbolo of Object.keys(leyenda)) {
    if (simbolo.length !== 1 || simbolo === "." || simbolo === "?") {
      throw new Error(
        `La leyenda de "${composicion.id}" usa el símbolo reservado o inválido "${simbolo}".`,
      );
    }
  }

  if (usaOpcional) {
    validarObjeto(
      composicion.opcional,
      `la configuración opcional de "${composicion.id}"`,
    );
    validarPorcentaje(
      composicion.opcional.probabilidad,
      `la probabilidad de los slots ? de "${composicion.id}"`,
    );
    const idsOpcionales = validarListaPonderada(
      composicion.opcional.permitidos,
      `las entidades opcionales de "${composicion.id}"`,
    );
    for (const id of idsOpcionales) {
      if (!idsDestructibles.has(id)) {
        throw new Error(
          `El slot opcional de "${composicion.id}" usa "${id}", que no está permitido por "${idPlantilla}".`,
        );
      }
    }
  } else if (composicion.opcional !== undefined) {
    throw new Error(
      `La composición "${composicion.id}" declara configuración opcional sin utilizar el símbolo ?.`,
    );
  }

  if (composicion.contraPared !== undefined) {
    if (!Array.isArray(composicion.contraPared)) {
      throw new Error(`"contraPared" de "${composicion.id}" debe ser una lista.`);
    }
    const coordenadas = new Set();
    for (const posicion of composicion.contraPared) {
      validarObjeto(posicion, `una posición contra pared de "${composicion.id}"`);
      if (
        !Number.isInteger(posicion.x) ||
        !Number.isInteger(posicion.y) ||
        posicion.x < 0 ||
        posicion.y < 0 ||
        posicion.x >= ancho ||
        posicion.y >= composicion.grilla.length
      ) {
        throw new Error(
          `La posición contra pared de "${composicion.id}" está fuera de su grilla.`,
        );
      }
      const simbolo = composicion.grilla[posicion.y][posicion.x];
      if (simbolo === SIMBOLO_VACIO_COMPOSICION) {
        throw new Error(
          `La posición contra pared ${posicion.x},${posicion.y} de "${composicion.id}" no puede apuntar a una casilla vacía.`,
        );
      }
      const clave = `${posicion.x},${posicion.y}`;
      if (coordenadas.has(clave)) {
        throw new Error(
          `La posición contra pared ${clave} está repetida en "${composicion.id}".`,
        );
      }
      coordenadas.add(clave);
    }
  }

  return { ancho, alto: composicion.grilla.length };
}

function validarSolicitudesDestructibles({ idPlantilla, destructibles }) {
  const solicitudes = destructibles.solicitudesBotin ?? {};
  validarObjeto(
    solicitudes,
    `las solicitudes de botín de destructibles de "${idPlantilla}"`,
  );

  for (const [idSolicitud, solicitud] of Object.entries(solicitudes)) {
    validarTexto(
      idSolicitud,
      `un ID de solicitud de destructibles de "${idPlantilla}"`,
    );
    validarSolicitudBotinConfigurada(
      solicitud,
      `la solicitud "${idSolicitud}" de destructibles de "${idPlantilla}"`,
    );
  }

  for (const permitido of destructibles.permitidos) {
    const idSolicitud = permitido.idSolicitudContenido;
    if (idSolicitud === undefined) continue;
    validarTexto(
      idSolicitud,
      `idSolicitudContenido de "${permitido.id}" en "${idPlantilla}"`,
    );
    if (!Object.prototype.hasOwnProperty.call(solicitudes, idSolicitud)) {
      throw new Error(
        `La entidad "${permitido.id}" de "${idPlantilla}" referencia ` +
          `la solicitud inexistente "${idSolicitud}".`,
      );
    }
  }
}

function validarEnemigos(idPlantilla, enemigos) {
  validarObjeto(enemigos, `los enemigos de "${idPlantilla}"`);

  validarNumeroMayorQueCero(
    enemigos.densidadPor100Casillas,
    `la densidad de enemigos por 100 casillas de "${idPlantilla}"`,
  );

  validarPorcentaje(
    enemigos.probabilidadZonaPoblada,
    `la probabilidad de poblar una zona normal de "${idPlantilla}"`,
  );

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

  const idsRecurrentes = validarListaPonderada(
    enemigos.permitidos,
    `los enemigos recurrentes de "${idPlantilla}"`,
  );

  validarProbabilidadesVariantes(
    idPlantilla,
    enemigos.probabilidadesVariantes,
    "recurrentes",
  );

  return idsRecurrentes;
}

function validarEncuentroEspecial({
  idPlantilla,
  encuentroEspecial,
  idsExcluidos,
}) {
  if (encuentroEspecial === undefined || encuentroEspecial === null) {
    return new Set();
  }

  validarObjeto(encuentroEspecial, `el encuentro especial de "${idPlantilla}"`);

  validarPorcentaje(
    encuentroEspecial.probabilidadAparicion,
    `la probabilidad del encuentro especial de "${idPlantilla}"`,
  );

  const idsEspeciales = validarListaPonderada(
    encuentroEspecial.permitidos,
    `los enemigos especiales de "${idPlantilla}"`,
  );

  validarIdsExcluidos({
    ids: idsEspeciales,
    idsExcluidos,
    idPlantilla,
    tipoPoblacion: "especial",
  });

  validarProbabilidadesVariantes(
    idPlantilla,
    encuentroEspecial.probabilidadesVariantes,
    "especiales",
  );

  return idsEspeciales;
}

function validarJefe({ idPlantilla, jefe, idsExcluidos }) {
  if (jefe === undefined || jefe === null) {
    return new Set();
  }

  validarObjeto(jefe, `el jefe de "${idPlantilla}"`);

  if (jefe.probabilidadAparicion !== 100) {
    throw new Error(
      `El jefe de "${idPlantilla}" debe tener una probabilidad de aparición de 100.`,
    );
  }

  const idsJefes = validarListaPonderada(
    jefe.permitidos,
    `los jefes de "${idPlantilla}"`,
  );

  validarIdsExcluidos({
    ids: idsJefes,
    idsExcluidos,
    idPlantilla,
    tipoPoblacion: "jefe",
  });

  validarProbabilidadesVariantes(
    idPlantilla,
    jefe.probabilidadesVariantes,
    "de jefe",
  );

  return idsJefes;
}

function validarIdsExcluidos({
  ids,
  idsExcluidos,
  idPlantilla,
  tipoPoblacion,
}) {
  for (const id of ids) {
    if (idsExcluidos.has(id)) {
      throw new Error(
        `El enemigo "${id}" de "${idPlantilla}" no puede participar ` +
          `también como ${tipoPoblacion}.`,
      );
    }
  }
}

function validarInteractuables(idPlantilla, interactuables) {
  validarObjeto(interactuables, `los interactuables de "${idPlantilla}"`);

  validarObjeto(
    interactuables.portalEntrada,
    `el portal de entrada de "${idPlantilla}"`,
  );
  if (interactuables.portalEntrada.habilitado !== true) {
    throw new Error(
      `El portal de entrada de "${idPlantilla}" debe permanecer habilitado.`,
    );
  }

  validarObjeto(interactuables.puertas, `las puertas de "${idPlantilla}"`);
  validarPorcentaje(
    interactuables.puertas.probabilidadPorPasillo,
    `la probabilidad de puerta por pasillo de "${idPlantilla}"`,
  );

  validarObjeto(
    interactuables.destructibles,
    `los destructibles de "${idPlantilla}"`,
  );
  if (interactuables.destructibles.densidadPor100Casillas !== undefined) {
    throw new Error(
      `"${idPlantilla}" usa el contrato canónico de composiciones y no debe declarar densidadPor100Casillas para destructibles.`,
    );
  }
  const idsDestructibles = validarListaPonderada(
    interactuables.destructibles.permitidos,
    `los destructibles permitidos de "${idPlantilla}"`,
  );
  validarSolicitudesDestructibles({
    idPlantilla,
    destructibles: interactuables.destructibles,
    idsDestructibles,
  });

  validarObjeto(interactuables.cofres, `los cofres de "${idPlantilla}"`);
  validarObjeto(
    interactuables.cofres.moderados,
    `los cofres moderados de "${idPlantilla}"`,
  );
  validarPorcentaje(
    interactuables.cofres.moderados.probabilidadPorHabitacion,
    `la probabilidad de cofre moderado por habitación de "${idPlantilla}"`,
  );
  validarSolicitudBotinConfigurada(
    interactuables.cofres.moderados.solicitudBotin,
    `la solicitud de cofres moderados de "${idPlantilla}"`,
  );

  validarObjeto(
    interactuables.cofres.importante,
    `el cofre importante de "${idPlantilla}"`,
  );
  validarSolicitudBotinConfigurada(
    interactuables.cofres.importante.solicitudBotin,
    `la solicitud del cofre importante de "${idPlantilla}"`,
  );
}

function validarListaPonderada(lista, descripcion) {
  if (!Array.isArray(lista) || lista.length === 0) {
    throw new Error(`${descripcion} debe contener al menos un elemento.`);
  }

  const ids = new Set();

  for (const elemento of lista) {
    validarObjeto(elemento, descripcion);

    validarTexto(elemento.id, `un id dentro de ${descripcion}`);

    validarNumeroMayorQueCero(elemento.peso, `el peso de "${elemento.id}"`);

    const idNormalizado = elemento.id.trim();

    if (ids.has(idNormalizado)) {
      throw new Error(
        `El ID "${idNormalizado}" está repetido dentro de ${descripcion}.`,
      );
    }

    ids.add(idNormalizado);

  }

  return ids;
}

function validarSolicitudBotinConfigurada(solicitud, descripcion) {
  validarEstructuraSolicitudBotin(solicitud, { descripcion });
}

function validarProbabilidadesVariantes(
  idPlantilla,
  probabilidades,
  tipoPoblacion,
) {
  validarObjeto(
    probabilidades,
    `las probabilidades de variantes ${tipoPoblacion} de "${idPlantilla}"`,
  );

  let total = 0;

  for (const variante of VARIANTES_REQUERIDAS) {
    const probabilidad = probabilidades[variante];

    validarPorcentaje(
      probabilidad,
      `la probabilidad "${variante}" de los enemigos ${tipoPoblacion} ` +
        `de "${idPlantilla}"`,
    );

    total += probabilidad;
  }

  if (total !== 100) {
    throw new Error(
      `Las probabilidades de variantes ${tipoPoblacion} de "${idPlantilla}" ` +
        `deben sumar 100. Actualmente suman ${total}.`,
    );
  }
}

function unirConjuntos(conjuntoA, conjuntoB) {
  return new Set([...conjuntoA, ...conjuntoB]);
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


function validarNumeroNoNegativo(valor, descripcion) {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`${descripcion} debe ser igual o mayor que 0.`);
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
