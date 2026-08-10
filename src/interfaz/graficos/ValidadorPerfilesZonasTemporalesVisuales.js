import {
  validarObjetoPlano,
  validarTextoNoVacio,
  validarColorHexadecimal,
  validarFraccion,
  validarEnteroPositivo,
  validarNumeroPositivo,
  congelarProfundamente,
} from "./ValidacionesConfiguracionVisual.js";

const VERSION_SOPORTADA = 1;
const APARIENCIAS_MINIMAS = Object.freeze([
  "veneno",
  "fuego",
  "frio",
  "electrico",
  "generica",
]);
const CAMPOS_TEXTO = Object.freeze([
  "forma",
  "textura",
  "movimiento",
  "efectoCasilla",
  "efectoCreacion",
  "efectoRenovacion",
  "efectoActivacion",
  "efectoEntrada",
  "efectoVencimiento",
]);

export function validarPerfilesZonasTemporalesVisuales(configuracion) {
  validarObjetoPlano(configuracion, "los perfiles visuales de zonas temporales");
  if (configuracion.version !== VERSION_SOPORTADA) {
    throw new Error(
      `La versión de PerfilesZonasTemporalesVisuales debe ser ${VERSION_SOPORTADA}.`,
    );
  }

  validarObjetoPlano(configuracion.zonas, "los perfiles de zonas temporales");
  for (const apariencia of APARIENCIAS_MINIMAS) {
    if (!configuracion.zonas[apariencia]) {
      throw new Error(`Falta el perfil visual de zona "${apariencia}".`);
    }
  }

  for (const [id, perfil] of Object.entries(configuracion.zonas)) {
    validarTextoNoVacio(id, "el ID de un perfil de zona");
    validarObjetoPlano(perfil, `el perfil de zona "${id}"`);
    for (const campo of CAMPOS_TEXTO) {
      validarTextoNoVacio(perfil[campo], `${campo} de "${id}"`);
    }
    for (const campo of ["colorPrincipal", "colorSecundario", "colorDetalle"]) {
      validarColorHexadecimal(perfil[campo], `${campo} de "${id}"`);
    }
    validarFraccion(perfil.opacidadBase, `opacidadBase de "${id}"`);
    validarEnteroPositivo(perfil.densidad, `densidad de "${id}"`);
    validarNumeroPositivo(
      perfil.duracionAmbientalMs,
      `duracionAmbientalMs de "${id}"`,
    );
    validarNumeroPositivo(perfil.alturaVaporPx, `alturaVaporPx de "${id}"`);
    validarNumeroPositivo(
      perfil.tamanoParticulaPx,
      `tamanoParticulaPx de "${id}"`,
    );
  }

  return congelarProfundamente(configuracion);
}
