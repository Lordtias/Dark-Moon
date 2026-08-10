// Valida la población de enemigos generada sobre un PlanoMazmorra.
//
// Es una herramienta de diagnóstico: no participa del runtime, combate,
// IA, movimiento, LOS, FOV ni resolución de botín.
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
  });
  const cantidadObjetivo = Number.isInteger(
    cantidadEnemigosRecurrentesEsperada,
  )
    ? cantidadEnemigosRecurrentesEsperada
    : Math.max(
        1,
        Math.round(
          cantidadCandidatas *
            ((plantilla.enemigos?.densidadPor100Casillas ?? 0) / 100),
        ),
      );

  comprobar(
    resumen.cantidadEnemigosRecurrentes === cantidadObjetivo,
    `La población recurrente esperada era ${cantidadObjetivo} y se generaron ${resumen.cantidadEnemigosRecurrentes}.`,
    errores,
  );

  const poblacion = resumen.poblacionEnemigos ?? {};
  comprobar(
    poblacion.estrategia === "densidad_por_zonas",
    "El resumen debe identificar la estrategia de densidad por zonas.",
    errores,
  );
  comprobar(
    poblacion.idHabitacionZonaEspecial === idHabitacionEspecial,
    "El resumen de población no identifica correctamente la zona especial.",
    errores,
  );
  comprobar(
    poblacion.cantidadCasillasCandidatas === cantidadCandidatas,
    "El resumen de población no coincide con las casillas candidatas reales.",
    errores,
  );

  return {
    valido: errores.length === 0,
    errores,
    metricas: {
      enemigosTotales: enemigos.length,
      enemigosRecurrentes: resumen.cantidadEnemigosRecurrentes ?? 0,
      enemigosEspeciales: resumen.cantidadEnemigosEspeciales ?? 0,
      jefes: resumen.cantidadJefes ?? 0,
      cantidadCasillasCandidatas: cantidadCandidatas,
      densidadPor100Casillas:
        plantilla.enemigos?.densidadPor100Casillas ?? null,
      idHabitacionZonaEspecial: idHabitacionEspecial,
      zonasNormales: Math.max(0, zonas.length - zonasEspeciales.length),
      zonasActivadasPorCapacidad:
        poblacion.zonasActivadasPorCapacidad?.length ?? 0,
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

function contarCasillasCandidatas({ plano, posicionJugador }) {
  const reservadas = new Set(
    (plano.casillasReservadasContenido ?? []).map(crearClave),
  );
  let total = 0;

  for (const zona of plano.zonasCandidatasPoblacion ?? []) {
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
