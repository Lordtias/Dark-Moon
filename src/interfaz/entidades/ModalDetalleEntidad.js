import { CLASE_CAPTURA_ENTRADA_INTERFAZ } from "../../controles/ContextoEntradaInterfaz.js";
import { asegurarHojaEstilos, crearElemento } from "../dom/UtilidadesDom.js";

const ID_HOJA_ESTILOS = "hojaEstilosModalDetalleEntidad";
const RUTA_HOJA_ESTILOS = "./assets/estilos/modales/modal-detalle-entidad.css";

// Renderiza un contrato de presentación genérico. No conoce Enemigo, NPC,
// Destructible ni ninguna otra clase concreta: recibe secciones, campos,
// listas y acciones ya resueltas por el presentador de dominio.
export class ModalDetalleEntidad {
  constructor() {
    asegurarHojaEstilos({ id: ID_HOJA_ESTILOS, ruta: RUTA_HOJA_ESTILOS });
    this.detalleActual = null;
    this.alAccion = null;
    this.dialogo = this.crearDialogo();
  }

  crearDialogo() {
    const dialogo = document.createElement("dialog");
    dialogo.className = "modal-detalle-entidad";

    this.contenido = crearElemento("div", "modal-detalle-entidad__contenido");
    this.cabecera = crearElemento("header", "modal-detalle-entidad__cabecera");
    this.identidad = crearElemento("div", "modal-detalle-entidad__identidad");
    this.icono = document.createElement("img");
    this.icono.className = "modal-detalle-entidad__icono";
    this.icono.alt = "";
    this.titulo = crearElemento("h2", "modal-detalle-entidad__titulo");
    this.descripcion = crearElemento("p", "modal-detalle-entidad__descripcion");
    this.cuerpo = crearElemento("div", "modal-detalle-entidad__secciones");
    this.acciones = crearElemento("footer", "modal-detalle-entidad__acciones");

    const cierreSuperior = crearElemento(
      "button",
      "modal-detalle-entidad__cerrar-superior",
      "×",
    );
    cierreSuperior.type = "button";
    cierreSuperior.setAttribute("aria-label", "Cerrar información de entidad");
    cierreSuperior.addEventListener("click", () => this.cerrar());

    this.identidad.append(this.titulo, this.descripcion);
    this.cabecera.append(this.icono, this.identidad, cierreSuperior);
    this.contenido.append(this.cabecera, this.cuerpo, this.acciones);
    dialogo.append(this.contenido);
    document.body.appendChild(dialogo);

    dialogo.addEventListener("cancel", (evento) => {
      evento.preventDefault();
      this.cerrar();
    });
    dialogo.addEventListener("click", (evento) => {
      if (evento.target === dialogo) this.cerrar();
    });

    return dialogo;
  }

  abrir({ detalle, alAccion = null } = {}) {
    if (!detalle || typeof detalle !== "object") {
      throw new Error("El modal de entidad necesita un detalle válido.");
    }
    if (alAccion !== null && typeof alAccion !== "function") {
      throw new Error("La acción del modal de entidad debe ser una función o null.");
    }

    this.detalleActual = detalle;
    this.alAccion = alAccion;
    this.renderizar(detalle);

    if (!this.dialogo.open) {
      document.body?.classList.add(CLASE_CAPTURA_ENTRADA_INTERFAZ);
      this.dialogo.showModal();
    }

    this.dialogo
      .querySelector(".modal-detalle-entidad__boton--principal")
      ?.focus?.();
  }

  renderizar(detalle) {
    this.titulo.textContent = detalle.nombre ?? "Entidad";
    this.descripcion.textContent = detalle.descripcion ?? "";

    const recurso =
      typeof detalle.recursoVisual === "string" && detalle.recursoVisual.trim()
        ? detalle.recursoVisual.trim()
        : null;
    this.icono.hidden = recurso === null;
    if (recurso) this.icono.src = recurso;
    else this.icono.removeAttribute("src");

    this.cuerpo.replaceChildren();
    for (const seccion of detalle.secciones ?? []) {
      this.cuerpo.append(crearSeccion(seccion));
    }

    this.acciones.replaceChildren();
    for (const accion of detalle.acciones ?? []) {
      this.acciones.append(
        crearBotonAccion(accion, () => this.ejecutarAccion(accion)),
      );
    }
    this.acciones.append(
      crearBotonAccion(
        { id: "cerrar", etiqueta: "Cerrar", secundaria: true },
        () => this.cerrar(),
      ),
    );
  }

  ejecutarAccion(accion) {
    const detalle = this.detalleActual;
    const alAccion = this.alAccion;
    this.cerrar({ limpiar: false });
    alAccion?.({ accion, detalle });
  }

  cerrar({ limpiar = true } = {}) {
    if (this.dialogo.open) {
      this.dialogo.close();
    }
    document.body?.classList.remove(CLASE_CAPTURA_ENTRADA_INTERFAZ);
    if (limpiar) {
      this.detalleActual = null;
      this.alAccion = null;
    }
  }

  estaAbierto() {
    return this.dialogo.open;
  }

  destruir() {
    this.cerrar();
    this.dialogo?.remove();
    this.dialogo = null;
  }
}

function crearSeccion(seccion) {
  const contenedor = crearElemento("section", "modal-detalle-entidad__seccion");
  contenedor.append(
    crearElemento("h3", "modal-detalle-entidad__subtitulo", seccion.titulo ?? ""),
  );

  if (Array.isArray(seccion.campos) && seccion.campos.length > 0) {
    const lista = crearElemento("dl", "modal-detalle-entidad__campos");
    for (const campo of seccion.campos) {
      lista.append(
        crearElemento("dt", "", campo.etiqueta ?? ""),
        crearElemento("dd", "", campo.valor ?? ""),
      );
    }
    contenedor.append(lista);
  }

  if (Array.isArray(seccion.elementos) && seccion.elementos.length > 0) {
    const lista = crearElemento("ul", "modal-detalle-entidad__lista");
    for (const elemento of seccion.elementos) {
      lista.append(crearElemento("li", "", String(elemento)));
    }
    contenedor.append(lista);
  }

  return contenedor;
}

function crearBotonAccion(accion, alClick) {
  const boton = crearElemento(
    "button",
    accion.secundaria
      ? "modal-detalle-entidad__boton modal-detalle-entidad__boton--secundario"
      : "modal-detalle-entidad__boton modal-detalle-entidad__boton--principal",
    accion.etiqueta ?? accion.id ?? "Acción",
  );
  boton.type = "button";
  boton.addEventListener("click", alClick);
  return boton;
}
