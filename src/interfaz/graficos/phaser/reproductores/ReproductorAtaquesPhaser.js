import { traducir } from "../../../idiomas/ContextoIdioma.js";
import { obtenerPerfilAtaque } from "../../ContextoPerfilesAtaquePorFamilia.js";
import { CONFIGURACION_ANIMACIONES_PHASER } from "../ConfiguracionAnimacionesPhaser.js";
import { TAMANO_CASILLA_REFERENCIA } from "../ConfiguracionPhaser.js";
import { ANCLAJES_RECURSO } from "../CreadorRecursosVisualesPhaser.js";
import {
  CONFIGURACION_EFECTOS_COMBATE_PHASER,
  TIPOS_FEEDBACK_COMBATE,
} from "../ConfiguracionEfectosCombatePhaser.js";

// Reproducción visual de ataques ya resueltos por el sistema de combate.

function normalizarDireccionImpacto({ origen, destino } = {}) {
  const diferenciaX = Number(destino?.x) - Number(origen?.x);
  const diferenciaY = Number(destino?.y) - Number(origen?.y);
  const longitud = Math.hypot(diferenciaX, diferenciaY);

  if (!Number.isFinite(longitud) || longitud === 0) {
    return Object.freeze({ x: 0, y: -1 });
  }

  return Object.freeze({
    x: diferenciaX / longitud,
    y: diferenciaY / longitud,
  });
}

function formatearDanio(valor) {
  return Number.isInteger(valor) ? `${valor}` : valor.toFixed(1);
}

export async function reproducirAtaqueResuelto(reproductor, evento, version) {
  reproductor.compositor.ocultarSeleccionTemporal?.();

  const golpes = reproductor.obtenerGolpesVisuales(evento);
  if (evento.presentacionOrigenOculto === true) {
    await reproductor.reproducirConsecuenciaAtaqueOrigenOculto(
      evento,
      golpes,
      version,
    );
    return;
  }
  if (reproductor.esAtaqueVarita(evento) && evento.ritmoVisual) {
    await reproductor.reproducirAtaqueVarita(evento, golpes, version);
  } else if (reproductor.esAtaqueArco(evento) && evento.ritmoVisual) {
    await reproductor.reproducirAtaqueArco(evento, golpes, version);
  } else if (reproductor.esAtaqueCuerpoACuerpo(evento) && evento.ritmoVisual) {
    await reproductor.reproducirAtaqueCuerpoACuerpo(evento, golpes, version);
  } else {
    await reproductor.reproducirAtaqueProvisional(evento, golpes, version);
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
    await reproductor.reproducirResultadoGolpe(
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
    await reproductor.reproducirGolpeProvisional(
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
    await reproductor.reproducirAtaqueProvisional(evento, golpes, version);
    return;
  }

  const golpe = golpes[0] ?? null;
  const perfil = reproductor.obtenerPerfilGolpe(evento, golpe, 0);
  const fases = evento.ritmoVisual?.fases ?? {};
  const direccion = normalizarDireccionImpacto({
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

  await reproductor.moverNodoAtaque({
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
      reproductor.reproducirResultadoGolpe(evento, golpe, 0, version, {
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
    reproductor.moverNodoAtaque({
      nodo,
      destino: centroBase,
      duracion: reproductor.calcularDuracion(fases.retorno ?? 1),
      ease: "Sine.easeInOut",
      version,
    }),
    reproductor.animarEfectoAtaque(
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
  const disparos = reproductor.obtenerDisparosVarita(evento, golpes);

  if (
    !nodo?.contenedor ||
    !centroBase ||
    !centroObjetivo ||
    disparos.length === 0
  ) {
    await reproductor.reproducirAtaqueProvisional(evento, golpes, version);
    return;
  }

  const fases = evento.ritmoVisual?.fases ?? {};
  const fuentesCanalizacion = (evento?.configuracionAtaque?.fuentes ?? [])
    .filter((fuente) => fuente?.familiaObjeto === "varita");
  const direccion = normalizarDireccionImpacto({
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
        ? reproductor.reproducirResultadoGolpe(evento, golpe, indice, version, {
            esperarDecorativos: false,
          })
        : Promise.resolve(),
      reproductor.animarEfectoAtaque(
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
    await reproductor.reproducirAtaqueProvisional(evento, golpes, version);
    return;
  }

  const direccion = normalizarDireccionImpacto({
    origen: centroBase,
    destino: centroObjetivo,
  });
  const resultadosPendientes = [];
  const fases = evento.ritmoVisual?.fases ?? {};
  const perfilInicial = reproductor.obtenerPerfilGolpe(evento, golpes[0], 0);
  const avanceInicial = reproductor.obtenerAvancePixeles(perfilInicial);
  const centroPreparado = {
    x: centroBase.x - direccion.x * avanceInicial * 0.22,
    y: centroBase.y - direccion.y * avanceInicial * 0.22,
  };

  await reproductor.moverNodoAtaque({
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
    await reproductor.reproducirEstocada({
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
      const perfil = reproductor.obtenerPerfilGolpe(evento, golpe, indice);
      const idFase = evento.ritmoVisual.secuencia === "dual"
        ? indice === 0
          ? "golpePrincipal"
          : "golpeSecundario"
        : "accion";
      await reproductor.reproducirGolpeFisico({
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

  await reproductor.moverNodoAtaque({
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
  const avance = reproductor.obtenerAvancePixeles(perfil);
  const lateral = { x: -direccion.y, y: direccion.x };
  const signoMano = golpe?.mano === "secundaria" ? -1 : 1;
  const centroAtaque = {
    x: centroPreparado.x + direccion.x * avance + lateral.x * signoMano * 1.5,
    y: centroPreparado.y + direccion.y * avance + lateral.y * signoMano * 1.5,
  };
  const ida = Math.max(1, Math.round(duracion * 0.55));
  const vuelta = Math.max(1, duracion - ida);

  await reproductor.moverNodoAtaque({
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
      reproductor.reproducirResultadoGolpe(
        evento,
        golpe,
        indiceGolpe,
        version,
        { esperarDecorativos: false },
      ),
    );
  }

  await Promise.all([
    reproductor.moverNodoAtaque({
      nodo,
      destino: centroPreparado,
      duracion: vuelta,
      ease: "Sine.easeIn",
      version,
    }),
    reproductor.animarEfectoAtaque(efecto, duracion, version, {
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
  const fuente = reproductor.obtenerFuenteGolpe(evento, golpe, 0);
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
      reproductor.reproducirResultadoGolpe(evento, golpe, 0, version, {
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
  const fuente = reproductor.obtenerFuenteGolpe(evento, golpe, indiceGolpe);
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
        ? reproductor.reproducirResultadoGolpe(
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
      ? reproductor.reproducirResultadoGolpe(evento, golpe, indiceGolpe, version)
      : Promise.resolve(),
  ]);
}
export async function reproducirResultadoGolpe(reproductor, 
  evento,
  golpe,
  indiceGolpe,
  version,
  { esperarDecorativos = true } = {},
) {
  if (!evento.idObjetivo) return;

  const esenciales = [];
  const decorativos = [];

  if (golpe.impacto !== true) {
    esenciales.push(reproductor.reproducirFalloObjetivo(evento, version));
    decorativos.push(
      reproductor.reproducirTextoResultado({
        evento,
        texto: traducir("mensajes.feedback.fallo", { respaldo: "FALLO" }),
        tipo: TIPOS_FEEDBACK_COMBATE.FALLO,
        indiceGolpe,
        version,
      }),
    );
    await Promise.all(esenciales);
    await reproductor.resolverDecorativos(decorativos, esperarDecorativos);
    return;
  }

  const danio = Math.max(0, Number(golpe.danio) || 0);

  if (danio > 0) {
    esenciales.push(
      reproductor.reproducirImpactoObjetivo(evento, golpe, version),
      reproductor.reproducirCambioVida(evento, golpe, version),
    );
    decorativos.push(
      reproductor.reproducirTextoResultado({
        evento,
        texto: `${formatearDanio(danio)}`,
        tipo: TIPOS_FEEDBACK_COMBATE.DANIO,
        indiceGolpe,
        version,
      }),
    );
  }

  if (golpe.bloqueado === true) {
    decorativos.push(
      reproductor.reproducirBloqueo(evento, indiceGolpe, version),
      reproductor.reproducirTextoResultado({
        evento,
        texto: traducir("mensajes.feedback.bloqueo", { respaldo: "BLOQUEO" }),
        tipo: TIPOS_FEEDBACK_COMBATE.BLOQUEO,
        indiceGolpe,
        desplazamientoY: 8,
        version,
      }),
    );
  }

  if (golpe.critico === true) {
    decorativos.push(
      reproductor.reproducirTextoResultado({
        evento,
        texto: traducir("mensajes.feedback.critico", { respaldo: "CRÍTICO" }),
        tipo: TIPOS_FEEDBACK_COMBATE.CRITICO,
        indiceGolpe,
        desplazamientoY: -8,
        version,
      }),
    );
  }

  await Promise.all(esenciales);
  await reproductor.resolverDecorativos(decorativos, esperarDecorativos);
}
export function resolverDecorativos(reproductor, promesas, esperar) {
  const grupo = Promise.all(promesas);
  if (esperar) {
    return grupo;
  }
  void grupo.catch(() => {});
  return Promise.resolve();
}
export async function reproducirFalloObjetivo(reproductor, evento, version) {
  const nodo = reproductor.compositor.obtenerNodoEntidad(evento.idObjetivo);
  if (!nodo?.contenedor || reproductor.efectosReducidos) return;

  const contenedor = nodo.contenedor;
  const posicionInicial = { x: contenedor.x, y: contenedor.y };
  const direccion = normalizarDireccionImpacto({
    origen: evento.origenAtacante,
    destino: evento.posicionObjetivo,
  });
  const lateral = { x: -direccion.y, y: direccion.x };
  const desplazamiento =
    CONFIGURACION_EFECTOS_COMBATE_PHASER.esquiva.desplazamientoPx;

  await reproductor.crearTween({
    targets: contenedor,
    x: posicionInicial.x + lateral.x * desplazamiento,
    y: posicionInicial.y + lateral.y * desplazamiento,
    duration: reproductor.calcularDuracion(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.esquiva.duracionMs,
    ),
    yoyo: true,
    ease: "Sine.easeOut",
  }, version);

  contenedor.x = posicionInicial.x;
  contenedor.y = posicionInicial.y;
}
export async function reproducirImpactoObjetivo(reproductor, evento, golpe, version) {
  const nodoObjetivo = reproductor.compositor.obtenerNodoEntidad(evento.idObjetivo);
  if (!nodoObjetivo?.contenedor) return;

  const contenedor = nodoObjetivo.contenedor;
  const posicionInicial = {
    x: contenedor.x,
    y: contenedor.y,
    alpha: contenedor.alpha ?? 1,
  };
  const direccion = normalizarDireccionImpacto({
    origen: evento.origenAtacante,
    destino: evento.posicionObjetivo,
  });
  const duracion = reproductor.calcularDuracion(
    CONFIGURACION_ANIMACIONES_PHASER.impactoObjetivoMs,
  );
  const factorCritico = golpe.critico === true
    ? CONFIGURACION_EFECTOS_COMBATE_PHASER.golpe.impactoCriticoEscala
    : 1;
  const usarMarcaGenerica = reproductor.debeUsarMarcaImpactoGenerica(evento);
  const marca = reproductor.efectosReducidos || !usarMarcaGenerica
    ? null
    : reproductor.creadorEfectos?.crearMarcaImpacto({
        centro: posicionInicial,
        critico: golpe.critico === true,
      });

  if (marca) {
    marca.setScale?.(
      CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoInicial,
    );
  }

  const promesas = [
    reproductor.crearTween({
      targets: contenedor,
      x:
        posicionInicial.x +
        direccion.x *
          CONFIGURACION_ANIMACIONES_PHASER.desplazamientoImpactoPx *
          factorCritico,
      y:
        posicionInicial.y +
        direccion.y *
          CONFIGURACION_ANIMACIONES_PHASER.desplazamientoImpactoPx *
          factorCritico,
      alpha: reproductor.efectosReducidos ? 0.72 : golpe.critico ? 0.4 : 0.52,
      duration: Math.max(1, Math.round(duracion / 2)),
      yoyo: true,
      ease: "Quad.easeOut",
    }, version),
  ];

  if (marca) {
    promesas.push(
      reproductor.crearTween({
        targets: marca,
        scaleX: CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoFinal,
        scaleY: CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoFinal,
        alpha: 0,
        duration: duracion,
        ease: "Quad.easeOut",
      }, version),
    );
  }

  await Promise.all(promesas);

  contenedor.x = posicionInicial.x;
  contenedor.y = posicionInicial.y;
  contenedor.alpha = posicionInicial.alpha;
  marca?.destroy?.();
}
export function debeUsarMarcaImpactoGenerica(reproductor, evento) {
  if (evento?.esHabilidad === true) return false;
  if (reproductor.esAtaqueArco(evento) || reproductor.esAtaqueVarita(evento)) return false;
  if (!reproductor.esAtaqueCuerpoACuerpo(evento)) return true;

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
