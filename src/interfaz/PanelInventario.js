import { agregarRepresentacionObjeto } from "./RepresentacionObjeto.js";

const ID_HOJA_ESTILOS = "hojaEstilosResumenInventario";

const RUTA_HOJA_ESTILOS = "./panel-resumen-inventario.css";

// Muestra el inventario y notifica
// cuando el usuario selecciona un objeto.
//
// El panel no decide qué acción se ejecuta.
// Solamente informa el índice seleccionado
// al controlador correspondiente.
//
// También presenta un resumen persistente con:
//
// - Casillas ocupadas.
// - Casillas libres.
// - Oro del jugador.
export class PanelInventario {
  constructor({ cuadricula, mensajeVacio } = {}) {
    if (!cuadricula) {
      throw new Error("PanelInventario necesita una cuadrícula.");
    }

    if (!mensajeVacio) {
      throw new Error("PanelInventario necesita un mensaje vacío.");
    }

    asegurarHojaEstilos();

    this.cuadricula = cuadricula;
    this.mensajeVacio = mensajeVacio;
    this.alSeleccionarObjeto = null;

    // El resumen se crea desde JavaScript para no
    // modificar la estructura actual de index.html.
    this.crearResumenInventario();

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

  // Actualiza tanto las casillas como el resumen.
  //
  // Recibe al jugador completo porque el oro no
  // pertenece al contenedor de objetos.
  actualizar(inventario, jugador) {
    validarInventario(inventario);
    validarJugador(jugador);

    const espacios = inventario.obtenerEspacios();

    this.cuadricula.replaceChildren();

    espacios.forEach((objeto, indice) => {
      this.cuadricula.appendChild(this.crearCasilla(objeto, indice));
    });

    this.mensajeVacio.classList.toggle("oculto", !inventario.estaVacio());

    this.actualizarResumen({
      inventario,
      jugador,
    });
  }

  // Crea una casilla del inventario.
  //
  // Seleccionarla abre el detalle del objeto.
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

  // Construye el bloque inferior que después
  // también mostrará el peso del inventario.
  crearResumenInventario() {
    this.resumenInventario = document.createElement("section");

    this.resumenInventario.classList.add("resumen-inventario");

    this.resumenInventario.setAttribute("aria-label", "Resumen del inventario");

    const resumenCasillas = crearDatoResumen({
      etiqueta: "Casillas",
    });

    const resumenLibres = crearDatoResumen({
      etiqueta: "Libres",
    });

    const resumenOro = crearDatoResumen({
      etiqueta: "Oro",

      claseAdicional: "resumen-inventario__dato--oro",
    });

    this.valorCasillas = resumenCasillas.valor;

    this.valorLibres = resumenLibres.valor;

    this.valorOro = resumenOro.valor;

    this.resumenInventario.append(
      resumenCasillas.contenedor,
      resumenLibres.contenedor,
      resumenOro.contenedor,
    );

    // El mensaje y la cuadrícula comparten el mismo
    // panel. Insertamos el resumen al final para que
    // permanezca debajo de las casillas.
    const contenedorPanel = this.cuadricula.parentElement;

    if (!contenedorPanel) {
      throw new Error("No se encontró el contenedor del inventario.");
    }

    contenedorPanel.appendChild(this.resumenInventario);
  }

  actualizarResumen({ inventario, jugador }) {
    const libres = inventario.contarEspaciosLibres();

    const ocupadas = inventario.capacidad - libres;

    this.valorCasillas.textContent = `${ocupadas}/${inventario.capacidad}`;

    this.valorLibres.textContent = `${libres}`;

    this.valorOro.textContent = formatearCantidadMonedas(jugador.oro);

    this.resumenInventario.setAttribute(
      "aria-label",

      `Inventario: ${ocupadas} de ` +
        `${inventario.capacidad} casillas ocupadas, ` +
        `${libres} libres y ${jugador.oro} monedas de oro.`,
    );
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

    this.resumenInventario.remove();
  }
}

function crearDatoResumen({ etiqueta, claseAdicional = null }) {
  const contenedor = document.createElement("div");

  contenedor.classList.add("resumen-inventario__dato");

  if (claseAdicional) {
    contenedor.classList.add(claseAdicional);
  }

  const elementoEtiqueta = document.createElement("span");

  elementoEtiqueta.classList.add("resumen-inventario__etiqueta");

  elementoEtiqueta.textContent = etiqueta;

  const valor = document.createElement("strong");

  valor.classList.add("resumen-inventario__valor");

  valor.textContent = "0";

  contenedor.append(elementoEtiqueta, valor);

  return {
    contenedor,
    valor,
  };
}

function validarInventario(inventario) {
  if (
    !inventario ||
    typeof inventario.obtenerEspacios !== "function" ||
    typeof inventario.estaVacio !== "function" ||
    typeof inventario.contarEspaciosLibres !== "function" ||
    !Number.isInteger(inventario.capacidad)
  ) {
    throw new Error("PanelInventario necesita un inventario válido.");
  }
}

function validarJugador(jugador) {
  if (!jugador || !Number.isSafeInteger(jugador.oro) || jugador.oro < 0) {
    throw new Error("PanelInventario necesita un jugador con oro válido.");
  }
}

function formatearCantidadMonedas(cantidad) {
  return new Intl.NumberFormat("es-UY").format(cantidad);
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
