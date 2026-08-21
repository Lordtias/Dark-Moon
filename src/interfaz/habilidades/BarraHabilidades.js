import { CANTIDAD_RANURAS_BARRA } from "../../juego/habilidades/ContratoBarraHabilidades.js";
import { estaEntradaJugableCapturada } from "../../controles/ContextoEntradaInterfaz.js";
import { crearElemento } from "../dom/UtilidadesDom.js";
import { traducir, traducirContenido } from "../idiomas/ContextoIdioma.js";

// Representa exclusivamente accesos rápidos. El contenido de cada habilidad,
// sus grados y su validez se consultan siempre al sistema y al progreso real.
export class BarraHabilidades {
  constructor({ sistemaHabilidades, alSeleccionarRanura } = {}) {
    if (!sistemaHabilidades) {
      throw new Error("BarraHabilidades necesita el sistema de habilidades.");
    }

    if (typeof alSeleccionarRanura !== "function") {
      throw new Error(
        "BarraHabilidades necesita una función para seleccionar ranuras.",
      );
    }

    this.sistema = sistemaHabilidades;
    this.alSeleccionarRanura = alSeleccionarRanura;
    this.contenedor = obtenerContenedor();
    this.ranuras = obtenerRanuras(this.contenedor);
    this.manejadoresClick = [];

    this.instalarEventos();
    this.desuscribir = this.sistema.suscribirCambio(() => this.renderizar());
    this.renderizar();
  }

  renderizar() {
    const estado = this.sistema.obtenerEstadoBarra();

    estado.forEach((ranura, indice) => {
      const elemento = this.ranuras[indice];
      elemento.dataset.ranuraHabilidad = String(indice);
      elemento.setAttribute("role", "button");
      elemento.setAttribute("tabindex", "0");
      const nombreHabilidad = obtenerNombreHabilidad(ranura);
      elemento.setAttribute(
        "aria-label",
        ranura.idHabilidad
          ? traducir("interfaz.habilidades.ranuraHabilidadAria", {
              parametros: { nombre: nombreHabilidad, grado: ranura.grado, ranura: ranura.tecla },
              respaldo: `${nombreHabilidad}, grado ${ranura.grado}, ranura ${ranura.tecla}`,
            })
          : traducir("interfaz.habilidades.ranuraAria", {
              parametros: { ranura: ranura.tecla },
              respaldo: `Ranura ${ranura.tecla} vacía`,
            }),
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
      elemento.classList.toggle(
        "habilidad-no-disponible",
        Boolean(ranura.idHabilidad) && ranura.disponible === false,
      );
      elemento.dataset.disponibilidadHabilidad = ranura.idHabilidad
        ? (ranura.disponible === false ? "no-disponible" : "disponible")
        : "vacia";
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
  }

  destruir() {
    this.desuscribir?.();

    this.manejadoresClick.forEach(({ elemento, tipo, manejador }) => {
      elemento.removeEventListener(tipo, manejador);
    });

    this.manejadoresClick = [];
  }

  instalarEventos() {
    for (const [indice, ranura] of this.ranuras.entries()) {
      const seleccionar = (evento) => {
        if (estaEntradaJugableCapturada(document)) {
          return;
        }

        if (
          evento.type === "keydown" &&
          evento.key !== "Enter" &&
          evento.key !== " "
        ) {
          return;
        }

        evento.preventDefault();
        this.alSeleccionarRanura(indice);
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
  ).slice(0, CANTIDAD_RANURAS_BARRA);

  if (ranuras.length !== CANTIDAD_RANURAS_BARRA) {
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
        obtenerNombreHabilidad(ranura).slice(0, 1).toUpperCase(),
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
    return traducir("interfaz.habilidades.ranuraAria", {
      parametros: { ranura: ranura.tecla },
      respaldo: `Ranura ${ranura.tecla}: vacía`,
    });
  }

  return [
    `${obtenerNombreHabilidad(ranura)} — ${traducir("interfaz.habilidades.gradoSimple", { parametros: { grado: ranura.grado }, respaldo: `Grado ${ranura.grado}` })}`,
    obtenerDescripcionHabilidad(ranura),
    ranura.costoMana !== null
      ? traducir("interfaz.habilidades.mana", { parametros: { valor: ranura.costoMana }, respaldo: `Maná: ${ranura.costoMana}` })
      : "",
    ranura.configurada
      ? traducir("interfaz.habilidades.listaUsar", { respaldo: "Lista para usar" })
      : traducir("interfaz.habilidades.ejecucionConstruccion", { respaldo: "Ejecución en construcción" }),
    ranura.manaSuficiente
      ? ""
      : traducir("interfaz.habilidades.manaInsuficiente", { respaldo: "Maná insuficiente" }),
    ranura.disponible === false && ranura.mensajeNoDisponible
      ? ranura.mensajeNoDisponible
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function obtenerNombreHabilidad(ranura) {
  if (!ranura?.idHabilidad) return ranura?.nombre ?? "";
  return traducirContenido(
    "habilidades",
    ranura.idHabilidad,
    "nombre",
    ranura.nombre ?? ranura.idHabilidad,
  );
}

function obtenerDescripcionHabilidad(ranura) {
  if (!ranura?.idHabilidad) return ranura?.descripcion ?? "";
  return traducirContenido(
    "habilidades",
    ranura.idHabilidad,
    "descripcion",
    ranura.descripcion ?? "",
  );
}
