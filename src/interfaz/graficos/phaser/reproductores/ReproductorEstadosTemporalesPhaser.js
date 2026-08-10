import { CONFIGURACION_EFECTOS_COMBATE_PHASER } from "../ConfiguracionEfectosCombatePhaser.js";

// Reproducción visual de estados temporales y su feedback asociado.

export async function reproducirEfectoTemporalAplicado(reproductor, evento, version) {
  reproductor.compositor.establecerEfectoTemporalEntidad?.(
    evento.idObjetivo,
    evento.efecto,
  );
  const centro = reproductor.obtenerCentroEventoEfecto(evento);
  const entrada = reproductor.efectosReducidos
    ? null
    : reproductor.creadorEstadosTemporales?.crearEntrada({
        centro,
        efecto: evento.efecto,
      });

  await Promise.all([
    entrada
      ? reproductor.animarEntradaEstado(entrada, version)
      : Promise.resolve(),
    reproductor.reproducirFeedbackTextoEstado(evento, version),
  ]);
}
export async function reproducirEfectoTemporalActualizado(reproductor, evento, version) {
  const actualizado = reproductor.compositor.establecerEfectoTemporalEntidad?.(
    evento.idObjetivo,
    evento.efecto,
  ) === true;
  const centro = reproductor.obtenerCentroEventoEfecto(evento);
  const pulso =
    actualizado && !reproductor.efectosReducidos
      ? reproductor.creadorEstadosTemporales?.crearPulsoActualizacion({
          centro,
          efecto: evento.efecto,
        })
      : null;

  await Promise.all([
    reproductor.reproducirFeedbackTextoEstado(evento, version),
    pulso ? reproductor.animarPulsoEstado(pulso, version) : Promise.resolve(),
  ]);
  return actualizado;
}
export async function reproducirEfectoTemporalTick(reproductor, evento, version) {
  if (reproductor.efectosReducidos) return;
  const centro = reproductor.obtenerCentroEventoEfecto(evento);
  const pulso = reproductor.creadorEstadosTemporales?.crearPulsoTick({
    centro,
    efecto: evento.efecto,
  });
  if (!pulso) return;

  const yInicial = pulso.y;
  await reproductor.crearTween({
    targets: pulso,
    y: yInicial - 8,
    scaleX: 1.24,
    scaleY: 1.24,
    alpha: 0,
    duration: reproductor.calcularDuracion(260),
    ease: "Sine.easeOut",
  }, version);
  pulso.destroy?.(true);
}
export async function animarPulsoEstado(reproductor, pulso, version) {
  await reproductor.crearTween({
    targets: pulso,
    scaleX: 1.28,
    scaleY: 1.28,
    alpha: 0,
    duration: reproductor.calcularDuracion(230),
    ease: "Quad.easeOut",
  }, version);
  pulso.destroy?.();
}
export async function animarEntradaEstado(reproductor, entrada, version) {
  await reproductor.crearTween({
    targets: entrada,
    scaleX: 1.24,
    scaleY: 1.24,
    alpha: 0,
    duration: reproductor.calcularDuracion(220),
    ease: "Quad.easeOut",
  }, version);
  entrada.destroy?.();
}
export async function reproducirFeedbackTextoEstado(reproductor, evento, version) {
  const centro = reproductor.obtenerCentroEventoEfecto(evento);
  const feedback = reproductor.creadorEstadosTemporales?.crearFeedbackEstado({
    centro,
    efecto: evento.efecto,
    operacion: evento.operacion,
  });
  if (!feedback) return;
  const yInicial = feedback.y;

  await reproductor.crearTween({
    targets: feedback,
    y: yInicial - CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.elevacionPx,
    alpha: 0,
    duration: reproductor.calcularDuracion(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.duracionMs,
    ),
    ease: "Quad.easeOut",
  }, version);
  feedback.destroy?.();
}
export async function reproducirEfectoTemporalNoAplicado(reproductor, evento, version) {
  if (reproductor.efectosReducidos) return;
  const centro = reproductor.obtenerCentroEventoEfecto(evento);
  const feedback = reproductor.creadorEstadosTemporales?.crearNoAplicado({
    centro,
    feedback: evento.feedback,
    motivo: evento.motivo,
  });
  if (!feedback) return;
  const yInicial = feedback.y;

  await reproductor.crearTween({
    targets: feedback,
    y: yInicial - CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.elevacionPx,
    scaleX: CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.escalaFinal,
    scaleY: CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.escalaFinal,
    alpha: 0,
    duration: reproductor.calcularDuracion(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.duracionMs,
    ),
    ease: "Quad.easeOut",
  }, version);
  feedback.destroy?.(true);
}
export async function reproducirEfectoTemporalRetirado(reproductor, evento, version) {
  const nodo = reproductor.compositor.obtenerNodoEntidad?.(evento.idObjetivo);
  const centro = nodo?.contenedor
    ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
    : null;

  reproductor.compositor.retirarEfectoTemporalEntidad?.(
    evento.idObjetivo,
    evento.efecto,
  );

  const salida =
    reproductor.efectosReducidos || !centro
      ? null
      : reproductor.creadorEstadosTemporales?.crearRetirada({
          centro,
          efecto: evento.efecto,
        });

  if (!salida) return;
  await reproductor.crearTween({
    targets: salida,
    scaleX: 1.34,
    scaleY: 1.34,
    alpha: 0,
    duration: reproductor.calcularDuracion(210),
    ease: "Sine.easeOut",
  }, version);
  salida.destroy?.();
}
export function obtenerCentroEventoEfecto(reproductor, evento) {
  const nodo = reproductor.compositor.obtenerNodoEntidad?.(evento.idObjetivo);
  if (nodo?.contenedor) {
    return { x: nodo.contenedor.x, y: nodo.contenedor.y };
  }
  return reproductor.compositor.obtenerCentroCasilla?.(evento.posicionObjetivo);
}
