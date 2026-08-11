import {
  PATRONES_VISUALES_HABILIDAD,
  resolverContratoPatronVisualHabilidad,
} from "../../PatronesVisualesHabilidades.js";
import {
  obtenerCentroActorHabilidad,
  obtenerCentroImpactoHabilidad,
} from "../GeometriaHabilidadesVisualesPhaser.js";
import {
  reproducirResultadoImpactoHabilidad,
} from "./ReproductorResultadosVisualesPhaser.js";

// Reproducción del patrón visual configurable de cadena.

export async function reproducirHabilidadCadena(reproductor, evento, version) {
  const perfil = evento?.perfilVisual;
  if (!perfil || perfil.nivelVisual !== "intermedia") return;

  const contratoVisual = resolverContratoPatronVisualHabilidad(perfil);
  if (
    contratoVisual.patronVisual !== PATRONES_VISUALES_HABILIDAD.CADENA ||
    contratoVisual.usaRecorridoOrdenado !== true ||
    contratoVisual.reproduceImpactosSecuencialmente !== true
  ) {
    return;
  }

  const impactos = [...(evento.impactos ?? [])].sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
  );
  if (impactos.length === 0) return;

  const centroActor = obtenerCentroActorHabilidad(reproductor, evento);
  if (!centroActor) {
    for (const impacto of impactos) {
      await reproducirResultadoImpactoHabilidad(reproductor, evento, impacto, version);
    }
    return;
  }

  const grado = evento.habilidad?.grado ?? 1;
  const fases = evento.ritmoVisual?.fases ?? {};
  const nodoActor = reproductor.compositor.obtenerNodoEntidad(evento.idActor);
  const contenedorActor = nodoActor?.contenedor ?? null;
  const escalaActorX = contenedorActor?.scaleX ?? 1;
  const escalaActorY = contenedorActor?.scaleY ?? 1;
  const conjuracion = reproductor.efectosReducidos
    ? null
    : reproductor.creadorEfectosHabilidades?.crearConjuracion({
        centro: centroActor,
        perfil,
        grado,
      });
  const carga = reproductor.efectosReducidos
    ? null
    : reproductor.creadorCadenasHabilidades?.crearCarga({
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
      angle: 24,
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

  const duracionManifestacion = reproductor.calcularDuracion(
    fases.manifestacion ?? 1,
  );
  if (carga) {
    await reproductor.crearTween({
      targets: carga,
      alpha: 1,
      scaleX: 1.18,
      scaleY: 1.18,
      angle: 36,
      duration: duracionManifestacion,
      ease: "Quad.easeOut",
    }, version);
  } else {
    await reproductor.esperar(duracionManifestacion, version);
  }

  if (version !== reproductor.versionCancelacion || reproductor.destruido) return;

  const duracionSaltos = reproductor.calcularDuracion(fases.saltos ?? 1);
  const duracionImpactos = reproductor.calcularDuracion(fases.impacto ?? 1);
  const duracionSalto = Math.max(55, Math.round(duracionSaltos / impactos.length));
  const duracionImpacto = Math.max(45, Math.round(duracionImpactos / impactos.length));
  const tramosPersistentes = [];
  let origenSalto = centroActor;

  for (let indice = 0; indice < impactos.length; indice += 1) {
    if (version !== reproductor.versionCancelacion || reproductor.destruido) break;
    const impacto = impactos[indice];
    const destinoSalto = obtenerCentroImpactoHabilidad(reproductor, evento, impacto);
    if (!destinoSalto) {
      await reproducirResultadoImpactoHabilidad(reproductor, evento, impacto, version);
      origenSalto = reproductor.compositor.obtenerCentroCasilla(
        impacto.posicionObjetivo,
      ) ?? origenSalto;
      continue;
    }

    const esPrimario =
      contratoVisual.enfatizaObjetivoPrimario === true &&
      indice === 0 &&
      Boolean(evento.idObjetivoPrimario) &&
      impacto.idObjetivo === evento.idObjetivoPrimario;
    const multiplicadorVisual = Math.max(
      contratoVisual.intensidadVisualMinima ?? 0.52,
      Number.isFinite(impacto.multiplicadorDanio)
        ? impacto.multiplicadorDanio
        : 1,
    );
    const arco = reproductor.efectosReducidos
      ? null
      : reproductor.creadorCadenasHabilidades?.crearArco({
          origen: origenSalto,
          destino: destinoSalto,
          perfil,
          grado,
          multiplicadorVisual,
          critico: impacto.critico === true,
          primario: esPrimario,
          indiceSalto: indice,
        });
    const nucleo = reproductor.efectosReducidos
      ? null
      : reproductor.creadorCadenasHabilidades?.crearNucleoSalto({
          origen: origenSalto,
          perfil,
          grado,
          primario: esPrimario,
        });

    const desplazamientos = [];
    if (arco) {
      desplazamientos.push(reproductor.crearTween({
        targets: arco,
        alpha: esPrimario ? 1 : 0.88,
        duration: duracionSalto,
        ease: "Sine.easeOut",
      }, version));
    }
    if (nucleo) {
      desplazamientos.push(reproductor.crearTween({
        targets: nucleo,
        x: destinoSalto.x,
        y: destinoSalto.y,
        alpha: 1,
        scaleX: esPrimario ? 1.18 : 1,
        scaleY: esPrimario ? 1.18 : 1,
        duration: duracionSalto,
        ease: "Quad.easeInOut",
      }, version));
    }
    if (contratoVisual.conservaTramosAnteriores === true) {
      for (const tramoAnterior of tramosPersistentes) {
        desplazamientos.push(reproductor.crearTween({
          targets: tramoAnterior,
          alpha: contratoVisual.opacidadTramosAnteriores ?? 0.28,
          duration: duracionSalto,
          ease: "Sine.easeInOut",
        }, version));
      }
    }
    if (desplazamientos.length > 0) await Promise.all(desplazamientos);
    else await reproductor.esperar(duracionSalto, version);
    nucleo?.destroy?.();

    if (version !== reproductor.versionCancelacion || reproductor.destruido) break;

    const descarga = reproductor.efectosReducidos
      ? null
      : reproductor.creadorCadenasHabilidades?.crearImpacto({
          centro: destinoSalto,
          perfil,
          grado,
          multiplicadorVisual,
          critico: impacto.critico === true,
          primario: esPrimario,
          indiceSalto: indice,
        });
    const reacciones = [
      reproducirResultadoImpactoHabilidad(reproductor, evento, impacto, version),
    ];
    if (descarga) {
      reacciones.push(reproductor.crearTween({
        targets: descarga,
        alpha: 0,
        scaleX: esPrimario ? 1.58 : 1.38,
        scaleY: esPrimario ? 1.58 : 1.38,
        duration: duracionImpacto,
        ease: "Quad.easeOut",
      }, version).then(() => descarga.destroy?.()));
    }
    await Promise.all(reacciones);
    if (version !== reproductor.versionCancelacion || reproductor.destruido) {
      arco?.destroy?.();
      return;
    }

    if (arco) {
      arco.alpha = indice === impactos.length - 1
        ? contratoVisual.opacidadUltimoTramo ?? 0.72
        : Math.max(
            contratoVisual.opacidadTramosAnteriores ?? 0.28,
            0.38,
          );
      tramosPersistentes.push(arco);
    }
    origenSalto = reproductor.compositor.obtenerCentroCasilla(
      impacto.posicionObjetivo,
    ) ?? destinoSalto;
  }

  const duracionRetorno = reproductor.calcularDuracion(fases.retorno ?? 1);
  const retornos = [];
  for (const tramo of tramosPersistentes) {
    retornos.push(reproductor.crearTween({
      targets: tramo,
      alpha: 0,
      duration: duracionRetorno,
      ease: "Sine.easeIn",
    }, version).then(() => tramo.destroy?.()));
  }
  for (const recurso of [carga, conjuracion]) {
    if (!recurso) continue;
    retornos.push(reproductor.crearTween({
      targets: recurso,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: duracionRetorno,
      ease: "Sine.easeIn",
    }, version).then(() => recurso.destroy?.()));
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
