import { CONFIGURACION_ANIMACIONES_PHASER } from "../ConfiguracionAnimacionesPhaser.js";
import { TAMANO_CASILLA_REFERENCIA } from "../ConfiguracionPhaser.js";
import { ANCLAJES_RECURSO } from "../CreadorRecursosVisualesPhaser.js";
import { normalizarDireccionVisual } from "../GeometriaVisualPhaser.js";
import {
  obtenerAvancePixeles,
  obtenerFuenteGolpe,
  obtenerPerfilGolpe,
} from "./ContratoAtaquesVisualesPhaser.js";
import {
  animarEfectoAtaque,
  moverNodoAtaque,
  reproducirAtaqueProvisional,
  reproducirResultadoGolpe,
} from "./SoporteReproduccionAtaquesPhaser.js";

// Reproducción de ataques visuales cuerpo a cuerpo configurables.

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
