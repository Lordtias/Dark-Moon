// Valores iniciales de balance para Inteligencia, Sabiduría y Maná.
//
// La configuración vive separada del combate físico para que las
// habilidades futuras puedan reutilizar una única fuente de verdad.
export const CONFIGURACION_MAGIA = Object.freeze({
    referenciaAtributos: 10,

    multiplicadores: Object.freeze({
        minimo: 0.5,
        danioMagico: Object.freeze({
            inteligencia: 0.035,
            sabiduria: 0.015,
        }),
        efectos: Object.freeze({
            inteligencia: 0.015,
            sabiduria: 0.035,
        }),
    }),

    mana: Object.freeze({
        minimo: 0,
        porInteligenciaRespectoDiez: 2,
        porSabiduriaRespectoDiez: 1,
    }),

    regeneracionMana: Object.freeze({
        // Se aplica en cada pulso definido por TIEMPO_REFERENCIA.
        // El reloj permanece centralizado en SistemaTiempo.
        porSabiduria: 0.1,
    }),

    efectos: Object.freeze({
        duracionMinima: 1,
    }),
});
