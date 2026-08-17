import {
  MAGNITUDES_ESCALADO_EFECTO,
  crearInstantaneaEfectoMagico,
} from "../magia/CalculadorAtributosMagicos.js";
import { normalizarDefinicionEfectoTemporal } from "../efectos/ContratosEfectosTemporales.js";
import {
  obtenerContextoPotenciaHabilidad,
  obtenerMultiplicadorEfectos,
  obtenerTiradaAplicacionEfectoHabilidad,
} from "./MotorDanioHabilidad.js";

export function validarDisponibilidadEfectosHabilidad({
  juego,
  efectosConfigurados = [],
} = {}) {
  if (!Array.isArray(efectosConfigurados)) {
    throw new Error("Los efectos de la habilidad deben estar dentro de una lista.");
  }
  if (efectosConfigurados.length === 0) return true;
  if (typeof juego?.coordinadorTiempo?.aplicarEfectoTemporal !== "function") {
    throw new Error(
      "El mapa activo no expone el sistema temporal canónico para aplicar efectos.",
    );
  }
  return true;
}

// Construye y valida las definiciones antes de consumir recursos. El objetivo
// conserva su identidad, pero todavía no se modifica el mundo ni se agenda nada.
export function prepararEfectosHabilidad({
  lanzador,
  objetivo,
  efectosConfigurados = [],
  contextoPotencia = null,
  idEjecucion = "prevalidacion",
} = {}) {
  if (!Array.isArray(efectosConfigurados)) {
    throw new Error("Los efectos de la habilidad deben estar dentro de una lista.");
  }
  if (efectosConfigurados.length === 0) return [];
  if (!lanzador || !objetivo) {
    throw new Error("Los efectos de habilidad necesitan lanzador y objetivo.");
  }

  const multiplicadorAtributos = obtenerMultiplicadorEfectos(lanzador);
  const potencia =
    contextoPotencia ?? obtenerContextoPotenciaHabilidad(lanzador);
  const multiplicadorMagico =
    multiplicadorAtributos * potencia.multiplicadorHabilidad;

  return efectosConfigurados.map((efecto) => {
    const definicionBase = crearDefinicionCanonica({
      efecto,
      objetivo,
      idEjecucion,
    });
    const magnitudEscalable = normalizarMagnitudEscaladoPotencia(
      efecto.escaladoPotencia,
    );
    const definicion = crearInstantaneaEfectoMagico({
      definicion: definicionBase,
      multiplicadorEfectos: multiplicadorMagico,
      magnitudEscalable,
    });
    // La tirada se agrega únicamente al confirmar. La prevalidación no debe
    // consumir secuencias deterministas ni modificar el mundo.
    normalizarDefinicionEfectoTemporal(definicion);

    return {
      idEfecto: efecto.efectoId,
      nombreEfecto: efecto.nombreEfecto,
      tipo: efecto.tipo,
      multiplicadorAtributosMagicos: multiplicadorAtributos,
      multiplicadorPotenciaHabilidad: potencia.multiplicadorHabilidad,
      potenciaHabilidad: potencia.potenciaHabilidad,
      definicion,
    };
  });
}

export function aplicarEfectosHabilidad({
  juego,
  lanzador,
  objetivo,
  efectosConfigurados = [],
  definicionesPreparadas = null,
  contextoPotencia = null,
  idEjecucion,
} = {}) {
  validarDisponibilidadEfectosHabilidad({ juego, efectosConfigurados });
  if (efectosConfigurados.length === 0) return [];
  if (!lanzador || !objetivo) {
    throw new Error("Los efectos de habilidad necesitan lanzador y objetivo.");
  }

  const preparadas = Array.isArray(definicionesPreparadas)
    ? definicionesPreparadas
    : prepararEfectosHabilidad({
        lanzador,
        objetivo,
        efectosConfigurados,
        contextoPotencia,
        idEjecucion,
      });

  if (preparadas.length !== efectosConfigurados.length) {
    throw new Error("La preparación de efectos no coincide con la configuración.");
  }

  return preparadas.map((preparada) => {
    const definicion = vincularEjecucion({
      definicion: preparada.definicion,
      idEjecucion,
    });
    const resultado = juego.coordinadorTiempo.aplicarEfectoTemporal({
      ...definicion,
      fuenteCombatiente: lanzador,
      obtenerTiradaAplicacion: obtenerTiradaAplicacionEfectoHabilidad,
    });

    return {
      idEjecucion,
      idEfecto: preparada.idEfecto,
      nombreEfecto: preparada.nombreEfecto,
      tipo: preparada.tipo,
      multiplicadorAtributosMagicos:
        preparada.multiplicadorAtributosMagicos,
      multiplicadorPotenciaHabilidad:
        preparada.multiplicadorPotenciaHabilidad,
      potenciaHabilidad: preparada.potenciaHabilidad,
      definicion: resumirDefinicion(definicion),
      resultado: resumirResultado(resultado),
      eventos: Array.isArray(resultado?.eventos) ? [...resultado.eventos] : [],
    };
  });
}

function crearDefinicionCanonica({ efecto, objetivo, idEjecucion }) {
  const comun = {
    idDefinicion: efecto.efectoId,
    efectoId: efecto.efectoId,
    nombreEfecto: efecto.nombreEfecto,
    perfilAplicacion: efecto.perfilAplicacion,
    grupoAcumulacion: efecto.grupoAcumulacion,
    fuente: {
      id: idEjecucion,
      nombre: efecto.nombreEfecto,
      tipo: "habilidad_jugador",
    },
    objetivo,
    tipo: efecto.tipo,
    duracion: efecto.duracion,
    intervalo: efecto.intervalo ?? null,
    politicaAcumulacion: efecto.politicaAcumulacion,
    politicaPotencia: efecto.politicaPotencia,
    maximo: efecto.maximo,
    incremento: efecto.incremento,
    intensidadInicial: efecto.intensidadInicial ?? 1,
    probabilidadBase: efecto.probabilidadBase,
    tiradaAplicacion: null,
    resistenciaId: efecto.resistenciaId,
    modoResistencia: efecto.modoResistencia,
    inmunidadId: efecto.inmunidadId,
    eliminarAlAdquirirInmunidad: efecto.eliminarAlAdquirirInmunidad,
    eliminaEfectosAlAplicarse: [
      ...(efecto.eliminaEfectosAlAplicarse ?? []),
    ],
    etiquetas: [
      "habilidad",
      `ejecucion:${idEjecucion}`,
      ...(efecto.etiquetas ?? []),
    ],
    beneficioso: efecto.beneficioso === true,
  };

  if (efecto.tipo === "danio_periodico") {
    return {
      ...comun,
      valor: 1,
      tipoDanio: null,
      componentesDanio: [
        {
          tipo: efecto.tipoDanio,
          danioBruto: efecto.valorBase,
        },
      ],
    };
  }
  if (efecto.tipo === "modificador_combatiente") {
    return {
      ...comun,
      valor: 1,
      modificadores: (efecto.modificadores ?? []).map((descriptor) => ({
        ...descriptor,
        condiciones: { ...(descriptor.condiciones ?? {}) },
      })),
      emision: efecto.emision
        ? {
            ...efecto.emision,
            condicionesEmisor: { ...(efecto.emision.condicionesEmisor ?? {}) },
          }
        : null,
      tipoDanio: null,
      componentesDanio: null,
    };
  }
  return {
    ...comun,
    valor: efecto.valorBase ?? 1,
    tipoDanio: null,
    componentesDanio: null,
  };
}

function vincularEjecucion({ definicion, idEjecucion }) {
  return {
    ...definicion,
    fuente: {
      ...definicion.fuente,
      id: idEjecucion,
    },
    etiquetas: (definicion.etiquetas ?? [])
      .filter((etiqueta) => !String(etiqueta).startsWith("ejecucion:"))
      .concat(`ejecucion:${idEjecucion}`),
  };
}

function resumirDefinicion(definicion) {
  return {
    idDefinicion: definicion.idDefinicion,
    efectoId: definicion.efectoId,
    nombreEfecto: definicion.nombreEfecto,
    perfilAplicacion: definicion.perfilAplicacion,
    grupoAcumulacion: definicion.grupoAcumulacion,
    fuente: { ...definicion.fuente },
    tipo: definicion.tipo,
    valor: copiarSimple(definicion.valor),
    modificadores: copiarSimple(definicion.modificadores),
    emision: copiarSimple(definicion.emision),
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
    intensidadInicial: definicion.intensidadInicial,
    probabilidadBase: definicion.probabilidadBase,
    tiradaAplicacion: definicion.tiradaAplicacion,
    resistenciaId: definicion.resistenciaId,
    modoResistencia: definicion.modoResistencia,
    inmunidadId: definicion.inmunidadId,
    eliminaEfectosAlAplicarse: [
      ...(definicion.eliminaEfectosAlAplicarse ?? []),
    ],
    etiquetas: [...(definicion.etiquetas ?? [])],
    beneficioso: definicion.beneficioso,
  };
}

function resumirResultado(resultado) {
  const efecto = resultado?.efecto;
  return {
    exito: resultado?.exito === true,
    aplicado: resultado?.aplicado === true,
    estadoAplicacion: resultado?.estadoAplicacion ?? null,
    motivo: resultado?.motivo ?? null,
    mensaje: resultado?.mensaje ?? null,
    mensajePresentacion: resultado?.mensajePresentacion ?? null,
    probabilidadBase: resultado?.probabilidadBase ?? null,
    resistencia: resultado?.resistencia ?? null,
    probabilidadFinal: resultado?.probabilidadFinal ?? null,
    tiradaAplicacion: resultado?.tiradaAplicacion ?? null,
    contraefectosRetirados: [
      ...(resultado?.contraefectosRetirados ?? []),
    ],
    efecto: efecto
      ? {
          id: efecto.id,
          idDefinicion: efecto.idDefinicion,
          efectoId: efecto.efectoId,
          nombreEfecto: efecto.nombreEfecto,
          grupoAcumulacion: efecto.grupoAcumulacion,
          tipo: efecto.tipo,
          valor: copiarSimple(efecto.valor),
          modificadores: copiarSimple(efecto.modificadores),
          emision: copiarSimple(efecto.emision),
          duracion: efecto.duracion,
          intervalo: efecto.intervalo,
          politicaAcumulacion: efecto.politicaAcumulacion,
          politicaPotencia: efecto.politicaPotencia,
          intensidad: efecto.intensidad,
          cantidad: efecto.cantidad,
          aplicadoEn: efecto.aplicadoEn,
          venceEn: efecto.venceEn,
          proximoTick: efecto.proximoTick,
        }
      : null,
  };
}

function normalizarMagnitudEscaladoPotencia(valor) {
  const normalizado = valor ?? MAGNITUDES_ESCALADO_EFECTO.NINGUNA;
  if (!Object.values(MAGNITUDES_ESCALADO_EFECTO).includes(normalizado)) {
    throw new Error(`El escalado de Potencia de Efectos "${normalizado}" no existe.`);
  }
  return normalizado;
}

function copiarSimple(valor) {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map(copiarSimple);
  return Object.fromEntries(
    Object.entries(valor).map(([clave, actual]) => [clave, copiarSimple(actual)]),
  );
}
