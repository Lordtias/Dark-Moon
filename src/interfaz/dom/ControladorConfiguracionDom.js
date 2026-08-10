import { limitar } from "../../utilidades/Numeros.js";
import { traducir } from "../idiomas/ContextoIdioma.js";

const CLAVES_VELOCIDAD = Object.freeze({
  normal: "interfaz.configuracion.velocidadNormal",
  rapida: "interfaz.configuracion.velocidadRapida",
  "muy-rapida": "interfaz.configuracion.velocidadMuyRapida",
});

export class ControladorConfiguracionDom {
  constructor({
    selectorVelocidad,
    casillaEfectosReducidos,
    botonZoomMenos,
    botonZoomMas,
    valorZoom,
    botonPantallaCompleta,
    botonRestablecer,
    mensajeConfiguracion,
    documento = globalThis.document,
  } = {}) {
    this.selectorVelocidad = validarElemento(
      selectorVelocidad,
      "selector de velocidad de animaciones",
    );
    this.casillaEfectosReducidos = validarElemento(
      casillaEfectosReducidos,
      "casilla de efectos reducidos",
    );
    this.botonZoomMenos = validarElemento(
      botonZoomMenos,
      "botón para reducir zoom",
    );
    this.botonZoomMas = validarElemento(
      botonZoomMas,
      "botón para aumentar zoom",
    );
    this.valorZoom = validarElemento(valorZoom, "valor de zoom");
    this.botonPantallaCompleta = validarElemento(
      botonPantallaCompleta,
      "botón de pantalla completa",
    );
    this.botonRestablecer = validarElemento(
      botonRestablecer,
      "botón para restablecer configuración",
    );
    this.mensajeConfiguracion = validarElemento(
      mensajeConfiguracion,
      "mensaje de configuración",
    );
    this.documento = documento;
    this.configuracion = null;
    this.preferencias = null;
    this.alCambiarPreferencia = null;
    this.alRestablecerPreferencias = null;
    this.eventosConectados = false;

    this.alFullscreenChange = () => this.actualizarPantallaCompleta();
    this.deshabilitarControles(true);
  }

  configurarEventos({
    alCambiarPreferencia = null,
    alRestablecerPreferencias = null,
  } = {}) {
    this.alCambiarPreferencia =
      typeof alCambiarPreferencia === "function"
        ? alCambiarPreferencia
        : null;
    this.alRestablecerPreferencias =
      typeof alRestablecerPreferencias === "function"
        ? alRestablecerPreferencias
        : null;

    if (this.eventosConectados) return;
    this.eventosConectados = true;

    this.selectorVelocidad.addEventListener("change", () => {
      this.emitirCambio(
        "velocidadAnimaciones",
        this.selectorVelocidad.value,
      );
    });

    this.casillaEfectosReducidos.addEventListener("change", () => {
      this.emitirCambio(
        "efectosReducidos",
        this.casillaEfectosReducidos.checked,
      );
    });

    this.botonZoomMenos.addEventListener("click", () => {
      this.cambiarZoomPorPaso(-1);
    });

    this.botonZoomMas.addEventListener("click", () => {
      this.cambiarZoomPorPaso(1);
    });

    this.botonRestablecer.addEventListener("click", () => {
      this.alRestablecerPreferencias?.();
    });

    this.botonPantallaCompleta.addEventListener("click", () => {
      this.alternarPantallaCompleta();
    });

    this.documento?.addEventListener?.(
      "fullscreenchange",
      this.alFullscreenChange,
    );
  }

  presentar({ configuracion, preferencias, mensaje = "" } = {}) {
    if (!configuracion || !preferencias) {
      throw new Error(
        "La configuración visual necesita valores canónicos y efectivos.",
      );
    }

    this.configuracion = configuracion;
    this.preferencias = { ...preferencias };
    this.cargarOpcionesVelocidad();
    this.selectorVelocidad.value = preferencias.velocidadAnimaciones;
    this.casillaEfectosReducidos.checked = preferencias.efectosReducidos;
    this.deshabilitarControles(false);
    this.actualizarZoom(preferencias.zoomInicial);
    this.actualizarPantallaCompleta();
    this.mostrarMensaje(mensaje);
  }

  mostrarMensaje(mensaje = "", { error = false } = {}) {
    this.mensajeConfiguracion.textContent = mensaje;
    this.mensajeConfiguracion.classList.toggle(
      "mensaje-configuracion--error",
      error,
    );
  }

  cargarOpcionesVelocidad() {
    const opciones =
      this.configuracion?.preferencias?.velocidadAnimaciones?.opciones ?? [];
    this.selectorVelocidad.replaceChildren();

    for (const valor of opciones) {
      const opcion = this.documento.createElement("option");
      opcion.value = valor;
      opcion.textContent = traducir(CLAVES_VELOCIDAD[valor] ?? valor, { respaldo: valor });
      this.selectorVelocidad.append(opcion);
    }
  }

  cambiarZoomPorPaso(direccion) {
    if (!this.configuracion || !this.preferencias) return;
    const perfil = this.configuracion.preferencias.zoomInicial;
    const actual = Number(this.preferencias.zoomInicial);
    const nuevo = limitar(
      redondear(actual + direccion * perfil.paso),
      perfil.minimo,
      perfil.maximo,
    );

    if (Math.abs(nuevo - actual) < 1e-9) return;
    this.emitirCambio("zoomInicial", nuevo);
  }

  emitirCambio(clave, valor) {
    if (!this.alCambiarPreferencia) return;
    const resultado = this.alCambiarPreferencia(clave, valor);
    if (resultado && typeof resultado === "object") {
      this.preferencias = { ...resultado };
      this.selectorVelocidad.value = resultado.velocidadAnimaciones;
      this.casillaEfectosReducidos.checked = resultado.efectosReducidos;
      this.actualizarZoom(resultado.zoomInicial);
    }
  }

  actualizarZoom(zoom) {
    const perfil = this.configuracion?.preferencias?.zoomInicial;
    const porcentaje = Math.round(Number(zoom) * 100);
    this.valorZoom.textContent = `${porcentaje} %`;

    if (!perfil) return;
    this.botonZoomMenos.disabled = Number(zoom) <= perfil.minimo + 1e-9;
    this.botonZoomMas.disabled = Number(zoom) >= perfil.maximo - 1e-9;
  }

  async alternarPantallaCompleta() {
    if (!this.documento?.fullscreenEnabled) {
      this.mostrarMensaje(
        traducir("interfaz.mensajes.fullscreenNoDisponible", {
          respaldo: "Este navegador no permite activar pantalla completa desde la aplicación.",
        }),
        { error: true },
      );
      return false;
    }

    try {
      if (this.documento.fullscreenElement) {
        await this.documento.exitFullscreen();
      } else {
        await this.documento.documentElement.requestFullscreen();
      }
      this.mostrarMensaje("");
      return true;
    } catch (error) {
      console.warn("No se pudo cambiar el modo de pantalla completa:", error);
      this.mostrarMensaje(
        traducir("interfaz.mensajes.fullscreenError", {
          respaldo: "No se pudo cambiar el modo de pantalla completa.",
        }),
        { error: true },
      );
      return false;
    }
  }

  actualizarPantallaCompleta() {
    const soportado = this.documento?.fullscreenEnabled === true;
    const activo = Boolean(this.documento?.fullscreenElement);
    this.botonPantallaCompleta.disabled = !soportado;
    this.botonPantallaCompleta.textContent = activo
      ? traducir("interfaz.configuracion.salirPantallaCompleta", { respaldo: "Salir de pantalla completa" })
      : traducir("interfaz.configuracion.activarPantallaCompleta", { respaldo: "Activar pantalla completa" });
  }

  deshabilitarControles(deshabilitar) {
    this.selectorVelocidad.disabled = deshabilitar;
    this.casillaEfectosReducidos.disabled = deshabilitar;
    this.botonZoomMenos.disabled = deshabilitar;
    this.botonZoomMas.disabled = deshabilitar;
    this.botonRestablecer.disabled = deshabilitar;
  }
}

function validarElemento(elemento, descripcion) {
  if (!elemento) {
    throw new Error(`No se encontró ${descripcion}.`);
  }
  return elemento;
}

function redondear(valor) {
  return Math.round(valor * 1000000) / 1000000;
}
