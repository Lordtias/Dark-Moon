import { crearConfiguracionHabilidadEfectiva } from "../../juego/habilidades/ConfiguracionHabilidadEfectiva.js";

// Expone al panel una configuración ya resuelta. La vista no aplica
// modificadores ni decide el orden de sus valores para describir una habilidad.
export function crearConsultaDetalleHabilidad({
  jugador,
  habilidad,
  ejecucion,
  grado,
} = {}) {
  const gradoConfig = ejecucion?.ejecucion?.grados?.[grado];
  if (!jugador || !habilidad || !ejecucion || !gradoConfig) {
    throw new Error("La consulta de detalle necesita jugador, habilidad y grado válidos.");
  }
  return Object.freeze({
    idHabilidad: habilidad.id,
    grado,
    configuracion: crearConfiguracionHabilidadEfectiva({
      lanzador: jugador,
      habilidad: ejecucion,
      gradoConfig,
    }),
  });
}
