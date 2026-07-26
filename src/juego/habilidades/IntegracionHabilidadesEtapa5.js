import { BarraHabilidades } from "../../interfaz/habilidades/BarraHabilidades.js";
import { ControladorEntradaHabilidades } from "./ControladorEntradaHabilidades.js";
import {
  crearDepuradorEtapa5,
  publicarDepuradorEtapa5,
} from "./DepuradorEtapa5.js";
import {
  crearDepuradorEtapa6,
  publicarDepuradorEtapa6,
} from "./DepuradorEtapa6.js";
import { SistemaHabilidadesJugador } from "./SistemaHabilidadesJugador.js";

export class IntegracionHabilidadesEtapa5 {
  constructor({ juego, esJuegoActivo, configuracionEjecucion }) {
    this.juego = juego;
    this.sistema = new SistemaHabilidadesJugador({
      juego,
      configuracionEjecucion,
    });
    this.barra = new BarraHabilidades({ sistemaHabilidades: this.sistema });
    this.entrada = new ControladorEntradaHabilidades({
      sistemaHabilidades: this.sistema,
      esJuegoActivo,
    });
    this.depurador = crearDepuradorEtapa5({
      juego,
      sistemaHabilidades: this.sistema,
    });
    publicarDepuradorEtapa5(this.depurador);

    this.depuradorEtapa6 = crearDepuradorEtapa6({ juego });
    publicarDepuradorEtapa6(this.depuradorEtapa6);
  }

  destruir() {
    this.entrada?.destruir();
    this.barra?.destruir();
  }
}
