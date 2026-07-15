// Importamos Enemigo porque Juego necesita distinguir
// entre enemigos y objetos destructibles.
//
// Los enemigos pueden contraatacar y entregar experiencia.
import { Enemigo } from
    "../entidad/destructible/combatiente/Enemigo.js";

// Juego administra el estado y las reglas generales
// de una partida.
//
// Se encarga de:
//
// - Guardar el mapa.
// - Guardar al jugador.
// - Guardar los objetivos.
// - Controlar los turnos.
// - Validar movimientos.
// - Coordinar ataques y contraataques.
//
// Esta clase no dibuja nada y no accede al HTML.
export class Juego {
    constructor({
        map,
        player,
        objetivos
    } = {}) {
        // Comprobamos que exista un mapa válido.
        if (
            !Array.isArray(map) ||
            map.length === 0
        ) {
            throw new Error(
                "Juego necesita un mapa válido."
            );
        }

        // Comprobamos que exista un jugador.
        if (!player) {
            throw new Error(
                "Juego necesita un jugador."
            );
        }

        // Comprobamos que los objetivos estén
        // guardados dentro de una lista.
        if (!Array.isArray(objetivos)) {
            throw new Error(
                "Los objetivos del juego deben estar dentro de una lista."
            );
        }

        // Guardamos el mapa de la partida.
        this.map = map;

        // Guardamos el personaje controlado
        // por el usuario.
        this.player = player;

        // Guardamos los enemigos y objetos destructibles.
        this.objetivos = objetivos;

        // Toda partida nueva comienza en el turno cero.
        this.turno = 0;
    }

    // Busca un objetivo vivo o no destruido
    // en una posición determinada.
    obtenerObjetivoEn(x, y) {
        return this.objetivos.find(
            function (objetivo) {
                return (
                    !objetivo.estaDestruido &&
                    objetivo.x === x &&
                    objetivo.y === y
                );
            }
        );
    }

    // Comprueba que una posición esté dentro del mapa
    // y que no contenga una pared.
    esCaminable(x, y) {
        // Comprobamos los límites verticales.
        if (
            y < 0 ||
            y >= this.map.length
        ) {
            return false;
        }

        // Comprobamos los límites horizontales.
        if (
            x < 0 ||
            x >= this.map[y].length
        ) {
            return false;
        }

        // Las paredes no son caminables.
        return this.map[y][x] !== "#";
    }

    // Procesa el ataque del jugador contra un objetivo.
    //
    // Devuelve un texto con todos los resultados
    // producidos durante el combate.
    atacarObjetivo(
        objetivo,
        posicionX,
        posicionY
    ) {
        // El jugador utiliza el método atacar()
        // heredado desde Combatiente.
        const resultadoJugador =
            this.player.atacar(objetivo);

        // Guardamos todos los mensajes producidos
        // durante esta acción.
        const mensajes = [
            resultadoJugador.mensaje
        ];

        // Si el objetivo fue destruido,
        // procesamos las consecuencias.
        if (objetivo.estaDestruido) {
            // Los enemigos entregan experiencia.
            if (objetivo instanceof Enemigo) {
                this.player.experiencia +=
                    objetivo.experienciaOtorgada;

                mensajes.push(
                    `${objetivo.nombre} fue derrotada.` +
                    ` Ganaste ${objetivo.experienciaOtorgada}` +
                    " puntos de experiencia."
                );
            } else {
                // Los objetos destructibles
                // no entregan experiencia.
                mensajes.push(
                    `${objetivo.nombre} fue destruido.`
                );
            }

            // Cuando el objetivo desaparece,
            // el jugador ocupa su casilla.
            this.player.x = posicionX;
            this.player.y = posicionY;
        } else if (objetivo instanceof Enemigo) {
            // Si el enemigo sobrevivió,
            // realiza inmediatamente un contraataque.
            const resultadoEnemigo =
                objetivo.atacar(this.player);

            mensajes.push(
                resultadoEnemigo.mensaje
            );

            // Informamos cuando el jugador muere.
            if (!this.player.estaVivo) {
                mensajes.push(
                    "Has muerto. Recargá la página para reiniciar."
                );
            }
        }

        // Unimos todos los mensajes producidos
        // durante el ataque.
        return mensajes.join(" ");
    }

    // Intenta mover al jugador una casilla.
    //
    // Devuelve un objeto indicando:
    //
    // - El mensaje producido.
    // - Si la acción consumió un turno.
    moverJugador(
        movimientoX,
        movimientoY
    ) {
        // Un jugador muerto no puede realizar acciones.
        if (!this.player.estaVivo) {
            return {
                mensaje: null,
                turnoConsumido: false
            };
        }

        // Calculamos la posición de destino.
        const nuevaX =
            this.player.x + movimientoX;

        const nuevaY =
            this.player.y + movimientoY;

        // Chocar contra una pared no consume turno.
        if (!this.esCaminable(nuevaX, nuevaY)) {
            return {
                mensaje:
                    "No podés atravesar una pared.",

                turnoConsumido: false
            };
        }

        // Buscamos si hay un objetivo
        // en la casilla de destino.
        const objetivo =
            this.obtenerObjetivoEn(
                nuevaX,
                nuevaY
            );

        let mensaje;

        if (objetivo) {
            // Intentar entrar en una casilla ocupada
            // se convierte en un ataque.
            mensaje = this.atacarObjetivo(
                objetivo,
                nuevaX,
                nuevaY
            );
        } else {
            // Cuando no hay objetivo,
            // movemos al jugador normalmente.
            this.player.x = nuevaX;
            this.player.y = nuevaY;

            mensaje =
                "Te moviste por la mazmorra.";
        }

        // Moverse o atacar consume un turno.
        this.turno++;

        return {
            mensaje,
            turnoConsumido: true
        };
    }
}