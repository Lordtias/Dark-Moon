const ID_HOJA_ESTILOS = "hojaEstilosModalSeleccionMazmorra";

const RUTA_HOJA_ESTILOS = "./modal-seleccion-mazmorra.css";

const ID_HOJA_ESTILOS_NIVEL = "hojaEstilosNivelExpedicion";

const RUTA_HOJA_ESTILOS_NIVEL = "./nivel-expedicion.css";

let siguienteIdModal = 1;

// Presenta las plantillas de mazmorra disponibles,
// permite elegir su nivel y devuelve ambos valores
// al controlador.
//
// El modal no genera mapas ni conoce EstadoPartida.
export class ModalSeleccionMazmorra {
  constructor() {
    asegurarHojaEstilos({
      id: ID_HOJA_ESTILOS,

      ruta: RUTA_HOJA_ESTILOS,
    });

    asegurarHojaEstilos({
      id: ID_HOJA_ESTILOS_NIVEL,

      ruta: RUTA_HOJA_ESTILOS_NIVEL,
    });

    this.idTitulo = `tituloModalSeleccionMazmorra${siguienteIdModal}`;

    siguienteIdModal++;

    this.mazmorras = [];
    this.idSeleccionado = null;
    this.nivelSeleccionado = null;
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

    this.titulo.textContent = "Elegir expedición";

    this.subtitulo = document.createElement("p");

    this.subtitulo.textContent =
      "Seleccioná el destino y el nivel de la próxima expedición.";

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
      "Cerrar selección de expedición",
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

    this.nivelSeleccionado = this.mazmorras[0].nivelSugerido;

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

    this.normalizarNivelSeleccionado(mazmorra);

    this.botonConfirmar.disabled = false;

    this.botonConfirmar.textContent = `Entrar a ${mazmorra.nombre} · Nivel ${this.nivelSeleccionado}`;

    const titulo = document.createElement("h3");

    titulo.textContent = mazmorra.nombre;

    const descripcion = document.createElement("p");

    descripcion.classList.add("modal-seleccion-mazmorra__descripcion");

    descripcion.textContent = mazmorra.descripcion;

    const selectorNivel = this.crearSelectorNivel(mazmorra);

    const datos = document.createElement("dl");

    datos.classList.add("modal-seleccion-mazmorra__datos");

    agregarDato({
      lista: datos,

      termino: "Rango disponible",

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

    this.detalle.append(titulo, descripcion, selectorNivel, datos);
  }

  crearSelectorNivel(mazmorra) {
    const contenedor = document.createElement("section");

    contenedor.classList.add("selector-nivel-expedicion");

    const cabecera = document.createElement("div");

    cabecera.classList.add("selector-nivel-expedicion__cabecera");

    const titulo = document.createElement("h4");

    titulo.classList.add("selector-nivel-expedicion__titulo");

    titulo.textContent = "Nivel de expedición";

    const rango = document.createElement("span");

    rango.classList.add("selector-nivel-expedicion__rango");

    rango.textContent = `${mazmorra.nivelMinimo}–${mazmorra.nivelMaximo}`;

    cabecera.append(titulo, rango);

    const controles = document.createElement("div");

    controles.classList.add("selector-nivel-expedicion__controles");

    const botonDisminuir = crearBotonNivel({
      texto: "−",

      etiqueta: "Disminuir nivel de expedición",
    });

    botonDisminuir.disabled = this.nivelSeleccionado <= mazmorra.nivelMinimo;

    botonDisminuir.addEventListener(
      "click",

      () => this.cambiarNivel(-1),
    );

    const valor = document.createElement("strong");

    valor.classList.add("selector-nivel-expedicion__valor");

    valor.textContent = `${this.nivelSeleccionado}`;

    const botonAumentar = crearBotonNivel({
      texto: "+",

      etiqueta: "Aumentar nivel de expedición",
    });

    botonAumentar.disabled = this.nivelSeleccionado >= mazmorra.nivelMaximo;

    botonAumentar.addEventListener(
      "click",

      () => this.cambiarNivel(1),
    );

    controles.append(botonDisminuir, valor, botonAumentar);

    const riesgo = crearPresentacionRiesgo({
      nivelMapa: this.nivelSeleccionado,

      nivelJugador: mazmorra.nivelJugador,
    });

    const resumen = document.createElement("div");

    resumen.classList.add("selector-nivel-expedicion__resumen");

    const nivelJugador = document.createElement("span");

    nivelJugador.textContent = `Tu nivel: ${mazmorra.nivelJugador}`;

    const etiquetaRiesgo = document.createElement("strong");

    etiquetaRiesgo.classList.add(
      "selector-nivel-expedicion__riesgo",
      `selector-nivel-expedicion__riesgo--${riesgo.id}`,
    );

    etiquetaRiesgo.textContent = riesgo.texto;

    resumen.append(nivelJugador, etiquetaRiesgo);

    contenedor.append(cabecera, controles, resumen);

    return contenedor;
  }

  seleccionar(idMazmorra) {
    const mazmorra = this.mazmorras.find((opcion) => opcion.id === idMazmorra);

    if (!mazmorra) {
      return;
    }

    this.idSeleccionado = idMazmorra;

    // Cada cambio de plantilla recupera
    // el nivel sugerido para el jugador.
    this.nivelSeleccionado = mazmorra.nivelSugerido;

    this.actualizar();
  }

  cambiarNivel(diferencia) {
    const mazmorra = this.obtenerMazmorraSeleccionada();

    if (!mazmorra) {
      return;
    }

    this.nivelSeleccionado = Math.max(
      mazmorra.nivelMinimo,

      Math.min(
        mazmorra.nivelMaximo,

        this.nivelSeleccionado + diferencia,
      ),
    );

    this.actualizarDetalle();
  }

  normalizarNivelSeleccionado(mazmorra) {
    const nivelBase = Number.isInteger(this.nivelSeleccionado)
      ? this.nivelSeleccionado
      : mazmorra.nivelSugerido;

    this.nivelSeleccionado = Math.max(
      mazmorra.nivelMinimo,

      Math.min(mazmorra.nivelMaximo, nivelBase),
    );
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

    const seleccion = {
      idMazmorra: mazmorra.id,

      nivelMapa: this.nivelSeleccionado,
    };

    // Cerramos primero para que el cambio
    // de mapa no deje una ventana perteneciente
    // al mapa anterior.
    this.cerrar();

    alConfirmar(seleccion);
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
    this.nivelSeleccionado = null;
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

function crearBotonNivel({ texto, etiqueta }) {
  const boton = document.createElement("button");

  boton.type = "button";

  boton.classList.add("selector-nivel-expedicion__boton");

  boton.textContent = texto;

  boton.setAttribute("aria-label", etiqueta);

  return boton;
}

function agregarDato({ lista, termino, valor }) {
  const elementoTermino = document.createElement("dt");

  elementoTermino.textContent = termino;

  const elementoValor = document.createElement("dd");

  elementoValor.textContent = valor;

  lista.append(elementoTermino, elementoValor);
}

function crearPresentacionRiesgo({ nivelMapa, nivelJugador }) {
  const diferencia = nivelMapa - nivelJugador;

  if (diferencia <= -1) {
    return {
      id: "favorable",

      texto: "Favorable",
    };
  }

  if (diferencia === 0) {
    return {
      id: "equilibrado",

      texto: "Equilibrado",
    };
  }

  if (diferencia === 1) {
    return {
      id: "desafiante",

      texto: "Desafiante",
    };
  }

  return {
    id: "peligroso",

    texto: "Peligroso",
  };
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
  return `${valor}`.replaceAll("_", " ").replace(
    /^./,

    (letra) => letra.toUpperCase(),
  );
}

function validarApertura({ mazmorras, alConfirmar }) {
  if (!Array.isArray(mazmorras) || mazmorras.length === 0) {
    throw new Error("El selector necesita al menos una mazmorra disponible.");
  }

  if (typeof alConfirmar !== "function") {
    throw new Error(
      "El selector necesita una acción para confirmar la expedición.",
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

  const enteros = [
    "nivelJugador",
    "nivelSugerido",
    "nivelMinimo",
    "nivelMaximo",
    "anchoMinimo",
    "anchoMaximo",
    "altoMinimo",
    "altoMaximo",
    "cantidadEnemigosMinima",
    "cantidadEnemigosMaxima",
  ];

  for (const propiedad of enteros) {
    if (!Number.isInteger(mazmorra[propiedad])) {
      throw new Error(
        `La mazmorra necesita un valor entero en "${propiedad}".`,
      );
    }
  }

  if (
    mazmorra.nivelJugador < 1 ||
    mazmorra.nivelMinimo < 1 ||
    mazmorra.nivelMaximo < mazmorra.nivelMinimo
  ) {
    throw new Error(
      `El rango de niveles de "${mazmorra.nombre}" no es válido.`,
    );
  }

  if (
    mazmorra.nivelSugerido < mazmorra.nivelMinimo ||
    mazmorra.nivelSugerido > mazmorra.nivelMaximo
  ) {
    throw new Error(
      `El nivel sugerido de "${mazmorra.nombre}" está fuera de su rango.`,
    );
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
