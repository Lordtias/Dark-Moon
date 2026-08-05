import { resolverPaqueteDanio } from "../combate/ComponentesDanio.js";
import { calcularProbabilidadImpacto } from "../combate/SistemaCombate.js";
import * as AtributosMagicos from "../magia/CalculadorAtributosMagicos.js";
import { crearContextoPotenciaHabilidad } from "../magia/SistemaCatalizadores.js";

const TIRADAS_DETERMINISTAS = {
  impacto: [],
  critico: [],
  efecto: [],
};

export function configurarTiradasDeterministasHabilidad({
  impacto = [],
  critico = [],
  efecto = [],
} = {}) {
  TIRADAS_DETERMINISTAS.impacto = normalizarSecuenciaTiradas(
    impacto,
    "impacto",
  );
  TIRADAS_DETERMINISTAS.critico = normalizarSecuenciaTiradas(
    critico,
    "crítico",
  );
  TIRADAS_DETERMINISTAS.efecto = normalizarSecuenciaTiradas(
    efecto,
    "efecto",
  );
  return obtenerEstadoTiradasDeterministasHabilidad();
}

export function restaurarTiradasAleatoriasHabilidad() {
  TIRADAS_DETERMINISTAS.impacto = [];
  TIRADAS_DETERMINISTAS.critico = [];
  TIRADAS_DETERMINISTAS.efecto = [];
  return obtenerEstadoTiradasDeterministasHabilidad();
}

export function obtenerEstadoTiradasDeterministasHabilidad() {
  return Object.freeze({
    impacto: [...TIRADAS_DETERMINISTAS.impacto],
    critico: [...TIRADAS_DETERMINISTAS.critico],
    efecto: [...TIRADAS_DETERMINISTAS.efecto],
    activa:
      TIRADAS_DETERMINISTAS.impacto.length > 0 ||
      TIRADAS_DETERMINISTAS.critico.length > 0 ||
      TIRADAS_DETERMINISTAS.efecto.length > 0,
  });
}

export function obtenerTiradaAplicacionEfectoHabilidad() {
  return obtenerTirada("efecto");
}

export function resolverImpactoHabilidad({
  lanzador,
  objetivo,
  idEjecucion,
  resolverImpacto = true,
  resolverCritico = false,
} = {}) {
  if (!lanzador || !objetivo) {
    throw new Error("La resolución de impacto necesita lanzador y objetivo.");
  }

  const estadisticasLanzador = obtenerEstadisticas(lanzador);
  const vidaObjetivoAntes = leerVidaActual(objetivo);
  const vidaObjetivoMaxima = leerVidaMaxima(objetivo);
  const probabilidadImpacto = resolverImpacto
    ? obtenerProbabilidadImpacto(lanzador, objetivo)
    : 100;
  const tiradaImpacto = obtenerTirada("impacto");
  const impacto = !resolverImpacto || tiradaImpacto <= probabilidadImpacto;
  const probabilidadCritico = resolverCritico
    ? limitar(estadisticasLanzador?.probabilidadCritico ?? 0, 0, 100)
    : 0;
  const tiradaCritico =
    impacto && resolverCritico ? obtenerTirada("critico") : null;
  const critico =
    impacto && resolverCritico && tiradaCritico <= probabilidadCritico;

  return {
    idEjecucion,
    impacto,
    critico,
    probabilidadImpacto,
    tiradaImpacto,
    probabilidadCritico,
    tiradaCritico,
    objetivoDerrotado: estaDerrotado(objetivo),
    vidaObjetivoAntes,
    vidaObjetivoDespues: leerVidaActual(objetivo),
    vidaObjetivoMaxima,
  };
}

export function resolverDanioHabilidad({
  lanzador,
  objetivo,
  componentesConfigurados = [],
  idEjecucion,
  contextoPotencia = null,
  aplicarEscaladoMagico = true,
  aplicarPotenciaHabilidad = true,
  resolverImpacto = true,
  resolverCritico = true,
} = {}) {
  validarEntradaDanio({ lanzador, objetivo, componentesConfigurados });

  const vidaObjetivoAntes = leerVidaActual(objetivo);
  const vidaObjetivoMaxima = leerVidaMaxima(objetivo);
  const estadisticasLanzador = obtenerEstadisticas(lanzador);
  const estadisticasObjetivo = obtenerEstadisticas(objetivo);
  const probabilidadImpacto = resolverImpacto
    ? obtenerProbabilidadImpacto(lanzador, objetivo)
    : 100;
  const tiradaImpacto = obtenerTirada("impacto");
  const impacto = !resolverImpacto || tiradaImpacto <= probabilidadImpacto;

  const multiplicadorAtributos = aplicarEscaladoMagico
    ? obtenerMultiplicadorDanioMagico(lanzador)
    : 1;
  const contextoPotenciaCalculado = aplicarPotenciaHabilidad
    ? (contextoPotencia ?? obtenerContextoPotenciaHabilidad(lanzador))
    : crearContextoPotenciaNeutro();
  const multiplicadorBase =
    multiplicadorAtributos * contextoPotenciaCalculado.multiplicadorHabilidad;

  if (!impacto) {
    return crearResultadoFallo({
      idEjecucion,
      probabilidadImpacto,
      tiradaImpacto,
      multiplicadorAtributos,
      contextoPotencia: contextoPotenciaCalculado,
      vidaObjetivoAntes,
      vidaObjetivoMaxima,
    });
  }

  const probabilidadCritico = resolverCritico
    ? limitar(estadisticasLanzador?.probabilidadCritico ?? 0, 0, 100)
    : 0;
  const multiplicadorCritico = Math.max(
    1,
    estadisticasLanzador?.multiplicadorCritico ?? 1,
  );
  const tiradaCritico = obtenerTirada("critico");
  const critico = resolverCritico && tiradaCritico <= probabilidadCritico;
  const multiplicadorFinal =
    multiplicadorBase * (critico ? multiplicadorCritico : 1);

  const componentes = componentesConfigurados.map((componente) => ({
    tipo: componente.tipo,
    valorBase: componente.valorBase,
    danioBruto: escalarDanioMagico(componente.valorBase, multiplicadorFinal),
  }));
  const resistencias = estadisticasObjetivo?.resistencias ?? {};
  const resolucion = resolverPaqueteDanio({
    componentes: componentes.map(({ tipo, danioBruto }) => ({
      tipo,
      danioBruto,
    })),
    armadura: 0,
    resistencias,
    bloqueo: { activo: false, mitigacion: 0 },
  });
  const danioAplicado = aplicarDanioFinal(objetivo, resolucion.danioCalculado, {
    idEjecucion,
    fuente: lanzador,
    tipoAccion: "habilidad",
  });

  return {
    idEjecucion,
    impacto: true,
    critico,
    probabilidadImpacto,
    tiradaImpacto,
    probabilidadCritico,
    tiradaCritico,
    multiplicadorCritico,
    multiplicadorDanioMagico: multiplicadorFinal,
    multiplicadorAtributosMagicos: multiplicadorAtributos,
    multiplicadorPotenciaHabilidad:
      contextoPotenciaCalculado.multiplicadorHabilidad,
    potenciaHabilidad: contextoPotenciaCalculado.potenciaHabilidad,
    cantidadObjetosAportandoPotencia:
      contextoPotenciaCalculado.cantidadObjetosAportando ?? 0,
    componentes,
    componentesDanio: resolucion.componentes,
    desgloseDanio: resolucion.desgloseDanio,
    resistencias,
    resolucion,
    danioBruto: resolucion.danioBruto,
    danioCalculado: resolucion.danioCalculado,
    danioFinal: Number.isFinite(danioAplicado)
      ? danioAplicado
      : resolucion.danioCalculado,
    danio: Number.isFinite(danioAplicado)
      ? danioAplicado
      : resolucion.danioCalculado,
    objetivoDerrotado: estaDerrotado(objetivo),
    vidaObjetivoAntes,
    vidaObjetivoDespues: leerVidaActual(objetivo),
    vidaObjetivoMaxima,
  };
}

export function obtenerContextoPotenciaHabilidad(lanzador) {
  if (!lanzador || typeof lanzador !== "object") {
    return crearContextoPotenciaNeutro();
  }
  return crearContextoPotenciaHabilidad({ combatiente: lanzador });
}

export function obtenerMultiplicadorDanioMagico(lanzador) {
  const derivado = obtenerEstadisticas(lanzador)?.multiplicadorDanioMagico;
  if (Number.isFinite(derivado) && derivado > 0) return derivado;

  const funcion = AtributosMagicos.calcularMultiplicadorDanioMagico;
  if (typeof funcion !== "function") return 1;
  try {
    return funcion(leerAtributosMagicos(lanzador));
  } catch {
    return 1;
  }
}

export function obtenerMultiplicadorEfectos(lanzador) {
  const derivado = obtenerEstadisticas(lanzador)?.multiplicadorEfectos;
  if (Number.isFinite(derivado) && derivado > 0) return derivado;

  const funcion = AtributosMagicos.calcularMultiplicadorEfectos;
  if (typeof funcion !== "function") return 1;
  try {
    return funcion(leerAtributosMagicos(lanzador));
  } catch {
    return 1;
  }
}

function validarEntradaDanio({ lanzador, objetivo, componentesConfigurados }) {
  if (!lanzador || !objetivo) {
    throw new Error("El daño de habilidad necesita lanzador y objetivo.");
  }
  if (!Array.isArray(componentesConfigurados)) {
    throw new Error(
      "Los componentes de daño de la habilidad deben ser una lista.",
    );
  }
  if (componentesConfigurados.length === 0) {
    throw new Error("La habilidad necesita al menos un componente de daño.");
  }
  componentesConfigurados.forEach((componente, indice) => {
    if (!componente || typeof componente !== "object") {
      throw new Error(`El componente de daño ${indice + 1} no es válido.`);
    }
    if (typeof componente.tipo !== "string" || componente.tipo.trim() === "") {
      throw new Error(`El componente de daño ${indice + 1} necesita tipo.`);
    }
    if (!Number.isFinite(componente.valorBase) || componente.valorBase < 0) {
      throw new Error(
        `El valor base del componente de daño ${indice + 1} no es válido.`,
      );
    }
  });
  if (!encontrarMetodoDanio(objetivo)) {
    throw new Error(
      "El objetivo no expone un método compatible para recibir daño.",
    );
  }
}

function obtenerProbabilidadImpacto(lanzador, objetivo) {
  try {
    const probabilidad = calcularProbabilidadImpacto(lanzador, objetivo);
    return limitar(Number.isFinite(probabilidad) ? probabilidad : 100, 0, 100);
  } catch {
    return 100;
  }
}

function crearResultadoFallo({
  idEjecucion,
  probabilidadImpacto,
  tiradaImpacto,
  multiplicadorAtributos,
  contextoPotencia,
  vidaObjetivoAntes,
  vidaObjetivoMaxima,
}) {
  return {
    idEjecucion,
    impacto: false,
    critico: false,
    probabilidadImpacto,
    tiradaImpacto,
    probabilidadCritico: 0,
    tiradaCritico: null,
    multiplicadorCritico: 1,
    multiplicadorDanioMagico:
      multiplicadorAtributos * contextoPotencia.multiplicadorHabilidad,
    multiplicadorAtributosMagicos: multiplicadorAtributos,
    multiplicadorPotenciaHabilidad: contextoPotencia.multiplicadorHabilidad,
    potenciaHabilidad: contextoPotencia.potenciaHabilidad,
    cantidadObjetosAportandoPotencia:
      contextoPotencia.cantidadObjetosAportando ?? 0,
    componentes: [],
    componentesDanio: [],
    desgloseDanio: {},
    resistencias: {},
    resolucion: null,
    danioBruto: 0,
    danioCalculado: 0,
    danioFinal: 0,
    danio: 0,
    objetivoDerrotado: false,
    vidaObjetivoAntes,
    vidaObjetivoDespues: vidaObjetivoAntes,
    vidaObjetivoMaxima,
  };
}

function crearContextoPotenciaNeutro() {
  return Object.freeze({
    potenciaHabilidad: 0,
    multiplicadorHabilidad: 1,
    cantidadObjetosAportando: 0,
  });
}

function escalarDanioMagico(valorBase, multiplicador) {
  const funcion = AtributosMagicos.escalarDanioMagico;
  if (typeof funcion === "function") {
    try {
      const resultado = funcion(valorBase, multiplicador);
      if (Number.isFinite(resultado) && resultado >= 0) {
        return Math.max(0, Math.round(resultado));
      }
    } catch {
      // Se usa el cálculo directo con el mismo multiplicador.
    }
  }
  return Math.max(0, Math.round(valorBase * multiplicador));
}

function aplicarDanioFinal(objetivo, danioFinal, contexto) {
  const metodo = encontrarMetodoDanio(objetivo);
  if (!metodo) {
    throw new Error(
      "El objetivo no expone un método compatible para recibir daño.",
    );
  }
  return metodo.call(objetivo, Math.max(0, danioFinal), contexto);
}

function encontrarMetodoDanio(objetivo) {
  const nombres = [
    "recibirDanio",
    "recibirDaño",
    "aplicarDanio",
    "aplicarDaño",
  ];
  for (const nombre of nombres) {
    if (typeof objetivo?.[nombre] === "function") return objetivo[nombre];
  }
  return null;
}

function obtenerEstadisticas(combatiente) {
  try {
    return combatiente?.estadisticasDerivadas ?? null;
  } catch {
    return null;
  }
}

function leerAtributosMagicos(combatiente) {
  return {
    inteligencia: Math.max(1, leerAtributo(combatiente, "inteligencia")),
    sabiduria: Math.max(1, leerAtributo(combatiente, "sabiduria")),
  };
}

function leerAtributo(combatiente, idAtributo) {
  const metodos = ["obtenerAtributo", "getAtributo"];
  for (const nombre of metodos) {
    if (typeof combatiente?.[nombre] === "function") {
      try {
        const valor = combatiente[nombre](idAtributo);
        if (Number.isFinite(valor)) return valor;
      } catch {
        // Se prueban las propiedades directas.
      }
    }
  }
  const valor =
    combatiente?.[idAtributo] ??
    combatiente?.atributos?.[idAtributo] ??
    combatiente?.atributosBase?.[idAtributo] ??
    10;
  return Number.isFinite(valor) ? valor : 10;
}

function obtenerTirada(tipo) {
  const secuencia = TIRADAS_DETERMINISTAS[tipo];
  if (Array.isArray(secuencia) && secuencia.length > 0) {
    return secuencia.shift();
  }
  return Math.floor(Math.random() * 100) + 1;
}

function normalizarSecuenciaTiradas(valor, descripcion) {
  const secuencia = Array.isArray(valor)
    ? valor
    : Number.isFinite(valor)
      ? [valor]
      : [];
  return secuencia.map((tirada, indice) => {
    if (!Number.isInteger(tirada) || tirada < 1 || tirada > 100) {
      throw new Error(
        `La tirada de ${descripcion} ${indice + 1} debe ser un entero entre 1 y 100.`,
      );
    }
    return tirada;
  });
}

function leerVidaActual(objetivo) {
  const valor = objetivo?.vidaActual ?? objetivo?.vida;
  return Number.isFinite(valor) ? Math.max(0, valor) : null;
}

function leerVidaMaxima(objetivo) {
  const valor = objetivo?.vidaMaxima ?? objetivo?.vidaMax;
  return Number.isFinite(valor) ? Math.max(0, valor) : null;
}

function estaDerrotado(objetivo) {
  if (typeof objetivo?.estaDerrotado === "function") {
    return Boolean(objetivo.estaDerrotado());
  }
  if (typeof objetivo?.estaMuerto === "function") {
    return Boolean(objetivo.estaMuerto());
  }
  const vida = objetivo?.vidaActual ?? objetivo?.vida;
  return Number.isFinite(vida) ? vida <= 0 : false;
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}
