export const ANCHO_REFERENCIA_PHASER = 1024;
export const ALTO_REFERENCIA_PHASER = 640;
export const TAMANO_CASILLA_REFERENCIA = 32;

// La resolución es una referencia técnica inicial. No limita el tamaño real
// de los mapas ni fija la política definitiva de cámara.
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
    backgroundColor: "#101526",
    transparent: false,
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    autoFocus: false,
    input: {
      keyboard: false,
      mouse: false,
      touch: false,
      gamepad: false,
      windowEvents: false,
    },
    dom: {
      createContainer: false,
      pointerEvents: "none",
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
