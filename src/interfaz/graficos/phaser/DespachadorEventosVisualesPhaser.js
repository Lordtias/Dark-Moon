import { TIPOS_EVENTO_VISUAL } from "../TiposEventosVisuales.js";
import {
  reproducirAtaqueResuelto,
} from "./reproductores/ReproductorAtaquesPhaser.js";
import {
  reproducirHabilidadResuelta,
} from "./reproductores/ReproductorHabilidadesPhaser.js";
import {
  reproducirActorEntroZonaTemporal,
  reproducirZonaTemporalActivada,
  reproducirZonaTemporalCreada,
  reproducirZonaTemporalPulso,
  reproducirZonaTemporalRenovada,
  reproducirZonaTemporalVencida,
} from "./reproductores/ReproductorZonasTemporalesPhaser.js";
import {
  reproducirEfectoTemporalAplicado,
  reproducirEfectoTemporalActualizado,
  reproducirEfectoTemporalNoAplicado,
  reproducirEfectoTemporalRetirado,
  reproducirEfectoTemporalTick,
} from "./reproductores/ReproductorEstadosTemporalesPhaser.js";
import {
  reproducirCambioHostilidad,
  reproducirMovimiento,
} from "./reproductores/ReproductorMovimientoPhaser.js";

// Traduce exclusivamente tipo de evento -> reproductor funcional. No administra
// cola, tiempos del juego ni estado de dominio.
export class DespachadorEventosVisualesPhaser {
  constructor({
    contexto,
    reproducirDanioPeriodico,
    reproducirEntidadDerrotada,
    reproducirBotinAparecido,
    reproducirRecursosRecuperados,
    reproducirNivelAumentado,
  } = {}) {
    if (!contexto) {
      throw new Error("El despachador visual necesita un contexto de reproducción.");
    }
    this.contexto = contexto;
    this.reproductoresLocales = Object.freeze({
      reproducirDanioPeriodico,
      reproducirEntidadDerrotada,
      reproducirBotinAparecido,
      reproducirRecursosRecuperados,
      reproducirNivelAumentado,
    });
  }

  async reproducir(evento, version) {
    const contexto = this.contexto;
    if (!evento || !contexto || version !== contexto.versionCancelacion || contexto.destruido) {
      return;
    }

    switch (evento.tipo) {
      case TIPOS_EVENTO_VISUAL.MOVIMIENTO_ENTIDAD:
        return await reproducirMovimiento(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.ATAQUE_RESUELTO:
        return await reproducirAtaqueResuelto(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.HABILIDAD_RESUELTA:
        return await reproducirHabilidadResuelta(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.CAMBIO_HOSTILIDAD:
        return reproducirCambioHostilidad(contexto, evento);
      case TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_APLICADO:
        return await reproducirEfectoTemporalAplicado(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_ACTUALIZADO:
        return await reproducirEfectoTemporalActualizado(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_NO_APLICADO:
        return await reproducirEfectoTemporalNoAplicado(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_TICK:
        return await reproducirEfectoTemporalTick(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_RETIRADO:
        return await reproducirEfectoTemporalRetirado(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.DANIO_PERIODICO:
        return await this.reproducirLocal("reproducirDanioPeriodico", evento, version);
      case TIPOS_EVENTO_VISUAL.ENTIDAD_DERROTADA:
        return await this.reproducirLocal("reproducirEntidadDerrotada", evento, version);
      case TIPOS_EVENTO_VISUAL.BOTIN_APARECIDO:
        return await this.reproducirLocal("reproducirBotinAparecido", evento, version);
      case TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_CREADA:
        return await reproducirZonaTemporalCreada(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_RENOVADA:
        return await reproducirZonaTemporalRenovada(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_VENCIDA:
        return await reproducirZonaTemporalVencida(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_PULSO:
        return await reproducirZonaTemporalPulso(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.ACTOR_ENTRO_ZONA_TEMPORAL:
        return await reproducirActorEntroZonaTemporal(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_ACTIVADA:
        return await reproducirZonaTemporalActivada(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.RECURSOS_RECUPERADOS:
        return await this.reproducirLocal("reproducirRecursosRecuperados", evento, version);
      case TIPOS_EVENTO_VISUAL.NIVEL_AUMENTADO:
        return await this.reproducirLocal("reproducirNivelAumentado", evento, version);
      default:
        return undefined;
    }
  }

  async reproducirLocal(nombre, evento, version) {
    const reproducir = this.reproductoresLocales?.[nombre];
    if (typeof reproducir !== "function") return;
    return await reproducir(evento, version);
  }

  destruir() {
    this.contexto = null;
    this.reproductoresLocales = null;
  }
}
