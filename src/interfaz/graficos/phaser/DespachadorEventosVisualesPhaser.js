import { TIPOS_EVENTO_VISUAL } from "../TiposEventosVisuales.js";
import { reproducirAtaqueResuelto } from "./reproductores/ReproductorAtaquesPhaser.js";
import { reproducirHabilidadResuelta } from "./reproductores/ReproductorHabilidadesPhaser.js";
import {
  reproducirBotinAparecido,
  reproducirDanioPeriodico,
  reproducirEntidadDerrotada,
} from "./reproductores/ReproductorResultadosVisualesPhaser.js";
import {
  reproducirNivelAumentado,
  reproducirRecursosRecuperados,
} from "./reproductores/ReproductorRecuperacionesPhaser.js";
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
  constructor({ contexto } = {}) {
    if (!contexto) {
      throw new Error("El despachador visual necesita un contexto de reproducción.");
    }
    this.contexto = contexto;
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
        return await reproducirDanioPeriodico(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.ENTIDAD_DERROTADA:
        return await reproducirEntidadDerrotada(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.BOTIN_APARECIDO:
        return await reproducirBotinAparecido(contexto, evento, version);
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
        return await reproducirRecursosRecuperados(contexto, evento, version);
      case TIPOS_EVENTO_VISUAL.NIVEL_AUMENTADO:
        return await reproducirNivelAumentado(contexto, evento, version);
      default:
        return undefined;
    }
  }

  destruir() {
    this.contexto = null;
  }
}
