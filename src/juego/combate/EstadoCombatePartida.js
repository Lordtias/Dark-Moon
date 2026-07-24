// Mantiene el estado de combate de la partida activa.
//
// La fuente única de verdad es el conjunto de participantes hostiles. El
// jugador está en combate mientras exista al menos un enemigo involucrado.
// Este sistema no contiene lógica de IA, no resuelve ataques y no modifica
// recursos: solamente registra las consecuencias de hostilidad ya validada.
export class EstadoCombatePartida {
  constructor() {
    this.participantesHostiles = new Set();
    this.eventosPendientes = [];
  }

  get estaEnCombate() {
    return this.participantesHostiles.size > 0;
  }

  get cantidadParticipantes() {
    return this.participantesHostiles.size;
  }

  obtenerParticipantes() {
    return [...this.participantesHostiles];
  }

  tieneParticipante(participante) {
    return this.participantesHostiles.has(participante);
  }

  registrarParticipante(participante, { motivo = "hostilidad_real" } = {}) {
    if (!participante || typeof participante !== "object") {
      throw new Error("El participante de combate debe ser un objeto válido.");
    }

    // Una entidad ya derrotada no puede volver a iniciar combate por un evento
    // tardío, por ejemplo un tick periódico procesado después de su muerte.
    if (participante.estaVivo === false || participante.estaDestruido === true) {
      return {
        cambio: false,
        inicioCombate: false,
        finCombate: false,
      };
    }

    const estabaEnCombate = this.estaEnCombate;
    const cantidadAnterior = this.cantidadParticipantes;
    const cantidadPosterior = this.participantesHostiles.add(participante).size;
    const cambio = cantidadPosterior !== cantidadAnterior;
    const inicioCombate = cambio && !estabaEnCombate;

    if (inicioCombate) {
      this.eventosPendientes.push({
        tipo: "combate_iniciado",
        motivo,
        participante,
        cantidadParticipantes: cantidadPosterior,
      });
    }

    return {
      cambio,
      inicioCombate,
      finCombate: false,
    };
  }

  retirarParticipante(participante, { motivo = "participante_retirado" } = {}) {
    if (!participante || typeof participante !== "object") {
      return {
        cambio: false,
        inicioCombate: false,
        finCombate: false,
      };
    }

    const estabaEnCombate = this.estaEnCombate;
    const cambio = this.participantesHostiles.delete(participante);
    const finCombate = cambio && estabaEnCombate && !this.estaEnCombate;

    if (finCombate) {
      this.eventosPendientes.push({
        tipo: "combate_finalizado",
        motivo,
        ultimoParticipante: participante,
        cantidadParticipantes: 0,
      });
    }

    return {
      cambio,
      inicioCombate: false,
      finCombate,
    };
  }

  retirarParticipantesInvalidos(
    esParticipanteValido,
    { motivo = "participante_invalido" } = {},
  ) {
    if (typeof esParticipanteValido !== "function") {
      throw new Error("La validación de participantes debe ser una función.");
    }

    let cantidadRetirada = 0;
    for (const participante of this.obtenerParticipantes()) {
      if (esParticipanteValido(participante)) {
        continue;
      }

      const resultado = this.retirarParticipante(participante, { motivo });
      if (resultado.cambio) {
        cantidadRetirada++;
      }
    }

    return cantidadRetirada;
  }

  limpiar({ motivo = "estado_limpiado" } = {}) {
    if (!this.estaEnCombate) {
      return {
        cambio: false,
        inicioCombate: false,
        finCombate: false,
        cantidadRetirada: 0,
      };
    }

    const cantidadRetirada = this.cantidadParticipantes;
    this.participantesHostiles.clear();
    this.eventosPendientes.push({
      tipo: "combate_finalizado",
      motivo,
      ultimoParticipante: null,
      cantidadParticipantes: 0,
      cantidadRetirada,
    });

    return {
      cambio: true,
      inicioCombate: false,
      finCombate: true,
      cantidadRetirada,
    };
  }

  extraerEventosPendientes() {
    const eventos = [...this.eventosPendientes];
    this.eventosPendientes.length = 0;
    return eventos;
  }
}
