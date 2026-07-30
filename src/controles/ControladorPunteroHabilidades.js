import { TIPOS_COMANDO_JUGADOR } from "../aplicacion/EjecutorAccionesJugador.js";

// Adaptador DOM exclusivo del puntero de habilidades.
//
// Convierte clics sobre casillas o Canvas en coordenadas del mapa y entrega
// un comando compartido. No ejecuta reglas ni escucha el teclado.
export class ControladorPunteroHabilidades {
  constructor({ sistemaHabilidades, esJuegoActivo, alEjecutarComando } = {}) {
    if (!sistemaHabilidades || typeof esJuegoActivo !== "function") {
      throw new Error(
        "El puntero de habilidades necesita el sistema y la verificación de actividad.",
      );
    }

    if (typeof alEjecutarComando !== "function") {
      throw new Error(
        "El puntero de habilidades necesita una función para ejecutar comandos.",
      );
    }

    this.sistema = sistemaHabilidades;
    this.esJuegoActivo = esJuegoActivo;
    this.alEjecutarComando = alEjecutarComando;
    this.destruido = false;
    this.alHacerClickMapa = this.alHacerClickMapa.bind(this);

    document.addEventListener("click", this.alHacerClickMapa, true);
  }

  destruir() {
    if (this.destruido) return false;

    document.removeEventListener("click", this.alHacerClickMapa, true);
    this.destruido = true;
    return true;
  }

  alHacerClickMapa(evento) {
    if (!this.esJuegoActivo() || !this.sistema.modoHabilidad) {
      return;
    }

    const coordenadas =
      obtenerCoordenadasDesdeElemento(evento.target) ??
      obtenerCoordenadasDesdeCanvas(evento, this.sistema);

    if (!coordenadas) {
      return;
    }

    detener(evento);
    this.alEjecutarComando({
      tipo: TIPOS_COMANDO_JUGADOR.FIJAR_SELECTOR_HABILIDAD,
      x: coordenadas.x,
      y: coordenadas.y,
      origenEntrada: "puntero",
    });
  }
}

function obtenerCoordenadasDesdeElemento(elemento) {
  const casilla = elemento?.closest?.(
    "[data-x][data-y], [data-columna][data-fila], [data-pos-x][data-pos-y]",
  );

  if (!casilla) {
    return null;
  }

  const x = Number(
    casilla.dataset.x ?? casilla.dataset.columna ?? casilla.dataset.posX,
  );
  const y = Number(
    casilla.dataset.y ?? casilla.dataset.fila ?? casilla.dataset.posY,
  );

  return Number.isInteger(x) && Number.isInteger(y) ? { x, y } : null;
}

function obtenerCoordenadasDesdeCanvas(evento, sistema) {
  const canvas = evento.target;
  if (canvas?.tagName !== "CANVAS") {
    return null;
  }

  const mapa = sistema?.juego?.mapa ?? sistema?.juego?.map;
  if (!Array.isArray(mapa) || mapa.length === 0) {
    return null;
  }

  const filas = mapa.length;
  const columnas = Math.max(
    0,
    ...mapa.map((fila) => (typeof fila?.length === "number" ? fila.length : 0)),
  );
  const rectangulo = canvas.getBoundingClientRect();

  if (
    columnas <= 0 ||
    rectangulo.width <= 0 ||
    rectangulo.height <= 0 ||
    evento.clientX < rectangulo.left ||
    evento.clientX >= rectangulo.right ||
    evento.clientY < rectangulo.top ||
    evento.clientY >= rectangulo.bottom
  ) {
    return null;
  }

  const x = Math.floor(
    ((evento.clientX - rectangulo.left) / rectangulo.width) * columnas,
  );
  const y = Math.floor(
    ((evento.clientY - rectangulo.top) / rectangulo.height) * filas,
  );

  return Number.isInteger(x) && Number.isInteger(y) ? { x, y } : null;
}

function detener(evento) {
  evento.preventDefault();
  evento.stopPropagation();
  evento.stopImmediatePropagation();
}
