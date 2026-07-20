// Configuración inicial del crecimiento por niveles.
// Estos valores se podrán balancear desde un único archivo.
const CONFIGURACION_PROGRESION = {
  experienciaBase: 20,
  exponenteCrecimiento: 1.35,
  puntosPorNivel: 1,
  intervaloPuntosExtra: 5,
  puntosExtra: 2,
};

// Calcula la experiencia necesaria para pasar
// desde el nivel actual al siguiente.
export function calcularExperienciaNecesaria(nivel) {
  if (!Number.isInteger(nivel) || nivel < 1) {
    throw new Error("El nivel debe ser un entero mayor que 0.");
  }

  return Math.floor(
    CONFIGURACION_PROGRESION.experienciaBase *
      Math.pow(nivel, CONFIGURACION_PROGRESION.exponenteCrecimiento),
  );
}

// Calcula los puntos recibidos al alcanzar un nivel.
export function calcularPuntosAtributoGanados(nivelAlcanzado) {
  let puntos = CONFIGURACION_PROGRESION.puntosPorNivel;

  if (nivelAlcanzado % CONFIGURACION_PROGRESION.intervaloPuntosExtra === 0) {
    puntos += CONFIGURACION_PROGRESION.puntosExtra;
  }

  return puntos;
}
