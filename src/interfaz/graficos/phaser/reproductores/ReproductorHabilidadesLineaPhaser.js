import {
  PATRONES_VISUALES_HABILIDAD,
  resolverContratoPatronVisualHabilidad,
} from "../../PatronesVisualesHabilidades.js";
import {
  crearClaveCasillaVisual,
  obtenerCentroActorHabilidad,
} from "../GeometriaHabilidadesVisualesPhaser.js";
import {
  reproducirResultadoImpactoHabilidad,
} from "./ReproductorResultadosVisualesPhaser.js";

// Reproducción del patrón visual configurable de línea.

export async function reproducirHabilidadLinea(reproductor, evento, version) {
  const perfil = evento?.perfilVisual;
  if (!perfil || perfil.nivelVisual !== "avanzada") return;

  const contratoVisual = resolverContratoPatronVisualHabilidad(perfil);
  if (
    contratoVisual.patronVisual !== PATRONES_VISUALES_HABILIDAD.LINEA ||
    contratoVisual.usaRecorridoOrdenado !== true ||
    contratoVisual.reproduceImpactosPorCasilla !== true
  ) {
    return;
  }

  const recorrido = [...(evento.recorrido ?? [])]
    .filter(
      (paso) =>
        Number.isInteger(paso?.x) && Number.isInteger(paso?.y),
    )
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const impactos = [...(evento.impactos ?? [])].sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
  );

  if (recorrido.length === 0) {
    for (const impacto of impactos) {
      await reproducirResultadoImpactoHabilidad(reproductor, evento, impacto, version);
    }
    return;
  }

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
  const recursosPersistentes = [];
  const conjuracion = reproductor.efectosReducidos
    ? null
    : reproductor.creadorEfectosHabilidades?.crearConjuracion({
        centro: centroActor,
        perfil,
        grado,
      });
  const carga = reproductor.efectosReducidos
    ? null
    : reproductor.creadorLineasHabilidades?.crearCarga({
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
      scaleX: 1.04,
      scaleY: 1.04,
      angle: 18,
      duration: duracionPreparacion,
      ease: "Sine.easeOut",
    }, version));
  }
  if (carga) {
    preparaciones.push(reproductor.crearTween({
      targets: carga,
      alpha: 0.88,
      scaleX: 1,
      scaleY: 1,
      angle: 24,
      duration: duracionPreparacion,
      ease: "Quad.easeOut",
    }, version));
  }
  if (contenedorActor && !reproductor.efectosReducidos) {
    preparaciones.push(reproductor.crearTween({
      targets: contenedorActor,
      scaleX: escalaActorX * 1.06,
      scaleY: escalaActorY * 1.06,
      duration: duracionPreparacion,
      ease: "Sine.easeOut",
    }, version));
  }
  if (preparaciones.length > 0) await Promise.all(preparaciones);
  else await reproductor.esperar(duracionPreparacion, version);

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    conjuracion?.destroy?.();
    carga?.destroy?.();
    return;
  }

  const duracionManifestacion = reproductor.calcularDuracion(
    fases.manifestacion ?? 1,
  );
  if (carga) {
    await reproductor.crearTween({
      targets: carga,
      alpha: 1,
      scaleX: 1.18,
      scaleY: 1.18,
      angle: 52,
      duration: duracionManifestacion,
      ease: "Sine.easeInOut",
    }, version);
  } else {
    await reproductor.esperar(duracionManifestacion, version);
  }

  const impactosPorCasilla = new Map();
  for (const impacto of impactos) {
    const clave = crearClaveCasillaVisual(impacto.posicionObjetivo);
    const lista = impactosPorCasilla.get(clave) ?? [];
    lista.push(impacto);
    impactosPorCasilla.set(clave, lista);
  }

  const procesados = new Set();
  const duracionRecorrido = reproductor.calcularDuracion(fases.recorrido ?? 1);
  const duracionPaso = Math.max(
    45,
    Math.round(duracionRecorrido / Math.max(1, recorrido.length)),
  );
  let centroAnterior = centroActor;

  for (let indice = 0; indice < recorrido.length; indice += 1) {
    if (version !== reproductor.versionCancelacion || reproductor.destruido) break;
    const paso = recorrido[indice];
    const centroCasilla = reproductor.compositor.obtenerCentroCasilla?.(paso);
    if (!centroCasilla) continue;

    const impactosCasilla =
      impactosPorCasilla.get(crearClaveCasillaVisual(paso)) ?? [];
    const hayCritico = impactosCasilla.some(
      (impacto) => impacto.impacto === true && impacto.critico === true,
    );
    const tramo = reproductor.efectosReducidos
      ? null
      : reproductor.creadorLineasHabilidades?.crearTramo({
          origen: centroAnterior,
          destino: centroCasilla,
          perfil,
          grado,
          indice,
          critico: hayCritico,
        });
    const marca = reproductor.efectosReducidos
      ? null
      : reproductor.creadorLineasHabilidades?.crearEfectoCasilla({
          centro: centroCasilla,
          perfil,
          grado,
          indice,
          tieneObjetivo: impactosCasilla.length > 0,
        });
    if (tramo) recursosPersistentes.push(tramo);
    if (marca) recursosPersistentes.push(marca);

    const animaciones = [];
    if (tramo) {
      animaciones.push(reproductor.crearTween({
        targets: tramo,
        alpha: 0.9,
        duration: duracionPaso,
        ease: "Quad.easeOut",
      }, version));
    }
    if (marca) {
      animaciones.push(reproductor.crearTween({
        targets: marca,
        alpha: 0.88,
        scaleX: 1,
        scaleY: 1,
        duration: duracionPaso,
        ease: "Sine.easeOut",
      }, version));
    }

    for (const impacto of impactosCasilla) {
      procesados.add(impacto);
      const efectoImpacto =
        reproductor.efectosReducidos || impacto.impacto !== true
          ? null
          : reproductor.creadorLineasHabilidades?.crearImpacto({
              centro: centroCasilla,
              perfil,
              grado,
              indice,
              critico: impacto.critico === true,
            });
      if (efectoImpacto) {
        animaciones.push(reproductor.crearTween({
          targets: efectoImpacto,
          alpha: 0,
          scaleX: impacto.critico === true ? 1.5 : 1.32,
          scaleY: impacto.critico === true ? 1.5 : 1.32,
          duration: Math.max(120, Math.round(duracionPaso * 1.4)),
          ease: "Quad.easeOut",
        }, version).then(() => efectoImpacto.destroy?.()));
      }
      animaciones.push(
        reproducirResultadoImpactoHabilidad(reproductor, evento, impacto, version),
      );
    }

    if (animaciones.length > 0) await Promise.all(animaciones);
    else await reproductor.esperar(duracionPaso, version);
    centroAnterior = centroCasilla;
  }

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    for (const recurso of recursosPersistentes) recurso?.destroy?.();
    conjuracion?.destroy?.();
    carga?.destroy?.();
    return;
  }

  for (const impacto of impactos) {
    if (procesados.has(impacto)) continue;
    await reproducirResultadoImpactoHabilidad(reproductor, evento, impacto, version);
  }

  await reproductor.esperar(reproductor.calcularDuracion(fases.impacto ?? 1), version);

  const duracionRetorno = reproductor.calcularDuracion(fases.retorno ?? 1);
  const retornos = [];
  for (const recurso of recursosPersistentes) {
    retornos.push(reproductor.crearTween({
      targets: recurso,
      alpha: 0,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: duracionRetorno,
      ease: "Sine.easeIn",
    }, version).then(() => recurso.destroy?.()));
  }
  if (carga) {
    retornos.push(reproductor.crearTween({
      targets: carga,
      alpha: 0,
      scaleX: 1.28,
      scaleY: 1.28,
      duration: duracionRetorno,
      ease: "Sine.easeIn",
    }, version).then(() => carga.destroy?.()));
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
