import {
  crearSnapshotJugador,
  guardarJugadorDurable,
  leerSnapshotJugador,
  eliminarGuardadoJugador,
  crearJugadorDesdeGuardado,
} from "../../Partida/PersistenciaJugador.js";

// Fachada pequeña para pruebas manuales desde la consola del navegador.
//
// No evita validaciones ni modifica campos internos: todas las operaciones
// pasan por los mismos contratos de dominio utilizados por el juego.
export function crearDepuradorEtapa4({ obtenerAplicacion } = {}) {
  if (typeof obtenerAplicacion !== "function") {
    throw new Error(
      "El depurador necesita una función para obtener la aplicación.",
    );
  }

  const obtenerJugador = () => {
    const aplicacion = obtenerAplicacion();
    const jugador =
      aplicacion?.controladorPartida?.juego?.player ??
      aplicacion?.controladorPartida?.estadoPartida?.jugador ??
      null;

    if (!jugador) {
      throw new Error(
        "Todavía no existe un jugador activo. Iniciá una partida primero.",
      );
    }

    return jugador;
  };

  return Object.freeze({
    obtenerJugador,
    obtenerResumenProgresoMagico() {
      return obtenerJugador().obtenerResumenProgresoMagico();
    },
    registrarExperienciaMaestria(evento) {
      return obtenerJugador().registrarExperienciaMaestria(evento);
    },
    agregarExperienciaMaestria(datos) {
      return obtenerJugador().agregarExperienciaMaestria(datos);
    },
    mejorarHabilidad(datos) {
      return obtenerJugador().mejorarHabilidad(datos);
    },
    crearSnapshotJugador() {
      return crearSnapshotJugador(obtenerJugador());
    },
    guardarJugador() {
      return guardarJugadorDurable({
        jugador: obtenerJugador(),
      });
    },
    leerGuardado() {
      return leerSnapshotJugador();
    },
    eliminarGuardado() {
      return eliminarGuardadoJugador();
    },
    crearJugadorDesdeGuardado() {
      const aplicacion = obtenerAplicacion();
      return crearJugadorDesdeGuardado({
        configuracionPersonaje: aplicacion.configuracionPersonaje,
        configuracionObjetos: aplicacion.configuracionObjetos,
      });
    },
  });
}
