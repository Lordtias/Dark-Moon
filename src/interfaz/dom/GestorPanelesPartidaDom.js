import { CLASE_CAPTURA_ENTRADA_INTERFAZ } from "../../controles/ContextoEntradaInterfaz.js";

const CLASE_PANEL_PARTIDA_ABIERTO = "panel-partida-abierto";

// Coordina la navegación primaria de la partida. Solamente administra
// presentación: abrir/cerrar paneles, foco y captura de entrada jugable.
export class GestorPanelesPartidaDom {
  constructor({ capa, botones = {}, paneles = {} } = {}) {
    if (!(capa instanceof HTMLElement)) {
      throw new Error("GestorPanelesPartidaDom necesita la capa de paneles.");
    }

    this.capa = capa;
    this.botones = new Map();
    this.paneles = new Map();
    this.panelActivo = null;
    this.manejadores = [];

    for (const [id, boton] of Object.entries(botones)) {
      this.registrarBoton(id, boton);
    }

    for (const [id, panel] of Object.entries(paneles)) {
      this.registrarPanelEstatico(id, panel);
    }

    this.escuchar(this.capa, "click", (evento) => {
      if (evento.target === this.capa) {
        this.cerrarActual();
      }
    });

    this.escuchar(
      window,
      "keydown",
      (evento) => this.manejarEscape(evento),
      true,
    );

    this.actualizarEstadoGlobal();
  }

  registrarBoton(id, boton) {
    if (!(boton instanceof HTMLElement)) {
      throw new Error(`Falta el botón del panel "${id}".`);
    }

    this.botones.set(id, boton);
    boton.setAttribute("aria-pressed", "false");
    this.escuchar(boton, "click", () => this.alternar(id));
  }

  registrarPanelEstatico(id, definicion) {
    const contrato = normalizarPanelEstatico(definicion);
    contrato.elemento.hidden = true;

    for (const cerrar of contrato.elemento.querySelectorAll("[data-panel-cerrar]")) {
      this.escuchar(cerrar, "click", () => this.cerrar(id));
    }

    this.paneles.set(id, contrato);
    return contrato;
  }

  registrarPanelDinamico(id, contrato) {
    validarContratoDinamico(id, contrato);

    if (this.paneles.has(id)) {
      const anterior = this.paneles.get(id);
      if (anterior !== contrato && this.panelActivo === id) {
        anterior.cerrar?.();
        this.panelActivo = null;
      }
    }

    this.paneles.set(id, contrato);
    this.actualizarEstadoGlobal();
    return contrato;
  }

  desregistrarPanelDinamico(id, contrato = null) {
    const registrado = this.paneles.get(id);
    if (!registrado || (contrato && registrado !== contrato)) {
      return false;
    }

    if (this.panelActivo === id) {
      registrado.cerrar?.();
      this.panelActivo = null;
    }

    this.paneles.delete(id);
    this.actualizarEstadoGlobal();
    return true;
  }

  alternar(id) {
    if (this.panelActivo === id) {
      return this.cerrar(id);
    }
    return this.abrir(id);
  }

  abrir(id) {
    const panel = this.paneles.get(id);
    if (!panel) {
      return false;
    }

    if (this.panelActivo && this.panelActivo !== id) {
      this.cerrar(this.panelActivo, { devolverFoco: false });
    }

    if (panel.elemento) {
      panel.elemento.hidden = false;
      this.capa.classList.add("capa-paneles-partida--activa");
      this.capa.setAttribute("aria-hidden", "false");
    }

    panel.abrir?.();
    this.panelActivo = id;
    this.actualizarEstadoGlobal();
    panel.enfocar?.();
    return true;
  }

  cerrar(id, { devolverFoco = true } = {}) {
    if (this.panelActivo !== id) {
      return false;
    }

    const panel = this.paneles.get(id);
    panel?.alCerrar?.();
    panel?.cerrar?.();

    if (panel?.elemento) {
      panel.elemento.hidden = true;
      this.capa.classList.remove("capa-paneles-partida--activa");
      this.capa.setAttribute("aria-hidden", "true");
    }

    this.panelActivo = null;
    this.actualizarEstadoGlobal();

    if (devolverFoco) {
      this.botones.get(id)?.focus?.();
    }
    return true;
  }

  cerrarActual(opciones = {}) {
    return this.panelActivo ? this.cerrar(this.panelActivo, opciones) : false;
  }

  manejarEscape(evento) {
    if (evento.key !== "Escape" || !this.panelActivo) {
      return;
    }

    const panel = this.paneles.get(this.panelActivo);
    if (panel?.manejarEscape?.() === true) {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      return;
    }

    evento.preventDefault();
    evento.stopImmediatePropagation();
    this.cerrarActual();
  }

  actualizarEstadoGlobal() {
    const abierto = Boolean(this.panelActivo);
    document.body?.classList.toggle(CLASE_CAPTURA_ENTRADA_INTERFAZ, abierto);
    document.body?.classList.toggle(CLASE_PANEL_PARTIDA_ABIERTO, abierto);

    for (const [id, boton] of this.botones) {
      const activo = id === this.panelActivo;
      boton.classList.toggle("boton-panel-partida--activo", activo);
      boton.setAttribute("aria-pressed", String(activo));
    }
  }

  destruir() {
    this.cerrarActual({ devolverFoco: false });
    for (const { elemento, tipo, manejador, opciones } of this.manejadores) {
      elemento.removeEventListener(tipo, manejador, opciones);
    }
    this.manejadores = [];
    this.paneles.clear();
    this.botones.clear();
    document.body?.classList.remove(CLASE_CAPTURA_ENTRADA_INTERFAZ);
    document.body?.classList.remove(CLASE_PANEL_PARTIDA_ABIERTO);
  }

  escuchar(elemento, tipo, manejador, opciones = undefined) {
    elemento.addEventListener(tipo, manejador, opciones);
    this.manejadores.push({ elemento, tipo, manejador, opciones });
  }
}

function normalizarPanelEstatico(definicion) {
  const objeto = definicion instanceof HTMLElement
    ? { elemento: definicion }
    : definicion;

  if (!(objeto?.elemento instanceof HTMLElement)) {
    throw new Error("Cada panel estático necesita un elemento HTML.");
  }

  return {
    elemento: objeto.elemento,
    alCerrar: typeof objeto.alCerrar === "function" ? objeto.alCerrar : null,
    enfocar:
      typeof objeto.enfocar === "function"
        ? objeto.enfocar
        : () => objeto.elemento.querySelector("[data-panel-cerrar]")?.focus?.(),
  };
}

function validarContratoDinamico(id, contrato) {
  if (
    !contrato ||
    typeof contrato.abrir !== "function" ||
    typeof contrato.cerrar !== "function"
  ) {
    throw new Error(
      `El panel dinámico "${id}" necesita operaciones abrir y cerrar.`,
    );
  }
}
