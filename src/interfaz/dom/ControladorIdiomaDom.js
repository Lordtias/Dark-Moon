export class ControladorIdiomaDom {
  constructor({ botones = {}, documento = globalThis.document } = {}) {
    this.botones = Object.fromEntries(
      Object.entries(botones).map(([idioma, valor]) => [
        idioma,
        Array.isArray(valor) ? valor.filter(Boolean) : [valor].filter(Boolean),
      ]),
    );
    this.documento = documento;
    this.alCambiarIdioma = null;
    this.eventosConectados = false;
  }

  configurarEventos({ alCambiarIdioma = null } = {}) {
    this.alCambiarIdioma = typeof alCambiarIdioma === "function" ? alCambiarIdioma : null;
    if (this.eventosConectados) return;
    this.eventosConectados = true;
    for (const [idioma, botones] of Object.entries(this.botones)) {
      for (const boton of botones) {
        boton.addEventListener?.("click", () => this.alCambiarIdioma?.(idioma));
      }
    }
  }

  presentar(idiomaActivo) {
    for (const [idioma, botones] of Object.entries(this.botones)) {
      const activo = idioma === idiomaActivo;
      for (const boton of botones) {
        boton.classList.toggle("selector-idioma__opcion--activa", activo);
        boton.setAttribute("aria-pressed", String(activo));
      }
    }
    this.documento?.documentElement?.setAttribute?.("lang", idiomaActivo);
  }
}
