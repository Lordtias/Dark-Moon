import {
  ALTO_REFERENCIA_PHASER,
  ANCHO_REFERENCIA_PHASER,
  TAMANO_CASILLA_REFERENCIA,
} from "./ConfiguracionPhaser.js";

const ZOOM_MINIMO = 0.8;
const ZOOM_MAXIMO = 1.6;
const ZOOM_INICIAL = 1.2;
const PASO_ZOOM = 0.1;
const RETARDO_DOBLE_CLIC_MS = 320;

// Gestiona exclusivamente la vista Phaser. El puntero puede señalar casillas,
// desplazar la cámara y cambiar zoom, pero nunca emite acciones jugables.
export class ControladorCamaraPhaser {
  constructor({ escena, compositor, alCambiar = null } = {}) {
    if (!escena?.cameras?.main || !escena?.input || !compositor) {
      throw new Error("ControladorCamaraPhaser necesita escena y compositor.");
    }

    this.escena = escena;
    this.compositor = compositor;
    this.camara = escena.cameras.main;
    this.alCambiar = alCambiar;
    this.geometria = null;
    this.identificadorMapa = null;
    this.jugador = null;
    this.siguiendoJugador = true;
    this.seleccionActiva = false;
    this.arrastrando = false;
    this.ultimoPuntero = null;
    this.ultimoClicIzquierdo = 0;
    this.firmaLimites = null;
    this.canvas = escena.game.canvas;

    this.camara.setZoom(ZOOM_INICIAL);
    this.camara.setBackgroundColor("#101814");

    this.alPointerDown = (pointer) => this.manejarPointerDown(pointer);
    this.alPointerMove = (pointer) => this.manejarPointerMove(pointer);
    this.alPointerUp = (pointer) => this.manejarPointerUp(pointer);
    this.alPointerOut = () => this.manejarPointerOut();
    this.alWheel = (pointer, objetos, deltaX, deltaY) =>
      this.manejarWheel(pointer, deltaY);
    this.alContextMenu = (evento) => evento.preventDefault();
    this.alSalirCanvas = () => this.manejarPointerOut();

    escena.input.on("pointerdown", this.alPointerDown);
    escena.input.on("pointermove", this.alPointerMove);
    escena.input.on("pointerup", this.alPointerUp);
    escena.input.on("pointerout", this.alPointerOut);
    escena.input.on("wheel", this.alWheel);
    this.canvas.addEventListener("contextmenu", this.alContextMenu);
    this.canvas.addEventListener("mouseleave", this.alSalirCanvas);

    this.notificarCambio();
  }

  actualizarMapa(geometria) {
    if (!geometria) return;

    const identificadorMapa = geometria.identificadorMapa ?? null;
    const cambioMapa =
      this.identificadorMapa !== identificadorMapa ||
      !this.geometria ||
      this.geometria.columnas !== geometria.columnas ||
      this.geometria.filas !== geometria.filas;
    const cambioGeometria =
      !this.geometria ||
      this.geometria.columnas !== geometria.columnas ||
      this.geometria.filas !== geometria.filas ||
      this.geometria.origenX !== geometria.origenX ||
      this.geometria.origenY !== geometria.origenY ||
      this.geometria.anchoMapa !== geometria.anchoMapa ||
      this.geometria.altoMapa !== geometria.altoMapa;

    this.identificadorMapa = identificadorMapa;
    this.geometria = { ...geometria };

    if (cambioMapa) {
      // El personaje de la escena anterior no debe utilizarse como referencia
      // durante el cambio. actualizarJugador recibirá la posición nueva dentro
      // del mismo ciclo de representación y centrará sin mostrar el centro del mapa.
      this.jugador = null;
      this.siguiendoJugador = true;
      this.finalizarArrastre();
    }

    if (cambioGeometria || cambioMapa) {
      this.firmaLimites = null;
      this.actualizarLimitesCamara();
    }

    if (cambioMapa) {
      this.notificarCambio();
    }
  }

  actualizarJugador(jugador) {
    if (!Number.isInteger(jugador?.x) || !Number.isInteger(jugador?.y)) {
      this.jugador = null;
      return;
    }

    this.jugador = { x: jugador.x, y: jugador.y };

    // El seguimiento es un contrato persistente, no una reacción a acciones
    // concretas. Mientras permanezca activo, cada actualización visual vuelve a
    // confirmar que el personaje ocupa el centro exacto de la cámara.
    if (this.siguiendoJugador || this.seleccionActiva) {
      this.centrarEnJugador();
    }
  }

  actualizarSeleccionActiva(activa) {
    const valorNuevo = activa === true;
    const cambio = valorNuevo !== this.seleccionActiva;
    this.seleccionActiva = valorNuevo;

    if (this.seleccionActiva) {
      this.finalizarArrastre();
      this.siguiendoJugador = true;
      this.centrarEnJugador();
    }

    if (cambio) {
      this.notificarCambio();
    }
  }

  // Se invoca después de refrescos de escala, visibilidad, modal o tamaño del
  // contenedor. Recalcula límites y conserva el objetivo de seguimiento sin
  // necesitar conocer qué evento de interfaz produjo el cambio.
  sincronizarVista() {
    this.firmaLimites = null;
    this.actualizarLimitesCamara();

    if (this.siguiendoJugador || this.seleccionActiva) {
      this.centrarEnJugador();
    }
  }

  manejarPointerDown(pointer) {
    if (pointer.button === 1 || pointer.button === 2) {
      if (this.seleccionActiva) {
        this.centrarEnJugador();
        pointer.event?.preventDefault?.();
        return;
      }

      this.arrastrando = true;
      this.siguiendoJugador = false;
      this.ultimoPuntero = { x: pointer.x, y: pointer.y };
      this.canvas.classList.add("game-canvas--phaser-arrastrando");
      pointer.event?.preventDefault?.();
      this.notificarCambio();
      return;
    }

    if (pointer.button === 0) {
      const ahora = performance.now();

      if (ahora - this.ultimoClicIzquierdo <= RETARDO_DOBLE_CLIC_MS) {
        this.recentrar();
        this.ultimoClicIzquierdo = 0;
      } else {
        this.ultimoClicIzquierdo = ahora;
      }
    }
  }

  manejarPointerMove(pointer) {
    if (this.arrastrando && this.ultimoPuntero) {
      const deltaX = pointer.x - this.ultimoPuntero.x;
      const deltaY = pointer.y - this.ultimoPuntero.y;
      this.camara.scrollX -= deltaX / this.camara.zoom;
      this.camara.scrollY -= deltaY / this.camara.zoom;
      this.ultimoPuntero = { x: pointer.x, y: pointer.y };
    }

    this.actualizarCasillaPuntero(pointer);
  }

  manejarPointerUp(pointer) {
    if (pointer.button !== 1 && pointer.button !== 2) return;
    this.finalizarArrastre();
  }

  manejarPointerOut() {
    this.finalizarArrastre();
    this.compositor.establecerCasillaPuntero(null);
  }

  manejarWheel(pointer, deltaY) {
    if (!Number.isFinite(deltaY) || deltaY === 0) return;

    const debeConservarJugador =
      this.siguiendoJugador || this.seleccionActiva;
    const puntoAntes = debeConservarJugador
      ? null
      : this.camara.getWorldPoint(pointer.x, pointer.y);
    const direccion = deltaY > 0 ? -1 : 1;
    const zoomNuevo = limitar(
      redondearZoom(this.camara.zoom + direccion * PASO_ZOOM),
      ZOOM_MINIMO,
      ZOOM_MAXIMO,
    );

    if (zoomNuevo === this.camara.zoom) return;

    this.camara.setZoom(zoomNuevo);
    this.firmaLimites = null;
    this.actualizarLimitesCamara();

    if (debeConservarJugador) {
      this.centrarEnJugador();
    } else {
      const puntoDespues = this.camara.getWorldPoint(pointer.x, pointer.y);
      this.camara.scrollX += puntoAntes.x - puntoDespues.x;
      this.camara.scrollY += puntoAntes.y - puntoDespues.y;
    }

    pointer.event?.preventDefault?.();
    this.actualizarCasillaPuntero(pointer);
    this.notificarCambio();
  }

  actualizarCasillaPuntero(pointer) {
    const punto = this.camara.getWorldPoint(pointer.x, pointer.y);
    const casilla = this.compositor.convertirMundoACasilla(punto.x, punto.y);
    this.compositor.establecerCasillaPuntero(casilla);
  }

  recentrar() {
    this.siguiendoJugador = true;
    this.centrarEnJugador();
    this.notificarCambio();
  }

  centrarEnJugador() {
    if (!this.jugador || !this.geometria) return;

    const x =
      this.geometria.origenX +
      (this.jugador.x + 0.5) * TAMANO_CASILLA_REFERENCIA;
    const y =
      this.geometria.origenY +
      (this.jugador.y + 0.5) * TAMANO_CASILLA_REFERENCIA;
    this.camara.centerOn(x, y);
  }

  actualizarLimitesCamara() {
    if (!this.geometria || !this.camara) return;

    const firma = [
      this.geometria.origenX,
      this.geometria.origenY,
      this.geometria.anchoMapa,
      this.geometria.altoMapa,
      this.camara.width,
      this.camara.height,
      this.camara.zoom,
    ].join(":");

    if (firma === this.firmaLimites) {
      return;
    }

    this.firmaLimites = firma;
    const medioAnchoVisible = this.camara.width / (2 * this.camara.zoom);
    const medioAltoVisible = this.camara.height / (2 * this.camara.zoom);

    this.camara.setBounds(
      this.geometria.origenX - medioAnchoVisible,
      this.geometria.origenY - medioAltoVisible,
      this.geometria.anchoMapa + medioAnchoVisible * 2,
      this.geometria.altoMapa + medioAltoVisible * 2,
      true,
    );
  }

  finalizarArrastre() {
    if (!this.arrastrando) return;
    this.arrastrando = false;
    this.ultimoPuntero = null;
    this.canvas.classList.remove("game-canvas--phaser-arrastrando");
  }

  obtenerEstado() {
    return Object.freeze({
      zoom: this.camara.zoom,
      siguiendoJugador: this.siguiendoJugador,
      seleccionActiva: this.seleccionActiva,
      anchoReferencia: ANCHO_REFERENCIA_PHASER,
      altoReferencia: ALTO_REFERENCIA_PHASER,
    });
  }

  notificarCambio() {
    this.alCambiar?.(this.obtenerEstado());
  }

  destruir() {
    this.finalizarArrastre();
    this.escena.input.off("pointerdown", this.alPointerDown);
    this.escena.input.off("pointermove", this.alPointerMove);
    this.escena.input.off("pointerup", this.alPointerUp);
    this.escena.input.off("pointerout", this.alPointerOut);
    this.escena.input.off("wheel", this.alWheel);
    this.canvas.removeEventListener("contextmenu", this.alContextMenu);
    this.canvas.removeEventListener("mouseleave", this.alSalirCanvas);
    this.compositor.establecerCasillaPuntero(null);
    this.alCambiar = null;
    this.escena = null;
    this.compositor = null;
    this.camara = null;
    this.canvas = null;
  }
}

function redondearZoom(valor) {
  return Math.round(valor * 10) / 10;
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}
