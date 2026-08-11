import {
  CENTROS_VISUALES_HABILIDAD,
  PATRONES_VISUALES_HABILIDAD,
  resolverContratoPatronVisualHabilidad,
} from "../../PatronesVisualesHabilidades.js";
import { TAMANO_CASILLA_REFERENCIA } from "../ConfiguracionPhaser.js";
import {
  crearClaveCasillaVisual,
  obtenerCentroActorHabilidad,
  obtenerCentroImpactoHabilidad,
} from "../GeometriaHabilidadesVisualesPhaser.js";
import {
  reproducirResultadoImpactoHabilidad,
} from "./ReproductorResultadosVisualesPhaser.js";

// Reproducción del patrón visual configurable de área instantánea.

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

function sonMismaCasilla(a, b) {
  return (
    Number.isInteger(a?.x) &&
    Number.isInteger(a?.y) &&
    a.x === b?.x &&
    a.y === b?.y
  );
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

  const centroActor = obtenerCentroActorHabilidad(reproductor, evento);
  const centroArea = obtenerCentroAreaHabilidad(reproductor,
    evento,
    contratoVisual,
  );
  if (!centroArea) {
    for (const impacto of evento.impactos ?? []) {
      if (version !== reproductor.versionCancelacion || reproductor.destruido) return;
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

  const grupos = agruparAreaPorAnillos(reproductor, evento, contratoVisual);
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
      const centroObjetivo = obtenerCentroImpactoHabilidad(reproductor, evento, impacto);
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
      animaciones.push(reproducirResultadoImpactoHabilidad(reproductor, evento, impacto, version));
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
    return obtenerCentroActorHabilidad(reproductor, evento);
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
