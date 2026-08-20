import { notificarCambioEstadoJugador } from "../estado/ObservadorCambiosEstadoJugador.js";

export const ID_ESTADO_PREPARACION_ACCION = "preparacion_accion";

export function obtenerPreparacionAccion(combatiente) {
  return combatiente?.sistemaEstadosTacticosCombatiente?.obtener(ID_ESTADO_PREPARACION_ACCION) ?? null;
}

export function activarPreparacionAccion(combatiente, {
  tipoAccion,
  nombre,
  descripcion = "",
  icono = null,
  datos = {},
} = {}) {
  if (!combatiente?.sistemaEstadosTacticosCombatiente) {
    throw new Error("El combatiente no dispone del sistema de estados tácticos.");
  }
  if (typeof tipoAccion !== "string" || tipoAccion.trim() === "") {
    throw new Error("La preparación necesita un tipo de acción.");
  }
  const estado = combatiente.sistemaEstadosTacticosCombatiente.activar({
    id: ID_ESTADO_PREPARACION_ACCION,
    tipo: "preparacion",
    nombre: nombre ?? "Preparación",
    descripcion,
    icono,
    etiquetas: ["favorable", "preparacion"],
    datos: { ...datos, tipoAccion: tipoAccion.trim().toLowerCase() },
  });
  notificarCambioEstadoJugador(combatiente, {
    origen: "preparacion_accion",
    tipo: "activar",
    estadoJugador: true,
    habilidades: true,
    motivo: "preparacion_accion:activar",
  });
  return estado;
}

export function retirarPreparacionAccion(combatiente) {
  const retirada = combatiente?.sistemaEstadosTacticosCombatiente?.retirar(ID_ESTADO_PREPARACION_ACCION) ?? false;
  if (retirada) {
    notificarCambioEstadoJugador(combatiente, {
      origen: "preparacion_accion",
      tipo: "retirar",
      estadoJugador: true,
      habilidades: true,
      motivo: "preparacion_accion:retirar",
    });
  }
  return retirada;
}
