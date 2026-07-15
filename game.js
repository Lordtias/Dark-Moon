// Importamos las clases utilizadas en el juego.
import { Player } from "./src/entidad/destructible/combatiente/Player.js";
import { Enemigo } from "./src/entidad/destructible/combatiente/Enemigo.js";
import { Barril } from "./src/entidad/destructible/Barril.js";

// Obtenemos el canvas donde dibujaremos el juego.
const canvas =
    document.getElementById("gameCanvas");

const context =
    canvas.getContext("2d");

// Obtenemos los elementos HTML donde mostraremos información.
const statusText =
    document.getElementById("status");

const combatLogText =
    document.getElementById("combatLog");

// Tamaño de cada casilla del mapa.
const TILE_SIZE = 32;

// Mapa inicial.
//
// # representa una pared.
// . representa una casilla caminable.
const map = [
    "####################",
    "#..................#",
    "#..######..........#",
    "#..............###.#",
    "#..................#",
    "#....####..........#",
    "#..................#",
    "#..........#####...#",
    "#..................#",
    "#..####............#",
    "#..................#",
    "####################"
];

// Creamos el personaje principal.
const player = new Player({
    nombre: "Aventurero",
    nivel: 1,
    x: 2,
    y: 2,

    // Información específica de Player.
    clasePersonaje: "Guerrero",
    experiencia: 0,

    // Información heredada de Combatiente.
    vidaMaxima: 12,
    dadoDanio: 6,
    atributoAtaque: "fuerza",
    bonificadorArmadura: 0,

    // Atributos inspirados en D&D.
    atributos: {
        fuerza: 15,
        destreza: 12,
        constitucion: 14,
        inteligencia: 10,
        sabiduria: 11,
        carisma: 8
    }
});

// Creamos una rata utilizando la clase genérica Enemigo.
//
// La rata utiliza Fuerza y causa 1d4 de daño.
const rata = new Enemigo({
    nombre: "Rata",
    nivel: 1,
    x: 10,
    y: 4,

    vidaMaxima: 5,
    dadoDanio: 4,
    atributoAtaque: "fuerza",

    simbolo: "r",
    experienciaOtorgada: 10,

    atributos: {
        fuerza: 10,
        destreza: 14,
        constitucion: 8,
        inteligencia: 2,
        sabiduria: 10,
        carisma: 4
    }
});

// Creamos un barril destructible.
//
// El barril puede recibir daño,
// pero no puede realizar ataques.
const barril = new Barril({
    x: 6,
    y: 4
});

// Guardamos todos los objetivos atacables en una lista.
//
// Más adelante podremos agregar más enemigos,
// puertas, cofres y otros objetos destructibles.
const objetivos = [
    rata,
    barril
];

// Contador de turnos de la partida.
let turno = 0;

// Dibuja el estado completo del juego.
function dibujarJuego() {
    // Limpiamos el contenido anterior del canvas.
    context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // El orden importa:
    // primero mapa, luego objetivos y finalmente jugador.
    dibujarMapa();
    dibujarObjetivos();
    dibujarJugador();
    actualizarEstado();
}

// Dibuja las paredes y el suelo.
function dibujarMapa() {
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            const casilla = map[y][x];

            const pixelX =
                x * TILE_SIZE;

            const pixelY =
                y * TILE_SIZE;

            // Elegimos el color según el tipo de casilla.
            if (casilla === "#") {
                context.fillStyle = "#5468d4";
            } else {
                context.fillStyle = "#252b45";
            }

            // Dibujamos el fondo de la casilla.
            context.fillRect(
                pixelX,
                pixelY,
                TILE_SIZE,
                TILE_SIZE
            );

            // Dibujamos una pequeña separación
            // entre las casillas.
            context.strokeStyle = "#171b2e";

            context.strokeRect(
                pixelX,
                pixelY,
                TILE_SIZE,
                TILE_SIZE
            );
        }
    }
}

// Dibuja el personaje principal.
function dibujarJugador() {
    // Mostramos una X si el jugador murió.
    const simbolo = player.estaVivo
        ? player.simbolo
        : "@";

    dibujarEntidad(
        player,
        simbolo,
        "#ffe66d"
    );
}

// Dibuja todos los enemigos y objetos
// que todavía no fueron destruidos.
function dibujarObjetivos() {
    for (const objetivo of objetivos) {
        // Los objetivos destruidos ya no aparecen.
        if (objetivo.estaDestruido) {
            continue;
        }

        // Los enemigos se dibujan en rojo.
        if (objetivo instanceof Enemigo) {
            dibujarEntidad(
                objetivo,
                objetivo.simbolo,
                "#ff8c8c"
            );

            continue;
        }

        // Los demás destructibles se dibujan en naranja.
        dibujarEntidad(
            objetivo,
            objetivo.simbolo,
            "#d9a066"
        );
    }
}

// Dibuja el símbolo de cualquier entidad.
//
// Esta función evita repetir el mismo código
// para jugador, enemigos y objetos.
function dibujarEntidad(
    entidad,
    simbolo,
    color
) {
    const centroX =
        entidad.x * TILE_SIZE +
        TILE_SIZE / 2;

    const centroY =
        entidad.y * TILE_SIZE +
        TILE_SIZE / 2;

    context.fillStyle = color;
    context.font = "bold 26px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.fillText(
        simbolo,
        centroX,
        centroY
    );
}

// Busca un objetivo que ocupe una posición.
//
// Solo devuelve objetivos que todavía
// no fueron destruidos.
function obtenerObjetivoEn(x, y) {
    return objetivos.find(
        function (objetivo) {
            return (
                !objetivo.estaDestruido &&
                objetivo.x === x &&
                objetivo.y === y
            );
        }
    );
}

// Procesa el ataque del jugador contra un objetivo.
function atacarObjetivo(
    objetivo,
    posicionX,
    posicionY
) {
    // El jugador utiliza el método atacar()
    // heredado desde Combatiente.
    const resultadoJugador =
        player.atacar(objetivo);

    const mensajes = [
        resultadoJugador.mensaje
    ];

    // Si el objetivo fue destruido,
    // procesamos su consecuencia.
    if (objetivo.estaDestruido) {
        // Los enemigos entregan experiencia.
        if (objetivo instanceof Enemigo) {
            player.experiencia +=
                objetivo.experienciaOtorgada;

            mensajes.push(
                `${objetivo.nombre} fue derrotada.` +
                ` Ganaste ${objetivo.experienciaOtorgada}` +
                ` puntos de experiencia.`
            );
        } else {
            // Los objetos destructibles no entregan experiencia.
            mensajes.push(
                `${objetivo.nombre} fue destruido.`
            );
        }

        // Cuando el objetivo desaparece,
        // el jugador ocupa su casilla.
        player.x = posicionX;
        player.y = posicionY;
    } else if (objetivo instanceof Enemigo) {
        // Si el enemigo sobrevivió,
        // realiza inmediatamente un contraataque.
        const resultadoEnemigo =
            objetivo.atacar(player);

        mensajes.push(
            resultadoEnemigo.mensaje
        );

        // Informamos cuando el jugador muere.
        if (!player.estaVivo) {
            mensajes.push(
                "Has muerto. Recargá la página para reiniciar."
            );
        }
    }

    // Un barril no responde porque no es un Combatiente.
    combatLogText.textContent =
        mensajes.join(" ");
}

// Intenta mover al jugador una casilla.
function moverJugador(
    movimientoX,
    movimientoY
) {
    // Un jugador muerto no puede moverse.
    if (!player.estaVivo) {
        return;
    }

    const nuevaX =
        player.x + movimientoX;

    const nuevaY =
        player.y + movimientoY;

    // Primero comprobamos que la casilla sea caminable.
    if (!esCaminable(nuevaX, nuevaY)) {
        combatLogText.textContent =
            "No podés atravesar una pared.";

        return;
    }

    // Buscamos un objetivo en la casilla de destino.
    const objetivo =
        obtenerObjetivoEn(nuevaX, nuevaY);

    if (objetivo) {
        // Intentar entrar en una casilla ocupada
        // se convierte en un ataque.
        atacarObjetivo(
            objetivo,
            nuevaX,
            nuevaY
        );
    } else {
        // Cuando no hay objetivo, nos movemos normalmente.
        player.x = nuevaX;
        player.y = nuevaY;

        combatLogText.textContent =
            "Te moviste por la mazmorra.";
    }

    // Moverse o atacar consume un turno.
    turno++;

    // Redibujamos el estado actualizado.
    dibujarJuego();
}

// Comprueba si una casilla pertenece al mapa
// y no contiene una pared.
function esCaminable(x, y) {
    // Comprobamos los límites verticales.
    if (y < 0 || y >= map.length) {
        return false;
    }

    // Comprobamos los límites horizontales.
    if (x < 0 || x >= map[y].length) {
        return false;
    }

    // Las paredes no son caminables.
    return map[y][x] !== "#";
}

// Actualiza la información visible del jugador.
function actualizarEstado() {
    statusText.textContent =
        `${player.nombre}` +
        ` | Clase: ${player.clasePersonaje}` +
        ` | Nivel: ${player.nivel}` +
        ` | Vida: ${player.vidaActual}/${player.vidaMaxima}` +
        ` | CA: ${player.claseArmadura}` +
        ` | Experiencia: ${player.experiencia}` +
        ` | Turno: ${turno}`;
}

// Escuchamos las teclas del jugador.
document.addEventListener(
    "keydown",
    function (event) {
        let movimientoX = 0;
        let movimientoY = 0;

        // Convertimos cada tecla en una dirección.
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

            // Ignoramos cualquier otra tecla.
            default:
                return;
        }

        // Evitamos que las flechas muevan la página.
        event.preventDefault();

        moverJugador(
            movimientoX,
            movimientoY
        );
    }
);

// Dibujamos el juego por primera vez.
dibujarJuego();