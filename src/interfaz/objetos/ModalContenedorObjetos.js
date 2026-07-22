import { agregarRepresentacionObjeto } from "../RepresentacionObjeto.js";

import { crearPresentacionObjeto } from "./PresentadorObjeto.js";

import { VistaDetalleObjeto } from "./VistaDetalleObjeto.js";

const ID_HOJA_ESTILOS_DETALLE = "hojaEstilosModalDetalleObjeto";

const RUTA_HOJA_ESTILOS_DETALLE = "./modal-detalle-objeto.css";

const ID_HOJA_ESTILOS_CONTENEDOR = "hojaEstilosModalContenedorObjetos";

const RUTA_HOJA_ESTILOS_CONTENEDOR = "./modal-contenedor-objetos.css";

// Esta hoja reúne correcciones compartidas por
// el detalle reutilizado y el modal de comercio.
const ID_HOJA_ESTILOS_AJUSTES = "hojaEstilosAjustesModales";

const RUTA_HOJA_ESTILOS_AJUSTES = "./ajustes-modales.css";

const TECLA_RECOGER_TODO = "KeyR";

let siguienteIdModal = 1;

// Muestra el contenido de cualquier ContenedorObjetos.
//
// El modal no conoce BotinSuelo, cofres ni NPC.
// Recibe un contenedor y callbacks externos para:
//
// - Recoger el objeto seleccionado.
// - Recoger todo lo posible.
//
// La zona derecha reutiliza VistaDetalleObjeto.
export class ModalContenedorObjetos {
  constructor() {
    asegurarHojaEstilos({
      id: ID_HOJA_ESTILOS_DETALLE,

      ruta: RUTA_HOJA_ESTILOS_DETALLE,
    });

    asegurarHojaEstilos({
      id: ID_HOJA_ESTILOS_CONTENEDOR,

      ruta: RUTA_HOJA_ESTILOS_CONTENEDOR,
    });

    asegurarHojaEstilos({
      id: ID_HOJA_ESTILOS_AJUSTES,

      ruta: RUTA_HOJA_ESTILOS_AJUSTES,
    });

    this.idTitulo = `tituloModalContenedor${siguienteIdModal}`;

    siguienteIdModal++;

    this.vistaDetalle = new VistaDetalleObjeto();

    this.contenedorObjetos = null;
    this.combatiente = null;
    this.alRecoger = null;
    this.alRecogerTodo = null;
    this.indiceSeleccionado = null;

    this.manejarCierreSolicitado = this.manejarCierreSolicitado.bind(this);

    this.manejarClickDialogo = this.manejarClickDialogo.bind(this);

    this.manejarTeclaDialogo = this.manejarTeclaDialogo.bind(this);

    this.manejarClickLista = this.manejarClickLista.bind(this);

    this.ejecutarRecoger = this.ejecutarRecoger.bind(this);

    this.ejecutarRecogerTodo = this.ejecutarRecogerTodo.bind(this);

    this.construirDialogo();
    this.registrarEventos();
  }

  construirDialogo() {
    this.dialogo = document.createElement("dialog");

    this.dialogo.classList.add("modal-contenedor-objetos");

    this.dialogo.setAttribute("aria-labelledby", this.idTitulo);

    const contenido = document.createElement("div");

    contenido.classList.add("modal-contenedor-objetos__contenido");

    const cabecera = document.createElement("header");

    cabecera.classList.add("modal-contenedor-objetos__cabecera");

    this.titulo = document.createElement("h2");

    this.titulo.id = this.idTitulo;

    this.titulo.classList.add("modal-contenedor-objetos__titulo");

    this.botonCerrarSuperior = document.createElement("button");

    this.botonCerrarSuperior.type = "button";

    this.botonCerrarSuperior.classList.add(
      "modal-contenedor-objetos__cerrar-superior",
    );

    this.botonCerrarSuperior.textContent = "×";

    this.botonCerrarSuperior.title = "Cerrar";

    this.botonCerrarSuperior.setAttribute("aria-label", "Cerrar contenedor");

    cabecera.append(this.titulo, this.botonCerrarSuperior);

    const cuerpo = document.createElement("div");

    cuerpo.classList.add("modal-contenedor-objetos__cuerpo");

    const seccionLista = document.createElement("section");

    seccionLista.classList.add("modal-contenedor-objetos__seccion-lista");

    const tituloLista = document.createElement("h3");

    tituloLista.classList.add("modal-contenedor-objetos__titulo-seccion");

    tituloLista.textContent = "Objetos";

    this.listaObjetos = document.createElement("div");

    this.listaObjetos.classList.add("modal-contenedor-objetos__lista");

    this.listaObjetos.setAttribute("role", "listbox");

    this.mensajeVacio = document.createElement("p");

    this.mensajeVacio.classList.add("modal-contenedor-objetos__vacio");

    this.mensajeVacio.textContent = "El contenedor está vacío.";

    seccionLista.append(tituloLista, this.listaObjetos, this.mensajeVacio);

    this.seccionDetalle = document.createElement("section");

    this.seccionDetalle.classList.add(
      "modal-contenedor-objetos__seccion-detalle",
    );

    this.seccionDetalle.appendChild(this.vistaDetalle.elemento);

    cuerpo.append(seccionLista, this.seccionDetalle);

    const acciones = document.createElement("footer");

    acciones.classList.add("modal-contenedor-objetos__acciones");

    this.botonCerrar = crearBotonAccion({
      texto: "Cerrar",

      clase: "modal-contenedor-objetos__boton--secundario",
    });

    this.botonRecogerTodo = crearBotonAccion({
      texto: "Recoger todo",

      clase: "modal-contenedor-objetos__boton--secundario",
    });

    this.botonRecogerTodo.title = "Recoger todo (R)";

    this.botonRecogerTodo.setAttribute("aria-keyshortcuts", "R");

    this.botonRecoger = crearBotonAccion({
      texto: "Recoger",

      clase: "modal-contenedor-objetos__boton--principal",
    });

    acciones.append(this.botonCerrar, this.botonRecogerTodo, this.botonRecoger);

    contenido.append(cabecera, cuerpo, acciones);

    this.dialogo.appendChild(contenido);

    document.body.appendChild(this.dialogo);
  }

  registrarEventos() {
    this.dialogo.addEventListener("cancel", this.manejarCierreSolicitado);

    this.dialogo.addEventListener("click", this.manejarClickDialogo);

    this.dialogo.addEventListener("keydown", this.manejarTeclaDialogo);

    this.listaObjetos.addEventListener("click", this.manejarClickLista);

    this.botonCerrarSuperior.addEventListener(
      "click",
      this.manejarCierreSolicitado,
    );

    this.botonCerrar.addEventListener("click", this.manejarCierreSolicitado);

    this.botonRecoger.addEventListener("click", this.ejecutarRecoger);

    this.botonRecogerTodo.addEventListener("click", this.ejecutarRecogerTodo);
  }

  // Abre un contenedor sin consumir tiempo.
  //
  // El coste temporal solamente se registra
  // cuando uno de los callbacks transfiere objetos.
  abrir({
    titulo,
    contenedorObjetos,
    combatiente = null,
    alRecoger,
    alRecogerTodo,
  } = {}) {
    validarApertura({
      titulo,
      contenedorObjetos,
      alRecoger,
      alRecogerTodo,
    });

    this.titulo.textContent = titulo.trim();

    this.contenedorObjetos = contenedorObjetos;

    this.combatiente = combatiente;

    this.alRecoger = alRecoger;

    this.alRecogerTodo = alRecogerTodo;

    this.indiceSeleccionado = null;

    this.actualizar();

    if (!this.dialogo.open) {
      this.dialogo.showModal();
    }

    const primerObjeto = this.listaObjetos.querySelector(
      ".modal-contenedor-objetos__slot",
    );

    (primerObjeto ?? this.botonCerrar).focus();
  }

  // Reconstruye la lista conservando la selección
  // cuando el objeto todavía existe.
  actualizar() {
    if (!this.contenedorObjetos) {
      return;
    }

    const espacios = this.contenedorObjetos.obtenerEspacios();

    const indicesOcupados = espacios
      .map((objeto, indice) => (objeto ? indice : null))
      .filter((indice) => indice !== null);

    if (!indicesOcupados.includes(this.indiceSeleccionado)) {
      this.indiceSeleccionado = indicesOcupados[0] ?? null;
    }

    this.listaObjetos.replaceChildren();

    const fragmento = document.createDocumentFragment();

    for (const indice of indicesOcupados) {
      fragmento.appendChild(
        this.crearSlotObjeto({
          objeto: espacios[indice],

          indice,
        }),
      );
    }

    this.listaObjetos.appendChild(fragmento);

    const estaVacio = indicesOcupados.length === 0;

    this.mensajeVacio.hidden = !estaVacio;

    this.listaObjetos.hidden = estaVacio;

    this.seccionDetalle.hidden = estaVacio;

    this.botonRecoger.disabled = estaVacio;

    this.botonRecogerTodo.disabled = estaVacio;

    if (!estaVacio) {
      this.actualizarDetalle();
    }
  }

  crearSlotObjeto({ objeto, indice }) {
    const boton = document.createElement("button");

    boton.type = "button";

    boton.classList.add("modal-contenedor-objetos__slot");

    boton.dataset.indiceContenedor = `${indice}`;

    boton.setAttribute("role", "option");

    boton.setAttribute("aria-label", `Ver detalles de ${objeto.nombre}`);

    const seleccionado = indice === this.indiceSeleccionado;

    boton.classList.toggle("seleccionado", seleccionado);

    boton.setAttribute("aria-selected", `${seleccionado}`);

    agregarRepresentacionObjeto({
      contenedor: boton,

      objeto,

      claseTexto: "modal-contenedor-objetos__nombre-respaldo",
    });

    const nombre = document.createElement("span");

    nombre.classList.add("modal-contenedor-objetos__nombre");

    nombre.textContent = objeto.nombre;

    boton.appendChild(nombre);

    if (objeto.apilable && objeto.cantidad > 1) {
      const cantidad = document.createElement("span");

      cantidad.classList.add("modal-contenedor-objetos__cantidad");

      cantidad.textContent = `${objeto.cantidad}`;

      boton.appendChild(cantidad);
    }

    return boton;
  }

  actualizarDetalle() {
    const objeto = this.obtenerObjetoSeleccionado();

    if (!objeto) {
      return;
    }

    const presentacion = crearPresentacionObjeto({
      objeto,

      combatiente: this.combatiente,
    });

    this.vistaDetalle.mostrar(presentacion);
  }

  obtenerObjetoSeleccionado() {
    if (!this.contenedorObjetos || this.indiceSeleccionado === null) {
      return null;
    }

    return this.contenedorObjetos.obtenerObjetoEn(this.indiceSeleccionado);
  }

  seleccionarIndice(indice) {
    const objeto = this.contenedorObjetos?.obtenerObjetoEn(indice);

    if (!objeto) {
      return;
    }

    this.indiceSeleccionado = indice;

    this.actualizar();
  }

  manejarClickLista(event) {
    const boton = event.target.closest(".modal-contenedor-objetos__slot");

    if (!boton) {
      return;
    }

    const indice = Number.parseInt(
      boton.dataset.indiceContenedor,

      10,
    );

    if (!Number.isInteger(indice)) {
      return;
    }

    this.seleccionarIndice(indice);
  }

  ejecutarRecoger() {
    if (this.indiceSeleccionado === null || !this.alRecoger) {
      return;
    }

    this.alRecoger(this.indiceSeleccionado);
  }

  ejecutarRecogerTodo() {
    this.alRecogerTodo?.();
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
    // Impide que las teclas del modal alcancen
    // los controladores del mapa.
    event.stopPropagation();

    if (
      event.code !== TECLA_RECOGER_TODO ||
      event.repeat ||
      this.botonRecogerTodo.disabled
    ) {
      return;
    }

    event.preventDefault();

    this.ejecutarRecogerTodo();
  }

  cerrar() {
    if (this.dialogo.open) {
      this.dialogo.close();
    }

    this.contenedorObjetos = null;
    this.combatiente = null;
    this.alRecoger = null;
    this.alRecogerTodo = null;
    this.indiceSeleccionado = null;
  }

  get estaAbierto() {
    return this.dialogo.open;
  }

  destruir() {
    this.cerrar();

    this.dialogo.removeEventListener("cancel", this.manejarCierreSolicitado);

    this.dialogo.removeEventListener("click", this.manejarClickDialogo);

    this.dialogo.removeEventListener("keydown", this.manejarTeclaDialogo);

    this.listaObjetos.removeEventListener("click", this.manejarClickLista);

    this.botonCerrarSuperior.removeEventListener(
      "click",
      this.manejarCierreSolicitado,
    );

    this.botonCerrar.removeEventListener("click", this.manejarCierreSolicitado);

    this.botonRecoger.removeEventListener("click", this.ejecutarRecoger);

    this.botonRecogerTodo.removeEventListener(
      "click",
      this.ejecutarRecogerTodo,
    );

    this.dialogo.remove();
  }
}

function crearBotonAccion({ texto, clase }) {
  const boton = document.createElement("button");

  boton.type = "button";

  boton.classList.add("modal-contenedor-objetos__boton", clase);

  boton.textContent = texto;

  return boton;
}

function validarApertura({
  titulo,
  contenedorObjetos,
  alRecoger,
  alRecogerTodo,
}) {
  if (typeof titulo !== "string" || titulo.trim() === "") {
    throw new Error("El modal necesita un título válido.");
  }

  if (
    !contenedorObjetos ||
    typeof contenedorObjetos.obtenerEspacios !== "function" ||
    typeof contenedorObjetos.obtenerObjetoEn !== "function"
  ) {
    throw new Error("El modal necesita un contenedor de objetos válido.");
  }

  if (typeof alRecoger !== "function" || typeof alRecogerTodo !== "function") {
    throw new Error("El modal necesita acciones válidas para recoger objetos.");
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
