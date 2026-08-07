// ControladorPantallasDom administra exclusivamente
// qué pantalla de la aplicación debe estar visible.
//
// No crea partidas ni conoce las reglas del juego.
export class ControladorPantallasDom {
  constructor({
    pantallaMenuPrincipal,
    contenedorBotonesMenuPrincipal,
    panelConfiguracionMenu,
    pantallaCreacion,
    contenedorJuego,
    botonNuevoJuego,
    botonContinuar,
    botonConfiguracion,
    botonVolverMenuPrincipal,
    mensajeMenuPrincipal,
  } = {}) {
    // Guardamos y validamos todos los elementos
    // necesarios para cambiar entre pantallas.
    this.pantallaMenuPrincipal = this.validarElemento(
      pantallaMenuPrincipal,
      "pantalla del menú principal",
    );

    this.contenedorBotonesMenuPrincipal = this.validarElemento(
      contenedorBotonesMenuPrincipal,
      "contenedor de botones del menú",
    );

    this.panelConfiguracionMenu = this.validarElemento(
      panelConfiguracionMenu,
      "panel de configuración",
    );

    this.pantallaCreacion = this.validarElemento(
      pantallaCreacion,
      "pantalla de creación",
    );

    this.contenedorJuego = this.validarElemento(
      contenedorJuego,
      "contenedor del juego",
    );

    this.botonNuevoJuego = this.validarElemento(
      botonNuevoJuego,
      "botón de nuevo juego",
    );

    this.botonContinuar = this.validarElemento(
      botonContinuar,
      "botón para continuar",
    );

    this.botonConfiguracion = this.validarElemento(
      botonConfiguracion,
      "botón de configuración",
    );

    this.botonVolverMenuPrincipal = this.validarElemento(
      botonVolverMenuPrincipal,
      "botón para volver al menú",
    );

    this.mensajeMenuPrincipal = this.validarElemento(
      mensajeMenuPrincipal,
      "mensaje del menú principal",
    );

    this.alSolicitarNuevoJuego = null;
    this.alSolicitarContinuar = null;
  }

  // Comprueba que el elemento exista en el HTML.
  validarElemento(elemento, descripcion) {
    if (!elemento) {
      throw new Error(`No se encontró ${descripcion}.`);
    }

    return elemento;
  }

  // Conecta los botones del menú con
  // los cambios de pantalla correspondientes.
  configurarEventos({
    alSolicitarNuevoJuego = null,
    alSolicitarContinuar = null,
  } = {}) {
    this.alSolicitarNuevoJuego =
      typeof alSolicitarNuevoJuego === "function"
        ? alSolicitarNuevoJuego
        : null;
    this.alSolicitarContinuar =
      typeof alSolicitarContinuar === "function"
        ? alSolicitarContinuar
        : null;

    this.botonNuevoJuego.addEventListener("click", () => {
      if (
        this.alSolicitarNuevoJuego &&
        this.alSolicitarNuevoJuego() === false
      ) {
        return;
      }

      this.mostrarCreacionPersonaje();
    });

    this.botonContinuar.addEventListener("click", () => {
      if (!this.alSolicitarContinuar || this.botonContinuar.disabled) {
        return;
      }

      this.alSolicitarContinuar();
    });

    this.botonConfiguracion.addEventListener("click", () => {
      this.mostrarConfiguracion();
    });

    this.botonVolverMenuPrincipal.addEventListener("click", () => {
      this.mostrarMenuPrincipal();
    });
  }

  configurarContinuar({
    habilitado,
    mensaje = "",
    titulo = "",
    error = false,
  } = {}) {
    this.botonContinuar.disabled = habilitado !== true;
    this.botonContinuar.title = typeof titulo === "string" ? titulo : "";
    this.mostrarMensajeMenu(mensaje, { error });
  }

  mostrarMensajeMenu(mensaje = "", { error = false } = {}) {
    this.mensajeMenuPrincipal.textContent = mensaje;
    this.mensajeMenuPrincipal.classList.toggle("mensaje-menu--error", error);
  }

  // Oculta el menú y muestra
  // la creación del personaje.
  mostrarCreacionPersonaje() {
    this.pantallaMenuPrincipal.classList.add("oculto");
    this.pantallaCreacion.classList.remove("oculto");

    // Dejamos el menú en su estado inicial
    // por si el jugador vuelve más adelante.
    this.panelConfiguracionMenu.classList.add("oculto");
    this.contenedorBotonesMenuPrincipal.classList.remove("oculto");
  }

  // Muestra las opciones principales del menú.
  mostrarMenuPrincipal() {
    this.pantallaMenuPrincipal.classList.remove("oculto");
    this.panelConfiguracionMenu.classList.add("oculto");
    this.contenedorBotonesMenuPrincipal.classList.remove("oculto");
  }

  // Muestra el panel temporal de configuración.
  mostrarConfiguracion() {
    this.contenedorBotonesMenuPrincipal.classList.add("oculto");
    this.panelConfiguracionMenu.classList.remove("oculto");
  }

  // Oculta las pantallas de entrada y muestra la partida. Continuar puede
  // llegar aquí directamente desde el menú principal, sin pasar por creación.
  mostrarPartida() {
    this.pantallaMenuPrincipal.classList.add("oculto");
    this.pantallaCreacion.classList.add("oculto");
    this.contenedorJuego.classList.remove("oculto");
  }
}
