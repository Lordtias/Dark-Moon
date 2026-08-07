import {
  ALTO_REFERENCIA_PHASER,
  ANCHO_REFERENCIA_PHASER,
  CONFIGURACION_CAMARA_PHASER,
} from "./ConfiguracionPhaser.js";

const DIRECCIONES_CAMARA_POR_TECLA = Object.freeze({
  KeyI: Object.freeze({ x: 0, y: -1 }),
  KeyJ: Object.freeze({ x: -1, y: 0 }),
  KeyK: Object.freeze({ x: 0, y: 1 }),
  KeyL: Object.freeze({ x: 1, y: 0 }),
});
const TECLA_RECENTRAR = "KeyH";
const MAX_DELTA_CAMARA_MS = 100;

// Gestiona exclusivamente la vista Phaser. El teclado y el puntero pueden
// navegar la cámara, pero nunca emiten acciones jugables ni consumen turnos.
export class ControladorCamaraPhaser {
  constructor({
    escena,
    compositor,
    conversorCoordenadas,
    zoomInicial,
    alCambiar = null,
  } = {}) {
    if (
      !escena?.cameras?.main ||
      !escena?.input ||
      !compositor ||
      !conversorCoordenadas
    ) {
      throw new Error(
        "ControladorCamaraPhaser necesita escena, compositor y conversor.",
      );
    }

    this.escena = escena;
    this.compositor = compositor;
    this.conversorCoordenadas = conversorCoordenadas;
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
    this.documento = this.canvas.ownerDocument;
    this.ventana = this.documento.defaultView ?? globalThis;
    this.teclasDireccionActivas = new Set();

    this.zoomInicial = validarZoom(zoomInicial);
    this.camara.setZoom(this.zoomInicial);
    this.camara.setBackgroundColor("#101814");

    this.alPointerDown = (pointer) => this.manejarPointerDown(pointer);
    this.alPointerMove = (pointer) => this.manejarPointerMove(pointer);
    this.alPointerUp = (pointer) => this.manejarPointerUp(pointer);
    this.alPointerOut = () => this.manejarPointerOut();
    this.alWheel = (pointer, objetos, deltaX, deltaY) =>
      this.manejarWheel(pointer, deltaY);
    this.alContextMenu = (evento) => evento.preventDefault();
    this.alSalirCanvas = () => this.manejarPointerOut();
    this.alKeyDown = (evento) => this.manejarKeyDown(evento);
    this.alKeyUp = (evento) => this.manejarKeyUp(evento);
    this.alPerderFoco = () => this.limpiarTeclasDireccion();
    this.alCambiarVisibilidad = () => {
      if (this.documento.hidden) {
        this.limpiarTeclasDireccion();
      }
    };

    escena.input.on("pointerdown", this.alPointerDown);
    escena.input.on("pointermove", this.alPointerMove);
    escena.input.on("pointerup", this.alPointerUp);
    escena.input.on("pointerout", this.alPointerOut);
    escena.input.on("wheel", this.alWheel);
    this.canvas.addEventListener("contextmenu", this.alContextMenu);
    this.canvas.addEventListener("mouseleave", this.alSalirCanvas);
    this.documento.addEventListener("keydown", this.alKeyDown);
    this.documento.addEventListener("keyup", this.alKeyUp);
    this.documento.addEventListener(
      "visibilitychange",
      this.alCambiarVisibilidad,
    );
    this.ventana.addEventListener("blur", this.alPerderFoco);

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
      // del mismo ciclo de representación.
      this.jugador = null;
      this.siguiendoJugador = true;
      this.finalizarArrastre();
      this.limpiarTeclasDireccion();
      this.establecerZoom(this.zoomInicial, { notificar: false });
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

  actualizarPosicionVisualJugador(posicionMundo) {
    if (
      !Number.isFinite(posicionMundo?.x) ||
      !Number.isFinite(posicionMundo?.y) ||
      (!this.siguiendoJugador && !this.seleccionActiva)
    ) {
      return false;
    }

    this.camara.centerOn(posicionMundo.x, posicionMundo.y);
    this.aplicarLimitesDesplazamiento();
    this.actualizarCasillaPunteroConocido();
    return true;
  }

  actualizarSeleccionActiva(activa) {
    const valorNuevo = activa === true;
    const cambio = valorNuevo !== this.seleccionActiva;
    this.seleccionActiva = valorNuevo;

    if (this.seleccionActiva) {
      this.ultimoClicIzquierdo = 0;
      this.finalizarArrastre();
      this.limpiarTeclasDireccion();
      this.siguiendoJugador = true;
      this.centrarEnJugador();
    }

    if (cambio) {
      this.notificarCambio();
    }
  }

  actualizar(deltaMs) {
    if (this.documento.body?.classList.contains("modal-ayuda-juego-abierta")) {
      this.limpiarTeclasDireccion();
      return;
    }

    if (
      this.seleccionActiva ||
      this.teclasDireccionActivas.size === 0 ||
      !this.geometria ||
      !this.estaVistaDisponible()
    ) {
      return;
    }

    const direccion = this.obtenerDireccionTeclado();
    if (direccion.x === 0 && direccion.y === 0) return;

    const deltaSeguro = limitar(
      Number.isFinite(deltaMs) ? deltaMs : 0,
      0,
      MAX_DELTA_CAMARA_MS,
    );
    const longitud = Math.hypot(direccion.x, direccion.y) || 1;
    const distanciaVisible =
      CONFIGURACION_CAMARA_PHASER.velocidadTecladoPixelesVisiblesSegundo *
      (deltaSeguro / 1000);
    const distanciaMundo = distanciaVisible / this.camara.zoom;

    this.camara.scrollX +=
      (direccion.x / longitud) * distanciaMundo;
    this.camara.scrollY +=
      (direccion.y / longitud) * distanciaMundo;
    this.aplicarLimitesDesplazamiento();

    this.actualizarCasillaPunteroConocido();
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

    this.actualizarCasillaPunteroConocido();
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
      if (this.seleccionActiva) {
        this.ultimoClicIzquierdo = 0;
        return;
      }

      const ahora = performance.now();

      if (
        ahora - this.ultimoClicIzquierdo <=
        CONFIGURACION_CAMARA_PHASER.retardoDobleClicMs
      ) {
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
      this.aplicarLimitesDesplazamiento();
    }

    this.ultimoPuntero = { x: pointer.x, y: pointer.y };
    this.actualizarCasillaPuntero(pointer);
  }

  manejarPointerUp(pointer) {
    if (pointer.button !== 1 && pointer.button !== 2) return;
    this.finalizarArrastre();
  }

  manejarPointerOut() {
    this.finalizarArrastre();
    this.ultimoPuntero = null;
    this.compositor.establecerCasillaPuntero(null);
  }

  manejarWheel(pointer, deltaY) {
    if (!Number.isFinite(deltaY) || deltaY === 0) return;

    const direccion = deltaY > 0 ? -1 : 1;
    this.cambiarZoom(direccion, {
      puntoPantalla: { x: pointer.x, y: pointer.y },
    });
    pointer.event?.preventDefault?.();
  }

  manejarKeyDown(evento) {
    if (this.documento.body?.classList.contains("modal-ayuda-juego-abierta")) {
      return;
    }

    if (
      esElementoEditable(evento.target) ||
      evento.altKey ||
      evento.ctrlKey ||
      evento.metaKey ||
      !this.estaVistaDisponible()
    ) {
      return;
    }

    const direccion = DIRECCIONES_CAMARA_POR_TECLA[evento.code];

    if (direccion) {
      if (this.seleccionActiva) return;

      const primeraPulsacion =
        !this.teclasDireccionActivas.has(evento.code);
      this.teclasDireccionActivas.add(evento.code);
      this.finalizarArrastre();
      this.siguiendoJugador = false;
      evento.preventDefault();

      if (primeraPulsacion) {
        this.notificarCambio();
      }
      return;
    }

    if (evento.code === TECLA_RECENTRAR) {
      if (evento.repeat) return;
      evento.preventDefault();
      this.recentrar();
      return;
    }

    const direccionZoom = obtenerDireccionZoomTeclado(evento);
    if (direccionZoom === 0 || evento.repeat) return;

    evento.preventDefault();
    this.cambiarZoom(direccionZoom);
  }

  manejarKeyUp(evento) {
    if (!DIRECCIONES_CAMARA_POR_TECLA[evento.code]) return;
    if (this.documento.body?.classList.contains("modal-ayuda-juego-abierta")) {
      this.teclasDireccionActivas.delete(evento.code);
      return;
    }
    this.teclasDireccionActivas.delete(evento.code);
  }

  establecerZoom(zoom, { notificar = true } = {}) {
    const zoomNuevo = validarZoom(zoom);
    if (Math.abs(zoomNuevo - this.camara.zoom) < 1e-9) {
      return this.camara.zoom;
    }

    this.camara.setZoom(zoomNuevo);
    this.firmaLimites = null;
    this.actualizarLimitesCamara();

    if (this.siguiendoJugador || this.seleccionActiva) {
      this.centrarEnJugador();
    } else {
      this.aplicarLimitesDesplazamiento();
    }

    this.actualizarCasillaPunteroConocido();
    if (notificar) this.notificarCambio("zoom");
    return this.camara.zoom;
  }

  cambiarZoom(direccion, { puntoPantalla = null } = {}) {
    const debeConservarJugador =
      this.siguiendoJugador || this.seleccionActiva;
    const puntoMundoAntes = debeConservarJugador
      ? null
      : puntoPantalla
        ? this.conversorCoordenadas.pantallaAMundo(
            puntoPantalla.x,
            puntoPantalla.y,
          )
        : this.obtenerCentroMundoVisible();
    const zoomNuevo = limitar(
      redondearZoom(
        this.camara.zoom +
          direccion * CONFIGURACION_CAMARA_PHASER.pasoZoom,
      ),
      CONFIGURACION_CAMARA_PHASER.zoomMinimo,
      CONFIGURACION_CAMARA_PHASER.zoomMaximo,
    );

    if (zoomNuevo === this.camara.zoom) return;

    this.camara.setZoom(zoomNuevo);
    this.firmaLimites = null;
    this.actualizarLimitesCamara();

    if (debeConservarJugador) {
      this.centrarEnJugador();
    } else if (puntoMundoAntes && puntoPantalla) {
      const puntoMundoDespues =
        this.conversorCoordenadas.pantallaAMundo(
          puntoPantalla.x,
          puntoPantalla.y,
        );
      this.camara.scrollX += puntoMundoAntes.x - puntoMundoDespues.x;
      this.camara.scrollY += puntoMundoAntes.y - puntoMundoDespues.y;
      this.aplicarLimitesDesplazamiento();
    } else if (puntoMundoAntes) {
      this.camara.centerOn(puntoMundoAntes.x, puntoMundoAntes.y);
    }

    this.actualizarCasillaPunteroConocido();
    this.notificarCambio("zoom");
  }

  actualizarCasillaPuntero(pointer) {
    const casilla = this.conversorCoordenadas.pantallaACasilla(
      pointer.x,
      pointer.y,
    );
    this.compositor.establecerCasillaPuntero(casilla);
  }

  actualizarCasillaPunteroConocido() {
    if (!this.ultimoPuntero) return;
    this.actualizarCasillaPuntero(this.ultimoPuntero);
  }

  recentrar() {
    this.finalizarArrastre();
    this.limpiarTeclasDireccion();
    this.siguiendoJugador = true;
    this.centrarEnJugador();
    this.actualizarCasillaPunteroConocido();
    this.notificarCambio();
  }

  centrarEnJugador() {
    if (!this.jugador || !this.geometria) return;

    const posicion = this.conversorCoordenadas.casillaAMundo(
      this.jugador,
      { centro: true },
    );
    if (!posicion) return;

    this.camara.centerOn(posicion.x, posicion.y);
  }

  obtenerCentroMundoVisible() {
    return {
      x: this.camara.scrollX + this.camara.width / 2,
      y: this.camara.scrollY + this.camara.height / 2,
    };
  }

  obtenerDireccionTeclado() {
    let x = 0;
    let y = 0;

    for (const codigo of this.teclasDireccionActivas) {
      const direccion = DIRECCIONES_CAMARA_POR_TECLA[codigo];
      x += direccion?.x ?? 0;
      y += direccion?.y ?? 0;
    }

    return { x, y };
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
    const centroLibre =
      !this.siguiendoJugador && !this.seleccionActiva
        ? this.obtenerCentroMundoVisible()
        : null;
    const medioAnchoVisible = this.camara.width / (2 * this.camara.zoom);
    const medioAltoVisible = this.camara.height / (2 * this.camara.zoom);

    this.camara.setBounds(
      this.geometria.origenX - medioAnchoVisible,
      this.geometria.origenY - medioAltoVisible,
      this.geometria.anchoMapa + medioAnchoVisible * 2,
      this.geometria.altoMapa + medioAltoVisible * 2,
      true,
    );

    if (centroLibre) {
      this.camara.centerOn(centroLibre.x, centroLibre.y);
    }
  }

  aplicarLimitesDesplazamiento() {
    if (
      !this.camara.useBounds ||
      typeof this.camara.clampX !== "function" ||
      typeof this.camara.clampY !== "function"
    ) {
      return;
    }

    this.camara.scrollX = this.camara.clampX(this.camara.scrollX);
    this.camara.scrollY = this.camara.clampY(this.camara.scrollY);
  }

  finalizarArrastre() {
    if (!this.arrastrando) return;
    this.arrastrando = false;
    this.canvas.classList.remove("game-canvas--phaser-arrastrando");
  }

  limpiarTeclasDireccion() {
    this.teclasDireccionActivas.clear();
  }

  estaVistaDisponible() {
    if (!this.canvas?.isConnected || !this.geometria || !this.jugador) {
      return false;
    }

    const limites = this.canvas.getBoundingClientRect();
    return limites.width > 0 && limites.height > 0;
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

  notificarCambio(motivo = "vista") {
    this.alCambiar?.(this.obtenerEstado(), motivo);
  }

  destruir() {
    this.finalizarArrastre();
    this.limpiarTeclasDireccion();
    this.escena.input.off("pointerdown", this.alPointerDown);
    this.escena.input.off("pointermove", this.alPointerMove);
    this.escena.input.off("pointerup", this.alPointerUp);
    this.escena.input.off("pointerout", this.alPointerOut);
    this.escena.input.off("wheel", this.alWheel);
    this.canvas.removeEventListener("contextmenu", this.alContextMenu);
    this.canvas.removeEventListener("mouseleave", this.alSalirCanvas);
    this.documento.removeEventListener("keydown", this.alKeyDown);
    this.documento.removeEventListener("keyup", this.alKeyUp);
    this.documento.removeEventListener(
      "visibilitychange",
      this.alCambiarVisibilidad,
    );
    this.ventana.removeEventListener("blur", this.alPerderFoco);
    this.compositor.establecerCasillaPuntero(null);
    this.alCambiar = null;
    this.escena = null;
    this.compositor = null;
    this.conversorCoordenadas = null;
    this.camara = null;
    this.canvas = null;
    this.documento = null;
    this.ventana = null;
  }
}

function obtenerDireccionZoomTeclado(evento) {
  if (evento.key === "+" || evento.code === "NumpadAdd") {
    return 1;
  }

  if (evento.key === "-" || evento.code === "NumpadSubtract") {
    return -1;
  }

  return 0;
}

function validarZoom(zoom) {
  const numero = Number(zoom);
  if (
    !Number.isFinite(numero) ||
    numero < CONFIGURACION_CAMARA_PHASER.zoomMinimo ||
    numero > CONFIGURACION_CAMARA_PHASER.zoomMaximo
  ) {
    throw new Error(
      `El zoom inicial debe estar entre ${CONFIGURACION_CAMARA_PHASER.zoomMinimo} y ${CONFIGURACION_CAMARA_PHASER.zoomMaximo}.`,
    );
  }
  return redondearZoom(numero);
}

function esElementoEditable(elemento) {
  return Boolean(
    elemento?.isContentEditable ||
      elemento?.closest?.(
        'input, textarea, select, [contenteditable="true"]',
      ),
  );
}

function redondearZoom(valor) {
  return Math.round(valor * 10) / 10;
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}
