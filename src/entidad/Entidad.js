// Entidad es la clase más general del juego.
//
// Representa cualquier elemento que exista dentro del mapa:
// jugadores, enemigos, cofres, puertas, barriles, NPC, etc.
export class Entidad {
    constructor({
        nombre,
        x = 0,
        y = 0,
        simbolo = "?"
    } = {}) {
        // Toda entidad debe tener un nombre de texto
        // y no puede estar vacío.
        if (
            typeof nombre !== "string" ||
            nombre.trim() === ""
        ) {
            throw new Error(
                "Toda entidad debe tener un nombre válido."
            );
        }

        // Las posiciones del mapa deben ser números enteros.
        //
        // No tendría sentido que una entidad estuviera,
        // por ejemplo, en la posición 2.5 del mapa.
        if (
            !Number.isInteger(x) ||
            !Number.isInteger(y)
        ) {
            throw new Error(
                `${nombre} debe tener coordenadas enteras.`
            );
        }

        // Toda entidad debe tener alguna representación visual.
        if (
            typeof simbolo !== "string" ||
            simbolo.trim() === ""
        ) {
            throw new Error(
                `${nombre} debe tener un símbolo válido.`
            );
        }

        // Guardamos el nombre sin espacios innecesarios
        // al principio o al final.
        this.nombre = nombre.trim();

        // Posición dentro de la cuadrícula del mapa.
        this.x = x;
        this.y = y;

        // Representación visual temporal.
        // Más adelante podrá reemplazarse por un sprite.
        this.simbolo = simbolo;
    }
}