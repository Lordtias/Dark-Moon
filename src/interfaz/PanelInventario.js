// Muestra el inventario y notifica cuando
// el usuario selecciona un objeto.
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
      const casilla = this.crearCasilla(objeto, indice);

      this.cuadricula.appendChild(casilla);
    });

    this.mensajeVacio.classList.toggle("oculto", !inventario.estaVacio());
  }

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

    casilla.title = `${objeto.descripcion}\nClic para equipar.`;

    casilla.setAttribute("aria-label", `Equipar ${objeto.nombre}`);

    const nombre = document.createElement("span");

    nombre.classList.add("nombre-objeto");

    nombre.textContent = objeto.nombre;

    casilla.appendChild(nombre);

    if (objeto.cantidad > 1) {
      const cantidad = document.createElement("span");

      cantidad.classList.add("cantidad-objeto");

      cantidad.textContent = objeto.cantidad;

      casilla.appendChild(cantidad);
    }

    return casilla;
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

    const indice = Number.parseInt(casilla.dataset.indiceInventario, 10);

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
