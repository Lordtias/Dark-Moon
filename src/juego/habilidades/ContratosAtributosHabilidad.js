// Registro canónico de atributos internos modificables de una habilidad.
// Cada clave define una magnitud concreta, su unidad semántica y un consumidor
// real. Toda clave desconocida falla explícitamente: nunca se ignora.
export const ATRIBUTOS_HABILIDAD = Object.freeze({
  // Maná consumido por una ejecución confirmada de la habilidad.
  COSTO_MANA: "costoMana",
  // Tiempo base propio de la habilidad antes de factores globales de acción/tiempo.
  COSTO_TEMPORAL: "costoTemporal",
  // Distancia máxima en casillas entre lanzador y centro/objetivo seleccionado.
  ALCANCE: "alcance",
  // Radio en casillas de una forma de impacto radial.
  RADIO_IMPACTO: "radioImpacto",
  // Longitud máxima en casillas de una forma de impacto lineal.
  LONGITUD_LINEA: "longitudLinea",
  // Ancho transversal en casillas de una forma de impacto lineal.
  ANCHO_LINEA: "anchoLinea",
  // Cantidad máxima de objetivos distintos alcanzables por una cadena.
  CANTIDAD_OBJETIVOS: "cantidadObjetivos",
  // Distancia máxima en casillas permitida entre dos saltos consecutivos.
  ALCANCE_SALTO: "alcanceSalto",
  // Multiplicador de daño aplicado a cada salto posterior de una cadena.
  FACTOR_DANIO_POR_SALTO: "factorDanioPorSalto",
  // Probabilidad porcentual base de aplicar un efecto temporal.
  PROBABILIDAD_EFECTO: "probabilidadEfecto",
  // Duración de una instancia de efecto temporal en unidades del SistemaTiempo.
  DURACION_EFECTO: "duracionEfecto",
  // Separación temporal entre ticks de un efecto periódico.
  INTERVALO_EFECTO: "intervaloEfecto",
  // Tope de intensidad/cantidad acumulable para un efecto temporal.
  MAXIMO_ACUMULACIONES_EFECTO: "maximoAcumulacionesEfecto",
  // Cantidad agregada por cada reaplicación que acumula un efecto temporal.
  INCREMENTO_ACUMULACION_EFECTO: "incrementoAcumulacionEfecto",
  // Magnitud numérica de un descriptor que un efecto aporta al combatiente.
  MAGNITUD_MODIFICADOR_EFECTO: "magnitudModificadorEfecto",
  // Duración de una zona temporal estática creada por la habilidad.
  DURACION_ZONA: "duracionZona",
  // Separación entre activaciones periódicas de una zona temporal.
  INTERVALO_ZONA: "intervaloZona",
  // Radio en casillas de una emisión móvil de aura alrededor de su emisor.
  RADIO_AURA: "radioAura",
});

export const ATRIBUTOS_HABILIDAD_VALIDOS = Object.freeze(
  Object.values(ATRIBUTOS_HABILIDAD),
);

// Campos ya identificados como probables a corto plazo para habilidades de
// arco (disparo múltiple, lluvia/abanico de proyectiles). Permanecen fuera del
// registro productivo hasta que exista un consumidor canónico real.
export const ATRIBUTOS_HABILIDAD_RESERVADOS_CORTO_PLAZO = Object.freeze({
  // Cantidad de proyectiles generados por una única ejecución.
  CANTIDAD_PROYECTILES: "cantidadProyectiles",
  // Tope de proyectiles de la misma fuente que pueden coexistir en el mundo.
  MAXIMO_PROYECTILES_SIMULTANEOS: "maximoProyectilesSimultaneos",
});

const CONJUNTO_ATRIBUTOS = new Set(ATRIBUTOS_HABILIDAD_VALIDOS);

export function validarAtributoHabilidad(atributo) {
  if (typeof atributo !== "string" || !CONJUNTO_ATRIBUTOS.has(atributo)) {
    throw new Error(`El atributo modificable de habilidad "${atributo}" no existe.`);
  }
  return atributo;
}
