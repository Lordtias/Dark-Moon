import { CONFIGURACION_ANIMACIONES_PHASER } from "../ConfiguracionAnimacionesPhaser.js";
import { ANCLAJES_RECURSO } from "../CreadorRecursosVisualesPhaser.js";
import { normalizarDireccionVisual } from "../GeometriaVisualPhaser.js";
import { obtenerPerfilGolpe } from "./ContratoAtaquesVisualesPhaser.js";
import {
  animarEfectoAtaque,
  moverNodoAtaque,
  reproducirAtaqueProvisional,
  reproducirResultadoGolpe,
} from "./SoporteReproduccionAtaquesPhaser.js";

// Reproducción de ataques visuales a distancia configurables.

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
