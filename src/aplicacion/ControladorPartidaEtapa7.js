import { ControladorPartida } from "./ControladorPartida.js";
import { IntegracionHabilidadesEtapa7 } from "../juego/habilidades/IntegracionHabilidadesEtapa7.js";
import {
  obtenerConfiguracionEjecucionHabilidades,
  obtenerConfiguracionProgresoMagico,
} from "../juego/maestrias/ContextoProgresoMagico.js";

// Extiende el coordinador existente sin duplicar la creación del mapa.
// La única responsabilidad adicional es conectar y destruir la interfaz de
// habilidades en el mismo punto explícito donde cambia la instancia de Juego.
export class ControladorPartidaEtapa7 extends ControladorPartida {
  constructor(opciones = {}) {
    super(opciones);
    this.integracionHabilidadesEtapa7 = null;
  }

  activarMapa(configuracionMapa) {
    this.integracionHabilidadesEtapa7?.destruir();
    this.integracionHabilidadesEtapa7 = null;

    super.activarMapa(configuracionMapa);

    const juegoActivo = this.juego;
    this.integracionHabilidadesEtapa7 = new IntegracionHabilidadesEtapa7({
      juego: juegoActivo,
      configuracionEjecucion: obtenerConfiguracionEjecucionHabilidades(),
      configuracionProgreso: obtenerConfiguracionProgresoMagico(),
      configuracionObjetos: this.configuracionObjetos,
      esJuegoActivo: () =>
        this.partidaIniciada === true && this.juego === juegoActivo,
    });
  }
}
