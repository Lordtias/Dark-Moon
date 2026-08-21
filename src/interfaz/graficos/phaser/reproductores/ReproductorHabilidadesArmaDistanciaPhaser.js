import { ANCLAJES_RECURSO } from "../CreadorRecursosVisualesPhaser.js";
import { normalizarDireccionVisual } from "../GeometriaVisualPhaser.js";
import {
  obtenerCentroActorHabilidad,
  obtenerCentroImpactoHabilidad,
} from "../GeometriaHabilidadesVisualesPhaser.js";
import {
  reproducirResultadoImpactoHabilidad,
} from "./ReproductorResultadosVisualesPhaser.js";
import { reproducirMovimiento } from "./ReproductorMovimientoPhaser.js";

// Representa ataques de arma ya resueltos por una habilidad. La munición,
// cantidad de proyectiles, impactos y críticos vienen del dominio; Phaser solo
// compone una secuencia continua con el recurso visual real de la flecha.
export async function reproducirHabilidadArmaDistancia(
  reproductor,
  evento,
  version,
) {
  const impactos = Array.isArray(evento?.impactos) ? evento.impactos : [];
  const recursoVisual = evento?.recursoProyectil?.recursoVisual ?? null;
  const centroActor = obtenerCentroActorHabilidad(reproductor, evento);
  const centroObjetivoBase = obtenerCentroImpactoHabilidad(
    reproductor,
    evento,
    impactos[0] ?? null,
  );

  if (!centroActor || !centroObjetivoBase || impactos.length === 0 || !recursoVisual) {
    // Conserva un respaldo visual válido si una munición no expone recurso.
    const { reproducirHabilidadProyectil } = await import(
      "./ReproductorHabilidadesProyectilPhaser.js"
    );
    await reproducirHabilidadProyectil(reproductor, evento, version);
    return;
  }

  const perfil = evento.perfilVisual ?? null;
  const fases = evento.ritmoVisual?.fases ?? {};
  const grado = evento.habilidad?.grado ?? 1;
  const esMultiple = (evento.habilidad?.ataqueArma?.cantidadProyectiles ?? 1) > 1;
  const usaImpulsoFuerte = perfil?.movimiento === "impulso_fuerte";
  const duracionManifestacion = reproductor.calcularDuracion(
    fases.manifestacion ?? 0.16,
  );
  const duracionTrayectoria = reproductor.calcularDuracion(
    fases.trayectoria ?? 0.38,
  );
  const intervaloRapidFire = esMultiple
    ? Math.max(55, Math.round((duracionManifestacion + duracionTrayectoria) * 0.18))
    : 0;
  const duracionVuelo = esMultiple
    ? Math.max(70, Math.round(duracionTrayectoria * 0.78))
    : Math.max(70, duracionManifestacion + duracionTrayectoria);

  const nodoActor = reproductor.compositor.obtenerNodoEntidad(evento.idActor);
  const contenedorActor = nodoActor?.contenedor ?? null;
  const escalaX = contenedorActor?.scaleX ?? 1;
  const escalaY = contenedorActor?.scaleY ?? 1;
  const duracionSenal = reproductor.calcularDuracion(fases.preparacion ?? 0.2);

  if (contenedorActor && !reproductor.efectosReducidos) {
    await reproductor.crearTween({
      targets: contenedorActor,
      scaleX: escalaX * 1.035,
      scaleY: escalaY * 1.035,
      duration: Math.max(1, duracionSenal),
      ease: "Sine.easeOut",
    }, version);
  }

  if (version !== reproductor.versionCancelacion || reproductor.destruido) return;

  const promesaMovimiento = evento.movimientoConcurrente
    ? reproducirMovimiento(reproductor, evento.movimientoConcurrente, version)
    : Promise.resolve();

  const promesas = impactos.map((impacto, indice) =>
    reproducirProyectilProgramado({
      reproductor,
      evento,
      impacto,
      indice,
      cantidadProyectiles: impactos.length,
      version,
      recursoVisual,
      centroActor,
      centroObjetivoBase,
      perfil,
      grado,
      esperaInicial: intervaloRapidFire * indice,
      duracionVuelo,
      usaImpulsoFuerte,
    }),
  );

  await Promise.all([promesaMovimiento, ...promesas]);

  if (contenedorActor) {
    await reproductor.crearTween({
      targets: contenedorActor,
      scaleX: escalaX,
      scaleY: escalaY,
      duration: Math.max(1, reproductor.calcularDuracion(fases.retorno ?? 0.1)),
      ease: "Sine.easeInOut",
    }, version);
  }
}

async function reproducirProyectilProgramado({
  reproductor,
  evento,
  impacto,
  indice,
  cantidadProyectiles,
  version,
  recursoVisual,
  centroActor,
  centroObjetivoBase,
  perfil,
  grado,
  esperaInicial,
  duracionVuelo,
  usaImpulsoFuerte,
}) {
  if (esperaInicial > 0) await reproductor.esperar(esperaInicial, version);
  if (version !== reproductor.versionCancelacion || reproductor.destruido) return;

  const centroObjetivo = obtenerCentroImpactoHabilidad(reproductor, evento, impacto) ??
    centroObjetivoBase;
  const direccion = normalizarDireccionVisual({
    origen: centroActor,
    destino: centroObjetivo,
  });
  const lateral = { x: -direccion.y, y: direccion.x };
  const centroIndice = indice - (Math.max(1, cantidadProyectiles) - 1) / 2;
  const separacionSalida = cantidadProyectiles > 1 ? centroIndice * 4.2 : 0;
  const separacionLlegada = cantidadProyectiles > 1 ? centroIndice * 5.4 : 0;
  const origenVisual = {
    x: centroActor.x + lateral.x * separacionSalida,
    y: centroActor.y + lateral.y * separacionSalida,
  };
  const signo = indice % 2 === 0 ? 1 : -1;
  const destino = impacto?.impacto === false
    ? {
        x: centroObjetivo.x + lateral.x * (separacionLlegada + signo * (10 + indice * 2)) + direccion.x * 4,
        y: centroObjetivo.y + lateral.y * (separacionLlegada + signo * (10 + indice * 2)) + direccion.y * 4,
      }
    : {
        x: centroObjetivo.x + lateral.x * separacionLlegada,
        y: centroObjetivo.y + lateral.y * separacionLlegada,
      };
  const angulo = Math.atan2(destino.y - origenVisual.y, destino.x - origenVisual.x);

  const proyectil = reproductor.efectosReducidos
    ? null
    : await reproductor.creadorRecursosVisuales?.crearSpriteTemporal({
        recursoVisual,
        centro: origenVisual,
        longitudVisiblePx: Math.max(18, Number(perfil?.tamanoVisualPx) || 20),
        anguloRad: angulo,
        orientacionBaseGrados: 0,
        anclaje: ANCLAJES_RECURSO.CENTRO,
        alpha: 0.95,
        tint: impacto?.critico === true ? 0xffe7a3 : null,
      });

  if (version !== reproductor.versionCancelacion || reproductor.destruido) {
    proyectil?.destroy?.();
    return;
  }

  const estela = usaImpulsoFuerte && !reproductor.efectosReducidos
    ? reproductor.creadorEfectosHabilidades?.crearEstelaMovilProyectil({
        centro: origenVisual,
        perfil,
        grado,
        anguloRad: angulo,
      })
    : null;

  const animaciones = [];
  if (proyectil) {
    animaciones.push(reproductor.crearTween({
      targets: proyectil,
      x: destino.x,
      y: destino.y,
      alpha: impacto?.impacto === false ? 0.6 : 1,
      scaleX: usaImpulsoFuerte ? 1.08 : 1,
      scaleY: usaImpulsoFuerte ? 1.08 : 1,
      duration: duracionVuelo,
      ease: usaImpulsoFuerte ? "Cubic.easeIn" : "Linear",
    }, version));
  }
  if (estela) {
    animaciones.push(reproductor.crearTween({
      targets: estela,
      x: destino.x,
      y: destino.y,
      alpha: impacto?.impacto === false ? 0.28 : 0.58,
      duration: duracionVuelo,
      ease: "Cubic.easeIn",
    }, version));
  }
  if (animaciones.length > 0) await Promise.all(animaciones);
  else await reproductor.esperar(duracionVuelo, version);

  proyectil?.destroy?.();
  estela?.destroy?.();
  if (version !== reproductor.versionCancelacion || reproductor.destruido) return;

  const efectoImpacto =
    impacto?.impacto === true && !reproductor.efectosReducidos
      ? reproductor.creadorEfectosHabilidades?.crearImpacto({
          centro: centroObjetivo,
          perfil,
          grado,
          critico: impacto.critico === true,
        })
      : null;
  const resultado = reproducirResultadoImpactoHabilidad(
    reproductor,
    evento,
    impacto,
    version,
  );
  const efecto = efectoImpacto
    ? reproductor.crearTween({
        targets: efectoImpacto,
        alpha: 0,
        scaleX: usaImpulsoFuerte ? 1.75 : 1.35,
        scaleY: usaImpulsoFuerte ? 1.75 : 1.35,
        duration: Math.max(60, Math.round(duracionVuelo * 0.42)),
        ease: "Quad.easeOut",
      }, version).then(() => efectoImpacto.destroy?.())
    : Promise.resolve();
  await Promise.all([resultado, efecto]);
}
