export const PERCEPCION_BASE_JUGADOR = 10;

// Mantiene la Percepción del jugador separada de los atributos principales.
//
// La base canónica es 10. Los modificadores futuros pueden provenir de
// pasivas, auras, objetos, profesiones u otros sistemas sin acoplar esta
// estadística a Fuerza, Destreza, Constitución, Inteligencia, Sabiduría o
// Carisma.
export class PercepcionJugador {
  constructor({ base = PERCEPCION_BASE_JUGADOR } = {}) {
    validarValorPercepcion(base, "La Percepción base");

    this.base = base;
    this.modificadores = new Map();
  }

  get actual() {
    let total = this.base;

    for (const modificador of this.modificadores.values()) {
      total += modificador.valor;
    }

    return Math.max(0, total);
  }

  registrarModificador({ id, valor, origen = null } = {}) {
    validarIdModificador(id);
    validarValorModificador(valor);

    const normalizado = {
      id: id.trim(),
      valor,
      origen: normalizarOrigen(origen),
    };

    this.modificadores.set(normalizado.id, normalizado);

    return {
      exito: true,
      modificador: { ...normalizado },
      percepcionActual: this.actual,
    };
  }

  retirarModificador(id) {
    validarIdModificador(id);
    const eliminado = this.modificadores.delete(id.trim());

    return {
      exito: eliminado,
      percepcionActual: this.actual,
    };
  }

  obtenerResumen() {
    return {
      base: this.base,
      actual: this.actual,
      modificadores: [...this.modificadores.values()].map((modificador) => ({
        ...modificador,
      })),
    };
  }
}

function validarIdModificador(id) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("El modificador de Percepción necesita un ID válido.");
  }
}

function validarValorPercepcion(valor, descripcion) {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`${descripcion} debe ser un número igual o mayor que 0.`);
  }
}

function validarValorModificador(valor) {
  if (!Number.isFinite(valor)) {
    throw new Error("El valor del modificador de Percepción debe ser numérico.");
  }
}

function normalizarOrigen(origen) {
  if (origen === null || origen === undefined) return null;
  if (typeof origen !== "string" || origen.trim() === "") {
    throw new Error("El origen del modificador de Percepción debe ser válido.");
  }
  return origen.trim();
}
