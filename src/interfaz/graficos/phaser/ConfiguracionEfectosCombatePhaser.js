export const TIPOS_FEEDBACK_COMBATE = Object.freeze({
  DANIO: "danio",
  FALLO: "fallo",
  BLOQUEO: "bloqueo",
  CRITICO: "critico",
});

export const CONFIGURACION_EFECTOS_COMBATE_PHASER = Object.freeze({
  texto: Object.freeze({
    duracionMs: 420,
    elevacionPx: 15,
    separacionGolpePx: 7,
    escalaInicial: 0.82,
    escalaFinal: 1.05,
    estilos: Object.freeze({
      [TIPOS_FEEDBACK_COMBATE.DANIO]: Object.freeze({
        color: "#fff2d2",
        borde: "#581c16",
        tamano: "13px",
      }),
      [TIPOS_FEEDBACK_COMBATE.FALLO]: Object.freeze({
        color: "#d9eef7",
        borde: "#183a49",
        tamano: "10px",
      }),
      [TIPOS_FEEDBACK_COMBATE.BLOQUEO]: Object.freeze({
        color: "#dce8f1",
        borde: "#263847",
        tamano: "9px",
      }),
      [TIPOS_FEEDBACK_COMBATE.CRITICO]: Object.freeze({
        color: "#ffe08a",
        borde: "#6f2d18",
        tamano: "9px",
      }),
    }),
  }),
  esquiva: Object.freeze({
    duracionMs: 170,
    desplazamientoPx: 5,
  }),
  golpe: Object.freeze({
    pausaEntreGolpesMs: 65,
    impactoCriticoEscala: 1.22,
  }),
  bloqueo: Object.freeze({
    duracionMs: 240,
    escalaInicial: 0.72,
    escalaFinal: 1.2,
  }),
  critico: Object.freeze({
    duracionMs: 250,
    escalaInicial: 0.65,
    escalaFinal: 1.35,
  }),
  barraVida: Object.freeze({
    duracionMs: 180,
  }),
});

export function obtenerEstiloFeedbackCombate(tipo) {
  return (
    CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.estilos[tipo] ??
    CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.estilos[
      TIPOS_FEEDBACK_COMBATE.DANIO
    ]
  );
}
