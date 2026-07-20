import { agregarRepresentacionObjeto } from "./RepresentacionObjeto.js";

// Muestra el inventario y notifica
// cuando el usuario selecciona un objeto.
//
// El panel no decide qué acción se ejecuta.
// Solamente informa el índice seleccionado
// al controlador correspondiente.
export class PanelInventario {
  constructor({ cuadricula, mensajeVacio } = {}) {
    if (!cuadricula) {
      throw new Error("PanelInventario necesita una cuadrícula.");
    }

    if (!mensajeVacio) {
      throw new Error("PanelInventario necesita un mensaje vacío.");
    }

    this.cuadricula = cuadricula;

    this.mensajeVacio = mensajeVacio;

    this.alSeleccionarObjeto = null;

    this.manejarClick = this.manejarClick.bind(this);

    this.manejarTecla = this.manejarTecla.bind(this);

    this.cuadricula.addEventListener("click", this.manejarClick);

    this.cuadricula.addEventListener("keydown", this.manejarTecla);
  }

  configurarSeleccionador(callback) {
    if (callback !== null && typeof callback !== "function") {
      throw new Error("El seleccionador del inventario debe ser una función.");
    }

    this.alSeleccionarObjeto = callback;
  }

  actualizar(inventario) {
    if (!inventario || typeof inventario.obtenerEspacios !== "function") {
      throw new Error("PanelInventario necesita un inventario válido.");
    }

    const espacios = inventario.obtenerEspacios();

    this.cuadricula.replaceChildren();

    espacios.forEach((objeto, indice) => {
      this.cuadricula.appendChild(this.crearCasilla(objeto, indice));
    });

    this.mensajeVacio.classList.toggle("oculto", !inventario.estaVacio());
  }

  // Crea una casilla del inventario.
  //
  // Seleccionarla ahora abre el detalle del objeto.
  // La acción de equipar, consumir o cargar se confirma
  // posteriormente desde el modal.
  crearCasilla(objeto, indice) {
    const casilla = document.createElement("div");

    casilla.classList.add("slot-inventario");

    casilla.dataset.indiceInventario = `${indice}`;

    if (!objeto) {
      casilla.setAttribute("aria-label", "Espacio vacío");

      return casilla;
    }

    casilla.classList.add("ocupado", "interactuable");

    casilla.tabIndex = 0;

    casilla.setAttribute("role", "button");

    casilla.title = this.crearTituloObjeto(objeto);

    casilla.setAttribute("aria-label", `Ver detalles de ${objeto.nombre}`);

    agregarRepresentacionObjeto({
      contenedor: casilla,

      objeto,

      claseTexto: "nombre-objeto",
    });

    if (objeto.cantidad > 1) {
      const cantidad = document.createElement("span");

      cantidad.classList.add("cantidad-objeto");

      cantidad.textContent = `${objeto.cantidad}`;

      casilla.appendChild(cantidad);
    }

    if (objeto.esQuiver) {
      const contenido = document.createElement("span");

      contenido.classList.add("detalle-contenido-objeto");

      contenido.textContent = `${objeto.cantidadMunicion}`;

      casilla.appendChild(contenido);
    }

    return casilla;
  }

  crearTituloObjeto(objeto) {
    const lineas = [];

    if (
      typeof objeto.descripcion === "string" &&
      objeto.descripcion.trim() !== ""
    ) {
      lineas.push(objeto.descripcion);
    }

    if (objeto.esQuiver) {
      lineas.push(`Contenido: ${objeto.cantidadMunicion} flechas.`);
    }

    lineas.push("Clic para ver detalles.");

    return lineas.join("\n");
  }

  manejarClick(event) {
    const casilla = event.target.closest(".slot-inventario.interactuable");

    this.procesarSeleccion(casilla);
  }

  manejarTecla(event) {
    if (event.code !== "Enter" && event.code !== "Space") {
      return;
    }

    const casilla = event.target.closest(".slot-inventario.interactuable");

    if (!casilla) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.procesarSeleccion(casilla);
  }

  procesarSeleccion(casilla) {
    if (!casilla || !this.alSeleccionarObjeto) {
      return;
    }

    const indice = Number.parseInt(
      casilla.dataset.indiceInventario,

      10,
    );

    if (!Number.isInteger(indice)) {
      return;
    }

    this.alSeleccionarObjeto(indice);
  }

  destruir() {
    this.cuadricula.removeEventListener("click", this.manejarClick);

    this.cuadricula.removeEventListener("keydown", this.manejarTecla);
  }
}
