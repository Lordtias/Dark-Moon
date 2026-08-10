import { cargarJson } from "../../utilidades/CargadorJson.js";
import { validarConfiguracionEjecucionHabilidades } from "../habilidades/ValidadorConfiguracionEjecucionHabilidades.js";
import { validarConfiguracionProgresoMagico } from "./ValidadorConfiguracionProgresoMagico.js";
import { ProgresoMagicoJugador } from "./ProgresoMagicoJugador.js";

const RUTA_MAESTRIAS = "./src/config/magia/Maestrias.json";
const RUTA_HABILIDADES = "./src/config/magia/Habilidades.json";
const RUTA_EFECTOS = "./src/config/magia/Efectos.json";
let configuracionActiva = null;
let configuracionEjecucionActiva = null;

// Carga una sola vez los catálogos compartidos. La configuración de progreso
// y la configuración jugable se validan por separado para que
// ProgresoMagicoJugador siga siendo la única fuente de grados, puntos y XP.
// La integración con el Juego activo se realiza explícitamente desde
// ControladorPartida, sin instaladores dinámicos ni modificaciones de prototipo.
export async function cargarYConfigurarProgresoMagico() {
  const [
    configuracionMaestrias,
    configuracionHabilidades,
    configuracionEfectos,
  ] = await Promise.all([
    cargarJson(RUTA_MAESTRIAS, "Maestrias.json"),
    cargarJson(RUTA_HABILIDADES, "Habilidades.json"),
    cargarJson(RUTA_EFECTOS, "Efectos.json"),
  ]);
  configuracionActiva = validarConfiguracionProgresoMagico({
    configuracionMaestrias,
    configuracionHabilidades,
  });
  configuracionEjecucionActiva = validarConfiguracionEjecucionHabilidades(
    configuracionHabilidades,
    configuracionEfectos,
  );
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
