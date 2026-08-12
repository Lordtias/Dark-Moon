import { contieneCasillaHabitacion } from "./PlanoMazmorra.js";
import { crearClave, seleccionarPonderado } from "./UtilidadesPoblacionMazmorra.js";

const DIRECCIONES_CARDINALES = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: -1 }),
]);

// Traduce composiciones humanas de grilla a posiciones reales dentro de una
// habitación ya generada. No crea geometría ni entidades: solamente propone
// aplicaciones completas que otros sistemas canónicos pueden validar y poblar.
export function crearCandidatosComposicionHabitacion({
  habitacion,
  composiciones,
  celdas,
  posicionesNoDisponibles = new Set(),
  aleatorio,
} = {}) {
  validarEntrada({
    habitacion,
    composiciones,
    celdas,
    posicionesNoDisponibles,
    aleatorio,
  });

  const orientacionPreferida = resolverOrientacionPreferida(habitacion);
  const compatibles = composiciones.filter((composicion) =>
    cabeComposicion({ habitacion, composicion }),
  );
  const ordenadas = ordenarComposiciones({
    composiciones: compatibles,
    orientacionPreferida,
    aleatorio,
  });
  const candidatos = [];

  for (const composicion of ordenadas) {
    const { ancho, alto } = obtenerDimensionesGrilla(composicion.grilla);
    const origenes = [];
    for (
      let y = habitacion.y;
      y <= habitacion.y + habitacion.alto - alto;
      y++
    ) {
      for (
        let x = habitacion.x;
        x <= habitacion.x + habitacion.ancho - ancho;
        x++
      ) {
        origenes.push({ x, y });
      }
    }

    for (const origen of aleatorio.mezclar(origenes)) {
      const candidato = construirCandidato({
        habitacion,
        composicion,
        origen,
        celdas,
        posicionesNoDisponibles,
      });
      if (candidato) candidatos.push(candidato);
    }
  }

  return candidatos;
}

function construirCandidato({
  habitacion,
  composicion,
  origen,
  celdas,
  posicionesNoDisponibles,
}) {
  const obligatorios = [];
  const opcionales = [];
  const contraPared = new Set(
    (composicion.contraPared ?? []).map(({ x, y }) => `${x},${y}`),
  );

  for (let yLocal = 0; yLocal < composicion.grilla.length; yLocal++) {
    const fila = composicion.grilla[yLocal];
    for (let xLocal = 0; xLocal < fila.length; xLocal++) {
      const simbolo = fila[xLocal];
      if (simbolo === ".") continue;

      const posicion = {
        x: origen.x + xLocal,
        y: origen.y + yLocal,
      };
      const clave = crearClave(posicion);
      const requierePared = contraPared.has(`${xLocal},${yLocal}`);
      const disponible =
        celdas?.[posicion.y]?.[posicion.x] === "." &&
        contieneCasillaHabitacion(habitacion, posicion) &&
        !posicionesNoDisponibles.has(clave) &&
        (!requierePared ||
          posicionEstaContraPared({ posicion, habitacion, celdas }));

      if (simbolo === "?") {
        if (disponible) {
          opcionales.push({
            posicion,
            configuracion: composicion.opcional,
          });
        }
        continue;
      }

      if (!disponible) return null;
      const entrada = composicion.leyenda?.[simbolo];
      if (!entrada?.id) return null;
      obligatorios.push({
        id: entrada.id,
        simbolo,
        posicion,
      });
    }
  }

  return {
    idComposicion: composicion.id,
    orientacion: composicion.orientacion,
    origen: { ...origen },
    obligatorios,
    opcionales,
  };
}

function posicionEstaContraPared({ posicion, habitacion, celdas }) {
  return DIRECCIONES_CARDINALES.some((direccion) => {
    const adyacente = {
      x: posicion.x + direccion.x,
      y: posicion.y + direccion.y,
    };
    if (contieneCasillaHabitacion(habitacion, adyacente)) return false;
    return celdas?.[adyacente.y]?.[adyacente.x] !== ".";
  });
}

function ordenarComposiciones({
  composiciones,
  orientacionPreferida,
  aleatorio,
}) {
  const preferidas = composiciones.filter(
    (composicion) => composicion.orientacion === orientacionPreferida,
  );
  const alternativas = composiciones.filter(
    (composicion) => composicion.orientacion !== orientacionPreferida,
  );

  return [
    ...ordenarPonderadoSinRepeticion(preferidas, aleatorio),
    ...ordenarPonderadoSinRepeticion(alternativas, aleatorio),
  ];
}

function ordenarPonderadoSinRepeticion(composiciones, aleatorio) {
  const pendientes = composiciones.map((composicion) => ({
    ...composicion,
    peso: composicion.peso ?? 1,
  }));
  const resultado = [];

  while (pendientes.length > 0) {
    const elegida = seleccionarPonderado(pendientes, aleatorio);
    resultado.push(elegida);
    pendientes.splice(
      pendientes.findIndex((composicion) => composicion.id === elegida.id),
      1,
    );
  }

  return resultado;
}

function resolverOrientacionPreferida(habitacion) {
  if (habitacion.ancho > habitacion.alto) return "horizontal";
  if (habitacion.alto > habitacion.ancho) return "vertical";
  return "horizontal";
}

function cabeComposicion({ habitacion, composicion }) {
  const { ancho, alto } = obtenerDimensionesGrilla(composicion.grilla);
  return ancho <= habitacion.ancho && alto <= habitacion.alto;
}

function obtenerDimensionesGrilla(grilla) {
  return {
    ancho: grilla[0]?.length ?? 0,
    alto: grilla.length,
  };
}

function validarEntrada({
  habitacion,
  composiciones,
  celdas,
  posicionesNoDisponibles,
  aleatorio,
}) {
  if (
    !habitacion ||
    !Number.isInteger(habitacion.x) ||
    !Number.isInteger(habitacion.y) ||
    !Number.isInteger(habitacion.ancho) ||
    !Number.isInteger(habitacion.alto)
  ) {
    throw new Error("Se necesita una habitación geométrica válida.");
  }
  if (!Array.isArray(composiciones) || composiciones.length === 0) {
    throw new Error("Se necesitan composiciones de habitación configuradas.");
  }
  if (!Array.isArray(celdas)) {
    throw new Error("Se necesita la matriz del mapa para aplicar composiciones.");
  }
  if (!(posicionesNoDisponibles instanceof Set)) {
    throw new Error("Las posiciones no disponibles deben recibirse como Set.");
  }
  if (!aleatorio || typeof aleatorio.mezclar !== "function") {
    throw new Error("Se necesita un generador aleatorio para elegir composiciones.");
  }
}
