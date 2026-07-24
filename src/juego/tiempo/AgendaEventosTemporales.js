// Agenda determinista para ticks y vencimientos.
//
// No registra combatientes. Los actores continúan perteneciendo únicamente
// a SistemaTiempo.
export class AgendaEventosTemporales {
  constructor() {
    this.eventos = new Map();
    this.siguienteOrdenRegistro = 0;
  }

  programar({ id, instante, prioridad = 0, tipo, datos = {} } = {}) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new Error("El evento temporal necesita un ID.");
    }
    if (this.eventos.has(id)) {
      throw new Error(`El evento temporal "${id}" ya está programado.`);
    }
    if (!Number.isFinite(instante) || instante < 0) {
      throw new Error("El instante del evento temporal no es válido.");
    }
    if (!Number.isFinite(prioridad)) {
      throw new Error("La prioridad del evento temporal no es válida.");
    }
    if (typeof tipo !== "string" || tipo.trim() === "") {
      throw new Error("El evento temporal necesita un tipo.");
    }
    if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
      throw new Error("Los datos del evento temporal no son válidos.");
    }

    const evento = {
      id: id.trim(),
      instante,
      prioridad,
      tipo: tipo.trim(),
      datos: { ...datos },
      ordenRegistro: this.siguienteOrdenRegistro,
    };

    this.siguienteOrdenRegistro++;
    this.eventos.set(evento.id, evento);

    return { ...evento, datos: { ...evento.datos } };
  }

  cancelar(id) {
    return this.eventos.delete(id);
  }

  cancelarPorPredicado(predicado) {
    if (typeof predicado !== "function") {
      throw new Error("La cancelación necesita un predicado válido.");
    }

    let cantidad = 0;

    for (const [id, evento] of this.eventos.entries()) {
      if (!predicado(evento)) {
        continue;
      }

      this.eventos.delete(id);
      cantidad++;
    }

    return cantidad;
  }

  obtenerEventosOrdenados() {
    return [...this.eventos.values()].sort((eventoA, eventoB) => {
      if (eventoA.instante !== eventoB.instante) {
        return eventoA.instante - eventoB.instante;
      }
      if (eventoA.prioridad !== eventoB.prioridad) {
        return eventoA.prioridad - eventoB.prioridad;
      }
      return eventoA.ordenRegistro - eventoB.ordenRegistro;
    });
  }

  obtenerSiguienteInstante() {
    return this.obtenerEventosOrdenados()[0]?.instante ?? null;
  }

  extraerEventosEn(instante) {
    if (!Number.isFinite(instante) || instante < 0) {
      throw new Error("El instante consultado no es válido.");
    }

    const extraidos = this.obtenerEventosOrdenados().filter(
      (evento) => evento.instante === instante,
    );

    for (const evento of extraidos) {
      this.eventos.delete(evento.id);
    }

    return extraidos.map((evento) => ({
      ...evento,
      datos: { ...evento.datos },
    }));
  }

  limpiar() {
    const cantidad = this.eventos.size;
    this.eventos.clear();
    return cantidad;
  }

  obtenerCantidad() {
    return this.eventos.size;
  }
}
