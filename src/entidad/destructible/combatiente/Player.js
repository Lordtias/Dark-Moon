// Importamos Combatiente porque el jugador puede:
//
// - Recibir daño.
// - Atacar.
// - Tener atributos de D&D.
// - Tener una posición dentro del mapa.
import { Combatiente } from "./Combatiente.js";

// Player representa exclusivamente al personaje controlado
// por la persona que está jugando.
//
// Hereda de Combatiente:
//
// - Nombre.
// - Posición.
// - Símbolo.
// - Nivel.
// - Atributos.
// - Vida.
// - Clase de Armadura.
// - Capacidad de atacar y recibir daño.
export class Player extends Combatiente {
    constructor({
        nombre,
        nivel = 1,
        x = 0,
        y = 0,
        atributos,
        vidaMaxima,
        dadoDanio,
        atributoAtaque,
        bonificadorArmadura = 0,
        clasePersonaje = "Aventurero",
        experiencia = 0,
        capacidadInventario = 12,

        // Objetos que comienzan guardados,
        // pero no equipados.
        objetosInventarioIniciales = [],

        ranurasEquipamiento = [
            "cabeza",
            "torso",
            "manos",
            "piernas",
            "pies",
            "arma",
            "secundaria",
            "collar",
            "anillo_derecho",
            "anillo_izquierdo"
        ],

        // Más adelante las profesiones podrán proporcionar
        // objetos equipados al comenzar la partida.
        equipamientoInicial = []
    } = {}) {
        // Llamamos al constructor de Combatiente.
        //
        // Combatiente se encargará de crear toda la parte común:
        // vida, atributos, ataque, defensa, posición, etc.
        super({
            nombre,
            nivel,
            x,
            y,
            atributos,
            vidaMaxima,
            dadoDanio,
            atributoAtaque,
            bonificadorArmadura,

            // El símbolo temporal del jugador será @.
            //
            // Más adelante este símbolo podrá reemplazarse
            // por un sprite sin cambiar la lógica del Player.
            simbolo: "@",

            // Player utiliza el contenedor genérico
            // como inventario personal.
            capacidadContenedor:
                capacidadInventario,
            
            // Objetos que comienzan almacenados
            // dentro del inventario del jugador.
            objetosIniciales:
                objetosInventarioIniciales,

            // Combatiente creará automáticamente
            // el componente Equipamiento.
            ranurasEquipamiento,

            // Permitimos que el jugador comience
            // con equipamiento configurado.
            equipamientoInicial
            
        });

        // Clase de rol elegida por el jugador.
        //
        // Por ahora es solamente un texto.
        // Más adelante podrá definir habilidades,
        // dados de vida, equipamiento y progresión.
        this.clasePersonaje = clasePersonaje;

        // Cantidad de experiencia acumulada.
        this.experiencia = experiencia;

        // La interfaz llama "inventario" al contenedor
        // genérico heredado desde Destructible.
        this.inventario =
            this.contenedorObjetos;
    }
}