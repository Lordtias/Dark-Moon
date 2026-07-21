import { Combatiente } from "../../entidad/destructible/combatiente/Combatiente.js";
import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";
import { procesarAccionEnemigo } from "../ia/SistemaAccionesEnemigos.js";
import { SistemaTiempo, TIEMPO_REFERENCIA } from "./SistemaTiempo.js";

// Coordina el avance temporal completo de una partida.
//
// SistemaTiempo continúa siendo responsable únicamente de:
//
// - Mantener la agenda.
// - Calcular costes temporales.
// - Registrar acciones.
// - Determinar cuál es el siguiente actor.
//
// Este coordinador agrega las reglas propias de una partida:
//
// - Registrar y retirar enemigos.
// - Ejecutar acciones enemigas.
// - Aplicar regeneración periódica.
// - Avanzar hasta que el jugador pueda actuar nuevamente.
// - Construir el resultado temporal de una acción.
//
// De esta manera, Juego deja de conocer los detalles internos
// del ciclo temporal y puede limitarse a coordinar sistemas.
export class CoordinadorTiempoPartida {
  constructor({ mapa, jugador, objetivos } = {}) {
    if (!Array.isArray(mapa) || mapa.length === 0) {
      throw new Error("CoordinadorTiempoPartida necesita un mapa válido.");
    }

    if (!jugador || typeof jugador !== "object") {
      throw new Error("CoordinadorTiempoPartida necesita un jugador válido.");
    }

    if (!Array.isArray(objetivos)) {
      throw new Error(
        "CoordinadorTiempoPartida necesita una lista de objetivos.",
      );
    }

    // Conservamos referencias a los elementos reales de la partida.
    //
    // No copiamos la lista de objetivos porque Juego puede agregar,
    // destruir o retirar enemigos durante la partida.
    this.mapa = mapa;
    this.jugador = jugador;
    this.objetivos = objetivos;

    // SistemaTiempo mantiene la agenda temporal de los actores.
    this.sistemaTiempo = new SistemaTiempo();

    // La regeneración ocurre cada bloque de tiempo de referencia.
    this.siguientePulsoTemporal = TIEMPO_REFERENCIA;

    // El jugador siempre debe formar parte de la agenda.
    this.sistemaTiempo.registrarActor(this.jugador);

    // Registramos los enemigos iniciales.
    this.sincronizarEnemigosConAgenda();

    // Colocamos el reloj en la primera disponibilidad real.
    this.avanzarHastaSiguienteActorConPulsos();
  }

  // Expone el tiempo actual sin obligar a Juego
  // a consultar directamente los detalles de la agenda.
  get tiempoActual() {
    return this.sistemaTiempo.tiempoActual;
  }

  // Retira explícitamente un actor de la agenda.
  //
  // Se utiliza, por ejemplo, cuando un enemigo es derrotado
  // durante un ataque del jugador.
  eliminarActor(actor) {
    this.sistemaTiempo.eliminarActor(actor);
  }

  // Completa una acción que primero devolvió un resultado propio.
  //
  // Se utiliza especialmente para inventario, equipamiento,
  // consumo de objetos y transferencia de botín.
  finalizarResultadoAccionJugador({ resultado, tipoAccion, costoBase } = {}) {
    if (
      !resultado ||
      typeof resultado !== "object" ||
      typeof resultado.exito !== "boolean"
    ) {
      throw new Error(
        "La acción del jugador debe devolver un resultado válido.",
      );
    }

    // Los intentos fallidos no consumen tiempo.
    if (!resultado.exito) {
      return {
        ...resultado,
        turnoConsumido: false,
        redibujar: resultado.redibujar ?? false,
      };
    }

    const resultadoTemporal = this.finalizarAccionJugador({
      mensaje: resultado.mensaje,
      tipoAccion,
      costoBase,
    });

    // Conservamos los datos específicos de la acción original
    // y agregamos el resultado del avance temporal.
    return {
      ...resultado,
      ...resultadoTemporal,
      exito: true,
    };
  }

  // Mantiene la agenda sincronizada con los enemigos vivos.
  //
  // Los objetivos no combatientes no participan
  // del sistema temporal.
  sincronizarEnemigosConAgenda() {
    for (const objetivo of this.objetivos) {
      if (!(objetivo instanceof Enemigo)) {
        continue;
      }

      // Un enemigo destruido no debe conservar turnos pendientes.
      if (!objetivo.estaVivo) {
        this.sistemaTiempo.eliminarActor(objetivo);
        continue;
      }

      // Evitamos registrar dos veces al mismo enemigo.
      if (!this.sistemaTiempo.tieneActor(objetivo)) {
        this.sistemaTiempo.registrarActor(objetivo);
      }
    }
  }

  // Aplica un pulso de regeneración a todos los combatientes vivos.
  //
  // Solo devolvemos la recuperación del jugador porque actualmente
  // es la única que se muestra en el historial de la interfaz.
  aplicarPulsoRegeneracion() {
    const combatientes = [
      this.jugador,
      ...this.objetivos.filter((objetivo) => objetivo instanceof Combatiente),
    ];

    let resultadoJugador = {
      vidaRecuperada: 0,
      manaRecuperado: 0,
    };

    for (const combatiente of combatientes) {
      if (!combatiente.estaVivo) {
        continue;
      }

      const resultado = combatiente.procesarPulsoRegeneracion();

      if (combatiente === this.jugador) {
        resultadoJugador = resultado;
      }
    }

    return resultadoJugador;
  }

  // Procesa todos los pulsos de regeneración que ocurran
  // antes o exactamente en el tiempo de destino.
  procesarPulsosTemporalesHasta(tiempoDestino) {
    if (!Number.isFinite(tiempoDestino) || tiempoDestino < 0) {
      throw new Error("El tiempo de destino debe ser un número válido.");
    }

    const recuperacionTotal = {
      vidaRecuperada: 0,
      manaRecuperado: 0,
    };

    while (this.siguientePulsoTemporal <= tiempoDestino) {
      // El reloj avanza primero hasta el instante del pulso.
      this.sistemaTiempo.avanzarTiempoHasta(this.siguientePulsoTemporal);

      const recuperacion = this.aplicarPulsoRegeneracion();

      recuperacionTotal.vidaRecuperada += recuperacion.vidaRecuperada;

      recuperacionTotal.manaRecuperado += recuperacion.manaRecuperado;

      this.siguientePulsoTemporal += TIEMPO_REFERENCIA;
    }

    return recuperacionTotal;
  }

  // Avanza hasta el siguiente actor disponible,
  // procesando previamente los pulsos de regeneración.
  avanzarHastaSiguienteActorConPulsos() {
    const tiempoSiguienteActor =
      this.sistemaTiempo.obtenerTiempoSiguienteActor();

    if (tiempoSiguienteActor === null) {
      return {
        actor: null,
        recuperacionJugador: {
          vidaRecuperada: 0,
          manaRecuperado: 0,
        },
      };
    }

    const recuperacionJugador =
      this.procesarPulsosTemporalesHasta(tiempoSiguienteActor);

    const actor = this.sistemaTiempo.avanzarHastaSiguienteActor();

    return {
      actor,
      recuperacionJugador,
    };
  }

  // Ejecuta acciones enemigas hasta que el jugador
  // vuelve a ser el siguiente actor disponible.
  procesarHastaTurnoJugador() {
    const mensajes = [];

    const recuperacionTotal = {
      vidaRecuperada: 0,
      manaRecuperado: 0,
    };

    while (this.jugador.estaVivo) {
      // Los enemigos pueden haber muerto o haberse incorporado
      // desde la última acción.
      this.sincronizarEnemigosConAgenda();

      const siguienteActor = this.sistemaTiempo.obtenerSiguienteActor();

      if (!siguienteActor) {
        break;
      }

      const avance = this.avanzarHastaSiguienteActorConPulsos();

      recuperacionTotal.vidaRecuperada +=
        avance.recuperacionJugador.vidaRecuperada;

      recuperacionTotal.manaRecuperado +=
        avance.recuperacionJugador.manaRecuperado;

      // El ciclo termina cuando el jugador vuelve
      // a estar disponible.
      if (avance.actor === this.jugador) {
        break;
      }

      const enemigo = avance.actor;

      const resultadoEnemigo = procesarAccionEnemigo({
        enemigo,
        jugador: this.jugador,
        mapa: this.mapa,
        objetivos: this.objetivos,
      });

      mensajes.push(...resultadoEnemigo.mensajes);

      // Una acción enemiga válida genera una nueva
      // disponibilidad dentro de la agenda.
      if (enemigo.estaVivo) {
        this.sistemaTiempo.registrarAccion({
          actor: enemigo,
          tipoAccion: resultadoEnemigo.tipoAccion,
          costoBase: resultadoEnemigo.costoBase,
        });
      } else {
        this.sistemaTiempo.eliminarActor(enemigo);
      }

      // Si el jugador fue derrotado no se ejecutan
      // acciones enemigas adicionales.
      if (!this.jugador.estaVivo) {
        break;
      }
    }

    return {
      mensajes,
      mensaje: mensajes.filter(Boolean).join("\n"),
      recuperacionJugador: recuperacionTotal,
    };
  }

  // Construye el texto utilizado para informar
  // la regeneración del jugador.
  crearMensajeRegeneracion(regeneracion) {
    const recursosRecuperados = [];

    if (regeneracion.vidaRecuperada > 0) {
      recursosRecuperados.push(`${regeneracion.vidaRecuperada} de Vida`);
    }

    if (regeneracion.manaRecuperado > 0) {
      recursosRecuperados.push(`${regeneracion.manaRecuperado} de Maná`);
    }

    if (recursosRecuperados.length === 0) {
      return null;
    }

    return "Recuperaste " + `${recursosRecuperados.join(" y ")}.`;
  }

  // Registra una acción del jugador y ejecuta todo lo ocurrido
  // hasta que el jugador pueda actuar nuevamente.
  finalizarAccionJugador({ mensaje, tipoAccion, costoBase } = {}) {
    this.sincronizarEnemigosConAgenda();

    const actorActual = this.sistemaTiempo.obtenerSiguienteActor();

    if (actorActual !== this.jugador) {
      throw new Error("El jugador intentó actuar fuera de su turno temporal.");
    }

    this.sistemaTiempo.registrarAccion({
      actor: this.jugador,
      tipoAccion,
      costoBase,
    });

    const resultadoTemporal = this.procesarHastaTurnoJugador();

    const mensajes = [mensaje, ...resultadoTemporal.mensajes];

    const mensajeRegeneracion = this.crearMensajeRegeneracion(
      resultadoTemporal.recuperacionJugador,
    );

    if (mensajeRegeneracion) {
      mensajes.push(mensajeRegeneracion);
    }

    return {
      mensaje: mensajes.filter(Boolean).join("\n"),
      turnoConsumido: true,
      redibujar: true,

      // La propiedad ya existe en ResultadoAccion.
      //
      // Todavía queda vacía, pero posteriormente este coordinador
      // podrá agregar eventos de movimiento, ataques y regeneración.
      eventos: [],
    };
  }
}
