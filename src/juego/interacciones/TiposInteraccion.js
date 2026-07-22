// Define las familias de interacciones que pueden
// ofrecer las entidades del mundo.
//
// Estos valores no dependen de una interfaz concreta.
// Un controlador puede decidir si abrir un modal,
// iniciar un diálogo, comerciar, activar una misión
// o solicitar un cambio de mapa.
export const TIPOS_INTERACCION = Object.freeze({
  ABRIR_CONTENEDOR: "abrirContenedor",
  HABLAR: "hablar",
  COMERCIAR: "comerciar",
  ACTIVAR: "activar",
  MISION: "mision",
  TRANSICION_MAPA: "transicionMapa",
  SELECCIONAR_MAZMORRA: "seleccionarMazmorra",
});
