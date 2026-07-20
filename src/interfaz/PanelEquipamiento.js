import { agregarRepresentacionObjeto } from "./RepresentacionObjeto.js";

const ETIQUETAS_RANURAS = {
  cabeza: "Cabeza",
  torso: "Torso",
  manos: "Manos",
  piernas: "Piernas",
  pies: "Pies",
  arma: "Arma",
  secundaria: "Secundaria",
  collar: "Collar",
  anillo_derecho: "Anillo der.",
  anillo_izquierdo: "Anillo izq.",
};

// Representa las ranuras y notifica cuando
// el usuario selecciona una posición ocupada.
export class PanelEquipamiento {
  constructor({ cuadricula } = {}) {
    if (!cuadricula) {
      throw new Error("PanelEquipamiento necesita una cuadrícula.");
    }

    this.cuadricula = cuadricula;
    this.alSeleccionarRanura = null;

    this.manejarClick = this.manejarClick.bind(this);

    this.manejarTecla = this.manejarTecla.bind(this);

    this.cuadricula.addEventListener("click", this.manejarClick);

    this.cuadricula.addEventListener("keydown", this.manejarTecla);
  }

  configurarSeleccionador(callback) {
    if (callback !== null && typeof callback !== "function") {
      throw new Error("El seleccionador de equipamiento debe ser una función.");
    }

    this.alSeleccionarRanura = callback;
  }

  actualizar(equipamiento) {
    if (
      !equipamiento ||
      typeof equipamiento.obtenerEstadoRanuras !== "function"
    ) {
      throw new Error("PanelEquipamiento necesita un equipamiento válido.");
    }

    const estados = equipamiento.obtenerEstadoRanuras();

    this.cuadricula.replaceChildren();

    for (const [nombreRanura, estado] of Object.entries(estados)) {
      this.cuadricula.appendChild(this.crearRanura(nombreRanura, estado));
    }
  }

  crearRanura(nombreRanura, { objeto, reservadaPor }) {
    const contenedor = document.createElement("div");

    contenedor.classList.add("slot-equipamiento");

    contenedor.dataset.ranura = nombreRanura;

    const casilla = document.createElement("div");

    casilla.classList.add("casilla-equipamiento");

    const etiqueta = document.createElement("span");

    etiqueta.classList.add("nombre-ranura");

    etiqueta.textContent = ETIQUETAS_RANURAS[nombreRanura] ?? nombreRanura;

    if (objeto) {
      this.mostrarObjeto(casilla, objeto);
    } else if (reservadaPor) {
      this.mostrarReserva(casilla, reservadaPor);
    } else {
      casilla.setAttribute("aria-label", "Ranura vacía");
    }

    if (objeto || reservadaPor) {
      contenedor.classList.add("interactuable");

      contenedor.tabIndex = 0;
      contenedor.setAttribute("role", "button");
    }

    contenedor.append(casilla, etiqueta);

    return contenedor;
  }

  // Muestra dentro de una ranura
  // el objeto actualmente equipado.
  mostrarObjeto(casilla, objeto) {
    casilla.classList.add("ocupada");

    // Los quivers agregan al tooltip
    // la cantidad de flechas almacenadas.
    const detalleQuiver = objeto.esQuiver
      ? `\nContenido: ${objeto.cantidadMunicion} flechas.`
      : "";

    casilla.title =
      `${objeto.descripcion}${detalleQuiver}` + "\nClic para desequipar.";

    casilla.setAttribute("aria-label", `Desequipar ${objeto.nombre}`);

    // Muestra la imagen configurada.
    //
    // Cuando no existe una imagen o falla
    // la carga, muestra el nombre como respaldo.
    agregarRepresentacionObjeto({
      contenedor: casilla,
      objeto,
      claseTexto: "nombre-objeto-equipado",
    });

    // Los quivers muestran también
    // la cantidad actual de munición.
    if (objeto.esQuiver) {
      const contenido = document.createElement("span");

      contenido.classList.add("contenido-objeto-equipado");

      contenido.textContent = `${objeto.cantidadMunicion}`;

      casilla.appendChild(contenido);
    }
  }

  // Representa una ranura reservada
  // por un arma que ocupa ambas manos.
  mostrarReserva(casilla, objetoQueReserva) {
    casilla.classList.add("ocupada", "reservada");

    casilla.title =
      `Ranura ocupada por ${objetoQueReserva.nombre}.\n` +
      "Clic para desequipar el arma.";

    casilla.setAttribute("aria-label", `Desequipar ${objetoQueReserva.nombre}`);

    // Repetimos visualmente el arma
    // que está ocupando ambas manos.
    agregarRepresentacionObjeto({
      contenedor: casilla,
      objeto: objetoQueReserva,
      claseTexto: "nombre-objeto-equipado",
    });

    // El indicador aclara que la ranura
    // está reservada por un arma de dos manos.
    const indicador = document.createElement("span");

    indicador.classList.add("indicador-reserva-equipamiento");

    indicador.textContent = "2M";

    casilla.appendChild(indicador);
  }

  manejarClick(event) {
    const ranura = event.target.closest(".slot-equipamiento.interactuable");

    this.procesarSeleccion(ranura);
  }

  manejarTecla(event) {
    if (event.code !== "Enter" && event.code !== "Space") {
      return;
    }

    const ranura = event.target.closest(".slot-equipamiento.interactuable");

    if (!ranura) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.procesarSeleccion(ranura);
  }

  procesarSeleccion(elemento) {
    if (!elemento || !this.alSeleccionarRanura) {
      return;
    }

    const nombreRanura = elemento.dataset.ranura;

    if (!nombreRanura) {
      return;
    }

    this.alSeleccionarRanura(nombreRanura);
  }

  destruir() {
    this.cuadricula.removeEventListener("click", this.manejarClick);

    this.cuadricula.removeEventListener("keydown", this.manejarTecla);
  }
}
