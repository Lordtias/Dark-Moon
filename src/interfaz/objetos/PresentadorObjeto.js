import {
  calcularCostoAccionCombatiente,
  TIEMPO_REFERENCIA,
  TIPOS_ACCION_TEMPORAL,
} from "../../juego/tiempo/SistemaTiempo.js";

// Etiquetas utilizadas para traducir los IDs internos
// a textos más claros dentro de la interfaz.
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

    // La cantidad continúa siendo información contextual
    // de la pila y se muestra en la cabecera cuando
    // existen dos o más unidades.
    cantidad: Number.isInteger(objeto.cantidad) ? objeto.cantidad : 1,

    estadisticas: crearEstadisticasObjeto({
      objeto,
      combatiente,
    }),

    // Un material puede no tener estadísticas porque
    // su valor se encuentra en su identidad, descripción
    // y futuros usos de fabricación o misión.
    //
    // Por eso no mostramos un mensaje indicando
    // que carece de propiedades especiales.
    mostrarMensajeSinEstadisticas: !esMaterial,
  };
}

// Crea un subtítulo corto para identificar rápidamente
// la categoría y las características principales del objeto.
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

// Selecciona únicamente las estadísticas que tienen sentido
// para el tipo concreto del objeto.
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

  // La cantidad de una pila no es una propiedad
  // intrínseca del material.
  //
  // Tampoco mostramos su máximo por pila como
  // una característica del objeto.
  if (objeto.tipo === "material") {
    return [];
  }

  return crearEstadisticasGenericas(objeto);
}

// Presenta las propiedades ofensivas de un arma.
//
// La velocidad de ataque utiliza exactamente los mismos
// factores temporales que una acción real de ataque:
//
// - Coste configurado en el arma.
// - factorTiempo del combatiente.
// - factorAtaque del combatiente.
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

  // Cien unidades temporales representan un segundo.
  //
  // Por ejemplo:
  //
  // 90 unidades = 0,90 segundos
  // 100 / 90 = 1,11 ataques por segundo.
  const velocidadAtaque = TIEMPO_REFERENCIA / costoEfectivo;

  const estadisticas = [
    crearEstadistica(
      "Daño físico",

      `${formatearNumero(propiedades.danioFisicoMinimo)} – ${formatearNumero(
        propiedades.danioFisicoMaximo,
      )}`,
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

// Presenta armadura y bloqueo.
//
// Los valores que no aportan nada se omiten
// para evitar ruido visual.
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

// Muestra la capacidad y el contenido actual
// de un carcaj.
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

// Presenta el tipo de munición
// y el tamaño actual de la pila.
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

// Convierte los efectos configurables de un consumible
// en filas legibles para el jugador.
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

// Mantiene un respaldo para futuros tipos
// de objetos apilables que todavía no tengan
// una presentación específica.
//
// Los materiales no llegan a esta función.
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

  return new Intl.NumberFormat("es-UY", {
    minimumFractionDigits: decimalesMaximos,

    maximumFractionDigits: decimalesMaximos,
  }).format(valor);
}

function formatearNumeroConSigno(valor) {
  if (!Number.isFinite(valor)) {
    return "—";
  }

  const signo = valor > 0 ? "+" : "";

  return `${signo}` + `${formatearNumero(valor)}`;
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
