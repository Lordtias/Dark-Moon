import {
  CONFIGURACION_EFECTOS_RECUPERACION_PHASER,
} from "../ConfiguracionEfectosRecuperacionPhaser.js";
import {
  CONFIGURACION_EFECTOS_COMBATE_PHASER,
} from "../ConfiguracionEfectosCombatePhaser.js";
import { ANCLAJES_RECURSO } from "../CreadorRecursosVisualesPhaser.js";
import { obtenerCentroEntidadVisual } from "../GeometriaVisualPhaser.js";

// Representa recuperaciones y mejoras ya resueltas. No modifica recursos ni
// progresión del juego.
export async function reproducirRecuperacionHabilidad(
  contexto,
  { evento, impacto, recursos, version } = {},
) {
  const centro = obtenerCentroEntidadVisual(contexto, {
    idEntidad: impacto?.idObjetivo,
    posicion: impacto?.posicionObjetivo ?? evento?.posicionObjetivo,
  });
  if (!centro || !Array.isArray(recursos) || recursos.length === 0) return;

  const efecto = contexto.creadorEfectosRecuperacion?.crearRecuperacion({
    centro,
    recursos,
    reducido: contexto.efectosReducidos,
  });

  const eventoRecuperacion = {
    idObjetivo: impacto.idObjetivo,
    recursos,
  };
  const animaciones = [
    reproducirAumentoVidaExplicito(contexto, eventoRecuperacion, version),
  ];
  if (efecto) {
    animaciones.push(animarRecuperacionFija(contexto, efecto, centro, version));
  }
  await Promise.all(animaciones);
}

export async function reproducirRecursosRecuperados(contexto, evento, version) {
  const centro = obtenerCentroEntidadVisual(contexto, {
    idEntidad: evento.idObjetivo,
    posicion: evento.posicionObjetivo,
  });
  if (!centro || !Array.isArray(evento.recursos) || evento.recursos.length === 0) {
    return;
  }

  const fases = evento.ritmoVisual?.fases ?? {};
  const duracionPreparacion = contexto.calcularDuracion(
    fases.preparacion ?? 60,
  );
  const duracionUso = contexto.calcularDuracion(fases.uso ?? 60);
  const duracionResultado = contexto.calcularDuracion(
    (fases.recuperacion ?? 120) + (fases.retorno ?? 45),
  );

  await contexto.esperar(duracionPreparacion, version);
  if (version !== contexto.versionCancelacion || contexto.destruido) return;

  const configuracionRecurso =
    CONFIGURACION_EFECTOS_RECUPERACION_PHASER.recursoVisual;
  const sprite = evento.fuente?.recursoVisual
    ? await contexto.creadorRecursosVisuales?.crearSpriteTemporal({
        recursoVisual: evento.fuente.recursoVisual,
        centro: {
          x: centro.x + configuracionRecurso.desplazamientoX,
          y: centro.y + configuracionRecurso.desplazamientoY,
        },
        longitudVisiblePx: configuracionRecurso.longitudVisiblePx,
        anclaje: ANCLAJES_RECURSO.CENTRO,
        alpha: 0.2,
      })
    : null;

  const escalaSpriteX = sprite?.scaleX ?? 1;
  const escalaSpriteY = sprite?.scaleY ?? 1;
  if (sprite) {
    sprite.scaleX = escalaSpriteX * 0.72;
    sprite.scaleY = escalaSpriteY * 0.72;
    await contexto.crearTween({
      targets: sprite,
      scaleX: escalaSpriteX * 1.05,
      scaleY: escalaSpriteY * 1.05,
      alpha: 1,
      y: sprite.y - 3,
      duration: duracionUso,
      ease: "Sine.easeOut",
    }, version);
  } else {
    await contexto.esperar(duracionUso, version);
  }

  if (version !== contexto.versionCancelacion || contexto.destruido) {
    sprite?.destroy?.();
    return;
  }

  const efecto = contexto.creadorEfectosRecuperacion?.crearRecuperacion({
    centro,
    recursos: evento.recursos,
    reducido: contexto.efectosReducidos,
  });
  if (efecto) {
    void animarRecuperacionFija(contexto, efecto, centro, version).catch(() => {});
  }
  void reproducirAumentoVidaExplicito(contexto, evento, version).catch(() => {});

  if (sprite) {
    await contexto.crearTween({
      targets: sprite,
      alpha: 0,
      scaleX: escalaSpriteX * 0.82,
      scaleY: escalaSpriteY * 0.82,
      duration: Math.max(1, duracionResultado),
      ease: "Sine.easeIn",
    }, version);
    sprite.destroy?.();
  } else {
    await contexto.esperar(Math.max(1, duracionResultado), version);
  }
}

export async function animarRecuperacionFija(contexto, efecto, centro, version) {
  const configuracion =
    CONFIGURACION_EFECTOS_RECUPERACION_PHASER.recuperacion;

  await contexto.crearTween({
    targets: efecto,
    scaleX: configuracion.escalaVisible,
    scaleY: configuracion.escalaVisible,
    alpha: 1,
    duration: configuracion.entradaMs,
    ease: "Sine.easeOut",
  }, version);

  if (version !== contexto.versionCancelacion || contexto.destruido) {
    efecto.destroy?.(true);
    return;
  }

  await contexto.esperar(configuracion.permanenciaMs, version);
  await contexto.crearTween({
    targets: efecto,
    scaleX: configuracion.escalaFinal,
    scaleY: configuracion.escalaFinal,
    alpha: 0,
    y: centro.y - configuracion.elevacionSalidaPx,
    duration: configuracion.salidaMs,
    ease: "Quad.easeOut",
  }, version);
  efecto.destroy?.(true);
}

export async function reproducirAumentoVidaExplicito(contexto, evento, version) {
  const vida = evento.recursos.find((recurso) => recurso.recurso === "vida");
  if (!vida) return;
  const valorAntes = Number(vida.valorAntes);
  const valorDespues = Number(vida.valorDespues);
  const valorMaximo = Number(vida.valorMaximo);
  if (
    !Number.isFinite(valorAntes) ||
    !Number.isFinite(valorDespues) ||
    !Number.isFinite(valorMaximo) ||
    valorMaximo <= 0 ||
    valorDespues <= valorAntes
  ) {
    return;
  }

  const estado = { vida: valorAntes };
  const actualizable = contexto.compositor.actualizarBarraVidaEntidad(
    evento.idObjetivo,
    { vidaActual: valorAntes, vidaMaxima: valorMaximo },
  );
  if (!actualizable) return;

  await contexto.crearTween({
    targets: estado,
    vida: valorDespues,
    duration: contexto.calcularDuracion(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.barraVida.duracionMs,
    ),
    ease: "Linear",
    onUpdate: () => {
      contexto.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
        vidaActual: estado.vida,
        vidaMaxima: valorMaximo,
      });
    },
  }, version);
  contexto.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
    vidaActual: valorDespues,
    vidaMaxima: valorMaximo,
  });
}

export async function reproducirNivelAumentado(contexto, evento, version) {
  const centro = obtenerCentroEntidadVisual(contexto, {
    idEntidad: evento.idJugador,
    posicion: evento.posicion,
  });
  if (!centro) return;

  const efecto = contexto.creadorEfectosRecuperacion?.crearHolyBless({
    centro,
    nivelActual: evento.nivelActual,
    reducido: contexto.efectosReducidos,
  });
  if (!efecto) return;

  const configuracion = CONFIGURACION_EFECTOS_RECUPERACION_PHASER.nivel;
  await contexto.crearTween({
    targets: efecto,
    scaleX: configuracion.escalaVisible,
    scaleY: configuracion.escalaVisible,
    alpha: 1,
    duration: configuracion.entradaMs,
    ease: "Sine.easeOut",
  }, version);

  if (version !== contexto.versionCancelacion || contexto.destruido) {
    efecto.destroy?.(true);
    return;
  }

  void finalizarHolyBless(contexto, efecto, centro, version).catch(() => {});
}

export async function finalizarHolyBless(contexto, efecto, centro, version) {
  const configuracion = CONFIGURACION_EFECTOS_RECUPERACION_PHASER.nivel;

  await contexto.esperar(configuracion.permanenciaMs, version);
  await contexto.crearTween({
    targets: efecto,
    scaleX: configuracion.escalaFinal,
    scaleY: configuracion.escalaFinal,
    alpha: 0,
    y: centro.y - configuracion.elevacionSalidaPx,
    duration: configuracion.salidaMs,
    ease: "Sine.easeOut",
  }, version);
  efecto.destroy?.(true);
}
