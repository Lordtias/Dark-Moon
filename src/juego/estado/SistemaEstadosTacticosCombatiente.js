function validarIdEstado(id) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("El estado táctico necesita un ID válido.");
  }
  return id.trim().toLowerCase();
}

function congelarEstado(estado) {
  const datos =
    estado.datos && typeof estado.datos === "object" && !Array.isArray(estado.datos)
      ? Object.freeze({ ...estado.datos })
      : Object.freeze({});
  const etiquetas = Array.isArray(estado.etiquetas)
    ? Object.freeze([...new Set(estado.etiquetas.filter((e) => typeof e === "string" && e.trim() !== "").map((e) => e.trim().toLowerCase()))])
    : Object.freeze([]);
  return Object.freeze({
    id: validarIdEstado(estado.id),
    tipo: typeof estado.tipo === "string" && estado.tipo.trim() !== ""
      ? estado.tipo.trim().toLowerCase()
      : "estado_tactico",
    nombre: typeof estado.nombre === "string" && estado.nombre.trim() !== ""
      ? estado.nombre.trim()
      : estado.id,
    descripcion: typeof estado.descripcion === "string" ? estado.descripcion.trim() : "",
    icono: typeof estado.icono === "string" && estado.icono.trim() !== "" ? estado.icono.trim() : null,
    etiquetas,
    datos,
  });
}

export class SistemaEstadosTacticosCombatiente {
  constructor({ combatiente } = {}) {
    if (!combatiente || typeof combatiente !== "object") {
      throw new Error("SistemaEstadosTacticosCombatiente necesita un combatiente.");
    }
    this.combatiente = combatiente;
    this.estados = new Map();
  }

  activar(estado) {
    const normalizado = congelarEstado(estado ?? {});
    this.estados.set(normalizado.id, normalizado);
    return normalizado;
  }

  retirar(id) {
    return this.estados.delete(validarIdEstado(id));
  }

  obtener(id) {
    return this.estados.get(validarIdEstado(id)) ?? null;
  }

  tiene(id) {
    return this.estados.has(validarIdEstado(id));
  }

  obtenerTodos() {
    return Object.freeze([...this.estados.values()]);
  }

  limpiar() {
    const cantidad = this.estados.size;
    this.estados.clear();
    return cantidad;
  }
}
