// Puente temporal de compatibilidad.
//
// La implementación real fue trasladada y renombrada:
//
// src/juego/ia/SistemaAccionesEnemigos.js
//
// "procesarTurnoEnemigo" se mantiene temporalmente
// como alias para no romper Juego.js.
export {
  calcularDistanciaCuadricula,
  procesarAccionEnemigo,
  procesarAccionEnemigo as procesarTurnoEnemigo,
} from "./ia/SistemaAccionesEnemigos.js";
