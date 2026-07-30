const ID_HOJA_ESTILOS = "hojaEstilosModalDerrota";

const RUTA_HOJA_ESTILOS = "./modal-derrota.css";

let siguienteIdModal = 1;

// Presenta el cierre de una partida cuando
// el jugador pierde toda su Vida.
//
// La ventana utiliza únicamente información
// disponible en la instancia actual del jugador:
//
// - Nombre.
// - Clase.
// - Nivel.
// - Experiencia.
// - Oro.
export class ModalDerrota {
  constructor() {
    asegurarHojaEstilos();

    this.idTitulo = `tituloModalDerrota${siguienteIdModal}`;

    siguienteIdModal++;

    this.alVolverMenu = null;

    this.manejarCancelacion = this.manejarCancelacion.bind(this);

    this.manejarTecla = this.manejarTecla.bind(this);

    this.volverAlMenu = this.volverAlMenu.bind(this);

    this.construirDialogo();
    this.registrarEventos();
  }

  construirDialogo() {
    this.dialogo = document.createElement("dialog");

    this.dialogo.classList.add("modal-derrota");

    this.dialogo.setAttribute("aria-labelledby", this.idTitulo);

    const contenido = crearElemento("div", "modal-derrota__contenido");

    const cabecera = crearElemento("header", "modal-derrota__cabecera");

    const emblema = crearElemento("div", "modal-derrota__emblema", "☠");

    emblema.setAttribute("aria-hidden", "true");

    const bloqueTitulo = crearElemento("div", "modal-derrota__bloque-titulo");

    this.titulo = crearElemento("h2", "modal-derrota__titulo", "Has caído");

    this.titulo.id = this.idTitulo;

    const descripcion = crearElemento(
      "p",
      "modal-derrota__descripcion",
      "La oscuridad puso fin a esta aventura.",
    );

    bloqueTitulo.append(this.titulo, descripcion);

    cabecera.append(emblema, bloqueTitulo);

    this.resumen = crearElemento("dl", "modal-derrota__resumen");

    this.valorNombre = agregarDatoResumen({
      lista: this.resumen,

      etiqueta: "Nombre",
    });

    this.valorClase = agregarDatoResumen({
      lista: this.resumen,

      etiqueta: "Clase",
    });

    this.valorNivel = agregarDatoResumen({
      lista: this.resumen,

      etiqueta: "Nivel",
    });

    this.valorExperiencia = agregarDatoResumen({
      lista: this.resumen,

      etiqueta: "Experiencia",
    });

    this.valorOro = agregarDatoResumen({
      lista: this.resumen,

      etiqueta: "Oro",

      claseAdicional: "modal-derrota__dato--oro",
    });

    const acciones = crearElemento("footer", "modal-derrota__acciones");

    this.botonVolverMenu = crearElemento(
      "button",
      "modal-derrota__boton",
      "Volver al menú",
    );

    this.botonVolverMenu.type = "button";

    acciones.appendChild(this.botonVolverMenu);

    contenido.append(cabecera, this.resumen, acciones);

    this.dialogo.appendChild(contenido);

    document.body.appendChild(this.dialogo);
  }

  registrarEventos() {
    // La derrota no puede cerrarse con Escape.
    // El jugador debe terminar la partida desde el botón.
    this.dialogo.addEventListener("cancel", this.manejarCancelacion);

    this.dialogo.addEventListener("keydown", this.manejarTecla);

    this.botonVolverMenu.addEventListener("click", this.volverAlMenu);
  }

  abrir({ jugador, alVolverMenu } = {}) {
    validarApertura({
      jugador,
      alVolverMenu,
    });

    this.alVolverMenu = alVolverMenu;

    this.valorNombre.textContent = jugador.nombre;

    this.valorClase.textContent = jugador.clasePersonaje;

    this.valorNivel.textContent = formatearNumero(jugador.nivel);

    this.valorExperiencia.textContent =
      `${formatearNumero(jugador.experiencia)} / ` +
      `${formatearNumero(jugador.experienciaNecesaria)}`;

    this.valorOro.textContent = formatearNumero(jugador.oro);

    if (!this.dialogo.open) {
      this.dialogo.showModal();
    }

    this.botonVolverMenu.focus();
  }

  manejarCancelacion(event) {
    event.preventDefault();
  }

  manejarTecla(event) {
    // Impide que cualquier tecla alcance
    // los controles de la partida derrotada.
    event.stopPropagation();

    if (event.code === "Escape") {
      event.preventDefault();
    }
  }

  volverAlMenu() {
    const callback = this.alVolverMenu;

    this.cerrar();

    callback?.();
  }

  cerrar() {
    if (this.dialogo.open) {
      this.dialogo.close();
    }

    this.alVolverMenu = null;
  }

  get estaAbierto() {
    return this.dialogo.open;
  }

  destruir() {
    this.cerrar();

    this.dialogo.removeEventListener("cancel", this.manejarCancelacion);

    this.dialogo.removeEventListener("keydown", this.manejarTecla);

    this.botonVolverMenu.removeEventListener("click", this.volverAlMenu);

    this.dialogo.remove();
  }
}

function agregarDatoResumen({ lista, etiqueta, claseAdicional = null }) {
  const termino = crearElemento("dt", "modal-derrota__etiqueta", etiqueta);

  const valor = crearElemento("dd", "modal-derrota__valor", "—");

  if (claseAdicional) {
    termino.classList.add(claseAdicional);

    valor.classList.add(claseAdicional);
  }

  lista.append(termino, valor);

  return valor;
}

function crearElemento(etiqueta, clase, texto = "") {
  const elemento = document.createElement(etiqueta);

  elemento.classList.add(clase);

  if (texto !== "") {
    elemento.textContent = texto;
  }

  return elemento;
}

function formatearNumero(valor) {
  return new Intl.NumberFormat("es-UY").format(valor);
}

function validarApertura({ jugador, alVolverMenu }) {
  if (
    !jugador ||
    typeof jugador !== "object" ||
    typeof jugador.nombre !== "string" ||
    jugador.nombre.trim() === "" ||
    typeof jugador.clasePersonaje !== "string" ||
    jugador.clasePersonaje.trim() === "" ||
    !Number.isInteger(jugador.nivel) ||
    !Number.isFinite(jugador.experiencia) ||
    !Number.isFinite(jugador.experienciaNecesaria) ||
    !Number.isSafeInteger(jugador.oro)
  ) {
    throw new Error("ModalDerrota necesita un jugador válido.");
  }

  if (typeof alVolverMenu !== "function") {
    throw new Error("ModalDerrota necesita una acción para volver al menú.");
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
