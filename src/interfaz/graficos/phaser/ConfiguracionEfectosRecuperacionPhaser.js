export const CONFIGURACION_EFECTOS_RECUPERACION_PHASER = Object.freeze({
  recursoVisual: Object.freeze({
    longitudVisiblePx: 24,
    desplazamientoX: 12,
    desplazamientoY: -10,
  }),
  texto: Object.freeze({
    separacionPx: 13,
    elevacionPx: 22,
    tamanoFuente: "12px",
  }),
  recuperacion: Object.freeze({
    entradaMs: 90,
    permanenciaMs: 280,
    salidaMs: 220,
    elevacionSalidaPx: 12,
    escalaInicial: 0.72,
    escalaVisible: 1,
    escalaFinal: 1.1,
  }),
  vida: Object.freeze({
    colorPrincipal: 0xe94b55,
    colorSecundario: 0xffd9dc,
    etiqueta: "VIDA",
  }),
  mana: Object.freeze({
    colorPrincipal: 0x596dff,
    colorSecundario: 0xd7dcff,
    etiqueta: "MANÁ",
  }),
  nivel: Object.freeze({
    entradaMs: 120,
    permanenciaMs: 320,
    salidaMs: 260,
    elevacionSalidaPx: 7,
    escalaInicial: 0.75,
    escalaVisible: 1,
    escalaFinal: 1.16,
    colorPrincipal: 0xfffbec,
    colorSecundario: 0xffe8b8,
    anchoAura: 24,
    altoAura: 36,
    cantidadDestellos: 7,
  }),
});

export function obtenerPerfilRecuperacion(recurso) {
  return recurso === "mana"
    ? CONFIGURACION_EFECTOS_RECUPERACION_PHASER.mana
    : CONFIGURACION_EFECTOS_RECUPERACION_PHASER.vida;
}
