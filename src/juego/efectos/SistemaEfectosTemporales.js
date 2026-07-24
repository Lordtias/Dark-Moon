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
  POLITICAS_ACUMULACION_EFECTO,
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
  switch (efecto.politicaAcumulacion) {
    case POLITICAS_ACUMULACION_EFECTO.ACUMULAR_INTENSIDAD:
      return efecto.intensidad;
    case POLITICAS_ACUMULACION_EFECTO.ACUMULAR_CANTIDAD:
      return efecto.cantidad;
    default:
      return 1;
  }
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
    grupoAcumulacion: efecto.grupoAcumulacion,
    fuente: { ...efecto.fuente },
    objetivo: efecto.objetivo,
    tipo: efecto.tipo,
    valor: copiarValor(efecto.valor),
    duracion: efecto.duracion,
    intervalo: efecto.intervalo,
    politicaAcumulacion: efecto.politicaAcumulacion,
    maximo: efecto.maximo,
    intensidad: efecto.intensidad,
    cantidad: efecto.cantidad,
    aplicadoEn: efecto.aplicadoEn,
    venceEn: efecto.venceEn,
    proximoTick: efecto.proximoTick,
    etiquetas: [...efecto.etiquetas],
    beneficioso: efecto.beneficioso,
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

  estaInmovilizado(objetivo) {
    return this.tieneEfectoTipo(
      objetivo,
      TIPOS_EFECTO_TEMPORAL.INMOVILIZACION,
    );
  }

  estaAturdido(objetivo) {
    return this.tieneEfectoTipo(
      objetivo,
      TIPOS_EFECTO_TEMPORAL.ATURDIMIENTO,
    );
  }

  obtenerFinAturdimiento(objetivo) {
    const vencimientos = this.obtenerEfectosObjetivo(objetivo)
      .filter((efecto) => efecto.tipo === TIPOS_EFECTO_TEMPORAL.ATURDIMIENTO)
      .map((efecto) => efecto.venceEn)
      .filter(Number.isFinite);

    return vencimientos.length > 0 ? Math.max(...vencimientos) : null;
  }

  aplicar(definicionRecibida) {
    this.validarDisponible();

    const definicion = normalizarDefinicionEfectoTemporal(
      definicionRecibida,
    );
    const tiempoActual = this.obtenerTiempoActual();

    if (!estaObjetivoVivo(definicion.objetivo)) {
      return {
        exito: false,
        aplicado: false,
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

    const estado = obtenerEstadoObjetivo(definicion.objetivo);
    const clave = crearClaveEfecto(definicion);
    const existente = estado.efectos.get(clave);

    this.objetivosAdministrados.add(definicion.objetivo);

    if (existente) {
      return this.reaplicarEfecto(existente, definicion, tiempoActual);
    }

    const efecto = {
      id: `efecto-${siguienteIdInstancia++}`,
      clave,
      idDefinicion: definicion.idDefinicion,
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
      maximo: definicion.maximo,
      incremento: definicion.incremento,
      etiquetas: [...definicion.etiquetas],
      beneficioso: definicion.beneficioso,
      intensidad: 1,
      cantidad: 1,
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

    const evento = this.crearEventoDominio("efecto_aplicado", efecto);

    return {
      exito: true,
      aplicado: true,
      efecto: crearResumenEfecto(efecto),
      mensaje: `${obtenerNombreObjetivo(efecto.objetivo)} recibió el efecto ${efecto.grupoAcumulacion}.`,
      eventos: [evento],
    };
  }

  reaplicarEfecto(efecto, definicion, tiempoActual) {
    if (
      efecto.tipo !== definicion.tipo ||
      efecto.politicaAcumulacion !== definicion.politicaAcumulacion ||
      efecto.intervalo !== definicion.intervalo
    ) {
      return {
        exito: false,
        aplicado: false,
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
      efecto.politicaAcumulacion ===
      POLITICAS_ACUMULACION_EFECTO.RECHAZAR_DUPLICADO
    ) {
      return {
        exito: false,
        aplicado: false,
        efecto: crearResumenEfecto(efecto),
        mensaje: "El efecto duplicado fue rechazado.",
        eventos: [
          this.crearEventoDominio("efecto_rechazado", efecto, {
            motivo: "duplicado",
          }),
        ],
      };
    }

    let tipoEvento = "efecto_renovado";
    let alcanzoMaximo = false;

    if (
      efecto.politicaAcumulacion ===
      POLITICAS_ACUMULACION_EFECTO.ACUMULAR_INTENSIDAD
    ) {
      const nuevaIntensidad = Math.min(
        efecto.maximo,
        efecto.intensidad + definicion.incremento,
      );
      alcanzoMaximo = nuevaIntensidad === efecto.intensidad;
      efecto.intensidad = nuevaIntensidad;
      tipoEvento = "efecto_intensificado";
    } else if (
      efecto.politicaAcumulacion ===
      POLITICAS_ACUMULACION_EFECTO.ACUMULAR_CANTIDAD
    ) {
      const nuevaCantidad = Math.min(
        efecto.maximo,
        efecto.cantidad + Math.max(1, Math.floor(definicion.incremento)),
      );
      alcanzoMaximo = nuevaCantidad === efecto.cantidad;
      efecto.cantidad = nuevaCantidad;
      tipoEvento = "efecto_acumulado";
    }

    // La aplicación más reciente aporta su descriptor y potencia base. La
    // acumulación permanece en la misma instancia y conserva su cadencia.
    efecto.idDefinicion = definicion.idDefinicion;
    efecto.fuente = { ...definicion.fuente };
    efecto.valor = copiarValor(definicion.valor);
    efecto.tipoDanio = definicion.tipoDanio;
    efecto.componentesDanio = definicion.componentesDanio
      ? definicion.componentesDanio.map((componente) => ({ ...componente }))
      : null;
    efecto.maximo = definicion.maximo;
    efecto.incremento = definicion.incremento;
    efecto.etiquetas = [...definicion.etiquetas];
    efecto.beneficioso = definicion.beneficioso;
    efecto.intensidad = Math.min(efecto.intensidad, efecto.maximo);
    efecto.cantidad = Math.min(efecto.cantidad, Math.floor(efecto.maximo));

    // Toda reaplicación aceptada renueva la duración. El próximo tick ya
    // programado conserva su cadencia y no se reinicia.
    efecto.duracion = definicion.duracion;
    efecto.venceEn = tiempoActual + definicion.duracion;
    efecto.suspendido = false;

    this.agenda.cancelar(this.obtenerIdEventoVencimiento(efecto));
    this.programarVencimiento(efecto);

    // Un tick que quedó fuera de la duración anterior puede volver a quedar
    // dentro de la nueva duración. Se programa sin alterar su cadencia.
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
      efecto: crearResumenEfecto(efecto),
      mensaje: alcanzoMaximo
        ? "El efecto renovó su duración y ya estaba en su máximo."
        : "El efecto se acumuló y renovó su duración.",
      eventos: [
        this.crearEventoDominio(tipoEvento, efecto, {
          alcanzoMaximo,
        }),
      ],
    };
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

    const danioAplicado = efecto.objetivo.recibirDanio(
      paquete.danioCalculado,
    );

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
      ? this.crearEventoDominio("efecto_retirado", efecto, { motivo })
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
      grupoAcumulacion: efecto.grupoAcumulacion,
      tipoEfecto: efecto.tipo,
      fuente: { ...efecto.fuente },
      objetivo: efecto.objetivo,
      intensidad: efecto.intensidad,
      cantidad: efecto.cantidad,
      venceEn: efecto.venceEn,
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
