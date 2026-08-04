import { TIPOS_ENTIDAD_VISUAL } from "../TiposEscena.js";
import { TAMANO_CASILLA_REFERENCIA } from "./ConfiguracionPhaser.js";

// Esta configuración pertenece exclusivamente al backend Phaser. Las entidades
// del dominio continúan exponiendo solo tipo, posición y recursoVisual.
export const CONFIGURACION_ENTIDADES_PHASER = Object.freeze({
  perspectiva: "cenital",
  anclaje: "centroVisible",
  tamanoLienzo: TAMANO_CASILLA_REFERENCIA,
  opacidadEntidadMuerta: 0.42,
  sombra: Object.freeze({
    desplazamientoX: 0,
    desplazamientoY: 1,
    escalaAnchoVisible: 0.78,
    proporcionAltoSombra: 0.42,
    anchoMinimo: 8,
    anchoMaximo: TAMANO_CASILLA_REFERENCIA - 4,
    altoMinimo: 4,
    altoMaximo: Math.round(TAMANO_CASILLA_REFERENCIA * 0.48),
  }),
  indicadorAgresividad: Object.freeze({
    desplazamientoX: TAMANO_CASILLA_REFERENCIA / 2 - 5,
    desplazamientoY: -TAMANO_CASILLA_REFERENCIA / 2 + 10,
    radio: 4,
    grosorBorde: 1,
    tamanoTexto: "8px",
  }),
  respaldo: Object.freeze({
    tamano: 24,
  }),
});

const ESTILOS_RESPALDO = Object.freeze({
  [TIPOS_ENTIDAD_VISUAL.JUGADOR]: Object.freeze({
    fondo: 0x342e0f,
    borde: 0xd6bd45,
    texto: "#ffe66d",
  }),
  [TIPOS_ENTIDAD_VISUAL.ENEMIGO]: Object.freeze({
    fondo: 0x371015,
    borde: 0xbd4b55,
    texto: "#ffb0b0",
  }),
  [TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE]: Object.freeze({
    fondo: 0x342211,
    borde: 0xa97942,
    texto: "#e2b276",
  }),
  [TIPOS_ENTIDAD_VISUAL.INTERACTUABLE]: Object.freeze({
    fondo: 0x12303d,
    borde: 0x68b7d3,
    texto: "#c8f1ff",
  }),
});

export function obtenerEstiloRespaldoEntidadPhaser(tipo) {
  return (
    ESTILOS_RESPALDO[tipo] ??
    ESTILOS_RESPALDO[TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE]
  );
}

export function calcularPresentacionEntidadPhaser(informacionRecurso) {
  const configuracion = CONFIGURACION_ENTIDADES_PHASER;

  if (!informacionRecurso) {
    return Object.freeze({
      informacionRecurso: null,
      anchoDibujo: configuracion.respaldo.tamano,
      altoDibujo: configuracion.respaldo.tamano,
      anclaje: Object.freeze({ x: 0.5, y: 0.5 }),
      sombraAncho: configuracion.sombra.anchoMinimo,
      sombraAlto: configuracion.sombra.altoMinimo,
      desplazamientoSombraX: configuracion.sombra.desplazamientoX,
      desplazamientoSombraY: configuracion.sombra.desplazamientoY,
    });
  }

  const anchoFuente = Math.max(1, informacionRecurso.ancho);
  const altoFuente = Math.max(1, informacionRecurso.alto);
  const escala =
    configuracion.tamanoLienzo / Math.max(anchoFuente, altoFuente);
  const limites = informacionRecurso.limitesVisibles;
  const anchoVisible = limites.ancho * escala;
  const altoVisible = limites.alto * escala;

  return Object.freeze({
    informacionRecurso,
    anchoDibujo: anchoFuente * escala,
    altoDibujo: altoFuente * escala,
    anclaje:
      informacionRecurso.anclajeCentro ??
      Object.freeze({ x: 0.5, y: 0.5 }),
    sombraAncho: limitarNumero(
      Math.round(anchoVisible * configuracion.sombra.escalaAnchoVisible),
      configuracion.sombra.anchoMinimo,
      configuracion.sombra.anchoMaximo,
    ),
    sombraAlto: limitarNumero(
      Math.round(
        Math.min(anchoVisible, altoVisible) *
          configuracion.sombra.proporcionAltoSombra,
      ),
      configuracion.sombra.altoMinimo,
      configuracion.sombra.altoMaximo,
    ),
    desplazamientoSombraX: configuracion.sombra.desplazamientoX,
    desplazamientoSombraY: configuracion.sombra.desplazamientoY,
  });
}

function limitarNumero(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}
