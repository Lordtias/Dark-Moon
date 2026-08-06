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

export function filtrarDestinosVisibles({
  mapa,
  origen,
  destinos = [],
  politicaObstaculos = POLITICAS_OBSTACULOS_HABILIDAD.VISION_ENTRE_SALTOS,
} = {}) {
  validarMapa(mapa);
  validarPosicion(origen, "origen de visibilidad");
  if (!Array.isArray(destinos)) {
    throw new Error("Los destinos visibles deben estar dentro de una lista.");
  }
  validarPolitica(politicaObstaculos);

  return destinos.filter((destino) => {
    validarPosicion(destino, "destino de visibilidad");
    return esCasillaAlcanzablePorPolitica({
      mapa,
      origen,
      destino,
      politicaObstaculos,
    });
  });
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
