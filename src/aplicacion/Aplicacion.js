// Funciones encargadas de cargar los archivos JSON
// necesarios para iniciar Dark Moon.
import {
    cargarConfiguracionPersonaje,
    cargarConfiguracionEnemigos,
    cargarConfiguracionObjetos,
    cargarConfiguracionGeneracionObjetos,
    cargarConfiguracionMapas,
} from "../juego/configuracion/CargadorConfiguracion.js";

// Pantalla utilizada para crear al personaje.
import {
    MenuCreacionPersonaje,
} from "../interfaz/MenuCreacionPersonaje.js";

// Controladores principales de la aplicación.
import {
    ControladorPantallas,
} from "./ControladorPantallas.js";

import {
    ControladorPartida,
} from "./ControladorPartida.js";

// Aplicacion funciona como coordinador general.
//
// Sus responsabilidades son:
//
// - Crear los controladores principales.
// - Cargar las configuraciones.
// - Construir el menú de creación.
// - Solicitar el inicio de una partida.
export class Aplicacion {
    constructor() {
        // Los controladores se crearán cuando
        // se inicie formalmente la aplicación.
        this.controladorPantallas =
            null;

        this.controladorPartida =
            null;

        // Conservamos la referencia al menú para
        // futuras acciones como reiniciarlo o destruirlo.
        this.menuCreacionPersonaje =
            null;

        // Configuraciones cargadas desde JSON.
        this.configuracionPersonaje =
            null;

        this.configuracionEnemigos =
            null;

        this.configuracionObjetos =
            null;

        // Rarezas y afijos se cargan y validan
        // desde el inicio, aunque todavía no participen
        // de la creación de los drops.
        this.configuracionGeneracionObjetos =
            null;

        this.configuracionMapas =
            null;
    }

    // Punto principal de inicio de Dark Moon.
    async iniciar() {
        try {
            this.crearControladores();

            // Conectamos los botones del menú principal.
            this.controladorPantallas
                .configurarEventos();

            // Esperamos la carga de los archivos JSON.
            await this.cargarConfiguraciones();

            // Construimos la pantalla de creación.
            this.crearMenuCreacionPersonaje();
        } catch (error) {
            this.mostrarErrorInicio(
                error,
            );
        }
    }

    // Crea los componentes que coordinan
    // las pantallas y la partida.
    crearControladores() {
        this.controladorPantallas =
            new ControladorPantallas({
                pantallaMenuPrincipal:
                    document.getElementById(
                        "mainMenu",
                    ),

                contenedorBotonesMenuPrincipal:
                    document.getElementById(
                        "mainMenuButtons",
                    ),

                panelConfiguracionMenu:
                    document.getElementById(
                        "settingsPlaceholder",
                    ),

                pantallaCreacion:
                    document.getElementById(
                        "characterCreation",
                    ),

                contenedorJuego:
                    document.getElementById(
                        "gameContainer",
                    ),

                botonNuevoJuego:
                    document.getElementById(
                        "newGameButton",
                    ),

                botonConfiguracion:
                    document.getElementById(
                        "settingsButton",
                    ),

                botonVolverMenuPrincipal:
                    document.getElementById(
                        "backToMainMenuButton",
                    ),
            });

        this.controladorPartida =
            new ControladorPartida({
                controladorPantallas:
                    this.controladorPantallas,
            });
    }

    // Carga en paralelo todas las configuraciones
    // necesarias para construir una partida.
    async cargarConfiguraciones() {
        const [
            configuracionPersonaje,
            configuracionEnemigos,
            configuracionObjetos,
            configuracionGeneracionObjetos,
            configuracionMapas,
        ] = await Promise.all([
            cargarConfiguracionPersonaje(),
            cargarConfiguracionEnemigos(),
            cargarConfiguracionObjetos(),
            cargarConfiguracionGeneracionObjetos(),
            cargarConfiguracionMapas(),
        ]);

        this.configuracionPersonaje =
            configuracionPersonaje;

        this.configuracionEnemigos =
            configuracionEnemigos;

        this.configuracionObjetos =
            configuracionObjetos;

        this.configuracionGeneracionObjetos =
            configuracionGeneracionObjetos;

        this.configuracionMapas =
            configuracionMapas;
    }

    // Construye la pantalla de creación
    // utilizando la configuración cargada.
    crearMenuCreacionPersonaje() {
        this.menuCreacionPersonaje =
            new MenuCreacionPersonaje({
                configuracion:
                    this.configuracionPersonaje,

                // Cuando el jugador confirma sus datos,
                // delegamos la creación de la partida.
                alConfirmar:
                    (
                        datosPersonaje,
                    ) => {
                        this.controladorPartida
                            .iniciar({
                                datosPersonaje,

                                configuracionPersonaje:
                                    this.configuracionPersonaje,

                                configuracionEnemigos:
                                    this.configuracionEnemigos,

                                configuracionObjetos:
                                    this.configuracionObjetos,

                                configuracionMapas:
                                    this.configuracionMapas,
                            });
                    },
            });
    }

    // Registra el error técnico y muestra
    // un mensaje comprensible dentro de la página.
    mostrarErrorInicio(
        error,
    ) {
        console.error(
            "No se pudo iniciar la aplicación:",
            error,
        );

        const mensaje =
            document.getElementById(
                "creationMessage",
            );

        // Evitamos generar un segundo error
        // si el elemento tampoco existe.
        if (mensaje) {
            mensaje.textContent =
                "No se pudo cargar la configuración del juego.";
        }
    }
}
