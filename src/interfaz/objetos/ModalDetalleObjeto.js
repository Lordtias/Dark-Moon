import { crearPresentacionObjeto } from "./PresentadorObjeto.js";

import { VistaDetalleObjeto } from "./VistaDetalleObjeto.js";

import { crearComparacionObjetos } from "./ComparadorObjetos.js";

const ID_HOJA_ESTILOS = "hojaEstilosModalDetalleObjeto";

const RUTA_HOJA_ESTILOS = "./modal-detalle-objeto.css";

// Administra una ventana modal reutilizable para inspeccionar objetos,
// mostrar diferencias compactas y ejecutar una acción opcional.
//
// El modal no modifica inventarios ni equipamiento directamente.
// Solamente ejecuta la función recibida cuando el jugador confirma.
export class ModalDetalleObjeto {
  constructor() {
    asegurarHojaEstilos();

    this.vista = new VistaDetalleObjeto();

    this.accionActual = null;

    this.manejarCierreSolicitado = this.manejarCierreSolicitado.bind(this);

    this.manejarClickDialogo = this.manejarClickDialogo.bind(this);

    this.manejarTeclaDialogo = this.manejarTeclaDialogo.bind(this);

    this.ejecutarAccionPrincipal = this.ejecutarAccionPrincipal.bind(this);

    this.construirDialogo();
    this.registrarEventos();
  }

  construirDialogo() {
    this.dialogo = document.createElement("dialog");

    this.dialogo.classList.add("modal-detalle-objeto");

    this.dialogo.setAttribute("aria-labelledby", this.vista.idTitulo);

    const contenido = document.createElement("div");

    contenido.classList.add("modal-detalle-objeto__contenido");

    this.botonCerrarSuperior = document.createElement("button");

    this.botonCerrarSuperior.type = "button";

    this.botonCerrarSuperior.classList.add(
      "modal-detalle-objeto__cerrar-superior",
    );

    this.botonCerrarSuperior.textContent = "×";

    this.botonCerrarSuperior.title = "Cerrar";

    this.botonCerrarSuperior.setAttribute(
      "aria-label",
      "Cerrar detalle del objeto",
    );

    const acciones = document.createElement("footer");

    acciones.classList.add("modal-detalle-objeto__acciones");

    this.botonCerrar = document.createElement("button");

    this.botonCerrar.type = "button";

    this.botonCerrar.classList.add(
      "modal-detalle-objeto__boton",
      "modal-detalle-objeto__boton--secundario",
    );

    this.botonCerrar.textContent = "Cerrar";

    this.botonAccion = document.createElement("button");

    this.botonAccion.type = "button";

    this.botonAccion.classList.add(
      "modal-detalle-objeto__boton",
      "modal-detalle-objeto__boton--principal",
    );

    acciones.append(this.botonCerrar, this.botonAccion);

    contenido.append(this.botonCerrarSuperior, this.vista.elemento, acciones);

    this.dialogo.appendChild(contenido);

    document.body.appendChild(this.dialogo);
  }

  registrarEventos() {
    this.dialogo.addEventListener("cancel", this.manejarCierreSolicitado);

    this.dialogo.addEventListener("click", this.manejarClickDialogo);

    this.dialogo.addEventListener("keydown", this.manejarTeclaDialogo);

    this.botonCerrarSuperior.addEventListener(
      "click",
      this.manejarCierreSolicitado,
    );

    this.botonCerrar.addEventListener("click", this.manejarCierreSolicitado);

    this.botonAccion.addEventListener("click", this.ejecutarAccionPrincipal);
  }

  // objetosDesplazados contiene las referencias que dejan
  // de aportar estadísticas al confirmar Equipar.
  //
  // Puede incluir:
  //
  // - Solo el arma principal.
  // - El arma principal y el escudo.
  // - Una pieza de armadura de la misma ranura.
  abrir({
    objeto,
    combatiente = null,
    objetosDesplazados = [],
    accion = null,
  } = {}) {
    if (!Array.isArray(objetosDesplazados)) {
      throw new Error("Los objetos desplazados deben ser una lista.");
    }

    const presentacion = crearPresentacionObjeto({
      objeto,
      combatiente,
    });

    // Eliminamos valores nulos, referencias repetidas
    // y la propia instancia inspeccionada.
    const objetosUnicos = [];

    for (const objetoDesplazado of objetosDesplazados) {
      if (
        !objetoDesplazado ||
        objetoDesplazado === objeto ||
        objetosUnicos.includes(objetoDesplazado)
      ) {
        continue;
      }

      objetosUnicos.push(objetoDesplazado);
    }

    let comparacion = null;

    if (objetosUnicos.length > 0) {
      const presentacionesDesplazadas = objetosUnicos.map((objetoDesplazado) =>
        crearPresentacionObjeto({
          objeto: objetoDesplazado,

          combatiente,
        }),
      );

      comparacion = crearComparacionObjetos({
        presentacionCandidata: presentacion,

        presentacionesDesplazadas,
      });
    }

    this.vista.mostrar(presentacion, comparacion);

    this.configurarAccion(accion);

    if (!this.dialogo.open) {
      this.dialogo.showModal();
    }

    if (this.accionActual) {
      this.botonAccion.focus();
    } else {
      this.botonCerrar.focus();
    }
  }

  configurarAccion(accion) {
    if (accion === null) {
      this.accionActual = null;

      this.botonAccion.hidden = true;

      this.botonAccion.textContent = "";

      return;
    }

    if (
      typeof accion !== "object" ||
      typeof accion.texto !== "string" ||
      accion.texto.trim() === "" ||
      typeof accion.ejecutar !== "function"
    ) {
      throw new Error("La acción del modal de objeto no es válida.");
    }

    this.accionActual = {
      texto: accion.texto.trim(),

      ejecutar: accion.ejecutar,
    };

    this.botonAccion.hidden = false;

    this.botonAccion.textContent = this.accionActual.texto;
  }

  ejecutarAccionPrincipal() {
    const accion = this.accionActual;

    if (!accion) {
      return;
    }

    // Cerramos antes de ejecutar para no conservar en pantalla
    // un objeto que puede moverse o desaparecer del inventario.
    this.cerrar();
    accion.ejecutar();
  }

  manejarCierreSolicitado(event) {
    event?.preventDefault();

    this.cerrar();
  }

  manejarClickDialogo(event) {
    if (event.target === this.dialogo) {
      this.cerrar();
    }
  }

  manejarTeclaDialogo(event) {
    // Impide que las teclas del modal alcancen
    // los controles generales de la partida.
    event.stopPropagation();
  }

  cerrar() {
    if (this.dialogo.open) {
      this.dialogo.close();
    }

    this.accionActual = null;
  }

  destruir() {
    this.cerrar();

    this.dialogo.removeEventListener("cancel", this.manejarCierreSolicitado);

    this.dialogo.removeEventListener("click", this.manejarClickDialogo);

    this.dialogo.removeEventListener("keydown", this.manejarTeclaDialogo);

    this.botonCerrarSuperior.removeEventListener(
      "click",
      this.manejarCierreSolicitado,
    );

    this.botonCerrar.removeEventListener("click", this.manejarCierreSolicitado);

    this.botonAccion.removeEventListener("click", this.ejecutarAccionPrincipal);

    this.dialogo.remove();
  }
}

// Carga la hoja específica una sola vez.
function asegurarHojaEstilos() {
  if (document.getElementById(ID_HOJA_ESTILOS)) {
    return;
  }

  const enlace = document.createElement("link");

  enlace.id = ID_HOJA_ESTILOS;

  enlace.rel = "stylesheet";

  enlace.href = RUTA_HOJA_ESTILOS;

  document.head.appendChild(enlace);
}
