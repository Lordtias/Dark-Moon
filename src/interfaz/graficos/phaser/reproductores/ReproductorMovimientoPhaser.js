import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "../../TiposEscena.js";
import { TIPOS_EVENTO_VISUAL } from "../../PlanificadorEventosVisuales.js";
import {
  calcularDuracionAnimacionPhaser,
  CONFIGURACION_ANIMACIONES_PHASER,
} from "../ConfiguracionAnimacionesPhaser.js";

// Reproducción de movimiento, transiciones de visibilidad y hostilidad.

export function reproducirCambioHostilidad(reproductor, evento) {
  if (
    !Object.values(ESTADOS_HOSTILIDAD_VISUAL).includes(evento.estadoActual)
  ) {
    return false;
  }

  return reproductor.compositor.actualizarHostilidadEntidad?.(
    evento.idEntidad,
    evento.estadoActual,
  ) === true;
}
export async function reproducirMovimiento(reproductor, evento, version) {
  if (evento.transicionVisibilidad === "salida") {
    await reproductor.reproducirSalidaCampoVisible(evento, version);
    return;
  }
  if (evento.transicionVisibilidad === "entrada") {
    await reproductor.reproducirEntradaCampoVisible(evento, version);
    return;
  }

  const nodo = reproductor.compositor.obtenerNodoEntidad(evento.idEntidad);
  const origen = reproductor.compositor.obtenerCentroCasilla(evento.origen);
  const destino = reproductor.compositor.obtenerCentroCasilla(evento.destino);

  if (!nodo || !origen || !destino) {
    return;
  }

  reproductor.compositor.posicionarNodoEntidad(evento.idEntidad, origen);

  const distancia = Math.hypot(
    evento.destino.x - evento.origen.x,
    evento.destino.y - evento.origen.y,
  );
  const movimientosJugadorPendientes =
    evento.tipoEntidad === TIPOS_ENTIDAD_VISUAL.JUGADOR
      ? reproductor.obtenerRachaMovimientosJugadorPendientes()
      : 0;
  const duracionBaseMovimiento = reproductor.obtenerDuracionBaseMovimiento({
    tipoEntidad: evento.tipoEntidad,
    movimientosJugadorPendientes,
  });
  const factorTemporal = Number.isFinite(evento.ritmoVisual?.factorTemporal)
    ? evento.ritmoVisual.factorTemporal
    : 1;
  const duracionBase =
    duracionBaseMovimiento *
    factorTemporal *
    Math.max(1, Math.min(Math.SQRT2, distancia));
  const duracion = calcularDuracionAnimacionPhaser(duracionBase, {
    velocidad: reproductor.velocidad,
    cantidadPendiente: 0,
  });

  await reproductor.crearTween({
    targets: [nodo.contenedor, nodo.sombra].filter(Boolean),
    x: destino.x,
    y: destino.y,
    duration: duracion,
    ease: movimientosJugadorPendientes > 0 ? "Linear" : "Sine.easeInOut",
    onUpdate: () => {
      if (
        evento.tipoEntidad === TIPOS_ENTIDAD_VISUAL.JUGADOR &&
        typeof reproductor.alMoverJugadorVisual === "function"
      ) {
        reproductor.alMoverJugadorVisual({
          x: nodo.contenedor.x,
          y: nodo.contenedor.y,
        });
      }
    },
  }, version);

  reproductor.compositor.posicionarNodoEntidad(evento.idEntidad, destino);
}
export async function reproducirSalidaCampoVisible(reproductor, evento, version) {
  const nodo = reproductor.compositor.obtenerNodoEntidad(evento.idEntidad);
  if (!nodo?.contenedor) return;

  if (!reproductor.efectosReducidos) {
    await reproductor.crearTween({
      targets: nodo.contenedor,
      alpha: 0,
      duration: reproductor.calcularDuracion(110),
      ease: "Sine.easeIn",
    }, version);
  }

  if (version === reproductor.versionCancelacion && !reproductor.destruido) {
    reproductor.compositor.retirarEntidadVisual?.(evento.idEntidad);
  }
}
export async function reproducirEntradaCampoVisible(reproductor, evento, version) {
  const entidadFinal = evento?.entidadFinal;
  if (!entidadFinal) return;

  const nodo = reproductor.compositor.establecerEntidadVisualTemporal?.(entidadFinal);
  if (!nodo?.contenedor) return;

  const alphaSombraFinal = Number.isFinite(nodo.sombra?.alpha)
    ? nodo.sombra.alpha
    : 1;
  nodo.contenedor.alpha = reproductor.efectosReducidos ? 1 : 0;
  if (nodo.sombra) nodo.sombra.alpha = reproductor.efectosReducidos ? alphaSombraFinal : 0;

  if (reproductor.efectosReducidos) return;

  const animaciones = [
    reproductor.crearTween({
      targets: nodo.contenedor,
      alpha: 1,
      duration: reproductor.calcularDuracion(110),
      ease: "Sine.easeOut",
    }, version),
  ];
  if (nodo.sombra) {
    animaciones.push(reproductor.crearTween({
      targets: nodo.sombra,
      alpha: alphaSombraFinal,
      duration: reproductor.calcularDuracion(110),
      ease: "Sine.easeOut",
    }, version));
  }
  await Promise.all(animaciones);
}
export function obtenerDuracionBaseMovimiento(reproductor, {
  tipoEntidad,
  movimientosJugadorPendientes = 0,
} = {}) {
  if (tipoEntidad !== TIPOS_ENTIDAD_VISUAL.JUGADOR) {
    return CONFIGURACION_ANIMACIONES_PHASER.movimientoEnemigoCasillaMs;
  }

  if (
    movimientosJugadorPendientes >=
    CONFIGURACION_ANIMACIONES_PHASER.umbralMovimientosJugadorColaLarga
  ) {
    return CONFIGURACION_ANIMACIONES_PHASER.movimientoCasillaColaLargaMs;
  }

  if (
    movimientosJugadorPendientes >=
    CONFIGURACION_ANIMACIONES_PHASER.umbralMovimientosJugadorColaMedia
  ) {
    return CONFIGURACION_ANIMACIONES_PHASER.movimientoCasillaColaMediaMs;
  }

  return CONFIGURACION_ANIMACIONES_PHASER.movimientoJugadorCasillaMs;
}
export function obtenerRachaMovimientosJugadorPendientes(reproductor) {
  let cantidad = 0;

  for (const actualizacion of reproductor.cola) {
    const eventos = actualizacion?.eventosVisuales ?? [];
    if (eventos.length === 0) break;

    for (const evento of eventos) {
      if (
        evento?.tipo !== TIPOS_EVENTO_VISUAL.MOVIMIENTO_ENTIDAD ||
        evento.tipoEntidad !== TIPOS_ENTIDAD_VISUAL.JUGADOR
      ) {
        return cantidad;
      }
      cantidad += 1;
    }
  }

  return cantidad;
}
