import {
  reproducirAtaqueResuelto as reproducirAtaqueResueltoDelegado,
  reproducirConsecuenciaAtaqueOrigenOculto as reproducirConsecuenciaAtaqueOrigenOcultoDelegado,
  esAtaqueCuerpoACuerpo as esAtaqueCuerpoACuerpoDelegado,
  esAtaqueArco as esAtaqueArcoDelegado,
  esAtaqueVarita as esAtaqueVaritaDelegado,
  reproducirAtaqueProvisional as reproducirAtaqueProvisionalDelegado,
  reproducirAtaqueArco as reproducirAtaqueArcoDelegado,
  reproducirAtaqueVarita as reproducirAtaqueVaritaDelegado,
  obtenerDisparosVarita as obtenerDisparosVaritaDelegado,
  reproducirAtaqueCuerpoACuerpo as reproducirAtaqueCuerpoACuerpoDelegado,
  reproducirGolpeFisico as reproducirGolpeFisicoDelegado,
  reproducirEstocada as reproducirEstocadaDelegado,
  obtenerPerfilGolpe as obtenerPerfilGolpeDelegado,
  obtenerFuenteGolpe as obtenerFuenteGolpeDelegado,
  obtenerAvancePixeles as obtenerAvancePixelesDelegado,
  moverNodoAtaque as moverNodoAtaqueDelegado,
  animarEfectoAtaque as animarEfectoAtaqueDelegado,
  obtenerGolpesVisuales as obtenerGolpesVisualesDelegado,
  reproducirGolpeProvisional as reproducirGolpeProvisionalDelegado,
  reproducirResultadoGolpe as reproducirResultadoGolpeDelegado,
  resolverDecorativos as resolverDecorativosDelegado,
  reproducirFalloObjetivo as reproducirFalloObjetivoDelegado,
  reproducirImpactoObjetivo as reproducirImpactoObjetivoDelegado,
  debeUsarMarcaImpactoGenerica as debeUsarMarcaImpactoGenericaDelegado,
} from "./reproductores/ReproductorAtaquesPhaser.js";
import {
  reproducirHabilidadResuelta as reproducirHabilidadResueltaDelegado,
  reproducirHabilidadLinea as reproducirHabilidadLineaDelegado,
  reproducirHabilidadZona as reproducirHabilidadZonaDelegado,
  reproducirHabilidadCadena as reproducirHabilidadCadenaDelegado,
  reproducirHabilidadArea as reproducirHabilidadAreaDelegado,
  obtenerCentroAreaHabilidad as obtenerCentroAreaHabilidadDelegado,
  agruparAreaPorAnillos as agruparAreaPorAnillosDelegado,
  obtenerCentroActorHabilidad as obtenerCentroActorHabilidadDelegado,
  obtenerCentroImpactoHabilidad as obtenerCentroImpactoHabilidadDelegado,
  reproducirResultadoImpactoHabilidad as reproducirResultadoImpactoHabilidadDelegado,
} from "./reproductores/ReproductorHabilidadesPhaser.js";
import {
  reproducirZonaTemporalCreada as reproducirZonaTemporalCreadaDelegado,
  reproducirZonaTemporalRenovada as reproducirZonaTemporalRenovadaDelegado,
  reproducirZonaTemporalVencida as reproducirZonaTemporalVencidaDelegado,
  reproducirZonaTemporalPulso as reproducirZonaTemporalPulsoDelegado,
  reproducirActorEntroZonaTemporal as reproducirActorEntroZonaTemporalDelegado,
  reproducirZonaTemporalActivada as reproducirZonaTemporalActivadaDelegado,
} from "./reproductores/ReproductorZonasTemporalesPhaser.js";
import {
  reproducirEfectoTemporalAplicado as reproducirEfectoTemporalAplicadoDelegado,
  reproducirEfectoTemporalActualizado as reproducirEfectoTemporalActualizadoDelegado,
  reproducirEfectoTemporalTick as reproducirEfectoTemporalTickDelegado,
  animarPulsoEstado as animarPulsoEstadoDelegado,
  animarEntradaEstado as animarEntradaEstadoDelegado,
  reproducirFeedbackTextoEstado as reproducirFeedbackTextoEstadoDelegado,
  reproducirEfectoTemporalNoAplicado as reproducirEfectoTemporalNoAplicadoDelegado,
  reproducirEfectoTemporalRetirado as reproducirEfectoTemporalRetiradoDelegado,
  obtenerCentroEventoEfecto as obtenerCentroEventoEfectoDelegado,
} from "./reproductores/ReproductorEstadosTemporalesPhaser.js";
import {
  reproducirCambioHostilidad as reproducirCambioHostilidadDelegado,
  reproducirMovimiento as reproducirMovimientoDelegado,
  reproducirSalidaCampoVisible as reproducirSalidaCampoVisibleDelegado,
  reproducirEntradaCampoVisible as reproducirEntradaCampoVisibleDelegado,
  obtenerDuracionBaseMovimiento as obtenerDuracionBaseMovimientoDelegado,
  obtenerRachaMovimientosJugadorPendientes as obtenerRachaMovimientosJugadorPendientesDelegado,
} from "./reproductores/ReproductorMovimientoPhaser.js";
import {
  TIPOS_EVENTO_VISUAL,
} from "../PlanificadorEventosVisuales.js";
import {
  calcularDuracionAnimacionPhaser,
  CONFIGURACION_ANIMACIONES_PHASER,
  normalizarVelocidadAnimacionPhaser,
} from "./ConfiguracionAnimacionesPhaser.js";
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
    return await reproducirZonaTemporalCreadaDelegado(this, evento, version);
  }

  async reproducirZonaTemporalRenovada(evento, version) {
    return await reproducirZonaTemporalRenovadaDelegado(this, evento, version);
  }

  async reproducirZonaTemporalVencida(evento, version) {
    return await reproducirZonaTemporalVencidaDelegado(this, evento, version);
  }

  async reproducirZonaTemporalPulso(evento, version) {
    return await reproducirZonaTemporalPulsoDelegado(this, evento, version);
  }

  async reproducirActorEntroZonaTemporal(evento, version) {
    return await reproducirActorEntroZonaTemporalDelegado(this, evento, version);
  }

  async reproducirZonaTemporalActivada(evento, version) {
    return await reproducirZonaTemporalActivadaDelegado(this, evento, version);
  }

  async reproducirEfectoTemporalAplicado(evento, version) {
    return await reproducirEfectoTemporalAplicadoDelegado(this, evento, version);
  }

  async reproducirEfectoTemporalActualizado(evento, version) {
    return await reproducirEfectoTemporalActualizadoDelegado(this, evento, version);
  }

  async reproducirEfectoTemporalTick(evento, version) {
    return await reproducirEfectoTemporalTickDelegado(this, evento, version);
  }

  async animarPulsoEstado(pulso, version) {
    return await animarPulsoEstadoDelegado(this, pulso, version);
  }

  async animarEntradaEstado(entrada, version) {
    return await animarEntradaEstadoDelegado(this, entrada, version);
  }

  async reproducirFeedbackTextoEstado(evento, version) {
    return await reproducirFeedbackTextoEstadoDelegado(this, evento, version);
  }

  async reproducirEfectoTemporalNoAplicado(evento, version) {
    return await reproducirEfectoTemporalNoAplicadoDelegado(this, evento, version);
  }

  async reproducirEfectoTemporalRetirado(evento, version) {
    return await reproducirEfectoTemporalRetiradoDelegado(this, evento, version);
  }

  obtenerCentroEventoEfecto(evento) {
    return obtenerCentroEventoEfectoDelegado(this, evento);
  }

  reproducirCambioHostilidad(evento) {
    return reproducirCambioHostilidadDelegado(this, evento);
  }

  async reproducirMovimiento(evento, version) {
    return await reproducirMovimientoDelegado(this, evento, version);
  }

  async reproducirSalidaCampoVisible(evento, version) {
    return await reproducirSalidaCampoVisibleDelegado(this, evento, version);
  }

  async reproducirEntradaCampoVisible(evento, version) {
    return await reproducirEntradaCampoVisibleDelegado(this, evento, version);
  }

  obtenerDuracionBaseMovimiento({
    tipoEntidad,
    movimientosJugadorPendientes = 0,
  } = {}) {
    return obtenerDuracionBaseMovimientoDelegado(this, {
      tipoEntidad,
      movimientosJugadorPendientes,
    });
  }

  obtenerRachaMovimientosJugadorPendientes() {
    return obtenerRachaMovimientosJugadorPendientesDelegado(this);
  }

  async reproducirHabilidadResuelta(evento, version) {
    return await reproducirHabilidadResueltaDelegado(this, evento, version);
  }

  async reproducirHabilidadLinea(evento, version) {
    return await reproducirHabilidadLineaDelegado(this, evento, version);
  }

  async reproducirHabilidadZona(evento, version) {
    return await reproducirHabilidadZonaDelegado(this, evento, version);
  }

  async reproducirHabilidadCadena(evento, version) {
    return await reproducirHabilidadCadenaDelegado(this, evento, version);
  }

  async reproducirHabilidadArea(evento, version) {
    return await reproducirHabilidadAreaDelegado(this, evento, version);
  }

  obtenerCentroAreaHabilidad(evento, contratoVisual) {
    return obtenerCentroAreaHabilidadDelegado(this, evento, contratoVisual);
  }

  agruparAreaPorAnillos(evento, contratoVisual) {
    return agruparAreaPorAnillosDelegado(this, evento, contratoVisual);
  }

  obtenerCentroActorHabilidad(evento) {
    return obtenerCentroActorHabilidadDelegado(this, evento);
  }

  obtenerCentroImpactoHabilidad(evento, impacto) {
    return obtenerCentroImpactoHabilidadDelegado(this, evento, impacto);
  }

  async reproducirResultadoImpactoHabilidad(evento, impacto, version) {
    return await reproducirResultadoImpactoHabilidadDelegado(this, evento, impacto, version);
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
    return await reproducirAtaqueResueltoDelegado(this, evento, version);
  }

  async reproducirConsecuenciaAtaqueOrigenOculto(evento, golpes, version) {
    return await reproducirConsecuenciaAtaqueOrigenOcultoDelegado(this, evento, golpes, version);
  }

  esAtaqueCuerpoACuerpo(evento) {
    return esAtaqueCuerpoACuerpoDelegado(this, evento);
  }

  esAtaqueArco(evento) {
    return esAtaqueArcoDelegado(this, evento);
  }

  esAtaqueVarita(evento) {
    return esAtaqueVaritaDelegado(this, evento);
  }

  async reproducirAtaqueProvisional(evento, golpes, version) {
    return await reproducirAtaqueProvisionalDelegado(this, evento, golpes, version);
  }

  async reproducirAtaqueArco(evento, golpes, version) {
    return await reproducirAtaqueArcoDelegado(this, evento, golpes, version);
  }

  async reproducirAtaqueVarita(evento, golpes, version) {
    return await reproducirAtaqueVaritaDelegado(this, evento, golpes, version);
  }

  obtenerDisparosVarita(evento, golpes) {
    return obtenerDisparosVaritaDelegado(this, evento, golpes);
  }

  async reproducirAtaqueCuerpoACuerpo(evento, golpes, version) {
    return await reproducirAtaqueCuerpoACuerpoDelegado(this, evento, golpes, version);
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
    return await reproducirGolpeFisicoDelegado(this, {
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
    });
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
    return await reproducirEstocadaDelegado(this, {
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
    });
  }

  obtenerPerfilGolpe(evento, golpe, indiceGolpe) {
    return obtenerPerfilGolpeDelegado(this, evento, golpe, indiceGolpe);
  }

  obtenerFuenteGolpe(evento, golpe, indiceGolpe) {
    return obtenerFuenteGolpeDelegado(this, evento, golpe, indiceGolpe);
  }

  obtenerAvancePixeles(perfil) {
    return obtenerAvancePixelesDelegado(this, perfil);
  }

  moverNodoAtaque({ nodo, destino, duracion, ease, version }) {
    return moverNodoAtaqueDelegado(this, {
      nodo,
      destino,
      duracion,
      ease,
      version,
    });
  }

  async animarEfectoAtaque(
    efecto,
    duracion,
    version,
    { critico = false } = {},
  ) {
    return await animarEfectoAtaqueDelegado(this, efecto, duracion, version, {
      critico,
    });
  }

  obtenerGolpesVisuales(evento) {
    return obtenerGolpesVisualesDelegado(this, evento);
  }

  async reproducirGolpeProvisional(evento, golpe, indiceGolpe, version) {
    return await reproducirGolpeProvisionalDelegado(this, evento, golpe, indiceGolpe, version);
  }

  async reproducirResultadoGolpe(
    evento,
    golpe,
    indiceGolpe,
    version,
    { esperarDecorativos = true } = {},
  ) {
    return await reproducirResultadoGolpeDelegado(
      this,
      evento,
      golpe,
      indiceGolpe,
      version,
      { esperarDecorativos },
    );
  }

  resolverDecorativos(promesas, esperar) {
    return resolverDecorativosDelegado(this, promesas, esperar);
  }

  async reproducirFalloObjetivo(evento, version) {
    return await reproducirFalloObjetivoDelegado(this, evento, version);
  }

  async reproducirImpactoObjetivo(evento, golpe, version) {
    return await reproducirImpactoObjetivoDelegado(this, evento, golpe, version);
  }

  debeUsarMarcaImpactoGenerica(evento) {
    return debeUsarMarcaImpactoGenericaDelegado(this, evento);
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

function formatearDanio(valor) {
  return Number.isInteger(valor) ? `${valor}` : valor.toFixed(1);
}

