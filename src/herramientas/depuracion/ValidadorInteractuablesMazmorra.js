import { Cofre } from "../../entidad/interactuable/Cofre.js";
import { PortalMapa } from "../../entidad/interactuable/PortalMapa.js";
import {
  ORIENTACIONES_PUERTA,
  Puerta,
} from "../../entidad/interactuable/Puerta.js";
import {
  analizarAccesoHabitacion,
  contieneCasillaHabitacion,
} from "../../juego/generacion/PlanoMazmorra.js";

const DIRECCIONES_CARDINALES = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

// Valida los invariantes estructurales de los interactuables procedurales sin
// participar del runtime.
export function validarInteractuablesMazmorra({
  plano,
  contenido,
  posicionJugador = plano?.posicionInicialSugerida,
} = {}) {
  validarObjeto(plano, "el plano de mazmorra");
  validarObjeto(contenido, "el contenido generado");

  const errores = [];
  const interactuables = Array.isArray(contenido.interactuables)
    ? contenido.interactuables
    : [];
  const objetivos = Array.isArray(contenido.objetivos) ? contenido.objetivos : [];
  const resumen = contenido.resumen?.interactuablesProcedurales ?? {};
  const portales = interactuables.filter((entidad) => entidad instanceof PortalMapa);
  const puertas = interactuables.filter((entidad) => entidad instanceof Puerta);
  const cofres = interactuables.filter((entidad) => entidad instanceof Cofre);
  const idHabitacionEntrada = plano.zonaEntrada?.idHabitacion ?? null;
  const idHabitacionEspecial = plano.salidaEstructural?.idHabitacion ?? null;
  const idPasilloSalida = plano.salidaEstructural?.idPasillo ?? "pasillo_salida";
  const idsHabitacionesAmbientales = new Set(
    plano.planPoblacion?.idsHabitacionesAmbientales ??
      contenido.resumen?.planPoblacion?.idsHabitacionesAmbientales ??
      [],
  );

  comprobar(portales.length === 1, "Debe existir exactamente un portal de entrada procedural.", errores);
  if (portales[0]) {
    comprobar(portales[0].activo === false, "El portal de entrada debe comenzar inactivo.", errores);
    comprobar(
      distanciaCuadricula(portales[0], posicionJugador) === 1,
      "El portal de entrada debe quedar adyacente al jugador.",
      errores,
    );
    const entrada = new Set((plano.zonaEntrada?.casillasReservadas ?? []).map(crearClave));
    comprobar(
      entrada.has(crearClave(portales[0])),
      "El portal de entrada debe quedar dentro de la habitación inicial.",
      errores,
    );
  }

  const accesosValidos = new Map();
  for (const punto of plano.puntosConexion ?? []) {
    if (
      punto.tipo !== "acceso_habitacion" ||
      punto.idPasillo === idPasilloSalida ||
      punto.idHabitacion === idHabitacionEntrada
    ) {
      continue;
    }
    const lista = accesosValidos.get(punto.idPasillo) ?? [];
    lista.push(punto);
    accesosValidos.set(punto.idPasillo, lista);
  }

  const pasillosConPuerta = new Set();
  for (const puerta of puertas) {
    const detallePuerta = (resumen.detallePuertas ?? []).find(
      (entrada) => entrada.x === puerta.x && entrada.y === puerta.y,
    );
    const coincidencias = detallePuerta
      ? [...accesosValidos.entries()].filter(
          ([idPasillo, puntos]) =>
            idPasillo === detallePuerta.idPasillo &&
            puntos.some((punto) => punto.x === puerta.x && punto.y === puerta.y),
        )
      : [];
    comprobar(
      coincidencias.length === 1,
      `La puerta en ${crearClave(puerta)} no corresponde a un acceso estructural válido.`,
      errores,
    );
    if (coincidencias[0]) {
      const [idPasillo, puntos] = coincidencias[0];
      comprobar(!pasillosConPuerta.has(idPasillo), `El pasillo ${idPasillo} tiene más de una puerta.`, errores);
      pasillosConPuerta.add(idPasillo);
      const punto = puntos.find((entrada) => entrada.x === puerta.x && entrada.y === puerta.y);
      const habitacion = (plano.habitaciones ?? []).find((entrada) => entrada.id === punto.idHabitacion);
      if (habitacion) {
        validarGeometriaPuerta({
          puerta,
          habitacion,
          celdas: plano.celdas,
          errores,
        });
      }
    }
    comprobar(puerta.abierta === false, `La puerta en ${crearClave(puerta)} debe comenzar cerrada.`, errores);
  }

  comprobar(
    puertas.length === (resumen.cantidadPuertas ?? 0),
    "El resumen de puertas no coincide con las entidades reales.",
    errores,
  );

  const cofreImportante = resumen.cofreImportante ?? null;
  comprobar(Boolean(cofreImportante), "Debe existir el resumen del cofre importante.", errores);
  const entidadCofreImportante = cofreImportante
    ? cofres.find((cofre) => cofre.x === cofreImportante.x && cofre.y === cofreImportante.y)
    : null;
  comprobar(Boolean(entidadCofreImportante), "Debe existir exactamente un cofre importante materializado.", errores);
  comprobar(
    cofreImportante?.idHabitacion === idHabitacionEspecial && cofreImportante?.zonaEspecial === true,
    "El cofre importante debe pertenecer a la zona especial.",
    errores,
  );
  if (entidadCofreImportante) {
    comprobar(!entidadCofreImportante.estaVacio, "El cofre importante no puede comenzar vacío.", errores);
  }

  comprobar(
    cofres.length === 1 + (resumen.cantidadCofresModerados ?? 0),
    "La cantidad de cofres no coincide con el resumen procedural.",
    errores,
  );

  for (const detalleCofre of resumen.cofresModerados ?? []) {
    comprobar(
      !idsHabitacionesAmbientales.has(detalleCofre.idHabitacion),
      `El cofre moderado en ${crearClave(detalleCofre)} ocupa una habitación ambiental.`,
      errores,
    );
  }
  for (const destructible of contenido.resumen?.detalleDestructibles ?? []) {
    comprobar(
      !idsHabitacionesAmbientales.has(destructible.idHabitacion),
      `El destructible en ${crearClave(destructible)} ocupa una habitación ambiental.`,
      errores,
    );
  }

  for (const cofre of cofres) {
    comprobar(
      tieneAccesoCardinal({ entidad: cofre, plano, objetivos, interactuables }),
      `El cofre en ${crearClave(cofre)} no tiene una casilla cardinal accesible.`,
      errores,
    );
    comprobar(!cofre.estaVacio, `El cofre en ${crearClave(cofre)} no debe comenzar vacío.`, errores);
  }

  const ocupadas = new Set();
  for (const entidad of [...objetivos, ...interactuables]) {
    if (!Number.isInteger(entidad?.x) || !Number.isInteger(entidad?.y)) continue;
    const clave = crearClave(entidad);
    comprobar(!ocupadas.has(clave), `Dos entidades procedurales comparten la casilla ${clave}.`, errores);
    ocupadas.add(clave);
    comprobar(
      plano.celdas?.[entidad.y]?.[entidad.x] === ".",
      `La entidad en ${clave} no está sobre terreno transitable.`,
      errores,
    );
  }

  const bloqueosPersistentes = new Set(
    [...objetivos, ...interactuables]
      .filter(
        (entidad) =>
          entidad?.bloqueaMovimiento === true &&
          !(entidad instanceof Puerta) &&
          entidad?.constructor?.name !== "Enemigo",
      )
      .map(crearClave),
  );
  comprobar(
    comprobarConectividad({ plano, bloqueosPersistentes, posicionJugador }),
    "Los cofres/barriles procedurales rompen la conectividad permanente del mapa.",
    errores,
  );

  return {
    valido: errores.length === 0,
    errores,
    metricas: {
      portalesEntrada: portales.length,
      puertas: puertas.length,
      cofres: cofres.length,
      cofresModerados: resumen.cantidadCofresModerados ?? 0,
      barriles: resumen.cantidadBarriles ?? 0,
      habitacionesAmbientales: idsHabitacionesAmbientales.size,
      idHabitacionEspecial,
    },
  };
}

export function exigirInteractuablesMazmorraValidos(parametros = {}) {
  const resultado = validarInteractuablesMazmorra(parametros);
  if (!resultado.valido) {
    throw new Error(
      "Los interactuables procedurales no cumplen sus invariantes:\n- " +
        resultado.errores.join("\n- "),
    );
  }
  return resultado;
}

function tieneAccesoCardinal({ entidad, plano, objetivos, interactuables }) {
  const bloqueadas = new Set(
    [...objetivos, ...interactuables]
      .filter((otra) => otra !== entidad && otra?.bloqueaMovimiento === true)
      .map(crearClave),
  );
  return DIRECCIONES_CARDINALES.some((direccion) => {
    const posicion = { x: entidad.x + direccion.x, y: entidad.y + direccion.y };
    return plano.celdas?.[posicion.y]?.[posicion.x] === "." && !bloqueadas.has(crearClave(posicion));
  });
}

function comprobarConectividad({ plano, bloqueosPersistentes, posicionJugador }) {
  const caminables = new Set((plano.casillasTransitables ?? []).map(crearClave));
  const inicio = crearClave(posicionJugador);
  if (!caminables.has(inicio) || bloqueosPersistentes.has(inicio)) return false;
  const pendientes = [{ ...posicionJugador }];
  const visitadas = new Set([inicio]);
  for (let indice = 0; indice < pendientes.length; indice++) {
    const actual = pendientes[indice];
    for (const direccion of DIRECCIONES_CARDINALES) {
      const siguiente = { x: actual.x + direccion.x, y: actual.y + direccion.y };
      const clave = crearClave(siguiente);
      if (!caminables.has(clave) || bloqueosPersistentes.has(clave) || visitadas.has(clave)) continue;
      visitadas.add(clave);
      pendientes.push(siguiente);
    }
  }
  return visitadas.size === caminables.size - bloqueosPersistentes.size;
}

function distanciaCuadricula(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function validarGeometriaPuerta({ puerta, habitacion, celdas, errores }) {
  const geometria = analizarAccesoHabitacion({ punto: puerta, habitacion });
  comprobar(
    Boolean(geometria),
    `La puerta en ${crearClave(puerta)} debe estar situada sobre el límite de su habitación.`,
    errores,
  );
  if (!geometria) return;

  const orientacionEsperada =
    geometria.ejeLimite === "vertical"
      ? ORIENTACIONES_PUERTA.VERTICAL
      : ORIENTACIONES_PUERTA.HORIZONTAL;
  comprobar(
    puerta.orientacion === orientacionEsperada,
    `La puerta en ${crearClave(puerta)} tiene orientación incorrecta.`,
    errores,
  );
  comprobar(
    celdas?.[puerta.y]?.[puerta.x] === ".",
    `La puerta en ${crearClave(puerta)} no está sobre suelo transitable.`,
    errores,
  );
  comprobar(
    contieneCasillaHabitacion(habitacion, geometria.haciaHabitacion),
    `La puerta en ${crearClave(puerta)} no comunica con el interior de su habitación.`,
    errores,
  );
  comprobar(
    celdas?.[geometria.haciaHabitacion.y]?.[geometria.haciaHabitacion.x] === ".",
    `La puerta en ${crearClave(puerta)} no tiene suelo transitable hacia la habitación.`,
    errores,
  );
  comprobar(
    celdas?.[geometria.haciaExterior.y]?.[geometria.haciaExterior.x] === ".",
    `La puerta en ${crearClave(puerta)} no tiene suelo transitable hacia el pasillo.`,
    errores,
  );
  comprobar(
    celdas?.[geometria.lateralA.y]?.[geometria.lateralA.x] !== "." &&
      celdas?.[geometria.lateralB.y]?.[geometria.lateralB.x] !== ".",
    `La puerta en ${crearClave(puerta)} debe ocupar un umbral de una sola casilla de ancho.`,
    errores,
  );
}

function crearClave(posicion) {
  return `${posicion?.x},${posicion?.y}`;
}

function comprobar(condicion, mensaje, errores) {
  if (!condicion) errores.push(mensaje);
}

function validarObjeto(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}
