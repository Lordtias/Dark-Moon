import { agregarRepresentacionObjeto } from "../RepresentacionObjeto.js";

import { crearPresentacionObjeto } from "../objetos/PresentadorObjeto.js";

import { VistaDetalleObjeto } from "../objetos/VistaDetalleObjeto.js";

const ORIGENES_COMERCIO = Object.freeze({
  JUGADOR: "jugador",
  MERCADER: "mercader",
});

const ID_HOJA_ESTILOS_DETALLE = "hojaEstilosModalDetalleObjeto";

const RUTA_HOJA_ESTILOS_DETALLE = "./modal-detalle-objeto.css";

const ID_HOJA_ESTILOS_COMERCIO = "hojaEstilosModalComercio";

const RUTA_HOJA_ESTILOS_COMERCIO = "./modal-comercio.css";

let siguienteIdModal = 1;

// Presenta:
//
// - Inventario del jugador a la izquierda.
// - Detalle y operación en el centro.
// - Stock del mercader a la derecha.
//
// La ventana no mueve objetos ni modifica oro
// directamente. Todas las operaciones se delegan
// mediante callbacks.
export class ModalComercio {
  constructor() {
    asegurarHojaEstilos({
      id: ID_HOJA_ESTILOS_DETALLE,

      ruta: RUTA_HOJA_ESTILOS_DETALLE,
    });

    asegurarHojaEstilos({
      id: ID_HOJA_ESTILOS_COMERCIO,

      ruta: RUTA_HOJA_ESTILOS_COMERCIO,
    });

    this.idTitulo = `tituloModalComercio${siguienteIdModal}`;

    siguienteIdModal++;

    this.vistaDetalle = new VistaDetalleObjeto();

    this.mercader = null;
    this.jugador = null;

    this.calcularCompra = null;
    this.calcularVenta = null;
    this.alComprar = null;
    this.alVender = null;

    this.seleccion = null;
    this.cantidadSeleccionada = 1;

    this.manejarCierreSolicitado = this.manejarCierreSolicitado.bind(this);

    this.manejarClickDialogo = this.manejarClickDialogo.bind(this);

    this.manejarTeclaDialogo = this.manejarTeclaDialogo.bind(this);

    this.manejarClickInventario = this.manejarClickInventario.bind(this);

    this.manejarClickStock = this.manejarClickStock.bind(this);

    this.manejarCambioCantidad = this.manejarCambioCantidad.bind(this);

    this.disminuirCantidad = this.disminuirCantidad.bind(this);

    this.aumentarCantidad = this.aumentarCantidad.bind(this);

    this.ejecutarOperacion = this.ejecutarOperacion.bind(this);

    this.construirDialogo();
    this.registrarEventos();
  }

  construirDialogo() {
    this.dialogo = document.createElement("dialog");

    this.dialogo.classList.add("modal-comercio");

    this.dialogo.setAttribute("aria-labelledby", this.idTitulo);

    const contenido = crearElemento("div", "modal-comercio__contenido");

    const cabecera = crearElemento("header", "modal-comercio__cabecera");

    const bloqueTitulo = crearElemento("div", "modal-comercio__bloque-titulo");

    this.titulo = crearElemento("h2", "modal-comercio__titulo");

    this.titulo.id = this.idTitulo;

    this.subtitulo = crearElemento(
      "p",

      "modal-comercio__subtitulo",

      "Comprá provisiones o vendé el botín de tus expediciones.",
    );

    bloqueTitulo.append(this.titulo, this.subtitulo);

    const bloqueEstado = crearElemento("div", "modal-comercio__estado-jugador");

    const etiquetaOro = crearElemento(
      "span",

      "modal-comercio__estado-etiqueta",

      "Oro",
    );

    this.valorOro = crearElemento("strong", "modal-comercio__oro", "0");

    this.botonCerrarSuperior = crearElemento(
      "button",

      "modal-comercio__cerrar-superior",

      "×",
    );

    this.botonCerrarSuperior.type = "button";

    this.botonCerrarSuperior.title = "Cerrar";

    this.botonCerrarSuperior.setAttribute("aria-label", "Cerrar comercio");

    bloqueEstado.append(etiquetaOro, this.valorOro, this.botonCerrarSuperior);

    cabecera.append(bloqueTitulo, bloqueEstado);

    const cuerpo = crearElemento("div", "modal-comercio__cuerpo");

    const seccionJugador = this.crearSeccionContenedor({
      titulo: "Tu inventario",

      modificador: "jugador",
    });

    this.listaJugador = seccionJugador.lista;

    this.mensajeJugadorVacio = seccionJugador.mensajeVacio;

    this.seccionDetalle = crearElemento("section", "modal-comercio__detalle");

    this.detalleVacio = crearElemento(
      "p",

      "modal-comercio__detalle-vacio",

      "Seleccioná un objeto para revisar sus detalles y precio.",
    );

    this.contenedorVistaDetalle = crearElemento(
      "div",
      "modal-comercio__vista-detalle",
    );

    this.contenedorVistaDetalle.appendChild(this.vistaDetalle.elemento);

    this.panelOperacion = this.crearPanelOperacion();

    this.seccionDetalle.append(
      this.detalleVacio,
      this.contenedorVistaDetalle,
      this.panelOperacion,
    );

    const seccionMercader = this.crearSeccionContenedor({
      titulo: "Stock del mercader",

      modificador: "mercader",
    });

    this.tituloStockMercader = seccionMercader.titulo;

    this.listaMercader = seccionMercader.lista;

    this.mensajeMercaderVacio = seccionMercader.mensajeVacio;

    cuerpo.append(
      seccionJugador.seccion,
      this.seccionDetalle,
      seccionMercader.seccion,
    );

    const acciones = crearElemento("footer", "modal-comercio__acciones");

    this.mensajeEstado = crearElemento("p", "modal-comercio__mensaje-estado");

    this.botonCerrar = crearElemento(
      "button",
      "modal-comercio__boton",
      "Cerrar",
    );

    this.botonCerrar.type = "button";

    this.botonCerrar.classList.add("modal-comercio__boton--secundario");

    acciones.append(this.mensajeEstado, this.botonCerrar);

    contenido.append(cabecera, cuerpo, acciones);

    this.dialogo.appendChild(contenido);

    document.body.appendChild(this.dialogo);
  }

  crearSeccionContenedor({ titulo, modificador }) {
    const seccion = crearElemento("section", "modal-comercio__seccion-lista");

    seccion.classList.add(`modal-comercio__seccion-lista--${modificador}`);

    const elementoTitulo = crearElemento(
      "h3",

      "modal-comercio__titulo-seccion",

      titulo,
    );

    const lista = crearElemento("div", "modal-comercio__lista");

    lista.setAttribute("role", "listbox");

    const mensajeVacio = crearElemento(
      "p",

      "modal-comercio__vacio",

      "No hay objetos disponibles.",
    );

    seccion.append(elementoTitulo, lista, mensajeVacio);

    return {
      seccion,
      titulo: elementoTitulo,
      lista,
      mensajeVacio,
    };
  }

  crearPanelOperacion() {
    const panel = crearElemento("section", "modal-comercio__operacion");

    this.tituloOperacion = crearElemento(
      "h3",

      "modal-comercio__operacion-titulo",

      "Operación",
    );

    const cantidad = crearElemento("div", "modal-comercio__cantidad");

    const etiquetaCantidad = crearElemento(
      "span",

      "modal-comercio__cantidad-etiqueta",

      "Cantidad",
    );

    const controlesCantidad = crearElemento(
      "div",

      "modal-comercio__cantidad-controles",
    );

    this.botonDisminuir = crearBotonCantidad("−", "Disminuir cantidad");

    this.inputCantidad = document.createElement("input");

    this.inputCantidad.classList.add("modal-comercio__cantidad-input");

    this.inputCantidad.type = "number";

    this.inputCantidad.min = "1";

    this.inputCantidad.step = "1";

    this.inputCantidad.value = "1";

    this.botonAumentar = crearBotonCantidad("+", "Aumentar cantidad");

    controlesCantidad.append(
      this.botonDisminuir,
      this.inputCantidad,
      this.botonAumentar,
    );

    this.presetCantidad = crearElemento(
      "div",

      "modal-comercio__cantidad-presets",
    );

    for (const preset of [1, 5, 10, "max"]) {
      const texto = preset === "max" ? "Máx." : `${preset}`;

      const boton = crearElemento(
        "button",

        "modal-comercio__cantidad-preset",

        texto,
      );

      boton.type = "button";

      boton.dataset.cantidadPreset = `${preset}`;

      boton.addEventListener(
        "click",

        () => {
          const maximo = this.obtenerCantidadMaxima();

          const cantidadPreset =
            preset === "max" ? maximo : Math.min(preset, maximo);

          this.establecerCantidad(cantidadPreset);
        },
      );

      this.presetCantidad.appendChild(boton);
    }

    cantidad.append(etiquetaCantidad, controlesCantidad, this.presetCantidad);

    const resumenPrecio = crearElemento("div", "modal-comercio__precio");

    this.etiquetaPrecio = crearElemento(
      "span",

      "modal-comercio__precio-etiqueta",

      "Precio",
    );

    this.valorPrecio = crearElemento(
      "strong",

      "modal-comercio__precio-valor",

      "—",
    );

    resumenPrecio.append(this.etiquetaPrecio, this.valorPrecio);

    this.mensajeOperacion = crearElemento(
      "p",

      "modal-comercio__operacion-mensaje",
    );

    this.botonOperacion = crearElemento(
      "button",

      "modal-comercio__boton",

      "Seleccionar objeto",
    );

    this.botonOperacion.type = "button";

    this.botonOperacion.classList.add("modal-comercio__boton--principal");

    panel.append(
      this.tituloOperacion,
      cantidad,
      resumenPrecio,
      this.mensajeOperacion,
      this.botonOperacion,
    );

    return panel;
  }

  registrarEventos() {
    this.dialogo.addEventListener("cancel", this.manejarCierreSolicitado);

    this.dialogo.addEventListener("click", this.manejarClickDialogo);

    this.dialogo.addEventListener("keydown", this.manejarTeclaDialogo);

    this.listaJugador.addEventListener("click", this.manejarClickInventario);

    this.listaMercader.addEventListener("click", this.manejarClickStock);

    this.botonCerrarSuperior.addEventListener(
      "click",
      this.manejarCierreSolicitado,
    );

    this.botonCerrar.addEventListener("click", this.manejarCierreSolicitado);

    this.inputCantidad.addEventListener("change", this.manejarCambioCantidad);

    this.inputCantidad.addEventListener("input", this.manejarCambioCantidad);

    this.botonDisminuir.addEventListener("click", this.disminuirCantidad);

    this.botonAumentar.addEventListener("click", this.aumentarCantidad);

    this.botonOperacion.addEventListener("click", this.ejecutarOperacion);
  }

  abrir({
    mercader,
    jugador,
    calcularCompra,
    calcularVenta,
    alComprar,
    alVender,
  } = {}) {
    validarApertura({
      mercader,
      jugador,
      calcularCompra,
      calcularVenta,
      alComprar,
      alVender,
    });

    this.mercader = mercader;

    this.jugador = jugador;

    this.calcularCompra = calcularCompra;

    this.calcularVenta = calcularVenta;

    this.alComprar = alComprar;

    this.alVender = alVender;

    this.titulo.textContent = mercader.nombre;

    this.tituloStockMercader.textContent = mercader.nombre;

    this.mensajeEstado.textContent = "";

    this.seleccion = this.crearSeleccionInicial();

    this.cantidadSeleccionada = 1;

    this.actualizar();

    if (!this.dialogo.open) {
      this.dialogo.showModal();
    }

    const slotSeleccionado = this.obtenerSlotSeleccionado();

    if (slotSeleccionado) {
      slotSeleccionado.focus();
    } else {
      this.botonCerrar.focus();
    }
  }

  actualizar() {
    if (!this.mercader || !this.jugador) {
      return;
    }

    this.valorOro.textContent = formatearMonedas(this.jugador.oro);

    this.validarSeleccionActual();
    this.actualizarListaJugador();
    this.actualizarListaMercader();
    this.actualizarDetalleYOperacion();
  }

  actualizarListaJugador() {
    const espacios = this.jugador.inventario.obtenerEspacios();

    this.construirLista({
      lista: this.listaJugador,

      mensajeVacio: this.mensajeJugadorVacio,

      espacios,

      origen: ORIGENES_COMERCIO.JUGADOR,
    });
  }

  actualizarListaMercader() {
    const espacios = this.mercader.stock.obtenerEspacios();

    this.construirLista({
      lista: this.listaMercader,

      mensajeVacio: this.mensajeMercaderVacio,

      espacios,

      origen: ORIGENES_COMERCIO.MERCADER,
    });
  }

  construirLista({ lista, mensajeVacio, espacios, origen }) {
    lista.replaceChildren();

    const fragmento = document.createDocumentFragment();

    let cantidadObjetos = 0;

    espacios.forEach((objeto, indice) => {
      fragmento.appendChild(
        this.crearSlot({
          objeto,
          indice,
          origen,
        }),
      );

      if (objeto) {
        cantidadObjetos++;
      }
    });

    lista.appendChild(fragmento);

    mensajeVacio.hidden = cantidadObjetos > 0;
  }

  crearSlot({ objeto, indice, origen }) {
    const slot = crearElemento(
      objeto ? "button" : "div",

      "modal-comercio__slot",
    );

    slot.dataset.indiceComercio = `${indice}`;

    slot.dataset.origenComercio = origen;

    if (!objeto) {
      slot.classList.add("modal-comercio__slot--vacio");

      slot.setAttribute("aria-label", "Espacio vacío");

      return slot;
    }

    slot.type = "button";

    slot.setAttribute("role", "option");

    const seleccionado =
      this.seleccion?.origen === origen && this.seleccion?.indice === indice;

    slot.classList.toggle("seleccionado", seleccionado);

    slot.setAttribute("aria-selected", `${seleccionado}`);

    slot.setAttribute("aria-label", `Seleccionar ${objeto.nombre}`);

    agregarRepresentacionObjeto({
      contenedor: slot,

      objeto,

      claseTexto: "modal-comercio__nombre-respaldo",
    });

    const nombre = crearElemento(
      "span",

      "modal-comercio__nombre",

      objeto.nombre,
    );

    const precio = crearElemento(
      "span",

      "modal-comercio__precio-slot",

      this.crearTextoPrecioSlot({
        origen,
        indice,
        objeto,
      }),
    );

    slot.append(nombre, precio);

    if (objeto.apilable && objeto.cantidad > 1) {
      const cantidad = crearElemento(
        "span",

        "modal-comercio__cantidad-slot",

        `${objeto.cantidad}`,
      );

      slot.appendChild(cantidad);
    }

    return slot;
  }

  crearTextoPrecioSlot({ origen, indice, objeto }) {
    const calculo =
      origen === ORIGENES_COMERCIO.MERCADER
        ? this.calcularCompra({
            indice,
            cantidad: 1,
          })
        : this.calcularVenta({
            indice,
            cantidad: 1,
          });

    if (!calculo) {
      return "—";
    }

    if (origen === ORIGENES_COMERCIO.JUGADOR && !calculo.permitido) {
      return calculo.motivoNoPermitido === "objetoNoVendible"
        ? "No vendible"
        : "Vender varias";
    }

    const etiqueta =
      origen === ORIGENES_COMERCIO.MERCADER ? "Comprar" : "Vender";

    const prefijoUnidad =
      objeto.apilable && objeto.cantidad > 1 ? "1 u. · " : "";

    return (
      `${etiqueta}: ` +
      `${prefijoUnidad}` +
      `${formatearMonedas(calculo.precioTotal)}`
    );
  }

  actualizarDetalleYOperacion() {
    const objeto = this.obtenerObjetoSeleccionado();

    const hayObjeto = objeto !== null;

    this.detalleVacio.hidden = hayObjeto;

    this.contenedorVistaDetalle.hidden = !hayObjeto;

    this.panelOperacion.hidden = !hayObjeto;

    if (!hayObjeto) {
      return;
    }

    this.vistaDetalle.mostrar(
      crearPresentacionObjeto({
        objeto,

        combatiente: this.jugador,
      }),
    );

    const maximo = this.obtenerCantidadMaxima();

    this.cantidadSeleccionada = limitarCantidad(
      this.cantidadSeleccionada,
      maximo,
    );

    const mostrarCantidad = objeto.apilable === true && maximo > 1;

    this.inputCantidad.closest(".modal-comercio__cantidad").hidden =
      !mostrarCantidad;

    this.inputCantidad.max = `${maximo}`;

    this.inputCantidad.value = `${this.cantidadSeleccionada}`;

    this.botonDisminuir.disabled = this.cantidadSeleccionada <= 1;

    this.botonAumentar.disabled = this.cantidadSeleccionada >= maximo;

    this.actualizarPresets(maximo, mostrarCantidad);

    this.actualizarPrecioOperacion();
  }

  actualizarPresets(maximo, mostrarCantidad) {
    this.presetCantidad.hidden = !mostrarCantidad;

    for (const boton of this.presetCantidad.children) {
      const preset = boton.dataset.cantidadPreset;

      boton.disabled = preset !== "max" && Number.parseInt(preset, 10) > maximo;
    }
  }

  actualizarPrecioOperacion() {
    if (!this.seleccion) {
      return;
    }

    const esCompra = this.seleccion.origen === ORIGENES_COMERCIO.MERCADER;

    const calculo = esCompra
      ? this.calcularCompra({
          indice: this.seleccion.indice,

          cantidad: this.cantidadSeleccionada,
        })
      : this.calcularVenta({
          indice: this.seleccion.indice,

          cantidad: this.cantidadSeleccionada,
        });

    this.tituloOperacion.textContent = esCompra ? "Comprar" : "Vender";

    this.etiquetaPrecio.textContent = esCompra
      ? "Precio de compra"
      : "Precio de venta";

    if (!calculo) {
      this.valorPrecio.textContent = "—";

      this.botonOperacion.disabled = true;

      this.mensajeOperacion.textContent =
        "El objeto seleccionado ya no está disponible.";

      return;
    }

    this.valorPrecio.textContent = `${formatearMonedas(calculo.precioTotal)} monedas`;

    if (!calculo.permitido) {
      this.botonOperacion.textContent =
        calculo.motivoNoPermitido === "objetoNoVendible"
          ? "No vendible"
          : "Cantidad insuficiente";

      this.botonOperacion.disabled = true;

      this.mensajeOperacion.textContent = calculo.mensaje ?? "";

      return;
    }

    if (esCompra && !calculo.puedePagar) {
      this.botonOperacion.textContent = "Oro insuficiente";

      this.botonOperacion.disabled = true;

      this.mensajeOperacion.textContent = `Te faltan ${formatearMonedas(
        Math.max(
          0,

          calculo.precioTotal - this.jugador.oro,
        ),
      )} monedas.`;

      return;
    }

    this.botonOperacion.textContent = esCompra
      ? `Comprar por ${formatearMonedas(calculo.precioTotal)}`
      : `Vender por ${formatearMonedas(calculo.precioTotal)}`;

    this.botonOperacion.disabled = false;

    this.mensajeOperacion.textContent = "";
  }

  crearSeleccionInicial() {
    const indiceMercader = obtenerPrimerIndiceOcupado(this.mercader.stock);

    if (indiceMercader !== null) {
      return {
        origen: ORIGENES_COMERCIO.MERCADER,

        indice: indiceMercader,
      };
    }

    const indiceJugador = obtenerPrimerIndiceOcupado(this.jugador.inventario);

    if (indiceJugador !== null) {
      return {
        origen: ORIGENES_COMERCIO.JUGADOR,

        indice: indiceJugador,
      };
    }

    return null;
  }

  validarSeleccionActual() {
    if (this.obtenerObjetoSeleccionado()) {
      return;
    }

    this.seleccion = this.crearSeleccionInicial();

    this.cantidadSeleccionada = 1;
  }

  obtenerObjetoSeleccionado() {
    if (!this.seleccion || !this.mercader || !this.jugador) {
      return null;
    }

    const contenedor =
      this.seleccion.origen === ORIGENES_COMERCIO.MERCADER
        ? this.mercader.stock
        : this.jugador.inventario;

    return contenedor.obtenerObjetoEn(this.seleccion.indice) ?? null;
  }

  obtenerCantidadMaxima() {
    const objeto = this.obtenerObjetoSeleccionado();

    if (!objeto) {
      return 1;
    }

    return objeto.apilable ? objeto.cantidad : 1;
  }

  seleccionar(origen, indice) {
    const contenedor =
      origen === ORIGENES_COMERCIO.MERCADER
        ? this.mercader?.stock
        : this.jugador?.inventario;

    const objeto = contenedor?.obtenerObjetoEn(indice);

    if (!objeto) {
      return;
    }

    this.seleccion = {
      origen,
      indice,
    };

    this.cantidadSeleccionada = 1;

    this.mensajeEstado.textContent = "";

    this.actualizar();
  }

  manejarClickInventario(event) {
    this.procesarClickLista(event, ORIGENES_COMERCIO.JUGADOR);
  }

  manejarClickStock(event) {
    this.procesarClickLista(event, ORIGENES_COMERCIO.MERCADER);
  }

  procesarClickLista(event, origen) {
    const slot = event.target.closest(
      ".modal-comercio__slot:not(.modal-comercio__slot--vacio)",
    );

    if (!slot) {
      return;
    }

    const indice = Number.parseInt(
      slot.dataset.indiceComercio,

      10,
    );

    if (!Number.isInteger(indice)) {
      return;
    }

    this.seleccionar(origen, indice);
  }

  manejarCambioCantidad() {
    const valor = Number.parseInt(this.inputCantidad.value, 10);

    this.establecerCantidad(valor);
  }

  establecerCantidad(cantidad) {
    this.cantidadSeleccionada = limitarCantidad(
      cantidad,
      this.obtenerCantidadMaxima(),
    );

    this.actualizarDetalleYOperacion();
  }

  disminuirCantidad() {
    this.establecerCantidad(this.cantidadSeleccionada - 1);
  }

  aumentarCantidad() {
    this.establecerCantidad(this.cantidadSeleccionada + 1);
  }

  ejecutarOperacion() {
    if (!this.seleccion || this.botonOperacion.disabled) {
      return;
    }

    const parametros = {
      indice: this.seleccion.indice,

      cantidad: this.cantidadSeleccionada,
    };

    const resultado =
      this.seleccion.origen === ORIGENES_COMERCIO.MERCADER
        ? this.alComprar(parametros)
        : this.alVender(parametros);

    this.mensajeEstado.textContent = resultado?.mensaje ?? "";

    this.actualizar();
  }

  obtenerSlotSeleccionado() {
    return this.dialogo.querySelector(
      '.modal-comercio__slot[aria-selected="true"]',
    );
  }

  manejarCierreSolicitado(event) {
    event?.preventDefault();
    this.cerrar();
  }

  manejarClickDialogo(event) {
    if (event.target === this.dialogo) {
      this.cerrar();
    }
  }

  manejarTeclaDialogo(event) {
    // Impide que las teclas utilizadas dentro
    // del comercio alcancen los controles del mapa.
    event.stopPropagation();
  }

  cerrar() {
    if (this.dialogo.open) {
      this.dialogo.close();
    }

    this.mercader = null;
    this.jugador = null;
    this.calcularCompra = null;
    this.calcularVenta = null;
    this.alComprar = null;
    this.alVender = null;
    this.seleccion = null;

    this.cantidadSeleccionada = 1;

    this.mensajeEstado.textContent = "";
  }

  get estaAbierto() {
    return this.dialogo.open;
  }

  destruir() {
    this.cerrar();

    this.dialogo.removeEventListener("cancel", this.manejarCierreSolicitado);

    this.dialogo.removeEventListener("click", this.manejarClickDialogo);

    this.dialogo.removeEventListener("keydown", this.manejarTeclaDialogo);

    this.listaJugador.removeEventListener("click", this.manejarClickInventario);

    this.listaMercader.removeEventListener("click", this.manejarClickStock);

    this.dialogo.remove();
  }
}

function crearBotonCantidad(texto, etiquetaAccesible) {
  const boton = crearElemento(
    "button",

    "modal-comercio__cantidad-boton",

    texto,
  );

  boton.type = "button";

  boton.setAttribute("aria-label", etiquetaAccesible);

  return boton;
}

function crearElemento(etiqueta, clase, texto = "") {
  const elemento = document.createElement(etiqueta);

  elemento.classList.add(clase);

  if (texto !== "") {
    elemento.textContent = texto;
  }

  return elemento;
}

function obtenerPrimerIndiceOcupado(contenedor) {
  const espacios = contenedor.obtenerEspacios();

  const indice = espacios.findIndex(Boolean);

  return indice === -1 ? null : indice;
}

function limitarCantidad(cantidad, maximo) {
  const cantidadNumerica = Number.isInteger(cantidad) ? cantidad : 1;

  return Math.max(
    1,

    Math.min(maximo, cantidadNumerica),
  );
}

function formatearMonedas(cantidad) {
  return new Intl.NumberFormat("es-UY").format(cantidad);
}

function validarApertura({
  mercader,
  jugador,
  calcularCompra,
  calcularVenta,
  alComprar,
  alVender,
}) {
  if (!mercader || typeof mercader.nombre !== "string" || !mercader.stock) {
    throw new Error("ModalComercio necesita un mercader válido.");
  }

  if (!jugador?.inventario || !Number.isSafeInteger(jugador.oro)) {
    throw new Error("ModalComercio necesita un jugador válido.");
  }

  const callbacks = [calcularCompra, calcularVenta, alComprar, alVender];

  if (callbacks.some((callback) => typeof callback !== "function")) {
    throw new Error("ModalComercio necesita todas sus acciones comerciales.");
  }
}

function asegurarHojaEstilos({ id, ruta }) {
  if (document.getElementById(id)) {
    return;
  }

  const enlace = document.createElement("link");

  enlace.id = id;
  enlace.rel = "stylesheet";
  enlace.href = ruta;

  document.head.appendChild(enlace);
}
