import { agregarRepresentacionObjeto } from "./RepresentacionObjeto.js";

// Muestra el inventario y notifica
// cuando el usuario selecciona un objeto.
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
  // Cuando contiene un objeto, utiliza una imagen
  // si existe y conserva el nombre como respaldo.
  crearCasilla(objeto, indice) {
    const casilla = document.createElement("div");

    casilla.classList.add("slot-inventario");

    casilla.dataset.indiceInventario = `${indice}`;

    // Las posiciones vacías no necesitan
    // representación visual ni interacción.
    if (!objeto) {
      casilla.setAttribute("aria-label", "Espacio vacío");

      return casilla;
    }

    casilla.classList.add("ocupado", "interactuable");

    casilla.tabIndex = 0;
    casilla.setAttribute("role", "button");

    casilla.title = this.crearTituloObjeto(objeto);

    casilla.setAttribute("aria-label", this.crearEtiquetaAccion(objeto));

    // Agrega el icono del objeto.
    //
    // Si el objeto no tiene imagen o la carga
    // falla, se muestra automáticamente su nombre.
    agregarRepresentacionObjeto({
      contenedor: casilla,
      objeto,
      claseTexto: "nombre-objeto",
    });

    // Los objetos apilables muestran
    // la cantidad en una esquina.
    if (objeto.cantidad > 1) {
      const cantidad = document.createElement("span");

      cantidad.classList.add("cantidad-objeto");

      cantidad.textContent = `${objeto.cantidad}`;

      casilla.appendChild(cantidad);
    }

    // Los carcajes muestran la cantidad
    // de munición que contienen.
    if (objeto.esQuiver) {
      const contenido = document.createElement("span");

      contenido.classList.add("detalle-contenido-objeto");

      contenido.textContent = `${objeto.cantidadMunicion}`;

      casilla.appendChild(contenido);
    }

    return casilla;
  }

  crearEtiquetaAccion(objeto) {
    if (objeto.esMunicion) {
      return `Cargar ${objeto.nombre}`;
    }

    if (objeto.esConsumible) {
      return `Consumir ${objeto.nombre}`;
    }

    if (objeto.esEquipable) {
      return `Equipar ${objeto.nombre}`;
    }

    return `Usar ${objeto.nombre}`;
  }

  crearTituloObjeto(objeto) {
    let accion;

    if (objeto.esMunicion) {
      accion = "Clic para cargar en el carcaj.";
    } else if (objeto.esConsumible) {
      accion =
        "Clic para consumir.\n" + `Costo de consumo: ${objeto.costoConsumo}.`;
    } else if (objeto.esEquipable) {
      accion = "Clic para equipar.";
    } else {
      accion = "No se puede utilizar todavía.";
    }

    if (objeto.esQuiver) {
      return (
        `${objeto.descripcion}\n` +
        `Contenido: ${objeto.cantidadMunicion} flechas.\n` +
        accion
      );
    }

    return `${objeto.descripcion}\n` + accion;
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
