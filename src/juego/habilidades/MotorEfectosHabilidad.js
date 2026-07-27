import {
  MAGNITUDES_ESCALADO_EFECTO,
  crearInstantaneaEfectoMagico,
} from "../magia/CalculadorAtributosMagicos.js";
import {
  normalizarDefinicionEfectoTemporal,
} from "../efectos/ContratosEfectosTemporales.js";
import {
  obtenerContextoPotenciaHabilidad,
  obtenerMultiplicadorEfectos,
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
    const magnitudEscalable =
      efecto.tipo === "danio_periodico"
        ? MAGNITUDES_ESCALADO_EFECTO.VALOR
        : MAGNITUDES_ESCALADO_EFECTO.NINGUNA;
    const definicion = crearInstantaneaEfectoMagico({
      definicion: definicionBase,
      multiplicadorEfectos: multiplicadorMagico,
      magnitudEscalable,
    });
    // Valida el contrato completo antes de consumir Maná. Se conserva la
    // definición original para que la fuente real se vincule al confirmar.
    normalizarDefinicionEfectoTemporal(definicion);

    return {
      idEfecto: efecto.id,
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
    });

    return {
      idEjecucion,
      idEfecto: preparada.idEfecto,
      tipo: preparada.tipo,
      multiplicadorAtributosMagicos:
        preparada.multiplicadorAtributosMagicos,
      multiplicadorPotenciaHabilidad:
        preparada.multiplicadorPotenciaHabilidad,
      potenciaHabilidad: preparada.potenciaHabilidad,
      definicion: resumirDefinicion(definicion),
      resultado: resumirResultado(resultado),
    };
  });
}

function crearDefinicionCanonica({ efecto, objetivo, idEjecucion }) {
  const comun = {
    idDefinicion: efecto.id,
    grupoAcumulacion: efecto.grupoAcumulacion ?? efecto.id,
    fuente: {
      id: idEjecucion,
      nombre: efecto.id,
      tipo: "habilidad_jugador",
    },
    objetivo,
    tipo: efecto.tipo,
    duracion: efecto.duracion,
    intervalo: efecto.intervalo ?? null,
    politicaAcumulacion:
      efecto.politicaAcumulacion ?? "renovar_duracion",
    maximo: efecto.maximo ?? 1,
    incremento: efecto.incremento ?? 1,
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
  if (efecto.tipo === "modificador_factor") {
    return {
      ...comun,
      valor: { ...efecto.valor },
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
    grupoAcumulacion: definicion.grupoAcumulacion,
    fuente: { ...definicion.fuente },
    tipo: definicion.tipo,
    valor: copiarSimple(definicion.valor),
    tipoDanio: definicion.tipoDanio,
    componentesDanio: definicion.componentesDanio
      ? definicion.componentesDanio.map((componente) => ({ ...componente }))
      : null,
    duracion: definicion.duracion,
    intervalo: definicion.intervalo,
    politicaAcumulacion: definicion.politicaAcumulacion,
    maximo: definicion.maximo,
    incremento: definicion.incremento,
    etiquetas: [...(definicion.etiquetas ?? [])],
    beneficioso: definicion.beneficioso,
  };
}

function resumirResultado(resultado) {
  const efecto = resultado?.efecto;
  return {
    exito: resultado?.exito === true,
    aplicado: resultado?.aplicado === true,
    mensaje: resultado?.mensaje ?? null,
    efecto: efecto
      ? {
          id: efecto.id,
          idDefinicion: efecto.idDefinicion,
          grupoAcumulacion: efecto.grupoAcumulacion,
          tipo: efecto.tipo,
          valor: copiarSimple(efecto.valor),
          duracion: efecto.duracion,
          intervalo: efecto.intervalo,
          politicaAcumulacion: efecto.politicaAcumulacion,
          aplicadoEn: efecto.aplicadoEn,
          venceEn: efecto.venceEn,
          proximoTick: efecto.proximoTick,
        }
      : null,
  };
}

function copiarSimple(valor) {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map(copiarSimple);
  return Object.fromEntries(
    Object.entries(valor).map(([clave, actual]) => [clave, copiarSimple(actual)]),
  );
}
