const ID_HOJA_ESTILOS = "hojaEstilosModalSeleccionMazmorra";

const RUTA_HOJA_ESTILOS = "./modal-seleccion-mazmorra.css";

let siguienteIdModal = 1;

// Presenta las plantillas de mazmorra disponibles
// y devuelve el ID seleccionado al controlador.
//
// El modal no genera mapas ni conoce EstadoPartida.
// Su responsabilidad se limita a mostrar opciones
// y comunicar la elección del jugador.
export class ModalSeleccionMazmorra {
  constructor() {
    asegurarHojaEstilos();

    this.idTitulo = `tituloModalSeleccionMazmorra${siguienteIdModal}`;

    siguienteIdModal++;

    this.mazmorras = [];
    this.idSeleccionado = null;
    this.alConfirmar = null;

    this.manejarCierreSolicitado = this.manejarCierreSolicitado.bind(this);

    this.manejarClickDialogo = this.manejarClickDialogo.bind(this);

    this.manejarTeclaDialogo = this.manejarTeclaDialogo.bind(this);

    this.manejarClickLista = this.manejarClickLista.bind(this);

    this.confirmarSeleccion = this.confirmarSeleccion.bind(this);

    this.construirDialogo();
    this.registrarEventos();
  }

  construirDialogo() {
    this.dialogo = document.createElement("dialog");

    this.dialogo.classList.add("modal-seleccion-mazmorra");

    this.dialogo.setAttribute("aria-labelledby", this.idTitulo);

    const contenido = document.createElement("div");

    contenido.classList.add("modal-seleccion-mazmorra__contenido");

    const cabecera = document.createElement("header");

    cabecera.classList.add("modal-seleccion-mazmorra__cabecera");

    const bloqueTitulo = document.createElement("div");

    bloqueTitulo.classList.add("modal-seleccion-mazmorra__bloque-titulo");

    this.titulo = document.createElement("h2");

    this.titulo.id = this.idTitulo;
    this.titulo.textContent = "Elegir mazmorra";

    this.subtitulo = document.createElement("p");

    this.subtitulo.textContent =
      "Seleccioná el destino de la próxima expedición.";

    bloqueTitulo.append(this.titulo, this.subtitulo);

    this.botonCerrarSuperior = document.createElement("button");

    this.botonCerrarSuperior.type = "button";

    this.botonCerrarSuperior.classList.add(
      "modal-seleccion-mazmorra__cerrar-superior",
    );

    this.botonCerrarSuperior.textContent = "×";
    this.botonCerrarSuperior.title = "Cerrar";

    this.botonCerrarSuperior.setAttribute(
      "aria-label",
      "Cerrar selección de mazmorra",
    );

    cabecera.append(bloqueTitulo, this.botonCerrarSuperior);

    const cuerpo = document.createElement("div");

    cuerpo.classList.add("modal-seleccion-mazmorra__cuerpo");

    this.listaMazmorras = document.createElement("div");

    this.listaMazmorras.classList.add("modal-seleccion-mazmorra__lista");

    this.listaMazmorras.setAttribute("role", "listbox");

    this.detalle = document.createElement("section");

    this.detalle.classList.add("modal-seleccion-mazmorra__detalle");

    this.detalle.setAttribute("aria-live", "polite");

    cuerpo.append(this.listaMazmorras, this.detalle);

    const acciones = document.createElement("footer");

    acciones.classList.add("modal-seleccion-mazmorra__acciones");

    this.botonCancelar = crearBoton({
      texto: "Cancelar",
      clase: "modal-seleccion-mazmorra__boton--secundario",
    });

    this.botonConfirmar = crearBoton({
      texto: "Entrar",
      clase: "modal-seleccion-mazmorra__boton--principal",
    });

    acciones.append(this.botonCancelar, this.botonConfirmar);

    contenido.append(cabecera, cuerpo, acciones);

    this.dialogo.appendChild(contenido);
    document.body.appendChild(this.dialogo);
  }

  registrarEventos() {
    this.dialogo.addEventListener("cancel", this.manejarCierreSolicitado);

    this.dialogo.addEventListener("click", this.manejarClickDialogo);

    this.dialogo.addEventListener("keydown", this.manejarTeclaDialogo);

    this.listaMazmorras.addEventListener("click", this.manejarClickLista);

    this.botonCerrarSuperior.addEventListener(
      "click",
      this.manejarCierreSolicitado,
    );

    this.botonCancelar.addEventListener("click", this.manejarCierreSolicitado);

    this.botonConfirmar.addEventListener("click", this.confirmarSeleccion);
  }

  abrir({ mazmorras, alConfirmar } = {}) {
    validarApertura({
      mazmorras,
      alConfirmar,
    });

    this.mazmorras = mazmorras.map((mazmorra) => ({
      ...mazmorra,

      enemigos: [...(mazmorra.enemigos ?? [])],
    }));

    this.alConfirmar = alConfirmar;

    this.idSeleccionado = this.mazmorras[0].id;

    this.actualizar();

    if (!this.dialogo.open) {
      this.dialogo.showModal();
    }

    const opcionSeleccionada = this.listaMazmorras.querySelector(
      '[aria-selected="true"]',
    );

    (opcionSeleccionada ?? this.botonCancelar).focus();
  }

  actualizar() {
    this.listaMazmorras.replaceChildren();

    const fragmento = document.createDocumentFragment();

    for (const mazmorra of this.mazmorras) {
      fragmento.appendChild(this.crearOpcionMazmorra(mazmorra));
    }

    this.listaMazmorras.appendChild(fragmento);

    this.actualizarDetalle();
  }

  crearOpcionMazmorra(mazmorra) {
    const boton = document.createElement("button");

    boton.type = "button";

    boton.classList.add("modal-seleccion-mazmorra__opcion");

    boton.dataset.idMazmorra = mazmorra.id;

    boton.setAttribute("role", "option");

    const seleccionado = mazmorra.id === this.idSeleccionado;

    boton.classList.toggle("seleccionada", seleccionado);

    boton.setAttribute("aria-selected", `${seleccionado}`);

    const nombre = document.createElement("strong");

    nombre.classList.add("modal-seleccion-mazmorra__nombre");

    nombre.textContent = mazmorra.nombre;

    const descripcion = document.createElement("span");

    descripcion.classList.add("modal-seleccion-mazmorra__descripcion-corta");

    descripcion.textContent = mazmorra.descripcion;

    const resumen = document.createElement("span");

    resumen.classList.add("modal-seleccion-mazmorra__resumen");

    resumen.textContent =
      crearTextoNivel(mazmorra) + ` · ${formatearTexto(mazmorra.bioma)}`;

    boton.append(nombre, descripcion, resumen);

    return boton;
  }

  actualizarDetalle() {
    const mazmorra = this.obtenerMazmorraSeleccionada();

    this.detalle.replaceChildren();

    if (!mazmorra) {
      this.botonConfirmar.disabled = true;
      return;
    }

    this.botonConfirmar.disabled = false;

    this.botonConfirmar.textContent = `Entrar a ${mazmorra.nombre}`;

    const titulo = document.createElement("h3");

    titulo.textContent = mazmorra.nombre;

    const descripcion = document.createElement("p");

    descripcion.classList.add("modal-seleccion-mazmorra__descripcion");

    descripcion.textContent = mazmorra.descripcion;

    const datos = document.createElement("dl");

    datos.classList.add("modal-seleccion-mazmorra__datos");

    agregarDato({
      lista: datos,
      termino: "Nivel",
      valor: crearTextoNivel(mazmorra),
    });

    agregarDato({
      lista: datos,
      termino: "Tamaño",
      valor: crearTextoDimensiones(mazmorra),
    });

    agregarDato({
      lista: datos,
      termino: "Enemigos",
      valor: crearTextoEnemigos(mazmorra),
    });

    agregarDato({
      lista: datos,
      termino: "Cantidad",
      valor: crearTextoCantidadEnemigos(mazmorra),
    });

    this.detalle.append(titulo, descripcion, datos);
  }

  seleccionar(idMazmorra) {
    const existe = this.mazmorras.some(
      (mazmorra) => mazmorra.id === idMazmorra,
    );

    if (!existe) {
      return;
    }

    this.idSeleccionado = idMazmorra;
    this.actualizar();
  }

  obtenerMazmorraSeleccionada() {
    return (
      this.mazmorras.find((mazmorra) => mazmorra.id === this.idSeleccionado) ??
      null
    );
  }

  manejarClickLista(event) {
    const boton = event.target.closest(".modal-seleccion-mazmorra__opcion");

    if (!boton) {
      return;
    }

    this.seleccionar(boton.dataset.idMazmorra);
  }

  confirmarSeleccion() {
    const mazmorra = this.obtenerMazmorraSeleccionada();

    if (!mazmorra || !this.alConfirmar) {
      return;
    }

    const alConfirmar = this.alConfirmar;

    const idMazmorra = mazmorra.id;

    // Cerramos primero para que el cambio de mapa
    // no deje una ventana perteneciente al mapa anterior.
    this.cerrar();

    alConfirmar(idMazmorra);
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
    // del modal alcancen los controladores del mapa.
    event.stopPropagation();
  }

  cerrar() {
    if (this.dialogo.open) {
      this.dialogo.close();
    }

    this.mazmorras = [];
    this.idSeleccionado = null;
    this.alConfirmar = null;
  }

  get estaAbierto() {
    return this.dialogo.open;
  }

  destruir() {
    this.cerrar();

    this.dialogo.removeEventListener("cancel", this.manejarCierreSolicitado);

    this.dialogo.removeEventListener("click", this.manejarClickDialogo);

    this.dialogo.removeEventListener("keydown", this.manejarTeclaDialogo);

    this.listaMazmorras.removeEventListener("click", this.manejarClickLista);

    this.botonCerrarSuperior.removeEventListener(
      "click",
      this.manejarCierreSolicitado,
    );

    this.botonCancelar.removeEventListener(
      "click",
      this.manejarCierreSolicitado,
    );

    this.botonConfirmar.removeEventListener("click", this.confirmarSeleccion);

    this.dialogo.remove();
  }
}

function crearBoton({ texto, clase }) {
  const boton = document.createElement("button");

  boton.type = "button";

  boton.classList.add("modal-seleccion-mazmorra__boton", clase);

  boton.textContent = texto;

  return boton;
}

function agregarDato({ lista, termino, valor }) {
  const elementoTermino = document.createElement("dt");

  elementoTermino.textContent = termino;

  const elementoValor = document.createElement("dd");

  elementoValor.textContent = valor;

  lista.append(elementoTermino, elementoValor);
}

function crearTextoNivel(mazmorra) {
  if (mazmorra.nivelMinimo === mazmorra.nivelMaximo) {
    return `Nivel ${mazmorra.nivelMinimo}`;
  }

  return `Niveles ${mazmorra.nivelMinimo}` + `–${mazmorra.nivelMaximo}`;
}

function crearTextoDimensiones(mazmorra) {
  const ancho = crearTextoRango(mazmorra.anchoMinimo, mazmorra.anchoMaximo);

  const alto = crearTextoRango(mazmorra.altoMinimo, mazmorra.altoMaximo);

  return `${ancho} × ${alto} casillas`;
}

function crearTextoEnemigos(mazmorra) {
  if (mazmorra.enemigos.length === 0) {
    return "Sin enemigos configurados";
  }

  return mazmorra.enemigos.map(formatearTexto).join(", ");
}

function crearTextoCantidadEnemigos(mazmorra) {
  return crearTextoRango(
    mazmorra.cantidadEnemigosMinima,
    mazmorra.cantidadEnemigosMaxima,
  );
}

function crearTextoRango(minimo, maximo) {
  return minimo === maximo ? `${minimo}` : `${minimo}–${maximo}`;
}

function formatearTexto(valor) {
  return `${valor}`
    .replaceAll("_", " ")
    .replace(/^./, (letra) => letra.toUpperCase());
}

function validarApertura({ mazmorras, alConfirmar }) {
  if (!Array.isArray(mazmorras) || mazmorras.length === 0) {
    throw new Error("El selector necesita al menos una mazmorra disponible.");
  }

  if (typeof alConfirmar !== "function") {
    throw new Error(
      "El selector necesita una acción para confirmar la mazmorra.",
    );
  }

  for (const mazmorra of mazmorras) {
    validarMazmorra(mazmorra);
  }
}

function validarMazmorra(mazmorra) {
  if (!mazmorra || typeof mazmorra !== "object" || Array.isArray(mazmorra)) {
    throw new Error("El selector recibió una mazmorra inválida.");
  }

  const textos = ["id", "nombre", "descripcion", "bioma"];

  for (const propiedad of textos) {
    if (
      typeof mazmorra[propiedad] !== "string" ||
      mazmorra[propiedad].trim() === ""
    ) {
      throw new Error(`La mazmorra necesita la propiedad "${propiedad}".`);
    }
  }
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
