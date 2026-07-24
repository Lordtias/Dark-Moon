import {
  normalizarTipoDanio,
} from "../combate/ComponentesDanio.js";
import {
  CONFIGURACION_EFECTOS_TEMPORALES,
} from "../../config/ConfiguracionEfectosTemporales.js";

// Tipos mínimos exigidos por la ETAPA 2.
export const TIPOS_EFECTO_TEMPORAL = Object.freeze({
  DANIO_PERIODICO: "danio_periodico",
  MODIFICADOR_FACTOR: "modificador_factor",
  INMOVILIZACION: "inmovilizacion",
  ATURDIMIENTO: "aturdimiento",
});

export const TIPOS_EFECTO_TEMPORAL_VALIDOS = Object.freeze(
  Object.values(TIPOS_EFECTO_TEMPORAL),
);

// Las cuatro políticas se resuelven sobre una única instancia lógica.
// Acumular cantidad no crea calendarios independientes.
export const POLITICAS_ACUMULACION_EFECTO = Object.freeze({
  RENOVAR_DURACION: "renovar_duracion",
  ACUMULAR_INTENSIDAD: "acumular_intensidad",
  ACUMULAR_CANTIDAD: "acumular_cantidad",
  RECHAZAR_DUPLICADO: "rechazar_duplicado",
});

export const POLITICAS_ACUMULACION_VALIDAS = Object.freeze(
  Object.values(POLITICAS_ACUMULACION_EFECTO),
);

export const FACTORES_TEMPORALES_MODIFICABLES = Object.freeze([
  "factorTiempo",
  "factorMovimiento",
  "factorAtaque",
  "factorAccion",
  "factorConsumo",
]);

function validarObjeto(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}

function validarNumeroPositivo(valor, descripcion) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un número mayor que 0.`);
  }
}

function normalizarTexto(valor, descripcion, valorPredeterminado = null) {
  const texto = valor ?? valorPredeterminado;
  if (typeof texto !== "string" || texto.trim() === "") {
    throw new Error(`${descripcion} debe contener texto.`);
  }
  return texto.trim();
}

function normalizarEtiquetas(etiquetas = []) {
  if (!Array.isArray(etiquetas)) {
    throw new Error("Las etiquetas del efecto deben estar dentro de una lista.");
  }

  return Object.freeze(
    [...new Set(
      etiquetas.map((etiqueta) =>
        normalizarTexto(etiqueta, "Cada etiqueta").toLowerCase(),
      ),
    )],
  );
}

function crearDescriptorFuente(fuente) {
  if (fuente === null || fuente === undefined) {
    return Object.freeze({
      id: null,
      nombre: "Fuente desconocida",
      tipo: "desconocida",
    });
  }

  if (typeof fuente === "string") {
    return Object.freeze({
      id: fuente,
      nombre: fuente,
      tipo: "texto",
    });
  }

  validarObjeto(fuente, "La fuente del efecto");

  const nombreConstructor = fuente.constructor?.name;

  return Object.freeze({
    id: fuente.id ?? fuente.idEntidad ?? null,
    nombre: fuente.nombre ?? fuente.id ?? "Fuente desconocida",
    tipo:
      fuente.tipoEntidad ??
      (typeof nombreConstructor === "string" && nombreConstructor !== "Object"
        ? nombreConstructor
        : "objeto"),
  });
}

function normalizarComponentesDanio(componentesDanio) {
  if (!Array.isArray(componentesDanio) || componentesDanio.length === 0) {
    return null;
  }

  return Object.freeze(
    componentesDanio.map((componente, indice) => {
      validarObjeto(
        componente,
        `El componente de daño periódico ${indice + 1}`,
      );
      validarNumeroPositivo(
        componente.danioBruto,
        `El daño bruto del componente ${indice + 1}`,
      );

      return Object.freeze({
        tipo: normalizarTipoDanio(componente.tipo),
        danioBruto: componente.danioBruto,
      });
    }),
  );
}

function normalizarValorModificador(valor) {
  validarObjeto(valor, "El valor del modificador temporal");

  const modificadores = {};

  for (const [nombreFactor, multiplicador] of Object.entries(valor)) {
    if (!FACTORES_TEMPORALES_MODIFICABLES.includes(nombreFactor)) {
      throw new Error(
        `El factor temporal "${nombreFactor}" no puede modificarse.`,
      );
    }

    validarNumeroPositivo(
      multiplicador,
      `El multiplicador de "${nombreFactor}"`,
    );

    modificadores[nombreFactor] = multiplicador;
  }

  if (Object.keys(modificadores).length === 0) {
    throw new Error("El modificador temporal necesita al menos un factor.");
  }

  return Object.freeze(modificadores);
}

function normalizarValorSegunTipo({
  tipo,
  valor,
  tipoDanio,
  componentesDanio,
}) {
  switch (tipo) {
    case TIPOS_EFECTO_TEMPORAL.DANIO_PERIODICO: {
      const componentes = normalizarComponentesDanio(componentesDanio);

      if (componentes) {
        return {
          valor: Number.isFinite(valor) && valor > 0 ? valor : 1,
          tipoDanio: null,
          componentesDanio: componentes,
        };
      }

      validarNumeroPositivo(valor, "El valor del daño periódico");

      return {
        valor,
        tipoDanio: normalizarTipoDanio(tipoDanio),
        componentesDanio: null,
      };
    }

    case TIPOS_EFECTO_TEMPORAL.MODIFICADOR_FACTOR:
      return {
        valor: normalizarValorModificador(valor),
        tipoDanio: null,
        componentesDanio: null,
      };

    case TIPOS_EFECTO_TEMPORAL.INMOVILIZACION:
    case TIPOS_EFECTO_TEMPORAL.ATURDIMIENTO:
      return {
        valor: Number.isFinite(valor) && valor > 0 ? valor : 1,
        tipoDanio: null,
        componentesDanio: null,
      };

    default:
      throw new Error(`El tipo de efecto temporal "${tipo}" no es válido.`);
  }
}

// Normaliza una definición independiente de cualquier habilidad concreta.
export function normalizarDefinicionEfectoTemporal(definicion = {}) {
  validarObjeto(definicion, "La definición del efecto temporal");

  if (!definicion.objetivo || typeof definicion.objetivo !== "object") {
    throw new Error("El efecto temporal necesita un objetivo válido.");
  }

  const tipo = normalizarTexto(
    definicion.tipo,
    "El tipo de efecto temporal",
  ).toLowerCase();

  if (!TIPOS_EFECTO_TEMPORAL_VALIDOS.includes(tipo)) {
    throw new Error(`El tipo de efecto temporal "${tipo}" no es válido.`);
  }

  validarNumeroPositivo(definicion.duracion, "La duración del efecto");

  const politicaAcumulacion = normalizarTexto(
    definicion.politicaAcumulacion,
    "La política de acumulación",
    POLITICAS_ACUMULACION_EFECTO.RENOVAR_DURACION,
  ).toLowerCase();

  if (!POLITICAS_ACUMULACION_VALIDAS.includes(politicaAcumulacion)) {
    throw new Error(
      `La política de acumulación "${politicaAcumulacion}" no es válida.`,
    );
  }

  const maximoRecibido =
    definicion.maximo ??
    CONFIGURACION_EFECTOS_TEMPORALES.limites
      .maximoAcumulacionesPredeterminado;
  validarNumeroPositivo(maximoRecibido, "El máximo de acumulación");
  if (maximoRecibido < 1) {
    throw new Error("El máximo de acumulación debe ser igual o mayor que 1.");
  }

  const maximo =
    politicaAcumulacion ===
    POLITICAS_ACUMULACION_EFECTO.ACUMULAR_CANTIDAD
      ? Math.max(1, Math.floor(maximoRecibido))
      : maximoRecibido;

  const incremento = definicion.incremento ?? 1;
  validarNumeroPositivo(incremento, "El incremento de acumulación");

  let intervalo = definicion.intervalo ?? null;

  if (tipo === TIPOS_EFECTO_TEMPORAL.DANIO_PERIODICO) {
    validarNumeroPositivo(intervalo, "El intervalo del daño periódico");

    if (intervalo > definicion.duracion) {
      throw new Error(
        "El intervalo del daño periódico no puede superar su duración.",
      );
    }
  } else if (intervalo !== null) {
    validarNumeroPositivo(intervalo, "El intervalo del efecto");
  }

  const valores = normalizarValorSegunTipo({
    tipo,
    valor: definicion.valor,
    tipoDanio: definicion.tipoDanio,
    componentesDanio: definicion.componentesDanio,
  });

  const idDefinicion =
    definicion.idDefinicion === null ||
    definicion.idDefinicion === undefined
      ? null
      : normalizarTexto(definicion.idDefinicion, "El ID de definición");

  const grupoAcumulacion = normalizarTexto(
    definicion.grupoAcumulacion,
    "El grupo de acumulación",
    idDefinicion ?? tipo,
  ).toLowerCase();

  return Object.freeze({
    idDefinicion,
    grupoAcumulacion,
    fuente: crearDescriptorFuente(definicion.fuente),
    objetivo: definicion.objetivo,
    tipo,
    valor: valores.valor,
    tipoDanio: valores.tipoDanio,
    componentesDanio: valores.componentesDanio,
    duracion: definicion.duracion,
    intervalo,
    politicaAcumulacion,
    maximo,
    incremento,
    etiquetas: normalizarEtiquetas(definicion.etiquetas),
    beneficioso: definicion.beneficioso === true,
  });
}
