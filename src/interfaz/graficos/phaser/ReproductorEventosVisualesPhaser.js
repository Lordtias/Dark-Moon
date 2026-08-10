import { TIPOS_EVENTO_VISUAL } from "../TiposEventosVisuales.js";
import { TIPOS_ENTIDAD_VISUAL } from "../TiposEscena.js";
import { ContextoReproduccionVisualPhaser } from "./ContextoReproduccionVisualPhaser.js";
import { DespachadorEventosVisualesPhaser } from "./DespachadorEventosVisualesPhaser.js";
import { obtenerCentroImpactoHabilidad } from "./reproductores/ReproductorHabilidadesPhaser.js";
import {
  CONFIGURACION_EFECTOS_RECUPERACION_PHASER,
} from "./ConfiguracionEfectosRecuperacionPhaser.js";
import {
  ANCLAJES_RECURSO,
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

    this.alAplicarEscena = alAplicarEscena;
    this.cola = [];
    this.reproduciendo = false;
    this.destruido = false;
    this.esperadoresInactividad = new Set();

    this.contexto = new ContextoReproduccionVisualPhaser({
      escena,
      compositor,
      gestorRecursos,
      alMoverJugadorVisual,
      obtenerCantidadEventosPendientes: () =>
        this.obtenerCantidadEventosPendientes(),
      obtenerRachaMovimientosJugadorPendientes: () =>
        this.obtenerRachaMovimientosJugadorPendientes(),
      despacharEvento: (evento, version) =>
        this.despachador?.reproducir(evento, version),
      serviciosResultados: {
        reproducirCambioVida: (...argumentos) =>
          this.reproducirCambioVida(...argumentos),
        reproducirBloqueo: (...argumentos) =>
          this.reproducirBloqueo(...argumentos),
        reproducirTextoResultado: (...argumentos) =>
          this.reproducirTextoResultado(...argumentos),
        reproducirRecuperacionHabilidad: (...argumentos) =>
          this.reproducirRecuperacionHabilidad(...argumentos),
        reproducirEntidadDerrotada: (...argumentos) =>
          this.reproducirEntidadDerrotada(...argumentos),
        reproducirBotinAparecido: (...argumentos) =>
          this.reproducirBotinAparecido(...argumentos),
      },
    });

    this.despachador = new DespachadorEventosVisualesPhaser({
      contexto: this.contexto,
      reproducirDanioPeriodico: (evento, version) =>
        this.reproducirDanioPeriodico(evento, version),
      reproducirEntidadDerrotada: (evento, version) =>
        this.reproducirEntidadDerrotada(evento, version),
      reproducirBotinAparecido: (evento, version) =>
        this.reproducirBotinAparecido(evento, version),
      reproducirRecursosRecuperados: (evento, version) =>
        this.reproducirRecursosRecuperados(evento, version),
      reproducirNivelAumentado: (evento, version) =>
        this.reproducirNivelAumentado(evento, version),
    });
  }

  configurar({ velocidad, efectosReducidos } = {}) {
    return this.contexto.configurar({ velocidad, efectosReducidos });
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
    this.contexto.cancelarEjecucion();
    const ultimaEscena = this.cola.at(-1)?.escenaFinal ?? null;
    this.cola.length = 0;
    this.reproduciendo = false;
    this.contexto.compositor?.limpiarEfectosTemporales?.();

    if (aplicarUltimaEscena && ultimaEscena) {
      this.alAplicarEscena(ultimaEscena);
    } else {
      this.contexto.compositor?.reconciliarEfectosTemporalesDesdeEscenaActual?.();
      this.contexto.compositor?.reconciliarZonasTemporalesDesdeEscenaActual?.();
    }
    this.resolverEsperadoresInactividad();
  }

  destruir() {
    if (this.destruido) return;
    this.destruido = true;
    this.cancelar();
    this.despachador?.destruir?.();
    this.contexto?.destruir?.();
    // Se conservan las referencias destruidas hasta que terminen microtareas ya
    // iniciadas; así una cancelación durante un await no deja accesos nulos.
    this.alAplicarEscena = null;
  }

  async iniciarProcesamiento() {
    if (this.reproduciendo || this.destruido) {
      return;
    }

    this.reproduciendo = true;
    const version = this.contexto.versionCancelacion;

    try {
      while (this.cola.length > 0 && version === this.contexto.versionCancelacion) {
        const actualizacion = this.cola.shift();
        await this.reproducirActualizacion(actualizacion, version);
      }
    } finally {
      if (version === this.contexto.versionCancelacion) {
        this.reproduciendo = false;
        this.resolverEsperadoresInactividad();
      }
    }
  }

  async reproducirActualizacion(actualizacion, version) {
    for (const evento of actualizacion.eventosVisuales) {
      if (version !== this.contexto.versionCancelacion || this.destruido) return;
      await this.despachador.reproducir(evento, version);
    }

    if (version === this.contexto.versionCancelacion && !this.destruido) {
      this.alAplicarEscena(actualizacion.escenaFinal);
    }
  }

  async reproducirRecuperacionHabilidad({
    evento,
    impacto,
    recursos,
    version,
  }) {
    const centro = obtenerCentroImpactoHabilidad(this.contexto, evento, impacto);
    if (!centro || !Array.isArray(recursos) || recursos.length === 0) return;

    const efecto = this.contexto.creadorEfectosRecuperacion?.crearRecuperacion({
      centro,
      recursos,
      reducido: this.contexto.efectosReducidos,
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

  async reproducirDanioPeriodico(evento, version) {
    if (!evento.idObjetivo || evento.danio <= 0) {
      return;
    }

    const golpeVisual = {
      vidaObjetivoAntes: evento.vidaAntes,
      vidaObjetivoDespues: evento.vidaDespues,
      vidaObjetivoMaxima: evento.vidaMaxima,
    };
    const nodo = this.contexto.compositor.obtenerNodoEntidad(evento.idObjetivo);
    const centro = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.contexto.compositor.obtenerCentroCasilla(evento.posicionObjetivo);
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

    if (nodo?.contenedor && !this.contexto.efectosReducidos) {
      const alphaInicial = nodo.contenedor.alpha ?? 1;
      promesas.push(
        this.contexto.crearTween({
          targets: nodo.contenedor,
          alpha: 0.48,
          duration: this.contexto.calcularDuracion(90),
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
      const nodoExistente = this.contexto.compositor.obtenerNodoEntidad?.(
        evento.idBotinAnterior,
      );
      if (nodoExistente?.contenedor) {
        if (this.contexto.efectosReducidos) {
          await this.contexto.esperar(this.contexto.calcularDuracion(90), version);
          return;
        }

        const escalaX = nodoExistente.contenedor.scaleX ?? 1;
        const escalaY = nodoExistente.contenedor.scaleY ?? 1;
        await this.contexto.crearTween({
          targets: nodoExistente.contenedor,
          scaleX: escalaX * 1.14,
          scaleY: escalaY * 1.14,
          duration: this.contexto.calcularDuracion(110),
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
      await this.contexto.gestorRecursos?.obtenerInformacionAsync?.(rutaBotin);
      if (version !== this.contexto.versionCancelacion || this.destruido) return;
    }

    const nodo = this.contexto.compositor.establecerEntidadVisualTemporal?.(
      evento.entidadBotin,
    );
    if (!nodo?.contenedor) return;

    if (this.contexto.efectosReducidos) {
      nodo.contenedor.alpha = 1;
      nodo.contenedor.scaleX = 1;
      nodo.contenedor.scaleY = 1;
      await this.contexto.esperar(this.contexto.calcularDuracion(80), version);
      return;
    }

    nodo.contenedor.alpha = 0;
    nodo.contenedor.scaleX = 0.6;
    nodo.contenedor.scaleY = 0.6;
    await this.contexto.crearTween({
      targets: nodo.contenedor,
      alpha: 1,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: this.contexto.calcularDuracion(130),
      ease: "Back.easeOut",
    }, version);

    if (version !== this.contexto.versionCancelacion || this.destruido) return;
    await this.contexto.crearTween({
      targets: nodo.contenedor,
      scaleX: 1,
      scaleY: 1,
      duration: this.contexto.calcularDuracion(70),
      ease: "Sine.easeInOut",
    }, version);
  }

  async reproducirEntidadDerrotada(evento, version) {
    const nodo = this.contexto.compositor.obtenerNodoEntidad(evento.idEntidad);
    if (!nodo) {
      return;
    }

    const objetivos = [nodo.contenedor, nodo.sombra].filter(Boolean);
    if (objetivos.length > 0 && !this.contexto.efectosReducidos) {
      await this.contexto.crearTween({
        targets: objetivos,
        alpha: 0,
        scaleX: 0.82,
        scaleY: 0.82,
        duration: this.contexto.calcularDuracion(160),
        ease: "Quad.easeIn",
      }, version);
    }

    if (version === this.contexto.versionCancelacion && !this.destruido) {
      this.contexto.compositor.retirarEntidadVisual?.(evento.idEntidad);
    }
  }

  async reproducirBloqueo(evento, indiceGolpe, version) {
    if (this.contexto.efectosReducidos) return;
    const centro = this.obtenerCentroObjetivo(evento);
    const escudo = this.contexto.creadorEfectos?.crearEscudoBloqueo({
      centro,
      indiceGolpe,
    });
    if (!escudo) return;

    await this.contexto.crearTween({
      targets: escudo,
      scaleX: CONFIGURACION_EFECTOS_COMBATE_PHASER.bloqueo.escalaFinal,
      scaleY: CONFIGURACION_EFECTOS_COMBATE_PHASER.bloqueo.escalaFinal,
      alpha: 0,
      duration: this.contexto.calcularDuracion(
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
    const objeto = this.contexto.creadorEfectos?.crearTextoFlotante({
      centro,
      texto,
      tipo,
      indiceGolpe,
      desplazamientoY,
    });
    if (!objeto) return;

    const duracion = this.contexto.calcularDuracion(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.duracionMs,
    );
    const yInicial = objeto.y;

    await this.contexto.crearTween({
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
    const actualizable = this.contexto.compositor.actualizarBarraVidaEntidad(
      evento.idObjetivo,
      {
        vidaActual: vidaAntes,
        vidaMaxima,
      },
    );
    if (!actualizable) return;

    await this.contexto.crearTween({
      targets: estado,
      vida: vidaDespues,
      duration: this.contexto.calcularDuracion(
        CONFIGURACION_EFECTOS_COMBATE_PHASER.barraVida.duracionMs,
      ),
      ease: "Linear",
      onUpdate: () => {
        this.contexto.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
          vidaActual: estado.vida,
          vidaMaxima,
        });
      },
    }, version);

    this.contexto.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
      vidaActual: vidaDespues,
      vidaMaxima,
    });
  }

  async reproducirRecursosRecuperados(evento, version) {
    const nodo = this.contexto.compositor.obtenerNodoEntidad(evento.idObjetivo);
    const centro = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.contexto.compositor.obtenerCentroCasilla(evento.posicionObjetivo);
    if (!centro || !Array.isArray(evento.recursos) || evento.recursos.length === 0) {
      return;
    }

    const fases = evento.ritmoVisual?.fases ?? {};
    const duracionPreparacion = this.contexto.calcularDuracion(
      fases.preparacion ?? 60,
    );
    const duracionUso = this.contexto.calcularDuracion(fases.uso ?? 60);
    const duracionResultado = this.contexto.calcularDuracion(
      (fases.recuperacion ?? 120) + (fases.retorno ?? 45),
    );

    await this.contexto.esperar(duracionPreparacion, version);
    if (version !== this.contexto.versionCancelacion || this.destruido) return;

    const configuracionRecurso =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.recursoVisual;
    const sprite = evento.fuente?.recursoVisual
      ? await this.contexto.creadorRecursosVisuales?.crearSpriteTemporal({
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
      await this.contexto.crearTween({
        targets: sprite,
        scaleX: escalaSpriteX * 1.05,
        scaleY: escalaSpriteY * 1.05,
        alpha: 1,
        y: sprite.y - 3,
        duration: duracionUso,
        ease: "Sine.easeOut",
      }, version);
    } else {
      await this.contexto.esperar(duracionUso, version);
    }

    if (version !== this.contexto.versionCancelacion || this.destruido) {
      sprite?.destroy?.();
      return;
    }

    const efecto = this.contexto.creadorEfectosRecuperacion?.crearRecuperacion({
      centro,
      recursos: evento.recursos,
      reducido: this.contexto.efectosReducidos,
    });
    if (efecto) {
      void this.animarRecuperacionFija(efecto, centro, version).catch(() => {});
    }
    void this.reproducirAumentoVidaExplicito(evento, version).catch(() => {});

    if (sprite) {
      await this.contexto.crearTween({
        targets: sprite,
        alpha: 0,
        scaleX: escalaSpriteX * 0.82,
        scaleY: escalaSpriteY * 0.82,
        duration: Math.max(1, duracionResultado),
        ease: "Sine.easeIn",
      }, version);
      sprite.destroy?.();
    } else {
      await this.contexto.esperar(Math.max(1, duracionResultado), version);
    }
  }

  async animarRecuperacionFija(efecto, centro, version) {
    const configuracion =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.recuperacion;

    await this.contexto.crearTween({
      targets: efecto,
      scaleX: configuracion.escalaVisible,
      scaleY: configuracion.escalaVisible,
      alpha: 1,
      duration: configuracion.entradaMs,
      ease: "Sine.easeOut",
    }, version);

    if (version !== this.contexto.versionCancelacion || this.destruido) {
      efecto.destroy?.(true);
      return;
    }

    await this.contexto.esperar(configuracion.permanenciaMs, version);
    await this.contexto.crearTween({
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
    const actualizable = this.contexto.compositor.actualizarBarraVidaEntidad(
      evento.idObjetivo,
      { vidaActual: valorAntes, vidaMaxima: valorMaximo },
    );
    if (!actualizable) return;

    await this.contexto.crearTween({
      targets: estado,
      vida: valorDespues,
      duration: this.contexto.calcularDuracion(
        CONFIGURACION_EFECTOS_COMBATE_PHASER.barraVida.duracionMs,
      ),
      ease: "Linear",
      onUpdate: () => {
        this.contexto.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
          vidaActual: estado.vida,
          vidaMaxima: valorMaximo,
        });
      },
    }, version);
    this.contexto.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
      vidaActual: valorDespues,
      vidaMaxima: valorMaximo,
    });
  }

  async reproducirNivelAumentado(evento, version) {
    const nodo = this.contexto.compositor.obtenerNodoEntidad(evento.idJugador);
    const centro = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.contexto.compositor.obtenerCentroCasilla(evento.posicion);
    if (!centro) return;

    const efecto = this.contexto.creadorEfectosRecuperacion?.crearHolyBless({
      centro,
      nivelActual: evento.nivelActual,
      reducido: this.contexto.efectosReducidos,
    });
    if (!efecto) return;

    const configuracion =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.nivel;
    await this.contexto.crearTween({
      targets: efecto,
      scaleX: configuracion.escalaVisible,
      scaleY: configuracion.escalaVisible,
      alpha: 1,
      duration: configuracion.entradaMs,
      ease: "Sine.easeOut",
    }, version);

    if (version !== this.contexto.versionCancelacion || this.destruido) {
      efecto.destroy?.(true);
      return;
    }

    void this.finalizarHolyBless(efecto, centro, version).catch(() => {});
  }

  async finalizarHolyBless(efecto, centro, version) {
    const configuracion =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.nivel;

    await this.contexto.esperar(configuracion.permanenciaMs, version);
    await this.contexto.crearTween({
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
    const nodo = this.contexto.compositor.obtenerNodoEntidad(evento.idObjetivo);
    if (nodo?.contenedor) {
      return { x: nodo.contenedor.x, y: nodo.contenedor.y };
    }

    return this.contexto.compositor.obtenerCentroCasilla(evento.posicionObjetivo);
  }

}

function formatearDanio(valor) {
  return Number.isInteger(valor) ? `${valor}` : valor.toFixed(1);
}

