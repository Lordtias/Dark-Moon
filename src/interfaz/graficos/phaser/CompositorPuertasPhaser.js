import { TAMANO_CASILLA_VISUAL_PHASER } from "./ConfiguracionPhaser.js";
import {
  NIVELES_PROFUNDIDAD_MUNDO_PHASER,
  calcularProfundidadOrdenablePhaser,
} from "./OrdenadorProfundidadPhaser.js";

// Las puertas abiertas dejan visible únicamente el hueco con su marco. La hoja
// se dibuja solo en estado cerrado para priorizar legibilidad y una lectura
// arquitectónica limpia en perspectiva superior.
export function obtenerRutasPuertasArquitectonicasPhaser() {
  return [];
}

export class CompositorPuertasPhaser {
  constructor({ escena, gestorRecursos, registrarObjeto } = {}) {
    if (!escena?.add || !gestorRecursos || typeof registrarObjeto !== "function") {
      throw new Error(
        "CompositorPuertasPhaser necesita escena, recursos y registro de objetos.",
      );
    }

    this.escena = escena;
    this.gestorRecursos = gestorRecursos;
    this.registrarObjeto = registrarObjeto;
  }

  dibujar({ puertas = [], geometria, configuracion } = {}) {
    for (const puerta of puertas) {
      for (const casilla of puerta.casillas ?? []) {
        this.dibujarPuerta({ puerta, casilla, geometria, configuracion });
      }
    }
  }

  dibujarPuerta({ puerta, casilla, geometria, configuracion }) {
    const tamano = TAMANO_CASILLA_VISUAL_PHASER;
    const x = geometria.origenX + casilla.x * tamano;
    const y = geometria.origenY + casilla.y * tamano;

    this.dibujarMarco({ puerta, x, y, configuracion });

    if (puerta.abierta) {
      return;
    }

    this.dibujarHojaCerrada({ puerta, x, y, configuracion });
  }

  obtenerGeometriaBase({ x, y, configuracion }) {
    const tamano = TAMANO_CASILLA_VISUAL_PHASER;
    const alturaMarco = configuracion.alturaMarcoPuerta;
    const baseY = y + tamano + configuracion.solapeFrenteSur;
    const inicioY = baseY - alturaMarco;
    const grosorMarco = 8;
    const resalteMarco = 3;

    return {
      tamano,
      alturaMarco,
      baseY,
      inicioY,
      grosorMarco,
      resalteMarco,
    };
  }

  dibujarMarco({ puerta, x, y, configuracion }) {
    const {
      tamano,
      alturaMarco,
      baseY,
      inicioY,
      grosorMarco,
      resalteMarco,
    } = this.obtenerGeometriaBase({ x, y, configuracion });

    const marco = this.escena.add.graphics();
    marco.fillStyle(configuracion.colorMarcoOscuro, 1);

    // Jambas laterales finas y un dintel delgado para reservar más área útil a
    // la hoja de la puerta y mantener la puerta a la misma altura visual que la
    // pared delantera.
    marco.fillRect(x + 2, inicioY, grosorMarco, alturaMarco);
    marco.fillRect(x + tamano - 2 - grosorMarco, inicioY, grosorMarco, alturaMarco);
    marco.fillRect(x + 2, inicioY, tamano - 4, grosorMarco);

    // Resaltes internos sutiles para que el marco no parezca una pared maciza.
    marco.fillStyle(configuracion.colorMarco, 1);
    marco.fillRect(x + 2 + grosorMarco, inicioY + 2, tamano - 4 - grosorMarco * 2, resalteMarco);
    marco.fillRect(x + 2 + 1, inicioY + 2, 1, alturaMarco - 4);
    marco.fillRect(x + tamano - 4, inicioY + 2, 1, alturaMarco - 4);

    this.registrarObjeto(
      marco,
      calcularProfundidadOrdenablePhaser({
        baseY,
        baseX: x + tamano / 2,
        nivel: NIVELES_PROFUNDIDAD_MUNDO_PHASER.FACHADA,
      }),
    );
  }

  dibujarHojaCerrada({ puerta, x, y, configuracion }) {
    const {
      tamano,
      alturaMarco,
      baseY,
      inicioY,
      grosorMarco,
    } = this.obtenerGeometriaBase({ x, y, configuracion });

    const hoja = this.escena.add.graphics();
    const margenLateral = puerta.orientacion === "horizontal" ? 10 : 11;
    const margenSuperior = 10;
    const margenInferior = 8;
    const anchoHoja = tamano - margenLateral * 2;
    const alturaHoja = Math.max(44, alturaMarco - margenSuperior - margenInferior);
    const inicioX = x + margenLateral;
    const inicioYHoja = inicioY + margenSuperior;

    hoja.fillStyle(configuracion.colorHojaOscuro, 1);
    hoja.fillRect(inicioX, inicioYHoja, anchoHoja, alturaHoja);

    hoja.fillStyle(configuracion.colorHoja, 1);
    hoja.fillRect(inicioX + 3, inicioYHoja + 3, anchoHoja - 6, alturaHoja - 6);

    hoja.lineStyle(2, configuracion.colorHojaClaro, 0.72);
    hoja.strokeRect(inicioX + 6, inicioYHoja + 8, anchoHoja - 12, alturaHoja - 16);

    // Traviesa superior y tirador sutil para dar escala sin reducir el área de hoja.
    hoja.lineStyle(2, configuracion.colorHojaClaro, 0.58);
    hoja.beginPath();
    hoja.moveTo(inicioX + 5, inicioYHoja + 16);
    hoja.lineTo(inicioX + anchoHoja - 5, inicioYHoja + 16);
    hoja.strokePath();
    hoja.fillStyle(configuracion.colorHojaClaro, 0.9);
    const tiradorX = puerta.orientacion === "horizontal" ? inicioX + anchoHoja - 8 : inicioX + anchoHoja - 7;
    const tiradorY = inicioYHoja + Math.round(alturaHoja * 0.52);
    hoja.fillRect(tiradorX, tiradorY, 3, 3);

    this.registrarObjeto(
      hoja,
      calcularProfundidadOrdenablePhaser({
        baseY: baseY - 3,
        baseX: x + tamano / 2,
        nivel: NIVELES_PROFUNDIDAD_MUNDO_PHASER.PUERTA,
      }),
    );
  }

  destruir() {
    this.escena = null;
    this.gestorRecursos = null;
    this.registrarObjeto = null;
  }
}
