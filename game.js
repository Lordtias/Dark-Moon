// Aplicacion coordina la carga inicial, los menús y la partida.
import { Aplicacion } from "./src/aplicacion/Aplicacion.js";
import { crearDepuradorMagiaHabilidades } from "./src/juego/habilidades/DepuradorMagiaHabilidades.js";

const aplicacion = new Aplicacion();
// La referencia pública es deliberadamente pequeña y sirve para validaciones
// manuales. La lógica real continúa dentro de los módulos de dominio.
globalThis.darkMoonAplicacion = aplicacion;
globalThis.darkMoonDebug = crearDepuradorMagiaHabilidades({
  obtenerAplicacion: () => aplicacion,
});

aplicacion.iniciar();
