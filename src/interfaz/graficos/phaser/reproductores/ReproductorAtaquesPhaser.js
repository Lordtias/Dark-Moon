import { obtenerPerfilAtaque } from "../../ContextoPerfilesAtaquePorFamilia.js";
import { CONFIGURACION_ANIMACIONES_PHASER } from "../ConfiguracionAnimacionesPhaser.js";
import { TAMANO_CASILLA_REFERENCIA } from "../ConfiguracionPhaser.js";
import { ANCLAJES_RECURSO } from "../CreadorRecursosVisualesPhaser.js";
import {
  CONFIGURACION_EFECTOS_COMBATE_PHASER,
} from "../ConfiguracionEfectosCombatePhaser.js";
import { normalizarDireccionVisual } from "../GeometriaVisualPhaser.js";
import {
  reproducirResultadoGolpe as reproducirResultadoGolpeCompartido,
} from "./ReproductorResultadosVisualesPhaser.js";

// Reproducción visual de ataques ya resueltos por el sistema de combate.

export async function reproducirAtaqueResuelto(reproductor, evento, version) {
  reproductor.compositor.ocultarSeleccionTemporal?.();

  const golpes = obtenerGolpesVisuales(reproductor, evento);
  if (evento.presentacionOrigenOculto === true) {
    await reproducirConsecuenciaAtaqueOrigenOculto(reproductor,
      evento,
      golpes,
      version,
    );
    return;
  }
  if (esAtaqueVarita(reproductor, evento) && evento.ritmoVisual) {
    await reproducirAtaqueVarita(reproductor, evento, golpes, version);
  } else if (esAtaqueArco(reproductor, evento) && evento.ritmoVisual) {
    await reproducirAtaqueArco(reproductor, evento, golpes, version);
  } else if (esAtaqueCuerpoACuerpo(reproductor, evento) && evento.ritmoVisual) {
    await reproducirAtaqueCuerpoACuerpo(reproductor, evento, golpes, version);
  } else {
    await reproducirAtaqueProvisional(reproductor, evento, golpes, version);
  }

  if (evento.esAtaqueEnemigo) {
    await reproductor.esperar(
      reproductor.calcularDuracion(
        CONFIGURACION_ANIMACIONES_PHASER.pausaEntreAtaquesEnemigosMs,
      ),
      version,
    );
  }
}
export async function reproducirConsecuenciaAtaqueOrigenOculto(reproductor, evento, golpes, version) {
  if (!evento.idObjetivo) return;

  const golpesValidos = (Array.isArray(golpes) ? golpes : []).filter(Boolean);
  for (let indice = 0; indice < golpesValidos.length; indice += 1) {
    if (version !== reproductor.versionCancelacion || reproductor.destruido) return;
    await reproducirResultadoGolpe(reproductor,
      evento,
      golpesValidos[indice],
      indice,
      version,
    );
  }
}
export function esAtaqueCuerpoACuerpo(reproductor, evento) {
  const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
  return fuentes.length === 0 || fuentes.every(
    (fuente) =>
      fuente?.esAtaqueNatural === true ||
      fuente?.tipoAtaque === "cuerpoACuerpo",
  );
}
export function esAtaqueArco(reproductor, evento) {
  const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
  return fuentes.length === 1 &&
    fuentes[0]?.familiaObjeto === "arco" &&
    fuentes[0]?.tipoAtaque === "distancia";
}
export function esAtaqueVarita(reproductor, evento) {
  const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
  return fuentes.length > 0 &&
    fuentes.every(
      (fuente) =>
        fuente?.familiaObjeto === "varita" &&
        fuente?.tipoAtaque === "distancia" &&
        typeof fuente?.elementoAtaqueBasico === "string",
    );
}
export async function reproducirAtaqueProvisional(reproductor, evento, golpes, version) {
  for (let indice = 0; indice < golpes.length; indice += 1) {
    if (version !== reproductor.versionCancelacion || reproductor.destruido) return;
    await reproducirGolpeProvisional(reproductor,
      evento,
      golpes[indice],
      indice,
      version,
    );

    if (indice < golpes.length - 1) {
      await reproductor.esperar(
        reproductor.calcularDuracion(
          CONFIGURACION_EFECTOS_COMBATE_PHASER.golpe.pausaEntreGolpesMs,
        ),
        version,
      );
    }
  }
}
export async function reproducirAtaqueArco(reproductor, evento, golpes, version) {
  const nodo = reproductor.compositor.obtenerNodoEntidad(evento.idAtacante);
  const centroBase = nodo?.contenedor
    ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
    : reproductor.compositor.obtenerCentroCasilla(evento.origenAtacante);
  const centroObjetivo = reproductor.compositor.obtenerCentroCasilla(
    evento.posicionObjetivo,
  );
  const municion = evento?.resultado?.municionUtilizada ?? null;

  if (
    !nodo?.contenedor ||
    !centroBase ||
    !centroObjetivo ||
    !municion?.recursoVisual
  ) {
    await reproducirAtaqueProvisional(reproductor, evento, golpes, version);
    return;
  }

  const golpe = golpes[0] ?? null;
  const perfil = obtenerPerfilGolpe(reproductor, evento, golpe, 0);
  const fases = evento.ritmoVisual?.fases ?? {};
  const direccion = normalizarDireccionVisual({
    origen: centroBase,
    destino: centroObjetivo,
  });
  const lateral = { x: -direccion.y, y: direccion.x };
  const signoDesvio =
    ((evento.posicionObjetivo?.x ?? 0) +
      (evento.posicionObjetivo?.y ?? 0)) %
      2 ===
    0
      ? 1
      : -1;
  const centroPreparado = {
    x: centroBase.x - direccion.x * 3,
    y: centroBase.y - direccion.y * 3,
  };

  await moverNodoAtaque(reproductor, {
    nodo,
    destino: centroPreparado,
    duracion: reproductor.calcularDuracion(
      fases.preparacion ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs,
    ),
    ease: "Sine.easeOut",
    version,
  });

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    reproductor.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
    return;
  }

  const angulo = Math.atan2(direccion.y, direccion.x);
  const proyectil = reproductor.efectosReducidos
    ? null
    : await reproductor.creadorRecursosVisuales?.crearSpriteTemporal({
        recursoVisual: municion.recursoVisual,
        centro: centroBase,
        longitudVisiblePx: Number(perfil?.animacion?.tamanoVisualPx) || 24,
        anguloRad: angulo,
        orientacionBaseGrados:
          Number(perfil?.animacion?.orientacionBaseGrados) || 0,
        anclaje: ANCLAJES_RECURSO.CENTRO,
        alpha: 0.72,
        tint: golpe?.critico === true ? 0xffe49a : null,
      });

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    proyectil?.destroy?.();
    reproductor.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
    return;
  }

  const duracionLanzamiento = reproductor.calcularDuracion(
    fases.lanzamiento ?? 1,
  );
  const duracionTrayectoria = reproductor.calcularDuracion(
    fases.trayectoria ?? 1,
  );
  const destinoProyectil =
    golpe?.impacto === false && evento.idObjetivo
      ? {
          x:
            centroObjetivo.x +
            lateral.x * signoDesvio * 9 +
            direccion.x * 5,
          y:
            centroObjetivo.y +
            lateral.y * signoDesvio * 9 +
            direccion.y * 5,
        }
      : centroObjetivo;

  if (proyectil) {
    const escalaX = proyectil.scaleX ?? 1;
    const escalaY = proyectil.scaleY ?? 1;
    if (golpe?.critico === true) proyectil.scaleY = escalaY * 1.22;

    await reproductor.crearTween({
      targets: proyectil,
      x: centroBase.x + direccion.x * 5,
      y: centroBase.y + direccion.y * 5,
      alpha: 1,
      duration: duracionLanzamiento,
      ease: "Quad.easeOut",
    }, version);

    await reproductor.crearTween({
      targets: proyectil,
      x: destinoProyectil.x,
      y: destinoProyectil.y,
      alpha: golpe?.impacto === false ? 0.72 : 1,
      scaleX: escalaX,
      scaleY: golpe?.critico === true ? escalaY * 1.22 : escalaY,
      duration: duracionTrayectoria,
      ease: "Linear",
    }, version);
  } else {
    await reproductor.esperar(duracionLanzamiento + duracionTrayectoria, version);
  }

  const resultadosPendientes = [];
  if (golpe) {
    resultadosPendientes.push(
      reproducirResultadoGolpe(reproductor, evento, golpe, 0, version, {
        esperarDecorativos: false,
      }),
    );
  }

  const impacto =
    golpe?.impacto === true && evento.idObjetivo && !reproductor.efectosReducidos
      ? reproductor.creadorEfectos?.crearImpactoProyectil({
          centro: centroObjetivo,
          critico: golpe?.critico === true,
        })
      : null;

  proyectil?.destroy?.();

  await Promise.all([
    moverNodoAtaque(reproductor, {
      nodo,
      destino: centroBase,
      duracion: reproductor.calcularDuracion(fases.retorno ?? 1),
      ease: "Sine.easeInOut",
      version,
    }),
    animarEfectoAtaque(reproductor,
      impacto,
      Math.max(1, Math.round(duracionTrayectoria * 0.65)),
      version,
      { critico: golpe?.critico === true },
    ),
    ...resultadosPendientes,
  ]);

  reproductor.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
}
export async function reproducirAtaqueVarita(reproductor, evento, golpes, version) {
  const nodo = reproductor.compositor.obtenerNodoEntidad(evento.idAtacante);
  const centroBase = nodo?.contenedor
    ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
    : reproductor.compositor.obtenerCentroCasilla(evento.origenAtacante);
  const centroObjetivo = reproductor.compositor.obtenerCentroCasilla(
    evento.posicionObjetivo,
  );
  const disparos = obtenerDisparosVarita(reproductor, evento, golpes);

  if (
    !nodo?.contenedor ||
    !centroBase ||
    !centroObjetivo ||
    disparos.length === 0
  ) {
    await reproducirAtaqueProvisional(reproductor, evento, golpes, version);
    return;
  }

  const fases = evento.ritmoVisual?.fases ?? {};
  const fuentesCanalizacion = (evento?.configuracionAtaque?.fuentes ?? [])
    .filter((fuente) => fuente?.familiaObjeto === "varita");
  const direccion = normalizarDireccionVisual({
    origen: centroBase,
    destino: centroObjetivo,
  });
  const lateral = { x: -direccion.y, y: direccion.x };
  const canalizacion = reproductor.efectosReducidos
    ? null
    : reproductor.creadorProyectilesElementales?.crearCanalizacion({
        centro: centroBase,
        elementos: fuentesCanalizacion.map(
          (fuente) => fuente.elementoAtaqueBasico,
        ),
        criticos: fuentesCanalizacion.map((fuente) =>
          disparos.some(
            (disparo) =>
              disparo.fuente.mano === fuente.mano &&
              disparo.golpe?.critico === true,
          ),
        ),
      });
  const duracionPreparacion = reproductor.calcularDuracion(
    fases.preparacion ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs,
  );

  if (canalizacion) {
    canalizacion.setScale?.(0.65);
    await reproductor.crearTween({
      targets: canalizacion,
      scaleX: 1.16,
      scaleY: 1.16,
      alpha: 0.9,
      angle: disparos.length > 1 ? 35 : 18,
      duration: duracionPreparacion,
      ease: "Sine.easeOut",
    }, version);
    canalizacion.destroy?.();
  } else {
    await reproductor.esperar(duracionPreparacion, version);
  }

  for (let indice = 0; indice < disparos.length; indice += 1) {
    if (version !== reproductor.versionCancelacion || reproductor.destruido) break;
    const disparo = disparos[indice];
    const esSecundaria = disparo.fuente.mano === "secundaria";
    const signoLateral = esSecundaria ? -1 : 1;
    const origenProyectil = {
      x: centroBase.x + lateral.x * signoLateral * 3,
      y: centroBase.y + lateral.y * signoLateral * 3,
    };
    const golpe = disparo.golpe;
    const destinoProyectil =
      golpe?.impacto === false && evento.idObjetivo
        ? {
            x:
              centroObjetivo.x +
              lateral.x * signoLateral * 10 +
              direccion.x * 4,
            y:
              centroObjetivo.y +
              lateral.y * signoLateral * 10 +
              direccion.y * 4,
          }
        : centroObjetivo;
    const angulo = Math.atan2(
      destinoProyectil.y - origenProyectil.y,
      destinoProyectil.x - origenProyectil.x,
    );
    const esDual = evento.ritmoVisual.secuencia === "proyectil_dual";
    const idLanzamiento = esDual
      ? esSecundaria
        ? "lanzamientoSecundaria"
        : "lanzamientoPrincipal"
      : "lanzamiento";
    const idTrayectoria = esDual
      ? esSecundaria
        ? "trayectoriaSecundaria"
        : "trayectoriaPrincipal"
      : "trayectoria";
    const duracionLanzamiento = reproductor.calcularDuracion(
      fases[idLanzamiento] ?? 1,
    );
    const duracionTrayectoria = reproductor.calcularDuracion(
      fases[idTrayectoria] ?? 1,
    );
    const proyectil = reproductor.efectosReducidos
      ? null
      : reproductor.creadorProyectilesElementales?.crearProyectil({
          elemento: disparo.fuente.elementoAtaqueBasico,
          centro: origenProyectil,
          anguloRad: angulo,
          critico: golpe?.critico === true,
          mano: disparo.fuente.mano,
        });

    if (proyectil) {
      proyectil.setScale?.(0.72);
      await reproductor.crearTween({
        targets: proyectil,
        x: origenProyectil.x + direccion.x * 5,
        y: origenProyectil.y + direccion.y * 5,
        scaleX: golpe?.critico === true ? 1.18 : 1,
        scaleY: golpe?.critico === true ? 1.18 : 1,
        alpha: 1,
        duration: duracionLanzamiento,
        ease: "Quad.easeOut",
      }, version);
    } else {
      await reproductor.esperar(duracionLanzamiento, version);
    }

    const estela = reproductor.efectosReducidos
      ? null
      : reproductor.creadorProyectilesElementales?.crearEstela({
          elemento: disparo.fuente.elementoAtaqueBasico,
          origen: origenProyectil,
          destino: destinoProyectil,
          critico: golpe?.critico === true,
          mano: disparo.fuente.mano,
        });
    const animacionesTrayectoria = [];
    if (proyectil) {
      animacionesTrayectoria.push(reproductor.crearTween({
        targets: proyectil,
        x: destinoProyectil.x,
        y: destinoProyectil.y,
        alpha: golpe?.impacto === false ? 0.42 : 1,
        duration: duracionTrayectoria,
        ease: "Quad.easeInOut",
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

    if (version !== reproductor.versionCancelacion || reproductor.destruido) {
      proyectil?.destroy?.();
      estela?.destroy?.();
      break;
    }

    const impacto =
      golpe?.impacto === true && evento.idObjetivo && !reproductor.efectosReducidos
        ? reproductor.creadorProyectilesElementales?.crearImpacto({
            elemento: disparo.fuente.elementoAtaqueBasico,
            centro: centroObjetivo,
            critico: golpe?.critico === true,
          })
        : null;
    proyectil?.destroy?.();
    estela?.destroy?.();

    await Promise.all([
      golpe
        ? reproducirResultadoGolpe(reproductor, evento, golpe, indice, version, {
            esperarDecorativos: false,
          })
        : Promise.resolve(),
      animarEfectoAtaque(reproductor,
        impacto,
        Math.max(1, Math.round(duracionTrayectoria * 0.72)),
        version,
        { critico: golpe?.critico === true },
      ),
    ]);

    if (indice < disparos.length - 1) {
      await reproductor.esperar(
        reproductor.calcularDuracion(fases.pausaEntreManos ?? 1),
        version,
      );
    }
  }

  await reproductor.esperar(
    reproductor.calcularDuracion(fases.retorno ?? 1),
    version,
  );
  reproductor.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
}
export function obtenerDisparosVarita(reproductor, evento, golpes) {
  const fuentes = (evento?.configuracionAtaque?.fuentes ?? []).filter(
    (fuente) => fuente?.familiaObjeto === "varita",
  );

  if (!evento.idObjetivo) {
    return fuentes.map((fuente) => Object.freeze({ fuente, golpe: null }));
  }

  const golpesValidos = (Array.isArray(golpes) ? golpes : []).filter(Boolean);
  return golpesValidos.map((golpe, indice) => {
    const fuente =
      fuentes.find((actual) => golpe?.mano && actual?.mano === golpe.mano) ??
      fuentes[indice] ??
      fuentes[0];
    return Object.freeze({ fuente, golpe });
  }).filter((disparo) => disparo.fuente);
}
export async function reproducirAtaqueCuerpoACuerpo(reproductor, evento, golpes, version) {
  const nodo = reproductor.compositor.obtenerNodoEntidad(evento.idAtacante);
  const centroBase = nodo?.contenedor
    ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
    : reproductor.compositor.obtenerCentroCasilla(evento.origenAtacante);
  const centroObjetivo = reproductor.compositor.obtenerCentroCasilla(
    evento.posicionObjetivo,
  );

  if (!nodo?.contenedor || !centroBase || !centroObjetivo) {
    await reproducirAtaqueProvisional(reproductor, evento, golpes, version);
    return;
  }

  const direccion = normalizarDireccionVisual({
    origen: centroBase,
    destino: centroObjetivo,
  });
  const resultadosPendientes = [];
  const fases = evento.ritmoVisual?.fases ?? {};
  const perfilInicial = obtenerPerfilGolpe(reproductor, evento, golpes[0], 0);
  const avanceInicial = obtenerAvancePixeles(reproductor, perfilInicial);
  const centroPreparado = {
    x: centroBase.x - direccion.x * avanceInicial * 0.22,
    y: centroBase.y - direccion.y * avanceInicial * 0.22,
  };

  await moverNodoAtaque(reproductor, {
    nodo,
    destino: centroPreparado,
    duracion: reproductor.calcularDuracion(
      fases.preparacion ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs / 4,
    ),
    ease: "Sine.easeOut",
    version,
  });

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    reproductor.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
    return;
  }

  if (evento.ritmoVisual.secuencia === "estocada") {
    await reproducirEstocada(reproductor, {
      evento,
      golpe: golpes[0],
      perfil: perfilInicial,
      nodo,
      centroBase,
      centroPreparado,
      centroObjetivo,
      direccion,
      fases,
      resultadosPendientes,
      version,
    });
  } else {
    for (let indice = 0; indice < golpes.length; indice += 1) {
      if (version !== reproductor.versionCancelacion || reproductor.destruido) break;
      const golpe = golpes[indice];
      const perfil = obtenerPerfilGolpe(reproductor, evento, golpe, indice);
      const idFase = evento.ritmoVisual.secuencia === "dual"
        ? indice === 0
          ? "golpePrincipal"
          : "golpeSecundario"
        : "accion";
      await reproducirGolpeFisico(reproductor, {
        evento,
        golpe,
        indiceGolpe: indice,
        perfil,
        nodo,
        centroPreparado,
        centroObjetivo,
        direccion,
        duracion: reproductor.calcularDuracion(
          fases[idFase] ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs,
        ),
        resultadosPendientes,
        version,
      });

      if (indice < golpes.length - 1) {
        await reproductor.esperar(
          reproductor.calcularDuracion(fases.pausaEntreManos ?? 1),
          version,
        );
      }
    }
  }

  await moverNodoAtaque(reproductor, {
    nodo,
    destino: centroBase,
    duracion: reproductor.calcularDuracion(
      fases.retorno ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs / 3,
    ),
    ease: "Sine.easeInOut",
    version,
  });
  await Promise.all(resultadosPendientes);
  reproductor.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
}
export async function reproducirGolpeFisico(reproductor, {
  evento,
  golpe,
  indiceGolpe,
  perfil,
  nodo,
  centroPreparado,
  centroObjetivo,
  direccion,
  duracion,
  resultadosPendientes,
  version,
}) {
  const avance = obtenerAvancePixeles(reproductor, perfil);
  const lateral = { x: -direccion.y, y: direccion.x };
  const signoMano = golpe?.mano === "secundaria" ? -1 : 1;
  const centroAtaque = {
    x: centroPreparado.x + direccion.x * avance + lateral.x * signoMano * 1.5,
    y: centroPreparado.y + direccion.y * avance + lateral.y * signoMano * 1.5,
  };
  const ida = Math.max(1, Math.round(duracion * 0.55));
  const vuelta = Math.max(1, duracion - ida);

  await moverNodoAtaque(reproductor, {
    nodo,
    destino: centroAtaque,
    duracion: ida,
    ease: "Quad.easeOut",
    version,
  });

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    return;
  }

  const efecto = reproductor.efectosReducidos
    ? null
    : reproductor.creadorEfectos?.crearEfectoAtaqueCuerpoACuerpo({
        centroAtacante: centroAtaque,
        centroObjetivo,
        animacion: perfil.animacion,
        mano: golpe?.mano ?? null,
        critico: golpe?.critico === true,
      });
  if (golpe) {
    resultadosPendientes.push(
      reproducirResultadoGolpe(reproductor,
        evento,
        golpe,
        indiceGolpe,
        version,
        { esperarDecorativos: false },
      ),
    );
  }

  await Promise.all([
    moverNodoAtaque(reproductor, {
      nodo,
      destino: centroPreparado,
      duracion: vuelta,
      ease: "Sine.easeIn",
      version,
    }),
    animarEfectoAtaque(reproductor, efecto, duracion, version, {
      critico: golpe?.critico === true,
    }),
  ]);
}
export async function reproducirEstocada(reproductor, {
  evento,
  golpe,
  perfil,
  nodo,
  centroBase,
  centroPreparado,
  centroObjetivo,
  direccion,
  fases,
  resultadosPendientes,
  version,
}) {
  const fuente = obtenerFuenteGolpe(reproductor, evento, golpe, 0);
  const recursoVisual = fuente?.recursoVisual ?? null;
  const dxCasillas =
    (evento.posicionObjetivo?.x ?? 0) -
    (evento.origenAtacante?.x ?? 0);
  const dyCasillas =
    (evento.posicionObjetivo?.y ?? 0) -
    (evento.origenAtacante?.y ?? 0);
  const distanciaCasillas = Math.max(
    Math.abs(dxCasillas),
    Math.abs(dyCasillas),
  );
  const origenVisual =
    distanciaCasillas >= 2
      ? {
          x:
            centroBase.x +
            Math.sign(dxCasillas) * TAMANO_CASILLA_REFERENCIA,
          y:
            centroBase.y +
            Math.sign(dyCasillas) * TAMANO_CASILLA_REFERENCIA,
        }
      : centroBase;
  const pasoDiagonal =
    Math.abs(direccion.x) > 0.01 && Math.abs(direccion.y) > 0.01
      ? Math.SQRT2
      : 1;
  const longitudVisual =
    (Number(perfil?.animacion?.longitudVisualCasillas) || 2) *
    TAMANO_CASILLA_REFERENCIA *
    pasoDiagonal;
  const angulo = Math.atan2(direccion.y, direccion.x);
  const lanza =
    reproductor.efectosReducidos || !recursoVisual
      ? null
      : await reproductor.creadorRecursosVisuales?.crearSpriteTemporal({
          recursoVisual,
          centro: origenVisual,
          longitudVisiblePx: longitudVisual,
          anguloRad: angulo,
          orientacionBaseGrados:
            Number(perfil?.animacion?.orientacionBaseGrados) || 0,
          anclaje: ANCLAJES_RECURSO.CENTRO,
          alpha: 0,
          tint: golpe?.critico === true ? 0xffe49a : null,
        });

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    lanza?.destroy?.();
    return;
  }

  const duracionAparicion = reproductor.calcularDuracion(fases.avance ?? 1);
  const duracionEstocada = reproductor.calcularDuracion(fases.estocada ?? 1);

  if (lanza) {
    const escalaX = lanza.scaleX ?? 1;
    const escalaY = lanza.scaleY ?? 1;
    lanza.scaleX = escalaX * 0.82;
    if (golpe?.critico === true) lanza.scaleY = escalaY * 1.2;
    await reproductor.crearTween({
      targets: lanza,
      scaleX: escalaX,
      scaleY: golpe?.critico === true ? escalaY * 1.2 : escalaY,
      alpha: 1,
      duration: duracionAparicion,
      ease: "Quad.easeOut",
    }, version);
  } else {
    await reproductor.esperar(duracionAparicion, version);
  }

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    lanza?.destroy?.();
    return;
  }

  if (golpe) {
    resultadosPendientes.push(
      reproducirResultadoGolpe(reproductor, evento, golpe, 0, version, {
        esperarDecorativos: false,
      }),
    );
  }

  if (lanza) {
    const escalaY = lanza.scaleY ?? 1;
    await reproductor.crearTween({
      targets: lanza,
      alpha: 0.2,
      scaleY: golpe?.critico === true ? escalaY * 1.08 : escalaY,
      duration: duracionEstocada,
      ease: "Sine.easeInOut",
    }, version);
    lanza.destroy?.();
  } else {
    await reproductor.esperar(duracionEstocada, version);
  }

  reproductor.compositor.posicionarNodoEntidad(evento.idAtacante, centroPreparado);
}
export function obtenerPerfilGolpe(reproductor, evento, golpe, indiceGolpe) {
  const fuente = obtenerFuenteGolpe(reproductor, evento, golpe, indiceGolpe);
  return obtenerPerfilAtaque({
    familiaObjeto: fuente?.familiaObjeto ?? null,
    esAtaqueNatural: fuente?.esAtaqueNatural === true || fuente === null,
  });
}
export function obtenerFuenteGolpe(reproductor, evento, golpe, indiceGolpe) {
  const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
  return (
    fuentes.find((actual) => golpe?.mano && actual?.mano === golpe.mano) ??
    fuentes[indiceGolpe] ??
    fuentes[0] ??
    null
  );
}
export function obtenerAvancePixeles(reproductor, perfil) {
  return Math.max(2,
    (Number(perfil?.animacion?.avanceCasilla) || 0.25) *
      TAMANO_CASILLA_REFERENCIA,
  );
}
export function moverNodoAtaque(reproductor, { nodo, destino, duracion, ease, version }) {
  return reproductor.crearTween({
    targets: [nodo.contenedor, nodo.sombra].filter(Boolean),
    x: destino.x,
    y: destino.y,
    duration: Math.max(1, duracion),
    ease,
  }, version);
}
export async function animarEfectoAtaque(reproductor,
  efecto,
  duracion,
  version,
  { critico = false } = {},
) {
  if (!efecto) return;
  efecto.setScale?.(critico ? 0.82 : 0.75);
  await reproductor.crearTween({
    targets: efecto,
    scaleX: critico ? 1.42 : 1.18,
    scaleY: critico ? 1.42 : 1.18,
    alpha: 0,
    duration: Math.max(1, duracion),
    ease: "Quad.easeOut",
  }, version);
  efecto.destroy?.();
}
export function obtenerGolpesVisuales(reproductor, evento) {
  const golpes = evento?.resultado?.golpes;
  if (Array.isArray(golpes) && golpes.length > 0) {
    return golpes;
  }

  const golpesRealizados = evento?.resultado?.golpesRealizados;
  if (
    evento?.idObjetivo &&
    golpesRealizados === undefined &&
    evento?.resultado
  ) {
    return [
      Object.freeze({
        mano: null,
        impacto: evento.resultado.impacto === true,
        bloqueado: evento.resultado.bloqueado === true,
        critico: evento.resultado.critico === true,
        danio: Number(evento.resultado.danio) || 0,
        vidaObjetivoAntes: null,
        vidaObjetivoDespues: evento.estadoObjetivoFinal?.vidaActual ?? null,
        vidaObjetivoMaxima: evento.estadoObjetivoFinal?.vidaMaxima ?? null,
      }),
    ];
  }

  // Un ataque a casilla vacía conserva preparación, pero no inventa fallo,
  // objetivo ni daño.
  return [null];
}
export async function reproducirGolpeProvisional(reproductor, evento, golpe, indiceGolpe, version) {
  const nodoAtacante = reproductor.compositor.obtenerNodoEntidad(evento.idAtacante);
  const duracion = reproductor.calcularDuracion(
    CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs,
  );

  if (nodoAtacante?.contenedor && !reproductor.efectosReducidos) {
    const yInicial = nodoAtacante.contenedor.y;
    const escalaXInicial = nodoAtacante.contenedor.scaleX ?? 1;
    const escalaYInicial = nodoAtacante.contenedor.scaleY ?? 1;
    const mitad = Math.max(1, Math.round(duracion / 2));

    await reproductor.crearTween({
      targets: nodoAtacante.contenedor,
      scaleX:
        escalaXInicial *
        CONFIGURACION_ANIMACIONES_PHASER.escalaPulsoAtaque,
      scaleY:
        escalaYInicial *
        CONFIGURACION_ANIMACIONES_PHASER.escalaPulsoAtaque,
      y: yInicial - CONFIGURACION_ANIMACIONES_PHASER.elevacionPulsoAtaque,
      duration: mitad,
      ease: "Sine.easeOut",
    }, version);

    await Promise.all([
      reproductor.crearTween({
        targets: nodoAtacante.contenedor,
        scaleX: escalaXInicial,
        scaleY: escalaYInicial,
        y: yInicial,
        duration: mitad,
        ease: "Sine.easeIn",
      }, version),
      golpe
        ? reproducirResultadoGolpe(reproductor,
            evento,
            golpe,
            indiceGolpe,
            version,
          )
        : Promise.resolve(),
    ]);

    nodoAtacante.contenedor.scaleX = escalaXInicial;
    nodoAtacante.contenedor.scaleY = escalaYInicial;
    nodoAtacante.contenedor.y = yInicial;
    return;
  }

  await Promise.all([
    reproductor.esperar(duracion, version),
    golpe
      ? reproducirResultadoGolpe(reproductor, evento, golpe, indiceGolpe, version)
      : Promise.resolve(),
  ]);
}
async function reproducirResultadoGolpe(
  reproductor,
  evento,
  golpe,
  indiceGolpe,
  version,
  opciones = {},
) {
  return await reproducirResultadoGolpeCompartido(
    reproductor,
    evento,
    golpe,
    indiceGolpe,
    version,
    {
      ...opciones,
      usarMarcaImpactoGenerica: debeUsarMarcaImpactoGenerica(reproductor, evento),
    },
  );
}

export function debeUsarMarcaImpactoGenerica(reproductor, evento) {
  if (evento?.esHabilidad === true) return false;
  if (esAtaqueArco(reproductor, evento) || esAtaqueVarita(reproductor, evento)) return false;
  if (!esAtaqueCuerpoACuerpo(reproductor, evento)) return true;

  const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
  return !fuentes.some((fuente) => {
    const perfil = obtenerPerfilAtaque({
      familiaObjeto: fuente?.familiaObjeto ?? null,
      esAtaqueNatural: fuente?.esAtaqueNatural === true || fuente == null,
    });
    return perfil?.animacion?.tipo === "corte" ||
      perfil?.animacion?.tipo === "golpe" ||
      perfil?.animacion?.tipo === "estocada" ||
      perfil?.animacion?.tipo === "estocada_recurso";
  });
}
