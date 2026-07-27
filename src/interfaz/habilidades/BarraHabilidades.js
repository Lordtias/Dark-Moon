// Representa exclusivamente accesos rápidos. El contenido de cada habilidad,
// sus grados y su validez se consultan siempre al sistema y al progreso real.
export class BarraHabilidades {
  constructor({ sistemaHabilidades }) {
    if (!sistemaHabilidades) {
      throw new Error("BarraHabilidades necesita el sistema de habilidades.");
    }
    this.sistema = sistemaHabilidades;
    this.contenedor = obtenerContenedor();
    this.ranuras = obtenerRanuras(this.contenedor);
    this.manejadoresClick = [];
    this.instalarEventos();
    this.desuscribir = this.sistema.suscribirCambio(() => this.renderizar());
    this.renderizar();
  }

  renderizar() {
    const estado = this.sistema.obtenerEstadoBarra();
    const seleccion = this.sistema.obtenerSeleccionDetallada();
    estado.forEach((ranura, indice) => {
      const elemento = this.ranuras[indice];
      elemento.dataset.ranuraHabilidad = String(indice);
      elemento.setAttribute("role", "button");
      elemento.setAttribute("tabindex", "0");
      elemento.setAttribute(
        "aria-label",
        ranura.idHabilidad
          ? `${ranura.nombre}, grado ${ranura.grado}, ranura ${ranura.tecla}`
          : `Ranura ${ranura.tecla} vacía`,
      );
      elemento.classList.toggle("habilidad-seleccionada", ranura.seleccionada);
      elemento.classList.toggle("habilidad-vacia", !ranura.idHabilidad);
      elemento.classList.toggle(
        "habilidad-bloqueada",
        Boolean(ranura.idHabilidad) &&
          (!ranura.configurada || ranura.grado <= 0),
      );
      elemento.classList.toggle(
        "habilidad-sin-mana",
        Boolean(ranura.idHabilidad) && !ranura.manaSuficiente,
      );
      elemento.replaceChildren();
      const tecla = crearElemento("span", "habilidad-tecla", ranura.tecla);
      elemento.append(tecla);
      if (ranura.idHabilidad) {
        elemento.append(crearIconoConFallback(ranura));
      }
      if (ranura.grado > 0) {
        elemento.append(
          crearElemento("span", "habilidad-grado", `G${ranura.grado}`),
        );
      }
      if (ranura.costoMana !== null) {
        elemento.append(
          crearElemento("span", "habilidad-mana", String(ranura.costoMana)),
        );
      }
      elemento.title = crearTitulo(ranura);
    });
    actualizarSelectorMapa(seleccion);
  }

  destruir() {
    this.desuscribir?.();
    this.manejadoresClick.forEach(({ elemento, tipo, manejador }) => {
      elemento.removeEventListener(tipo, manejador);
    });
    this.manejadoresClick = [];
    limpiarSelectorMapa();
  }

  instalarEventos() {
    for (const [indice, ranura] of this.ranuras.entries()) {
      const seleccionar = (evento) => {
        if (
          evento.type === "keydown" &&
          evento.key !== "Enter" &&
          evento.key !== " "
        ) {
          return;
        }
        evento.preventDefault();
        this.sistema.seleccionarPorRanura(indice);
      };
      ranura.addEventListener("click", seleccionar);
      ranura.addEventListener("keydown", seleccionar);
      this.manejadoresClick.push(
        { elemento: ranura, tipo: "click", manejador: seleccionar },
        { elemento: ranura, tipo: "keydown", manejador: seleccionar },
      );
    }
  }
}

function obtenerContenedor() {
  const contenedor = document.querySelector(
    "#barra-habilidades, .barra-habilidades, [data-barra-habilidades]",
  );
  if (!contenedor) {
    throw new Error("No se encontró la barra de habilidades de la partida.");
  }
  contenedor.id ||= "barra-habilidades";
  contenedor.dataset.barraHabilidades = "activa";
  return contenedor;
}

function obtenerRanuras(contenedor) {
  const ranuras = Array.from(
    contenedor.querySelectorAll(
      "[data-ranura-habilidad], .ranura-habilidad, .slot-habilidad, .habilidad-slot",
    ),
  ).slice(0, 10);
  if (ranuras.length !== 10) {
    throw new Error(
      "La barra declarada debe contener exactamente diez ranuras.",
    );
  }
  return ranuras;
}

function crearIconoConFallback(ranura) {
  const contenedor = crearElemento("span", "habilidad-recurso-visual");
  const mostrarFallback = () => {
    contenedor.replaceChildren(
      crearElemento(
        "span",
        `habilidad-inicial habilidad-inicial--${ranura.idHabilidad}`,
        ranura.nombre.slice(0, 1).toUpperCase(),
      ),
    );
  };
  if (!ranura.icono) {
    mostrarFallback();
    return contenedor;
  }
  const imagen = document.createElement("img");
  imagen.className = "habilidad-icono";
  imagen.src = ranura.icono;
  imagen.alt = "";
  imagen.draggable = false;
  imagen.addEventListener("error", mostrarFallback, { once: true });
  contenedor.append(imagen);
  return contenedor;
}

function crearTitulo(ranura) {
  if (!ranura.idHabilidad) {
    return `Ranura ${ranura.tecla}: vacía`;
  }
  return [
    `${ranura.nombre} — grado ${ranura.grado}`,
    ranura.descripcion,
    ranura.costoMana !== null ? `Maná: ${ranura.costoMana}` : "",
    ranura.configurada ? "Lista para usar" : "Ejecución en construcción",
    ranura.manaSuficiente ? "" : "Maná insuficiente",
  ]
    .filter(Boolean)
    .join("\n");
}

function actualizarSelectorMapa(seleccion) {
  limpiarSelectorMapa();
  if (!seleccion) {
    return;
  }
  const selectores = [
    `[data-x="${seleccion.x}"][data-y="${seleccion.y}"]`,
    `[data-columna="${seleccion.x}"][data-fila="${seleccion.y}"]`,
    `[data-pos-x="${seleccion.x}"][data-pos-y="${seleccion.y}"]`,
  ];
  for (const selector of selectores) {
    const casilla = document.querySelector(selector);
    if (casilla) {
      casilla.classList.add("selector-habilidad");
      if (!seleccion.objetivoValido || !seleccion.geometria?.puedeEjecutar) {
        casilla.classList.add("selector-habilidad-invalido");
      }
      return;
    }
  }
}

function limpiarSelectorMapa() {
  document
    .querySelectorAll(".selector-habilidad, .selector-habilidad-invalido")
    .forEach((elemento) => {
      elemento.classList.remove(
        "selector-habilidad",
        "selector-habilidad-invalido",
      );
    });
}

function crearElemento(etiqueta, clase = "", texto = "") {
  const elemento = document.createElement(etiqueta);
  if (clase) {
    elemento.className = clase;
  }
  if (texto !== "") {
    elemento.textContent = texto;
  }
  return elemento;
}
