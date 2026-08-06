import {
  calcularDistanciaCuadricula,
  evaluarLineaVision,
} from "../combate/SistemaAlcanceAtaque.js";

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
      if (!esCasillaSuelo(mapa, x, y)) continue;
      if (calcularDistanciaCuadricula(centro, destino) > radio) continue;
      if (!esCasillaAlcanzablePorPolitica({
        mapa,
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

export function esCasillaAlcanzablePorPolitica({
  mapa,
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
    return evaluarLineaVision({ mapa, origen, destino }).despejada === true;
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

function esCasillaSuelo(mapa, x, y) {
  return (
    y >= 0 &&
    y < mapa.length &&
    x >= 0 &&
    x < mapa[y].length &&
    mapa[y][x] !== "#"
  );
}

function compararCasillas(a, b) {
  return a.y - b.y || a.x - b.x;
}
