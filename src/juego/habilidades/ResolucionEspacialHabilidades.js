import {
  calcularDistanciaCuadricula,
  evaluarLineaVisionCuadricula,
} from "../espacio/GeometriaCuadricula.js";
import { consultarTerrenoMapa } from "../espacio/SistemaEspacial.js";

// Políticas canónicas para resolver cómo una forma de habilidad interactúa con
// paredes y esquinas. Este módulo no conoce daño, efectos, animaciones ni UI.
export const POLITICAS_OBSTACULOS_HABILIDAD = Object.freeze({
  IGNORAR: "ignorar",
  VISION_DESDE_CENTRO: "vision_desde_centro",
  DETENER_EN_OBSTACULO: "detener_en_obstaculo",
  VISION_ENTRE_SALTOS: "vision_entre_saltos",
});

export function resolverCasillasRadioConObstaculos({
  mapa,
  sistemaEspacial = null,
  centro,
  radio,
  politicaObstaculos = POLITICAS_OBSTACULOS_HABILIDAD.VISION_DESDE_CENTRO,
} = {}) {
  validarMapa(mapa);
  validarPosicion(centro, "centro del área");
  if (!Number.isInteger(radio) || radio < 0) {
    throw new Error("El radio de habilidad debe ser un entero no negativo.");
  }
  validarPolitica(politicaObstaculos);

  const casillas = [];
  for (let y = centro.y - radio; y <= centro.y + radio; y += 1) {
    for (let x = centro.x - radio; x <= centro.x + radio; x += 1) {
      const destino = { x, y };
      if (!esCasillaSuelo(mapa, x, y, sistemaEspacial)) continue;
      if (calcularDistanciaCuadricula(centro, destino) > radio) continue;
      if (!esCasillaAlcanzablePorPolitica({
        mapa,
        sistemaEspacial,
        origen: centro,
        destino,
        politicaObstaculos,
      })) continue;
      casillas.push(destino);
    }
  }

  return casillas.sort(compararCasillas);
}

export function resolverRecorridoCadenaConObstaculos({
  mapa,
  sistemaEspacial = null,
  objetivoPrimario,
  objetivos = [],
  maximoObjetivos,
  alcanceSalto,
  politicaObstaculos = POLITICAS_OBSTACULOS_HABILIDAD.VISION_ENTRE_SALTOS,
} = {}) {
  validarMapa(mapa);
  validarPosicion(objetivoPrimario, "objetivo primario de la cadena");
  if (!Array.isArray(objetivos)) {
    throw new Error("Los objetivos de cadena deben estar dentro de una lista.");
  }
  if (!Number.isInteger(maximoObjetivos) || maximoObjetivos <= 0) {
    throw new Error("La cadena necesita un máximo de objetivos positivo.");
  }
  if (!Number.isInteger(alcanceSalto) || alcanceSalto <= 0) {
    throw new Error("La cadena necesita un alcance de salto positivo.");
  }
  validarPolitica(politicaObstaculos);

  const seleccionados = [objetivoPrimario];
  const visitados = new Set([objetivoPrimario]);

  while (seleccionados.length < maximoObjetivos) {
    const actual = seleccionados.at(-1);
    const siguiente = objetivos
      .filter((objetivo) => {
        if (visitados.has(objetivo)) return false;
        validarPosicion(objetivo, "candidato de cadena");
        if (calcularDistanciaCuadricula(actual, objetivo) > alcanceSalto) {
          return false;
        }
        return esCasillaAlcanzablePorPolitica({
          mapa,
          sistemaEspacial,
          origen: actual,
          destino: objetivo,
          politicaObstaculos,
        });
      })
      .sort((a, b) => {
        const distancia =
          calcularDistanciaCuadricula(actual, a) -
          calcularDistanciaCuadricula(actual, b);
        return distancia || compararCasillas(a, b);
      })[0];

    if (!siguiente) break;
    seleccionados.push(siguiente);
    visitados.add(siguiente);
  }

  return seleccionados;
}

// Construye una línea discreta que parte del lanzador, pasa por la casilla
// seleccionada y continúa hasta la longitud configurada. El eje se detiene en
// el primer obstáculo; las casillas laterales bloqueadas se excluyen sin hacer
// que el resto del eje atraviese paredes.
export function resolverLineaHastaObstaculo({
  mapa,
  sistemaEspacial = null,
  origen,
  destino,
  longitud,
  ancho = 1,
  politicaObstaculos = POLITICAS_OBSTACULOS_HABILIDAD.DETENER_EN_OBSTACULO,
} = {}) {
  validarMapa(mapa);
  validarPosicion(origen, "origen de la línea");
  validarPosicion(destino, "destino de la línea");
  if (!Number.isInteger(longitud) || longitud <= 0) {
    throw new Error("La línea de habilidad necesita una longitud positiva.");
  }
  if (!Number.isInteger(ancho) || ancho <= 0) {
    throw new Error("La línea de habilidad necesita un ancho positivo.");
  }
  validarPolitica(politicaObstaculos);

  const diferencia = {
    x: destino.x - origen.x,
    y: destino.y - origen.y,
  };
  const distancia = calcularDistanciaCuadricula(origen, destino);
  if (distancia === 0) return [];

  const direccion = {
    x: diferencia.x / distancia,
    y: diferencia.y / distancia,
  };
  const perpendicular = { x: -direccion.y, y: direccion.x };
  const offsets = crearOffsetsCentrados(ancho);
  const casillas = [];
  const claves = new Set();

  for (let avance = 1; avance <= longitud; avance += 1) {
    const eje = {
      x: Math.round(origen.x + direccion.x * avance),
      y: Math.round(origen.y + direccion.y * avance),
    };

    if (!esCasillaSuelo(mapa, eje.x, eje.y, sistemaEspacial)) break;
    if (
      politicaObstaculos !== POLITICAS_OBSTACULOS_HABILIDAD.IGNORAR &&
      !evaluarLineaVisionCuadricula({
        mapa,
        sistemaEspacial,
        origen,
        destino: eje,
      }).despejada
    ) {
      break;
    }

    for (const offset of offsets) {
      const casilla = {
        x: Math.round(eje.x + perpendicular.x * offset),
        y: Math.round(eje.y + perpendicular.y * offset),
      };
      if (!esCasillaSuelo(mapa, casilla.x, casilla.y, sistemaEspacial)) continue;
      const clave = `${casilla.x}:${casilla.y}`;
      if (claves.has(clave)) continue;
      claves.add(clave);
      casillas.push({ ...casilla, orden: avance - 1 });
    }
  }

  return casillas.sort((a, b) => a.orden - b.orden || compararCasillas(a, b));
}

export function esCasillaAlcanzablePorPolitica({
  mapa,
  sistemaEspacial = null,
  origen,
  destino,
  politicaObstaculos,
} = {}) {
  validarMapa(mapa);
  validarPosicion(origen, "origen de habilidad");
  validarPosicion(destino, "destino de habilidad");
  validarPolitica(politicaObstaculos);

  if (politicaObstaculos === POLITICAS_OBSTACULOS_HABILIDAD.IGNORAR) {
    return true;
  }

  if (
    politicaObstaculos ===
      POLITICAS_OBSTACULOS_HABILIDAD.VISION_DESDE_CENTRO ||
    politicaObstaculos ===
      POLITICAS_OBSTACULOS_HABILIDAD.VISION_ENTRE_SALTOS ||
    politicaObstaculos ===
      POLITICAS_OBSTACULOS_HABILIDAD.DETENER_EN_OBSTACULO
  ) {
    return (
      evaluarLineaVisionCuadricula({ mapa, sistemaEspacial, origen, destino }).despejada ===
      true
    );
  }

  return false;
}

export function validarPoliticaObstaculosHabilidad(valor) {
  validarPolitica(valor);
  return valor;
}

function validarPolitica(valor) {
  if (!Object.values(POLITICAS_OBSTACULOS_HABILIDAD).includes(valor)) {
    throw new Error(`La política de obstáculos "${valor}" no está soportada.`);
  }
}

function validarMapa(mapa) {
  if (!Array.isArray(mapa) || mapa.length === 0) {
    throw new Error("La resolución espacial necesita un mapa válido.");
  }
}

function validarPosicion(posicion, descripcion) {
  if (!Number.isInteger(posicion?.x) || !Number.isInteger(posicion?.y)) {
    throw new Error(`Se necesita una posición entera válida para ${descripcion}.`);
  }
}

function crearOffsetsCentrados(cantidad) {
  const inicio = -Math.floor((cantidad - 1) / 2);
  return Array.from({ length: cantidad }, (_, indice) => inicio + indice);
}

function esCasillaSuelo(mapa, x, y, sistemaEspacial) {
  const terreno = sistemaEspacial?.consultarTerreno
    ? sistemaEspacial.consultarTerreno(x, y)
    : consultarTerrenoMapa(mapa, x, y);
  return terreno.dentroMapa && !terreno.bloqueaMovimiento;
}

function compararCasillas(a, b) {
  return a.y - b.y || a.x - b.x;
}
