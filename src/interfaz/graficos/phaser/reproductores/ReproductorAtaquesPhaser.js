import { CONFIGURACION_ANIMACIONES_PHASER } from "../ConfiguracionAnimacionesPhaser.js";
import {
  esAtaqueArco,
  esAtaqueCuerpoACuerpo,
  esAtaqueVarita,
  obtenerGolpesVisuales,
} from "./ContratoAtaquesVisualesPhaser.js";
import {
  reproducirAtaqueArco,
  reproducirAtaqueVarita,
} from "./ReproductorAtaquesDistanciaPhaser.js";
import { reproducirAtaqueCuerpoACuerpo } from "./ReproductorAtaquesCuerpoACuerpoPhaser.js";
import {
  reproducirAtaqueProvisional,
  reproducirResultadoGolpe,
} from "./SoporteReproduccionAtaquesPhaser.js";

// Fachada de reproducción visual de ataques ya resueltos por el sistema de combate.

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
