// Reproducción de zonas temporales. Opera sobre el coordinador recibido y no
// modifica reglas de juego ni el orden de la cola visual.

export async function reproducirZonaTemporalCreada(reproductor, evento, version) {
  const zona = evento?.zona;
  if (!zona) return;
  const objeto = reproductor.compositor.establecerZonaTemporal?.(zona);
  if (!objeto) return;

  const duracion = reproductor.calcularDuracion(220);
  if (reproductor.efectosReducidos) {
    await reproductor.esperar(duracion, version);
    return;
  }
  objeto.alpha = 0.16;
  await reproductor.crearTween({
    targets: objeto,
    alpha: 1,
    duration: duracion,
    ease: "Sine.easeOut",
  }, version);
}
export async function reproducirZonaTemporalRenovada(reproductor, evento, version) {
  const zona = evento?.zona;
  if (!zona) return;
  reproductor.compositor.establecerZonaTemporal?.(zona);
  const pulso = reproductor.efectosReducidos
    ? null
    : reproductor.creadorZonasTemporales?.crearPulsoRenovacion({ zona });
  const duracion = reproductor.calcularDuracion(260);
  if (pulso) {
    await reproductor.crearTween({
      targets: pulso.list ?? pulso,
      alpha: 0,
      scaleX: 1.22,
      scaleY: 1.22,
      duration: duracion,
      ease: "Quad.easeOut",
    }, version);
    pulso.destroy?.(true);
  } else {
    await reproductor.esperar(duracion, version);
  }
}
export async function reproducirZonaTemporalVencida(reproductor, evento, version) {
  const zona = evento?.zona;
  if (!zona) return;
  const objeto = reproductor.compositor.obtenerZonaTemporalVisual?.(zona.id);
  const duracion = reproductor.calcularDuracion(300);
  if (objeto && !reproductor.efectosReducidos) {
    await reproductor.crearTween({
      targets: objeto,
      alpha: 0,
      duration: duracion,
      ease: "Sine.easeIn",
    }, version);
  } else {
    await reproductor.esperar(duracion, version);
  }
  if (version === reproductor.versionCancelacion && !reproductor.destruido) {
    reproductor.compositor.retirarZonaTemporal?.(zona.id);
  }
}
export async function reproducirZonaTemporalPulso(reproductor, evento, version) {
  const zona = evento?.zona;
  if (!zona) return;
  const pulso = reproductor.efectosReducidos
    ? null
    : reproductor.creadorZonasTemporales?.crearPulsoActivacion({ zona });
  const duracion = reproductor.calcularDuracion(280);
  if (pulso) {
    await reproductor.crearTween({
      targets: pulso.list ?? pulso,
      alpha: 0,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: duracion,
      ease: "Sine.easeOut",
    }, version);
    pulso.destroy?.(true);
  } else {
    await reproductor.esperar(duracion, version);
  }
}
export async function reproducirActorEntroZonaTemporal(reproductor, evento, version) {
  const zona = evento?.zona;
  const posicion = evento?.destino;
  if (!zona || !posicion) return;
  const reaccion = reproductor.efectosReducidos
    ? null
    : reproductor.creadorZonasTemporales?.crearReaccionLocal({
        zona,
        posicion,
        tipo: "entrada",
      });
  const duracion = reproductor.calcularDuracion(180);
  if (reaccion) {
    await reproductor.crearTween({
      targets: reaccion,
      alpha: 0,
      scaleX: 1.08,
      scaleY: 1.08,
      angle: 14,
      duration: duracion,
      ease: "Quad.easeOut",
    }, version);
    reaccion.destroy?.();
  } else {
    await reproductor.esperar(duracion, version);
  }
}
export async function reproducirZonaTemporalActivada(reproductor, evento, version) {
  const zona = evento?.zona;
  const impacto = evento?.impacto;
  if (!zona || !impacto) return;

  const reaccion = reproductor.efectosReducidos
    ? null
    : reproductor.creadorZonasTemporales?.crearReaccionLocal({
        zona,
        posicion: impacto.posicionObjetivo,
        tipo: "impacto",
      });
  const duracion = reproductor.calcularDuracion(220);
  const animaciones = [];
  if (reaccion) {
    animaciones.push(reproductor.crearTween({
      targets: reaccion,
      alpha: 0,
      scaleX: 1.28,
      scaleY: 1.28,
      duration: duracion,
      ease: "Quad.easeOut",
    }, version).then(() => reaccion.destroy?.()));
  }

  animaciones.push(
    reproductor.reproducirResultadoImpactoHabilidad(
      {
        ...evento,
        idActor: null,
        origenActor: impacto.posicionObjetivo,
        posicionObjetivo: impacto.posicionObjetivo,
      },
      impacto,
      version,
    ),
  );

  await Promise.all(animaciones);

}
