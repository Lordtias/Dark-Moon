import { evaluarLineaVision } from "../combate/SistemaAlcanceAtaque.js";
import { normalizarConfiguracionVisibilidad } from "./ConfiguracionVisibilidad.js";

// Calcula qué casillas puede ver actualmente el jugador y cuáles descubrió
// durante la permanencia en el mapa activo. No dibuja niebla ni decide cómo
// representa Phaser esa información.
export class SistemaVisibilidadJugador {
  constructor({ mapa, jugador, sistemaEspacial, configuracion = null } = {}) {
    validarMapa(mapa);
    validarJugador(jugador);
    validarSistemaEspacial(sistemaEspacial);

    this.mapa = mapa;
    this.jugador = jugador;
    this.sistemaEspacial = sistemaEspacial;
    this.configuracion = normalizarConfiguracionVisibilidad(configuracion);
    this.casillasVisibles = new Set();
    this.casillasDescubiertas = new Set();

    this.recalcular();
  }

  recalcular() {
    const visibles = this.configuracion.campoVisible
      ? this.calcularCampoVisible()
      : this.obtenerTodasLasCasillas();

    this.casillasVisibles = visibles;

    if (this.configuracion.descubrimiento) {
      for (const clave of visibles) {
        this.casillasDescubiertas.add(clave);
      }
      this.descubrirContornoParedes(visibles);
    } else {
      this.casillasDescubiertas = new Set(visibles);
    }

    return this.obtenerEstado({ recalcular: false });
  }

  esCasillaVisible(x, y, { recalcular = true } = {}) {
    if (recalcular) this.recalcular();
    return this.casillasVisibles.has(crearClave(x, y));
  }

  esCasillaDescubierta(x, y, { recalcular = true } = {}) {
    if (recalcular) this.recalcular();
    return this.casillasDescubiertas.has(crearClave(x, y));
  }

  obtenerEstado({ recalcular = true } = {}) {
    if (recalcular) this.recalcular();

    return {
      campoVisible: this.configuracion.campoVisible,
      descubrimiento: this.configuracion.descubrimiento,
      alcance: obtenerAlcanceVisual(this.jugador),
      casillasVisibles: ordenarCasillas(
        [...this.casillasVisibles].map(convertirClave),
      ),
      casillasDescubiertas: ordenarCasillas(
        [...this.casillasDescubiertas].map(convertirClave),
      ),
    };
  }

  calcularCampoVisible() {
    const visibles = new Set();
    const origen = {
      x: this.jugador.x,
      y: this.jugador.y,
    };
    const alcance = obtenerAlcanceVisual(this.jugador);

    if (!this.sistemaEspacial.estaDentroMapa(origen.x, origen.y)) {
      return visibles;
    }

    const minimoX = Math.max(0, origen.x - alcance);
    const maximoX = Math.min(this.mapa[0].length - 1, origen.x + alcance);
    const minimoY = Math.max(0, origen.y - alcance);
    const maximoY = Math.min(this.mapa.length - 1, origen.y + alcance);

    for (let y = minimoY; y <= maximoY; y++) {
      for (let x = minimoX; x <= maximoX; x++) {
        const distancia = Math.max(
          Math.abs(x - origen.x),
          Math.abs(y - origen.y),
        );
        if (distancia > alcance) continue;

        if (x === origen.x && y === origen.y) {
          visibles.add(crearClave(x, y));
          continue;
        }

        const lineaVision = evaluarLineaVision({
          mapa: this.mapa,
          sistemaEspacial: this.sistemaEspacial,
          origen,
          destino: { x, y },
        });

        if (lineaVision.despejada) {
          visibles.add(crearClave(x, y));
        }
      }
    }

    return visibles;
  }

  descubrirContornoParedes(visibles) {
    for (const clave of visibles) {
      const { x, y } = convertirClave(clave);
      const terrenoVisible = this.sistemaEspacial.consultarTerreno(x, y);

      // El contorno parte únicamente de terreno transitable realmente visible.
      // Una pared descubierta por esta regla no se convierte en nueva fuente,
      // evitando revelar en cadena el espesor o el interior de otros muros.
      if (!terrenoVisible.dentroMapa || terrenoVisible.bloqueaMovimiento) {
        continue;
      }

      for (let desplazamientoY = -1; desplazamientoY <= 1; desplazamientoY++) {
        for (let desplazamientoX = -1; desplazamientoX <= 1; desplazamientoX++) {
          if (desplazamientoX === 0 && desplazamientoY === 0) continue;

          const vecinoX = x + desplazamientoX;
          const vecinoY = y + desplazamientoY;
          const terrenoVecino = this.sistemaEspacial.consultarTerreno(
            vecinoX,
            vecinoY,
          );

          if (
            terrenoVecino.dentroMapa &&
            terrenoVecino.bloqueaMovimiento &&
            terrenoVecino.bloqueaVision
          ) {
            this.casillasDescubiertas.add(crearClave(vecinoX, vecinoY));
          }
        }
      }
    }
  }

  obtenerTodasLasCasillas() {
    const casillas = new Set();
    for (let y = 0; y < this.mapa.length; y++) {
      for (let x = 0; x < this.mapa[y].length; x++) {
        casillas.add(crearClave(x, y));
      }
    }
    return casillas;
  }
}

function obtenerAlcanceVisual(jugador) {
  const percepcion = Number.isFinite(jugador?.percepcion)
    ? jugador.percepcion
    : 0;
  return Math.floor(Math.max(0, percepcion));
}

function crearClave(x, y) {
  return `${x},${y}`;
}

function convertirClave(clave) {
  const [x, y] = clave.split(",").map(Number);
  return { x, y };
}

function ordenarCasillas(casillas) {
  return casillas.sort((a, b) => a.y - b.y || a.x - b.x);
}

function validarMapa(mapa) {
  if (
    !Array.isArray(mapa) ||
    mapa.length === 0 ||
    !Array.isArray(mapa[0]) ||
    mapa[0].length === 0
  ) {
    throw new Error("SistemaVisibilidadJugador necesita un mapa válido.");
  }
}

function validarJugador(jugador) {
  if (
    !jugador ||
    !Number.isInteger(jugador.x) ||
    !Number.isInteger(jugador.y)
  ) {
    throw new Error("SistemaVisibilidadJugador necesita un jugador válido.");
  }
}

function validarSistemaEspacial(sistemaEspacial) {
  if (
    !sistemaEspacial ||
    typeof sistemaEspacial.estaDentroMapa !== "function" ||
    typeof sistemaEspacial.bloqueaVision !== "function"
  ) {
    throw new Error(
      "SistemaVisibilidadJugador necesita una autoridad espacial válida.",
    );
  }
}
