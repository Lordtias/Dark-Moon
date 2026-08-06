import {
  CONFIGURACION_EFECTOS_TEMPORALES,
} from "../../config/ConfiguracionEfectosTemporales.js";
import {
  resolverPaqueteDanio,
} from "../combate/ComponentesDanio.js";
import {
  AgendaEventosTemporales,
} from "../tiempo/AgendaEventosTemporales.js";
import {
  FACTORES_TEMPORALES_MODIFICABLES,
  MODOS_RESISTENCIA_EFECTO,
  POLITICAS_ACUMULACION_EFECTO,
  POLITICAS_POTENCIA_EFECTO,
  TIPOS_EFECTO_TEMPORAL,
  normalizarDefinicionEfectoTemporal,
} from "./ContratosEfectosTemporales.js";

const TIPO_EVENTO_AGENDA = Object.freeze({
  TICK: "tick_efecto",
  VENCIMIENTO: "vencimiento_efecto",
});

// El estado se asocia al objetivo y no al mapa. Esto permite que la misma
// instancia del jugador conserve efectos durante una transición válida.
const ESTADOS_POR_OBJETIVO = new WeakMap();

let siguienteIdInstancia = 1;

function obtenerEstadoObjetivo(objetivo, crear = true) {
  let estado = ESTADOS_POR_OBJETIVO.get(objetivo);

  if (!estado && crear) {
    estado = {
      efectos: new Map(),
      factoresBase: null,
    };
    ESTADOS_POR_OBJETIVO.set(objetivo, estado);
  }

  return estado ?? null;
}

function estaObjetivoVivo(objetivo) {
  if (!objetivo || typeof objetivo !== "object") {
    return false;
  }

  if (typeof objetivo.estaVivo === "boolean") {
    return objetivo.estaVivo;
  }

  if (typeof objetivo.estaDestruido === "boolean") {
    return !objetivo.estaDestruido;
  }

  return true;
}

function copiarValor(valor) {
  if (valor === null || typeof valor !== "object") {
    return valor;
  }
  if (Array.isArray(valor)) {
    return valor.map(copiarValor);
  }
  return Object.fromEntries(
    Object.entries(valor).map(([clave, actual]) => [clave, copiarValor(actual)]),
  );
}

function crearClaveEfecto(definicion) {
  return definicion.grupoAcumulacion;
}

function obtenerEscalaAcumulacion(efecto) {
  if (efecto.escalaPorIntensidad) return efecto.intensidad;
  if (efecto.escalaPorCantidad) return efecto.cantidad;
  return 1;
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function obtenerEstadisticasObjetivo(objetivo) {
  return objetivo?.estadisticasDerivadas ?? objetivo?.estadisticasBase ?? {};
}

function obtenerResistenciaEfecto(objetivo, resistenciaId) {
  if (!resistenciaId) return 0;
  const estadisticas = obtenerEstadisticasObjetivo(objetivo);
  const valor = estadisticas.resistenciasEfectos?.[resistenciaId] ?? 0;
  return limitar(Number.isFinite(valor) ? valor : 0, 0, 75);
}

function obtenerInmunidadesEfectos(objetivo) {
  const estadisticas = obtenerEstadisticasObjetivo(objetivo);
  const inmunidades = estadisticas.inmunidadesEfectos ?? [];
  return new Set(
    Array.isArray(inmunidades)
      ? inmunidades.map((id) => String(id).trim().toLowerCase())
      : [],
  );
}

function esInmuneAlEfecto(objetivo, inmunidadId) {
  return Boolean(inmunidadId) &&
    obtenerInmunidadesEfectos(objetivo).has(inmunidadId);
}

function calcularProbabilidadFinal(definicion, resistencia) {
  if (
    definicion.modoResistencia ===
    MODOS_RESISTENCIA_EFECTO.REDUCIR_PROBABILIDAD_APLICACION
  ) {
    return limitar(
      definicion.probabilidadBase * (1 - resistencia / 100),
      0,
      100,
    );
  }
  return limitar(definicion.probabilidadBase, 0, 100);
}

function obtenerTiradaAplicacion(definicion, proveedor) {
  if (definicion.tiradaAplicacion !== null) {
    return definicion.tiradaAplicacion;
  }
  if (typeof proveedor === "function") {
    return proveedor();
  }
  return Math.floor(Math.random() * 100) + 1;
}

function obtenerMagnitudPotencia({ tipo, valor, componentesDanio }) {
  if (tipo === TIPOS_EFECTO_TEMPORAL.DANIO_PERIODICO) {
    if (Array.isArray(componentesDanio)) {
      return componentesDanio.reduce(
        (total, componente) => total + (componente.danioBruto ?? 0),
        0,
      );
    }
    return Number.isFinite(valor) ? valor : 0;
  }
  if (tipo === TIPOS_EFECTO_TEMPORAL.MODIFICADOR_FACTOR) {
    return Object.values(valor ?? {}).reduce(
      (total, multiplicador) => total + Math.abs(multiplicador - 1),
      0,
    );
  }
  return Number.isFinite(valor) ? valor : 0;
}

function debeReemplazarPotencia(efecto, definicion) {
  if (
    definicion.politicaPotencia !==
    POLITICAS_POTENCIA_EFECTO.CONSERVAR_MAYOR
  ) {
    return true;
  }
  return obtenerMagnitudPotencia(definicion) > obtenerMagnitudPotencia(efecto);
}

function limitarMultiplicador(valor) {
  const limites = CONFIGURACION_EFECTOS_TEMPORALES.limites;
  return Math.max(
    limites.multiplicadorFactorMinimo,
    Math.min(limites.multiplicadorFactorMaximo, valor),
  );
}

function obtenerNombreObjetivo(objetivo) {
  return objetivo?.nombre ?? "El objetivo";
}

function crearResumenEfecto(efecto) {
  return {
    id: efecto.id,
    idDefinicion: efecto.idDefinicion,
    efectoId: efecto.efectoId,
    nombreEfecto: efecto.nombreEfecto,
    perfilAplicacion: efecto.perfilAplicacion,
    grupoAcumulacion: efecto.grupoAcumulacion,
    fuente: { ...efecto.fuente },
    objetivo: efecto.objetivo,
    tipo: efecto.tipo,
    valor: copiarValor(efecto.valor),
    duracion: efecto.duracion,
    intervalo: efecto.intervalo,
    politicaAcumulacion: efecto.politicaAcumulacion,
    politicaPotencia: efecto.politicaPotencia,
    maximo: efecto.maximo,
    intensidad: efecto.intensidad,
    cantidad: efecto.cantidad,
    aplicadoEn: efecto.aplicadoEn,
    venceEn: efecto.venceEn,
    proximoTick: efecto.proximoTick,
    etiquetas: [...efecto.etiquetas],
    beneficioso: efecto.beneficioso,
    resistenciaId: efecto.resistenciaId,
    modoResistencia: efecto.modoResistencia,
    inmunidadId: efecto.inmunidadId,
    eliminarAlAdquirirInmunidad: efecto.eliminarAlAdquirirInmunidad,
    eliminaEfectosAlAplicarse: [...(efecto.eliminaEfectosAlAplicarse ?? [])],
    suspendido: efecto.suspendido,
  };
}

export class SistemaEfectosTemporales {
  constructor({ obtenerTiempoActual } = {}) {
    if (typeof obtenerTiempoActual !== "function") {
      throw new Error(
        "SistemaEfectosTemporales necesita consultar el tiempo actual.",
      );
    }

    this.obtenerTiempoActual = obtenerTiempoActual;
    this.agenda = new AgendaEventosTemporales();
    this.objetivosAdministrados = new Set();
    this.destruido = false;
  }

  validarDisponible() {
    if (this.destruido) {
      throw new Error("El sistema de efectos temporales ya fue destruido.");
    }
  }

  obtenerSiguienteInstante() {
    return this.agenda.obtenerSiguienteInstante();
  }

  obtenerCantidadEventosPendientes() {
    return this.agenda.obtenerCantidad();
  }

  obtenerEfectosObjetivo(objetivo) {
    this.retirarEfectosAhoraInmunes(objetivo);
    const estado = obtenerEstadoObjetivo(objetivo, false);
    if (!estado) {
      return [];
    }

    return [...estado.efectos.values()].map(crearResumenEfecto);
  }

  tieneEfectoTipo(objetivo, tipo) {
    return this.obtenerEfectosObjetivo(objetivo).some(
      (efecto) => efecto.tipo === tipo,
    );
  }

  obtenerBloqueosTotales(objetivo) {
    return this.obtenerEfectosObjetivo(objetivo).filter(
      (efecto) => efecto.tipo === TIPOS_EFECTO_TEMPORAL.BLOQUEO_TOTAL,
    );
  }

  obtenerBloqueoTotalActivo(objetivo) {
    return this.obtenerBloqueosTotales(objetivo)
      .sort((a, b) => (b.venceEn ?? 0) - (a.venceEn ?? 0))[0] ?? null;
  }

  estaBajoBloqueoTotal(objetivo) {
    return this.obtenerBloqueoTotalActivo(objetivo) !== null;
  }

  obtenerFinBloqueoTotal(objetivo) {
    const vencimientos = this.obtenerBloqueosTotales(objetivo)
      .map((efecto) => efecto.venceEn)
      .filter(Number.isFinite);

    return vencimientos.length > 0 ? Math.max(...vencimientos) : null;
  }

  obtenerBloqueoHabilidadesActivo(objetivo) {
    return this.obtenerEfectosObjetivo(objetivo).find(
      (efecto) =>
        efecto.tipo === TIPOS_EFECTO_TEMPORAL.BLOQUEO_HABILIDADES,
    ) ?? null;
  }

  tieneBloqueoHabilidades(objetivo) {
    return this.obtenerBloqueoHabilidadesActivo(objetivo) !== null;
  }

  aplicar(definicionRecibida, { obtenerTiradaAplicacion: proveedorTirada = null } = {}) {
    this.validarDisponible();

    const definicion = normalizarDefinicionEfectoTemporal(
      definicionRecibida,
    );
    const tiempoActual = this.obtenerTiempoActual();

    if (!estaObjetivoVivo(definicion.objetivo)) {
      return {
        exito: false,
        aplicado: false,
        estadoAplicacion: "rechazado_por_politica",
        motivo: "objetivo_derrotado",
        mensaje: `${obtenerNombreObjetivo(definicion.objetivo)} está derrotado.`,
        eventos: [
          {
            tipo: "efecto_rechazado",
            motivo: "objetivo_derrotado",
            definicion,
          },
        ],
      };
    }

    this.retirarEfectosAhoraInmunes(definicion.objetivo);

    if (esInmuneAlEfecto(definicion.objetivo, definicion.inmunidadId)) {
      return {
        exito: false,
        aplicado: false,
        estadoAplicacion: "inmune",
        motivo: "inmunidad",
        probabilidadBase: definicion.probabilidadBase,
        resistencia: null,
        probabilidadFinal: 0,
        tiradaAplicacion: null,
        mensaje: `${obtenerNombreObjetivo(definicion.objetivo)} es inmune a ${definicion.nombreEfecto}.`,
        eventos: [
          {
            tipo: "efecto_inmune",
            motivo: "inmunidad",
            definicion,
          },
        ],
      };
    }

    const resistencia = obtenerResistenciaEfecto(
      definicion.objetivo,
      definicion.resistenciaId,
    );
    const probabilidadFinal = calcularProbabilidadFinal(
      definicion,
      resistencia,
    );
    const tiradaAplicacion = obtenerTiradaAplicacion(
      definicion,
      proveedorTirada,
    );

    if (tiradaAplicacion > probabilidadFinal) {
      return {
        exito: false,
        aplicado: false,
        estadoAplicacion: "resistido",
        motivo: "resistencia",
        probabilidadBase: definicion.probabilidadBase,
        resistencia,
        probabilidadFinal,
        tiradaAplicacion,
        mensaje: `${obtenerNombreObjetivo(definicion.objetivo)} resistió ${definicion.nombreEfecto}.`,
        eventos: [
          {
            tipo: "efecto_resistido",
            motivo: "resistencia",
            definicion,
            resistencia,
            probabilidadFinal,
            tiradaAplicacion,
          },
        ],
      };
    }

    const estado = obtenerEstadoObjetivo(definicion.objetivo);
    const clave = crearClaveEfecto(definicion);
    const existente = estado.efectos.get(clave);

    if (existente) {
      const resultadoReaplicacion = this.reaplicarEfecto(
        existente,
        definicion,
        tiempoActual,
        {
          resistencia,
          probabilidadFinal,
          tiradaAplicacion,
        },
      );
      if (!resultadoReaplicacion.exito) {
        return resultadoReaplicacion;
      }
      const eventosContraefecto = this.retirarContraefectos(
        definicion.objetivo,
        definicion,
        { excluirClave: existente.clave },
      );
      resultadoReaplicacion.eventos = [
        ...eventosContraefecto,
        ...(resultadoReaplicacion.eventos ?? []),
      ];
      resultadoReaplicacion.contraefectosRetirados = eventosContraefecto.map(
        (evento) => evento.catalogoEfectoId,
      );
      return resultadoReaplicacion;
    }

    const eventosContraefecto = this.retirarContraefectos(
      definicion.objetivo,
      definicion,
    );
    this.objetivosAdministrados.add(definicion.objetivo);

    const efecto = {
      id: `efecto-${siguienteIdInstancia++}`,
      clave,
      idDefinicion: definicion.idDefinicion,
      efectoId: definicion.efectoId,
      nombreEfecto: definicion.nombreEfecto,
      perfilAplicacion: definicion.perfilAplicacion,
      grupoAcumulacion: definicion.grupoAcumulacion,
      fuente: { ...definicion.fuente },
      objetivo: definicion.objetivo,
      tipo: definicion.tipo,
      valor: copiarValor(definicion.valor),
      tipoDanio: definicion.tipoDanio,
      componentesDanio: definicion.componentesDanio
        ? definicion.componentesDanio.map((componente) => ({ ...componente }))
        : null,
      duracion: definicion.duracion,
      intervalo: definicion.intervalo,
      politicaAcumulacion: definicion.politicaAcumulacion,
      politicaPotencia: definicion.politicaPotencia,
      maximo: definicion.maximo,
      incremento: definicion.incremento,
      etiquetas: [...definicion.etiquetas],
      beneficioso: definicion.beneficioso,
      resistenciaId: definicion.resistenciaId,
      modoResistencia: definicion.modoResistencia,
      inmunidadId: definicion.inmunidadId,
      eliminarAlAdquirirInmunidad: definicion.eliminarAlAdquirirInmunidad,
      eliminaEfectosAlAplicarse: [...definicion.eliminaEfectosAlAplicarse],
      intensidad: definicion.intensidadInicial,
      cantidad: 1,
      escalaPorIntensidad:
        definicion.politicaAcumulacion ===
        POLITICAS_ACUMULACION_EFECTO.ACUMULAR_INTENSIDAD,
      escalaPorCantidad:
        definicion.politicaAcumulacion ===
        POLITICAS_ACUMULACION_EFECTO.ACUMULAR_CANTIDAD,
      aplicadoEn: tiempoActual,
      venceEn: tiempoActual + definicion.duracion,
      proximoTick:
        definicion.intervalo === null
          ? null
          : tiempoActual + definicion.intervalo,
      suspendido: false,
      duracionRestante: null,
      tiempoHastaProximoTick: null,
    };

    estado.efectos.set(clave, efecto);
    this.programarEfecto(efecto);
    this.recalcularFactoresObjetivo(efecto.objetivo);

    const evento = this.crearEventoDominio("efecto_aplicado", efecto, {
      resistencia,
      probabilidadFinal,
      tiradaAplicacion,
    });

    return {
      exito: true,
      aplicado: true,
      estadoAplicacion: "aplicado",
      motivo: null,
      probabilidadBase: definicion.probabilidadBase,
      resistencia,
      probabilidadFinal,
      tiradaAplicacion,
      efecto: crearResumenEfecto(efecto),
      mensaje: `${obtenerNombreObjetivo(efecto.objetivo)} recibió ${efecto.nombreEfecto}.`,
      contraefectosRetirados: eventosContraefecto.map(
        (eventoRetiro) => eventoRetiro.catalogoEfectoId,
      ),
      eventos: [...eventosContraefecto, evento],
    };
  }

  reaplicarEfecto(efecto, definicion, tiempoActual, resolucion) {
    if (
      efecto.tipo !== definicion.tipo ||
      efecto.efectoId !== definicion.efectoId ||
      efecto.intervalo !== definicion.intervalo
    ) {
      return {
        exito: false,
        aplicado: false,
        estadoAplicacion: "rechazado_por_politica",
        motivo: "grupo_incompatible",
        ...resolucion,
        efecto: crearResumenEfecto(efecto),
        mensaje: "El grupo de acumulación ya pertenece a un efecto incompatible.",
        eventos: [
          this.crearEventoDominio("efecto_rechazado", efecto, {
            motivo: "grupo_incompatible",
          }),
        ],
      };
    }

    if (
      definicion.politicaAcumulacion ===
      POLITICAS_ACUMULACION_EFECTO.RECHAZAR_DUPLICADO
    ) {
      return {
        exito: false,
        aplicado: false,
        estadoAplicacion: "rechazado_por_politica",
        motivo: "duplicado",
        probabilidadBase: definicion.probabilidadBase,
        ...resolucion,
        efecto: crearResumenEfecto(efecto),
        mensaje: `${efecto.nombreEfecto} ya está activo y no renovó su duración.`,
        eventos: [
          this.crearEventoDominio("efecto_rechazado", efecto, {
            motivo: "duplicado",
          }),
        ],
      };
    }

    let tipoEvento = "efecto_renovado";
    let alcanzoMaximo = false;
    efecto.maximo = Math.max(
      efecto.maximo,
      definicion.maximo,
      efecto.intensidad,
      efecto.cantidad,
    );

    if (
      definicion.politicaAcumulacion ===
      POLITICAS_ACUMULACION_EFECTO.ACUMULAR_INTENSIDAD
    ) {
      efecto.escalaPorIntensidad = true;
      const nuevaIntensidad = Math.min(
        efecto.maximo,
        efecto.intensidad + definicion.incremento,
      );
      alcanzoMaximo = nuevaIntensidad === efecto.intensidad;
      efecto.intensidad = nuevaIntensidad;
      tipoEvento = "efecto_intensificado";
    } else if (
      definicion.politicaAcumulacion ===
      POLITICAS_ACUMULACION_EFECTO.ACUMULAR_CANTIDAD
    ) {
      efecto.escalaPorCantidad = true;
      const nuevaCantidad = Math.min(
        Math.floor(efecto.maximo),
        efecto.cantidad + Math.max(1, Math.floor(definicion.incremento)),
      );
      alcanzoMaximo = nuevaCantidad === efecto.cantidad;
      efecto.cantidad = nuevaCantidad;
      tipoEvento = "efecto_acumulado";
    }

    if (debeReemplazarPotencia(efecto, definicion)) {
      efecto.idDefinicion = definicion.idDefinicion;
      efecto.fuente = { ...definicion.fuente };
      efecto.valor = copiarValor(definicion.valor);
      efecto.tipoDanio = definicion.tipoDanio;
      efecto.componentesDanio = definicion.componentesDanio
        ? definicion.componentesDanio.map((componente) => ({ ...componente }))
        : null;
    }

    efecto.nombreEfecto = definicion.nombreEfecto;
    efecto.perfilAplicacion = definicion.perfilAplicacion;
    efecto.politicaAcumulacion = definicion.politicaAcumulacion;
    efecto.politicaPotencia = definicion.politicaPotencia;
    efecto.incremento = definicion.incremento;
    efecto.etiquetas = [...new Set([...efecto.etiquetas, ...definicion.etiquetas])];
    efecto.beneficioso = definicion.beneficioso;
    efecto.resistenciaId = definicion.resistenciaId;
    efecto.modoResistencia = definicion.modoResistencia;
    efecto.inmunidadId = definicion.inmunidadId;
    efecto.eliminarAlAdquirirInmunidad =
      definicion.eliminarAlAdquirirInmunidad;
    efecto.eliminaEfectosAlAplicarse = [
      ...definicion.eliminaEfectosAlAplicarse,
    ];

    // Toda reaplicación aceptada renueva la duración. El próximo tick ya
    // programado conserva su cadencia y no se reinicia.
    efecto.duracion = definicion.duracion;
    efecto.venceEn = tiempoActual + definicion.duracion;
    efecto.suspendido = false;

    this.agenda.cancelar(this.obtenerIdEventoVencimiento(efecto));
    this.programarVencimiento(efecto);

    if (
      efecto.proximoTick !== null &&
      efecto.proximoTick >= tiempoActual &&
      efecto.proximoTick <= efecto.venceEn
    ) {
      this.agenda.cancelar(this.obtenerIdEventoTick(efecto));
      this.programarTick(efecto);
    }

    this.recalcularFactoresObjetivo(efecto.objetivo);

    return {
      exito: true,
      aplicado: true,
      estadoAplicacion: "aplicado",
      motivo: null,
      probabilidadBase: definicion.probabilidadBase,
      ...resolucion,
      efecto: crearResumenEfecto(efecto),
      mensaje: alcanzoMaximo
        ? `${efecto.nombreEfecto} renovó su duración y ya estaba en su máximo.`
        : `${efecto.nombreEfecto} se aplicó nuevamente.`,
      eventos: [
        this.crearEventoDominio(tipoEvento, efecto, {
          alcanzoMaximo,
        }),
      ],
    };
  }

  retirarContraefectos(
    objetivo,
    definicionNueva,
    { excluirClave = null } = {},
  ) {
    const estado = obtenerEstadoObjetivo(objetivo, false);
    if (!estado) return [];

    const eliminadosPorNuevo = new Set(
      definicionNueva.eliminaEfectosAlAplicarse ?? [],
    );
    const eventos = [];

    for (const efectoActivo of [...estado.efectos.values()]) {
      if (efectoActivo.clave === excluirClave) continue;
      const activoEliminaNuevo =
        efectoActivo.eliminaEfectosAlAplicarse?.includes(
          definicionNueva.efectoId,
        ) === true;
      if (
        !eliminadosPorNuevo.has(efectoActivo.efectoId) &&
        !activoEliminaNuevo
      ) {
        continue;
      }

      const evento = this.retirarEfecto(efectoActivo, {
        motivo: "contraefecto",
        datosEvento: {
          catalogoEfectoCausanteId: definicionNueva.efectoId,
          nombreEfectoCausante: definicionNueva.nombreEfecto,
          idDefinicionCausante: definicionNueva.idDefinicion,
          idEjecucion: definicionNueva.fuente?.id ?? null,
        },
      });
      if (evento) eventos.push(evento);
    }

    return eventos;
  }

  retirarEfectosAhoraInmunes(objetivo) {
    const estado = obtenerEstadoObjetivo(objetivo, false);
    if (!estado) return { cantidad: 0, eventos: [] };

    const eventos = [];
    for (const efecto of [...estado.efectos.values()]) {
      if (
        efecto.eliminarAlAdquirirInmunidad &&
        esInmuneAlEfecto(objetivo, efecto.inmunidadId)
      ) {
        const evento = this.retirarEfecto(efecto, {
          motivo: "inmunidad_adquirida",
        });
        if (evento) eventos.push(evento);
      }
    }
    return { cantidad: eventos.length, eventos };
  }

  // Punto de integración explícito para futuras habilidades, consumibles u
  // objetos que concedan inmunidad durante una partida. La fuente que cambie
  // las inmunidades debe invocar esta operación para retirar el estado ahora,
  // sin esperar al siguiente tick ni a una consulta de interfaz.
  sincronizarInmunidades(objetivo) {
    this.validarDisponible();
    return this.retirarEfectosAhoraInmunes(objetivo);
  }

  programarEfecto(efecto) {
    if (efecto.proximoTick !== null && efecto.proximoTick <= efecto.venceEn) {
      this.programarTick(efecto);
    }
    this.programarVencimiento(efecto);
  }

  obtenerIdEventoTick(efecto) {
    return `${efecto.id}:tick`;
  }

  obtenerIdEventoVencimiento(efecto) {
    return `${efecto.id}:vencimiento`;
  }

  programarTick(efecto) {
    this.agenda.programar({
      id: this.obtenerIdEventoTick(efecto),
      instante: efecto.proximoTick,
      prioridad:
        CONFIGURACION_EFECTOS_TEMPORALES.prioridadesAgenda.tick,
      tipo: TIPO_EVENTO_AGENDA.TICK,
      datos: { efectoId: efecto.id, objetivo: efecto.objetivo },
    });
  }

  programarVencimiento(efecto) {
    this.agenda.programar({
      id: this.obtenerIdEventoVencimiento(efecto),
      instante: efecto.venceEn,
      prioridad:
        CONFIGURACION_EFECTOS_TEMPORALES.prioridadesAgenda.vencimiento,
      tipo: TIPO_EVENTO_AGENDA.VENCIMIENTO,
      datos: { efectoId: efecto.id, objetivo: efecto.objetivo },
    });
  }

  buscarEfectoPorId(objetivo, efectoId) {
    const estado = obtenerEstadoObjetivo(objetivo, false);
    if (!estado) {
      return null;
    }

    return [...estado.efectos.values()].find(
      (efecto) => efecto.id === efectoId,
    ) ?? null;
  }

  procesarEventosEn(instante) {
    this.validarDisponible();
    for (const objetivo of [...this.objetivosAdministrados]) {
      this.retirarEfectosAhoraInmunes(objetivo);
    }

    const eventosAgenda = this.agenda.extraerEventosEn(instante);
    const resultado = {
      eventos: [],
      mensajes: [],
      objetivosDerrotados: [],
    };

    for (const eventoAgenda of eventosAgenda) {
      const efecto = this.buscarEfectoPorId(
        eventoAgenda.datos.objetivo,
        eventoAgenda.datos.efectoId,
      );

      if (!efecto || efecto.suspendido) {
        continue;
      }

      if (eventoAgenda.tipo === TIPO_EVENTO_AGENDA.TICK) {
        this.procesarTick(efecto, instante, resultado);
      } else if (
        eventoAgenda.tipo === TIPO_EVENTO_AGENDA.VENCIMIENTO
      ) {
        this.procesarVencimiento(efecto, instante, resultado);
      }
    }

    return resultado;
  }

  procesarTick(efecto, instante, resultado) {
    if (
      efecto.tipo !== TIPOS_EFECTO_TEMPORAL.DANIO_PERIODICO ||
      instante > efecto.venceEn ||
      !estaObjetivoVivo(efecto.objetivo)
    ) {
      return;
    }

    const escala = obtenerEscalaAcumulacion(efecto);
    const componentes = efecto.componentesDanio
      ? efecto.componentesDanio.map((componente) => ({
          tipo: componente.tipo,
          danioBruto: componente.danioBruto * escala,
        }))
      : [
          {
            tipo: efecto.tipoDanio,
            danioBruto: efecto.valor * escala,
          },
        ];

    const estadisticas =
      efecto.objetivo?.estadisticasDerivadas ?? null;
    const paquete = resolverPaqueteDanio({
      componentes,
      armadura: estadisticas?.armadura ?? efecto.objetivo?.armadura ?? 0,
      resistencias: estadisticas?.resistencias ?? {},
      // El daño periódico no realiza una nueva tirada de bloqueo.
      bloqueo: { activo: false, mitigacion: 0 },
    });

    const vidaAntes = Number.isFinite(efecto.objetivo?.vidaActual)
      ? Math.max(0, efecto.objetivo.vidaActual)
      : null;
    const vidaMaxima = Number.isFinite(efecto.objetivo?.vidaMaxima)
      ? Math.max(0, efecto.objetivo.vidaMaxima)
      : null;
    const danioAplicado = efecto.objetivo.recibirDanio(
      paquete.danioCalculado,
    );
    const vidaDespues = Number.isFinite(efecto.objetivo?.vidaActual)
      ? Math.max(0, efecto.objetivo.vidaActual)
      : null;

    resultado.eventos.push(
      this.crearEventoDominio("efecto_tick", efecto, {
        instante,
      }),
      this.crearEventoDominio("danio_periodico_aplicado", efecto, {
        instante,
        danio: danioAplicado,
        danioCalculado: paquete.danioCalculado,
        danioBruto: paquete.danioBruto,
        desgloseDanio: paquete.desgloseDanio,
        componentesDanio: paquete.componentes,
        vidaAntes,
        vidaDespues,
        vidaMaxima,
      }),
    );

    resultado.mensajes.push(
      `${obtenerNombreObjetivo(efecto.objetivo)} recibe ${danioAplicado} de daño periódico.`,
    );

    if (!estaObjetivoVivo(efecto.objetivo)) {
      resultado.objetivosDerrotados.push(efecto.objetivo);
      resultado.eventos.push(
        this.crearEventoDominio("combatiente_derrotado", efecto, {
          instante,
        }),
      );
      this.retirarEfectosObjetivo(efecto.objetivo, {
        motivo: "objetivo_derrotado",
        registrarEventosEn: resultado.eventos,
      });
      return;
    }

    // Conservamos la siguiente posición de la cadencia aunque quede fuera
    // del vencimiento actual. Si el efecto se renueva antes de vencer, el
    // mismo calendario puede continuar sin reiniciar el próximo tick.
    efecto.proximoTick = instante + efecto.intervalo;

    if (efecto.proximoTick <= efecto.venceEn) {
      this.programarTick(efecto);
    }
  }

  procesarVencimiento(efecto, instante, resultado) {
    if (instante < efecto.venceEn) {
      // Un vencimiento anterior pudo quedar obsoleto tras una renovación.
      return;
    }

    const evento = this.crearEventoDominio("efecto_vencido", efecto, {
      instante,
    });

    this.retirarEfecto(efecto, {
      motivo: "vencimiento",
      emitirEventoRetiro: false,
    });

    resultado.eventos.push(evento);
    resultado.mensajes.push(
      `El efecto ${efecto.grupoAcumulacion} terminó sobre ${obtenerNombreObjetivo(efecto.objetivo)}.`,
    );
  }

  retirarEfecto(efecto, {
    motivo = "retirado",
    emitirEventoRetiro = true,
    datosEvento = {},
  } = {}) {
    const estado = obtenerEstadoObjetivo(efecto.objetivo, false);
    if (!estado || !estado.efectos.has(efecto.clave)) {
      return null;
    }

    this.agenda.cancelar(this.obtenerIdEventoTick(efecto));
    this.agenda.cancelar(this.obtenerIdEventoVencimiento(efecto));
    estado.efectos.delete(efecto.clave);
    this.recalcularFactoresObjetivo(efecto.objetivo);

    if (estado.efectos.size === 0) {
      this.objetivosAdministrados.delete(efecto.objetivo);
    }

    return emitirEventoRetiro
      ? this.crearEventoDominio("efecto_retirado", efecto, {
          motivo,
          ...datosEvento,
        })
      : null;
  }

  retirarEfectosObjetivo(objetivo, {
    tipo = null,
    etiquetas = [],
    soloNegativos = false,
    motivo = "limpieza",
    registrarEventosEn = null,
  } = {}) {
    const estado = obtenerEstadoObjetivo(objetivo, false);
    if (!estado) {
      return { cantidad: 0, eventos: [] };
    }

    const etiquetasSolicitadas = Array.isArray(etiquetas)
      ? etiquetas.map((etiqueta) => `${etiqueta}`.toLowerCase())
      : [];
    const eventos = [];

    for (const efecto of [...estado.efectos.values()]) {
      if (tipo !== null && efecto.tipo !== tipo) {
        continue;
      }
      if (soloNegativos && efecto.beneficioso) {
        continue;
      }
      if (
        etiquetasSolicitadas.length > 0 &&
        !etiquetasSolicitadas.some((etiqueta) =>
          efecto.etiquetas.includes(etiqueta),
        )
      ) {
        continue;
      }

      const evento = this.retirarEfecto(efecto, { motivo });
      if (evento) {
        eventos.push(evento);
      }
    }

    if (Array.isArray(registrarEventosEn)) {
      registrarEventosEn.push(...eventos);
    }

    return { cantidad: eventos.length, eventos };
  }

  retirarEfectosNegativos(objetivo, opciones = {}) {
    return this.retirarEfectosObjetivo(objetivo, {
      ...opciones,
      soloNegativos: true,
    });
  }

  recalcularFactoresObjetivo(objetivo) {
    const estado = obtenerEstadoObjetivo(objetivo, false);
    if (!estado) {
      return;
    }

    const modificadores = [...estado.efectos.values()].filter(
      (efecto) =>
        !efecto.suspendido &&
        efecto.tipo === TIPOS_EFECTO_TEMPORAL.MODIFICADOR_FACTOR,
    );

    if (modificadores.length === 0) {
      if (estado.factoresBase) {
        for (const nombreFactor of FACTORES_TEMPORALES_MODIFICABLES) {
          objetivo[nombreFactor] = estado.factoresBase[nombreFactor];
        }
        estado.factoresBase = null;
      }
      return;
    }

    if (!estado.factoresBase) {
      estado.factoresBase = Object.fromEntries(
        FACTORES_TEMPORALES_MODIFICABLES.map((nombreFactor) => [
          nombreFactor,
          objetivo[nombreFactor],
        ]),
      );
    }

    for (const nombreFactor of FACTORES_TEMPORALES_MODIFICABLES) {
      const valorBase = estado.factoresBase[nombreFactor];
      let multiplicadorTotal = 1;

      for (const efecto of modificadores) {
        const multiplicadorConfigurado = efecto.valor[nombreFactor];
        if (multiplicadorConfigurado === undefined) {
          continue;
        }

        const escala = obtenerEscalaAcumulacion(efecto);
        const multiplicadorEscalado =
          1 + (multiplicadorConfigurado - 1) * escala;
        multiplicadorTotal *= limitarMultiplicador(multiplicadorEscalado);
      }

      objetivo[nombreFactor] = valorBase * multiplicadorTotal;
    }
  }

  suspenderObjetivo(objetivo) {
    const estado = obtenerEstadoObjetivo(objetivo, false);
    if (!estado) {
      return 0;
    }

    const tiempoActual = this.obtenerTiempoActual();
    let cantidad = 0;

    for (const efecto of estado.efectos.values()) {
      if (efecto.suspendido) {
        continue;
      }

      efecto.duracionRestante = Math.max(0, efecto.venceEn - tiempoActual);
      efecto.tiempoHastaProximoTick =
        efecto.proximoTick === null
          ? null
          : Math.max(0, efecto.proximoTick - tiempoActual);
      efecto.suspendido = true;

      this.agenda.cancelar(this.obtenerIdEventoTick(efecto));
      this.agenda.cancelar(this.obtenerIdEventoVencimiento(efecto));
      cantidad++;
    }

    // Mientras el objetivo está fuera de un mapa activo no debe conservar
    // factores efectivos alterados. La reanudación los recalcula desde la
    // base exacta cuando se crea el sistema del mapa siguiente.
    this.recalcularFactoresObjetivo(objetivo);
    this.objetivosAdministrados.delete(objetivo);
    return cantidad;
  }

  reanudarObjetivo(objetivo) {
    this.validarDisponible();

    const estado = obtenerEstadoObjetivo(objetivo, false);
    if (!estado) {
      return 0;
    }

    const tiempoActual = this.obtenerTiempoActual();
    let cantidad = 0;

    for (const efecto of estado.efectos.values()) {
      if (!efecto.suspendido) {
        continue;
      }

      if ((efecto.duracionRestante ?? 0) <= 0) {
        this.retirarEfecto(efecto, {
          motivo: "vencido_durante_transferencia",
        });
        continue;
      }

      efecto.aplicadoEn = tiempoActual;
      efecto.venceEn = tiempoActual + efecto.duracionRestante;
      efecto.proximoTick =
        efecto.tiempoHastaProximoTick === null
          ? null
          : tiempoActual + efecto.tiempoHastaProximoTick;
      efecto.suspendido = false;
      efecto.duracionRestante = null;
      efecto.tiempoHastaProximoTick = null;

      this.programarEfecto(efecto);
      cantidad++;
    }

    if (cantidad > 0) {
      this.objetivosAdministrados.add(objetivo);
      this.recalcularFactoresObjetivo(objetivo);
    }

    return cantidad;
  }

  crearEventoDominio(tipo, efecto, datos = {}) {
    return {
      tipo,
      efectoId: efecto.id,
      idDefinicion: efecto.idDefinicion,
      catalogoEfectoId: efecto.efectoId,
      nombreEfecto: efecto.nombreEfecto,
      grupoAcumulacion: efecto.grupoAcumulacion,
      tipoEfecto: efecto.tipo,
      fuente: { ...efecto.fuente },
      objetivo: efecto.objetivo,
      perfilAplicacion: efecto.perfilAplicacion,
      politicaAcumulacion: efecto.politicaAcumulacion,
      maximo: efecto.maximo,
      intensidad: efecto.intensidad,
      cantidad: efecto.cantidad,
      aplicadoEn: efecto.aplicadoEn,
      venceEn: efecto.venceEn,
      proximoTick: efecto.proximoTick,
      etiquetas: [...efecto.etiquetas],
      beneficioso: efecto.beneficioso,
      eliminaEfectosAlAplicarse: [...(efecto.eliminaEfectosAlAplicarse ?? [])],
      ...datos,
    };
  }

  destruir({ preservarObjetivos = [] } = {}) {
    if (this.destruido) {
      return;
    }

    const preservar = new Set(preservarObjetivos);

    for (const objetivo of [...this.objetivosAdministrados]) {
      if (preservar.has(objetivo)) {
        this.suspenderObjetivo(objetivo);
      } else {
        this.retirarEfectosObjetivo(objetivo, {
          motivo: "destruccion_mapa",
        });
      }
    }

    this.agenda.limpiar();
    this.objetivosAdministrados.clear();
    this.destruido = true;
  }
}
