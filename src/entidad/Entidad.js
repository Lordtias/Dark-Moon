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
    }) {
        // Nombre utilizado para identificar la entidad.
        this.nombre = nombre;

        // Posición dentro de la cuadrícula del mapa.
        this.x = x;
        this.y = y;

        // Representación visual temporal.
        // Más adelante este símbolo podrá reemplazarse por un sprite.
        this.simbolo = simbolo;
    }
}