import { crearEscenaArranquePhaser } from "./EscenaArranquePhaser.js";
import { inicializarPhaser } from "./InicializadorPhaser.js";

const CLASE_PANEL_PHASER = "panel-mapa--phaser";
const CLASE_CANVAS_BASE_OCULTO = "game-canvas--oculto-phaser";
const CLASE_HOST_PHASER = "host-phaser-dark-moon";
const CLASE_CANVAS_PHASER = "game-canvas--phaser";
const CLASE_INTERFAZ_PHASER = "interfaz-partida--phaser";
const CLASE_PANTALLA_PHASER = "pantalla-juego--phaser";
const MAX_REINTENTOS_AJUSTE_ESCALA = 20;
const RETARDO_REINTENTO_AJUSTE_ESCALA_MS = 50;

// Backend visual que consume el mismo contrato neutral que Canvas 2D.
// No recibe Juego, no ejecuta comandos y no contiene reglas jugables.
export class RenderizadorPhaser {
  constructor({
    Phaser,
    canvasBase,
    contenedor,
    preferenciasInterfaz,
  } = {}) {
    validarElementos({ Phaser, canvasBase, contenedor });
    validarPreferenciasInterfaz(preferenciasInterfaz);

    this.Phaser = Phaser;
    this.canvasBase = canvasBase;
    this.contenedor = contenedor;
    this.host = null;
    this.interfazPartida = null;
    this.pantallaJuego = null;
    this.canvasPhaser = null;
    this.escenaPhaser = null;
    this.ultimaEscena = null;
    this.dimensionesMapa = null;
    this.alEjecutarComando = null;
    this.juegoPhaser = null;
    this.observadorTamano = null;
    this.observadorVisibilidad = null;
    this.idAjusteEscala = null;
    this.idReintentoAjusteEscala = null;
    this.reintentosAjusteEscala = 0;
    this.ultimoTamanoHost = Object.freeze({ ancho: 0, alto: 0 });
    this.configuracionAnimaciones = Object.freeze({
      velocidad: preferenciasInterfaz.velocidadAnimaciones,
      efectosReducidos: preferenciasInterfaz.efectosReducidos,
    });
    this.zoomInicial = preferenciasInterfaz.zoomInicial;

    this.prepararContenedor();

    const Escena = crearEscenaArranquePhaser({
      Phaser,
      zoomInicial: this.zoomInicial,
      alPreparar: (escenaPhaser) => {
        this.escenaPhaser = escenaPhaser;
        this.escenaPhaser.configurarAnimaciones(this.configuracionAnimaciones);
        this.sincronizarEscena();
      },
    });

    try {
      this.juegoPhaser = inicializarPhaser({
        Phaser,
        host: this.host,
        Escena,
        alPrepararCanvas: (canvasPhaser) => {
          this.canvasPhaser = canvasPhaser;
          this.canvasPhaser.classList.add(CLASE_CANVAS_PHASER);
          this.canvasPhaser.setAttribute(
            "aria-label",
            "Mapa de Dark Moon representado visualmente con Phaser",
          );
          this.solicitarAjusteEscala();
        },
      });

      this.observarTamanoContenedor();
      this.observarVisibilidadContenedor();
      this.solicitarAjusteEscala();
    } catch (error) {
      this.detenerObservacionTamano();
      this.restaurarContenedor();
      throw error;
    }
  }

  configurarDimensiones({ columnas, filas } = {}) {
    if (
      !Number.isInteger(columnas) ||
      columnas <= 0 ||
      !Number.isInteger(filas) ||
      filas <= 0
    ) {
      throw new Error(
        "Las dimensiones gráficas deben utilizar enteros mayores que 0.",
      );
    }

    this.dimensionesMapa = Object.freeze({ columnas, filas });
    this.escenaPhaser?.configurarDimensionesMapa(this.dimensionesMapa);
  }

  dibujar(escena, { eventosVisuales = [] } = {}) {
    if (!escena?.mapa || !Array.isArray(escena?.entidades)) {
      throw new Error("RenderizadorPhaser necesita una escena visual válida.");
    }

    this.ultimaEscena = escena;
    this.escenaPhaser?.actualizarEscena(escena, { eventosVisuales });
  }

  esperarPresentacionPendiente() {
    return this.escenaPhaser?.esperarPresentacionPendiente?.() ?? null;
  }

  configurarAnimaciones(configuracion = {}) {
    if (!configuracion || typeof configuracion !== "object") {
      throw new Error("La configuración de animaciones debe ser un objeto.");
    }

    this.configuracionAnimaciones = Object.freeze({
      ...this.configuracionAnimaciones,
      ...configuracion,
    });

    return this.escenaPhaser?.configurarAnimaciones(
      this.configuracionAnimaciones,
    ) ?? this.configuracionAnimaciones;
  }

  conectarEntradaJugable(alEjecutarComando = null) {
    if (
      alEjecutarComando !== null &&
      alEjecutarComando !== undefined &&
      typeof alEjecutarComando !== "function"
    ) {
      throw new Error(
        "RenderizadorPhaser necesita una función de entrada o null.",
      );
    }

    this.alEjecutarComando = alEjecutarComando ?? null;
    this.escenaPhaser?.establecerManejadorEntradaJugable(
      this.alEjecutarComando,
    );
  }

  destruir() {
    this.conectarEntradaJugable(null);
    this.detenerObservacionTamano();
    this.juegoPhaser?.destroy(true);
    this.juegoPhaser = null;
    this.escenaPhaser = null;
    this.canvasPhaser = null;
    this.restaurarContenedor();
  }

  sincronizarEscena() {
    if (!this.escenaPhaser) {
      return;
    }

    if (this.dimensionesMapa) {
      this.escenaPhaser.configurarDimensionesMapa(this.dimensionesMapa);
    }

    this.escenaPhaser.establecerManejadorEntradaJugable(
      this.alEjecutarComando,
    );

    this.escenaPhaser.configurarAnimaciones(this.configuracionAnimaciones);

    if (this.ultimaEscena) {
      this.escenaPhaser.actualizarEscena(this.ultimaEscena);
    }
  }

  observarTamanoContenedor() {
    if (typeof ResizeObserver !== "function") {
      return;
    }

    this.observadorTamano = new ResizeObserver((entradas) => {
      const entradaHost = entradas.find(
        (entrada) => entrada.target === this.host,
      );
      const ancho = entradaHost?.contentRect?.width ?? 0;
      const alto = entradaHost?.contentRect?.height ?? 0;

      if (
        ancho === this.ultimoTamanoHost.ancho &&
        alto === this.ultimoTamanoHost.alto
      ) {
        return;
      }

      this.ultimoTamanoHost = Object.freeze({ ancho, alto });

      if (ancho > 0 && alto > 0) {
        this.solicitarAjusteEscala();
      }
    });

    this.observadorTamano.observe(this.host);
  }

  observarVisibilidadContenedor() {
    if (typeof MutationObserver !== "function") {
      return;
    }

    this.observadorVisibilidad = new MutationObserver(() => {
      this.solicitarAjusteEscala();
    });

    let elementoObservado = this.contenedor;

    while (elementoObservado) {
      this.observadorVisibilidad.observe(elementoObservado, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
      elementoObservado = elementoObservado.parentElement;
    }

    // Los modales HTML viven fuera de la jerarquía directa del mapa. Observar
    // el atributo estándar "open" permite resincronizar la vista ante cualquier
    // diálogo actual o futuro sin acoplar la cámara a nombres de modales.
    if (document.body) {
      this.observadorVisibilidad.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ["open"],
      });
    }
  }

  solicitarAjusteEscala({ reiniciarReintentos = true } = {}) {
    if (reiniciarReintentos) {
      this.reintentosAjusteEscala = MAX_REINTENTOS_AJUSTE_ESCALA;
    }

    if (
      this.idAjusteEscala !== null ||
      this.idReintentoAjusteEscala !== null
    ) {
      return;
    }

    this.idAjusteEscala = requestAnimationFrame(() => {
      this.idAjusteEscala = null;
      const resultado = this.ajustarEscalaSiVisible();

      if (
        resultado === "pendiente" &&
        this.reintentosAjusteEscala > 0
      ) {
        this.reintentosAjusteEscala -= 1;
        this.idReintentoAjusteEscala = setTimeout(() => {
          this.idReintentoAjusteEscala = null;
          this.solicitarAjusteEscala({ reiniciarReintentos: false });
        }, RETARDO_REINTENTO_AJUSTE_ESCALA_MS);
      }
    });
  }

  ajustarEscalaSiVisible() {
    if (!this.host || !this.juegoPhaser?.scale) {
      return "pendiente";
    }

    const limitesHost = this.host.getBoundingClientRect();

    if (limitesHost.width <= 0 || limitesHost.height <= 0) {
      return "oculto";
    }

    const gestorEscala = this.juegoPhaser.scale;

    if (
      typeof gestorEscala.updateBounds !== "function" ||
      typeof gestorEscala.refresh !== "function"
    ) {
      return "pendiente";
    }

    gestorEscala.updateBounds();
    gestorEscala.refresh();
    this.escenaPhaser?.sincronizarCamaraConVista();

    const limitesCanvas = this.canvasPhaser?.getBoundingClientRect();
    const anchoVisible = limitesCanvas?.width ?? 0;
    const altoVisible = limitesCanvas?.height ?? 0;
    const anchoEscala = gestorEscala.displaySize?.width ?? 0;
    const altoEscala = gestorEscala.displaySize?.height ?? 0;

    if (
      anchoVisible > 2 &&
      altoVisible > 2 &&
      anchoEscala > 0 &&
      altoEscala > 0
    ) {
      this.reintentosAjusteEscala = 0;
      return "ajustado";
    }

    return "pendiente";
  }

  detenerObservacionTamano() {
    this.observadorTamano?.disconnect();
    this.observadorTamano = null;
    this.observadorVisibilidad?.disconnect();
    this.observadorVisibilidad = null;

    if (this.idAjusteEscala !== null) {
      cancelAnimationFrame(this.idAjusteEscala);
      this.idAjusteEscala = null;
    }

    if (this.idReintentoAjusteEscala !== null) {
      clearTimeout(this.idReintentoAjusteEscala);
      this.idReintentoAjusteEscala = null;
    }

    this.reintentosAjusteEscala = 0;
  }

  prepararContenedor() {
    this.interfazPartida = this.contenedor.closest(".interfaz-partida");
    this.pantallaJuego = this.contenedor.closest(".pantalla-juego");
    this.interfazPartida?.classList.add(CLASE_INTERFAZ_PHASER);
    this.pantallaJuego?.classList.add(CLASE_PANTALLA_PHASER);
    this.contenedor.classList.add(CLASE_PANEL_PHASER);
    this.canvasBase.classList.add(CLASE_CANVAS_BASE_OCULTO);
    this.canvasBase.setAttribute("aria-hidden", "true");

    this.host = document.createElement("div");
    this.host.className = CLASE_HOST_PHASER;
    this.host.setAttribute("aria-live", "polite");
    this.contenedor.appendChild(this.host);
  }

  restaurarContenedor() {
    this.host?.remove();
    this.host = null;
    this.contenedor.classList.remove(CLASE_PANEL_PHASER);
    this.interfazPartida?.classList.remove(CLASE_INTERFAZ_PHASER);
    this.pantallaJuego?.classList.remove(CLASE_PANTALLA_PHASER);
    this.interfazPartida = null;
    this.pantallaJuego = null;
    this.canvasBase.classList.remove(CLASE_CANVAS_BASE_OCULTO);
    this.canvasBase.removeAttribute("aria-hidden");
  }
}

function validarPreferenciasInterfaz(preferencias) {
  if (
    !preferencias ||
    typeof preferencias !== "object" ||
    typeof preferencias.velocidadAnimaciones !== "string" ||
    typeof preferencias.efectosReducidos !== "boolean" ||
    !Number.isFinite(preferencias.zoomInicial)
  ) {
    throw new Error(
      "RenderizadorPhaser necesita preferencias de interfaz válidas.",
    );
  }
}

function validarElementos({ Phaser, canvasBase, contenedor }) {
  if (!Phaser?.Game || !Phaser?.Scene) {
    throw new Error("RenderizadorPhaser necesita Phaser cargado.");
  }

  if (!(canvasBase instanceof HTMLCanvasElement)) {
    throw new Error("RenderizadorPhaser necesita el canvas base del mapa.");
  }

  if (!(contenedor instanceof HTMLElement)) {
    throw new Error("RenderizadorPhaser necesita el panel del mapa.");
  }
}
