import { crearPresentacionObjeto } from "./PresentadorObjeto.js";

import { VistaDetalleObjeto } from "./VistaDetalleObjeto.js";

const ID_HOJA_ESTILOS = "hojaEstilosModalDetalleObjeto";

const RUTA_HOJA_ESTILOS = "./modal-detalle-objeto.css";

// Administra una ventana modal reutilizable
// para inspeccionar objetos y ejecutar una acción
// contextual opcional.
//
// El modal no conoce inventarios ni equipamiento.
// Recibe una función desde el controlador y la ejecuta
// solamente cuando el jugador confirma la acción.
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

  // Abre el detalle sin consumir tiempo.
  //
  // accion puede ser null para objetos que solo
  // puedan inspeccionarse, como futuros materiales.
  abrir({ objeto, combatiente = null, accion = null } = {}) {
    const presentacion = crearPresentacionObjeto({
      objeto,
      combatiente,
    });

    this.vista.mostrar(presentacion);

    this.configurarAccion(accion);

    if (!this.dialogo.open) {
      this.dialogo.showModal();
    }

    // Priorizamos la acción contextual cuando existe.
    // De lo contrario, el foco queda en Cerrar.
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

    // Cerramos antes de ejecutar para que la interfaz
    // pueda redibujarse sin conservar un objeto obsoleto.
    this.cerrar();

    accion.ejecutar();
  }

  manejarCierreSolicitado(event) {
    event?.preventDefault();

    this.cerrar();
  }

  manejarClickDialogo(event) {
    // Un clic sobre el fondo oscuro, fuera de la ventana,
    // también cierra el modal.
    if (event.target === this.dialogo) {
      this.cerrar();
    }
  }

  manejarTeclaDialogo(event) {
    // Evita que WASD, flechas, F o Espacio lleguen
    // a los controles del juego mientras se inspecciona
    // un objeto.
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
//
// La creación dinámica permite agregar el modal
// sin acoplarlo al HTML principal ni repetir su estructura
// en futuras pantallas.
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
