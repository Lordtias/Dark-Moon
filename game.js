// Aplicacion coordina la carga inicial, los menús y la partida.
import { Aplicacion } from "./src/aplicacion/Aplicacion.js";
import { PresentacionAplicacionDom } from "./src/interfaz/dom/PresentacionAplicacionDom.js";
import { crearDepuradorMagiaHabilidades } from "./src/herramientas/depuracion/DepuradorMagiaHabilidades.js";

const presentacion = new PresentacionAplicacionDom();
const aplicacion = new Aplicacion({
  presentacion,
});

// La referencia pública es deliberadamente pequeña y sirve para validaciones
// manuales. La lógica real continúa dentro de los módulos de dominio.
globalThis.darkMoonAplicacion = aplicacion;
globalThis.darkMoonDebug = crearDepuradorMagiaHabilidades({
  obtenerAplicacion: () => aplicacion,
});

aplicacion.iniciar();
