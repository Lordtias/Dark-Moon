// Adapta estados tácticos activos al contrato normal de proveedores del SMC.
// El SMC no conoce nombres de estados: solamente recibe descriptores ya
// declarados por cada postura/concentración que aporte magnitudes.
export function obtenerModificadoresEstadosTacticos({ combatiente } = {}) {
  const sistema = combatiente?.sistemaEstadosTacticosCombatiente;
  if (!sistema || typeof sistema.obtenerTodos !== "function") return [];

  const resultado = [];
  for (const estado of sistema.obtenerTodos()) {
    const modificadores = Array.isArray(estado.modificadores)
      ? estado.modificadores
      : [];
    modificadores.forEach((descriptor, indice) => {
      resultado.push({
        ...descriptor,
        id: descriptor.id ?? `estado_tactico:${estado.id}:${indice + 1}`,
        origen: descriptor.origen ?? "estado_tactico",
        fuente: descriptor.fuente ?? Object.freeze({
          tipo: "estado_tactico",
          estadoId: estado.id,
          estadoNombre: estado.nombre,
        }),
      });
    });
  }
  return resultado;
}
