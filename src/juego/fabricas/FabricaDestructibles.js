import { Destructible } from "../../entidad/destructible/Destructible.js";
import {
  FAMILIAS_ENTIDAD_MAZMORRA,
  obtenerEntidadMazmorraConfigurada,
} from "../configuracion/ValidadorConfiguracionEntidadesMazmorra.js";

// Materializa cualquier objeto físico destructible a partir de una variante
// configurada. El ID determina datos y recurso visual, nunca una clase propia.
export function crearDestructible({
  id,
  x,
  y,
  configuracionEntidadesMazmorra,
  objetosIniciales = [],
  tablaBotin = [],
} = {}) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error(
      `La posición del destructible "${id ?? "sin_id"}" debe utilizar enteros.`,
    );
  }

  const definicion = obtenerEntidadMazmorraConfigurada(
    configuracionEntidadesMazmorra,
    id,
  );
  const esRecipiente =
    definicion.familia === FAMILIAS_ENTIDAD_MAZMORRA.RECIPIENTE;

  if (!esRecipiente && objetosIniciales.length > 0) {
    throw new Error(
      `La entidad "${definicion.id}" no es un recipiente y no puede recibir contenido inicial.`,
    );
  }

  return new Destructible({
    nombre: definicion.nombre,
    x,
    y,
    simbolo: definicion.simbolo,
    recursoVisual: definicion.recursoVisual,
    vidaMaxima: definicion.vidaMaxima,
    armadura: definicion.armadura,
    bloqueaMovimiento: definicion.bloqueaMovimiento,
    bloqueaVision: definicion.bloqueaVision,
    bloqueaCruceDiagonal: definicion.bloqueaCruceDiagonal,
    capacidadContenedor: esRecipiente
      ? definicion.capacidadContenedor
      : 0,
    objetosIniciales: esRecipiente ? objetosIniciales : [],
    tablaBotin: tablaBotin ?? [],
    alcanceInteraccion: definicion.alcanceInteraccion ?? 1,
    prioridadInteraccion: definicion.prioridadInteraccion ?? 90,
    textoInteraccion: esRecipiente
      ? `Revisar ${definicion.nombre.toLowerCase()}`
      : null,
    familiaEntidad: definicion.familia,
    idVariante: definicion.id,
  });
}
