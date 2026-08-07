import { agregarRepresentacionObjeto } from "./RepresentacionObjeto.js";
import { traducir, traducirContenido } from "./idiomas/ContextoIdioma.js";

const CLAVES_RANURAS = Object.freeze({
  cabeza: ["cabeza", "Cabeza"],
  torso: ["torso", "Torso"],
  manos: ["manos", "Manos"],
  piernas: ["piernas", "Piernas"],
  pies: ["pies", "Pies"],
  arma: ["arma", "Arma"],
  secundaria: ["secundaria", "Secundaria"],
  collar: ["collar", "Collar"],
  anillo_derecho: ["anilloDerecho", "Anillo der."],
  anillo_izquierdo: ["anilloIzquierdo", "Anillo izq."],
});

function traducirRanura(nombreRanura) {
  const [clave, respaldo] = CLAVES_RANURAS[nombreRanura] ?? [null, nombreRanura];
  return clave
    ? traducir(`interfaz.equipamiento.${clave}`, { respaldo })
    : respaldo;
}

// Representa las ranuras de equipamiento y notifica
// cuando el usuario selecciona una posición ocupada.
//
// Seleccionar una ranura ya no desequipa inmediatamente:
// primero abre el detalle del objeto.
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

    etiqueta.textContent = traducirRanura(nombreRanura);

    if (objeto) {
      this.mostrarObjeto(casilla, objeto);
    } else if (reservadaPor) {
      this.mostrarReserva(casilla, reservadaPor);
    } else {
      casilla.setAttribute("aria-label", traducir("interfaz.equipamiento.ranuraVacia", { respaldo: "Ranura vacía" }));
    }

    if (objeto || reservadaPor) {
      contenedor.classList.add("interactuable");

      contenedor.tabIndex = 0;

      contenedor.setAttribute("role", "button");
    }

    contenedor.append(casilla, etiqueta);

    return contenedor;
  }

  mostrarObjeto(casilla, objeto) {
    casilla.classList.add("ocupada");

    const detalleQuiver = objeto.esQuiver
      ? `\n${traducir("interfaz.equipamiento.contenidoFlechas", { parametros: { cantidad: objeto.cantidadMunicion }, respaldo: `Contenido: ${objeto.cantidadMunicion} flechas.` })}`
      : "";

    const nombreObjeto = traducirContenido("objetos", objeto.id, "nombre", objeto.nombre);
    const descripcionObjeto = traducirContenido("objetos", objeto.id, "descripcion", objeto.descripcion);
    casilla.title =
      `${descripcionObjeto}${detalleQuiver}` + `\n${traducir("interfaz.equipamiento.clicDetalles", { respaldo: "Clic para ver detalles." })}`;

    casilla.setAttribute("aria-label", traducir("interfaz.equipamiento.verDetalles", {
      parametros: { nombre: nombreObjeto },
      respaldo: `Ver detalles de ${nombreObjeto}`,
    }));

    agregarRepresentacionObjeto({
      contenedor: casilla,

      objeto,

      claseTexto: "nombre-objeto-equipado",
    });

    if (objeto.esQuiver) {
      const contenido = document.createElement("span");

      contenido.classList.add("contenido-objeto-equipado");

      contenido.textContent = `${objeto.cantidadMunicion}`;

      casilla.appendChild(contenido);
    }
  }

  // Representa la ranura secundaria reservada
  // por un arma que utiliza dos manos.
  mostrarReserva(casilla, objetoQueReserva) {
    casilla.classList.add("ocupada", "reservada");

    const nombreObjeto = traducirContenido("objetos", objetoQueReserva.id, "nombre", objetoQueReserva.nombre);
    casilla.title =
      `${traducir("interfaz.equipamiento.reservada", { parametros: { nombre: nombreObjeto }, respaldo: `Ranura ocupada por ${nombreObjeto}.` })}\n` +
      traducir("interfaz.equipamiento.clicDetalles", { respaldo: "Clic para ver detalles." });

    casilla.setAttribute(
      "aria-label",
      traducir("interfaz.equipamiento.verDetalles", {
        parametros: { nombre: traducirContenido("objetos", objetoQueReserva.id, "nombre", objetoQueReserva.nombre) },
        respaldo: `Ver detalles de ${objetoQueReserva.nombre}`,
      }),
    );

    agregarRepresentacionObjeto({
      contenedor: casilla,

      objeto: objetoQueReserva,

      claseTexto: "nombre-objeto-equipado",
    });

    const indicador = document.createElement("span");

    indicador.classList.add("indicador-reserva-equipamiento");

    indicador.textContent = traducir("interfaz.equipamiento.dosManos", { respaldo: "2M" });

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
