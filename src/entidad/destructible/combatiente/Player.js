import { Combatiente } from "./Combatiente.js";
import {
  calcularExperienciaNecesaria,
  calcularPuntosAtributoGanados,
} from "../../../juego/progresion/SistemaProgresion.js";
import {
  interactuarConObjetoInventario,
  desequiparObjetoAInventario,
} from "../../../juego/inventario/SistemaInventarioEquipamiento.js";
import {
  capturarEstadoRecursos,
  restaurarRecursosTrasRecalculo,
} from "../../../juego/magia/CalculadorAtributosMagicos.js";
import {
  crearProgresoHabilidadesParaPersonaje,
  obtenerConfiguracionProgresoHabilidades,
} from "../../../juego/maestrias/ContextoProgresoHabilidades.js";
import { PercepcionJugador } from "../../../juego/visibilidad/PercepcionJugador.js";

const ATRIBUTOS_VALIDOS = [
  "fuerza",
  "destreza",
  "constitucion",
  "inteligencia",
  "sabiduria",
  "carisma",
];

// Player conserva responsabilidades propias del personaje:
//
// - Progresión general y atributos.
// - Progresión de habilidades delegada a ProgresoHabilidadesJugador.
// - Inventario, equipamiento, recursos y oro.
//
// El nivel de una maestría no se mezcla con atributos ni estadísticas
// derivadas. Tampoco modifica daño, Maná, efectos o tiempo por sí mismo.
export class Player extends Combatiente {
  constructor({
    nombre,
    nivel = 1,
    x = 0,
    y = 0,
    atributos,
    estadisticasBase,
    ataqueNatural = null,
    factoresTemporales = {},
    idProfesion = null,
    clasePersonaje = "Aventurero",
    recursoVisual = null,
    experiencia = 0,
    puntosAtributoDisponibles = 0,
    oro = 100,
    capacidadInventario = 12,
    objetosInventarioIniciales = [],
    ranurasEquipamiento = [
      "cabeza",
      "torso",
      "manos",
      "piernas",
      "pies",
      "arma",
      "secundaria",
      "collar",
      "anillo_derecho",
      "anillo_izquierdo",
    ],
    equipamientoInicial = [],
    estadoProgresoHabilidades = null,
  } = {}) {
    super({
      nombre,
      nivel,
      x,
      y,
      atributos,
      estadisticasBase,
      ataqueNatural,
      factoresTemporales,
      simbolo: "@",
      capacidadContenedor: capacidadInventario,
      objetosIniciales: objetosInventarioIniciales,
      ranurasEquipamiento,
      equipamientoInicial,
    });

    this.aplicaBonoConstitucionResistenciasEfectos = true;

    if (
      recursoVisual !== null &&
      (typeof recursoVisual !== "string" || recursoVisual.trim() === "")
    ) {
      throw new Error(
        `El recurso visual de ${nombre} debe ser una ruta válida.`,
      );
    }

    if (
      !Number.isInteger(puntosAtributoDisponibles) ||
      puntosAtributoDisponibles < 0
    ) {
      throw new Error(
        "Los puntos de atributo disponibles " +
          "deben ser un entero igual o mayor que 0.",
      );
    }

    validarCantidadOro({
      cantidad: oro,
      descripcion: "El oro inicial",
      permitirCero: true,
    });

    this.idProfesion = normalizarIdProfesion(idProfesion ?? clasePersonaje);
    this.clasePersonaje = clasePersonaje;
    this.recursoVisual = recursoVisual?.trim() ?? null;
    this.inventario = this.contenedorObjetos;

    this._oro = oro;
    this._experiencia = 0;
    this.experienciaTotal = 0;
    this.puntosAtributoDisponibles = puntosAtributoDisponibles;
    this.ultimoResultadoProgresion = null;

    this.progresoHabilidades = crearProgresoHabilidadesParaPersonaje({
      idProfesion: this.idProfesion,
      estadoInicial: estadoProgresoHabilidades,
    });

    // Percepción es independiente del nivel y de los seis atributos
    // principales. Sus modificadores futuros se administran por una vía
    // genérica para pasivas, auras, objetos o profesiones.
    this.sistemaPercepcion = new PercepcionJugador();

    if (experiencia > 0) {
      this.ganarExperiencia(experiencia);
    }
  }

  get oro() {
    return this._oro;
  }

  get experiencia() {
    return this._experiencia;
  }

  get experienciaNecesaria() {
    return calcularExperienciaNecesaria(this.nivel);
  }

  get porcentajeExperiencia() {
    return Math.min(100, (this._experiencia / this.experienciaNecesaria) * 100);
  }

  get puntosHabilidadUniversales() {
    return this.progresoHabilidades.obtenerPuntosUniversales();
  }

  get percepcion() {
    return this.sistemaPercepcion.actual;
  }

  get percepcionBase() {
    return this.sistemaPercepcion.base;
  }

  registrarModificadorPercepcion(configuracion) {
    return this.sistemaPercepcion.registrarModificador(configuracion);
  }

  retirarModificadorPercepcion(id) {
    return this.sistemaPercepcion.retirarModificador(id);
  }

  obtenerResumenPercepcion() {
    return this.sistemaPercepcion.obtenerResumen();
  }

  agregarOro(cantidad) {
    validarCantidadOro({
      cantidad,
      descripcion: "La cantidad de oro agregada",
    });

    this._oro += cantidad;

    return {
      exito: true,
      oroAgregado: cantidad,
      oroActual: this._oro,
    };
  }

  puedePagar(cantidad) {
    validarCantidadOro({
      cantidad,
      descripcion: "El precio consultado",
      permitirCero: true,
    });

    return this._oro >= cantidad;
  }

  gastarOro(cantidad) {
    validarCantidadOro({
      cantidad,
      descripcion: "La cantidad de oro gastada",
    });

    if (!this.puedePagar(cantidad)) {
      return {
        exito: false,
        oroGastado: 0,
        oroActual: this._oro,
        mensaje: "No tenés suficiente oro.",
      };
    }

    this._oro -= cantidad;

    return {
      exito: true,
      oroGastado: cantidad,
      oroActual: this._oro,
      mensaje: `Gastaste ${cantidad} monedas.`,
    };
  }

  ganarExperiencia(cantidad) {
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return {
        experienciaGanada: 0,
        nivelesGanados: 0,
        puntosGanados: 0,
        puntosAtributoGanados: 0,
        puntosUniversalesGanados: 0,
        nivelActual: this.nivel,
      };
    }

    const estadoRecursosAnterior = capturarEstadoRecursos(this);

    this._experiencia += cantidad;
    this.experienciaTotal += cantidad;

    let nivelesGanados = 0;
    let puntosAtributoGanados = 0;
    let puntosUniversalesGanados = 0;
    const configuracionProgreso = obtenerConfiguracionProgresoHabilidades();

    while (this._experiencia >= calcularExperienciaNecesaria(this.nivel)) {
      const experienciaRequerida = calcularExperienciaNecesaria(this.nivel);

      this._experiencia -= experienciaRequerida;
      this.nivel++;
      nivelesGanados++;

      const puntosAtributoNivel = calcularPuntosAtributoGanados(this.nivel);
      this.puntosAtributoDisponibles += puntosAtributoNivel;
      puntosAtributoGanados += puntosAtributoNivel;

      const puntosUniversalesNivel =
        configuracionProgreso.reglas.puntosUniversalesPorNivelGeneral;
      this.progresoHabilidades.agregarPuntosUniversales(puntosUniversalesNivel);
      puntosUniversalesGanados += puntosUniversalesNivel;
    }

    if (nivelesGanados > 0) {
      // La Vida conserva el faltante previo y el Maná su proporción.
      this.estadisticasDerivadas;
      restaurarRecursosTrasRecalculo(this, estadoRecursosAnterior);
    }

    const resultado = {
      experienciaGanada: cantidad,
      nivelesGanados,
      // Alias de compatibilidad: antes representaba solamente atributos.
      puntosGanados: puntosAtributoGanados,
      puntosAtributoGanados,
      puntosUniversalesGanados,
      nivelActual: this.nivel,
    };

    this.ultimoResultadoProgresion = resultado;
    return resultado;
  }

  asignarPuntoAtributo(nombreAtributo) {
    if (!ATRIBUTOS_VALIDOS.includes(nombreAtributo)) {
      throw new Error(`El atributo "${nombreAtributo}" no existe.`);
    }

    if (this.puntosAtributoDisponibles <= 0) {
      return {
        exito: false,
        mensaje: "No tenés puntos de atributo disponibles.",
      };
    }

    const estadoRecursosAnterior = capturarEstadoRecursos(this);

    this.atributos[nombreAtributo]++;
    this.puntosAtributoDisponibles--;

    this.estadisticasDerivadas;
    restaurarRecursosTrasRecalculo(this, estadoRecursosAnterior);

    return {
      exito: true,
      mensaje:
        `${nombreAtributo} aumentó a ` + `${this.atributos[nombreAtributo]}.`,
    };
  }

  obtenerResumenProgresoHabilidades() {
    return this.progresoHabilidades.obtenerResumen();
  }

  registrarExperienciaMaestria(evento) {
    return this.progresoHabilidades.registrarEjecucionEfectiva(evento);
  }

  agregarExperienciaMaestria(datos) {
    return this.progresoHabilidades.agregarExperienciaMaestria(datos);
  }

  mejorarHabilidad(datos) {
    return this.progresoHabilidades.mejorarHabilidad(datos);
  }

  obtenerGradoHabilidad(idHabilidad) {
    return this.progresoHabilidades.obtenerGradoHabilidad(idHabilidad);
  }

  obtenerPuntosUniversales() {
    return this.progresoHabilidades.obtenerPuntosUniversales();
  }

  exportarProgresoHabilidades() {
    return this.progresoHabilidades.exportarEstado();
  }

  restaurarProgresoHabilidades(estado) {
    return this.progresoHabilidades.restaurarEstado(estado);
  }

  // La persistencia durable utiliza esta operación para restaurar un nivel
  // sin volver a conceder puntos por cada transición histórica.
  restaurarProgresionGeneral({
    nivel,
    experiencia,
    experienciaTotal,
    puntosAtributoDisponibles,
  } = {}) {
    validarEnteroPositivo(nivel, "El nivel guardado");
    validarEnteroNoNegativo(experiencia, "La experiencia general guardada");
    validarEnteroNoNegativo(experienciaTotal, "La experiencia total guardada");
    validarEnteroNoNegativo(
      puntosAtributoDisponibles,
      "Los puntos de atributo guardados",
    );

    if (experiencia >= calcularExperienciaNecesaria(nivel)) {
      throw new Error(
        "La experiencia guardada debería haber producido otro nivel.",
      );
    }

    this.nivel = nivel;
    this._experiencia = experiencia;
    this.experienciaTotal = experienciaTotal;
    this.puntosAtributoDisponibles = puntosAtributoDisponibles;
    this.ultimoResultadoProgresion = null;

    this.estadisticasDerivadas;

    return {
      exito: true,
      nivel: this.nivel,
      experiencia: this._experiencia,
    };
  }

  restaurarOro(cantidad) {
    validarCantidadOro({
      cantidad,
      descripcion: "El oro guardado",
      permitirCero: true,
    });
    this._oro = cantidad;
    return this._oro;
  }

  interactuarConObjetoInventario(indiceInventario) {
    return interactuarConObjetoInventario(this, indiceInventario);
  }

  desequiparObjetoAInventario(nombreRanura) {
    return desequiparObjetoAInventario(this, nombreRanura);
  }
}

function normalizarIdProfesion(valor) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error("La profesión del jugador debe ser válida.");
  }

  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function validarEnteroPositivo(valor, descripcion) {
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un entero mayor que 0.`);
  }
}

function validarEnteroNoNegativo(valor, descripcion) {
  if (!Number.isSafeInteger(valor) || valor < 0) {
    throw new Error(`${descripcion} debe ser un entero igual o mayor que 0.`);
  }
}

// El oro se maneja siempre como monedas enteras.
function validarCantidadOro({ cantidad, descripcion, permitirCero = false }) {
  const minimo = permitirCero ? 0 : 1;

  if (!Number.isSafeInteger(cantidad) || cantidad < minimo) {
    throw new Error(
      `${descripcion} debe ser un entero ` +
        `${permitirCero ? "igual o mayor" : "mayor"} que 0.`,
    );
  }
}
