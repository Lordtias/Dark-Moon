import { SistemaHabilidadesJugador } from "./SistemaHabilidadesJugador.js";
import {
  asignarHabilidadARanura,
  obtenerAsignacionesHabilidades,
} from "./EstadoSesionHabilidades.js";
import { validarBarraContraJugador } from "./PersistenciaBarraHabilidades.js";

// Conserva intacto el motor de ETAPA 5 y modifica únicamente la política de
// accesos rápidos. Las habilidades ya no se autoasignan: la barra representa
// decisiones explícitas del jugador.
export class SistemaHabilidadesJugadorEtapa7 extends SistemaHabilidadesJugador {
  sincronizarAsignacionesAprendidas() {
    // Intencionalmente vacío. Aprender una habilidad no altera la barra.
  }

  obtenerAsignaciones() {
    return obtenerAsignacionesHabilidades(this.jugador);
  }

  restaurarBarra(ranuras) {
    const validadas = validarBarraContraJugador({
      ranuras,
      habilidades: this.configuracion.habilidades,
      obtenerGrado: (idHabilidad) => this.obtenerGrado(idHabilidad),
    });

    for (let indice = 0; indice < 10; indice += 1) {
      asignarHabilidadARanura(this.jugador, indice, null);
    }
    validadas.forEach((idHabilidad, indice) => {
      if (idHabilidad !== null) {
        asignarHabilidadARanura(this.jugador, indice, idHabilidad);
      }
    });
    this.emitirCambio();
    return this.obtenerEstadoBarra();
  }

  vaciarBarra() {
    if (this.modoHabilidad) {
      this.cancelar();
    }
    for (let indice = 0; indice < 10; indice += 1) {
      asignarHabilidadARanura(this.jugador, indice, null);
    }
    this.emitirCambio();
    return this.obtenerEstadoBarra();
  }

  desasignarHabilidad(indiceRanura) {
    if (!Number.isInteger(indiceRanura) || indiceRanura < 0 || indiceRanura > 9) {
      throw new Error("La ranura de habilidad debe estar entre 0 y 9.");
    }
    if (this.seleccion?.indiceRanura === indiceRanura) {
      this.seleccion = null;
    }
    asignarHabilidadARanura(this.jugador, indiceRanura, null);
    this.emitirCambio();
    return this.obtenerEstadoBarra();
  }
}
