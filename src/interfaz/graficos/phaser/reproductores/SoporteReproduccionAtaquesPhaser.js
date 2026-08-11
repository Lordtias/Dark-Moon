import { CONFIGURACION_ANIMACIONES_PHASER } from "../ConfiguracionAnimacionesPhaser.js";
import {
  CONFIGURACION_EFECTOS_COMBATE_PHASER,
} from "../ConfiguracionEfectosCombatePhaser.js";
import {
  reproducirResultadoGolpe as reproducirResultadoGolpeCompartido,
} from "./ReproductorResultadosVisualesPhaser.js";
import { debeUsarMarcaImpactoGenerica } from "./ContratoAtaquesVisualesPhaser.js";

// Infraestructura común de reproducción para todas las familias visuales de ataque.

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

export async function reproducirResultadoGolpe(
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
