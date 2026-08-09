import { traducir } from "../../idiomas/ContextoIdioma.js";
import {
  TIPOS_EVENTO_VISUAL,
} from "../PlanificadorEventosVisuales.js";
import {
  CENTROS_VISUALES_HABILIDAD,
  PATRONES_VISUALES_HABILIDAD,
  resolverContratoPatronVisualHabilidad,
} from "../PatronesVisualesHabilidades.js";
import { obtenerPerfilAtaque } from "../ContextoPerfilesAtaquePorFamilia.js";
import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "../TiposEscena.js";
import {
  calcularDuracionAnimacionPhaser,
  CONFIGURACION_ANIMACIONES_PHASER,
  normalizarVelocidadAnimacionPhaser,
} from "./ConfiguracionAnimacionesPhaser.js";
import { TAMANO_CASILLA_REFERENCIA } from "./ConfiguracionPhaser.js";
import { CreadorEfectosCombatePhaser } from "./CreadorEfectosCombatePhaser.js";
import { CreadorEfectosHabilidadesPhaser } from "./CreadorEfectosHabilidadesPhaser.js";
import { CreadorAreasHabilidadesPhaser } from "./CreadorAreasHabilidadesPhaser.js";
import { CreadorCadenasHabilidadesPhaser } from "./CreadorCadenasHabilidadesPhaser.js";
import { CreadorLineasHabilidadesPhaser } from "./CreadorLineasHabilidadesPhaser.js";
import { CreadorZonasTemporalesPhaser } from "./CreadorZonasTemporalesPhaser.js";
import { CreadorEstadosTemporalesPhaser } from "./CreadorEstadosTemporalesPhaser.js";
import { CreadorEfectosRecuperacionPhaser } from "./CreadorEfectosRecuperacionPhaser.js";
import {
  CONFIGURACION_EFECTOS_RECUPERACION_PHASER,
} from "./ConfiguracionEfectosRecuperacionPhaser.js";
import {
  CreadorProyectilesElementalesPhaser,
} from "./CreadorProyectilesElementalesPhaser.js";
import {
  ANCLAJES_RECURSO,
  CreadorRecursosVisualesPhaser,
} from "./CreadorRecursosVisualesPhaser.js";
import {
  CONFIGURACION_EFECTOS_COMBATE_PHASER,
  TIPOS_FEEDBACK_COMBATE,
} from "./ConfiguracionEfectosCombatePhaser.js";

// Reproduce hechos ya resueltos. La cola jamás modifica el estado del juego ni
// decide el orden temporal: solamente conserva el orden recibido.
export class ReproductorEventosVisualesPhaser {
  constructor({
    escena,
    compositor,
    gestorRecursos,
    alAplicarEscena,
    alMoverJugadorVisual = null,
  } = {}) {
    if (!escena?.tweens || !escena?.time || !compositor || !gestorRecursos) {
      throw new Error(
        "El reproductor visual necesita escena, compositor y recursos válidos.",
      );
    }

    if (typeof alAplicarEscena !== "function") {
      throw new Error("El reproductor visual necesita aplicar la escena final.");
    }

    if (
      alMoverJugadorVisual !== null &&
      typeof alMoverJugadorVisual !== "function"
    ) {
      throw new Error("El seguimiento visual del jugador debe ser una función.");
    }

    this.escena = escena;
    this.compositor = compositor;
    this.gestorRecursos = gestorRecursos;
    this.alAplicarEscena = alAplicarEscena;
    this.alMoverJugadorVisual = alMoverJugadorVisual;
    this.creadorEfectos = new CreadorEfectosCombatePhaser({
      escena,
      compositor,
    });
    this.creadorEfectosHabilidades = new CreadorEfectosHabilidadesPhaser({
      escena,
      compositor,
    });
    this.creadorAreasHabilidades = new CreadorAreasHabilidadesPhaser({
      escena,
      compositor,
    });
    this.creadorCadenasHabilidades = new CreadorCadenasHabilidadesPhaser({
      escena,
      compositor,
    });
    this.creadorLineasHabilidades = new CreadorLineasHabilidadesPhaser({
      escena,
      compositor,
    });
    this.creadorZonasTemporales = new CreadorZonasTemporalesPhaser({
      escena,
      compositor,
    });
    this.creadorEstadosTemporales = new CreadorEstadosTemporalesPhaser({
      escena,
      compositor,
    });
    this.creadorEfectosRecuperacion = new CreadorEfectosRecuperacionPhaser({
      escena,
      compositor,
    });
    this.creadorProyectilesElementales =
      new CreadorProyectilesElementalesPhaser({ escena, compositor });
    this.creadorRecursosVisuales = new CreadorRecursosVisualesPhaser({
      escena,
      compositor,
      gestorRecursos,
    });
    this.cola = [];
    this.reproduciendo = false;
    this.destruido = false;
    this.velocidad = CONFIGURACION_ANIMACIONES_PHASER.velocidadInicial;
    this.efectosReducidos = false;
    this.tweensActivos = new Set();
    this.temporizadoresActivos = new Set();
    this.esperadoresInactividad = new Set();
    this.versionCancelacion = 0;
  }

  configurar({ velocidad, efectosReducidos } = {}) {
    if (velocidad !== undefined) {
      this.velocidad = normalizarVelocidadAnimacionPhaser(velocidad);
    }

    if (efectosReducidos !== undefined) {
      this.efectosReducidos = efectosReducidos === true;
    }

    return Object.freeze({
      velocidad: this.velocidad,
      efectosReducidos: this.efectosReducidos,
    });
  }

  encolar({ escenaFinal, eventosVisuales = [] } = {}) {
    if (this.destruido || !escenaFinal) {
      return false;
    }

    this.cola.push({
      escenaFinal,
      eventosVisuales: Array.isArray(eventosVisuales)
        ? [...eventosVisuales]
        : [],
    });
    this.iniciarProcesamiento();
    return true;
  }

  estaActivo() {
    return this.reproduciendo || this.cola.length > 0;
  }

  obtenerCantidadEventosPendientes() {
    return this.cola.reduce(
      (total, actualizacion) => total + actualizacion.eventosVisuales.length,
      0,
    );
  }

  esperarInactividad() {
    if (!this.estaActivo()) return Promise.resolve();
    return new Promise((resolver) => {
      this.esperadoresInactividad.add(resolver);
    });
  }

  resolverEsperadoresInactividad() {
    if (this.estaActivo()) return;
    for (const resolver of this.esperadoresInactividad) resolver();
    this.esperadoresInactividad.clear();
  }

  cancelar({ aplicarUltimaEscena = false } = {}) {
    this.versionCancelacion += 1;
    const ultimaEscena = this.cola.at(-1)?.escenaFinal ?? null;
    this.cola.length = 0;

    for (const tween of this.tweensActivos) {
      tween.stop?.();
      tween.remove?.();
    }
    this.tweensActivos.clear();

    for (const espera of this.temporizadoresActivos) {
      espera.temporizador?.remove?.(false);
      espera.finalizar?.();
    }
    this.temporizadoresActivos.clear();

    this.reproduciendo = false;
    this.compositor?.limpiarEfectosTemporales?.();

    if (aplicarUltimaEscena && ultimaEscena) {
      this.alAplicarEscena(ultimaEscena);
    } else {
      this.compositor?.reconciliarEfectosTemporalesDesdeEscenaActual?.();
      this.compositor?.reconciliarZonasTemporalesDesdeEscenaActual?.();
    }
    this.resolverEsperadoresInactividad();
  }

  destruir() {
    if (this.destruido) return;
    this.destruido = true;
    this.cancelar();
    this.escena = null;
    this.compositor = null;
    this.gestorRecursos = null;
    this.alAplicarEscena = null;
    this.alMoverJugadorVisual = null;
    this.creadorEfectos = null;
    this.creadorEfectosHabilidades = null;
    this.creadorAreasHabilidades = null;
    this.creadorCadenasHabilidades = null;
    this.creadorZonasTemporales = null;
    this.creadorEstadosTemporales = null;
    this.creadorEfectosRecuperacion = null;
    this.creadorProyectilesElementales = null;
    this.creadorRecursosVisuales = null;
  }

  async iniciarProcesamiento() {
    if (this.reproduciendo || this.destruido) {
      return;
    }

    this.reproduciendo = true;
    const version = this.versionCancelacion;

    try {
      while (this.cola.length > 0 && version === this.versionCancelacion) {
        const actualizacion = this.cola.shift();
        await this.reproducirActualizacion(actualizacion, version);
      }
    } finally {
      if (version === this.versionCancelacion) {
        this.reproduciendo = false;
        this.resolverEsperadoresInactividad();
      }
    }
  }

  async reproducirActualizacion(actualizacion, version) {
    for (const evento of actualizacion.eventosVisuales) {
      if (version !== this.versionCancelacion || this.destruido) return;
      await this.reproducirEventoVisual(evento, version);
    }

    if (version === this.versionCancelacion && !this.destruido) {
      this.alAplicarEscena(actualizacion.escenaFinal);
    }
  }

  async reproducirEventoVisual(evento, version) {
    if (!evento || version !== this.versionCancelacion || this.destruido) {
      return;
    }

    if (evento.tipo === TIPOS_EVENTO_VISUAL.MOVIMIENTO_ENTIDAD) {
      await this.reproducirMovimiento(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.ATAQUE_RESUELTO) {
      await this.reproducirAtaqueResuelto(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.HABILIDAD_RESUELTA) {
      await this.reproducirHabilidadResuelta(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.CAMBIO_HOSTILIDAD) {
      this.reproducirCambioHostilidad(evento);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_APLICADO) {
      await this.reproducirEfectoTemporalAplicado(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_ACTUALIZADO) {
      await this.reproducirEfectoTemporalActualizado(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_NO_APLICADO) {
      await this.reproducirEfectoTemporalNoAplicado(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_TICK) {
      await this.reproducirEfectoTemporalTick(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_RETIRADO) {
      await this.reproducirEfectoTemporalRetirado(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.DANIO_PERIODICO) {
      await this.reproducirDanioPeriodico(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.ENTIDAD_DERROTADA) {
      await this.reproducirEntidadDerrotada(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.BOTIN_APARECIDO) {
      await this.reproducirBotinAparecido(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_CREADA) {
      await this.reproducirZonaTemporalCreada(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_RENOVADA) {
      await this.reproducirZonaTemporalRenovada(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_VENCIDA) {
      await this.reproducirZonaTemporalVencida(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_PULSO) {
      await this.reproducirZonaTemporalPulso(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.ACTOR_ENTRO_ZONA_TEMPORAL) {
      await this.reproducirActorEntroZonaTemporal(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_ACTIVADA) {
      await this.reproducirZonaTemporalActivada(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.RECURSOS_RECUPERADOS) {
      await this.reproducirRecursosRecuperados(evento, version);
    } else if (evento.tipo === TIPOS_EVENTO_VISUAL.NIVEL_AUMENTADO) {
      await this.reproducirNivelAumentado(evento, version);
    }
  }

  async reproducirZonaTemporalCreada(evento, version) {
    const zona = evento?.zona;
    if (!zona) return;
    const objeto = this.compositor.establecerZonaTemporal?.(zona);
    if (!objeto) return;

    const duracion = this.calcularDuracion(220);
    if (this.efectosReducidos) {
      await this.esperar(duracion, version);
      return;
    }
    objeto.alpha = 0.16;
    await this.crearTween({
      targets: objeto,
      alpha: 1,
      duration: duracion,
      ease: "Sine.easeOut",
    }, version);
  }

  async reproducirZonaTemporalRenovada(evento, version) {
    const zona = evento?.zona;
    if (!zona) return;
    this.compositor.establecerZonaTemporal?.(zona);
    const pulso = this.efectosReducidos
      ? null
      : this.creadorZonasTemporales?.crearPulsoRenovacion({ zona });
    const duracion = this.calcularDuracion(260);
    if (pulso) {
      await this.crearTween({
        targets: pulso.list ?? pulso,
        alpha: 0,
        scaleX: 1.22,
        scaleY: 1.22,
        duration: duracion,
        ease: "Quad.easeOut",
      }, version);
      pulso.destroy?.(true);
    } else {
      await this.esperar(duracion, version);
    }
  }

  async reproducirZonaTemporalVencida(evento, version) {
    const zona = evento?.zona;
    if (!zona) return;
    const objeto = this.compositor.obtenerZonaTemporalVisual?.(zona.id);
    const duracion = this.calcularDuracion(300);
    if (objeto && !this.efectosReducidos) {
      await this.crearTween({
        targets: objeto,
        alpha: 0,
        duration: duracion,
        ease: "Sine.easeIn",
      }, version);
    } else {
      await this.esperar(duracion, version);
    }
    if (version === this.versionCancelacion && !this.destruido) {
      this.compositor.retirarZonaTemporal?.(zona.id);
    }
  }

  async reproducirZonaTemporalPulso(evento, version) {
    const zona = evento?.zona;
    if (!zona) return;
    const pulso = this.efectosReducidos
      ? null
      : this.creadorZonasTemporales?.crearPulsoActivacion({ zona });
    const duracion = this.calcularDuracion(280);
    if (pulso) {
      await this.crearTween({
        targets: pulso.list ?? pulso,
        alpha: 0,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: duracion,
        ease: "Sine.easeOut",
      }, version);
      pulso.destroy?.(true);
    } else {
      await this.esperar(duracion, version);
    }
  }

  async reproducirActorEntroZonaTemporal(evento, version) {
    const zona = evento?.zona;
    const posicion = evento?.destino;
    if (!zona || !posicion) return;
    const reaccion = this.efectosReducidos
      ? null
      : this.creadorZonasTemporales?.crearReaccionLocal({
          zona,
          posicion,
          tipo: "entrada",
        });
    const duracion = this.calcularDuracion(180);
    if (reaccion) {
      await this.crearTween({
        targets: reaccion,
        alpha: 0,
        scaleX: 1.08,
        scaleY: 1.08,
        angle: 14,
        duration: duracion,
        ease: "Quad.easeOut",
      }, version);
      reaccion.destroy?.();
    } else {
      await this.esperar(duracion, version);
    }
  }

  async reproducirZonaTemporalActivada(evento, version) {
    const zona = evento?.zona;
    const impacto = evento?.impacto;
    if (!zona || !impacto) return;

    const reaccion = this.efectosReducidos
      ? null
      : this.creadorZonasTemporales?.crearReaccionLocal({
          zona,
          posicion: impacto.posicionObjetivo,
          tipo: "impacto",
        });
    const duracion = this.calcularDuracion(220);
    const animaciones = [];
    if (reaccion) {
      animaciones.push(this.crearTween({
        targets: reaccion,
        alpha: 0,
        scaleX: 1.28,
        scaleY: 1.28,
        duration: duracion,
        ease: "Quad.easeOut",
      }, version).then(() => reaccion.destroy?.()));
    }

    animaciones.push(
      this.reproducirResultadoImpactoHabilidad(
        {
          ...evento,
          idActor: null,
          origenActor: impacto.posicionObjetivo,
          posicionObjetivo: impacto.posicionObjetivo,
        },
        impacto,
        version,
      ),
    );

    await Promise.all(animaciones);

  }

  async reproducirEfectoTemporalAplicado(evento, version) {
    this.compositor.establecerEfectoTemporalEntidad?.(
      evento.idObjetivo,
      evento.efecto,
    );
    const centro = this.obtenerCentroEventoEfecto(evento);
    const entrada = this.efectosReducidos
      ? null
      : this.creadorEstadosTemporales?.crearEntrada({
          centro,
          efecto: evento.efecto,
        });

    await Promise.all([
      entrada
        ? this.animarEntradaEstado(entrada, version)
        : Promise.resolve(),
      this.reproducirFeedbackTextoEstado(evento, version),
    ]);
  }

  async reproducirEfectoTemporalActualizado(evento, version) {
    const actualizado = this.compositor.establecerEfectoTemporalEntidad?.(
      evento.idObjetivo,
      evento.efecto,
    ) === true;
    const centro = this.obtenerCentroEventoEfecto(evento);
    const pulso =
      actualizado && !this.efectosReducidos
        ? this.creadorEstadosTemporales?.crearPulsoActualizacion({
            centro,
            efecto: evento.efecto,
          })
        : null;

    await Promise.all([
      this.reproducirFeedbackTextoEstado(evento, version),
      pulso ? this.animarPulsoEstado(pulso, version) : Promise.resolve(),
    ]);
    return actualizado;
  }

  async reproducirEfectoTemporalTick(evento, version) {
    if (this.efectosReducidos) return;
    const centro = this.obtenerCentroEventoEfecto(evento);
    const pulso = this.creadorEstadosTemporales?.crearPulsoTick({
      centro,
      efecto: evento.efecto,
    });
    if (!pulso) return;

    const yInicial = pulso.y;
    await this.crearTween({
      targets: pulso,
      y: yInicial - 8,
      scaleX: 1.24,
      scaleY: 1.24,
      alpha: 0,
      duration: this.calcularDuracion(260),
      ease: "Sine.easeOut",
    }, version);
    pulso.destroy?.(true);
  }

  async animarPulsoEstado(pulso, version) {
    await this.crearTween({
      targets: pulso,
      scaleX: 1.28,
      scaleY: 1.28,
      alpha: 0,
      duration: this.calcularDuracion(230),
      ease: "Quad.easeOut",
    }, version);
    pulso.destroy?.();
  }

  async animarEntradaEstado(entrada, version) {
    await this.crearTween({
      targets: entrada,
      scaleX: 1.24,
      scaleY: 1.24,
      alpha: 0,
      duration: this.calcularDuracion(220),
      ease: "Quad.easeOut",
    }, version);
    entrada.destroy?.();
  }

  async reproducirFeedbackTextoEstado(evento, version) {
    const centro = this.obtenerCentroEventoEfecto(evento);
    const feedback = this.creadorEstadosTemporales?.crearFeedbackEstado({
      centro,
      efecto: evento.efecto,
      operacion: evento.operacion,
    });
    if (!feedback) return;
    const yInicial = feedback.y;

    await this.crearTween({
      targets: feedback,
      y: yInicial - CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.elevacionPx,
      alpha: 0,
      duration: this.calcularDuracion(
        CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.duracionMs,
      ),
      ease: "Quad.easeOut",
    }, version);
    feedback.destroy?.();
  }

  async reproducirEfectoTemporalNoAplicado(evento, version) {
    if (this.efectosReducidos) return;
    const centro = this.obtenerCentroEventoEfecto(evento);
    const feedback = this.creadorEstadosTemporales?.crearNoAplicado({
      centro,
      feedback: evento.feedback,
      motivo: evento.motivo,
    });
    if (!feedback) return;
    const yInicial = feedback.y;

    await this.crearTween({
      targets: feedback,
      y: yInicial - CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.elevacionPx,
      scaleX: CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.escalaFinal,
      scaleY: CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.escalaFinal,
      alpha: 0,
      duration: this.calcularDuracion(
        CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.duracionMs,
      ),
      ease: "Quad.easeOut",
    }, version);
    feedback.destroy?.(true);
  }

  async reproducirEfectoTemporalRetirado(evento, version) {
    const nodo = this.compositor.obtenerNodoEntidad?.(evento.idObjetivo);
    const centro = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : null;

    this.compositor.retirarEfectoTemporalEntidad?.(
      evento.idObjetivo,
      evento.efecto,
    );

    const salida =
      this.efectosReducidos || !centro
        ? null
        : this.creadorEstadosTemporales?.crearRetirada({
            centro,
            efecto: evento.efecto,
          });

    if (!salida) return;
    await this.crearTween({
      targets: salida,
      scaleX: 1.34,
      scaleY: 1.34,
      alpha: 0,
      duration: this.calcularDuracion(210),
      ease: "Sine.easeOut",
    }, version);
    salida.destroy?.();
  }

  obtenerCentroEventoEfecto(evento) {
    const nodo = this.compositor.obtenerNodoEntidad?.(evento.idObjetivo);
    if (nodo?.contenedor) {
      return { x: nodo.contenedor.x, y: nodo.contenedor.y };
    }
    return this.compositor.obtenerCentroCasilla?.(evento.posicionObjetivo);
  }

  reproducirCambioHostilidad(evento) {
    if (
      !Object.values(ESTADOS_HOSTILIDAD_VISUAL).includes(evento.estadoActual)
    ) {
      return false;
    }

    return this.compositor.actualizarHostilidadEntidad?.(
      evento.idEntidad,
      evento.estadoActual,
    ) === true;
  }

  async reproducirMovimiento(evento, version) {
    if (evento.transicionVisibilidad === "salida") {
      await this.reproducirSalidaCampoVisible(evento, version);
      return;
    }
    if (evento.transicionVisibilidad === "entrada") {
      await this.reproducirEntradaCampoVisible(evento, version);
      return;
    }

    const nodo = this.compositor.obtenerNodoEntidad(evento.idEntidad);
    const origen = this.compositor.obtenerCentroCasilla(evento.origen);
    const destino = this.compositor.obtenerCentroCasilla(evento.destino);

    if (!nodo || !origen || !destino) {
      return;
    }

    this.compositor.posicionarNodoEntidad(evento.idEntidad, origen);

    const distancia = Math.hypot(
      evento.destino.x - evento.origen.x,
      evento.destino.y - evento.origen.y,
    );
    const movimientosJugadorPendientes =
      evento.tipoEntidad === TIPOS_ENTIDAD_VISUAL.JUGADOR
        ? this.obtenerRachaMovimientosJugadorPendientes()
        : 0;
    const duracionBaseMovimiento = this.obtenerDuracionBaseMovimiento({
      tipoEntidad: evento.tipoEntidad,
      movimientosJugadorPendientes,
    });
    const factorTemporal = Number.isFinite(evento.ritmoVisual?.factorTemporal)
      ? evento.ritmoVisual.factorTemporal
      : 1;
    const duracionBase =
      duracionBaseMovimiento *
      factorTemporal *
      Math.max(1, Math.min(Math.SQRT2, distancia));
    const duracion = calcularDuracionAnimacionPhaser(duracionBase, {
      velocidad: this.velocidad,
      cantidadPendiente: 0,
    });

    await this.crearTween({
      targets: [nodo.contenedor, nodo.sombra].filter(Boolean),
      x: destino.x,
      y: destino.y,
      duration: duracion,
      ease: movimientosJugadorPendientes > 0 ? "Linear" : "Sine.easeInOut",
      onUpdate: () => {
        if (
          evento.tipoEntidad === TIPOS_ENTIDAD_VISUAL.JUGADOR &&
          typeof this.alMoverJugadorVisual === "function"
        ) {
          this.alMoverJugadorVisual({
            x: nodo.contenedor.x,
            y: nodo.contenedor.y,
          });
        }
      },
    }, version);

    this.compositor.posicionarNodoEntidad(evento.idEntidad, destino);
  }

  async reproducirSalidaCampoVisible(evento, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idEntidad);
    if (!nodo?.contenedor) return;

    if (!this.efectosReducidos) {
      await this.crearTween({
        targets: nodo.contenedor,
        alpha: 0,
        duration: this.calcularDuracion(110),
        ease: "Sine.easeIn",
      }, version);
    }

    if (version === this.versionCancelacion && !this.destruido) {
      this.compositor.retirarEntidadVisual?.(evento.idEntidad);
    }
  }

  async reproducirEntradaCampoVisible(evento, version) {
    const entidadFinal = evento?.entidadFinal;
    if (!entidadFinal) return;

    const nodo = this.compositor.establecerEntidadVisualTemporal?.(entidadFinal);
    if (!nodo?.contenedor) return;

    const alphaSombraFinal = Number.isFinite(nodo.sombra?.alpha)
      ? nodo.sombra.alpha
      : 1;
    nodo.contenedor.alpha = this.efectosReducidos ? 1 : 0;
    if (nodo.sombra) nodo.sombra.alpha = this.efectosReducidos ? alphaSombraFinal : 0;

    if (this.efectosReducidos) return;

    const animaciones = [
      this.crearTween({
        targets: nodo.contenedor,
        alpha: 1,
        duration: this.calcularDuracion(110),
        ease: "Sine.easeOut",
      }, version),
    ];
    if (nodo.sombra) {
      animaciones.push(this.crearTween({
        targets: nodo.sombra,
        alpha: alphaSombraFinal,
        duration: this.calcularDuracion(110),
        ease: "Sine.easeOut",
      }, version));
    }
    await Promise.all(animaciones);
  }

  obtenerDuracionBaseMovimiento({
    tipoEntidad,
    movimientosJugadorPendientes = 0,
  } = {}) {
    if (tipoEntidad !== TIPOS_ENTIDAD_VISUAL.JUGADOR) {
      return CONFIGURACION_ANIMACIONES_PHASER.movimientoEnemigoCasillaMs;
    }

    if (
      movimientosJugadorPendientes >=
      CONFIGURACION_ANIMACIONES_PHASER.umbralMovimientosJugadorColaLarga
    ) {
      return CONFIGURACION_ANIMACIONES_PHASER.movimientoCasillaColaLargaMs;
    }

    if (
      movimientosJugadorPendientes >=
      CONFIGURACION_ANIMACIONES_PHASER.umbralMovimientosJugadorColaMedia
    ) {
      return CONFIGURACION_ANIMACIONES_PHASER.movimientoCasillaColaMediaMs;
    }

    return CONFIGURACION_ANIMACIONES_PHASER.movimientoJugadorCasillaMs;
  }

  obtenerRachaMovimientosJugadorPendientes() {
    let cantidad = 0;

    for (const actualizacion of this.cola) {
      const eventos = actualizacion?.eventosVisuales ?? [];
      if (eventos.length === 0) break;

      for (const evento of eventos) {
        if (
          evento?.tipo !== TIPOS_EVENTO_VISUAL.MOVIMIENTO_ENTIDAD ||
          evento.tipoEntidad !== TIPOS_ENTIDAD_VISUAL.JUGADOR
        ) {
          return cantidad;
        }
        cantidad += 1;
      }
    }

    return cantidad;
  }

  async reproducirHabilidadResuelta(evento, version) {
    this.compositor.ocultarSeleccionTemporal?.();

    if (evento?.ritmoVisual?.secuencia === "area_conjurada") {
      await this.reproducirHabilidadArea(evento, version);
      return;
    }

    if (evento?.ritmoVisual?.secuencia === "cadena_conjurada") {
      await this.reproducirHabilidadCadena(evento, version);
      return;
    }

    if (evento?.ritmoVisual?.secuencia === "linea_conjurada") {
      await this.reproducirHabilidadLinea(evento, version);
      return;
    }

    if (evento?.ritmoVisual?.secuencia === "zona_conjurada") {
      await this.reproducirHabilidadZona(evento, version);
      return;
    }

    const perfil = evento?.perfilVisual;
    if (!perfil || evento?.ritmoVisual?.secuencia !== "proyectil_basico") {
      return;
    }

    const contratoVisual = resolverContratoPatronVisualHabilidad(perfil);
    if (contratoVisual.patronVisual !== PATRONES_VISUALES_HABILIDAD.PROYECTIL) {
      return;
    }

    const impacto = evento.impactos?.[0] ?? null;
    const centroActor = this.obtenerCentroActorHabilidad(evento);
    const centroObjetivo = this.obtenerCentroImpactoHabilidad(evento, impacto);
    if (!centroActor || !centroObjetivo) {
      if (impacto) {
        await this.reproducirResultadoImpactoHabilidad(evento, impacto, version);
      }
      return;
    }

    const grado = evento.habilidad?.grado ?? 1;
    const fases = evento.ritmoVisual?.fases ?? {};
    const nodoActor = this.compositor.obtenerNodoEntidad(evento.idActor);
    const contenedorActor = nodoActor?.contenedor ?? null;
    const escalaActorX = contenedorActor?.scaleX ?? 1;
    const escalaActorY = contenedorActor?.scaleY ?? 1;
    const conjuracion = this.efectosReducidos
      ? null
      : this.creadorEfectosHabilidades?.crearConjuracion({
          centro: centroActor,
          perfil,
          grado,
        });

    const duracionPreparacion = this.calcularDuracion(fases.preparacion ?? 1);
    const preparaciones = [];
    if (conjuracion) {
      preparaciones.push(this.crearTween({
        targets: conjuracion,
        alpha: 0.92,
        scaleX: 1,
        scaleY: 1,
        angle: perfil.movimiento === "nervioso" ? 18 : 8,
        duration: duracionPreparacion,
        ease: "Sine.easeOut",
      }, version));
    }
    if (contenedorActor && !this.efectosReducidos) {
      preparaciones.push(this.crearTween({
        targets: contenedorActor,
        scaleX: escalaActorX * 1.06,
        scaleY: escalaActorY * 1.06,
        duration: duracionPreparacion,
        ease: "Sine.easeOut",
      }, version));
    }
    if (preparaciones.length > 0) await Promise.all(preparaciones);
    else await this.esperar(duracionPreparacion, version);

    if (version !== this.versionCancelacion || this.destruido) return;

    const angulo = Math.atan2(
      centroObjetivo.y - centroActor.y,
      centroObjetivo.x - centroActor.x,
    );
    const proyectil = this.efectosReducidos
      ? null
      : this.creadorEfectosHabilidades?.crearProyectil({
          centro: centroActor,
          destino: centroObjetivo,
          perfil,
          grado,
          anguloRad: angulo,
          critico: impacto?.critico === true,
        });
    if (proyectil) {
      proyectil.setAlpha?.(0.15);
      proyectil.setScale?.(0.58);
    }

    const duracionManifestacion = this.calcularDuracion(
      fases.manifestacion ?? 1,
    );
    if (proyectil) {
      await this.crearTween({
        targets: proyectil,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: duracionManifestacion,
        ease: "Quad.easeOut",
      }, version);
    } else {
      await this.esperar(duracionManifestacion, version);
    }

    if (version !== this.versionCancelacion || this.destruido) {
      proyectil?.destroy?.();
      conjuracion?.destroy?.();
      return;
    }

    const duracionTrayectoria = this.calcularDuracion(fases.trayectoria ?? 1);
    const esDescargaAnclada = perfil.movimiento === "descarga_anclada";
    const estela = this.efectosReducidos
      ? null
      : this.creadorEfectosHabilidades?.crearEstela({
          origen: centroActor,
          destino: centroObjetivo,
          perfil,
          grado,
        });
    const animacionesTrayectoria = [];
    if (proyectil) {
      const esMovimientoPesado = perfil.movimiento === "pesado";
      const esImpulsoFuerte = perfil.movimiento === "impulso_fuerte";
      animacionesTrayectoria.push(this.crearTween({
        targets: proyectil,
        x: esDescargaAnclada ? centroActor.x : centroObjetivo.x,
        y: esDescargaAnclada ? centroActor.y : centroObjetivo.y,
        angle: esDescargaAnclada
          ? proyectil.angle ?? 0
          : perfil.movimiento === "nervioso"
            ? (proyectil.angle ?? 0) + 36
            : esMovimientoPesado
              ? (proyectil.angle ?? 0) + 14
              : esImpulsoFuerte
                ? proyectil.angle ?? 0
                : (proyectil.angle ?? 0) + 8,
        scaleX: esMovimientoPesado ? 1.08 : esImpulsoFuerte ? 1.18 : 1,
        scaleY: esMovimientoPesado ? 0.92 : esImpulsoFuerte ? 0.86 : 1,
        alpha: esDescargaAnclada
          ? impacto?.impacto === false
            ? 0.42
            : 1
          : 1,
        duration: duracionTrayectoria,
        ease: resolverEaseHabilidad(perfil.movimiento),
      }, version));
    }
    if (estela) {
      animacionesTrayectoria.push(this.crearTween({
        targets: estela,
        alpha: 0,
        duration: duracionTrayectoria,
        ease: "Sine.easeIn",
      }, version));
    }
    if (animacionesTrayectoria.length > 0) {
      await Promise.all(animacionesTrayectoria);
    } else {
      await this.esperar(duracionTrayectoria, version);
    }
    proyectil?.destroy?.();
    estela?.destroy?.();

    if (version !== this.versionCancelacion || this.destruido) {
      conjuracion?.destroy?.();
      return;
    }

    const duracionImpacto = this.calcularDuracion(fases.impacto ?? 1);
    const intensidadVisual = perfil.impacto === "corrosion_expansiva"
      ? obtenerIntensidadEnvenenamientoImpacto(impacto)
      : null;
    const efectoImpacto =
      impacto?.impacto === true && !this.efectosReducidos
        ? this.creadorEfectosHabilidades?.crearImpacto({
            centro: centroObjetivo,
            perfil,
            grado,
            critico: impacto.critico === true,
            intensidadVisual,
          })
        : null;
    const promesasImpacto = [];
    if (efectoImpacto) {
      promesasImpacto.push(
        this.crearTween({
          targets: efectoImpacto,
          alpha: 0,
          scaleX: 1.45,
          scaleY: 1.45,
          duration: duracionImpacto,
          ease: "Quad.easeOut",
        }, version).then(() => efectoImpacto.destroy?.()),
      );
    }
    if (impacto) {
      promesasImpacto.push(
        this.reproducirResultadoImpactoHabilidad(evento, impacto, version),
      );
    }
    if (promesasImpacto.length > 0) await Promise.all(promesasImpacto);
    else await this.esperar(duracionImpacto, version);

    const duracionRetorno = this.calcularDuracion(fases.retorno ?? 1);
    const retornos = [];
    if (conjuracion) {
      retornos.push(this.crearTween({
        targets: conjuracion,
        alpha: 0,
        scaleX: 1.25,
        scaleY: 1.25,
        duration: duracionRetorno,
        ease: "Sine.easeIn",
      }, version).then(() => conjuracion.destroy?.()));
    }
    if (contenedorActor) {
      retornos.push(this.crearTween({
        targets: contenedorActor,
        scaleX: escalaActorX,
        scaleY: escalaActorY,
        duration: duracionRetorno,
        ease: "Sine.easeInOut",
      }, version));
    }
    if (retornos.length > 0) await Promise.all(retornos);
    else await this.esperar(duracionRetorno, version);

    if (contenedorActor) {
      contenedorActor.scaleX = escalaActorX;
      contenedorActor.scaleY = escalaActorY;
    }
  }

  async reproducirHabilidadLinea(evento, version) {
    const perfil = evento?.perfilVisual;
    if (!perfil || perfil.nivelVisual !== "avanzada") return;

    const contratoVisual = resolverContratoPatronVisualHabilidad(perfil);
    if (
      contratoVisual.patronVisual !== PATRONES_VISUALES_HABILIDAD.LINEA ||
      contratoVisual.usaRecorridoOrdenado !== true ||
      contratoVisual.reproduceImpactosPorCasilla !== true
    ) {
      return;
    }

    const recorrido = [...(evento.recorrido ?? [])]
      .filter(
        (paso) =>
          Number.isInteger(paso?.x) && Number.isInteger(paso?.y),
      )
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    const impactos = [...(evento.impactos ?? [])].sort(
      (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
    );

    if (recorrido.length === 0) {
      for (const impacto of impactos) {
        await this.reproducirResultadoImpactoHabilidad(evento, impacto, version);
      }
      return;
    }

    const centroActor = this.obtenerCentroActorHabilidad(evento);
    if (!centroActor) {
      for (const impacto of impactos) {
        await this.reproducirResultadoImpactoHabilidad(evento, impacto, version);
      }
      return;
    }

    const grado = evento.habilidad?.grado ?? 1;
    const fases = evento.ritmoVisual?.fases ?? {};
    const nodoActor = this.compositor.obtenerNodoEntidad(evento.idActor);
    const contenedorActor = nodoActor?.contenedor ?? null;
    const escalaActorX = contenedorActor?.scaleX ?? 1;
    const escalaActorY = contenedorActor?.scaleY ?? 1;
    const recursosPersistentes = [];
    const conjuracion = this.efectosReducidos
      ? null
      : this.creadorEfectosHabilidades?.crearConjuracion({
          centro: centroActor,
          perfil,
          grado,
        });
    const carga = this.efectosReducidos
      ? null
      : this.creadorLineasHabilidades?.crearCarga({
          centro: centroActor,
          perfil,
          grado,
        });

    const duracionPreparacion = this.calcularDuracion(fases.preparacion ?? 1);
    const preparaciones = [];
    if (conjuracion) {
      preparaciones.push(this.crearTween({
        targets: conjuracion,
        alpha: 0.94,
        scaleX: 1.04,
        scaleY: 1.04,
        angle: 18,
        duration: duracionPreparacion,
        ease: "Sine.easeOut",
      }, version));
    }
    if (carga) {
      preparaciones.push(this.crearTween({
        targets: carga,
        alpha: 0.88,
        scaleX: 1,
        scaleY: 1,
        angle: 24,
        duration: duracionPreparacion,
        ease: "Quad.easeOut",
      }, version));
    }
    if (contenedorActor && !this.efectosReducidos) {
      preparaciones.push(this.crearTween({
        targets: contenedorActor,
        scaleX: escalaActorX * 1.06,
        scaleY: escalaActorY * 1.06,
        duration: duracionPreparacion,
        ease: "Sine.easeOut",
      }, version));
    }
    if (preparaciones.length > 0) await Promise.all(preparaciones);
    else await this.esperar(duracionPreparacion, version);

    if (version !== this.versionCancelacion || this.destruido) {
      conjuracion?.destroy?.();
      carga?.destroy?.();
      return;
    }

    const duracionManifestacion = this.calcularDuracion(
      fases.manifestacion ?? 1,
    );
    if (carga) {
      await this.crearTween({
        targets: carga,
        alpha: 1,
        scaleX: 1.18,
        scaleY: 1.18,
        angle: 52,
        duration: duracionManifestacion,
        ease: "Sine.easeInOut",
      }, version);
    } else {
      await this.esperar(duracionManifestacion, version);
    }

    const impactosPorCasilla = new Map();
    for (const impacto of impactos) {
      const clave = crearClaveCasillaVisual(impacto.posicionObjetivo);
      const lista = impactosPorCasilla.get(clave) ?? [];
      lista.push(impacto);
      impactosPorCasilla.set(clave, lista);
    }

    const procesados = new Set();
    const duracionRecorrido = this.calcularDuracion(fases.recorrido ?? 1);
    const duracionPaso = Math.max(
      45,
      Math.round(duracionRecorrido / Math.max(1, recorrido.length)),
    );
    let centroAnterior = centroActor;

    for (let indice = 0; indice < recorrido.length; indice += 1) {
      if (version !== this.versionCancelacion || this.destruido) break;
      const paso = recorrido[indice];
      const centroCasilla = this.compositor.obtenerCentroCasilla?.(paso);
      if (!centroCasilla) continue;

      const impactosCasilla =
        impactosPorCasilla.get(crearClaveCasillaVisual(paso)) ?? [];
      const hayCritico = impactosCasilla.some(
        (impacto) => impacto.impacto === true && impacto.critico === true,
      );
      const tramo = this.efectosReducidos
        ? null
        : this.creadorLineasHabilidades?.crearTramo({
            origen: centroAnterior,
            destino: centroCasilla,
            perfil,
            grado,
            indice,
            critico: hayCritico,
          });
      const marca = this.efectosReducidos
        ? null
        : this.creadorLineasHabilidades?.crearEfectoCasilla({
            centro: centroCasilla,
            perfil,
            grado,
            indice,
            tieneObjetivo: impactosCasilla.length > 0,
          });
      if (tramo) recursosPersistentes.push(tramo);
      if (marca) recursosPersistentes.push(marca);

      const animaciones = [];
      if (tramo) {
        animaciones.push(this.crearTween({
          targets: tramo,
          alpha: 0.9,
          duration: duracionPaso,
          ease: "Quad.easeOut",
        }, version));
      }
      if (marca) {
        animaciones.push(this.crearTween({
          targets: marca,
          alpha: 0.88,
          scaleX: 1,
          scaleY: 1,
          duration: duracionPaso,
          ease: "Sine.easeOut",
        }, version));
      }

      for (const impacto of impactosCasilla) {
        procesados.add(impacto);
        const efectoImpacto =
          this.efectosReducidos || impacto.impacto !== true
            ? null
            : this.creadorLineasHabilidades?.crearImpacto({
                centro: centroCasilla,
                perfil,
                grado,
                indice,
                critico: impacto.critico === true,
              });
        if (efectoImpacto) {
          animaciones.push(this.crearTween({
            targets: efectoImpacto,
            alpha: 0,
            scaleX: impacto.critico === true ? 1.5 : 1.32,
            scaleY: impacto.critico === true ? 1.5 : 1.32,
            duration: Math.max(120, Math.round(duracionPaso * 1.4)),
            ease: "Quad.easeOut",
          }, version).then(() => efectoImpacto.destroy?.()));
        }
        animaciones.push(
          this.reproducirResultadoImpactoHabilidad(evento, impacto, version),
        );
      }

      if (animaciones.length > 0) await Promise.all(animaciones);
      else await this.esperar(duracionPaso, version);
      centroAnterior = centroCasilla;
    }

    if (version !== this.versionCancelacion || this.destruido) {
      for (const recurso of recursosPersistentes) recurso?.destroy?.();
      conjuracion?.destroy?.();
      carga?.destroy?.();
      return;
    }

    for (const impacto of impactos) {
      if (procesados.has(impacto)) continue;
      await this.reproducirResultadoImpactoHabilidad(evento, impacto, version);
    }

    await this.esperar(this.calcularDuracion(fases.impacto ?? 1), version);

    const duracionRetorno = this.calcularDuracion(fases.retorno ?? 1);
    const retornos = [];
    for (const recurso of recursosPersistentes) {
      retornos.push(this.crearTween({
        targets: recurso,
        alpha: 0,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: duracionRetorno,
        ease: "Sine.easeIn",
      }, version).then(() => recurso.destroy?.()));
    }
    if (carga) {
      retornos.push(this.crearTween({
        targets: carga,
        alpha: 0,
        scaleX: 1.28,
        scaleY: 1.28,
        duration: duracionRetorno,
        ease: "Sine.easeIn",
      }, version).then(() => carga.destroy?.()));
    }
    if (conjuracion) {
      retornos.push(this.crearTween({
        targets: conjuracion,
        alpha: 0,
        scaleX: 1.24,
        scaleY: 1.24,
        duration: duracionRetorno,
        ease: "Sine.easeIn",
      }, version).then(() => conjuracion.destroy?.()));
    }
    if (contenedorActor) {
      retornos.push(this.crearTween({
        targets: contenedorActor,
        scaleX: escalaActorX,
        scaleY: escalaActorY,
        duration: duracionRetorno,
        ease: "Sine.easeInOut",
      }, version));
    }
    if (retornos.length > 0) await Promise.all(retornos);
    else await this.esperar(duracionRetorno, version);

    if (contenedorActor) {
      contenedorActor.scaleX = escalaActorX;
      contenedorActor.scaleY = escalaActorY;
    }
  }

  async reproducirHabilidadZona(evento, version) {
    const perfil = evento?.perfilVisual;
    const zona = evento?.zonaTemporal;
    if (!perfil || !zona || perfil.nivelVisual !== "intermedia") return;

    const contratoVisual = resolverContratoPatronVisualHabilidad(perfil);
    if (
      contratoVisual.patronVisual !==
        PATRONES_VISUALES_HABILIDAD.ZONA_PERSISTENTE ||
      contratoVisual.persistente !== true
    ) {
      return;
    }

    const centroActor = this.obtenerCentroActorHabilidad(evento);
    const grado = evento.habilidad?.grado ?? 1;
    const fases = evento.ritmoVisual?.fases ?? {};
    const nodoActor = this.compositor.obtenerNodoEntidad(evento.idActor);
    const contenedorActor = nodoActor?.contenedor ?? null;
    const escalaActorX = contenedorActor?.scaleX ?? 1;
    const escalaActorY = contenedorActor?.scaleY ?? 1;
    const conjuracion = this.efectosReducidos || !centroActor
      ? null
      : this.creadorEfectosHabilidades?.crearConjuracion({
          centro: centroActor,
          perfil,
          grado,
        });

    const duracionPreparacion = this.calcularDuracion(fases.preparacion ?? 1);
    const preparaciones = [];
    if (conjuracion) {
      preparaciones.push(this.crearTween({
        targets: conjuracion,
        alpha: 0.94,
        scaleX: 1.08,
        scaleY: 1.08,
        angle: 18,
        duration: duracionPreparacion,
        ease: "Sine.easeOut",
      }, version));
    }
    if (contenedorActor && !this.efectosReducidos) {
      preparaciones.push(this.crearTween({
        targets: contenedorActor,
        scaleX: escalaActorX * 1.05,
        scaleY: escalaActorY * 1.05,
        duration: duracionPreparacion,
        ease: "Sine.easeOut",
      }, version));
    }
    if (preparaciones.length > 0) await Promise.all(preparaciones);
    else await this.esperar(duracionPreparacion, version);

    if (version !== this.versionCancelacion || this.destruido) return;

    const despliegue = this.efectosReducidos
      ? null
      : this.creadorZonasTemporales?.crearDespliegue({ zona });
    const duracionManifestacion = this.calcularDuracion(
      fases.manifestacion ?? 1,
    );
    if (despliegue) {
      await this.crearTween({
        targets: despliegue.list ?? despliegue,
        alpha: 0.78,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: duracionManifestacion,
        ease: "Quad.easeOut",
      }, version);
    } else {
      await this.esperar(duracionManifestacion, version);
    }

    if (version !== this.versionCancelacion || this.destruido) {
      despliegue?.destroy?.(true);
      conjuracion?.destroy?.();
      return;
    }

    const duracionDespliegue = this.calcularDuracion(fases.despliegue ?? 1);
    if (despliegue) {
      await this.crearTween({
        targets: despliegue.list ?? despliegue,
        alpha: 0.96,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: duracionDespliegue,
        ease: "Sine.easeOut",
      }, version);
    } else {
      await this.esperar(duracionDespliegue, version);
    }

    if (version !== this.versionCancelacion || this.destruido) {
      despliegue?.destroy?.(true);
      conjuracion?.destroy?.();
      return;
    }

    const duracionActivacion = this.calcularDuracion(fases.activacion ?? 1);
    const impactos = [...(evento.impactos ?? [])].sort(
      (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
    );
    const reacciones = impactos.map((impacto) =>
      this.reproducirResultadoImpactoHabilidad(evento, impacto, version),
    );
    if (reacciones.length > 0) {
      await Promise.all([
        ...reacciones,
        this.esperar(duracionActivacion, version),
      ]);
    } else {
      await this.esperar(duracionActivacion, version);
    }

    const duracionRetorno = this.calcularDuracion(fases.retorno ?? 1);
    const retornos = [];
    if (despliegue) {
      retornos.push(this.crearTween({
        targets: despliegue.list ?? despliegue,
        alpha: 0,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: duracionRetorno,
        ease: "Sine.easeIn",
      }, version).then(() => despliegue.destroy?.(true)));
    }
    if (conjuracion) {
      retornos.push(this.crearTween({
        targets: conjuracion,
        alpha: 0,
        scaleX: 1.24,
        scaleY: 1.24,
        duration: duracionRetorno,
        ease: "Sine.easeIn",
      }, version).then(() => conjuracion.destroy?.()));
    }
    if (contenedorActor) {
      retornos.push(this.crearTween({
        targets: contenedorActor,
        scaleX: escalaActorX,
        scaleY: escalaActorY,
        duration: duracionRetorno,
        ease: "Sine.easeInOut",
      }, version));
    }
    if (retornos.length > 0) await Promise.all(retornos);
    else await this.esperar(duracionRetorno, version);

    if (contenedorActor) {
      contenedorActor.scaleX = escalaActorX;
      contenedorActor.scaleY = escalaActorY;
    }
  }

  async reproducirHabilidadCadena(evento, version) {
    const perfil = evento?.perfilVisual;
    if (!perfil || perfil.nivelVisual !== "intermedia") return;

    const contratoVisual = resolverContratoPatronVisualHabilidad(perfil);
    if (
      contratoVisual.patronVisual !== PATRONES_VISUALES_HABILIDAD.CADENA ||
      contratoVisual.usaRecorridoOrdenado !== true ||
      contratoVisual.reproduceImpactosSecuencialmente !== true
    ) {
      return;
    }

    const impactos = [...(evento.impactos ?? [])].sort(
      (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
    );
    if (impactos.length === 0) return;

    const centroActor = this.obtenerCentroActorHabilidad(evento);
    if (!centroActor) {
      for (const impacto of impactos) {
        await this.reproducirResultadoImpactoHabilidad(evento, impacto, version);
      }
      return;
    }

    const grado = evento.habilidad?.grado ?? 1;
    const fases = evento.ritmoVisual?.fases ?? {};
    const nodoActor = this.compositor.obtenerNodoEntidad(evento.idActor);
    const contenedorActor = nodoActor?.contenedor ?? null;
    const escalaActorX = contenedorActor?.scaleX ?? 1;
    const escalaActorY = contenedorActor?.scaleY ?? 1;
    const conjuracion = this.efectosReducidos
      ? null
      : this.creadorEfectosHabilidades?.crearConjuracion({
          centro: centroActor,
          perfil,
          grado,
        });
    const carga = this.efectosReducidos
      ? null
      : this.creadorCadenasHabilidades?.crearCarga({
          centro: centroActor,
          perfil,
          grado,
        });

    const duracionPreparacion = this.calcularDuracion(fases.preparacion ?? 1);
    const preparaciones = [];
    if (conjuracion) {
      preparaciones.push(this.crearTween({
        targets: conjuracion,
        alpha: 0.94,
        scaleX: 1.08,
        scaleY: 1.08,
        angle: 24,
        duration: duracionPreparacion,
        ease: "Sine.easeOut",
      }, version));
    }
    if (contenedorActor && !this.efectosReducidos) {
      preparaciones.push(this.crearTween({
        targets: contenedorActor,
        scaleX: escalaActorX * 1.05,
        scaleY: escalaActorY * 1.05,
        duration: duracionPreparacion,
        ease: "Sine.easeOut",
      }, version));
    }
    if (preparaciones.length > 0) await Promise.all(preparaciones);
    else await this.esperar(duracionPreparacion, version);

    if (version !== this.versionCancelacion || this.destruido) return;

    const duracionManifestacion = this.calcularDuracion(
      fases.manifestacion ?? 1,
    );
    if (carga) {
      await this.crearTween({
        targets: carga,
        alpha: 1,
        scaleX: 1.18,
        scaleY: 1.18,
        angle: 36,
        duration: duracionManifestacion,
        ease: "Quad.easeOut",
      }, version);
    } else {
      await this.esperar(duracionManifestacion, version);
    }

    if (version !== this.versionCancelacion || this.destruido) return;

    const duracionSaltos = this.calcularDuracion(fases.saltos ?? 1);
    const duracionImpactos = this.calcularDuracion(fases.impacto ?? 1);
    const duracionSalto = Math.max(55, Math.round(duracionSaltos / impactos.length));
    const duracionImpacto = Math.max(45, Math.round(duracionImpactos / impactos.length));
    const tramosPersistentes = [];
    let origenSalto = centroActor;

    for (let indice = 0; indice < impactos.length; indice += 1) {
      if (version !== this.versionCancelacion || this.destruido) break;
      const impacto = impactos[indice];
      const destinoSalto = this.obtenerCentroImpactoHabilidad(evento, impacto);
      if (!destinoSalto) {
        await this.reproducirResultadoImpactoHabilidad(evento, impacto, version);
        origenSalto = this.compositor.obtenerCentroCasilla(
          impacto.posicionObjetivo,
        ) ?? origenSalto;
        continue;
      }

      const esPrimario =
        contratoVisual.enfatizaObjetivoPrimario === true &&
        indice === 0 &&
        Boolean(evento.idObjetivoPrimario) &&
        impacto.idObjetivo === evento.idObjetivoPrimario;
      const multiplicadorVisual = Math.max(
        contratoVisual.intensidadVisualMinima ?? 0.52,
        Number.isFinite(impacto.multiplicadorDanio)
          ? impacto.multiplicadorDanio
          : 1,
      );
      const arco = this.efectosReducidos
        ? null
        : this.creadorCadenasHabilidades?.crearArco({
            origen: origenSalto,
            destino: destinoSalto,
            perfil,
            grado,
            multiplicadorVisual,
            critico: impacto.critico === true,
            primario: esPrimario,
            indiceSalto: indice,
          });
      const nucleo = this.efectosReducidos
        ? null
        : this.creadorCadenasHabilidades?.crearNucleoSalto({
            origen: origenSalto,
            perfil,
            grado,
            primario: esPrimario,
          });

      const desplazamientos = [];
      if (arco) {
        desplazamientos.push(this.crearTween({
          targets: arco,
          alpha: esPrimario ? 1 : 0.88,
          duration: duracionSalto,
          ease: "Sine.easeOut",
        }, version));
      }
      if (nucleo) {
        desplazamientos.push(this.crearTween({
          targets: nucleo,
          x: destinoSalto.x,
          y: destinoSalto.y,
          alpha: 1,
          scaleX: esPrimario ? 1.18 : 1,
          scaleY: esPrimario ? 1.18 : 1,
          duration: duracionSalto,
          ease: "Quad.easeInOut",
        }, version));
      }
      if (contratoVisual.conservaTramosAnteriores === true) {
        for (const tramoAnterior of tramosPersistentes) {
          desplazamientos.push(this.crearTween({
            targets: tramoAnterior,
            alpha: contratoVisual.opacidadTramosAnteriores ?? 0.28,
            duration: duracionSalto,
            ease: "Sine.easeInOut",
          }, version));
        }
      }
      if (desplazamientos.length > 0) await Promise.all(desplazamientos);
      else await this.esperar(duracionSalto, version);
      nucleo?.destroy?.();

      if (version !== this.versionCancelacion || this.destruido) break;

      const descarga = this.efectosReducidos
        ? null
        : this.creadorCadenasHabilidades?.crearImpacto({
            centro: destinoSalto,
            perfil,
            grado,
            multiplicadorVisual,
            critico: impacto.critico === true,
            primario: esPrimario,
            indiceSalto: indice,
          });
      const reacciones = [
        this.reproducirResultadoImpactoHabilidad(evento, impacto, version),
      ];
      if (descarga) {
        reacciones.push(this.crearTween({
          targets: descarga,
          alpha: 0,
          scaleX: esPrimario ? 1.58 : 1.38,
          scaleY: esPrimario ? 1.58 : 1.38,
          duration: duracionImpacto,
          ease: "Quad.easeOut",
        }, version).then(() => descarga.destroy?.()));
      }
      await Promise.all(reacciones);
      if (version !== this.versionCancelacion || this.destruido) {
        arco?.destroy?.();
        return;
      }

      if (arco) {
        arco.alpha = indice === impactos.length - 1
          ? contratoVisual.opacidadUltimoTramo ?? 0.72
          : Math.max(
              contratoVisual.opacidadTramosAnteriores ?? 0.28,
              0.38,
            );
        tramosPersistentes.push(arco);
      }
      origenSalto = this.compositor.obtenerCentroCasilla(
        impacto.posicionObjetivo,
      ) ?? destinoSalto;
    }

    const duracionRetorno = this.calcularDuracion(fases.retorno ?? 1);
    const retornos = [];
    for (const tramo of tramosPersistentes) {
      retornos.push(this.crearTween({
        targets: tramo,
        alpha: 0,
        duration: duracionRetorno,
        ease: "Sine.easeIn",
      }, version).then(() => tramo.destroy?.()));
    }
    for (const recurso of [carga, conjuracion]) {
      if (!recurso) continue;
      retornos.push(this.crearTween({
        targets: recurso,
        alpha: 0,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: duracionRetorno,
        ease: "Sine.easeIn",
      }, version).then(() => recurso.destroy?.()));
    }
    if (contenedorActor) {
      retornos.push(this.crearTween({
        targets: contenedorActor,
        scaleX: escalaActorX,
        scaleY: escalaActorY,
        duration: duracionRetorno,
        ease: "Sine.easeInOut",
      }, version));
    }
    if (retornos.length > 0) await Promise.all(retornos);
    else await this.esperar(duracionRetorno, version);

    if (contenedorActor) {
      contenedorActor.scaleX = escalaActorX;
      contenedorActor.scaleY = escalaActorY;
    }
  }

  async reproducirHabilidadArea(evento, version) {
    const perfil = evento?.perfilVisual;
    if (!perfil || evento?.perfilVisual?.nivelVisual !== "intermedia") {
      return;
    }
    const contratoVisual = resolverContratoPatronVisualHabilidad(perfil);
    if (
      contratoVisual.patronVisual !==
      PATRONES_VISUALES_HABILIDAD.AREA_INSTANTANEA
    ) {
      return;
    }

    const centroActor = this.obtenerCentroActorHabilidad(evento);
    const centroArea = this.obtenerCentroAreaHabilidad(
      evento,
      contratoVisual,
    );
    if (!centroArea) {
      for (const impacto of evento.impactos ?? []) {
        if (version !== this.versionCancelacion || this.destruido) return;
        await this.reproducirResultadoImpactoHabilidad(evento, impacto, version);
      }
      return;
    }

    const grado = evento.habilidad?.grado ?? 1;
    const fases = evento.ritmoVisual?.fases ?? {};
    const nodoActor = this.compositor.obtenerNodoEntidad(evento.idActor);
    const contenedorActor = nodoActor?.contenedor ?? null;
    const escalaActorX = contenedorActor?.scaleX ?? 1;
    const escalaActorY = contenedorActor?.scaleY ?? 1;
    const conjuracion = this.efectosReducidos || !centroActor
      ? null
      : this.creadorEfectosHabilidades?.crearConjuracion({
          centro: centroActor,
          perfil,
          grado,
        });

    const duracionPreparacion = this.calcularDuracion(fases.preparacion ?? 1);
    const preparaciones = [];
    if (conjuracion) {
      preparaciones.push(this.crearTween({
        targets: conjuracion,
        alpha: 0.94,
        scaleX: 1,
        scaleY: 1,
        duration: duracionPreparacion,
        ease: "Sine.easeOut",
      }, version));
    }
    if (contenedorActor && !this.efectosReducidos) {
      preparaciones.push(this.crearTween({
        targets: contenedorActor,
        scaleX: escalaActorX * 1.05,
        scaleY: escalaActorY * 1.05,
        duration: duracionPreparacion,
        ease: "Sine.easeOut",
      }, version));
    }
    if (preparaciones.length > 0) await Promise.all(preparaciones);
    else await this.esperar(duracionPreparacion, version);

    if (version !== this.versionCancelacion || this.destruido) return;

    const nucleo = this.efectosReducidos
      ? null
      : this.creadorAreasHabilidades?.crearNucleo({
          centro: centroArea,
          perfil,
          grado,
        });
    const duracionManifestacion = this.calcularDuracion(fases.manifestacion ?? 1);
    if (nucleo) {
      await this.crearTween({
        targets: nucleo,
        alpha: 0.96,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: duracionManifestacion,
        ease: "Quad.easeOut",
      }, version);
    } else {
      await this.esperar(duracionManifestacion, version);
    }

    if (version !== this.versionCancelacion || this.destruido) {
      nucleo?.destroy?.();
      conjuracion?.destroy?.();
      return;
    }

    const grupos = this.agruparAreaPorAnillos(evento, contratoVisual);
    const duracionExpansion = this.calcularDuracion(fases.expansion ?? 1);
    const cantidadAnillos = Math.max(1, grupos.length);
    const duracionAnillo = Math.max(60, Math.round(duracionExpansion / cantidadAnillos));
    const tile = this.compositor.obtenerTamanoCasilla?.() ?? TAMANO_CASILLA_REFERENCIA;

    for (const grupo of grupos) {
      if (version !== this.versionCancelacion || this.destruido) break;

      const anillo = this.efectosReducidos
        ? null
        : this.creadorAreasHabilidades?.crearAnilloExpansion({
            centro: centroArea,
            perfil,
            grado,
            anillo: grupo.anillo,
            radioPx: tile * (0.38 + grupo.anillo),
            grosor: perfil.efectoCasilla === "fractura_hielo" ? 3 : 4,
          });

      const animaciones = [];
      if (anillo) {
        animaciones.push(this.crearTween({
          targets: anillo,
          alpha: 0,
          scaleX: 1.12,
          scaleY: 1.12,
          duration: duracionAnillo,
          ease: "Sine.easeOut",
        }, version).then(() => anillo.destroy?.()));
      }

      const impactosPorCasilla = new Map(
        grupo.impactos.map((impacto) => [
          crearClaveCasillaVisual(impacto.posicionObjetivo),
          impacto,
        ]),
      );
      for (const casilla of grupo.casillas) {
        const centroCasilla = this.compositor.obtenerCentroCasilla?.(casilla);
        if (!centroCasilla || this.efectosReducidos) continue;
        const efectoCasilla = this.creadorAreasHabilidades?.crearEfectoCasilla({
          centro: centroCasilla,
          perfil,
          grado,
          anillo: grupo.anillo,
          esCentro: sonMismaCasilla(casilla, evento.posicionObjetivo),
          tieneObjetivo: impactosPorCasilla.has(crearClaveCasillaVisual(casilla)),
        });
        if (efectoCasilla) {
          animaciones.push(this.crearTween({
            targets: efectoCasilla,
            alpha: 0,
            scaleX: 1.12,
            scaleY: 1.12,
            duration: Math.max(150, Math.round(duracionAnillo * 1.55)),
            ease: "Quad.easeOut",
          }, version).then(() => efectoCasilla.destroy?.()));
        }
      }

      for (const impacto of grupo.impactos) {
        const centroObjetivo = this.obtenerCentroImpactoHabilidad(evento, impacto);
        const pulso = this.efectosReducidos || !centroObjetivo
          ? null
          : this.creadorAreasHabilidades?.crearPulsoObjetivo({
              centro: centroObjetivo,
              perfil,
              grado,
              anillo: grupo.anillo,
              esObjetivoPrimario:
                Boolean(evento.idObjetivoPrimario) &&
                impacto.idObjetivo === evento.idObjetivoPrimario,
            });
        if (pulso) {
          animaciones.push(this.crearTween({
            targets: pulso,
            alpha: 0,
            scaleX: 1.28,
            scaleY: 1.28,
            duration: Math.max(40, Math.round(duracionAnillo * 0.85)),
            ease: "Quad.easeOut",
          }, version).then(() => pulso.destroy?.()));
        }
        animaciones.push(this.reproducirResultadoImpactoHabilidad(evento, impacto, version));
      }

      if (animaciones.length > 0) await Promise.all(animaciones);
      else await this.esperar(duracionAnillo, version);
    }

    const duracionRetorno = this.calcularDuracion(fases.retorno ?? 1);
    const retornos = [];
    if (nucleo) {
      retornos.push(this.crearTween({
        targets: nucleo,
        alpha: 0,
        scaleX: 1.22,
        scaleY: 1.22,
        duration: duracionRetorno,
        ease: "Sine.easeIn",
      }, version).then(() => nucleo.destroy?.()));
    }
    if (conjuracion) {
      retornos.push(this.crearTween({
        targets: conjuracion,
        alpha: 0,
        scaleX: 1.24,
        scaleY: 1.24,
        duration: duracionRetorno,
        ease: "Sine.easeIn",
      }, version).then(() => conjuracion.destroy?.()));
    }
    if (contenedorActor) {
      retornos.push(this.crearTween({
        targets: contenedorActor,
        scaleX: escalaActorX,
        scaleY: escalaActorY,
        duration: duracionRetorno,
        ease: "Sine.easeInOut",
      }, version));
    }
    if (retornos.length > 0) await Promise.all(retornos);
    else await this.esperar(duracionRetorno, version);

    if (contenedorActor) {
      contenedorActor.scaleX = escalaActorX;
      contenedorActor.scaleY = escalaActorY;
    }
  }

  obtenerCentroAreaHabilidad(evento, contratoVisual) {
    if (contratoVisual?.centroVisual === CENTROS_VISUALES_HABILIDAD.ACTOR) {
      return this.obtenerCentroActorHabilidad(evento);
    }
    if (
      contratoVisual?.centroVisual ===
      CENTROS_VISUALES_HABILIDAD.OBJETIVO_PRIMARIO
    ) {
      const nodo = evento.idObjetivoPrimario
        ? this.compositor.obtenerNodoEntidad(evento.idObjetivoPrimario)
        : null;
      if (nodo?.contenedor) {
        return { x: nodo.contenedor.x, y: nodo.contenedor.y };
      }
      return this.compositor.obtenerCentroCasilla(
        evento.posicionObjetivoPrimario ?? evento.posicionObjetivo,
      );
    }
    return this.compositor.obtenerCentroCasilla(evento.posicionObjetivo);
  }

  agruparAreaPorAnillos(evento, contratoVisual) {
    const origen =
      contratoVisual?.centroVisual === CENTROS_VISUALES_HABILIDAD.ACTOR
        ? evento?.origenActor
        : contratoVisual?.centroVisual ===
            CENTROS_VISUALES_HABILIDAD.OBJETIVO_PRIMARIO
          ? evento?.posicionObjetivoPrimario ?? evento?.posicionObjetivo
          : evento?.posicionObjetivo;
    const grupos = new Map();
    for (const casilla of evento.casillasAfectadas ?? []) {
      const anillo = calcularAnilloArea(origen, casilla);
      const actual = grupos.get(anillo) ?? { anillo, casillas: [], impactos: [] };
      actual.casillas.push(casilla);
      grupos.set(anillo, actual);
    }
    for (const impacto of evento.impactos ?? []) {
      const anillo = calcularAnilloArea(origen, impacto.posicionObjetivo);
      const actual = grupos.get(anillo) ?? { anillo, casillas: [], impactos: [] };
      actual.impactos.push(impacto);
      grupos.set(anillo, actual);
    }
    return [...grupos.values()]
      .sort((a, b) => a.anillo - b.anillo)
      .map((grupo) => ({
        anillo: grupo.anillo,
        casillas: grupo.casillas,
        impactos: grupo.impactos.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
      }));
  }

  obtenerCentroActorHabilidad(evento) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idActor);
    if (nodo?.contenedor) {
      return { x: nodo.contenedor.x, y: nodo.contenedor.y };
    }
    return this.compositor.obtenerCentroCasilla(evento.origenActor);
  }

  obtenerCentroImpactoHabilidad(evento, impacto) {
    const nodo = impacto?.idObjetivo
      ? this.compositor.obtenerNodoEntidad(impacto.idObjetivo)
      : null;
    if (nodo?.contenedor) {
      return { x: nodo.contenedor.x, y: nodo.contenedor.y };
    }
    return this.compositor.obtenerCentroCasilla(
      impacto?.posicionObjetivo ?? evento.posicionObjetivo,
    );
  }

  async reproducirResultadoImpactoHabilidad(evento, impacto, version) {
    const eventoResultado = {
      ...evento,
      esHabilidad: true,
      idAtacante: evento.idActor,
      idObjetivo: impacto.idObjetivo,
      origenAtacante: evento.origenActor,
      posicionObjetivo: impacto.posicionObjetivo ?? evento.posicionObjetivo,
    };
    const golpe = {
      impacto: impacto.impacto === true,
      bloqueado: false,
      critico: impacto.critico === true,
      danio: Math.max(0, Number(impacto.danio?.cantidad) || 0),
      vidaObjetivoAntes: impacto.danio?.vidaObjetivoAntes ?? null,
      vidaObjetivoDespues: impacto.danio?.vidaObjetivoDespues ?? null,
      vidaObjetivoMaxima: impacto.danio?.vidaObjetivoMaxima ?? null,
    };
    await this.reproducirResultadoGolpe(
      eventoResultado,
      golpe,
      impacto.orden ?? 0,
      version,
      { esperarDecorativos: false },
    );

    const recursosRecuperados = convertirCambiosRecursosARecuperacion(
      impacto.recursosObjetivo,
    );
    if (recursosRecuperados.length > 0) {
      await this.reproducirRecuperacionHabilidad({
        evento,
        impacto,
        recursos: recursosRecuperados,
        version,
      });
    }

    for (const eventoEfecto of impacto.eventosEfectos ?? []) {
      if (version !== this.versionCancelacion || this.destruido) return;
      await this.reproducirEventoVisual(eventoEfecto, version);
    }

    if (impacto.derrotaVisual) {
      await this.reproducirEntidadDerrotada(impacto.derrotaVisual, version);
    }
    if (impacto.botinVisual) {
      await this.reproducirBotinAparecido(impacto.botinVisual, version);
    }
  }

  async reproducirRecuperacionHabilidad({
    evento,
    impacto,
    recursos,
    version,
  }) {
    const centro = this.obtenerCentroImpactoHabilidad(evento, impacto);
    if (!centro || !Array.isArray(recursos) || recursos.length === 0) return;

    const efecto = this.creadorEfectosRecuperacion?.crearRecuperacion({
      centro,
      recursos,
      reducido: this.efectosReducidos,
    });

    const eventoRecuperacion = {
      idObjetivo: impacto.idObjetivo,
      recursos,
    };
    const animaciones = [
      this.reproducirAumentoVidaExplicito(eventoRecuperacion, version),
    ];
    if (efecto) {
      animaciones.push(this.animarRecuperacionFija(efecto, centro, version));
    }
    await Promise.all(animaciones);
  }

  async reproducirAtaqueResuelto(evento, version) {
    this.compositor.ocultarSeleccionTemporal?.();

    const golpes = this.obtenerGolpesVisuales(evento);
    if (evento.presentacionOrigenOculto === true) {
      await this.reproducirConsecuenciaAtaqueOrigenOculto(
        evento,
        golpes,
        version,
      );
      return;
    }
    if (this.esAtaqueVarita(evento) && evento.ritmoVisual) {
      await this.reproducirAtaqueVarita(evento, golpes, version);
    } else if (this.esAtaqueArco(evento) && evento.ritmoVisual) {
      await this.reproducirAtaqueArco(evento, golpes, version);
    } else if (this.esAtaqueCuerpoACuerpo(evento) && evento.ritmoVisual) {
      await this.reproducirAtaqueCuerpoACuerpo(evento, golpes, version);
    } else {
      await this.reproducirAtaqueProvisional(evento, golpes, version);
    }

    if (evento.esAtaqueEnemigo) {
      await this.esperar(
        this.calcularDuracion(
          CONFIGURACION_ANIMACIONES_PHASER.pausaEntreAtaquesEnemigosMs,
        ),
        version,
      );
    }
  }

  async reproducirConsecuenciaAtaqueOrigenOculto(evento, golpes, version) {
    if (!evento.idObjetivo) return;

    const golpesValidos = (Array.isArray(golpes) ? golpes : []).filter(Boolean);
    for (let indice = 0; indice < golpesValidos.length; indice += 1) {
      if (version !== this.versionCancelacion || this.destruido) return;
      await this.reproducirResultadoGolpe(
        evento,
        golpesValidos[indice],
        indice,
        version,
      );
    }
  }

  esAtaqueCuerpoACuerpo(evento) {
    const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
    return fuentes.length === 0 || fuentes.every(
      (fuente) =>
        fuente?.esAtaqueNatural === true ||
        fuente?.tipoAtaque === "cuerpoACuerpo",
    );
  }

  esAtaqueArco(evento) {
    const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
    return fuentes.length === 1 &&
      fuentes[0]?.familiaObjeto === "arco" &&
      fuentes[0]?.tipoAtaque === "distancia";
  }

  esAtaqueVarita(evento) {
    const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
    return fuentes.length > 0 &&
      fuentes.every(
        (fuente) =>
          fuente?.familiaObjeto === "varita" &&
          fuente?.tipoAtaque === "distancia" &&
          typeof fuente?.elementoAtaqueBasico === "string",
      );
  }

  async reproducirAtaqueProvisional(evento, golpes, version) {
    for (let indice = 0; indice < golpes.length; indice += 1) {
      if (version !== this.versionCancelacion || this.destruido) return;
      await this.reproducirGolpeProvisional(
        evento,
        golpes[indice],
        indice,
        version,
      );

      if (indice < golpes.length - 1) {
        await this.esperar(
          this.calcularDuracion(
            CONFIGURACION_EFECTOS_COMBATE_PHASER.golpe.pausaEntreGolpesMs,
          ),
          version,
        );
      }
    }
  }

  async reproducirAtaqueArco(evento, golpes, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idAtacante);
    const centroBase = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.compositor.obtenerCentroCasilla(evento.origenAtacante);
    const centroObjetivo = this.compositor.obtenerCentroCasilla(
      evento.posicionObjetivo,
    );
    const municion = evento?.resultado?.municionUtilizada ?? null;

    if (
      !nodo?.contenedor ||
      !centroBase ||
      !centroObjetivo ||
      !municion?.recursoVisual
    ) {
      await this.reproducirAtaqueProvisional(evento, golpes, version);
      return;
    }

    const golpe = golpes[0] ?? null;
    const perfil = this.obtenerPerfilGolpe(evento, golpe, 0);
    const fases = evento.ritmoVisual?.fases ?? {};
    const direccion = normalizarDireccionImpacto({
      origen: centroBase,
      destino: centroObjetivo,
    });
    const lateral = { x: -direccion.y, y: direccion.x };
    const signoDesvio =
      ((evento.posicionObjetivo?.x ?? 0) +
        (evento.posicionObjetivo?.y ?? 0)) %
        2 ===
      0
        ? 1
        : -1;
    const centroPreparado = {
      x: centroBase.x - direccion.x * 3,
      y: centroBase.y - direccion.y * 3,
    };

    await this.moverNodoAtaque({
      nodo,
      destino: centroPreparado,
      duracion: this.calcularDuracion(
        fases.preparacion ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs,
      ),
      ease: "Sine.easeOut",
      version,
    });

    if (version !== this.versionCancelacion || this.destruido) {
      this.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
      return;
    }

    const angulo = Math.atan2(direccion.y, direccion.x);
    const proyectil = this.efectosReducidos
      ? null
      : await this.creadorRecursosVisuales?.crearSpriteTemporal({
          recursoVisual: municion.recursoVisual,
          centro: centroBase,
          longitudVisiblePx: Number(perfil?.animacion?.tamanoVisualPx) || 24,
          anguloRad: angulo,
          orientacionBaseGrados:
            Number(perfil?.animacion?.orientacionBaseGrados) || 0,
          anclaje: ANCLAJES_RECURSO.CENTRO,
          alpha: 0.72,
          tint: golpe?.critico === true ? 0xffe49a : null,
        });

    if (version !== this.versionCancelacion || this.destruido) {
      proyectil?.destroy?.();
      this.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
      return;
    }

    const duracionLanzamiento = this.calcularDuracion(
      fases.lanzamiento ?? 1,
    );
    const duracionTrayectoria = this.calcularDuracion(
      fases.trayectoria ?? 1,
    );
    const destinoProyectil =
      golpe?.impacto === false && evento.idObjetivo
        ? {
            x:
              centroObjetivo.x +
              lateral.x * signoDesvio * 9 +
              direccion.x * 5,
            y:
              centroObjetivo.y +
              lateral.y * signoDesvio * 9 +
              direccion.y * 5,
          }
        : centroObjetivo;

    if (proyectil) {
      const escalaX = proyectil.scaleX ?? 1;
      const escalaY = proyectil.scaleY ?? 1;
      if (golpe?.critico === true) proyectil.scaleY = escalaY * 1.22;

      await this.crearTween({
        targets: proyectil,
        x: centroBase.x + direccion.x * 5,
        y: centroBase.y + direccion.y * 5,
        alpha: 1,
        duration: duracionLanzamiento,
        ease: "Quad.easeOut",
      }, version);

      await this.crearTween({
        targets: proyectil,
        x: destinoProyectil.x,
        y: destinoProyectil.y,
        alpha: golpe?.impacto === false ? 0.72 : 1,
        scaleX: escalaX,
        scaleY: golpe?.critico === true ? escalaY * 1.22 : escalaY,
        duration: duracionTrayectoria,
        ease: "Linear",
      }, version);
    } else {
      await this.esperar(duracionLanzamiento + duracionTrayectoria, version);
    }

    const resultadosPendientes = [];
    if (golpe) {
      resultadosPendientes.push(
        this.reproducirResultadoGolpe(evento, golpe, 0, version, {
          esperarDecorativos: false,
        }),
      );
    }

    const impacto =
      golpe?.impacto === true && evento.idObjetivo && !this.efectosReducidos
        ? this.creadorEfectos?.crearImpactoProyectil({
            centro: centroObjetivo,
            critico: golpe?.critico === true,
          })
        : null;

    proyectil?.destroy?.();

    await Promise.all([
      this.moverNodoAtaque({
        nodo,
        destino: centroBase,
        duracion: this.calcularDuracion(fases.retorno ?? 1),
        ease: "Sine.easeInOut",
        version,
      }),
      this.animarEfectoAtaque(
        impacto,
        Math.max(1, Math.round(duracionTrayectoria * 0.65)),
        version,
        { critico: golpe?.critico === true },
      ),
      ...resultadosPendientes,
    ]);

    this.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
  }

  async reproducirAtaqueVarita(evento, golpes, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idAtacante);
    const centroBase = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.compositor.obtenerCentroCasilla(evento.origenAtacante);
    const centroObjetivo = this.compositor.obtenerCentroCasilla(
      evento.posicionObjetivo,
    );
    const disparos = this.obtenerDisparosVarita(evento, golpes);

    if (
      !nodo?.contenedor ||
      !centroBase ||
      !centroObjetivo ||
      disparos.length === 0
    ) {
      await this.reproducirAtaqueProvisional(evento, golpes, version);
      return;
    }

    const fases = evento.ritmoVisual?.fases ?? {};
    const fuentesCanalizacion = (evento?.configuracionAtaque?.fuentes ?? [])
      .filter((fuente) => fuente?.familiaObjeto === "varita");
    const direccion = normalizarDireccionImpacto({
      origen: centroBase,
      destino: centroObjetivo,
    });
    const lateral = { x: -direccion.y, y: direccion.x };
    const canalizacion = this.efectosReducidos
      ? null
      : this.creadorProyectilesElementales?.crearCanalizacion({
          centro: centroBase,
          elementos: fuentesCanalizacion.map(
            (fuente) => fuente.elementoAtaqueBasico,
          ),
          criticos: fuentesCanalizacion.map((fuente) =>
            disparos.some(
              (disparo) =>
                disparo.fuente.mano === fuente.mano &&
                disparo.golpe?.critico === true,
            ),
          ),
        });
    const duracionPreparacion = this.calcularDuracion(
      fases.preparacion ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs,
    );

    if (canalizacion) {
      canalizacion.setScale?.(0.65);
      await this.crearTween({
        targets: canalizacion,
        scaleX: 1.16,
        scaleY: 1.16,
        alpha: 0.9,
        angle: disparos.length > 1 ? 35 : 18,
        duration: duracionPreparacion,
        ease: "Sine.easeOut",
      }, version);
      canalizacion.destroy?.();
    } else {
      await this.esperar(duracionPreparacion, version);
    }

    for (let indice = 0; indice < disparos.length; indice += 1) {
      if (version !== this.versionCancelacion || this.destruido) break;
      const disparo = disparos[indice];
      const esSecundaria = disparo.fuente.mano === "secundaria";
      const signoLateral = esSecundaria ? -1 : 1;
      const origenProyectil = {
        x: centroBase.x + lateral.x * signoLateral * 3,
        y: centroBase.y + lateral.y * signoLateral * 3,
      };
      const golpe = disparo.golpe;
      const destinoProyectil =
        golpe?.impacto === false && evento.idObjetivo
          ? {
              x:
                centroObjetivo.x +
                lateral.x * signoLateral * 10 +
                direccion.x * 4,
              y:
                centroObjetivo.y +
                lateral.y * signoLateral * 10 +
                direccion.y * 4,
            }
          : centroObjetivo;
      const angulo = Math.atan2(
        destinoProyectil.y - origenProyectil.y,
        destinoProyectil.x - origenProyectil.x,
      );
      const esDual = evento.ritmoVisual.secuencia === "proyectil_dual";
      const idLanzamiento = esDual
        ? esSecundaria
          ? "lanzamientoSecundaria"
          : "lanzamientoPrincipal"
        : "lanzamiento";
      const idTrayectoria = esDual
        ? esSecundaria
          ? "trayectoriaSecundaria"
          : "trayectoriaPrincipal"
        : "trayectoria";
      const duracionLanzamiento = this.calcularDuracion(
        fases[idLanzamiento] ?? 1,
      );
      const duracionTrayectoria = this.calcularDuracion(
        fases[idTrayectoria] ?? 1,
      );
      const proyectil = this.efectosReducidos
        ? null
        : this.creadorProyectilesElementales?.crearProyectil({
            elemento: disparo.fuente.elementoAtaqueBasico,
            centro: origenProyectil,
            anguloRad: angulo,
            critico: golpe?.critico === true,
            mano: disparo.fuente.mano,
          });

      if (proyectil) {
        proyectil.setScale?.(0.72);
        await this.crearTween({
          targets: proyectil,
          x: origenProyectil.x + direccion.x * 5,
          y: origenProyectil.y + direccion.y * 5,
          scaleX: golpe?.critico === true ? 1.18 : 1,
          scaleY: golpe?.critico === true ? 1.18 : 1,
          alpha: 1,
          duration: duracionLanzamiento,
          ease: "Quad.easeOut",
        }, version);
      } else {
        await this.esperar(duracionLanzamiento, version);
      }

      const estela = this.efectosReducidos
        ? null
        : this.creadorProyectilesElementales?.crearEstela({
            elemento: disparo.fuente.elementoAtaqueBasico,
            origen: origenProyectil,
            destino: destinoProyectil,
            critico: golpe?.critico === true,
            mano: disparo.fuente.mano,
          });
      const animacionesTrayectoria = [];
      if (proyectil) {
        animacionesTrayectoria.push(this.crearTween({
          targets: proyectil,
          x: destinoProyectil.x,
          y: destinoProyectil.y,
          alpha: golpe?.impacto === false ? 0.42 : 1,
          duration: duracionTrayectoria,
          ease: "Quad.easeInOut",
        }, version));
      }
      if (estela) {
        animacionesTrayectoria.push(this.crearTween({
          targets: estela,
          alpha: 0,
          duration: duracionTrayectoria,
          ease: "Sine.easeIn",
        }, version));
      }
      if (animacionesTrayectoria.length > 0) {
        await Promise.all(animacionesTrayectoria);
      } else {
        await this.esperar(duracionTrayectoria, version);
      }

      if (version !== this.versionCancelacion || this.destruido) {
        proyectil?.destroy?.();
        estela?.destroy?.();
        break;
      }

      const impacto =
        golpe?.impacto === true && evento.idObjetivo && !this.efectosReducidos
          ? this.creadorProyectilesElementales?.crearImpacto({
              elemento: disparo.fuente.elementoAtaqueBasico,
              centro: centroObjetivo,
              critico: golpe?.critico === true,
            })
          : null;
      proyectil?.destroy?.();
      estela?.destroy?.();

      await Promise.all([
        golpe
          ? this.reproducirResultadoGolpe(evento, golpe, indice, version, {
              esperarDecorativos: false,
            })
          : Promise.resolve(),
        this.animarEfectoAtaque(
          impacto,
          Math.max(1, Math.round(duracionTrayectoria * 0.72)),
          version,
          { critico: golpe?.critico === true },
        ),
      ]);

      if (indice < disparos.length - 1) {
        await this.esperar(
          this.calcularDuracion(fases.pausaEntreManos ?? 1),
          version,
        );
      }
    }

    await this.esperar(
      this.calcularDuracion(fases.retorno ?? 1),
      version,
    );
    this.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
  }

  obtenerDisparosVarita(evento, golpes) {
    const fuentes = (evento?.configuracionAtaque?.fuentes ?? []).filter(
      (fuente) => fuente?.familiaObjeto === "varita",
    );

    if (!evento.idObjetivo) {
      return fuentes.map((fuente) => Object.freeze({ fuente, golpe: null }));
    }

    const golpesValidos = (Array.isArray(golpes) ? golpes : []).filter(Boolean);
    return golpesValidos.map((golpe, indice) => {
      const fuente =
        fuentes.find((actual) => golpe?.mano && actual?.mano === golpe.mano) ??
        fuentes[indice] ??
        fuentes[0];
      return Object.freeze({ fuente, golpe });
    }).filter((disparo) => disparo.fuente);
  }

  async reproducirAtaqueCuerpoACuerpo(evento, golpes, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idAtacante);
    const centroBase = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.compositor.obtenerCentroCasilla(evento.origenAtacante);
    const centroObjetivo = this.compositor.obtenerCentroCasilla(
      evento.posicionObjetivo,
    );

    if (!nodo?.contenedor || !centroBase || !centroObjetivo) {
      await this.reproducirAtaqueProvisional(evento, golpes, version);
      return;
    }

    const direccion = normalizarDireccionImpacto({
      origen: centroBase,
      destino: centroObjetivo,
    });
    const resultadosPendientes = [];
    const fases = evento.ritmoVisual?.fases ?? {};
    const perfilInicial = this.obtenerPerfilGolpe(evento, golpes[0], 0);
    const avanceInicial = this.obtenerAvancePixeles(perfilInicial);
    const centroPreparado = {
      x: centroBase.x - direccion.x * avanceInicial * 0.22,
      y: centroBase.y - direccion.y * avanceInicial * 0.22,
    };

    await this.moverNodoAtaque({
      nodo,
      destino: centroPreparado,
      duracion: this.calcularDuracion(
        fases.preparacion ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs / 4,
      ),
      ease: "Sine.easeOut",
      version,
    });

    if (version !== this.versionCancelacion || this.destruido) {
      this.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
      return;
    }

    if (evento.ritmoVisual.secuencia === "estocada") {
      await this.reproducirEstocada({
        evento,
        golpe: golpes[0],
        perfil: perfilInicial,
        nodo,
        centroBase,
        centroPreparado,
        centroObjetivo,
        direccion,
        fases,
        resultadosPendientes,
        version,
      });
    } else {
      for (let indice = 0; indice < golpes.length; indice += 1) {
        if (version !== this.versionCancelacion || this.destruido) break;
        const golpe = golpes[indice];
        const perfil = this.obtenerPerfilGolpe(evento, golpe, indice);
        const idFase = evento.ritmoVisual.secuencia === "dual"
          ? indice === 0
            ? "golpePrincipal"
            : "golpeSecundario"
          : "accion";
        await this.reproducirGolpeFisico({
          evento,
          golpe,
          indiceGolpe: indice,
          perfil,
          nodo,
          centroPreparado,
          centroObjetivo,
          direccion,
          duracion: this.calcularDuracion(
            fases[idFase] ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs,
          ),
          resultadosPendientes,
          version,
        });

        if (indice < golpes.length - 1) {
          await this.esperar(
            this.calcularDuracion(fases.pausaEntreManos ?? 1),
            version,
          );
        }
      }
    }

    await this.moverNodoAtaque({
      nodo,
      destino: centroBase,
      duracion: this.calcularDuracion(
        fases.retorno ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs / 3,
      ),
      ease: "Sine.easeInOut",
      version,
    });
    await Promise.all(resultadosPendientes);
    this.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
  }

  async reproducirGolpeFisico({
    evento,
    golpe,
    indiceGolpe,
    perfil,
    nodo,
    centroPreparado,
    centroObjetivo,
    direccion,
    duracion,
    resultadosPendientes,
    version,
  }) {
    const avance = this.obtenerAvancePixeles(perfil);
    const lateral = { x: -direccion.y, y: direccion.x };
    const signoMano = golpe?.mano === "secundaria" ? -1 : 1;
    const centroAtaque = {
      x: centroPreparado.x + direccion.x * avance + lateral.x * signoMano * 1.5,
      y: centroPreparado.y + direccion.y * avance + lateral.y * signoMano * 1.5,
    };
    const ida = Math.max(1, Math.round(duracion * 0.55));
    const vuelta = Math.max(1, duracion - ida);

    await this.moverNodoAtaque({
      nodo,
      destino: centroAtaque,
      duracion: ida,
      ease: "Quad.easeOut",
      version,
    });

    if (version !== this.versionCancelacion || this.destruido) {
      return;
    }

    const efecto = this.efectosReducidos
      ? null
      : this.creadorEfectos?.crearEfectoAtaqueCuerpoACuerpo({
          centroAtacante: centroAtaque,
          centroObjetivo,
          animacion: perfil.animacion,
          mano: golpe?.mano ?? null,
          critico: golpe?.critico === true,
        });
    if (golpe) {
      resultadosPendientes.push(
        this.reproducirResultadoGolpe(
          evento,
          golpe,
          indiceGolpe,
          version,
          { esperarDecorativos: false },
        ),
      );
    }

    await Promise.all([
      this.moverNodoAtaque({
        nodo,
        destino: centroPreparado,
        duracion: vuelta,
        ease: "Sine.easeIn",
        version,
      }),
      this.animarEfectoAtaque(efecto, duracion, version, {
        critico: golpe?.critico === true,
      }),
    ]);
  }

  async reproducirEstocada({
    evento,
    golpe,
    perfil,
    nodo,
    centroBase,
    centroPreparado,
    centroObjetivo,
    direccion,
    fases,
    resultadosPendientes,
    version,
  }) {
    const fuente = this.obtenerFuenteGolpe(evento, golpe, 0);
    const recursoVisual = fuente?.recursoVisual ?? null;
    const dxCasillas =
      (evento.posicionObjetivo?.x ?? 0) -
      (evento.origenAtacante?.x ?? 0);
    const dyCasillas =
      (evento.posicionObjetivo?.y ?? 0) -
      (evento.origenAtacante?.y ?? 0);
    const distanciaCasillas = Math.max(
      Math.abs(dxCasillas),
      Math.abs(dyCasillas),
    );
    const origenVisual =
      distanciaCasillas >= 2
        ? {
            x:
              centroBase.x +
              Math.sign(dxCasillas) * TAMANO_CASILLA_REFERENCIA,
            y:
              centroBase.y +
              Math.sign(dyCasillas) * TAMANO_CASILLA_REFERENCIA,
          }
        : centroBase;
    const pasoDiagonal =
      Math.abs(direccion.x) > 0.01 && Math.abs(direccion.y) > 0.01
        ? Math.SQRT2
        : 1;
    const longitudVisual =
      (Number(perfil?.animacion?.longitudVisualCasillas) || 2) *
      TAMANO_CASILLA_REFERENCIA *
      pasoDiagonal;
    const angulo = Math.atan2(direccion.y, direccion.x);
    const lanza =
      this.efectosReducidos || !recursoVisual
        ? null
        : await this.creadorRecursosVisuales?.crearSpriteTemporal({
            recursoVisual,
            centro: origenVisual,
            longitudVisiblePx: longitudVisual,
            anguloRad: angulo,
            orientacionBaseGrados:
              Number(perfil?.animacion?.orientacionBaseGrados) || 0,
            anclaje: ANCLAJES_RECURSO.CENTRO,
            alpha: 0,
            tint: golpe?.critico === true ? 0xffe49a : null,
          });

    if (version !== this.versionCancelacion || this.destruido) {
      lanza?.destroy?.();
      return;
    }

    const duracionAparicion = this.calcularDuracion(fases.avance ?? 1);
    const duracionEstocada = this.calcularDuracion(fases.estocada ?? 1);

    if (lanza) {
      const escalaX = lanza.scaleX ?? 1;
      const escalaY = lanza.scaleY ?? 1;
      lanza.scaleX = escalaX * 0.82;
      if (golpe?.critico === true) lanza.scaleY = escalaY * 1.2;
      await this.crearTween({
        targets: lanza,
        scaleX: escalaX,
        scaleY: golpe?.critico === true ? escalaY * 1.2 : escalaY,
        alpha: 1,
        duration: duracionAparicion,
        ease: "Quad.easeOut",
      }, version);
    } else {
      await this.esperar(duracionAparicion, version);
    }

    if (version !== this.versionCancelacion || this.destruido) {
      lanza?.destroy?.();
      return;
    }

    if (golpe) {
      resultadosPendientes.push(
        this.reproducirResultadoGolpe(evento, golpe, 0, version, {
          esperarDecorativos: false,
        }),
      );
    }

    if (lanza) {
      const escalaY = lanza.scaleY ?? 1;
      await this.crearTween({
        targets: lanza,
        alpha: 0.2,
        scaleY: golpe?.critico === true ? escalaY * 1.08 : escalaY,
        duration: duracionEstocada,
        ease: "Sine.easeInOut",
      }, version);
      lanza.destroy?.();
    } else {
      await this.esperar(duracionEstocada, version);
    }

    this.compositor.posicionarNodoEntidad(evento.idAtacante, centroPreparado);
  }

  obtenerPerfilGolpe(evento, golpe, indiceGolpe) {
    const fuente = this.obtenerFuenteGolpe(evento, golpe, indiceGolpe);
    return obtenerPerfilAtaque({
      familiaObjeto: fuente?.familiaObjeto ?? null,
      esAtaqueNatural: fuente?.esAtaqueNatural === true || fuente === null,
    });
  }

  obtenerFuenteGolpe(evento, golpe, indiceGolpe) {
    const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
    return (
      fuentes.find((actual) => golpe?.mano && actual?.mano === golpe.mano) ??
      fuentes[indiceGolpe] ??
      fuentes[0] ??
      null
    );
  }

  obtenerAvancePixeles(perfil) {
    return Math.max(2,
      (Number(perfil?.animacion?.avanceCasilla) || 0.25) *
        TAMANO_CASILLA_REFERENCIA,
    );
  }

  moverNodoAtaque({ nodo, destino, duracion, ease, version }) {
    return this.crearTween({
      targets: [nodo.contenedor, nodo.sombra].filter(Boolean),
      x: destino.x,
      y: destino.y,
      duration: Math.max(1, duracion),
      ease,
    }, version);
  }

  async animarEfectoAtaque(
    efecto,
    duracion,
    version,
    { critico = false } = {},
  ) {
    if (!efecto) return;
    efecto.setScale?.(critico ? 0.82 : 0.75);
    await this.crearTween({
      targets: efecto,
      scaleX: critico ? 1.42 : 1.18,
      scaleY: critico ? 1.42 : 1.18,
      alpha: 0,
      duration: Math.max(1, duracion),
      ease: "Quad.easeOut",
    }, version);
    efecto.destroy?.();
  }

  obtenerGolpesVisuales(evento) {
    const golpes = evento?.resultado?.golpes;
    if (Array.isArray(golpes) && golpes.length > 0) {
      return golpes;
    }

    const golpesRealizados = evento?.resultado?.golpesRealizados;
    if (
      evento?.idObjetivo &&
      golpesRealizados === undefined &&
      evento?.resultado
    ) {
      return [
        Object.freeze({
          mano: null,
          impacto: evento.resultado.impacto === true,
          bloqueado: evento.resultado.bloqueado === true,
          critico: evento.resultado.critico === true,
          danio: Number(evento.resultado.danio) || 0,
          vidaObjetivoAntes: null,
          vidaObjetivoDespues: evento.estadoObjetivoFinal?.vidaActual ?? null,
          vidaObjetivoMaxima: evento.estadoObjetivoFinal?.vidaMaxima ?? null,
        }),
      ];
    }

    // Un ataque a casilla vacía conserva preparación, pero no inventa fallo,
    // objetivo ni daño.
    return [null];
  }

  async reproducirGolpeProvisional(evento, golpe, indiceGolpe, version) {
    const nodoAtacante = this.compositor.obtenerNodoEntidad(evento.idAtacante);
    const duracion = this.calcularDuracion(
      CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs,
    );

    if (nodoAtacante?.contenedor && !this.efectosReducidos) {
      const yInicial = nodoAtacante.contenedor.y;
      const escalaXInicial = nodoAtacante.contenedor.scaleX ?? 1;
      const escalaYInicial = nodoAtacante.contenedor.scaleY ?? 1;
      const mitad = Math.max(1, Math.round(duracion / 2));

      await this.crearTween({
        targets: nodoAtacante.contenedor,
        scaleX:
          escalaXInicial *
          CONFIGURACION_ANIMACIONES_PHASER.escalaPulsoAtaque,
        scaleY:
          escalaYInicial *
          CONFIGURACION_ANIMACIONES_PHASER.escalaPulsoAtaque,
        y: yInicial - CONFIGURACION_ANIMACIONES_PHASER.elevacionPulsoAtaque,
        duration: mitad,
        ease: "Sine.easeOut",
      }, version);

      await Promise.all([
        this.crearTween({
          targets: nodoAtacante.contenedor,
          scaleX: escalaXInicial,
          scaleY: escalaYInicial,
          y: yInicial,
          duration: mitad,
          ease: "Sine.easeIn",
        }, version),
        golpe
          ? this.reproducirResultadoGolpe(
              evento,
              golpe,
              indiceGolpe,
              version,
            )
          : Promise.resolve(),
      ]);

      nodoAtacante.contenedor.scaleX = escalaXInicial;
      nodoAtacante.contenedor.scaleY = escalaYInicial;
      nodoAtacante.contenedor.y = yInicial;
      return;
    }

    await Promise.all([
      this.esperar(duracion, version),
      golpe
        ? this.reproducirResultadoGolpe(evento, golpe, indiceGolpe, version)
        : Promise.resolve(),
    ]);
  }

  async reproducirResultadoGolpe(
    evento,
    golpe,
    indiceGolpe,
    version,
    { esperarDecorativos = true } = {},
  ) {
    if (!evento.idObjetivo) return;

    const esenciales = [];
    const decorativos = [];

    if (golpe.impacto !== true) {
      esenciales.push(this.reproducirFalloObjetivo(evento, version));
      decorativos.push(
        this.reproducirTextoResultado({
          evento,
          texto: traducir("mensajes.feedback.fallo", { respaldo: "FALLO" }),
          tipo: TIPOS_FEEDBACK_COMBATE.FALLO,
          indiceGolpe,
          version,
        }),
      );
      await Promise.all(esenciales);
      await this.resolverDecorativos(decorativos, esperarDecorativos);
      return;
    }

    const danio = Math.max(0, Number(golpe.danio) || 0);

    if (danio > 0) {
      esenciales.push(
        this.reproducirImpactoObjetivo(evento, golpe, version),
        this.reproducirCambioVida(evento, golpe, version),
      );
      decorativos.push(
        this.reproducirTextoResultado({
          evento,
          texto: `${formatearDanio(danio)}`,
          tipo: TIPOS_FEEDBACK_COMBATE.DANIO,
          indiceGolpe,
          version,
        }),
      );
    }

    if (golpe.bloqueado === true) {
      decorativos.push(
        this.reproducirBloqueo(evento, indiceGolpe, version),
        this.reproducirTextoResultado({
          evento,
          texto: traducir("mensajes.feedback.bloqueo", { respaldo: "BLOQUEO" }),
          tipo: TIPOS_FEEDBACK_COMBATE.BLOQUEO,
          indiceGolpe,
          desplazamientoY: 8,
          version,
        }),
      );
    }

    if (golpe.critico === true) {
      decorativos.push(
        this.reproducirTextoResultado({
          evento,
          texto: traducir("mensajes.feedback.critico", { respaldo: "CRÍTICO" }),
          tipo: TIPOS_FEEDBACK_COMBATE.CRITICO,
          indiceGolpe,
          desplazamientoY: -8,
          version,
        }),
      );
    }

    await Promise.all(esenciales);
    await this.resolverDecorativos(decorativos, esperarDecorativos);
  }

  resolverDecorativos(promesas, esperar) {
    const grupo = Promise.all(promesas);
    if (esperar) {
      return grupo;
    }
    void grupo.catch(() => {});
    return Promise.resolve();
  }

  async reproducirFalloObjetivo(evento, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idObjetivo);
    if (!nodo?.contenedor || this.efectosReducidos) return;

    const contenedor = nodo.contenedor;
    const posicionInicial = { x: contenedor.x, y: contenedor.y };
    const direccion = normalizarDireccionImpacto({
      origen: evento.origenAtacante,
      destino: evento.posicionObjetivo,
    });
    const lateral = { x: -direccion.y, y: direccion.x };
    const desplazamiento =
      CONFIGURACION_EFECTOS_COMBATE_PHASER.esquiva.desplazamientoPx;

    await this.crearTween({
      targets: contenedor,
      x: posicionInicial.x + lateral.x * desplazamiento,
      y: posicionInicial.y + lateral.y * desplazamiento,
      duration: this.calcularDuracion(
        CONFIGURACION_EFECTOS_COMBATE_PHASER.esquiva.duracionMs,
      ),
      yoyo: true,
      ease: "Sine.easeOut",
    }, version);

    contenedor.x = posicionInicial.x;
    contenedor.y = posicionInicial.y;
  }

  async reproducirImpactoObjetivo(evento, golpe, version) {
    const nodoObjetivo = this.compositor.obtenerNodoEntidad(evento.idObjetivo);
    if (!nodoObjetivo?.contenedor) return;

    const contenedor = nodoObjetivo.contenedor;
    const posicionInicial = {
      x: contenedor.x,
      y: contenedor.y,
      alpha: contenedor.alpha ?? 1,
    };
    const direccion = normalizarDireccionImpacto({
      origen: evento.origenAtacante,
      destino: evento.posicionObjetivo,
    });
    const duracion = this.calcularDuracion(
      CONFIGURACION_ANIMACIONES_PHASER.impactoObjetivoMs,
    );
    const factorCritico = golpe.critico === true
      ? CONFIGURACION_EFECTOS_COMBATE_PHASER.golpe.impactoCriticoEscala
      : 1;
    const usarMarcaGenerica = this.debeUsarMarcaImpactoGenerica(evento);
    const marca = this.efectosReducidos || !usarMarcaGenerica
      ? null
      : this.creadorEfectos?.crearMarcaImpacto({
          centro: posicionInicial,
          critico: golpe.critico === true,
        });

    if (marca) {
      marca.setScale?.(
        CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoInicial,
      );
    }

    const promesas = [
      this.crearTween({
        targets: contenedor,
        x:
          posicionInicial.x +
          direccion.x *
            CONFIGURACION_ANIMACIONES_PHASER.desplazamientoImpactoPx *
            factorCritico,
        y:
          posicionInicial.y +
          direccion.y *
            CONFIGURACION_ANIMACIONES_PHASER.desplazamientoImpactoPx *
            factorCritico,
        alpha: this.efectosReducidos ? 0.72 : golpe.critico ? 0.4 : 0.52,
        duration: Math.max(1, Math.round(duracion / 2)),
        yoyo: true,
        ease: "Quad.easeOut",
      }, version),
    ];

    if (marca) {
      promesas.push(
        this.crearTween({
          targets: marca,
          scaleX: CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoFinal,
          scaleY: CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoFinal,
          alpha: 0,
          duration: duracion,
          ease: "Quad.easeOut",
        }, version),
      );
    }

    await Promise.all(promesas);

    contenedor.x = posicionInicial.x;
    contenedor.y = posicionInicial.y;
    contenedor.alpha = posicionInicial.alpha;
    marca?.destroy?.();
  }

  debeUsarMarcaImpactoGenerica(evento) {
    if (evento?.esHabilidad === true) return false;
    if (this.esAtaqueArco(evento) || this.esAtaqueVarita(evento)) return false;
    if (!this.esAtaqueCuerpoACuerpo(evento)) return true;

    const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
    return !fuentes.some((fuente) => {
      const perfil = obtenerPerfilAtaque({
        familiaObjeto: fuente?.familiaObjeto ?? null,
        esAtaqueNatural: fuente?.esAtaqueNatural === true || fuente == null,
      });
      return perfil?.animacion?.tipo === "corte" ||
        perfil?.animacion?.tipo === "golpe" ||
        perfil?.animacion?.tipo === "estocada" ||
        perfil?.animacion?.tipo === "estocada_recurso";
    });
  }

  async reproducirDanioPeriodico(evento, version) {
    if (!evento.idObjetivo || evento.danio <= 0) {
      return;
    }

    const golpeVisual = {
      vidaObjetivoAntes: evento.vidaAntes,
      vidaObjetivoDespues: evento.vidaDespues,
      vidaObjetivoMaxima: evento.vidaMaxima,
    };
    const nodo = this.compositor.obtenerNodoEntidad(evento.idObjetivo);
    const centro = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.compositor.obtenerCentroCasilla(evento.posicionObjetivo);
    const promesas = [
      this.reproducirCambioVida(evento, golpeVisual, version),
    ];

    if (centro) {
      promesas.push(
        this.reproducirTextoResultado({
          evento,
          texto: `${formatearDanio(evento.danio)}`,
          tipo: TIPOS_FEEDBACK_COMBATE.DANIO,
          indiceGolpe: 0,
          desplazamientoY: 0,
          version,
        }),
      );
    }

    if (nodo?.contenedor && !this.efectosReducidos) {
      const alphaInicial = nodo.contenedor.alpha ?? 1;
      promesas.push(
        this.crearTween({
          targets: nodo.contenedor,
          alpha: 0.48,
          duration: this.calcularDuracion(90),
          yoyo: true,
          ease: "Sine.easeOut",
        }, version).then(() => {
          if (nodo.contenedor) nodo.contenedor.alpha = alphaInicial;
        }),
      );
    }

    await Promise.all(promesas);
  }

  async reproducirBotinAparecido(evento, version) {
    if (!evento?.entidadBotin) return;

    if (evento.botinActualizado === true && evento.idBotinAnterior) {
      const nodoExistente = this.compositor.obtenerNodoEntidad?.(
        evento.idBotinAnterior,
      );
      if (nodoExistente?.contenedor) {
        if (this.efectosReducidos) {
          await this.esperar(this.calcularDuracion(90), version);
          return;
        }

        const escalaX = nodoExistente.contenedor.scaleX ?? 1;
        const escalaY = nodoExistente.contenedor.scaleY ?? 1;
        await this.crearTween({
          targets: nodoExistente.contenedor,
          scaleX: escalaX * 1.14,
          scaleY: escalaY * 1.14,
          duration: this.calcularDuracion(110),
          yoyo: true,
          ease: "Sine.easeOut",
        }, version);
        if (nodoExistente.contenedor) {
          nodoExistente.contenedor.scaleX = escalaX;
          nodoExistente.contenedor.scaleY = escalaY;
        }
        return;
      }
    }

    const rutaBotin = evento.entidadBotin.recursoVisual ?? null;
    if (rutaBotin) {
      await this.gestorRecursos?.obtenerInformacionAsync?.(rutaBotin);
      if (version !== this.versionCancelacion || this.destruido) return;
    }

    const nodo = this.compositor.establecerEntidadVisualTemporal?.(
      evento.entidadBotin,
    );
    if (!nodo?.contenedor) return;

    if (this.efectosReducidos) {
      nodo.contenedor.alpha = 1;
      nodo.contenedor.scaleX = 1;
      nodo.contenedor.scaleY = 1;
      await this.esperar(this.calcularDuracion(80), version);
      return;
    }

    nodo.contenedor.alpha = 0;
    nodo.contenedor.scaleX = 0.6;
    nodo.contenedor.scaleY = 0.6;
    await this.crearTween({
      targets: nodo.contenedor,
      alpha: 1,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: this.calcularDuracion(130),
      ease: "Back.easeOut",
    }, version);

    if (version !== this.versionCancelacion || this.destruido) return;
    await this.crearTween({
      targets: nodo.contenedor,
      scaleX: 1,
      scaleY: 1,
      duration: this.calcularDuracion(70),
      ease: "Sine.easeInOut",
    }, version);
  }

  async reproducirEntidadDerrotada(evento, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idEntidad);
    if (!nodo) {
      return;
    }

    const objetivos = [nodo.contenedor, nodo.sombra].filter(Boolean);
    if (objetivos.length > 0 && !this.efectosReducidos) {
      await this.crearTween({
        targets: objetivos,
        alpha: 0,
        scaleX: 0.82,
        scaleY: 0.82,
        duration: this.calcularDuracion(160),
        ease: "Quad.easeIn",
      }, version);
    }

    if (version === this.versionCancelacion && !this.destruido) {
      this.compositor.retirarEntidadVisual?.(evento.idEntidad);
    }
  }

  async reproducirBloqueo(evento, indiceGolpe, version) {
    if (this.efectosReducidos) return;
    const centro = this.obtenerCentroObjetivo(evento);
    const escudo = this.creadorEfectos?.crearEscudoBloqueo({
      centro,
      indiceGolpe,
    });
    if (!escudo) return;

    await this.crearTween({
      targets: escudo,
      scaleX: CONFIGURACION_EFECTOS_COMBATE_PHASER.bloqueo.escalaFinal,
      scaleY: CONFIGURACION_EFECTOS_COMBATE_PHASER.bloqueo.escalaFinal,
      alpha: 0,
      duration: this.calcularDuracion(
        CONFIGURACION_EFECTOS_COMBATE_PHASER.bloqueo.duracionMs,
      ),
      ease: "Quad.easeOut",
    }, version);
    escudo.destroy?.();
  }

  async reproducirTextoResultado({
    evento,
    texto,
    tipo,
    indiceGolpe,
    desplazamientoY = 0,
    version,
  } = {}) {
    const centro = this.obtenerCentroObjetivo(evento);
    const objeto = this.creadorEfectos?.crearTextoFlotante({
      centro,
      texto,
      tipo,
      indiceGolpe,
      desplazamientoY,
    });
    if (!objeto) return;

    const duracion = this.calcularDuracion(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.duracionMs,
    );
    const yInicial = objeto.y;

    await this.crearTween({
      targets: objeto,
      y:
        yInicial - CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.elevacionPx,
      scaleX: CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.escalaFinal,
      scaleY: CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.escalaFinal,
      alpha: 0,
      duration: duracion,
      ease: "Quad.easeOut",
    }, version);
    objeto.destroy?.();
  }

  async reproducirCambioVida(evento, golpe, version) {
    const vidaAntes = Number(golpe.vidaObjetivoAntes);
    const vidaDespues = Number(golpe.vidaObjetivoDespues);
    const vidaMaxima = Number(golpe.vidaObjetivoMaxima);

    if (
      !Number.isFinite(vidaAntes) ||
      !Number.isFinite(vidaDespues) ||
      !Number.isFinite(vidaMaxima) ||
      vidaMaxima <= 0 ||
      vidaAntes === vidaDespues
    ) {
      return;
    }

    const estado = { vida: vidaAntes };
    const actualizable = this.compositor.actualizarBarraVidaEntidad(
      evento.idObjetivo,
      {
        vidaActual: vidaAntes,
        vidaMaxima,
      },
    );
    if (!actualizable) return;

    await this.crearTween({
      targets: estado,
      vida: vidaDespues,
      duration: this.calcularDuracion(
        CONFIGURACION_EFECTOS_COMBATE_PHASER.barraVida.duracionMs,
      ),
      ease: "Linear",
      onUpdate: () => {
        this.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
          vidaActual: estado.vida,
          vidaMaxima,
        });
      },
    }, version);

    this.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
      vidaActual: vidaDespues,
      vidaMaxima,
    });
  }

  async reproducirRecursosRecuperados(evento, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idObjetivo);
    const centro = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.compositor.obtenerCentroCasilla(evento.posicionObjetivo);
    if (!centro || !Array.isArray(evento.recursos) || evento.recursos.length === 0) {
      return;
    }

    const fases = evento.ritmoVisual?.fases ?? {};
    const duracionPreparacion = this.calcularDuracion(
      fases.preparacion ?? 60,
    );
    const duracionUso = this.calcularDuracion(fases.uso ?? 60);
    const duracionResultado = this.calcularDuracion(
      (fases.recuperacion ?? 120) + (fases.retorno ?? 45),
    );

    await this.esperar(duracionPreparacion, version);
    if (version !== this.versionCancelacion || this.destruido) return;

    const configuracionRecurso =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.recursoVisual;
    const sprite = evento.fuente?.recursoVisual
      ? await this.creadorRecursosVisuales?.crearSpriteTemporal({
          recursoVisual: evento.fuente.recursoVisual,
          centro: {
            x: centro.x + configuracionRecurso.desplazamientoX,
            y: centro.y + configuracionRecurso.desplazamientoY,
          },
          longitudVisiblePx: configuracionRecurso.longitudVisiblePx,
          anclaje: ANCLAJES_RECURSO.CENTRO,
          alpha: 0.2,
        })
      : null;

    const escalaSpriteX = sprite?.scaleX ?? 1;
    const escalaSpriteY = sprite?.scaleY ?? 1;
    if (sprite) {
      sprite.scaleX = escalaSpriteX * 0.72;
      sprite.scaleY = escalaSpriteY * 0.72;
      await this.crearTween({
        targets: sprite,
        scaleX: escalaSpriteX * 1.05,
        scaleY: escalaSpriteY * 1.05,
        alpha: 1,
        y: sprite.y - 3,
        duration: duracionUso,
        ease: "Sine.easeOut",
      }, version);
    } else {
      await this.esperar(duracionUso, version);
    }

    if (version !== this.versionCancelacion || this.destruido) {
      sprite?.destroy?.();
      return;
    }

    const efecto = this.creadorEfectosRecuperacion?.crearRecuperacion({
      centro,
      recursos: evento.recursos,
      reducido: this.efectosReducidos,
    });
    if (efecto) {
      void this.animarRecuperacionFija(efecto, centro, version).catch(() => {});
    }
    void this.reproducirAumentoVidaExplicito(evento, version).catch(() => {});

    if (sprite) {
      await this.crearTween({
        targets: sprite,
        alpha: 0,
        scaleX: escalaSpriteX * 0.82,
        scaleY: escalaSpriteY * 0.82,
        duration: Math.max(1, duracionResultado),
        ease: "Sine.easeIn",
      }, version);
      sprite.destroy?.();
    } else {
      await this.esperar(Math.max(1, duracionResultado), version);
    }
  }

  async animarRecuperacionFija(efecto, centro, version) {
    const configuracion =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.recuperacion;

    await this.crearTween({
      targets: efecto,
      scaleX: configuracion.escalaVisible,
      scaleY: configuracion.escalaVisible,
      alpha: 1,
      duration: configuracion.entradaMs,
      ease: "Sine.easeOut",
    }, version);

    if (version !== this.versionCancelacion || this.destruido) {
      efecto.destroy?.(true);
      return;
    }

    await this.esperar(configuracion.permanenciaMs, version);
    await this.crearTween({
      targets: efecto,
      scaleX: configuracion.escalaFinal,
      scaleY: configuracion.escalaFinal,
      alpha: 0,
      y: centro.y - configuracion.elevacionSalidaPx,
      duration: configuracion.salidaMs,
      ease: "Quad.easeOut",
    }, version);
    efecto.destroy?.(true);
  }

  async reproducirAumentoVidaExplicito(evento, version) {
    const vida = evento.recursos.find((recurso) => recurso.recurso === "vida");
    if (!vida) return;
    const valorAntes = Number(vida.valorAntes);
    const valorDespues = Number(vida.valorDespues);
    const valorMaximo = Number(vida.valorMaximo);
    if (
      !Number.isFinite(valorAntes) ||
      !Number.isFinite(valorDespues) ||
      !Number.isFinite(valorMaximo) ||
      valorMaximo <= 0 ||
      valorDespues <= valorAntes
    ) {
      return;
    }

    const estado = { vida: valorAntes };
    const actualizable = this.compositor.actualizarBarraVidaEntidad(
      evento.idObjetivo,
      { vidaActual: valorAntes, vidaMaxima: valorMaximo },
    );
    if (!actualizable) return;

    await this.crearTween({
      targets: estado,
      vida: valorDespues,
      duration: this.calcularDuracion(
        CONFIGURACION_EFECTOS_COMBATE_PHASER.barraVida.duracionMs,
      ),
      ease: "Linear",
      onUpdate: () => {
        this.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
          vidaActual: estado.vida,
          vidaMaxima: valorMaximo,
        });
      },
    }, version);
    this.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
      vidaActual: valorDespues,
      vidaMaxima: valorMaximo,
    });
  }

  async reproducirNivelAumentado(evento, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idJugador);
    const centro = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.compositor.obtenerCentroCasilla(evento.posicion);
    if (!centro) return;

    const efecto = this.creadorEfectosRecuperacion?.crearHolyBless({
      centro,
      nivelActual: evento.nivelActual,
      reducido: this.efectosReducidos,
    });
    if (!efecto) return;

    const configuracion =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.nivel;
    await this.crearTween({
      targets: efecto,
      scaleX: configuracion.escalaVisible,
      scaleY: configuracion.escalaVisible,
      alpha: 1,
      duration: configuracion.entradaMs,
      ease: "Sine.easeOut",
    }, version);

    if (version !== this.versionCancelacion || this.destruido) {
      efecto.destroy?.(true);
      return;
    }

    void this.finalizarHolyBless(efecto, centro, version).catch(() => {});
  }

  async finalizarHolyBless(efecto, centro, version) {
    const configuracion =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.nivel;

    await this.esperar(configuracion.permanenciaMs, version);
    await this.crearTween({
      targets: efecto,
      scaleX: configuracion.escalaFinal,
      scaleY: configuracion.escalaFinal,
      alpha: 0,
      y: centro.y - configuracion.elevacionSalidaPx,
      duration: configuracion.salidaMs,
      ease: "Sine.easeOut",
    }, version);
    efecto.destroy?.(true);
  }

  obtenerCentroObjetivo(evento) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idObjetivo);
    if (nodo?.contenedor) {
      return { x: nodo.contenedor.x, y: nodo.contenedor.y };
    }

    return this.compositor.obtenerCentroCasilla(evento.posicionObjetivo);
  }

  calcularDuracion(duracionBase) {
    return calcularDuracionAnimacionPhaser(duracionBase, {
      velocidad: this.velocidad,
      cantidadPendiente: this.obtenerCantidadEventosPendientes(),
    });
  }

  crearTween(configuracion, version) {
    return new Promise((resolver) => {
      if (version !== this.versionCancelacion || this.destruido) {
        resolver();
        return;
      }

      let tween = null;
      let finalizado = false;
      const finalizar = () => {
        if (finalizado) return;
        finalizado = true;
        if (tween) this.tweensActivos.delete(tween);
        resolver();
      };

      tween = this.escena.tweens.add({
        ...configuracion,
        onComplete: finalizar,
        onStop: finalizar,
      });
      this.tweensActivos.add(tween);
    });
  }

  esperar(duracion, version) {
    return new Promise((resolver) => {
      if (version !== this.versionCancelacion || this.destruido) {
        resolver();
        return;
      }

      let finalizado = false;
      const espera = {
        temporizador: null,
        finalizar: null,
      };
      const finalizar = () => {
        if (finalizado) return;
        finalizado = true;
        this.temporizadoresActivos.delete(espera);
        resolver();
      };

      espera.finalizar = finalizar;
      espera.temporizador = this.escena.time.delayedCall(duracion, finalizar);
      this.temporizadoresActivos.add(espera);
    });
  }
}

function convertirCambiosRecursosARecuperacion(recursos) {
  if (!Array.isArray(recursos)) return [];
  return recursos
    .map((recurso) => {
      const cantidadAplicada = Math.max(0, Number(recurso?.cantidadReal) || 0);
      const valorMaximo = Math.max(0, Number(recurso?.valorMaximo) || 0);
      if (cantidadAplicada <= 0 || valorMaximo <= 0) return null;
      return {
        recurso: recurso?.recurso === "mana" ? "mana" : "vida",
        cantidadAplicada,
        valorAntes: Math.max(0, Number(recurso?.valorAntes) || 0),
        valorDespues: Math.max(0, Number(recurso?.valorDespues) || 0),
        valorMaximo,
        proporcionRecuperada: Math.min(1, cantidadAplicada / valorMaximo),
      };
    })
    .filter(Boolean);
}

function resolverEaseHabilidad(movimiento) {
  switch (movimiento) {
    case "flotante":
      return "Sine.easeInOut";
    case "nervioso":
      return "Quad.easeInOut";
    case "descarga_anclada":
      return "Sine.easeOut";
    case "punzante":
      return "Cubic.easeIn";
    case "pesado":
      return "Sine.easeInOut";
    case "impulso_fuerte":
      return "Cubic.easeOut";
    default:
      return "Linear";
  }
}

function obtenerIntensidadEnvenenamientoImpacto(impacto) {
  const eventoEstado = (impacto?.eventosEfectos ?? []).find(
    (evento) =>
      [
        TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_APLICADO,
        TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_ACTUALIZADO,
      ].includes(evento?.tipo) &&
      evento?.efecto?.catalogoEfectoId === "envenenamiento" &&
      Number.isFinite(evento?.efecto?.intensidad),
  );

  if (!eventoEstado) return null;

  return Object.freeze({
    intensidad: Math.max(1, Number(eventoEstado.efecto.intensidad) || 1),
    maximo: Math.max(1, Number(eventoEstado.efecto.maximo) || 1),
    operacion: eventoEstado.operacion ?? null,
    alcanzoMaximo: eventoEstado.alcanzoMaximo === true,
  });
}

function normalizarDireccionImpacto({ origen, destino } = {}) {
  const diferenciaX = Number(destino?.x) - Number(origen?.x);
  const diferenciaY = Number(destino?.y) - Number(origen?.y);
  const longitud = Math.hypot(diferenciaX, diferenciaY);

  if (!Number.isFinite(longitud) || longitud === 0) {
    return Object.freeze({ x: 0, y: -1 });
  }

  return Object.freeze({
    x: diferenciaX / longitud,
    y: diferenciaY / longitud,
  });
}

function formatearDanio(valor) {
  return Number.isInteger(valor) ? `${valor}` : valor.toFixed(1);
}


function calcularAnilloArea(origen, destino) {
  if (!Number.isInteger(origen?.x) || !Number.isInteger(origen?.y) || !Number.isInteger(destino?.x) || !Number.isInteger(destino?.y)) {
    return 0;
  }
  return Math.max(
    Math.abs(destino.x - origen.x),
    Math.abs(destino.y - origen.y),
  );
}


function crearClaveCasillaVisual(casilla) {
  return Number.isInteger(casilla?.x) && Number.isInteger(casilla?.y)
    ? `${casilla.x}:${casilla.y}`
    : "";
}

function sonMismaCasilla(a, b) {
  return (
    Number.isInteger(a?.x) &&
    Number.isInteger(a?.y) &&
    a.x === b?.x &&
    a.y === b?.y
  );
}
