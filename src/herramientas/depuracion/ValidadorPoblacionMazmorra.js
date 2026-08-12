// Valida la población de enemigos y el plan canónico de uso de habitaciones.
// Es una herramienta de diagnóstico: no participa del runtime, combate, IA,
// movimiento, LOS, FOV ni resolución real de botín.
export function validarPoblacionMazmorra({
  plano,
  plantilla,
  contenido,
  posicionJugador = plano?.posicionInicialSugerida,
  cantidadEnemigosRecurrentesEsperada = null,
} = {}) {
  validarObjeto(plano, "el plano de mazmorra");
  validarObjeto(plantilla, "la plantilla de mapa");
  validarObjeto(contenido, "el contenido generado");

  const errores = [];
  const enemigos = Array.isArray(contenido.enemigos) ? contenido.enemigos : [];
  const resumen = contenido.resumen ?? {};
  const detalle = Array.isArray(resumen.detalleEnemigos)
    ? resumen.detalleEnemigos
    : [];
  const poblacion = resumen.poblacionEnemigos ?? {};
  const plan = resumen.planPoblacion ?? plano.planPoblacion ?? {};
  const idHabitacionEspecial = plano.salidaEstructural?.idHabitacion ?? null;
  const zonas = Array.isArray(plano.zonasCandidatasPoblacion)
    ? plano.zonasCandidatasPoblacion
    : [];
  const zonasEspeciales = zonas.filter(
    (zona) => zona.idHabitacion === idHabitacionEspecial,
  );

  comprobar(
    zonasEspeciales.length === 1,
    "Debe existir exactamente una zona de población asociada a la salida estructural.",
    errores,
  );

  validarPlanHabitaciones({
    plano,
    plantilla,
    plan,
    idHabitacionEspecial,
    errores,
  });

  const idsAmbientales = new Set(plan.idsHabitacionesAmbientales ?? []);
  const clavesReservadas = new Set(
    (plano.casillasReservadasContenido ?? []).map(crearClave),
  );
  const clavesEntrada = new Set(
    (plano.zonaEntrada?.casillasReservadas ?? []).map(crearClave),
  );
  const habitacionPorCasilla = new Map();

  for (const zona of zonas) {
    for (const casilla of zona.casillas ?? []) {
      habitacionPorCasilla.set(crearClave(casilla), zona.idHabitacion);
    }
  }

  const posicionesOcupadas = new Set();

  for (const enemigo of enemigos) {
    const clave = crearClave(enemigo);
    const idHabitacion = habitacionPorCasilla.get(clave);
    comprobar(
      Number.isInteger(enemigo.x) && Number.isInteger(enemigo.y),
      `Existe un enemigo con posición inválida (${enemigo.x}, ${enemigo.y}).`,
      errores,
    );
    comprobar(
      plano.celdas?.[enemigo.y]?.[enemigo.x] === ".",
      `El enemigo en ${clave} no está sobre una casilla transitable.`,
      errores,
    );
    comprobar(
      habitacionPorCasilla.has(clave),
      `El enemigo en ${clave} quedó fuera de las zonas de habitación poblables.`,
      errores,
    );
    comprobar(
      !idsAmbientales.has(idHabitacion),
      `El enemigo en ${clave} ocupa la habitación ambiental "${idHabitacion}".`,
      errores,
    );
    comprobar(
      !clavesReservadas.has(clave),
      `El enemigo en ${clave} ocupa una casilla estructural reservada.`,
      errores,
    );
    comprobar(
      !clavesEntrada.has(clave),
      `El enemigo en ${clave} viola la seguridad de la habitación inicial.`,
      errores,
    );
    comprobar(
      !posicionesOcupadas.has(clave),
      `Dos enemigos comparten la casilla ${clave}.`,
      errores,
    );
    posicionesOcupadas.add(clave);
  }

  comprobar(
    enemigos.length === resumen.cantidadEnemigos,
    "El resumen no coincide con la cantidad real de enemigos.",
    errores,
  );
  comprobar(
    detalle.length === enemigos.length,
    "El detalle de enemigos no coincide con la población real.",
    errores,
  );

  for (const entrada of detalle) {
    const habitacionReal = habitacionPorCasilla.get(crearClave(entrada));
    comprobar(
      entrada.idHabitacion === habitacionReal,
      `El detalle del enemigo ${entrada.numero ?? "?"} declara una habitación incorrecta.`,
      errores,
    );
    comprobar(
      !idsAmbientales.has(entrada.idHabitacion),
      `El detalle del enemigo ${entrada.numero ?? "?"} referencia una habitación ambiental.`,
      errores,
    );

    if (entrada.esJefe || entrada.esEncuentroEspecial) {
      comprobar(
        entrada.idHabitacion === idHabitacionEspecial &&
          entrada.zonaEspecial === true,
        `El enemigo único ${entrada.numero ?? "?"} no está dentro de la zona especial.`,
        errores,
      );
    }
  }

  const cantidadCandidatas = contarCasillasCandidatas({
    plano,
    posicionJugador,
    idsAmbientales,
  });
  const cantidadObjetivo = Number.isInteger(
    cantidadEnemigosRecurrentesEsperada,
  )
    ? cantidadEnemigosRecurrentesEsperada
    : cantidadCandidatas > 0
      ? Math.max(
          1,
          Math.round(
            cantidadCandidatas *
              ((plantilla.enemigos?.densidadPor100Casillas ?? 0) / 100),
          ),
        )
      : 0;
  const cantidadRecurrentes = resumen.cantidadEnemigosRecurrentes ?? 0;
  const omitidosPorPresupuesto =
    poblacion.cantidadNoColocadaPorPresupuesto ?? 0;
  const omitidosPorCapacidadFisica =
    poblacion.cantidadNoColocadaPorCapacidadFisica ?? 0;

  comprobar(
    cantidadRecurrentes <= cantidadObjetivo,
    `La población recurrente generada (${cantidadRecurrentes}) supera el objetivo de densidad (${cantidadObjetivo}).`,
    errores,
  );
  comprobar(
    cantidadRecurrentes +
        omitidosPorPresupuesto +
        omitidosPorCapacidadFisica ===
      cantidadObjetivo,
    "La diferencia entre densidad objetivo y población recurrente real debe explicarse por presupuesto o capacidad física.",
    errores,
  );
  comprobar(
    poblacion.estrategia === "presupuesto_por_habitacion",
    "El resumen debe identificar la estrategia canónica de presupuesto por habitación.",
    errores,
  );
  comprobar(
    poblacion.idHabitacionZonaEspecial === idHabitacionEspecial,
    "El resumen de población no identifica correctamente la zona especial.",
    errores,
  );
  comprobar(
    poblacion.cantidadCasillasCandidatas === cantidadCandidatas,
    "El resumen de población no coincide con las casillas candidatas poblables reales.",
    errores,
  );

  return {
    valido: errores.length === 0,
    errores,
    metricas: {
      enemigosTotales: enemigos.length,
      enemigosRecurrentes: cantidadRecurrentes,
      enemigosEspeciales: resumen.cantidadEnemigosEspeciales ?? 0,
      jefes: resumen.cantidadJefes ?? 0,
      cantidadCasillasCandidatas: cantidadCandidatas,
      densidadPor100Casillas:
        plantilla.enemigos?.densidadPor100Casillas ?? null,
      idHabitacionZonaEspecial: idHabitacionEspecial,
      habitacionesAmbientales: idsAmbientales.size,
      zonasNormales: poblacion.cantidadZonasNormales ?? 0,
      zonasActivadasPorCapacidad:
        poblacion.zonasActivadasPorCapacidad?.length ?? 0,
      enemigosOmitidosPorPresupuesto: omitidosPorPresupuesto,
      enemigosOmitidosPorCapacidadFisica: omitidosPorCapacidadFisica,
    },
  };
}

export function exigirPoblacionMazmorraValida(parametros = {}) {
  const resultado = validarPoblacionMazmorra(parametros);

  if (!resultado.valido) {
    throw new Error(
      "La población procedural no cumple sus invariantes:\n- " +
        resultado.errores.join("\n- "),
    );
  }

  return resultado;
}

function validarPlanHabitaciones({
  plano,
  plantilla,
  plan,
  idHabitacionEspecial,
  errores,
}) {
  comprobar(
    plan.estrategia === "presupuesto_por_habitacion",
    "El plano debe conservar el plan canónico de población por habitación.",
    errores,
  );

  const idsAmbientales = Array.isArray(plan.idsHabitacionesAmbientales)
    ? plan.idsHabitacionesAmbientales
    : [];
  const rango = plantilla.habitaciones?.ambientales ?? {};
  comprobar(
    idsAmbientales.length >= (rango.minimo ?? 1) &&
      idsAmbientales.length <= (rango.maximo ?? 3),
    "La cantidad de habitaciones ambientales no respeta el rango configurado del mapa.",
    errores,
  );
  comprobar(
    new Set(idsAmbientales).size === idsAmbientales.length,
    "La reserva ambiental contiene habitaciones repetidas.",
    errores,
  );
  comprobar(
    !idsAmbientales.includes(idHabitacionEspecial),
    "La habitación especial no puede reservarse como ambiental.",
    errores,
  );
  comprobar(
    !idsAmbientales.includes(plano.zonaEntrada?.idHabitacion),
    "La habitación de entrada no puede reservarse como ambiental.",
    errores,
  );

  const idsHabitaciones = new Set(
    (plano.habitaciones ?? []).map((habitacion) => habitacion.id),
  );
  for (const id of idsAmbientales) {
    comprobar(
      idsHabitaciones.has(id),
      `La reserva ambiental referencia la habitación inexistente "${id}".`,
      errores,
    );
  }

  const detalle = Array.isArray(plan.habitaciones) ? plan.habitaciones : [];
  if (plantilla.habitaciones?.perfiles) {
    comprobar(
      plan.estrategiaHabitaciones === "cupos_y_composiciones",
      "El plan de habitaciones debe identificar la estrategia dirigida por cupos y composiciones.",
      errores,
    );
    validarCuposYComposiciones({
      plantilla,
      detalle,
      idHabitacionEspecial,
      idsAmbientales: new Set(idsAmbientales),
      errores,
    });
  }

  for (const habitacion of detalle) {
    for (const dimension of ["ocupacion", "amenaza", "valorRecompensa"]) {
      const inicial = habitacion.presupuestoInicial?.[dimension];
      const consumido = habitacion.presupuestoConsumido?.[dimension];
      comprobar(
        Number.isFinite(inicial) && inicial >= 0,
        `El presupuesto inicial de ${dimension} de "${habitacion.idHabitacion}" no es válido.`,
        errores,
      );
      comprobar(
        Number.isFinite(consumido) && consumido >= 0 && consumido <= inicial + 1e-9,
        `El consumo de ${dimension} de "${habitacion.idHabitacion}" supera su presupuesto.`,
        errores,
      );
    }

    if (habitacion.ambiental) {
      comprobar(
        habitacion.presupuestoConsumido?.ocupacion === 0 &&
          habitacion.presupuestoConsumido?.amenaza === 0 &&
          habitacion.presupuestoConsumido?.valorRecompensa === 0,
        `La habitación ambiental "${habitacion.idHabitacion}" consumió presupuesto de contenido.`,
        errores,
      );
    }
  }
}

function validarCuposYComposiciones({
  plantilla,
  detalle,
  idHabitacionEspecial,
  idsAmbientales,
  errores,
}) {
  const habitaciones = plantilla.habitaciones;
  const normales = detalle.filter(
    (habitacion) =>
      !habitacion.zonaEspecial && !habitacion.ambiental,
  );
  const conteos = new Map();

  for (const habitacion of normales) {
    conteos.set(
      habitacion.perfil,
      (conteos.get(habitacion.perfil) ?? 0) + 1,
    );
    comprobar(
      typeof habitacion.composicion === "string" && habitacion.composicion !== "",
      `La habitación "${habitacion.idHabitacion}" no conserva su composición dirigida.`,
      errores,
    );
    comprobar(
      habitacion.orientacionComposicion === "horizontal" ||
        habitacion.orientacionComposicion === "vertical",
      `La habitación "${habitacion.idHabitacion}" no conserva la orientación de su composición.`,
      errores,
    );
    comprobar(
      Number.isInteger(habitacion.origenComposicion?.x) &&
        Number.isInteger(habitacion.origenComposicion?.y),
      `La habitación "${habitacion.idHabitacion}" no conserva el origen de su composición.`,
      errores,
    );
  }

  for (const perfil of habitaciones.perfiles.normales) {
    const cantidad = conteos.get(perfil.id) ?? 0;
    comprobar(
      cantidad >= perfil.cupo.minimo && cantidad <= perfil.cupo.maximo,
      `El perfil "${perfil.id}" aparece ${cantidad} veces y no respeta su cupo ${perfil.cupo.minimo}-${perfil.cupo.maximo}.`,
      errores,
    );
  }

  const especial = detalle.find(
    (habitacion) => habitacion.idHabitacion === idHabitacionEspecial,
  );
  comprobar(
    especial?.perfil === habitaciones.perfilEspecial.id,
    "La habitación especial no conserva su perfil configurado.",
    errores,
  );
  comprobar(
    typeof especial?.composicion === "string" && especial.composicion !== "",
    "La habitación especial no conserva una composición dirigida.",
    errores,
  );
  comprobar(
    Number.isInteger(especial?.origenComposicion?.x) &&
      Number.isInteger(especial?.origenComposicion?.y),
    "La habitación especial no conserva el origen de su composición.",
    errores,
  );

  for (const habitacion of detalle.filter((entrada) => idsAmbientales.has(entrada.idHabitacion))) {
    comprobar(
      habitacion.perfil === habitaciones.perfilAmbiental.id,
      `La habitación ambiental "${habitacion.idHabitacion}" no conserva el perfil ambiental.`,
      errores,
    );
    comprobar(
      typeof habitacion.composicion === "string" && habitacion.composicion !== "",
      `La habitación ambiental "${habitacion.idHabitacion}" no conserva su composición ambiental.`,
      errores,
    );
    comprobar(
      Number.isInteger(habitacion.origenComposicion?.x) &&
        Number.isInteger(habitacion.origenComposicion?.y),
      `La habitación ambiental "${habitacion.idHabitacion}" no conserva el origen de su composición.`,
      errores,
    );
  }
}

function contarCasillasCandidatas({ plano, posicionJugador, idsAmbientales }) {
  const reservadas = new Set(
    (plano.casillasReservadasContenido ?? []).map(crearClave),
  );
  let total = 0;

  for (const zona of plano.zonasCandidatasPoblacion ?? []) {
    if (idsAmbientales.has(zona.idHabitacion)) continue;
    for (const casilla of zona.casillas ?? []) {
      if (
        esMismaPosicion(casilla, posicionJugador) ||
        reservadas.has(crearClave(casilla))
      ) {
        continue;
      }
      total += 1;
    }
  }

  return total;
}

function crearClave(posicion) {
  return `${posicion?.x},${posicion?.y}`;
}

function esMismaPosicion(a, b) {
  return a?.x === b?.x && a?.y === b?.y;
}

function comprobar(condicion, mensaje, errores) {
  if (!condicion) errores.push(mensaje);
}

function validarObjeto(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}
