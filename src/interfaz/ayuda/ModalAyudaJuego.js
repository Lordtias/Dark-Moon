import { obtenerTraductorActivo, traducir } from "../idiomas/ContextoIdioma.js";
import {
  copiarTextoDiagnostico,
  generarDiagnosticoTester,
} from "./GeneradorDiagnosticoTester.js";

export class ModalAyudaJuego {
  constructor({ botonAbrir, obtenerContextoDiagnostico = () => ({}) } = {}) {
    if (!(botonAbrir instanceof HTMLElement)) {
      throw new Error("ModalAyudaJuego necesita el botón de apertura.");
    }
    if (typeof obtenerContextoDiagnostico !== "function") {
      throw new Error("ModalAyudaJuego necesita una fuente de diagnóstico.");
    }
    this.botonAbrir = botonAbrir;
    this.obtenerContextoDiagnostico = obtenerContextoDiagnostico;
    this.elemento = this.crearModal();
    this.diagnostico = this.elemento.querySelector("[data-ayuda-diagnostico]");
    this.mensajeCopia = this.elemento.querySelector("[data-ayuda-mensaje-copia]");
    this.alAbrir = () => this.abrir();
    this.alEscape = (evento) => {
      if (evento.key !== "Escape" || !this.estaAbierto()) return;
      evento.preventDefault();
      evento.stopImmediatePropagation();
      this.cerrar();
    };
    this.botonAbrir.addEventListener("click", this.alAbrir);
    window.addEventListener("keydown", this.alEscape, true);
    this.desuscribirIdioma = obtenerTraductorActivo()?.suscribir?.(() => {
      if (this.estaAbierto()) this.actualizarTextos();
    }) ?? (() => {});
  }

  crearModal() {
    const fondo = document.createElement("div");
    fondo.className = "modal-ayuda-juego oculto";
    fondo.setAttribute("role", "dialog");
    fondo.setAttribute("aria-modal", "true");
    fondo.setAttribute("aria-labelledby", "tituloAyudaJuego");
    fondo.innerHTML = `
      <section class="modal-ayuda-juego__panel">
        <header class="modal-ayuda-juego__cabecera">
          <div>
            <h2 id="tituloAyudaJuego" data-ayuda-i18n="titulo"></h2>
            <p data-ayuda-i18n="introduccion"></p>
          </div>
          <button type="button" class="modal-ayuda-juego__cerrar" data-ayuda-cerrar></button>
        </header>
        <div class="modal-ayuda-juego__contenido">
          ${crearSeccionMovimiento()}
          ${crearSeccionAcciones()}
          ${crearSeccionHabilidades()}
          ${crearSeccionCamara()}
          <section class="ayuda-bloque ayuda-bloque--diagnostico">
            <h3 data-ayuda-i18n="diagnosticoTitulo"></h3>
            <p data-ayuda-i18n="diagnosticoDescripcion"></p>
            <pre class="ayuda-diagnostico" data-ayuda-diagnostico></pre>
            <div class="ayuda-diagnostico__acciones">
              <button type="button" data-ayuda-copiar></button>
              <span class="ayuda-diagnostico__mensaje" data-ayuda-mensaje-copia aria-live="polite"></span>
            </div>
          </section>
        </div>
      </section>`;
    document.body.appendChild(fondo);
    fondo.querySelector("[data-ayuda-cerrar]")?.addEventListener("click", () => this.cerrar());
    fondo.addEventListener("click", (evento) => {
      if (evento.target === fondo) this.cerrar();
    });
    fondo.querySelector("[data-ayuda-copiar]")?.addEventListener("click", () => this.copiarDiagnostico());
    return fondo;
  }

  abrir() {
    this.actualizarTextos();
    this.elemento.classList.remove("oculto");
    this.elemento.querySelector("[data-ayuda-cerrar]")?.focus();
  }

  cerrar({ devolverFoco = true } = {}) {
    this.elemento.classList.add("oculto");
    if (devolverFoco) this.botonAbrir.focus();
  }

  estaAbierto() {
    return !this.elemento.classList.contains("oculto");
  }

  actualizarTextos() {
    for (const nodo of this.elemento.querySelectorAll("[data-ayuda-i18n]")) {
      const clave = nodo.dataset.ayudaI18n;
      nodo.textContent = traducir(`interfaz.ayuda.${clave}`);
    }
    const cerrar = this.elemento.querySelector("[data-ayuda-cerrar]");
    if (cerrar) cerrar.textContent = traducir("interfaz.ayuda.cerrar");
    const copiar = this.elemento.querySelector("[data-ayuda-copiar]");
    if (copiar) copiar.textContent = traducir("interfaz.ayuda.copiarDiagnostico");
    this.actualizarEtiquetasTeclas();
    this.actualizarDiagnostico();
  }

  actualizarEtiquetasTeclas() {
    const espacio = this.elemento.querySelector('[data-tecla-especial="espacio"]');
    if (espacio) espacio.textContent = traducir("interfaz.ayuda.teclaEspacio");
    const rueda = this.elemento.querySelector('[data-tecla-especial="rueda"]');
    if (rueda) rueda.textContent = traducir("interfaz.ayuda.ruedaMouse");
    const arrastrar = this.elemento.querySelector('[data-tecla-especial="arrastrar"]');
    if (arrastrar) arrastrar.textContent = traducir("interfaz.ayuda.arrastrarMouse");
  }

  actualizarDiagnostico() {
    if (!this.diagnostico) return;
    this.diagnostico.textContent = generarDiagnosticoTester(this.obtenerContextoDiagnostico());
    if (this.mensajeCopia) this.mensajeCopia.textContent = "";
  }

  async copiarDiagnostico() {
    this.actualizarDiagnostico();
    const copiado = await copiarTextoDiagnostico(this.diagnostico?.textContent ?? "");
    if (this.mensajeCopia) {
      this.mensajeCopia.textContent = traducir(
        copiado ? "interfaz.ayuda.diagnosticoCopiado" : "interfaz.ayuda.diagnosticoError",
      );
      this.mensajeCopia.classList.toggle("error", !copiado);
    }
  }

  destruir() {
    this.botonAbrir.removeEventListener("click", this.alAbrir);
    window.removeEventListener("keydown", this.alEscape, true);
    this.desuscribirIdioma?.();
    this.elemento?.remove();
  }
}

function crearSeccionMovimiento() {
  return `<section class="ayuda-bloque">
    <h3 data-ayuda-i18n="movimientoTitulo"></h3>
    <div class="ayuda-control">
      <div class="teclado-cruz"><span class="tecla">W</span><div><span class="tecla">A</span><span class="tecla">S</span><span class="tecla">D</span></div></div>
      <span class="ayuda-separador">/</span>
      <div class="teclado-cruz"><span class="tecla">↑</span><div><span class="tecla">←</span><span class="tecla">↓</span><span class="tecla">→</span></div></div>
      <span class="ayuda-separador">/</span>
      <div class="teclado-numerico"><span class="tecla">7</span><span class="tecla">8</span><span class="tecla">9</span><span class="tecla">4</span><span class="tecla">5</span><span class="tecla">6</span><span class="tecla">1</span><span class="tecla">2</span><span class="tecla">3</span></div>
      <span class="ayuda-control__texto" data-ayuda-i18n="movimiento"></span>
    </div>
    <div class="ayuda-control"><span class="tecla tecla--ancha" data-tecla-especial="espacio"></span><span class="tecla">5</span><span class="ayuda-control__texto" data-ayuda-i18n="esperar"></span></div>
  </section>`;
}
function crearSeccionAcciones() {
  return `<section class="ayuda-bloque"><h3 data-ayuda-i18n="accionesTitulo"></h3>
    <div class="ayuda-control"><span class="tecla">F</span><span class="ayuda-control__texto" data-ayuda-i18n="combate"></span></div>
    <div class="ayuda-control"><span class="tecla">R</span><span class="ayuda-control__texto" data-ayuda-i18n="interactuar"></span></div>
  </section>`;
}
function crearSeccionHabilidades() {
  return `<section class="ayuda-bloque"><h3 data-ayuda-i18n="habilidadesTitulo"></h3>
    <div class="ayuda-control"><div class="teclas-linea">${[1,2,3,4,5,6,7,8,9,0].map((n)=>`<span class="tecla">${n}</span>`).join("")}</div><span class="ayuda-control__texto" data-ayuda-i18n="habilidades"></span></div>
  </section>`;
}
function crearSeccionCamara() {
  return `<section class="ayuda-bloque"><h3 data-ayuda-i18n="camaraTitulo"></h3>
    <div class="ayuda-control"><div class="teclado-cruz"><span class="tecla">I</span><div><span class="tecla">J</span><span class="tecla">K</span><span class="tecla">L</span></div></div><span class="ayuda-control__texto" data-ayuda-i18n="camara"></span></div>
    <div class="ayuda-control"><span class="tecla">H</span><span class="ayuda-control__texto" data-ayuda-i18n="recentrar"></span></div>
    <div class="ayuda-control"><span class="tecla">+</span><span class="tecla">−</span><span class="tecla tecla--ancha" data-tecla-especial="rueda"></span><span class="ayuda-control__texto" data-ayuda-i18n="zoom"></span></div>
    <div class="ayuda-control"><span class="tecla tecla--ancha" data-tecla-especial="arrastrar"></span><span class="ayuda-control__texto" data-ayuda-i18n="arrastrar"></span></div>
  </section>`;
}
