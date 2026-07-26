import {
  CLAVE_GUARDADO_JUGADOR,
  VERSION_GUARDADO_JUGADOR,
  crearSnapshotJugador,
  guardarJugadorDurable,
  leerSnapshotJugador,
  eliminarGuardadoJugador,
  crearJugadorDesdeSnapshot as crearJugadorDesdeSnapshotBase,
} from "./PersistenciaJugador.js";
import { migrarSnapshotCatalizadores } from "./MigradorGuardadoCatalizadores.js";

export {
  CLAVE_GUARDADO_JUGADOR,
  VERSION_GUARDADO_JUGADOR,
  crearSnapshotJugador,
  guardarJugadorDurable,
  leerSnapshotJugador,
  eliminarGuardadoJugador,
};

export function crearJugadorDesdeSnapshot({
  snapshot,
  configuracionPersonaje,
  configuracionObjetos,
} = {}) {
  const snapshotMigrado = migrarSnapshotCatalizadores({
    snapshot,
    configuracionObjetos,
  });

  return crearJugadorDesdeSnapshotBase({
    snapshot: snapshotMigrado,
    configuracionPersonaje,
    configuracionObjetos,
  });
}

export function crearJugadorDesdeGuardado({
  configuracionPersonaje,
  configuracionObjetos,
  almacenamiento = globalThis.localStorage,
} = {}) {
  const snapshot = leerSnapshotJugador({ almacenamiento });
  if (!snapshot) return null;

  return crearJugadorDesdeSnapshot({
    snapshot,
    configuracionPersonaje,
    configuracionObjetos,
  });
}
