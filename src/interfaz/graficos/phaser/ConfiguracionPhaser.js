export const ANCHO_REFERENCIA_PHASER = 1024;
export const ALTO_REFERENCIA_PHASER = 640;

// La lógica de Dark Moon trabaja con coordenadas enteras de casilla. Esta
// constante define únicamente la separación visual utilizada por Phaser.
// Puede cambiar sin alterar movimiento, combate, IA ni ocupación canónica.
export const TAMANO_CASILLA_VISUAL_PHASER = 64;

export const PROFUNDIDAD_MUNDO_BASE_PHASER = 1000;
export const PROFUNDIDAD_SELECCION_PHASER = 100000;
export const PROFUNDIDAD_ILUMINACION_PHASER = 110000;

export function calcularProfundidadMundoPhaser(baseY, desplazamiento = 0) {
  const base = Number.isFinite(baseY) ? baseY : 0;
  const ajuste = Number.isFinite(desplazamiento) ? desplazamiento : 0;
  return PROFUNDIDAD_MUNDO_BASE_PHASER + base + ajuste;
}

export const CONFIGURACION_CAMARA_PHASER = Object.freeze({
  zoomInicial: 0.85,
  zoomMinimo: 0.5,
  zoomMaximo: 1.5,
  pasoZoom: 0.05,
  velocidadTecladoPixelesVisiblesSegundo: 420,
  retardoDobleClicMs: 320,
});

// La resolución es una referencia visual. No limita el tamaño real de los
// mapas ni establece la resolución de los PNG del personaje o equipamiento.
export function crearConfiguracionPhaser({
  Phaser,
  host,
  Escena,
  alPrepararCanvas,
} = {}) {
  validarDependencias({ Phaser, host, Escena });

  return {
    type: Phaser.AUTO,
    parent: host,
    width: ANCHO_REFERENCIA_PHASER,
    height: ALTO_REFERENCIA_PHASER,
    backgroundColor: "#101814",
    transparent: false,
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    autoFocus: false,
    input: {
      keyboard: false,
      mouse: true,
      touch: true,
      gamepad: false,
      windowEvents: false,
    },
    dom: {
      createContainer: false,
      pointerEvents: "auto",
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: ANCHO_REFERENCIA_PHASER,
      height: ALTO_REFERENCIA_PHASER,
      expandParent: false,
    },
    callbacks: {
      postBoot: (juegoPhaser) => {
        if (typeof alPrepararCanvas === "function") {
          alPrepararCanvas(juegoPhaser.canvas);
        }
      },
    },
    scene: [Escena],
  };
}

function validarDependencias({ Phaser, host, Escena }) {
  if (
    !Phaser?.Game ||
    !Phaser?.Scale ||
    Phaser.AUTO === undefined ||
    Phaser.Scale.FIT === undefined ||
    Phaser.Scale.CENTER_BOTH === undefined
  ) {
    throw new Error("Se necesita una instalación válida de Phaser.");
  }

  if (!(host instanceof HTMLElement)) {
    throw new Error("Phaser necesita un contenedor propio dentro del mapa.");
  }

  if (typeof Escena !== "function") {
    throw new Error("Phaser necesita una escena de arranque válida.");
  }
}
