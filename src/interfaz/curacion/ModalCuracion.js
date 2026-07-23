import { TIPOS_SERVICIO_CURACION } from "../../juego/curacion/ConfiguracionCuracion.js";

const ID_HOJA_ESTILOS = "hojaEstilosModalCuracion";

const RUTA_HOJA_ESTILOS = "./modal-curacion.css";

const ID_PLANTILLA_MODAL = "plantillaModalCuracion";

let siguienteIdModal = 1;

// Presenta los servicios de una curandera.
//
// La ventana no calcula precios ni modifica recursos.
// Recibe callbacks para consultar el estado actual
// y ejecutar la operación seleccionada.
export class ModalCuracion {
  constructor() {
    asegurarHojaEstilos();

    this.idTitulo = `tituloModalCuracion${siguienteIdModal}`;

    siguienteIdModal++;

    this.curandera = null;
    this.jugador = null;
    this.calcularEstado = null;
    this.alCurar = null;

    this.manejarCierreSolicitado = this.manejarCierreSolicitado.bind(this);

    this.manejarClickDialogo = this.manejarClickDialogo.bind(this);

    this.manejarTeclaDialogo = this.manejarTeclaDialogo.bind(this);

    this.construirDialogo();
    this.registrarEventos();
  }

  construirDialogo() {
    const plantilla = document.getElementById(ID_PLANTILLA_MODAL);

    if (!(plantilla instanceof HTMLTemplateElement)) {
      throw new Error(
        `No existe la plantilla "${ID_PLANTILLA_MODAL}" ` +
          "del modal de curación.",
      );
    }

    const dialogo = plantilla.content.firstElementChild?.cloneNode(true);

    if (!(dialogo instanceof HTMLElement) || dialogo.tagName !== "DIALOG") {
      throw new Error(
        "La plantilla del modal de curación " +
          "no contiene un diálogo válido.",
      );
    }

    this.dialogo = dialogo;

    this.dialogo.setAttribute("aria-labelledby", this.idTitulo);

    this.titulo = this.dialogo.querySelector(".modal-curacion__titulo");

    if (!this.titulo) {
      throw new Error(
        "La plantilla del modal de curación " + "no contiene su título.",
      );
    }

    // Cada instancia recibe un identificador propio
    // para mantener correctamente vinculados
    // el diálogo y su título accesible.
    this.titulo.id = this.idTitulo;

    this.valorOro = this.dialogo.querySelector(".modal-curacion__oro");

    this.mensajeEstado = this.dialogo.querySelector(
      ".modal-curacion__mensaje-estado",
    );

    this.botonCerrarSuperior = this.dialogo.querySelector(
      ".modal-curacion__cerrar-superior",
    );

    this.botonCerrar = this.dialogo.querySelector("[data-cerrar-curacion]");

    this.tarjetas = {
      [TIPOS_SERVICIO_CURACION.VIDA]: obtenerReferenciasTarjeta(
        this.dialogo,
        TIPOS_SERVICIO_CURACION.VIDA,
      ),

      [TIPOS_SERVICIO_CURACION.MANA]: obtenerReferenciasTarjeta(
        this.dialogo,
        TIPOS_SERVICIO_CURACION.MANA,
      ),

      [TIPOS_SERVICIO_CURACION.AMBOS]: obtenerReferenciasTarjeta(
        this.dialogo,
        TIPOS_SERVICIO_CURACION.AMBOS,
      ),
    };

    document.body.appendChild(this.dialogo);
  }

  registrarEventos() {
    this.dialogo.addEventListener("cancel", this.manejarCierreSolicitado);

    this.dialogo.addEventListener("click", this.manejarClickDialogo);

    this.dialogo.addEventListener("keydown", this.manejarTeclaDialogo);

    this.botonCerrarSuperior.addEventListener(
      "click",
      this.manejarCierreSolicitado,
    );

    this.botonCerrar.addEventListener("click", this.manejarCierreSolicitado);
  }

  abrir({ curandera, jugador, calcularEstado, alCurar } = {}) {
    validarApertura({
      curandera,
      jugador,
      calcularEstado,
      alCurar,
    });

    this.curandera = curandera;
    this.jugador = jugador;
    this.calcularEstado = calcularEstado;
    this.alCurar = alCurar;

    this.titulo.textContent = curandera.nombre;

    this.limpiarMensaje();
    this.actualizar();

    if (!this.dialogo.open) {
      this.dialogo.showModal();
    }

    const primerBotonDisponible = this.dialogo.querySelector(
      "[data-accion-curacion]:not(:disabled)",
    );

    (primerBotonDisponible ?? this.botonCerrar).focus();
  }

  actualizar() {
    if (!this.jugador || !this.calcularEstado) {
      return;
    }

    const estado = this.calcularEstado();

    validarEstadoCuracion(estado);

    this.valorOro.textContent = formatearNumero(estado.oro);

    this.actualizarRecurso({
      tarjeta: this.tarjetas[TIPOS_SERVICIO_CURACION.VIDA],

      servicio: estado.vida,

      nombreRecurso: "Vida",
    });

    this.actualizarRecurso({
      tarjeta: this.tarjetas[TIPOS_SERVICIO_CURACION.MANA],

      servicio: estado.mana,

      nombreRecurso: "Maná",
    });

    this.actualizarAmbos(estado.ambos);
  }

  actualizarRecurso({ tarjeta, servicio, nombreRecurso }) {
    tarjeta.actual.textContent =
      `${formatearNumero(servicio.actual)} / ` +
      `${formatearNumero(servicio.maximo)}`;

    tarjeta.faltante.textContent = formatearNumero(servicio.faltante);

    tarjeta.precio.textContent = crearTextoMonedas(servicio.precio);

    actualizarBoton({
      boton: tarjeta.boton,

      servicio,

      textoDisponible: `Restaurar ${nombreRecurso}`,

      textoCompleto: `${nombreRecurso} completa`,
    });
  }

  actualizarAmbos(servicio) {
    const tarjeta = this.tarjetas[TIPOS_SERVICIO_CURACION.AMBOS];

    tarjeta.vidaFaltante.textContent = formatearNumero(servicio.vidaFaltante);

    tarjeta.manaFaltante.textContent = formatearNumero(servicio.manaFaltante);

    tarjeta.precio.textContent = crearTextoMonedas(servicio.precio);

    actualizarBoton({
      boton: tarjeta.boton,

      servicio,

      textoDisponible: "Restaurar todo",

      textoCompleto: "Recursos completos",
    });
  }

  manejarClickDialogo(event) {
    if (event.target === this.dialogo) {
      this.cerrar();
      return;
    }

    const botonServicio = event.target.closest("[data-accion-curacion]");

    if (!botonServicio || botonServicio.disabled || !this.alCurar) {
      return;
    }

    const resultado = this.alCurar(botonServicio.dataset.accionCuracion);

    this.mostrarMensaje(resultado);
    this.actualizar();
  }

  mostrarMensaje(resultado) {
    this.mensajeEstado.textContent = resultado?.mensaje ?? "";

    this.mensajeEstado.classList.toggle(
      "modal-curacion__mensaje-estado--error",
      resultado?.exito === false,
    );

    this.mensajeEstado.classList.toggle(
      "modal-curacion__mensaje-estado--exito",
      resultado?.exito === true,
    );
  }

  limpiarMensaje() {
    this.mensajeEstado.textContent = "";

    this.mensajeEstado.classList.remove(
      "modal-curacion__mensaje-estado--error",
      "modal-curacion__mensaje-estado--exito",
    );
  }

  manejarCierreSolicitado(event) {
    event?.preventDefault();
    this.cerrar();
  }

  manejarTeclaDialogo(event) {
    // Impide que las teclas utilizadas
    // dentro del modal alcancen
    // los controles del mapa.
    event.stopPropagation();
  }

  cerrar() {
    if (this.dialogo.open) {
      this.dialogo.close();
    }

    this.curandera = null;
    this.jugador = null;
    this.calcularEstado = null;
    this.alCurar = null;

    this.limpiarMensaje();
  }

  destruir() {
    this.cerrar();

    this.dialogo.removeEventListener("cancel", this.manejarCierreSolicitado);

    this.dialogo.removeEventListener("click", this.manejarClickDialogo);

    this.dialogo.removeEventListener("keydown", this.manejarTeclaDialogo);

    this.botonCerrarSuperior.removeEventListener(
      "click",
      this.manejarCierreSolicitado,
    );

    this.botonCerrar.removeEventListener("click", this.manejarCierreSolicitado);

    this.dialogo.remove();
  }

  get estaAbierto() {
    return this.dialogo.open;
  }
}

function obtenerReferenciasTarjeta(dialogo, tipo) {
  const elemento = dialogo.querySelector(`[data-servicio-curacion="${tipo}"]`);

  if (!elemento) {
    throw new Error(
      `No se pudo construir la tarjeta ` + `de curación "${tipo}".`,
    );
  }

  return {
    elemento,

    actual: elemento.querySelector('[data-campo-curacion="actual"]'),

    faltante: elemento.querySelector('[data-campo-curacion="faltante"]'),

    vidaFaltante: elemento.querySelector(
      '[data-campo-curacion="vida-faltante"]',
    ),

    manaFaltante: elemento.querySelector(
      '[data-campo-curacion="mana-faltante"]',
    ),

    precio: elemento.querySelector('[data-campo-curacion="precio"]'),

    boton: elemento.querySelector("[data-accion-curacion]"),
  };
}

function actualizarBoton({ boton, servicio, textoDisponible, textoCompleto }) {
  if (!servicio.necesitaRecuperacion) {
    boton.textContent = textoCompleto;

    boton.disabled = true;
    return;
  }

  if (!servicio.puedePagar) {
    boton.textContent = "Oro insuficiente";

    boton.disabled = true;
    return;
  }

  boton.textContent =
    `${textoDisponible} · ` + `${crearTextoMonedas(servicio.precio)}`;

  boton.disabled = false;
}

function crearTextoMonedas(cantidad) {
  if (cantidad === 0) {
    return "Sin costo";
  }

  return cantidad === 1 ? "1 moneda" : `${formatearNumero(cantidad)} monedas`;
}

function formatearNumero(cantidad) {
  return new Intl.NumberFormat("es-UY", {
    maximumFractionDigits: 2,
  }).format(cantidad);
}

function validarApertura({ curandera, jugador, calcularEstado, alCurar }) {
  if (
    !curandera ||
    typeof curandera.nombre !== "string" ||
    curandera.nombre.trim() === ""
  ) {
    throw new Error("ModalCuracion necesita una curandera válida.");
  }

  if (
    !jugador ||
    !Number.isFinite(jugador.vidaActual) ||
    !Number.isFinite(jugador.manaActual) ||
    !Number.isSafeInteger(jugador.oro)
  ) {
    throw new Error("ModalCuracion necesita un jugador válido.");
  }

  if (typeof calcularEstado !== "function" || typeof alCurar !== "function") {
    throw new Error(
      "ModalCuracion necesita todas " + "sus acciones de curación.",
    );
  }
}

function validarEstadoCuracion(estado) {
  if (
    !estado ||
    !Number.isSafeInteger(estado.oro) ||
    !estado.vida ||
    !estado.mana ||
    !estado.ambos
  ) {
    throw new Error("El estado recibido por ModalCuracion " + "no es válido.");
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
