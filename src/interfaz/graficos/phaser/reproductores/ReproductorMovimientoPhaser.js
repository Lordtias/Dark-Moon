import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "../../TiposEscena.js";
import {
  calcularDuracionAnimacionPhaser,
  CONFIGURACION_ANIMACIONES_PHASER,
} from "../ConfiguracionAnimacionesPhaser.js";
import {
  FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO,
} from "../../../../juego/movimiento/ResolutorDesplazamientoTactico.js";

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
    reproductor.compositor.actualizarOrientacionEntidad?.(
      evento.idEntidad,
      evento.origen,
      evento.destino,
    );
    await reproducirSalidaCampoVisible(reproductor, evento, version);
    return;
  }
  if (evento.transicionVisibilidad === "entrada") {
    await reproducirEntradaCampoVisible(reproductor, evento, version);
    return;
  }

  const nodo = reproductor.compositor.obtenerNodoEntidad(evento.idEntidad);
  const origen = reproductor.compositor.obtenerCentroCasilla(evento.origen);
  const destino = reproductor.compositor.obtenerCentroCasilla(evento.destino);

  if (!nodo || !origen || !destino) {
    return;
  }

  reproductor.compositor.actualizarOrientacionEntidad?.(
    evento.idEntidad,
    evento.origen,
    evento.destino,
  );
  reproductor.compositor.posicionarNodoEntidad(evento.idEntidad, origen);

  const distancia = Math.hypot(
    evento.destino.x - evento.origen.x,
    evento.destino.y - evento.origen.y,
  );
  const movimientosJugadorPendientes =
    evento.tipoEntidad === TIPOS_ENTIDAD_VISUAL.JUGADOR
      ? reproductor.obtenerRachaMovimientosJugadorPendientes()
      : 0;
  const duracionBaseMovimiento = obtenerDuracionBaseMovimiento(reproductor, {
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

  const formaVisual = evento.desplazamientoTactico?.formaVisual ??
    FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO.MOVIMIENTO;

  if (formaVisual === FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO.SALTO) {
    await reproducirSaltoTactico(reproductor, {
      evento,
      nodo,
      origen,
      destino,
      duracion: Math.max(90, Math.round(duracion * 0.68)),
      version,
    });
    reproductor.compositor.posicionarNodoEntidad(evento.idEntidad, destino);
    return;
  }

  if (formaVisual === FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO.DASH) {
    await reproducirDashTactico(reproductor, {
      evento,
      nodo,
      destino,
      duracion: Math.max(55, Math.round(duracion * 0.46)),
      version,
    });
    reproductor.compositor.posicionarNodoEntidad(evento.idEntidad, destino);
    return;
  }

  if (formaVisual === FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO.TELETRANSPORTE) {
    await reproducirTeletransporteTactico(reproductor, {
      evento,
      nodo,
      destino,
      duracion: Math.max(80, Math.round(duracion * 0.55)),
      version,
    });
    reproductor.compositor.posicionarNodoEntidad(evento.idEntidad, destino);
    return;
  }

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
async function reproducirDashTactico(reproductor, {
  evento,
  nodo,
  destino,
  duracion,
  version,
}) {
  const alActualizar = () => notificarPosicionJugadorVisual(reproductor, evento, nodo);
  await reproductor.crearTween({
    targets: [nodo.contenedor, nodo.sombra].filter(Boolean),
    x: destino.x,
    y: destino.y,
    duration: duracion,
    ease: "Cubic.easeOut",
    onUpdate: alActualizar,
  }, version);
}

async function reproducirTeletransporteTactico(reproductor, {
  evento,
  nodo,
  destino,
  duracion,
  version,
}) {
  const elementos = [nodo.contenedor, nodo.sombra].filter(Boolean);
  const alphaOriginal = new Map(
    elementos.map((elemento) => [elemento, Number.isFinite(elemento.alpha) ? elemento.alpha : 1]),
  );
  if (reproductor.efectosReducidos) {
    for (const elemento of elementos) {
      elemento.x = destino.x;
      elemento.y = destino.y;
    }
    notificarPosicionJugadorVisual(reproductor, evento, nodo);
    return;
  }

  const mitad = Math.max(1, Math.round(duracion / 2));
  await reproductor.crearTween({
    targets: elementos,
    alpha: 0,
    duration: mitad,
    ease: "Quad.easeIn",
  }, version);
  if (version !== reproductor.versionCancelacion || reproductor.destruido) return;

  for (const elemento of elementos) {
    elemento.x = destino.x;
    elemento.y = destino.y;
  }
  notificarPosicionJugadorVisual(reproductor, evento, nodo);

  await Promise.all(
    elementos.map((elemento) => reproductor.crearTween({
      targets: elemento,
      alpha: alphaOriginal.get(elemento) ?? 1,
      duration: Math.max(1, duracion - mitad),
      ease: "Quad.easeOut",
    }, version)),
  );
}

function notificarPosicionJugadorVisual(reproductor, evento, nodo) {
  if (
    evento.tipoEntidad === TIPOS_ENTIDAD_VISUAL.JUGADOR &&
    typeof reproductor.alMoverJugadorVisual === "function"
  ) {
    reproductor.alMoverJugadorVisual({
      x: nodo.contenedor.x,
      y: nodo.contenedor.y,
    });
  }
}

async function reproducirSaltoTactico(reproductor, {
  evento,
  nodo,
  origen,
  destino,
  duracion,
  version,
}) {
  const mitad = {
    x: (origen.x + destino.x) / 2,
    y: (origen.y + destino.y) / 2 - (reproductor.efectosReducidos ? 0 : 10),
  };
  const primeraMitad = Math.max(1, Math.round(duracion / 2));
  const segundaMitad = Math.max(1, duracion - primeraMitad);
  const alActualizar = () => {
    if (
      evento.tipoEntidad === TIPOS_ENTIDAD_VISUAL.JUGADOR &&
      typeof reproductor.alMoverJugadorVisual === "function"
    ) {
      reproductor.alMoverJugadorVisual({
        x: nodo.contenedor.x,
        y: nodo.contenedor.y,
      });
    }
  };

  const escalaSombraX = nodo.sombra?.scaleX ?? 1;
  const escalaSombraY = nodo.sombra?.scaleY ?? 1;
  const moverSombra = nodo.sombra
    ? (async () => {
        await reproductor.crearTween({
          targets: nodo.sombra,
          x: mitad.x,
          y: (origen.y + destino.y) / 2,
          scaleX: reproductor.efectosReducidos ? escalaSombraX : escalaSombraX * 0.86,
          scaleY: reproductor.efectosReducidos ? escalaSombraY : escalaSombraY * 0.86,
          duration: primeraMitad,
          ease: "Quad.easeOut",
        }, version);
        if (version !== reproductor.versionCancelacion || reproductor.destruido) return;
        await reproductor.crearTween({
          targets: nodo.sombra,
          x: destino.x,
          y: destino.y,
          scaleX: escalaSombraX,
          scaleY: escalaSombraY,
          duration: segundaMitad,
          ease: "Quad.easeIn",
        }, version);
      })()
    : Promise.resolve();

  await Promise.all([
    (async () => {
      await reproductor.crearTween({
        targets: nodo.contenedor,
        x: mitad.x,
        y: mitad.y,
        duration: primeraMitad,
        ease: "Quad.easeOut",
        onUpdate: alActualizar,
      }, version);
      if (version !== reproductor.versionCancelacion || reproductor.destruido) return;
      await reproductor.crearTween({
        targets: nodo.contenedor,
        x: destino.x,
        y: destino.y,
        duration: segundaMitad,
        ease: "Quad.easeIn",
        onUpdate: alActualizar,
      }, version);
    })(),
    moverSombra,
  ]);
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

  reproductor.compositor.actualizarOrientacionEntidad?.(
    evento.idEntidad,
    evento.origen,
    evento.destino,
  );

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
