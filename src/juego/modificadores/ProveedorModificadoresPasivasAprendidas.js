import { TIPOS_HABILIDAD } from "../maestrias/ValidadorConfiguracionProgresoHabilidades.js";

// Traduce únicamente el estado aprendido del personaje a fuentes declarativas.
// No interpreta condiciones, no combina operaciones y no calcula estadísticas:
// esas responsabilidades pertenecen a SistemaModificadoresCombatiente.
export class ProveedorModificadoresPasivasAprendidas {
  constructor({ progresoHabilidades, configuracion } = {}) {
    if (!progresoHabilidades || typeof progresoHabilidades.obtenerGradoHabilidad !== "function") {
      throw new Error("El proveedor de pasivas necesita ProgresoHabilidadesJugador.");
    }
    if (!configuracion?.habilidades || typeof configuracion.habilidades !== "object") {
      throw new Error("El proveedor de pasivas necesita la configuración validada.");
    }
    this.progresoHabilidades = progresoHabilidades;
    this.configuracion = configuracion;
  }

  obtenerModificadores({ objetivo = null } = {}) {
    const modificadores = [];
    for (const [idHabilidad, habilidad] of Object.entries(
      this.configuracion.habilidades,
    )) {
      if (habilidad.tipo !== TIPOS_HABILIDAD.PASIVA) continue;

      let grado;
      try {
        grado = this.progresoHabilidades.obtenerGradoHabilidad(idHabilidad);
      } catch {
        // La profesión puede no disponer de la maestría de esta pasiva.
        continue;
      }
      if (!Number.isInteger(grado) || grado <= 0) continue;

      const descriptores = habilidad.modificadoresPorGrado?.[grado];
      if (!Array.isArray(descriptores) || descriptores.length === 0) {
        throw new Error(
          `La pasiva aprendida "${idHabilidad}" grado ${grado} no tiene modificadores validados.`,
        );
      }

      for (const descriptor of descriptores) {
        if (objetivo !== null && descriptor.objetivo !== objetivo) continue;
        modificadores.push(descriptor);
      }
    }
    return modificadores;
  }
}
