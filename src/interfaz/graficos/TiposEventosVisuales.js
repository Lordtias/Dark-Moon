// Contrato neutral entre planificación, filtrado y reproducción visual.
// Describe hechos de presentación ya resueltos; no contiene reglas de juego.
export const TIPOS_EVENTO_VISUAL = Object.freeze({
  MOVIMIENTO_ENTIDAD: "movimiento_entidad",
  ATAQUE_RESUELTO: "ataque_resuelto",
  HABILIDAD_RESUELTA: "habilidad_resuelta",
  CAMBIO_HOSTILIDAD: "cambio_hostilidad",
  DANIO_PERIODICO: "danio_periodico",
  ENTIDAD_DERROTADA: "entidad_derrotada",
  RECURSOS_RECUPERADOS: "recursos_recuperados",
  NIVEL_AUMENTADO: "nivel_aumentado",
  BOTIN_APARECIDO: "botin_aparecido",
  EFECTO_TEMPORAL_APLICADO: "efecto_temporal_aplicado",
  EFECTO_TEMPORAL_ACTUALIZADO: "efecto_temporal_actualizado",
  EFECTO_TEMPORAL_NO_APLICADO: "efecto_temporal_no_aplicado",
  EFECTO_TEMPORAL_TICK: "efecto_temporal_tick",
  EFECTO_TEMPORAL_RETIRADO: "efecto_temporal_retirado",
  ZONA_TEMPORAL_CREADA: "zona_temporal_creada",
  ZONA_TEMPORAL_RENOVADA: "zona_temporal_renovada",
  ZONA_TEMPORAL_VENCIDA: "zona_temporal_vencida",
  ZONA_TEMPORAL_PULSO: "zona_temporal_pulso",
  ACTOR_ENTRO_ZONA_TEMPORAL: "actor_entro_zona_temporal",
  ZONA_TEMPORAL_ACTIVADA: "zona_temporal_activada",
});
