import { crearPresentacionObjeto } from "./PresentadorObjeto.js";

import { VistaDetalleObjeto } from "./VistaDetalleObjeto.js";

import { crearComparacionObjetos } from "./ComparadorObjetos.js";

const ID_HOJA_ESTILOS = "hojaEstilosModalDetalleObjeto";

const RUTA_HOJA_ESTILOS = "./modal-detalle-objeto.css";

// Administra una ventana modal reutilizable para inspeccionar objetos,
// compararlos con el equipamiento actual y ejecutar una acción opcional.
//
// El modal no modifica inventarios ni equipamiento directamente.
// Solamente muestra la información y ejecuta la función que recibe
// cuando el jugador confirma la acción principal.
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

  // mostrarComparacion permite distinguir entre:
  //
  // - Un objeto que no necesita comparación.
  // - Un objeto equipable cuya ranura correspondiente está vacía.
  //
  // En el segundo caso se muestra igualmente la sección,
  // indicando que todavía no existe un objeto equipado.
  abrir({
    objeto,
    combatiente = null,
    objetoEquipado = null,
    mostrarComparacion = false,
    accion = null,
  } = {}) {
    if (typeof mostrarComparacion !== "boolean") {
      throw new Error("La indicación de comparación debe ser booleana.");
    }

    const presentacion = crearPresentacionObjeto({
      objeto,
      combatiente,
    });

    let comparacion = null;

    if (mostrarComparacion) {
      const presentacionEquipada = objetoEquipado
        ? crearPresentacionObjeto({
            objeto: objetoEquipado,

            combatiente,
          })
        : null;

      comparacion = crearComparacionObjetos({
        presentacionCandidata: presentacion,

        presentacionEquipada,

        mismoObjeto: objetoEquipado === objeto,
      });
    }

    this.vista.mostrar(presentacion, comparacion);

    this.configurarAccion(accion);

    if (!this.dialogo.open) {
      this.dialogo.showModal();
    }

    // Priorizamos el botón de acción cuando existe.
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

    // Cerramos antes de ejecutar para evitar conservar en pantalla
    // una referencia que puede moverse o desaparecer del inventario.
    this.cerrar();

    accion.ejecutar();
  }

  manejarCierreSolicitado(event) {
    event?.preventDefault();

    this.cerrar();
  }

  manejarClickDialogo(event) {
    // Un clic sobre el fondo oscuro,
    // fuera del contenido, también cierra el modal.
    if (event.target === this.dialogo) {
      this.cerrar();
    }
  }

  manejarTeclaDialogo(event) {
    // Evita que WASD, flechas, F o Espacio
    // alcancen los controles del juego.
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
// sin acoplarlo al HTML principal.
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
