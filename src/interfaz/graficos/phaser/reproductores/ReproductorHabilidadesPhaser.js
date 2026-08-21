import { reproducirHabilidadArmaDistancia } from "./ReproductorHabilidadesArmaDistanciaPhaser.js";
import { reproducirHabilidadArea } from "./ReproductorHabilidadesAreaPhaser.js";
import { reproducirHabilidadCadena } from "./ReproductorHabilidadesCadenaPhaser.js";
import { reproducirHabilidadLinea } from "./ReproductorHabilidadesLineaPhaser.js";
import { reproducirHabilidadProyectil } from "./ReproductorHabilidadesProyectilPhaser.js";
import { reproducirHabilidadZona } from "./ReproductorHabilidadesZonaPersistentePhaser.js";

// Fachada estable para la reproducción visual de habilidades ya resueltas.
export async function reproducirHabilidadResuelta(reproductor, evento, version) {
  reproductor.compositor.ocultarSeleccionTemporal?.();

  if (evento?.habilidad?.ataqueArma) {
    await reproducirHabilidadArmaDistancia(reproductor, evento, version);
    return;
  }

  if (evento?.ritmoVisual?.secuencia === "area_conjurada") {
    await reproducirHabilidadArea(reproductor, evento, version);
    return;
  }

  if (evento?.ritmoVisual?.secuencia === "cadena_conjurada") {
    await reproducirHabilidadCadena(reproductor, evento, version);
    return;
  }

  if (evento?.ritmoVisual?.secuencia === "linea_conjurada") {
    await reproducirHabilidadLinea(reproductor, evento, version);
    return;
  }

  if (evento?.ritmoVisual?.secuencia === "zona_conjurada") {
    await reproducirHabilidadZona(reproductor, evento, version);
    return;
  }

  await reproducirHabilidadProyectil(reproductor, evento, version);
}
