export { TIPOS_EVENTO_ESTADO_TACTICO } from "./SistemaEstadosTacticosCombatiente.js";
import { notificarCambioEstadoJugador } from "./ObservadorCambiosEstadoJugador.js";

export function activarEstadoTacticoCombatiente(combatiente, estado, {
  origen = "estado_tactico",
} = {}) {
  const sistema = combatiente?.sistemaEstadosTacticosCombatiente;
  if (!sistema) {
    throw new Error("El combatiente no dispone del sistema de estados tácticos.");
  }
  const activado = sistema.activar(estado);
  notificarCambioTactico(combatiente, {
    origen,
    tipo: "activar",
    motivo: `${origen}:activar`,
  });
  return activado;
}

export function retirarEstadoTacticoCombatiente(combatiente, idEstado, {
  origen = "estado_tactico",
} = {}) {
  const retirado = combatiente?.sistemaEstadosTacticosCombatiente?.retirar(idEstado) ?? false;
  if (retirado) {
    notificarCambioTactico(combatiente, {
      origen,
      tipo: "retirar",
      motivo: `${origen}:retirar`,
    });
  }
  return retirado;
}

export function procesarEventoEstadoTacticoCombatiente(combatiente, tipoEvento, contexto = {}, {
  origen = "estado_tactico",
} = {}) {
  const retirados = combatiente?.sistemaEstadosTacticosCombatiente?.procesarEvento(
    tipoEvento,
    contexto,
  ) ?? Object.freeze([]);
  if (retirados.length > 0) {
    notificarCambioTactico(combatiente, {
      origen,
      tipo: "procesar_evento",
      motivo: `${origen}:${tipoEvento}`,
    });
  }
  return retirados;
}

function notificarCambioTactico(combatiente, detalle) {
  notificarCambioEstadoJugador(combatiente, {
    ...detalle,
    estadoJugador: true,
    habilidades: true,
  });
}
