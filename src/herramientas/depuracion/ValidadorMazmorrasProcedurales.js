const SUELO = ".";

// Valida invariantes estructurales de un PlanoMazmorra.
//
// Esta herramienta es diagnóstica y no participa de las reglas
// de movimiento, colisión, IA, LOS ni FOV del juego.
export function validarMazmorraProcedural({ plano, plantilla } = {}) {
  validarObjeto(plano, "el plano de mazmorra");
  validarObjeto(plantilla, "la plantilla de mapa");

  const errores = [];

  comprobar(
    plano.porcentajeConectado === 100,
    "La conectividad transitable debe ser exactamente 100%.",
    errores,
  );

  comprobarRango(
    plano.habitaciones.length,
    plantilla.generacion.sectores.cantidad,
    "La cantidad de habitaciones",
    errores,
  );

  validarHabitaciones({ plano, plantilla, errores });
  validarConexiones({ plano, errores });
  validarPuntosConexion({ plano, errores });
  validarEntrada({ plano, errores });
  validarSalidaEstructural({ plano, errores });
  validarZonasCandidatas({ plano, errores });
  validarCasillas({ plano, errores });

  return {
    valido: errores.length === 0,
    errores,
    metricas: calcularMetricasMazmorra(plano),
  };
}

export function exigirMazmorraProceduralValida({ plano, plantilla } = {}) {
  const resultado = validarMazmorraProcedural({ plano, plantilla });

  if (!resultado.valido) {
    throw new Error(
      "La mazmorra procedural no cumple sus invariantes:\n- " +
        resultado.errores.join("\n- "),
    );
  }

  return resultado;
}

export function calcularMetricasMazmorra(plano) {
  validarObjeto(plano, "el plano de mazmorra");

  const longitudesPasillos = plano.pasillos
    .filter((pasillo) => pasillo.tipo !== "salida")
    .map((pasillo) => pasillo.longitud);
  const areasHabitaciones = plano.habitaciones.map(
    (habitacion) => habitacion.ancho * habitacion.alto,
  );

  return {
    ancho: plano.ancho,
    alto: plano.alto,
    habitaciones: plano.habitaciones.length,
    pasillos: plano.pasillos.length,
    conexiones: plano.conexiones.length,
    conexionesExtra: plano.conexiones.filter(
      (conexion) => conexion.tipo === "extra",
    ).length,
    puntosConexion: plano.puntosConexion.length,
    longitudSalida: plano.salidaEstructural?.casillasConexionBorde?.length ?? 0,
    longitudPasilloMedia: promedio(longitudesPasillos),
    longitudPasilloMaxima: maximo(longitudesPasillos),
    areaHabitacionMedia: promedio(areasHabitaciones),
    porcentajeNoCaminableReal: plano.porcentajeNoCaminableReal,
    porcentajeConectado: plano.porcentajeConectado,
    intentoExitoso: plano.intentoExitoso,
  };
}

function validarHabitaciones({ plano, plantilla, errores }) {
  const ids = new Set();

  for (const habitacion of plano.habitaciones) {
    comprobar(
      typeof habitacion.id === "string" && habitacion.id !== "",
      "Cada habitación debe tener un id interno estable.",
      errores,
    );
    comprobar(
      !ids.has(habitacion.id),
      `El id de habitación "${habitacion.id}" está repetido.`,
      errores,
    );
    ids.add(habitacion.id);

    comprobarRango(
      habitacion.ancho,
      plantilla.generacion.habitaciones.ancho,
      `El ancho de ${habitacion.id}`,
      errores,
    );
    comprobarRango(
      habitacion.alto,
      plantilla.generacion.habitaciones.alto,
      `El alto de ${habitacion.id}`,
      errores,
    );

    for (const casilla of habitacion.casillas) {
      comprobar(
        casilla.x > 0 &&
          casilla.x < plano.ancho - 1 &&
          casilla.y > 0 &&
          casilla.y < plano.alto - 1,
        `${habitacion.id} sale del interior válido del mapa.`,
        errores,
      );
      comprobar(
        plano.celdas[casilla.y]?.[casilla.x] === SUELO,
        `${habitacion.id} contiene una casilla que no es transitable.`,
        errores,
      );
    }
  }

  for (let i = 0; i < plano.habitaciones.length; i++) {
    for (let j = i + 1; j < plano.habitaciones.length; j++) {
      const a = plano.habitaciones[i];
      const b = plano.habitaciones[j];

      comprobar(
        !rectangulosSeSuperponen(a, b),
        `${a.id} se superpone con ${b.id}.`,
        errores,
      );
    }
  }

  const separacion = plantilla.generacion.sectores.separacion;

  for (const habitacion of plano.habitaciones) {
    const distancias = plano.habitaciones
      .filter((otra) => otra.id !== habitacion.id)
      .map((otra) => calcularSeparacionRectangulos(habitacion, otra));
    const distanciaMasCercana = Math.min(...distancias);

    comprobar(
      distanciaMasCercana >= separacion.minimo,
      `${habitacion.id} viola la separación mínima configurada.`,
      errores,
    );
    comprobar(
      distanciaMasCercana <= separacion.maximo,
      `${habitacion.id} no tiene ningún sector dentro de la separación máxima configurada.`,
      errores,
    );
  }
}

function validarConexiones({ plano, errores }) {
  const idsHabitaciones = new Set(
    plano.habitaciones.map((habitacion) => habitacion.id),
  );
  const idsPasillos = new Set(plano.pasillos.map((pasillo) => pasillo.id));
  const pares = new Set();
  const adyacencias = new Map(
    plano.habitaciones.map((habitacion) => [habitacion.id, []]),
  );

  comprobar(
    plano.conexiones.length >= plano.habitaciones.length - 1,
    "La red no contiene conexiones suficientes para unir todas las habitaciones.",
    errores,
  );

  for (const conexion of plano.conexiones) {
    comprobar(
      idsHabitaciones.has(conexion.idHabitacionA) &&
        idsHabitaciones.has(conexion.idHabitacionB),
      `${conexion.id} referencia una habitación inexistente.`,
      errores,
    );
    comprobar(
      idsPasillos.has(conexion.idPasillo),
      `${conexion.id} referencia un pasillo inexistente.`,
      errores,
    );
    comprobar(
      conexion.tipo === "principal" || conexion.tipo === "extra",
      `${conexion.id} tiene un tipo de conexión inválido.`,
      errores,
    );

    const par = [conexion.idHabitacionA, conexion.idHabitacionB].sort().join("|");
    comprobar(!pares.has(par), `${conexion.id} duplica una conexión existente.`, errores);
    pares.add(par);

    adyacencias.get(conexion.idHabitacionA)?.push(conexion.idHabitacionB);
    adyacencias.get(conexion.idHabitacionB)?.push(conexion.idHabitacionA);
  }

  const idInicial = plano.habitaciones[0]?.id;
  const visitadas = new Set(idInicial ? [idInicial] : []);
  const pendientes = idInicial ? [idInicial] : [];

  while (pendientes.length > 0) {
    const actual = pendientes.shift();

    for (const siguiente of adyacencias.get(actual) ?? []) {
      if (!visitadas.has(siguiente)) {
        visitadas.add(siguiente);
        pendientes.push(siguiente);
      }
    }
  }

  comprobar(
    visitadas.size === plano.habitaciones.length,
    "Existe al menos una habitación aislada en el grafo estructural.",
    errores,
  );
}

function validarPuntosConexion({ plano, errores }) {
  comprobar(
    plano.puntosConexion.length > 0,
    "El plano debe exponer puntos de conexión estructural.",
    errores,
  );

  const tiposValidos = new Set([
    "acceso_habitacion",
    "giro_pasillo",
    "cruce_pasillos",
    "zona_transicion",
  ]);

  for (const punto of plano.puntosConexion) {
    comprobar(
      tiposValidos.has(punto.tipo),
      `${punto.id} tiene un tipo de punto de conexión inválido.`,
      errores,
    );
    comprobar(
      plano.celdas[punto.y]?.[punto.x] === SUELO,
      `${punto.id} no está ubicado sobre terreno transitable.`,
      errores,
    );
  }
}

function validarSalidaEstructural({ plano, errores }) {
  const salida = plano.salidaEstructural;
  const portal = salida?.posicionPortal;
  const acceso = salida?.posicionAcceso;
  const habitacion = plano.habitaciones.find(
    (item) => item.id === salida?.idHabitacion,
  );
  const pasillo = plano.pasillos.find((item) => item.id === salida?.idPasillo);

  comprobar(Boolean(salida), "El plano debe declarar una salida estructural.", errores);
  comprobar(Boolean(habitacion), "La salida referencia una habitación inválida.", errores);
  comprobar(
    Boolean(pasillo) && pasillo.tipo === "salida",
    "La salida debe referenciar su pasillo estructural de transición.",
    errores,
  );

  if (!portal || !acceso) return;

  const portalEnBorde =
    portal.x === 0 ||
    portal.y === 0 ||
    portal.x === plano.ancho - 1 ||
    portal.y === plano.alto - 1;

  comprobar(portalEnBorde, "El portal estructural debe quedar sobre el borde.", errores);
  comprobar(
    plano.celdas[portal.y]?.[portal.x] !== SUELO,
    "La casilla del portal estructural debe conservarse bloqueada.",
    errores,
  );
  comprobar(
    plano.celdas[acceso.y]?.[acceso.x] === SUELO,
    "El acceso de salida debe ser transitable.",
    errores,
  );
  comprobar(
    Math.abs(portal.x - acceso.x) + Math.abs(portal.y - acceso.y) === 1,
    "El acceso de salida debe ser adyacente al portal.",
    errores,
  );
  comprobar(
    Array.isArray(salida.casillasConexionBorde) &&
      salida.casillasConexionBorde.length > 0,
    "La salida debe conservar las casillas de su conexión al borde.",
    errores,
  );

  for (const casilla of salida.casillasConexionBorde ?? []) {
    comprobar(
      plano.celdas[casilla.y]?.[casilla.x] === SUELO,
      "La conexión estructural de salida contiene una casilla no transitable.",
      errores,
    );
  }
}

function validarEntrada({ plano, errores }) {
  const entrada = plano.zonaEntrada;
  const habitacion = plano.habitaciones.find(
    (item) => item.id === entrada.idHabitacion,
  );

  comprobar(Boolean(habitacion), "La zona de entrada referencia una habitación inválida.", errores);
  comprobar(
    plano.celdas[entrada.posicionSugerida.y]?.[entrada.posicionSugerida.x] === SUELO,
    "La posición sugerida de entrada no es transitable.",
    errores,
  );
  comprobar(
    entrada.casillasReservadas.length > 0,
    "La zona de entrada debe reservar al menos una casilla.",
    errores,
  );
}

function validarZonasCandidatas({ plano, errores }) {
  comprobar(
    plano.zonasCandidatasSalida.length > 0,
    "El plano debe ofrecer al menos una zona candidata de salida.",
    errores,
  );
  comprobar(
    plano.zonasCandidatasPoblacion.length > 0,
    "El plano debe ofrecer zonas candidatas de población.",
    errores,
  );

  for (const zona of [
    ...plano.zonasCandidatasSalida,
    ...plano.zonasCandidatasPoblacion,
  ]) {
    comprobar(
      plano.celdas[zona.posicionSugerida.y]?.[zona.posicionSugerida.x] === SUELO,
      `La zona candidata de ${zona.idHabitacion} no es transitable.`,
      errores,
    );
  }
}

function validarCasillas({ plano, errores }) {
  const clavesTransitables = plano.casillasTransitables.map(crearClave);
  const clavesBloqueadas = plano.casillasBloqueadas.map(crearClave);

  comprobar(
    new Set(clavesTransitables).size === clavesTransitables.length,
    "Las casillas transitables contienen duplicados.",
    errores,
  );
  comprobar(
    new Set(clavesBloqueadas).size === clavesBloqueadas.length,
    "Las casillas bloqueadas contienen duplicados.",
    errores,
  );
  comprobar(
    plano.casillasTransitables.length + plano.casillasBloqueadas.length ===
      plano.ancho * plano.alto,
    "Las casillas transitables y bloqueadas no cubren todo el mapa.",
    errores,
  );
  comprobar(
    !("casillasCaminables" in plano),
    "El plano no debe exponer aliases legacy de las casillas transitables.",
    errores,
  );
  comprobar(
    plano.posicionInicialSugerida.x === plano.zonaEntrada.posicionSugerida.x &&
      plano.posicionInicialSugerida.y === plano.zonaEntrada.posicionSugerida.y,
    "La posición inicial compatible debe derivar de la zona de entrada.",
    errores,
  );

  const clavesReservadas = plano.casillasReservadasContenido.map(crearClave);
  comprobar(
    new Set(clavesReservadas).size === clavesReservadas.length,
    "Las reservas estructurales de contenido contienen duplicados.",
    errores,
  );

  for (const posicion of plano.casillasReservadasContenido) {
    comprobar(
      plano.celdas[posicion.y]?.[posicion.x] === SUELO,
      "Una reserva estructural de contenido no es transitable.",
      errores,
    );
  }
}

function comprobarRango(valor, rango, descripcion, errores) {
  comprobar(
    valor >= rango.minimo && valor <= rango.maximo,
    `${descripcion} (${valor}) queda fuera del rango ${rango.minimo}-${rango.maximo}.`,
    errores,
  );
}

function comprobar(condicion, mensaje, errores) {
  if (!condicion) {
    errores.push(mensaje);
  }
}

function rectangulosSeSuperponen(a, b) {
  return !(
    a.x + a.ancho <= b.x ||
    b.x + b.ancho <= a.x ||
    a.y + a.alto <= b.y ||
    b.y + b.alto <= a.y
  );
}

function calcularSeparacionRectangulos(a, b) {
  return (
    calcularSeparacionEje(
      a.x,
      a.x + a.ancho - 1,
      b.x,
      b.x + b.ancho - 1,
    ) +
    calcularSeparacionEje(
      a.y,
      a.y + a.alto - 1,
      b.y,
      b.y + b.alto - 1,
    )
  );
}

function calcularSeparacionEje(inicioA, finA, inicioB, finB) {
  if (finA < inicioB) {
    return inicioB - finA - 1;
  }

  if (finB < inicioA) {
    return inicioA - finB - 1;
  }

  return 0;
}

function promedio(valores) {
  if (valores.length === 0) {
    return 0;
  }

  return redondear(
    valores.reduce((total, valor) => total + valor, 0) / valores.length,
    2,
  );
}

function maximo(valores) {
  return valores.length > 0 ? Math.max(...valores) : 0;
}

function redondear(valor, decimales) {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

function crearClave(posicion) {
  return `${posicion.x},${posicion.y}`;
}

function validarObjeto(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}
