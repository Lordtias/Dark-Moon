// Importamos la función encargada de crear
// el mapa, el jugador y los objetivos iniciales.
import {
    crearConfiguracionInicial,
    TILE_SIZE
} from "./src/juego/configuracionInicial.js";

// Importamos la clase que administra
// el estado y las reglas de la partida.
import { Juego } from
    "./src/juego/Juego.js";

// Importamos la clase encargada de dibujar
// el juego y actualizar los textos visibles.
import { Renderizador } from
    "./src/interfaz/Renderizador.js";

// Obtenemos el canvas donde se dibujará
// visualmente la partida.
const canvas =
    document.getElementById("gameCanvas");

// Obtenemos el elemento HTML donde se muestra
// la información actual del jugador.
const statusText =
    document.getElementById("status");

// Obtenemos el elemento HTML donde se muestran
// los mensajes de movimiento y combate.
const combatLogText =
    document.getElementById("combatLog");

// Creamos el mapa, el jugador y los objetivos
// necesarios para comenzar una partida nueva.
const configuracionInicial =
    crearConfiguracionInicial();

// Creamos el objeto encargado de administrar
// la lógica y el estado de la partida.
const juego =
    new Juego(configuracionInicial);

// Creamos el objeto encargado de representar
// visualmente el estado del juego.
const renderizador =
    new Renderizador({
        canvas,
        statusText,
        combatLogText,
        tileSize: TILE_SIZE
    });

// Escuchamos las teclas presionadas
// por el jugador.
document.addEventListener(
    "keydown",
    function (event) {
        // Inicialmente no existe ningún movimiento.
        let movimientoX = 0;
        let movimientoY = 0;

        // Convertimos la tecla presionada
        // en una dirección.
        switch (event.code) {
            case "ArrowUp":
            case "KeyW":
                movimientoY = -1;
                break;

            case "ArrowDown":
            case "KeyS":
                movimientoY = 1;
                break;

            case "ArrowLeft":
            case "KeyA":
                movimientoX = -1;
                break;

            case "ArrowRight":
            case "KeyD":
                movimientoX = 1;
                break;

            // Ignoramos las teclas que no forman
            // parte de los controles del juego.
            default:
                return;
        }

        // Evitamos que las flechas también
        // desplacen la página del navegador.
        event.preventDefault();

        // Juego decide si el jugador puede moverse,
        // atacar o si encontró una pared.
        const resultado =
            juego.moverJugador(
                movimientoX,
                movimientoY
            );

        // Mostramos el mensaje producido
        // por la acción.
        //
        // Cuando el jugador está muerto,
        // Juego puede devolver un mensaje nulo.
        if (resultado.mensaje !== null) {
            renderizador.mostrarMensaje(
                resultado.mensaje
            );
        }

        // Volvemos a dibujar solamente cuando
        // la acción modificó el estado de la partida.
        //
        // Chocar contra una pared no consume turno
        // ni cambia las posiciones.
        if (resultado.turnoConsumido) {
            renderizador.dibujarJuego(
                juego
            );
        }
    }
);

// Dibujamos el estado inicial
// cuando se carga la página.
renderizador.dibujarJuego(juego);