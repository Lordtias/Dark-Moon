export const ANCHO_REFERENCIA_PHASER = 1024;
export const ALTO_REFERENCIA_PHASER = 640;
export const TAMANO_CASILLA_REFERENCIA = 32;

export const CONFIGURACION_CAMARA_PHASER = Object.freeze({
  zoomMinimo: 0.8,
  zoomMaximo: 1.6,
  pasoZoom: 0.1,
  velocidadTecladoPixelesVisiblesSegundo: 420,
  retardoDobleClicMs: 320,
});

// La resolución es una referencia visual. No limita el tamaño real de los
// mapas: la cámara recorre un mundo que conserva casillas lógicas de 32 × 32.
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
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: ANCHO_REFERENCIA_PHASER,
      height: ALTO_REFERENCIA_PHASER,
      expandParent: true,
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
    Phaser.Scale.RESIZE === undefined ||
    Phaser.Scale.NO_CENTER === undefined
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
