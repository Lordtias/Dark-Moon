import {
  calcularCostoAccionCombatiente,
  TIEMPO_REFERENCIA,
  TIPOS_ACCION_TEMPORAL,
} from "../../juego/tiempo/SistemaTiempo.js";

import { obtenerPresentacionRarezaObjeto } from "./ContextoPresentacionObjetos.js";

const ETIQUETAS_TIPO = Object.freeze({
  arma: "Arma",
  armadura: "Armadura",
  quiver: "Carcaj",
  municion: "Munición",
  consumible: "Consumible",
  material: "Material",
});

const ETIQUETAS_ATRIBUTO = Object.freeze({
  fuerza: "Fuerza",
  destreza: "Destreza",
  constitucion: "Constitución",
  inteligencia: "Inteligencia",
  sabiduria: "Sabiduría",
  carisma: "Carisma",
});

const ETIQUETAS_TIPO_ATAQUE = Object.freeze({
  cuerpoACuerpo: "Cuerpo a cuerpo",
  distancia: "Distancia",
});

const ETIQUETAS_PATRON_ATAQUE = Object.freeze({
  adyacente: "Adyacente",
  lineal: "Lineal",
  libre: "Libre",
});

const ETIQUETAS_EFECTO = Object.freeze({
  recuperarVida: "Recupera Vida",
  recuperarMana: "Recupera Maná",
});

const PRESENTACION_VALORES_AFIJO = Object.freeze({
  danioFisicoLocalPorcentaje: {
    etiqueta: "daño físico local",
    porcentaje: true,
  },

  armadura: {
    etiqueta: "Armadura",
  },

  vidaMaxima: {
    etiqueta: "Vida máxima",
  },

  manaMaximo: {
    etiqueta: "Maná máximo",
  },

  precision: {
    etiqueta: "Precisión",
  },

  probabilidadCritico: {
    etiqueta: "probabilidad de crítico",
    porcentaje: true,
  },

  multiplicadorCritico: {
    etiqueta: "multiplicador crítico",
  },

  evasion: {
    etiqueta: "Evasión",
  },

  regeneracionVida: {
    etiqueta: "regeneración de Vida",
  },

  regeneracionMana: {
    etiqueta: "regeneración de Maná",
  },

  resistenciaFuego: {
    etiqueta: "resistencia al fuego",
    porcentaje: true,
  },

  resistenciaFrio: {
    etiqueta: "resistencia al frío",
    porcentaje: true,
  },

  resistenciaRayo: {
    etiqueta: "resistencia al rayo",
    porcentaje: true,
  },

  resistenciaVeneno: {
    etiqueta: "resistencia al veneno",
    porcentaje: true,
  },

  probabilidadBloqueo: {
    etiqueta: "probabilidad de bloqueo",
    porcentaje: true,
  },

  mitigacionBloqueo: {
    etiqueta: "mitigación al bloquear",
    porcentaje: true,
  },
});

// Convierte una instancia de Objeto en un modelo visual
// sencillo que puede utilizar un modal, una ventana de botín,
// un comercio o cualquier otra interfaz futura.
export function crearPresentacionObjeto({ objeto, combatiente = null } = {}) {
  validarObjeto(objeto);

  const esMaterial = objeto.tipo === "material";

  return {
    nombre: objeto.nombre,

    subtitulo: crearSubtitulo(objeto),

    descripcion:
      objeto.descripcion.trim() !== ""
        ? objeto.descripcion
        : "Este objeto no tiene una descripción disponible.",

    recursoVisual: normalizarRuta(objeto.recursoVisual),

    cantidad: Number.isInteger(objeto.cantidad) ? objeto.cantidad : 1,

    rareza: obtenerPresentacionRarezaObjeto(objeto.rareza),

    nivelObjeto: Number.isInteger(objeto.nivelObjeto) ? objeto.nivelObjeto : 1,

    // Rareza y nivel son información relevante
    // para bases equipables con afijos.
    //
    // Materiales, municiones y consumibles conservan
    // una presentación más compacta.
    mostrarMetadatosGeneracion: objeto.esEquipable === true,

    // Peso y valor se presentan en la cabecera.
    //
    // El valor mostrado es el valor propio del objeto,
    // antes de aplicar rareza, mercader o Carisma.
    informacionComercial: crearInformacionComercial(objeto),

    afijos: crearPresentacionAfijos(objeto),

    estadisticas: crearEstadisticasObjeto({
      objeto,
      combatiente,
    }),

    mostrarMensajeSinEstadisticas: !esMaterial,
  };
}

function crearSubtitulo(objeto) {
  const tipo =
    ETIQUETAS_TIPO[objeto.tipo] ?? formatearIdentificador(objeto.tipo);

  if (objeto.esArma) {
    const manos = objeto.propiedades.manos;

    return `${tipo} · ${manos} ` + (manos === 1 ? "mano" : "manos");
  }

  if (objeto.esArmadura) {
    const ranuras = objeto.ranurasCompatibles
      .map(formatearIdentificador)
      .join(" / ");

    return ranuras !== "" ? `${tipo} · ${ranuras}` : tipo;
  }

  return tipo;
}

// Crea la información compacta que aparece
// junto al título del objeto.
//
// Casos tratados:
//
// - Objeto individual: muestra un único peso y valor.
// - Pila: muestra valor/peso unitario y total.
// - Contenedor: muestra valor/peso propio y con contenido.
// - No vendible: reemplaza el valor por una etiqueta.
function crearInformacionComercial(objeto) {
  const informacion = [
    {
      tipo: "peso",
      etiqueta: "Peso",
      valor: crearTextoMagnitudComercial({
        objeto,

        valorUnitario: obtenerNumeroNoNegativo(objeto.pesoUnitario),

        valorTotal: obtenerNumeroNoNegativo(objeto.pesoTotal),

        formateador: formatearPeso,
      }),
    },
  ];

  if (objeto.vendible === false) {
    informacion.push({
      tipo: "no-vendible",
      etiqueta: "No vendible",
      valor: "",
    });

    return informacion;
  }

  informacion.push({
    tipo: "valor",
    etiqueta: "Valor",
    valor: crearTextoMagnitudComercial({
      objeto,

      valorUnitario: obtenerNumeroNoNegativo(objeto.valorBase),

      valorTotal: obtenerNumeroNoNegativo(objeto.valorBaseTotal),

      formateador: formatearMonedas,
    }),
  });

  return informacion;
}

function crearTextoMagnitudComercial({
  objeto,
  valorUnitario,
  valorTotal,
  formateador,
}) {
  const cantidad =
    Number.isInteger(objeto.cantidad) && objeto.cantidad > 0
      ? objeto.cantidad
      : 1;

  const tieneContenedor =
    objeto.contenedorObjetos &&
    typeof objeto.contenedorObjetos.obtenerObjetos === "function";

  // En un carcaj u otro contenedor futuro,
  // el valor unitario representa el objeto vacío
  // y el total también contempla su contenido.
  if (tieneContenedor) {
    return (
      `${formateador(valorUnitario)} propio` +
      ` · ${formateador(valorTotal)} total`
    );
  }

  // Solamente mostramos dos magnitudes cuando
  // realmente existe una pila con más de una unidad.
  if (objeto.apilable === true && cantidad > 1) {
    return (
      `${formateador(valorUnitario)} c/u` +
      ` · ${formateador(valorTotal)} total`
    );
  }

  return formateador(valorTotal);
}

function crearPresentacionAfijos(objeto) {
  const afijos = Array.isArray(objeto.afijos) ? objeto.afijos : [];

  return afijos.map((afijo) => ({
    id: afijo.id,

    tipo: afijo.tipoAfijo,

    tipoEtiqueta: afijo.tipoAfijo === "prefijo" ? "Prefijo" : "Sufijo",

    nombre: afijo.nombre,

    grado: afijo.grado,

    descripcion: typeof afijo.descripcion === "string" ? afijo.descripcion : "",

    efectos: crearTextosEfectosAfijo(afijo),
  }));
}

function crearTextosEfectosAfijo(afijo) {
  const valores = afijo.valores ?? {};

  const textos = [];
  const propiedadesProcesadas = new Set();

  const minimoLocal = valores.danioFisicoLocalMinimo;

  const maximoLocal = valores.danioFisicoLocalMaximo;

  if (Number.isFinite(minimoLocal) && Number.isFinite(maximoLocal)) {
    textos.push(
      `Agrega ${formatearNumeroFlexible(minimoLocal)}` +
        `–${formatearNumeroFlexible(maximoLocal)}` +
        " de daño físico local",
    );

    propiedadesProcesadas.add("danioFisicoLocalMinimo");

    propiedadesProcesadas.add("danioFisicoLocalMaximo");
  }

  for (const [propiedad, valor] of Object.entries(valores)) {
    if (propiedadesProcesadas.has(propiedad) || !Number.isFinite(valor)) {
      continue;
    }

    const configuracion = PRESENTACION_VALORES_AFIJO[propiedad];

    if (!configuracion) {
      textos.push(
        `${formatearNumeroConSignoFlexible(valor)} ` +
          `${formatearIdentificador(propiedad)}`,
      );

      continue;
    }

    const valorFormateado = formatearNumeroConSignoFlexible(valor);

    textos.push(
      configuracion.porcentaje
        ? `${valorFormateado} % de ${configuracion.etiqueta}`
        : `${valorFormateado} de ${configuracion.etiqueta}`,
    );
  }

  if (
    textos.length === 0 &&
    typeof afijo.descripcion === "string" &&
    afijo.descripcion.trim() !== ""
  ) {
    textos.push(afijo.descripcion.trim());
  }

  return textos;
}

function crearEstadisticasObjeto({ objeto, combatiente }) {
  if (objeto.esArma) {
    return crearEstadisticasArma({
      objeto,
      combatiente,
    });
  }

  if (objeto.esArmadura) {
    return crearEstadisticasArmadura(objeto);
  }

  if (objeto.esQuiver) {
    return crearEstadisticasQuiver(objeto);
  }

  if (objeto.esMunicion) {
    return crearEstadisticasMunicion(objeto);
  }

  if (objeto.esConsumible) {
    return crearEstadisticasConsumible(objeto);
  }

  if (objeto.tipo === "material") {
    return [];
  }

  return crearEstadisticasGenericas(objeto);
}

function crearEstadisticasArma({ objeto, combatiente }) {
  const propiedades = objeto.propiedades;

  const costoBase = propiedades.costoAtaque;

  const costoEfectivo = combatiente
    ? calcularCostoAccionCombatiente({
        combatiente,

        tipoAccion: TIPOS_ACCION_TEMPORAL.ATAQUE,

        costoBase,
      })
    : costoBase;

  const velocidadAtaque = TIEMPO_REFERENCIA / costoEfectivo;

  const rangoLocal = calcularRangoDanioFisicoLocal(propiedades);

  const estadisticas = [
    crearEstadistica(
      "Daño físico",

      `${formatearNumero(rangoLocal.minimo)} – ` +
        `${formatearNumero(rangoLocal.maximo)}`,
    ),

    crearEstadistica(
      "Atributo",

      ETIQUETAS_ATRIBUTO[propiedades.atributoAtaque] ??
        formatearIdentificador(propiedades.atributoAtaque),
    ),

    crearEstadistica(
      "Precisión",

      formatearNumeroConSigno(propiedades.precision),
    ),

    crearEstadistica(
      "Velocidad de ataque",

      `${formatearNumero(velocidadAtaque, 2)} ataques/s`,
    ),

    crearEstadistica(
      "Crítico",

      `${formatearNumero(
        propiedades.probabilidadCritico,
      )} % × ${formatearNumero(propiedades.multiplicadorCritico, 2)}`,
    ),

    crearEstadistica(
      "Alcance",

      formatearNumero(propiedades.alcance),
    ),

    crearEstadistica(
      "Tipo de ataque",

      ETIQUETAS_TIPO_ATAQUE[propiedades.tipoAtaque] ??
        formatearIdentificador(propiedades.tipoAtaque),
    ),

    crearEstadistica(
      "Patrón",

      ETIQUETAS_PATRON_ATAQUE[propiedades.patronAtaque] ??
        formatearIdentificador(propiedades.patronAtaque),
    ),

    crearEstadistica(
      "Manos",

      formatearNumero(propiedades.manos),
    ),
  ];

  if (propiedades.requiereQuiver) {
    estadisticas.push(
      crearEstadistica(
        "Munición",

        formatearIdentificador(propiedades.tipoMunicion),
      ),
    );
  }

  return estadisticas;
}

// Reproduce exactamente la parte local de la fórmula
// utilizada por EstadisticasDerivadas.
function calcularRangoDanioFisicoLocal(propiedades) {
  const minimoBase = propiedades.danioFisicoMinimo;

  const maximoBase = propiedades.danioFisicoMaximo;

  const planoMinimo = propiedades.danioFisicoLocalMinimo ?? 0;

  const planoMaximo = propiedades.danioFisicoLocalMaximo ?? 0;

  const porcentaje = (propiedades.danioFisicoLocalPorcentaje ?? 0) / 100;

  const minimo = Math.max(
    0,

    Math.floor((minimoBase + planoMinimo) * (1 + porcentaje)),
  );

  const maximo = Math.max(
    minimo,

    Math.ceil((maximoBase + planoMaximo) * (1 + porcentaje)),
  );

  return {
    minimo,
    maximo,
  };
}

function crearEstadisticasArmadura(objeto) {
  const propiedades = objeto.propiedades;

  const estadisticas = [
    crearEstadistica(
      "Armadura",

      formatearNumero(propiedades.armadura ?? 0),
    ),
  ];

  if (
    Number.isFinite(propiedades.probabilidadBloqueo) &&
    propiedades.probabilidadBloqueo > 0
  ) {
    estadisticas.push(
      crearEstadistica(
        "Bloqueo",

        `${formatearNumero(propiedades.probabilidadBloqueo)} %`,
      ),
    );
  }

  if (
    Number.isFinite(propiedades.mitigacionBloqueo) &&
    propiedades.mitigacionBloqueo > 0
  ) {
    estadisticas.push(
      crearEstadistica(
        "Mitigación de bloqueo",

        `${formatearNumero(propiedades.mitigacionBloqueo)} %`,
      ),
    );
  }

  return estadisticas;
}

function crearEstadisticasQuiver(objeto) {
  const contenedor = objeto.contenedorObjetos;

  const objetos = contenedor?.obtenerObjetos?.() ?? [];

  const cantidadMunicion = objetos.reduce(
    (total, objetoContenido) =>
      total +
      (Number.isInteger(objetoContenido.cantidad)
        ? objetoContenido.cantidad
        : 1),

    0,
  );

  return [
    crearEstadistica(
      "Tipo de munición",

      formatearIdentificador(objeto.propiedades.tipoMunicion),
    ),

    crearEstadistica(
      "Capacidad",

      `${contenedor?.capacidad ?? 0} pila`,
    ),

    crearEstadistica(
      "Contenido",

      `${cantidadMunicion} unidades`,
    ),
  ];
}

function crearEstadisticasMunicion(objeto) {
  return [
    crearEstadistica(
      "Tipo de munición",

      formatearIdentificador(objeto.propiedades.tipoMunicion),
    ),

    crearEstadistica(
      "Cantidad",

      formatearNumero(objeto.cantidad),
    ),

    crearEstadistica(
      "Máximo por pila",

      formatearNumero(objeto.cantidadMaxima),
    ),
  ];
}

function crearEstadisticasConsumible(objeto) {
  const efectos = objeto.propiedades.efectos ?? [];

  const estadisticas = efectos.map((efecto) =>
    crearEstadistica(
      ETIQUETAS_EFECTO[efecto.tipo] ?? formatearIdentificador(efecto.tipo),

      formatearNumero(efecto.cantidad),
    ),
  );

  estadisticas.push(
    crearEstadistica(
      "Cantidad",

      formatearNumero(objeto.cantidad),
    ),
  );

  return estadisticas;
}

function crearEstadisticasGenericas(objeto) {
  const estadisticas = [];

  if (objeto.apilable) {
    estadisticas.push(
      crearEstadistica(
        "Cantidad",

        formatearNumero(objeto.cantidad),
      ),

      crearEstadistica(
        "Máximo por pila",

        formatearNumero(objeto.cantidadMaxima),
      ),
    );
  }

  return estadisticas;
}

function crearEstadistica(etiqueta, valor) {
  return {
    etiqueta,
    valor,
  };
}

function obtenerNumeroNoNegativo(valor) {
  return Number.isFinite(valor) && valor >= 0 ? valor : 0;
}

function validarObjeto(objeto) {
  if (
    !objeto ||
    typeof objeto !== "object" ||
    typeof objeto.nombre !== "string" ||
    typeof objeto.tipo !== "string"
  ) {
    throw new Error("Se necesita un objeto válido para crear su presentación.");
  }
}

function normalizarRuta(ruta) {
  return typeof ruta === "string" && ruta.trim() !== "" ? ruta.trim() : null;
}

function formatearNumero(valor, decimalesMaximos = 0) {
  if (!Number.isFinite(valor)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "es-UY",

    {
      minimumFractionDigits: decimalesMaximos,

      maximumFractionDigits: decimalesMaximos,
    },
  ).format(valor);
}

function formatearNumeroFlexible(valor) {
  if (!Number.isFinite(valor)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "es-UY",

    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(valor);
}

function formatearPeso(valor) {
  return new Intl.NumberFormat(
    "es-UY",

    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    },
  ).format(valor);
}

function formatearMonedas(valor) {
  return new Intl.NumberFormat(
    "es-UY",

    {
      maximumFractionDigits: 0,
    },
  ).format(Math.round(valor));
}

function formatearNumeroConSigno(valor) {
  if (!Number.isFinite(valor)) {
    return "—";
  }

  const signo = valor > 0 ? "+" : "";

  return `${signo}` + `${formatearNumero(valor)}`;
}

function formatearNumeroConSignoFlexible(valor) {
  if (!Number.isFinite(valor)) {
    return "—";
  }

  const signo = valor > 0 ? "+" : "";

  return `${signo}` + `${formatearNumeroFlexible(valor)}`;
}

function formatearIdentificador(valor) {
  if (typeof valor !== "string" || valor.trim() === "") {
    return "—";
  }

  const texto = valor
    .replace(/([a-záéíóúñ])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim()
    .toLowerCase();

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
