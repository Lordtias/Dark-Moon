import { validarConfiguracionProgresoMagico } from "./ValidadorConfiguracionProgresoMagico.js";
import { ProgresoMagicoJugador } from "./ProgresoMagicoJugador.js";

const RUTA_MAESTRIAS = "./src/config/magia/Maestrias.json";
const RUTA_HABILIDADES = "./src/config/magia/Habilidades.json";

let configuracionActiva = null;

// Carga y valida los catálogos antes de que se cree el primer Player.
//
// Aplicacion espera esta promesa junto con el resto de configuraciones, por lo
// que cualquier error se muestra mediante el flujo de inicio ya existente.
export async function cargarYConfigurarProgresoMagico() {
  const [configuracionMaestrias, configuracionHabilidades] = await Promise.all([
    cargarJson(RUTA_MAESTRIAS, "las maestrías"),
    cargarJson(RUTA_HABILIDADES, "las habilidades"),
  ]);

  configuracionActiva = validarConfiguracionProgresoMagico({
    configuracionMaestrias,
    configuracionHabilidades,
  });

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

async function cargarJson(ruta, descripcion) {
  const respuesta = await fetch(ruta);

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo cargar ${descripcion}. Código HTTP: ${respuesta.status}`,
    );
  }

  try {
    return await respuesta.json();
  } catch (error) {
    throw new Error(
      `El archivo de ${descripcion} no contiene JSON válido. ${error.message}`,
    );
  }
}
