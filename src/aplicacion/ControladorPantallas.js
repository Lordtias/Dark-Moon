// ControladorPantallas administra exclusivamente
// qué pantalla de la aplicación debe estar visible.
//
// No crea partidas ni conoce las reglas del juego.
export class ControladorPantallas {
  constructor({
    pantallaMenuPrincipal,
    contenedorBotonesMenuPrincipal,
    panelConfiguracionMenu,
    pantallaCreacion,
    contenedorJuego,
    botonNuevoJuego,
    botonConfiguracion,
    botonVolverMenuPrincipal,
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

    this.botonConfiguracion = this.validarElemento(
      botonConfiguracion,
      "botón de configuración",
    );

    this.botonVolverMenuPrincipal = this.validarElemento(
      botonVolverMenuPrincipal,
      "botón para volver al menú",
    );
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
  configurarEventos() {
    this.botonNuevoJuego.addEventListener("click", () => {
      this.mostrarCreacionPersonaje();
    });

    this.botonConfiguracion.addEventListener("click", () => {
      this.mostrarConfiguracion();
    });

    this.botonVolverMenuPrincipal.addEventListener("click", () => {
      this.mostrarMenuPrincipal();
    });
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
    this.panelConfiguracionMenu.classList.add("oculto");

    this.contenedorBotonesMenuPrincipal.classList.remove("oculto");
  }

  // Muestra el panel temporal de configuración.
  mostrarConfiguracion() {
    this.contenedorBotonesMenuPrincipal.classList.add("oculto");

    this.panelConfiguracionMenu.classList.remove("oculto");
  }

  // Oculta la creación del personaje
  // y muestra la pantalla de la partida.
  mostrarPartida() {
    this.pantallaCreacion.classList.add("oculto");

    this.contenedorJuego.classList.remove("oculto");
  }
}
