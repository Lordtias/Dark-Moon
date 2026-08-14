// Nivel hasta el cual está planificado actualmente
// el contenido principal de Dark Moon.
//
// No funciona como límite obligatorio del personaje.
// Se utiliza como referencia para análisis y balance.
export const NIVEL_MAXIMO_PLANIFICADO = 10;

// Configuración central de la curva de progresión general.
//
// La progresión concede exactamente un punto de atributo por nivel.
// Los puntos universales se administran dentro de ProgresoHabilidadesJugador.
export const CONFIGURACION_PROGRESION = Object.freeze({
  experienciaBase: 20,
  exponenteCrecimiento: 1.35,
  puntosAtributoPorNivel: 1,
  // Alias conservados para analizadores existentes. La bonificación queda
  // permanece desactivada por la regla vigente de progresión.
  puntosPorNivel: 1,
  intervaloPuntosExtra: null,
  puntosExtra: 0,
});

// Los enemigos conservan sus valores configurados
// como referencia relativa entre criaturas.
const FACTOR_BASE_EXPERIENCIA_ENEMIGOS = 0.45;

// Cada tramo representa la diferencia:
//
// nivelEnemigo - nivelJugador
const TRAMOS_DIFERENCIA_NIVEL = Object.freeze([
  Object.freeze({ diferenciaMaxima: -5, multiplicador: 0.1 }),
  Object.freeze({ diferenciaMaxima: -4, multiplicador: 0.2 }),
  Object.freeze({ diferenciaMaxima: -3, multiplicador: 0.35 }),
  Object.freeze({ diferenciaMaxima: -2, multiplicador: 0.55 }),
  Object.freeze({ diferenciaMaxima: -1, multiplicador: 0.75 }),
  Object.freeze({ diferenciaMaxima: 0, multiplicador: 1 }),
  Object.freeze({ diferenciaMaxima: 1, multiplicador: 1.1 }),
  Object.freeze({ diferenciaMaxima: 2, multiplicador: 1.2 }),
  Object.freeze({ diferenciaMaxima: null, multiplicador: 1.25 }),
]);

export const CONFIGURACION_RECOMPENSAS_EXPERIENCIA = Object.freeze({
  factorBaseExperienciaEnemigos: FACTOR_BASE_EXPERIENCIA_ENEMIGOS,
  tramosDiferenciaNivel: TRAMOS_DIFERENCIA_NIVEL,
});

export function calcularExperienciaNecesaria(nivel) {
  validarNivel({ nivel, descripcion: "El nivel" });

  return Math.floor(
    CONFIGURACION_PROGRESION.experienciaBase *
      Math.pow(nivel, CONFIGURACION_PROGRESION.exponenteCrecimiento),
  );
}

export function calcularExperienciaAcumuladaParaNivel(nivelObjetivo) {
  validarNivel({
    nivel: nivelObjetivo,
    descripcion: "El nivel objetivo",
  });

  let experienciaAcumulada = 0;

  for (let nivelActual = 1; nivelActual < nivelObjetivo; nivelActual++) {
    experienciaAcumulada += calcularExperienciaNecesaria(nivelActual);
  }

  return experienciaAcumulada;
}

export function crearTablaProgresion(nivelMaximo = NIVEL_MAXIMO_PLANIFICADO) {
  validarNivel({
    nivel: nivelMaximo,
    descripcion: "El nivel máximo",
  });

  const filas = [];

  for (let nivel = 1; nivel <= nivelMaximo; nivel++) {
    filas.push({
      nivel,
      experienciaParaSiguiente: calcularExperienciaNecesaria(nivel),
      experienciaAcumulada: calcularExperienciaAcumuladaParaNivel(nivel),
      puntosAtributoAlSubir:
        nivel === 1 ? 0 : calcularPuntosAtributoGanados(nivel),
    });
  }

  return filas;
}

// La regla anterior otorgaba dos puntos adicionales en niveles 5, 10, etc.
// La especificación de magia reemplaza esa excepción: cada transición de
// nivel entrega exactamente un punto de atributo.
export function calcularPuntosAtributoGanados(nivelAlcanzado) {
  validarNivel({
    nivel: nivelAlcanzado,
    descripcion: "El nivel alcanzado",
  });

  return CONFIGURACION_PROGRESION.puntosAtributoPorNivel;
}

export function obtenerAjusteExperienciaEnemigo({
  nivelJugador,
  nivelEnemigo,
} = {}) {
  validarNivel({
    nivel: nivelJugador,
    descripcion: "El nivel del jugador",
  });
  validarNivel({
    nivel: nivelEnemigo,
    descripcion: "El nivel del enemigo",
  });

  const diferenciaNiveles = nivelEnemigo - nivelJugador;
  const tramo = TRAMOS_DIFERENCIA_NIVEL.find(
    (entrada) =>
      entrada.diferenciaMaxima === null ||
      diferenciaNiveles <= entrada.diferenciaMaxima,
  );

  if (!tramo) {
    throw new Error(
      "No se encontró un tramo de experiencia para la diferencia de niveles.",
    );
  }

  const multiplicadorDiferencia = tramo.multiplicador;
  const factorTotal =
    FACTOR_BASE_EXPERIENCIA_ENEMIGOS * multiplicadorDiferencia;

  return {
    nivelJugador,
    nivelEnemigo,
    diferenciaNiveles,
    factorBase: FACTOR_BASE_EXPERIENCIA_ENEMIGOS,
    multiplicadorDiferencia,
    factorTotal,
  };
}

export function calcularRecompensaExperiencia({
  experienciaBase,
  nivelJugador,
  nivelEnemigo,
} = {}) {
  if (!Number.isInteger(experienciaBase) || experienciaBase < 0) {
    throw new Error(
      "La experiencia base del enemigo debe ser un entero igual o mayor que 0.",
    );
  }

  const ajuste = obtenerAjusteExperienciaEnemigo({
    nivelJugador,
    nivelEnemigo,
  });
  const experienciaSinRedondear = experienciaBase * ajuste.factorTotal;
  const experienciaFinal =
    experienciaBase === 0
      ? 0
      : Math.max(1, Math.round(experienciaSinRedondear));

  return {
    experienciaBase,
    experienciaSinRedondear,
    experienciaFinal,
    ...ajuste,
  };
}

function validarNivel({ nivel, descripcion }) {
  if (!Number.isInteger(nivel) || nivel < 1) {
    throw new Error(`${descripcion} debe ser un entero mayor que 0.`);
  }
}
