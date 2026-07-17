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
  municion: "Munición",
};

// Representa visualmente las ranuras reales
// y las reservas de armas de dos manos.
export class PanelEquipamiento {
  constructor({ cuadricula } = {}) {
    if (!cuadricula) {
      throw new Error("PanelEquipamiento necesita una cuadrícula.");
    }

    this.cuadricula = cuadricula;
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
      const elemento = this.crearRanura(nombreRanura, estado);

      this.cuadricula.appendChild(elemento);
    }
  }

  crearRanura(nombreRanura, { objeto, reservadaPor }) {
    const contenedor = document.createElement("div");

    contenedor.classList.add("slot-equipamiento");

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

    contenedor.append(casilla, etiqueta);

    return contenedor;
  }

  mostrarObjeto(casilla, objeto) {
    casilla.classList.add("ocupada");

    casilla.title = objeto.descripcion;

    casilla.setAttribute("aria-label", objeto.nombre);

    const nombreObjeto = document.createElement("span");

    nombreObjeto.classList.add("nombre-objeto-equipado");

    nombreObjeto.textContent = objeto.nombre;

    casilla.appendChild(nombreObjeto);
  }

  mostrarReserva(casilla, objetoQueReserva) {
    casilla.classList.add("ocupada", "reservada");

    casilla.title = `Ranura ocupada por ${objetoQueReserva.nombre}.`;

    casilla.setAttribute(
      "aria-label",
      `Reservada por ${objetoQueReserva.nombre}`,
    );

    const texto = document.createElement("span");

    texto.classList.add("nombre-objeto-equipado");

    texto.textContent = `2 manos: ${objetoQueReserva.nombre}`;

    casilla.appendChild(texto);
  }
}
