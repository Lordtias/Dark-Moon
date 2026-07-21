import { crearPresentacionObjeto } from "./PresentadorObjeto.js";

import { VistaDetalleObjeto } from "./VistaDetalleObjeto.js";

import { VistaComparacionObjetos } from "./VistaComparacionObjetos.js";

import { crearComparacionObjetos } from "./ComparadorObjetos.js";

const ID_HOJA_ESTILOS = "hojaEstilosModalDetalleObjeto";

const RUTA_HOJA_ESTILOS = "./modal-detalle-objeto.css";

const ESTADOS_MODAL = Object.freeze({
  DETALLE: "detalle",

  SELECTOR: "selector",

  COMPARACION: "comparacion",
});

// Administra tres estados dentro del mismo modal:
//
// - Detalle normal del objeto.
// - Selector manual de equipamiento.
// - Tabla de comparación.
//
// Comparar no consume tiempo ni modifica el equipamiento.
export class ModalDetalleObjeto {
  constructor() {
    asegurarHojaEstilos();

    this.vistaDetalle = new VistaDetalleObjeto();

    this.vistaComparacion = new VistaComparacionObjetos();

    this.estadoActual = ESTADOS_MODAL.DETALLE;

    this.objetoActual = null;

    this.combatienteActual = null;

    this.presentacionActual = null;

    this.opcionesComparacion = [];

    this.accionActual = null;

    this.manejarCierreSolicitado = this.manejarCierreSolicitado.bind(this);

    this.manejarClickDialogo = this.manejarClickDialogo.bind(this);

    this.manejarTeclaDialogo = this.manejarTeclaDialogo.bind(this);

    this.ejecutarAccionPrincipal = this.ejecutarAccionPrincipal.bind(this);

    this.mostrarSelectorComparacion =
      this.mostrarSelectorComparacion.bind(this);

    this.mostrarComparacionSeleccionada =
      this.mostrarComparacionSeleccionada.bind(this);

    this.volverAlDetalle = this.volverAlDetalle.bind(this);

    this.elegirOtroObjeto = this.elegirOtroObjeto.bind(this);

    this.construirDialogo();
    this.registrarEventos();

    this.vistaComparacion.configurarSeleccionador(
      this.mostrarComparacionSeleccionada,
    );
  }

  construirDialogo() {
    this.dialogo = document.createElement("dialog");

    this.dialogo.classList.add("modal-detalle-objeto");

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

    const vistas = document.createElement("div");

    vistas.classList.add("modal-detalle-objeto__vistas");

    this.vistaComparacion.elemento.hidden = true;

    vistas.append(
      this.vistaDetalle.elemento,

      this.vistaComparacion.elemento,
    );

    const acciones = document.createElement("footer");

    acciones.classList.add("modal-detalle-objeto__acciones");

    this.botonCerrar = crearBoton("Cerrar", "secundario");

    this.botonVolver = crearBoton("Volver al objeto", "secundario");

    this.botonComparar = crearBoton("Comparar", "comparar");

    this.botonElegirOtro = crearBoton("Elegir otro", "secundario");

    this.botonAccion = crearBoton("", "principal");

    acciones.append(
      this.botonCerrar,
      this.botonVolver,
      this.botonComparar,
      this.botonElegirOtro,
      this.botonAccion,
    );

    contenido.append(this.botonCerrarSuperior, vistas, acciones);

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

    this.botonVolver.addEventListener("click", this.volverAlDetalle);

    this.botonComparar.addEventListener(
      "click",
      this.mostrarSelectorComparacion,
    );

    this.botonElegirOtro.addEventListener("click", this.elegirOtroObjeto);

    this.botonAccion.addEventListener("click", this.ejecutarAccionPrincipal);
  }

  // objetosEquipados contiene todas las piezas actuales.
  // La propia instancia inspeccionada y los duplicados se eliminan.
  abrir({
    objeto,
    combatiente = null,
    objetosEquipados = [],
    accion = null,
  } = {}) {
    if (!Array.isArray(objetosEquipados)) {
      throw new Error("Los objetos equipados deben recibirse en una lista.");
    }

    this.objetoActual = objeto;

    this.combatienteActual = combatiente;

    this.presentacionActual = crearPresentacionObjeto({
      objeto,
      combatiente,
    });

    this.opcionesComparacion = this.crearOpcionesComparacion(objetosEquipados);

    this.configurarAccion(accion);

    this.mostrarDetalle();

    if (!this.dialogo.open) {
      this.dialogo.showModal();
    }

    if (this.accionActual) {
      this.botonAccion.focus();
    } else if (!this.botonComparar.hidden) {
      this.botonComparar.focus();
    } else {
      this.botonCerrar.focus();
    }
  }

  crearOpcionesComparacion(objetosEquipados) {
    const objetosProcesados = new Set();

    const opciones = [];

    for (const entrada of objetosEquipados) {
      if (!entrada || typeof entrada !== "object" || !entrada.objeto) {
        continue;
      }

      const objetoEquipado = entrada.objeto;

      if (
        objetoEquipado === this.objetoActual ||
        objetosProcesados.has(objetoEquipado)
      ) {
        continue;
      }

      objetosProcesados.add(objetoEquipado);

      opciones.push({
        objeto: objetoEquipado,

        nombreRanura:
          typeof entrada.nombreRanura === "string" ? entrada.nombreRanura : "",

        etiquetaRanura:
          typeof entrada.etiquetaRanura === "string" &&
          entrada.etiquetaRanura.trim() !== ""
            ? entrada.etiquetaRanura.trim()
            : "Equipado",

        presentacion: crearPresentacionObjeto({
          objeto: objetoEquipado,

          combatiente: this.combatienteActual,
        }),
      });
    }

    return opciones;
  }

  mostrarDetalle() {
    this.estadoActual = ESTADOS_MODAL.DETALLE;

    this.vistaDetalle.mostrar(this.presentacionActual);

    this.vistaDetalle.elemento.hidden = false;

    this.vistaComparacion.elemento.hidden = true;

    this.dialogo.setAttribute("aria-labelledby", this.vistaDetalle.idTitulo);

    this.actualizarControles();
  }

  mostrarSelectorComparacion() {
    if (this.opcionesComparacion.length === 0) {
      return;
    }

    this.estadoActual = ESTADOS_MODAL.SELECTOR;

    this.vistaComparacion.mostrarSelector({
      presentacionBase: this.presentacionActual,

      opciones: this.opcionesComparacion,
    });

    this.vistaDetalle.elemento.hidden = true;

    this.vistaComparacion.elemento.hidden = false;

    this.dialogo.setAttribute(
      "aria-labelledby",
      this.vistaComparacion.idTitulo,
    );

    this.actualizarControles();
    this.enfocarPrimeraOpcion();
  }

  mostrarComparacionSeleccionada(indice) {
    const opcion = this.opcionesComparacion[indice];

    if (!opcion) {
      return;
    }

    const comparacion = crearComparacionObjetos({
      presentacionInspeccionada: this.presentacionActual,

      presentacionElegida: opcion.presentacion,
    });

    this.estadoActual = ESTADOS_MODAL.COMPARACION;

    this.vistaComparacion.mostrarComparacion(comparacion);

    this.actualizarControles();
    this.botonElegirOtro.focus();
  }

  volverAlDetalle() {
    this.mostrarDetalle();
  }

  elegirOtroObjeto() {
    this.mostrarSelectorComparacion();
  }

  actualizarControles() {
    const enDetalle = this.estadoActual === ESTADOS_MODAL.DETALLE;

    const enSelector = this.estadoActual === ESTADOS_MODAL.SELECTOR;

    const enComparacion = this.estadoActual === ESTADOS_MODAL.COMPARACION;

    this.botonVolver.hidden = enDetalle;

    this.botonComparar.hidden =
      !enDetalle ||
      this.opcionesComparacion.length === 0 ||
      this.objetoActual?.esEquipable !== true;

    this.botonElegirOtro.hidden = !enComparacion;

    this.botonAccion.hidden = this.accionActual === null;

    this.dialogo.classList.toggle("modal-detalle-objeto--selector", enSelector);

    this.dialogo.classList.toggle(
      "modal-detalle-objeto--comparacion",
      enComparacion,
    );
  }

  enfocarPrimeraOpcion() {
    this.vistaComparacion.elemento
      .querySelector("[data-indice-comparacion]")
      ?.focus();
  }

  configurarAccion(accion) {
    if (accion === null) {
      this.accionActual = null;

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

    this.botonAccion.textContent = this.accionActual.texto;
  }

  ejecutarAccionPrincipal() {
    const accion = this.accionActual;

    if (!accion) {
      return;
    }

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
    // Evita que las teclas utilizadas dentro
    // del modal lleguen a los controles del juego.
    event.stopPropagation();
  }

  cerrar() {
    if (this.dialogo.open) {
      this.dialogo.close();
    }

    this.estadoActual = ESTADOS_MODAL.DETALLE;

    this.objetoActual = null;

    this.combatienteActual = null;

    this.presentacionActual = null;

    this.opcionesComparacion = [];

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

    this.botonVolver.removeEventListener("click", this.volverAlDetalle);

    this.botonComparar.removeEventListener(
      "click",
      this.mostrarSelectorComparacion,
    );

    this.botonElegirOtro.removeEventListener("click", this.elegirOtroObjeto);

    this.botonAccion.removeEventListener("click", this.ejecutarAccionPrincipal);

    this.vistaComparacion.destruir();

    this.dialogo.remove();
  }
}

function crearBoton(texto, modificador) {
  const boton = document.createElement("button");

  boton.type = "button";

  boton.classList.add(
    "modal-detalle-objeto__boton",
    `modal-detalle-objeto__boton--${modificador}`,
  );

  boton.textContent = texto;

  return boton;
}

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
