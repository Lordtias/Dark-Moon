import {
  PATRONES_VISUALES_HABILIDAD,
  resolverContratoPatronVisualHabilidad,
} from "../../PatronesVisualesHabilidades.js";
import {
  obtenerCentroActorHabilidad,
} from "../GeometriaHabilidadesVisualesPhaser.js";
import {
  reproducirResultadoImpactoHabilidad,
} from "./ReproductorResultadosVisualesPhaser.js";

// Reproducción de la conjuración inicial del patrón de zona persistente. El
// ciclo de vida posterior de la zona permanece en ReproductorZonasTemporales.

export async function reproducirHabilidadZona(reproductor, evento, version) {
  const perfil = evento?.perfilVisual;
  const zona = evento?.zonaTemporal;
  if (!perfil || !zona || perfil.nivelVisual !== "intermedia") return;

  const contratoVisual = resolverContratoPatronVisualHabilidad(perfil);
  if (
    contratoVisual.patronVisual !==
      PATRONES_VISUALES_HABILIDAD.ZONA_PERSISTENTE ||
    contratoVisual.persistente !== true
  ) {
    return;
  }

  const centroActor = obtenerCentroActorHabilidad(reproductor, evento);
  const grado = evento.habilidad?.grado ?? 1;
  const fases = evento.ritmoVisual?.fases ?? {};
  const nodoActor = reproductor.compositor.obtenerNodoEntidad(evento.idActor);
  const contenedorActor = nodoActor?.contenedor ?? null;
  const escalaActorX = contenedorActor?.scaleX ?? 1;
  const escalaActorY = contenedorActor?.scaleY ?? 1;
  const conjuracion = reproductor.efectosReducidos || !centroActor
    ? null
    : reproductor.creadorEfectosHabilidades?.crearConjuracion({
        centro: centroActor,
        perfil,
        grado,
      });

  const duracionPreparacion = reproductor.calcularDuracion(fases.preparacion ?? 1);
  const preparaciones = [];
  if (conjuracion) {
    preparaciones.push(reproductor.crearTween({
      targets: conjuracion,
      alpha: 0.94,
      scaleX: 1.08,
      scaleY: 1.08,
      angle: 18,
      duration: duracionPreparacion,
      ease: "Sine.easeOut",
    }, version));
  }
  if (contenedorActor && !reproductor.efectosReducidos) {
    preparaciones.push(reproductor.crearTween({
      targets: contenedorActor,
      scaleX: escalaActorX * 1.05,
      scaleY: escalaActorY * 1.05,
      duration: duracionPreparacion,
      ease: "Sine.easeOut",
    }, version));
  }
  if (preparaciones.length > 0) await Promise.all(preparaciones);
  else await reproductor.esperar(duracionPreparacion, version);

  if (version !== reproductor.versionCancelacion || reproductor.destruido) return;

  const despliegue = reproductor.efectosReducidos
    ? null
    : reproductor.creadorZonasTemporales?.crearDespliegue({ zona });
  const duracionManifestacion = reproductor.calcularDuracion(
    fases.manifestacion ?? 1,
  );
  if (despliegue) {
    await reproductor.crearTween({
      targets: despliegue.list ?? despliegue,
      alpha: 0.78,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: duracionManifestacion,
      ease: "Quad.easeOut",
    }, version);
  } else {
    await reproductor.esperar(duracionManifestacion, version);
  }

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    despliegue?.destroy?.(true);
    conjuracion?.destroy?.();
    return;
  }

  const duracionDespliegue = reproductor.calcularDuracion(fases.despliegue ?? 1);
  if (despliegue) {
    await reproductor.crearTween({
      targets: despliegue.list ?? despliegue,
      alpha: 0.96,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: duracionDespliegue,
      ease: "Sine.easeOut",
    }, version);
  } else {
    await reproductor.esperar(duracionDespliegue, version);
  }

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    despliegue?.destroy?.(true);
    conjuracion?.destroy?.();
    return;
  }

  const duracionActivacion = reproductor.calcularDuracion(fases.activacion ?? 1);
  const impactos = [...(evento.impactos ?? [])].sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
  );
  const reacciones = impactos.map((impacto) =>
    reproducirResultadoImpactoHabilidad(reproductor, evento, impacto, version),
  );
  if (reacciones.length > 0) {
    await Promise.all([
      ...reacciones,
      reproductor.esperar(duracionActivacion, version),
    ]);
  } else {
    await reproductor.esperar(duracionActivacion, version);
  }

  const duracionRetorno = reproductor.calcularDuracion(fases.retorno ?? 1);
  const retornos = [];
  if (despliegue) {
    retornos.push(reproductor.crearTween({
      targets: despliegue.list ?? despliegue,
      alpha: 0,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: duracionRetorno,
      ease: "Sine.easeIn",
    }, version).then(() => despliegue.destroy?.(true)));
  }
  if (conjuracion) {
    retornos.push(reproductor.crearTween({
      targets: conjuracion,
      alpha: 0,
      scaleX: 1.24,
      scaleY: 1.24,
      duration: duracionRetorno,
      ease: "Sine.easeIn",
    }, version).then(() => conjuracion.destroy?.()));
  }
  if (contenedorActor) {
    retornos.push(reproductor.crearTween({
      targets: contenedorActor,
      scaleX: escalaActorX,
      scaleY: escalaActorY,
      duration: duracionRetorno,
      ease: "Sine.easeInOut",
    }, version));
  }
  if (retornos.length > 0) await Promise.all(retornos);
  else await reproductor.esperar(duracionRetorno, version);

  if (contenedorActor) {
    contenedorActor.scaleX = escalaActorX;
    contenedorActor.scaleY = escalaActorY;
  }
}
