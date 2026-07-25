import { programarInstalacionEtapa5 } from "../habilidades/InstaladorEtapa5.js";
import { validarConfiguracionEjecucionHabilidades } from "../habilidades/ValidadorConfiguracionEjecucionHabilidades.js";
import { validarConfiguracionProgresoMagico } from "./ValidadorConfiguracionProgresoMagico.js";
import { ProgresoMagicoJugador } from "./ProgresoMagicoJugador.js";

const RUTA_MAESTRIAS = "./src/config/magia/Maestrias.json";
const RUTA_HABILIDADES = "./src/config/magia/Habilidades.json";

let configuracionActiva = null;
let configuracionEjecucionActiva = null;

// Carga una sola vez los catálogos compartidos. La configuración de progreso
// y la configuración jugable se validan por separado para que
// ProgresoMagicoJugador siga siendo la única fuente de grados, puntos y XP.
export async function cargarYConfigurarProgresoMagico() {
  const [respuestaMaestrias, respuestaHabilidades] = await Promise.all([
    fetch(RUTA_MAESTRIAS),
    fetch(RUTA_HABILIDADES),
  ]);

  if (!respuestaMaestrias.ok) {
    throw new Error(
      `No se pudo cargar Maestrias.json (${respuestaMaestrias.status}).`,
    );
  }
  if (!respuestaHabilidades.ok) {
    throw new Error(
      `No se pudo cargar Habilidades.json (${respuestaHabilidades.status}).`,
    );
  }

  const [configuracionMaestrias, configuracionHabilidades] = await Promise.all([
    respuestaMaestrias.json(),
    respuestaHabilidades.json(),
  ]);

  configuracionActiva = validarConfiguracionProgresoMagico({
    configuracionMaestrias,
    configuracionHabilidades,
  });
  configuracionEjecucionActiva = validarConfiguracionEjecucionHabilidades(
    configuracionHabilidades,
  );

  programarInstalacionEtapa5(configuracionEjecucionActiva);
  return configuracionActiva;
}

export function obtenerConfiguracionProgresoMagico() {
  if (!configuracionActiva) {
    throw new Error(
      "La configuración de progreso mágico todavía no fue cargada.",
    );
  }
  return configuracionActiva;
}

export function obtenerConfiguracionEjecucionHabilidades() {
  if (!configuracionEjecucionActiva) {
    throw new Error(
      "La configuración de ejecución de habilidades todavía no fue cargada.",
    );
  }
  return configuracionEjecucionActiva;
}

export function crearProgresoMagicoParaPersonaje({
  idProfesion,
  estadoInicial = null,
} = {}) {
  return new ProgresoMagicoJugador({
    configuracion: obtenerConfiguracionProgresoMagico(),
    idProfesion,
    estadoInicial,
  });
}
