import { TIPOS_SERVICIO_CURACION } from "../../juego/curacion/ConfiguracionCuracion.js";

const ID_HOJA_ESTILOS = "hojaEstilosModalCuracion";

const RUTA_HOJA_ESTILOS = "./modal-curacion.css";

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
    this.dialogo = document.createElement("dialog");

    this.dialogo.classList.add("modal-curacion");

    this.dialogo.setAttribute("aria-labelledby", this.idTitulo);

    this.dialogo.innerHTML = `
      <div class="modal-curacion__contenido">
        <header class="modal-curacion__cabecera">
          <div>
            <h2
              class="modal-curacion__titulo"
              id="${this.idTitulo}"
            ></h2>

            <p class="modal-curacion__subtitulo">
              Restaurá tus recursos antes de una nueva expedición.
            </p>
          </div>

          <div class="modal-curacion__estado-jugador">
            <span class="modal-curacion__estado-etiqueta">
              Oro
            </span>

            <strong class="modal-curacion__oro">
              0
            </strong>

            <button
              class="modal-curacion__cerrar-superior"
              type="button"
              aria-label="Cerrar servicios de curación"
              title="Cerrar"
            >
              ×
            </button>
          </div>
        </header>

        <p class="modal-curacion__introduccion">
          El precio depende únicamente de los puntos que necesites recuperar.
        </p>

        <div class="modal-curacion__servicios">
          ${crearPlantillaServicio({
            tipo: TIPOS_SERVICIO_CURACION.VIDA,
            titulo: "Restaurar Vida",
            descripcion: "Completa todos los puntos de Vida faltantes.",
            icono: "♥",
          })}

          ${crearPlantillaServicio({
            tipo: TIPOS_SERVICIO_CURACION.MANA,
            titulo: "Restaurar Maná",
            descripcion: "Completa todos los puntos de Maná faltantes.",
            icono: "✦",
          })}

          <section
            class="modal-curacion__servicio modal-curacion__servicio--ambos"
            data-servicio-curacion="${TIPOS_SERVICIO_CURACION.AMBOS}"
          >
            <div class="modal-curacion__servicio-cabecera">
              <span
                class="modal-curacion__servicio-icono"
                aria-hidden="true"
              >
                ✚
              </span>

              <div>
                <h3 class="modal-curacion__servicio-titulo">
                  Restaurar todo
                </h3>

                <p class="modal-curacion__servicio-descripcion">
                  Completa Vida y Maná en una sola operación.
                </p>
              </div>
            </div>

            <div class="modal-curacion__resumen">
              ${crearPlantillaFila("Vida faltante", "vida-faltante")}

              ${crearPlantillaFila("Maná faltante", "mana-faltante")}

              ${crearPlantillaFila("Precio total", "precio")}
            </div>

            <button
              class="modal-curacion__boton modal-curacion__boton--principal"
              type="button"
              data-accion-curacion="${TIPOS_SERVICIO_CURACION.AMBOS}"
            >
              Calcular servicio
            </button>
          </section>
        </div>

        <footer class="modal-curacion__acciones">
          <p class="modal-curacion__mensaje-estado"></p>

          <button
            class="modal-curacion__boton modal-curacion__boton--secundario"
            type="button"
            data-cerrar-curacion
          >
            Cerrar
          </button>
        </footer>
      </div>
    `;

    this.titulo = this.dialogo.querySelector(".modal-curacion__titulo");

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

function crearPlantillaServicio({ tipo, titulo, descripcion, icono }) {
  return `
    <section
      class="modal-curacion__servicio modal-curacion__servicio--${tipo}"
      data-servicio-curacion="${tipo}"
    >
      <div class="modal-curacion__servicio-cabecera">
        <span
          class="modal-curacion__servicio-icono"
          aria-hidden="true"
        >
          ${icono}
        </span>

        <div>
          <h3 class="modal-curacion__servicio-titulo">
            ${titulo}
          </h3>

          <p class="modal-curacion__servicio-descripcion">
            ${descripcion}
          </p>
        </div>
      </div>

      <div class="modal-curacion__resumen">
        ${crearPlantillaFila("Estado actual", "actual")}

        ${crearPlantillaFila("Puntos faltantes", "faltante")}

        ${crearPlantillaFila("Precio", "precio")}
      </div>

      <button
        class="modal-curacion__boton modal-curacion__boton--principal"
        type="button"
        data-accion-curacion="${tipo}"
      >
        Calcular servicio
      </button>
    </section>
  `;
}

function crearPlantillaFila(etiqueta, campo) {
  return `
    <div class="modal-curacion__resumen-fila">
      <span class="modal-curacion__resumen-etiqueta">
        ${etiqueta}
      </span>

      <strong
        class="modal-curacion__resumen-valor"
        data-campo-curacion="${campo}"
      >
        —
      </strong>
    </div>
  `;
}

function obtenerReferenciasTarjeta(dialogo, tipo) {
  const elemento = dialogo.querySelector(`[data-servicio-curacion="${tipo}"]`);

  if (!elemento) {
    throw new Error(`No se pudo construir la tarjeta de curación "${tipo}".`);
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
    throw new Error("ModalCuracion necesita todas sus acciones de curación.");
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
    throw new Error("El estado recibido por ModalCuracion no es válido.");
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
