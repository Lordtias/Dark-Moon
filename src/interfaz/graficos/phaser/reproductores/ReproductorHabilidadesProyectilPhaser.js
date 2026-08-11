import {
  PATRONES_VISUALES_HABILIDAD,
  resolverContratoPatronVisualHabilidad,
} from "../../PatronesVisualesHabilidades.js";
import { TIPOS_EVENTO_VISUAL } from "../../TiposEventosVisuales.js";
import {
  obtenerCentroActorHabilidad,
  obtenerCentroImpactoHabilidad,
} from "../GeometriaHabilidadesVisualesPhaser.js";
import {
  reproducirResultadoImpactoHabilidad,
} from "./ReproductorResultadosVisualesPhaser.js";

// Reproducción del patrón visual configurable de proyectil.

function resolverEaseHabilidad(movimiento) {
  switch (movimiento) {
    case "flotante":
      return "Sine.easeInOut";
    case "nervioso":
      return "Quad.easeInOut";
    case "descarga_anclada":
      return "Sine.easeOut";
    case "punzante":
      return "Cubic.easeIn";
    case "pesado":
      return "Sine.easeInOut";
    case "impulso_fuerte":
      return "Cubic.easeOut";
    default:
      return "Linear";
  }
}

function obtenerIntensidadEnvenenamientoImpacto(impacto) {
  const eventoEstado = (impacto?.eventosEfectos ?? []).find(
    (evento) =>
      [
        TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_APLICADO,
        TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_ACTUALIZADO,
      ].includes(evento?.tipo) &&
      evento?.efecto?.catalogoEfectoId === "envenenamiento" &&
      Number.isFinite(evento?.efecto?.intensidad),
  );

  if (!eventoEstado) return null;

  return Object.freeze({
    intensidad: Math.max(1, Number(eventoEstado.efecto.intensidad) || 1),
    maximo: Math.max(1, Number(eventoEstado.efecto.maximo) || 1),
    operacion: eventoEstado.operacion ?? null,
    alcanzoMaximo: eventoEstado.alcanzoMaximo === true,
  });
}


export async function reproducirHabilidadProyectil(reproductor, evento, version) {
  const perfil = evento?.perfilVisual;
  if (!perfil || evento?.ritmoVisual?.secuencia !== "proyectil_basico") {
    return;
  }

  const contratoVisual = resolverContratoPatronVisualHabilidad(perfil);
  if (contratoVisual.patronVisual !== PATRONES_VISUALES_HABILIDAD.PROYECTIL) {
    return;
  }

  const impacto = evento.impactos?.[0] ?? null;
  const centroActor = obtenerCentroActorHabilidad(reproductor, evento);
  const centroObjetivo = obtenerCentroImpactoHabilidad(reproductor, evento, impacto);
  if (!centroActor || !centroObjetivo) {
    if (impacto) {
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

  const duracionPreparacion = reproductor.calcularDuracion(fases.preparacion ?? 1);
  const preparaciones = [];
  if (conjuracion) {
    preparaciones.push(reproductor.crearTween({
      targets: conjuracion,
      alpha: 0.92,
      scaleX: 1,
      scaleY: 1,
      angle: perfil.movimiento === "nervioso" ? 18 : 8,
      duration: duracionPreparacion,
      ease: "Sine.easeOut",
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

  if (version !== reproductor.versionCancelacion || reproductor.destruido) return;

  const angulo = Math.atan2(
    centroObjetivo.y - centroActor.y,
    centroObjetivo.x - centroActor.x,
  );
  const proyectil = reproductor.efectosReducidos
    ? null
    : reproductor.creadorEfectosHabilidades?.crearProyectil({
        centro: centroActor,
        destino: centroObjetivo,
        perfil,
        grado,
        anguloRad: angulo,
        critico: impacto?.critico === true,
      });
  if (proyectil) {
    proyectil.setAlpha?.(0.15);
    proyectil.setScale?.(0.58);
  }

  const duracionManifestacion = reproductor.calcularDuracion(
    fases.manifestacion ?? 1,
  );
  if (proyectil) {
    await reproductor.crearTween({
      targets: proyectil,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: duracionManifestacion,
      ease: "Quad.easeOut",
    }, version);
  } else {
    await reproductor.esperar(duracionManifestacion, version);
  }

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    proyectil?.destroy?.();
    conjuracion?.destroy?.();
    return;
  }

  const duracionTrayectoria = reproductor.calcularDuracion(fases.trayectoria ?? 1);
  const esDescargaAnclada = perfil.movimiento === "descarga_anclada";
  const estela = reproductor.efectosReducidos
    ? null
    : reproductor.creadorEfectosHabilidades?.crearEstela({
        origen: centroActor,
        destino: centroObjetivo,
        perfil,
        grado,
      });
  const animacionesTrayectoria = [];
  if (proyectil) {
    const esMovimientoPesado = perfil.movimiento === "pesado";
    const esImpulsoFuerte = perfil.movimiento === "impulso_fuerte";
    animacionesTrayectoria.push(reproductor.crearTween({
      targets: proyectil,
      x: esDescargaAnclada ? centroActor.x : centroObjetivo.x,
      y: esDescargaAnclada ? centroActor.y : centroObjetivo.y,
      angle: esDescargaAnclada
        ? proyectil.angle ?? 0
        : perfil.movimiento === "nervioso"
          ? (proyectil.angle ?? 0) + 36
          : esMovimientoPesado
            ? (proyectil.angle ?? 0) + 14
            : esImpulsoFuerte
              ? proyectil.angle ?? 0
              : (proyectil.angle ?? 0) + 8,
      scaleX: esMovimientoPesado ? 1.08 : esImpulsoFuerte ? 1.18 : 1,
      scaleY: esMovimientoPesado ? 0.92 : esImpulsoFuerte ? 0.86 : 1,
      alpha: esDescargaAnclada
        ? impacto?.impacto === false
          ? 0.42
          : 1
        : 1,
      duration: duracionTrayectoria,
      ease: resolverEaseHabilidad(perfil.movimiento),
    }, version));
  }
  if (estela) {
    animacionesTrayectoria.push(reproductor.crearTween({
      targets: estela,
      alpha: 0,
      duration: duracionTrayectoria,
      ease: "Sine.easeIn",
    }, version));
  }
  if (animacionesTrayectoria.length > 0) {
    await Promise.all(animacionesTrayectoria);
  } else {
    await reproductor.esperar(duracionTrayectoria, version);
  }
  proyectil?.destroy?.();
  estela?.destroy?.();

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    conjuracion?.destroy?.();
    return;
  }

  const duracionImpacto = reproductor.calcularDuracion(fases.impacto ?? 1);
  const intensidadVisual = perfil.impacto === "corrosion_expansiva"
    ? obtenerIntensidadEnvenenamientoImpacto(impacto)
    : null;
  const efectoImpacto =
    impacto?.impacto === true && !reproductor.efectosReducidos
      ? reproductor.creadorEfectosHabilidades?.crearImpacto({
          centro: centroObjetivo,
          perfil,
          grado,
          critico: impacto.critico === true,
          intensidadVisual,
        })
      : null;
  const promesasImpacto = [];
  if (efectoImpacto) {
    promesasImpacto.push(
      reproductor.crearTween({
        targets: efectoImpacto,
        alpha: 0,
        scaleX: 1.45,
        scaleY: 1.45,
        duration: duracionImpacto,
        ease: "Quad.easeOut",
      }, version).then(() => efectoImpacto.destroy?.()),
    );
  }
  if (impacto) {
    promesasImpacto.push(
      reproducirResultadoImpactoHabilidad(reproductor, evento, impacto, version),
    );
  }
  if (promesasImpacto.length > 0) await Promise.all(promesasImpacto);
  else await reproductor.esperar(duracionImpacto, version);

  const duracionRetorno = reproductor.calcularDuracion(fases.retorno ?? 1);
  const retornos = [];
  if (conjuracion) {
    retornos.push(reproductor.crearTween({
      targets: conjuracion,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
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
