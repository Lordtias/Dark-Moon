import { cargarJson } from "../../utilidades/CargadorJson.js";
import { validarConfiguracionEjecucionHabilidades } from "../habilidades/ValidadorConfiguracionEjecucionHabilidades.js";
import { validarConfiguracionProgresoHabilidades } from "./ValidadorConfiguracionProgresoHabilidades.js";
import { ProgresoHabilidadesJugador } from "./ProgresoHabilidadesJugador.js";

const RUTA_MAESTRIAS = "./src/config/habilidades/Maestrias.json";
const RUTA_HABILIDADES = "./src/config/habilidades/Habilidades.json";
const RUTA_EFECTOS = "./src/config/magia/Efectos.json";
let configuracionActiva = null;
let configuracionEjecucionActiva = null;

// Carga una sola vez los catálogos compartidos. La configuración de progreso
// y la configuración jugable se validan por separado para que
// ProgresoHabilidadesJugador siga siendo la única fuente de grados, puntos y XP.
// La integración con el Juego activo se realiza explícitamente desde
// ControladorPartida, sin instaladores dinámicos ni modificaciones de prototipo.
export async function cargarYConfigurarProgresoHabilidades() {
  const [
    configuracionMaestrias,
    configuracionHabilidades,
    configuracionEfectos,
  ] = await Promise.all([
    cargarJson(RUTA_MAESTRIAS, "Maestrias.json"),
    cargarJson(RUTA_HABILIDADES, "Habilidades.json"),
    cargarJson(RUTA_EFECTOS, "Efectos.json"),
  ]);
  configuracionActiva = validarConfiguracionProgresoHabilidades({
    configuracionMaestrias,
    configuracionHabilidades,
  });
  configuracionEjecucionActiva = validarConfiguracionEjecucionHabilidades(
    configuracionHabilidades,
    configuracionEfectos,
  );
  return configuracionActiva;
}
export function obtenerConfiguracionProgresoHabilidades() {
  if (!configuracionActiva) {
    throw new Error(
      "La configuración de progreso de habilidades todavía no fue cargada.",
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
export function crearProgresoHabilidadesParaPersonaje({
  idProfesion,
  estadoInicial = null,
} = {}) {
  return new ProgresoHabilidadesJugador({
    configuracion: obtenerConfiguracionProgresoHabilidades(),
    idProfesion,
    estadoInicial,
  });
}
