import {
  CENTROS_VISUALES_HABILIDAD,
  PATRONES_VISUALES_HABILIDAD,
  resolverContratoPatronVisualHabilidad,
} from "../../PatronesVisualesHabilidades.js";
import { TIPOS_EVENTO_VISUAL } from "../../PlanificadorEventosVisuales.js";
import { TAMANO_CASILLA_REFERENCIA } from "../ConfiguracionPhaser.js";

// Reproducción visual de habilidades ya resueltas por el motor de juego.

function convertirCambiosRecursosARecuperacion(recursos) {
  if (!Array.isArray(recursos)) return [];
  return recursos
    .map((recurso) => {
      const cantidadAplicada = Math.max(0, Number(recurso?.cantidadReal) || 0);
      const valorMaximo = Math.max(0, Number(recurso?.valorMaximo) || 0);
      if (cantidadAplicada <= 0 || valorMaximo <= 0) return null;
      return {
        recurso: recurso?.recurso === "mana" ? "mana" : "vida",
        cantidadAplicada,
        valorAntes: Math.max(0, Number(recurso?.valorAntes) || 0),
        valorDespues: Math.max(0, Number(recurso?.valorDespues) || 0),
        valorMaximo,
        proporcionRecuperada: Math.min(1, cantidadAplicada / valorMaximo),
      };
    })
    .filter(Boolean);
}

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

function calcularAnilloArea(origen, destino) {
  if (
    !Number.isInteger(origen?.x) ||
    !Number.isInteger(origen?.y) ||
    !Number.isInteger(destino?.x) ||
    !Number.isInteger(destino?.y)
  ) {
    return 0;
  }
  return Math.max(
    Math.abs(destino.x - origen.x),
    Math.abs(destino.y - origen.y),
  );
}

function crearClaveCasillaVisual(casilla) {
  return Number.isInteger(casilla?.x) && Number.isInteger(casilla?.y)
    ? `${casilla.x}:${casilla.y}`
    : "";
}

function sonMismaCasilla(a, b) {
  return (
    Number.isInteger(a?.x) &&
    Number.isInteger(a?.y) &&
    a.x === b?.x &&
    a.y === b?.y
  );
}

export async function reproducirHabilidadResuelta(reproductor, evento, version) {
  reproductor.compositor.ocultarSeleccionTemporal?.();

  if (evento?.ritmoVisual?.secuencia === "area_conjurada") {
    await reproductor.reproducirHabilidadArea(evento, version);
    return;
  }

  if (evento?.ritmoVisual?.secuencia === "cadena_conjurada") {
    await reproductor.reproducirHabilidadCadena(evento, version);
    return;
  }

  if (evento?.ritmoVisual?.secuencia === "linea_conjurada") {
    await reproductor.reproducirHabilidadLinea(evento, version);
    return;
  }

  if (evento?.ritmoVisual?.secuencia === "zona_conjurada") {
    await reproductor.reproducirHabilidadZona(evento, version);
    return;
  }

  const perfil = evento?.perfilVisual;
  if (!perfil || evento?.ritmoVisual?.secuencia !== "proyectil_basico") {
    return;
  }

  const contratoVisual = resolverContratoPatronVisualHabilidad(perfil);
  if (contratoVisual.patronVisual !== PATRONES_VISUALES_HABILIDAD.PROYECTIL) {
    return;
  }

  const impacto = evento.impactos?.[0] ?? null;
  const centroActor = reproductor.obtenerCentroActorHabilidad(evento);
  const centroObjetivo = reproductor.obtenerCentroImpactoHabilidad(evento, impacto);
  if (!centroActor || !centroObjetivo) {
    if (impacto) {
      await reproductor.reproducirResultadoImpactoHabilidad(evento, impacto, version);
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
      reproductor.reproducirResultadoImpactoHabilidad(evento, impacto, version),
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
      await reproductor.reproducirResultadoImpactoHabilidad(evento, impacto, version);
    }
    return;
  }

  const centroActor = reproductor.obtenerCentroActorHabilidad(evento);
  if (!centroActor) {
    for (const impacto of impactos) {
      await reproductor.reproducirResultadoImpactoHabilidad(evento, impacto, version);
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
        reproductor.reproducirResultadoImpactoHabilidad(evento, impacto, version),
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
    await reproductor.reproducirResultadoImpactoHabilidad(evento, impacto, version);
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

  const centroActor = reproductor.obtenerCentroActorHabilidad(evento);
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
    reproductor.reproducirResultadoImpactoHabilidad(evento, impacto, version),
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

  const centroActor = reproductor.obtenerCentroActorHabilidad(evento);
  if (!centroActor) {
    for (const impacto of impactos) {
      await reproductor.reproducirResultadoImpactoHabilidad(evento, impacto, version);
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
    const destinoSalto = reproductor.obtenerCentroImpactoHabilidad(evento, impacto);
    if (!destinoSalto) {
      await reproductor.reproducirResultadoImpactoHabilidad(evento, impacto, version);
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
      reproductor.reproducirResultadoImpactoHabilidad(evento, impacto, version),
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
export async function reproducirHabilidadArea(reproductor, evento, version) {
  const perfil = evento?.perfilVisual;
  if (!perfil || evento?.perfilVisual?.nivelVisual !== "intermedia") {
    return;
  }
  const contratoVisual = resolverContratoPatronVisualHabilidad(perfil);
  if (
    contratoVisual.patronVisual !==
    PATRONES_VISUALES_HABILIDAD.AREA_INSTANTANEA
  ) {
    return;
  }

  const centroActor = reproductor.obtenerCentroActorHabilidad(evento);
  const centroArea = reproductor.obtenerCentroAreaHabilidad(
    evento,
    contratoVisual,
  );
  if (!centroArea) {
    for (const impacto of evento.impactos ?? []) {
      if (version !== reproductor.versionCancelacion || reproductor.destruido) return;
      await reproductor.reproducirResultadoImpactoHabilidad(evento, impacto, version);
    }
    return;
  }

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
      scaleX: 1,
      scaleY: 1,
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

  const nucleo = reproductor.efectosReducidos
    ? null
    : reproductor.creadorAreasHabilidades?.crearNucleo({
        centro: centroArea,
        perfil,
        grado,
      });
  const duracionManifestacion = reproductor.calcularDuracion(fases.manifestacion ?? 1);
  if (nucleo) {
    await reproductor.crearTween({
      targets: nucleo,
      alpha: 0.96,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: duracionManifestacion,
      ease: "Quad.easeOut",
    }, version);
  } else {
    await reproductor.esperar(duracionManifestacion, version);
  }

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    nucleo?.destroy?.();
    conjuracion?.destroy?.();
    return;
  }

  const grupos = reproductor.agruparAreaPorAnillos(evento, contratoVisual);
  const duracionExpansion = reproductor.calcularDuracion(fases.expansion ?? 1);
  const cantidadAnillos = Math.max(1, grupos.length);
  const duracionAnillo = Math.max(60, Math.round(duracionExpansion / cantidadAnillos));
  const tile = reproductor.compositor.obtenerTamanoCasilla?.() ?? TAMANO_CASILLA_REFERENCIA;

  for (const grupo of grupos) {
    if (version !== reproductor.versionCancelacion || reproductor.destruido) break;

    const anillo = reproductor.efectosReducidos
      ? null
      : reproductor.creadorAreasHabilidades?.crearAnilloExpansion({
          centro: centroArea,
          perfil,
          grado,
          anillo: grupo.anillo,
          radioPx: tile * (0.38 + grupo.anillo),
          grosor: perfil.efectoCasilla === "fractura_hielo" ? 3 : 4,
        });

    const animaciones = [];
    if (anillo) {
      animaciones.push(reproductor.crearTween({
        targets: anillo,
        alpha: 0,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: duracionAnillo,
        ease: "Sine.easeOut",
      }, version).then(() => anillo.destroy?.()));
    }

    const impactosPorCasilla = new Map(
      grupo.impactos.map((impacto) => [
        crearClaveCasillaVisual(impacto.posicionObjetivo),
        impacto,
      ]),
    );
    for (const casilla of grupo.casillas) {
      const centroCasilla = reproductor.compositor.obtenerCentroCasilla?.(casilla);
      if (!centroCasilla || reproductor.efectosReducidos) continue;
      const efectoCasilla = reproductor.creadorAreasHabilidades?.crearEfectoCasilla({
        centro: centroCasilla,
        perfil,
        grado,
        anillo: grupo.anillo,
        esCentro: sonMismaCasilla(casilla, evento.posicionObjetivo),
        tieneObjetivo: impactosPorCasilla.has(crearClaveCasillaVisual(casilla)),
      });
      if (efectoCasilla) {
        animaciones.push(reproductor.crearTween({
          targets: efectoCasilla,
          alpha: 0,
          scaleX: 1.12,
          scaleY: 1.12,
          duration: Math.max(150, Math.round(duracionAnillo * 1.55)),
          ease: "Quad.easeOut",
        }, version).then(() => efectoCasilla.destroy?.()));
      }
    }

    for (const impacto of grupo.impactos) {
      const centroObjetivo = reproductor.obtenerCentroImpactoHabilidad(evento, impacto);
      const pulso = reproductor.efectosReducidos || !centroObjetivo
        ? null
        : reproductor.creadorAreasHabilidades?.crearPulsoObjetivo({
            centro: centroObjetivo,
            perfil,
            grado,
            anillo: grupo.anillo,
            esObjetivoPrimario:
              Boolean(evento.idObjetivoPrimario) &&
              impacto.idObjetivo === evento.idObjetivoPrimario,
          });
      if (pulso) {
        animaciones.push(reproductor.crearTween({
          targets: pulso,
          alpha: 0,
          scaleX: 1.28,
          scaleY: 1.28,
          duration: Math.max(40, Math.round(duracionAnillo * 0.85)),
          ease: "Quad.easeOut",
        }, version).then(() => pulso.destroy?.()));
      }
      animaciones.push(reproductor.reproducirResultadoImpactoHabilidad(evento, impacto, version));
    }

    if (animaciones.length > 0) await Promise.all(animaciones);
    else await reproductor.esperar(duracionAnillo, version);
  }

  const duracionRetorno = reproductor.calcularDuracion(fases.retorno ?? 1);
  const retornos = [];
  if (nucleo) {
    retornos.push(reproductor.crearTween({
      targets: nucleo,
      alpha: 0,
      scaleX: 1.22,
      scaleY: 1.22,
      duration: duracionRetorno,
      ease: "Sine.easeIn",
    }, version).then(() => nucleo.destroy?.()));
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
export function obtenerCentroAreaHabilidad(reproductor, evento, contratoVisual) {
  if (contratoVisual?.centroVisual === CENTROS_VISUALES_HABILIDAD.ACTOR) {
    return reproductor.obtenerCentroActorHabilidad(evento);
  }
  if (
    contratoVisual?.centroVisual ===
    CENTROS_VISUALES_HABILIDAD.OBJETIVO_PRIMARIO
  ) {
    const nodo = evento.idObjetivoPrimario
      ? reproductor.compositor.obtenerNodoEntidad(evento.idObjetivoPrimario)
      : null;
    if (nodo?.contenedor) {
      return { x: nodo.contenedor.x, y: nodo.contenedor.y };
    }
    return reproductor.compositor.obtenerCentroCasilla(
      evento.posicionObjetivoPrimario ?? evento.posicionObjetivo,
    );
  }
  return reproductor.compositor.obtenerCentroCasilla(evento.posicionObjetivo);
}
export function agruparAreaPorAnillos(reproductor, evento, contratoVisual) {
  const origen =
    contratoVisual?.centroVisual === CENTROS_VISUALES_HABILIDAD.ACTOR
      ? evento?.origenActor
      : contratoVisual?.centroVisual ===
          CENTROS_VISUALES_HABILIDAD.OBJETIVO_PRIMARIO
        ? evento?.posicionObjetivoPrimario ?? evento?.posicionObjetivo
        : evento?.posicionObjetivo;
  const grupos = new Map();
  for (const casilla of evento.casillasAfectadas ?? []) {
    const anillo = calcularAnilloArea(origen, casilla);
    const actual = grupos.get(anillo) ?? { anillo, casillas: [], impactos: [] };
    actual.casillas.push(casilla);
    grupos.set(anillo, actual);
  }
  for (const impacto of evento.impactos ?? []) {
    const anillo = calcularAnilloArea(origen, impacto.posicionObjetivo);
    const actual = grupos.get(anillo) ?? { anillo, casillas: [], impactos: [] };
    actual.impactos.push(impacto);
    grupos.set(anillo, actual);
  }
  return [...grupos.values()]
    .sort((a, b) => a.anillo - b.anillo)
    .map((grupo) => ({
      anillo: grupo.anillo,
      casillas: grupo.casillas,
      impactos: grupo.impactos.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
    }));
}
export function obtenerCentroActorHabilidad(reproductor, evento) {
  const nodo = reproductor.compositor.obtenerNodoEntidad(evento.idActor);
  if (nodo?.contenedor) {
    return { x: nodo.contenedor.x, y: nodo.contenedor.y };
  }
  return reproductor.compositor.obtenerCentroCasilla(evento.origenActor);
}
export function obtenerCentroImpactoHabilidad(reproductor, evento, impacto) {
  const nodo = impacto?.idObjetivo
    ? reproductor.compositor.obtenerNodoEntidad(impacto.idObjetivo)
    : null;
  if (nodo?.contenedor) {
    return { x: nodo.contenedor.x, y: nodo.contenedor.y };
  }
  return reproductor.compositor.obtenerCentroCasilla(
    impacto?.posicionObjetivo ?? evento.posicionObjetivo,
  );
}
export async function reproducirResultadoImpactoHabilidad(reproductor, evento, impacto, version) {
  const eventoResultado = {
    ...evento,
    esHabilidad: true,
    idAtacante: evento.idActor,
    idObjetivo: impacto.idObjetivo,
    origenAtacante: evento.origenActor,
    posicionObjetivo: impacto.posicionObjetivo ?? evento.posicionObjetivo,
  };
  const golpe = {
    impacto: impacto.impacto === true,
    bloqueado: false,
    critico: impacto.critico === true,
    danio: Math.max(0, Number(impacto.danio?.cantidad) || 0),
    vidaObjetivoAntes: impacto.danio?.vidaObjetivoAntes ?? null,
    vidaObjetivoDespues: impacto.danio?.vidaObjetivoDespues ?? null,
    vidaObjetivoMaxima: impacto.danio?.vidaObjetivoMaxima ?? null,
  };
  await reproductor.reproducirResultadoGolpe(
    eventoResultado,
    golpe,
    impacto.orden ?? 0,
    version,
    { esperarDecorativos: false },
  );

  const recursosRecuperados = convertirCambiosRecursosARecuperacion(
    impacto.recursosObjetivo,
  );
  if (recursosRecuperados.length > 0) {
    await reproductor.reproducirRecuperacionHabilidad({
      evento,
      impacto,
      recursos: recursosRecuperados,
      version,
    });
  }

  for (const eventoEfecto of impacto.eventosEfectos ?? []) {
    if (version !== reproductor.versionCancelacion || reproductor.destruido) return;
    await reproductor.reproducirEventoVisual(eventoEfecto, version);
  }

  if (impacto.derrotaVisual) {
    await reproductor.reproducirEntidadDerrotada(impacto.derrotaVisual, version);
  }
  if (impacto.botinVisual) {
    await reproductor.reproducirBotinAparecido(impacto.botinVisual, version);
  }
}
