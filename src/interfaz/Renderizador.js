// Importamos Enemigo porque el renderizador necesita
// distinguir visualmente a los enemigos de otros objetos.
import { Enemigo } from
    "../entidad/destructible/combatiente/Enemigo.js";

// Renderizador administra toda la representación visual
// de la partida.
//
// Se encarga de:
//
// - Dibujar el mapa.
// - Dibujar al jugador.
// - Dibujar enemigos y objetos.
// - Actualizar el estado visible.
// - Mostrar mensajes.
//
// No modifica la lógica ni el estado del juego.
export class Renderizador {
    constructor({
        canvas,
        statusText,
        combatLogText,
        tileSize
    } = {}) {
        // Comprobamos que exista el canvas.
        if (!canvas) {
            throw new Error(
                "Renderizador necesita un canvas."
            );
        }

        // Obtenemos el contexto utilizado para dibujar.
        const context =
            canvas.getContext("2d");

        // Verificamos que el navegador haya podido
        // crear un contexto de dibujo en dos dimensiones.
        if (!context) {
            throw new Error(
                "No se pudo obtener el contexto 2D del canvas."
            );
        }

        // Comprobamos que exista el elemento donde
        // se mostrará el estado del jugador.
        if (!statusText) {
            throw new Error(
                "Renderizador necesita el texto de estado."
            );
        }

        // Comprobamos que exista el elemento donde
        // se mostrarán los mensajes del juego.
        if (!combatLogText) {
            throw new Error(
                "Renderizador necesita el registro de combate."
            );
        }

        // El tamaño de las casillas debe ser
        // un número entero mayor que cero.
        if (
            !Number.isInteger(tileSize) ||
            tileSize <= 0
        ) {
            throw new Error(
                "El tamaño de las casillas debe ser un entero mayor que 0."
            );
        }

        // Guardamos los elementos necesarios
        // para dibujar y actualizar la interfaz.
        this.canvas = canvas;
        this.context = context;
        this.statusText = statusText;
        this.combatLogText = combatLogText;
        this.tileSize = tileSize;
    }

    // Dibuja el estado completo de una partida.
    dibujarJuego(juego) {
        // Limpiamos el contenido anterior del canvas.
        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );

        // El orden es importante:
        //
        // 1. Dibujamos el mapa.
        // 2. Dibujamos los objetivos.
        // 3. Dibujamos al jugador.
        // 4. Actualizamos el texto de estado.
        this.dibujarMapa(juego.map);

        this.dibujarObjetivos(
            juego.objetivos
        );

        this.dibujarJugador(
            juego.player
        );

        this.actualizarEstado(juego);
    }

    // Dibuja las paredes y el suelo del mapa.
    dibujarMapa(map) {
        for (
            let y = 0;
            y < map.length;
            y++
        ) {
            for (
                let x = 0;
                x < map[y].length;
                x++
            ) {
                const casilla =
                    map[y][x];

                const pixelX =
                    x * this.tileSize;

                const pixelY =
                    y * this.tileSize;

                // Elegimos un color diferente
                // para paredes y suelo.
                if (casilla === "#") {
                    this.context.fillStyle =
                        "#5468d4";
                } else {
                    this.context.fillStyle =
                        "#252b45";
                }

                // Dibujamos el fondo de la casilla.
                this.context.fillRect(
                    pixelX,
                    pixelY,
                    this.tileSize,
                    this.tileSize
                );

                // Dibujamos una separación visual
                // entre las diferentes casillas.
                this.context.strokeStyle =
                    "#171b2e";

                this.context.strokeRect(
                    pixelX,
                    pixelY,
                    this.tileSize,
                    this.tileSize
                );
            }
        }
    }

    // Dibuja al personaje controlado
    // por el jugador.
    dibujarJugador(player) {
        // Cuando el jugador está vivo mostramos
        // su símbolo normal.
        //
        // Cuando está muerto mostramos una X.
        const simbolo =
            player.estaVivo
                ? player.simbolo
                : "X";

        this.dibujarEntidad(
            player,
            simbolo,
            "#ffe66d"
        );
    }

    // Dibuja todos los enemigos y objetos
    // que todavía no fueron destruidos.
    dibujarObjetivos(objetivos) {
        for (const objetivo of objetivos) {
            // Los objetivos destruidos
            // dejan de mostrarse.
            if (objetivo.estaDestruido) {
                continue;
            }

            // Los enemigos se dibujan en rojo.
            if (objetivo instanceof Enemigo) {
                this.dibujarEntidad(
                    objetivo,
                    objetivo.simbolo,
                    "#ff8c8c"
                );

                continue;
            }

            // Los demás objetos destructibles
            // se dibujan en naranja.
            this.dibujarEntidad(
                objetivo,
                objetivo.simbolo,
                "#d9a066"
            );
        }
    }

    // Dibuja el símbolo de cualquier entidad.
    //
    // Esto evita repetir el mismo código para
    // el jugador, los enemigos y los objetos.
    dibujarEntidad(
        entidad,
        simbolo,
        color
    ) {
        const centroX =
            entidad.x * this.tileSize +
            this.tileSize / 2;

        const centroY =
            entidad.y * this.tileSize +
            this.tileSize / 2;

        this.context.fillStyle = color;
        this.context.font =
            "bold 26px monospace";

        this.context.textAlign =
            "center";

        this.context.textBaseline =
            "middle";

        this.context.fillText(
            simbolo,
            centroX,
            centroY
        );
    }

    // Actualiza la información visible
    // correspondiente al jugador y la partida.
    actualizarEstado(juego) {
        const player =
            juego.player;

        this.statusText.textContent =
            `${player.nombre}` +
            ` | Clase: ${player.clasePersonaje}` +
            ` | Nivel: ${player.nivel}` +
            ` | Vida: ${player.vidaActual}/${player.vidaMaxima}` +
            ` | CA: ${player.claseArmadura}` +
            ` | Experiencia: ${player.experiencia}` +
            ` | Turno: ${juego.turno}`;
    }

    // Muestra un mensaje en el registro visible
    // debajo del juego.
    mostrarMensaje(mensaje) {
        // Evitamos reemplazar el mensaje actual
        // cuando no recibimos un texto válido.
        if (
            typeof mensaje !== "string" ||
            mensaje.trim() === ""
        ) {
            return;
        }

        this.combatLogText.textContent =
            mensaje;
    }
}