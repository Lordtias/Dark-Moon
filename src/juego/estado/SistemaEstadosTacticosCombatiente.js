export const TIPOS_EVENTO_ESTADO_TACTICO = Object.freeze({
  MOVIMIENTO: "movimiento",
  ESPERA: "espera",
  ACCION: "accion",
  CONSUMO: "consumo",
  DANIO_RECIBIDO: "danio_recibido",
  HABILIDAD_EJECUTADA: "habilidad_ejecutada",
  ACCION_EJECUTADA: "accion_ejecutada",
});

const TIPOS_EVENTO_ESTADO_TACTICO_VALIDOS = new Set(
  Object.values(TIPOS_EVENTO_ESTADO_TACTICO),
);

export function validarTipoEventoEstadoTactico(tipoEvento) {
  if (typeof tipoEvento !== "string" || tipoEvento.trim() === "") {
    throw new Error("El evento táctico necesita un tipo válido.");
  }
  const normalizado = tipoEvento.trim().toLowerCase();
  if (!TIPOS_EVENTO_ESTADO_TACTICO_VALIDOS.has(normalizado)) {
    throw new Error(`El evento táctico desconocido "${normalizado}" no existe.`);
  }
  return normalizado;
}

function validarIdEstado(id) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("El estado táctico necesita un ID válido.");
  }
  return id.trim().toLowerCase();
}

function normalizarListaTextos(valores = []) {
  if (!Array.isArray(valores)) {
    throw new Error("La política del estado táctico debe usar una lista.");
  }
  return Object.freeze([
    ...new Set(
      valores
        .filter((valor) => typeof valor === "string" && valor.trim() !== "")
        .map((valor) => valor.trim().toLowerCase()),
    ),
  ]);
}

function normalizarListaEventosTacticos(valores = []) {
  return Object.freeze(
    normalizarListaTextos(valores).map((valor) => validarTipoEventoEstadoTactico(valor)),
  );
}

function normalizarPoliticas(politicas) {
  if (politicas === null || politicas === undefined) {
    return Object.freeze({
      interrumpirPor: Object.freeze([]),
      consumirAlEjecutarEtiquetas: Object.freeze([]),
      interrumpirAlEjecutarEtiquetas: Object.freeze([]),
    });
  }
  if (typeof politicas !== "object" || Array.isArray(politicas)) {
    throw new Error("Las políticas del estado táctico deben ser un objeto.");
  }
  const conocidas = new Set([
    "interrumpirPor",
    "consumirAlEjecutarEtiquetas",
    "interrumpirAlEjecutarEtiquetas",
  ]);
  for (const clave of Object.keys(politicas)) {
    if (!conocidas.has(clave)) {
      throw new Error(`La política táctica usa la clave desconocida "${clave}".`);
    }
  }
  return Object.freeze({
    interrumpirPor: normalizarListaEventosTacticos(politicas.interrumpirPor ?? []),
    consumirAlEjecutarEtiquetas: normalizarListaTextos(
      politicas.consumirAlEjecutarEtiquetas ?? [],
    ),
    interrumpirAlEjecutarEtiquetas: normalizarListaTextos(
      politicas.interrumpirAlEjecutarEtiquetas ?? [],
    ),
  });
}

function normalizarModificadores(modificadores) {
  if (modificadores === null || modificadores === undefined) {
    return Object.freeze([]);
  }
  if (!Array.isArray(modificadores)) {
    throw new Error("Los modificadores de un estado táctico deben ser una lista.");
  }
  return Object.freeze(
    modificadores.map((descriptor) => {
      if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) {
        throw new Error("Cada modificador táctico debe ser un objeto válido.");
      }
      return Object.freeze({
        ...descriptor,
        condiciones:
          descriptor.condiciones && typeof descriptor.condiciones === "object"
            ? Object.freeze({ ...descriptor.condiciones })
            : Object.freeze({}),
      });
    }),
  );
}

function congelarEstado(estado) {
  const datos =
    estado.datos && typeof estado.datos === "object" && !Array.isArray(estado.datos)
      ? Object.freeze({ ...estado.datos })
      : Object.freeze({});
  const etiquetas = Array.isArray(estado.etiquetas)
    ? Object.freeze([
        ...new Set(
          estado.etiquetas
            .filter((e) => typeof e === "string" && e.trim() !== "")
            .map((e) => e.trim().toLowerCase()),
        ),
      ])
    : Object.freeze([]);
  return Object.freeze({
    id: validarIdEstado(estado.id),
    tipo:
      typeof estado.tipo === "string" && estado.tipo.trim() !== ""
        ? estado.tipo.trim().toLowerCase()
        : "estado_tactico",
    nombre:
      typeof estado.nombre === "string" && estado.nombre.trim() !== ""
        ? estado.nombre.trim()
        : estado.id,
    descripcion:
      typeof estado.descripcion === "string" ? estado.descripcion.trim() : "",
    icono:
      typeof estado.icono === "string" && estado.icono.trim() !== ""
        ? estado.icono.trim()
        : null,
    etiquetas,
    datos,
    modificadores: normalizarModificadores(estado.modificadores),
    politicas: normalizarPoliticas(estado.politicas),
  });
}

function comparteEtiqueta(esperadas, recibidas) {
  if (!Array.isArray(esperadas) || esperadas.length === 0) return false;
  const conjunto = new Set(
    Array.isArray(recibidas)
      ? recibidas
          .filter((valor) => typeof valor === "string")
          .map((valor) => valor.trim().toLowerCase())
      : [],
  );
  return esperadas.some((etiqueta) => conjunto.has(etiqueta));
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

  // Procesa hechos canónicos ya ocurridos. Las políticas pertenecen al estado
  // y no a su nombre, por lo que posturas, concentraciones y futuras guardias
  // pueden reutilizar el mismo contrato sin casos especiales.
  procesarEvento(tipoEvento, contexto = {}) {
    const tipo = validarTipoEventoEstadoTactico(tipoEvento);
    const etiquetas = Array.isArray(contexto.etiquetas) ? contexto.etiquetas : [];
    const retirados = [];

    for (const estado of this.obtenerTodos()) {
      const politicas = estado.politicas;
      const interrumpirPorEvento = politicas.interrumpirPor.includes(tipo);
      const consumePorEjecucion =
        tipo === TIPOS_EVENTO_ESTADO_TACTICO.ACCION_EJECUTADA &&
        comparteEtiqueta(politicas.consumirAlEjecutarEtiquetas, etiquetas);
      const interrumpePorEjecucion =
        tipo === TIPOS_EVENTO_ESTADO_TACTICO.ACCION_EJECUTADA &&
        comparteEtiqueta(politicas.interrumpirAlEjecutarEtiquetas, etiquetas);

      if (!interrumpirPorEvento && !consumePorEjecucion && !interrumpePorEjecucion) {
        continue;
      }
      if (this.estados.delete(estado.id)) {
        retirados.push(
          Object.freeze({
            estado,
            motivo: consumePorEjecucion ? "consumido" : "interrumpido",
            tipoEvento: tipo,
          }),
        );
      }
    }

    return Object.freeze(retirados);
  }

  limpiar() {
    const cantidad = this.estados.size;
    this.estados.clear();
    return cantidad;
  }
}
