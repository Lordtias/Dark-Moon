const PARED = "#";
const SUELO = ".";

const LADOS_MAPA = Object.freeze({
  ARRIBA: "arriba",
  DERECHA: "derecha",
  ABAJO: "abajo",
  IZQUIERDA: "izquierda",
});

const ORDEN_LADOS = Object.freeze([
  LADOS_MAPA.ARRIBA,
  LADOS_MAPA.DERECHA,
  LADOS_MAPA.ABAJO,
  LADOS_MAPA.IZQUIERDA,
]);

// Reserva dentro del plano una única conexión física hacia el borde.
//
// No crea el portal jugable ni decide transiciones de mapa. Solamente talla
// el acceso estructural que el portal vigente utilizará después.
export function planificarSalidaEstructural({
  celdas,
  habitaciones,
  zonasCandidatasSalida,
  ancho,
  alto,
} = {}) {
  validarParametros({
    celdas,
    habitaciones,
    zonasCandidatasSalida,
    ancho,
    alto,
  });

  const habitacionesPorId = new Map(
    habitaciones.map((habitacion) => [habitacion.id, habitacion]),
  );

  for (const zona of zonasCandidatasSalida) {
    const habitacion = habitacionesPorId.get(zona.idHabitacion);
    if (!habitacion) continue;

    const candidatos = ORDEN_LADOS.map((lado) =>
      crearCandidato({
        lado,
        habitacion,
        ancho,
        alto,
      }),
    )
      .filter((candidato) =>
        esCandidatoValido({
          candidato,
          celdas,
          habitacion,
        }),
      )
      .sort(
        (a, b) =>
          a.longitudExterior - b.longitudExterior ||
          ORDEN_LADOS.indexOf(a.lado) - ORDEN_LADOS.indexOf(b.lado),
      );

    const seleccionado = candidatos[0] ?? null;
    if (!seleccionado) continue;

    const casillasExcavadas = [];

    for (const casilla of seleccionado.recorridoInterior) {
      if (celdas[casilla.y][casilla.x] === PARED) {
        celdas[casilla.y][casilla.x] = SUELO;
        casillasExcavadas.push({ ...casilla });
      }
    }

    const casillasPasillo = seleccionado.recorridoInterior
      .filter((casilla) => !contiene(habitacion, casilla))
      .map((casilla) => ({ ...casilla }));
    const primeraExterior = casillasPasillo[0] ?? seleccionado.posicionAcceso;
    const idPasillo = "pasillo_salida";

    return {
      salidaEstructural: {
        idHabitacion: habitacion.id,
        idPasillo,
        lado: seleccionado.lado,
        posicionPortal: { ...seleccionado.posicionPortal },
        posicionAcceso: { ...seleccionado.posicionAcceso },
        casillasConexionBorde: casillasPasillo,
        casillasExcavadas,
        casillasReservadas: deduplicarCasillas([
          ...casillasPasillo,
          seleccionado.posicionAcceso,
        ]),
      },
      pasillo: {
        id: idPasillo,
        tipo: "salida",
        ancho: 1,
        longitud: casillasPasillo.length,
        casillas: casillasPasillo,
      },
      puntosConexion: [
        {
          tipo: "acceso_habitacion",
          x: primeraExterior.x,
          y: primeraExterior.y,
          idHabitacion: habitacion.id,
          idPasillo,
        },
        {
          tipo: "zona_transicion",
          x: seleccionado.posicionAcceso.x,
          y: seleccionado.posicionAcceso.y,
          idHabitacion: habitacion.id,
          idPasillo,
        },
      ],
    };
  }

  return null;
}

function crearCandidato({ lado, habitacion, ancho, alto }) {
  const origen = habitacion.centro;

  switch (lado) {
    case LADOS_MAPA.ARRIBA:
      return crearDescriptor({
        lado,
        habitacion,
        posicionPortal: { x: origen.x, y: 0 },
        posicionAcceso: { x: origen.x, y: 1 },
        recorridoInterior: crearRecorridoVertical({
          x: origen.x,
          desdeY: origen.y,
          hastaY: 1,
        }),
      });

    case LADOS_MAPA.DERECHA:
      return crearDescriptor({
        lado,
        habitacion,
        posicionPortal: { x: ancho - 1, y: origen.y },
        posicionAcceso: { x: ancho - 2, y: origen.y },
        recorridoInterior: crearRecorridoHorizontal({
          y: origen.y,
          desdeX: origen.x,
          hastaX: ancho - 2,
        }),
      });

    case LADOS_MAPA.ABAJO:
      return crearDescriptor({
        lado,
        habitacion,
        posicionPortal: { x: origen.x, y: alto - 1 },
        posicionAcceso: { x: origen.x, y: alto - 2 },
        recorridoInterior: crearRecorridoVertical({
          x: origen.x,
          desdeY: origen.y,
          hastaY: alto - 2,
        }),
      });

    case LADOS_MAPA.IZQUIERDA:
      return crearDescriptor({
        lado,
        habitacion,
        posicionPortal: { x: 0, y: origen.y },
        posicionAcceso: { x: 1, y: origen.y },
        recorridoInterior: crearRecorridoHorizontal({
          y: origen.y,
          desdeX: origen.x,
          hastaX: 1,
        }),
      });

    default:
      throw new Error(`El lado estructural "${lado}" no es válido.`);
  }
}

function crearDescriptor({
  lado,
  habitacion,
  posicionPortal,
  posicionAcceso,
  recorridoInterior,
}) {
  return {
    lado,
    posicionPortal,
    posicionAcceso,
    recorridoInterior,
    longitudExterior: recorridoInterior.filter(
      (casilla) => !contiene(habitacion, casilla),
    ).length,
  };
}

function esCandidatoValido({ candidato, celdas, habitacion }) {
  const portal = candidato.posicionPortal;

  if (celdas[portal.y]?.[portal.x] !== PARED) {
    return false;
  }

  let salioDeHabitacion = false;

  for (const casilla of candidato.recorridoInterior) {
    const perteneceHabitacion = contiene(habitacion, casilla);

    if (!perteneceHabitacion) {
      salioDeHabitacion = true;
    }

    // Una vez que el corredor abandona la habitación elegida debe atravesar
    // solamente pared. Así no crea atajos silenciosos hacia otros pasillos o
    // habitaciones que no formen parte del grafo estructural existente.
    if (salioDeHabitacion && celdas[casilla.y]?.[casilla.x] !== PARED) {
      return false;
    }
  }

  return salioDeHabitacion;
}

function crearRecorridoHorizontal({ y, desdeX, hastaX }) {
  const paso = desdeX <= hastaX ? 1 : -1;
  const recorrido = [];

  for (let x = desdeX; ; x += paso) {
    recorrido.push({ x, y });
    if (x === hastaX) break;
  }

  return recorrido;
}

function crearRecorridoVertical({ x, desdeY, hastaY }) {
  const paso = desdeY <= hastaY ? 1 : -1;
  const recorrido = [];

  for (let y = desdeY; ; y += paso) {
    recorrido.push({ x, y });
    if (y === hastaY) break;
  }

  return recorrido;
}

function contiene(habitacion, casilla) {
  return (
    casilla.x >= habitacion.x &&
    casilla.x < habitacion.x + habitacion.ancho &&
    casilla.y >= habitacion.y &&
    casilla.y < habitacion.y + habitacion.alto
  );
}

function deduplicarCasillas(casillas) {
  const claves = new Set();
  const resultado = [];

  for (const casilla of casillas) {
    const clave = `${casilla.x},${casilla.y}`;
    if (claves.has(clave)) continue;
    claves.add(clave);
    resultado.push({ x: casilla.x, y: casilla.y });
  }

  return resultado;
}

function validarParametros({
  celdas,
  habitaciones,
  zonasCandidatasSalida,
  ancho,
  alto,
}) {
  if (!Array.isArray(celdas) || celdas.length !== alto || ancho < 3 || alto < 3) {
    throw new Error("Se necesita una matriz mutable válida para planificar la salida.");
  }

  if (!Array.isArray(habitaciones) || habitaciones.length < 2) {
    throw new Error("La salida estructural necesita habitaciones válidas.");
  }

  if (!Array.isArray(zonasCandidatasSalida) || zonasCandidatasSalida.length === 0) {
    throw new Error("La salida estructural necesita zonas candidatas.");
  }
}
