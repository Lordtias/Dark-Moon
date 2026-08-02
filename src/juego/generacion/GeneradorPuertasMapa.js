import {
  DIRECCIONES_APERTURA_PUERTA,
  ESTADOS_PUERTA,
  LADOS_BISAGRA_PUERTA,
  ORIENTACIONES_PUERTA,
  Puerta,
} from "../../entidad/interactuable/Puerta.js";
import { COSTOS_TEMPORALES_BASE } from "../tiempo/SistemaTiempo.js";

const SIMBOLO_PARED = "#";

// Agrega interactuables arquitectónicos sin cambiar el generador de terreno.
// La selección se realiza sobre el mapa final y evita posiciones ocupadas.
export function generarPuertasMapa({
  mapa,
  configuracion = null,
  entidadesOcupantes = [],
  semilla = "puertas",
} = {}) {
  validarMapa(mapa);

  if (configuracion === null || configuracion === undefined) {
    return [];
  }

  validarConfiguracion(configuracion);

  const ocupadas = crearPosicionesOcupadas(entidadesOcupantes);
  const candidatas = obtenerCandidatas({ mapa, ocupadas });
  const cantidad = Math.min(configuracion.cantidad, candidatas.length);
  const seleccionadas = seleccionarCandidatasSeparadas({
    candidatas,
    cantidad,
    semilla,
  });

  return seleccionadas.map((candidata, indice) => {
    const direccionApertura = elegirDireccionApertura({
      orientacion: candidata.orientacion,
      x: candidata.x,
      y: candidata.y,
      semilla,
    });
    const ladoBisagra = elegirLadoBisagra({
      direccionApertura,
      x: candidata.x,
      y: candidata.y,
      semilla,
    });
    const puerta = new Puerta({
      id: `${configuracion.prefijoId ?? "puerta"}_${indice + 1}`,
      nombre: configuracion.nombre ?? "Puerta de la mazmorra",
      x: candidata.x,
      y: candidata.y,
      estado: configuracion.estadoInicial ?? ESTADOS_PUERTA.CERRADA,
      orientacion: candidata.orientacion,
      direccionApertura,
      ladoBisagra,
      costoAccion:
        configuracion.costoAccion ?? COSTOS_TEMPORALES_BASE.accion,
    });

    puerta.sincronizarMapa(mapa);
    return puerta;
  });
}

function obtenerCandidatas({ mapa, ocupadas }) {
  const candidatas = [];

  for (let y = 1; y < mapa.length - 1; y += 1) {
    for (let x = 1; x < mapa[y].length - 1; x += 1) {
      if (ocupadas.has(clave(x, y))) {
        continue;
      }

      if (estaCercaDeOcupante({ x, y, ocupadas, distancia: 1 })) {
        continue;
      }

      const paredNorte = mapa[y - 1]?.[x] === SIMBOLO_PARED;
      const paredSur = mapa[y + 1]?.[x] === SIMBOLO_PARED;
      const paredOeste = mapa[y]?.[x - 1] === SIMBOLO_PARED;
      const paredEste = mapa[y]?.[x + 1] === SIMBOLO_PARED;

      const eraPared = mapa[y][x] === SIMBOLO_PARED;
      const aperturaHorizontalExacta =
        paredOeste && paredEste && !paredNorte && !paredSur;
      const aperturaVerticalExacta =
        paredNorte && paredSur && !paredOeste && !paredEste;
      const aperturaHorizontalRelajada =
        !paredNorte &&
        !paredSur &&
        (paredOeste || paredEste);
      const aperturaVerticalRelajada =
        !paredOeste &&
        !paredEste &&
        (paredNorte || paredSur);

      if (aperturaHorizontalExacta || aperturaHorizontalRelajada) {
        candidatas.push({
          x,
          y,
          orientacion: ORIENTACIONES_PUERTA.HORIZONTAL,
          eraPared,
          prioridad: aperturaHorizontalExacta
            ? eraPared
              ? 1
              : 0
            : eraPared
              ? 2
              : 3,
        });
      } else if (aperturaVerticalExacta || aperturaVerticalRelajada) {
        candidatas.push({
          x,
          y,
          orientacion: ORIENTACIONES_PUERTA.VERTICAL,
          eraPared,
          prioridad: aperturaVerticalExacta
            ? eraPared
              ? 1
              : 0
            : eraPared
              ? 2
              : 3,
        });
      }
    }
  }

  return candidatas;
}

function seleccionarCandidatasSeparadas({ candidatas, cantidad, semilla }) {
  const ordenadas = [...candidatas].sort((a, b) => {
    if (a.prioridad !== b.prioridad) {
      return a.prioridad - b.prioridad;
    }

    const hashA = hash(`${semilla}:${a.x},${a.y}:${a.orientacion}`);
    const hashB = hash(`${semilla}:${b.x},${b.y}:${b.orientacion}`);
    return hashA - hashB || a.y - b.y || a.x - b.x;
  });
  const seleccionadas = [];

  for (const candidata of ordenadas) {
    const demasiadoCerca = seleccionadas.some(
      (seleccionada) =>
        Math.max(
          Math.abs(seleccionada.x - candidata.x),
          Math.abs(seleccionada.y - candidata.y),
        ) < 4,
    );

    if (demasiadoCerca) {
      continue;
    }

    seleccionadas.push(candidata);
    if (seleccionadas.length >= cantidad) {
      break;
    }
  }

  return seleccionadas;
}

function elegirDireccionApertura({ orientacion, x, y, semilla }) {
  const par = hash(`${semilla}:direccion:${x},${y}`) % 2 === 0;

  if (orientacion === ORIENTACIONES_PUERTA.HORIZONTAL) {
    return par
      ? DIRECCIONES_APERTURA_PUERTA.NORTE
      : DIRECCIONES_APERTURA_PUERTA.SUR;
  }

  return par
    ? DIRECCIONES_APERTURA_PUERTA.ESTE
    : DIRECCIONES_APERTURA_PUERTA.OESTE;
}

function elegirLadoBisagra({ direccionApertura, x, y, semilla }) {
  // Las aperturas laterales usan la bisagra que mantiene la hoja completa y
  // apoyada visualmente contra el muro. Norte y sur alternan para dar variedad.
  if (direccionApertura === DIRECCIONES_APERTURA_PUERTA.ESTE) {
    return LADOS_BISAGRA_PUERTA.INICIO;
  }
  if (direccionApertura === DIRECCIONES_APERTURA_PUERTA.OESTE) {
    return LADOS_BISAGRA_PUERTA.FIN;
  }

  return hash(`${semilla}:bisagra:${x},${y}`) % 2 === 0
    ? LADOS_BISAGRA_PUERTA.INICIO
    : LADOS_BISAGRA_PUERTA.FIN;
}

function crearPosicionesOcupadas(entidades) {
  if (!Array.isArray(entidades)) {
    throw new Error("Las entidades ocupantes deben estar dentro de una lista.");
  }

  const posiciones = new Set();
  for (const entidad of entidades) {
    if (Array.isArray(entidad?.casillas)) {
      for (const casilla of entidad.casillas) {
        if (Number.isInteger(casilla?.x) && Number.isInteger(casilla?.y)) {
          posiciones.add(clave(casilla.x, casilla.y));
        }
      }
      continue;
    }

    if (Number.isInteger(entidad?.x) && Number.isInteger(entidad?.y)) {
      posiciones.add(clave(entidad.x, entidad.y));
    }
  }

  return posiciones;
}

function estaCercaDeOcupante({ x, y, ocupadas, distancia }) {
  for (let desplazamientoY = -distancia; desplazamientoY <= distancia; desplazamientoY += 1) {
    for (let desplazamientoX = -distancia; desplazamientoX <= distancia; desplazamientoX += 1) {
      if (ocupadas.has(clave(x + desplazamientoX, y + desplazamientoY))) {
        return true;
      }
    }
  }

  return false;
}

function validarConfiguracion(configuracion) {
  if (
    typeof configuracion !== "object" ||
    configuracion === null ||
    Array.isArray(configuracion)
  ) {
    throw new Error("La configuración de puertas debe ser un objeto.");
  }

  if (!Number.isInteger(configuracion.cantidad) || configuracion.cantidad < 0) {
    throw new Error("La cantidad de puertas debe ser un entero no negativo.");
  }

  if (
    configuracion.costoAccion !== undefined &&
    (!Number.isFinite(configuracion.costoAccion) ||
      configuracion.costoAccion <= 0)
  ) {
    throw new Error("El costo de acción de las puertas debe ser positivo.");
  }
}

function validarMapa(mapa) {
  if (
    !Array.isArray(mapa) ||
    mapa.length === 0 ||
    !Array.isArray(mapa[0]) ||
    mapa[0].length === 0
  ) {
    throw new Error("GeneradorPuertasMapa necesita un mapa mutable válido.");
  }
}

function clave(x, y) {
  return `${x},${y}`;
}

function hash(texto) {
  let valor = 2166136261;
  for (let indice = 0; indice < texto.length; indice += 1) {
    valor ^= texto.charCodeAt(indice);
    valor = Math.imul(valor, 16777619);
  }
  return valor >>> 0;
}
