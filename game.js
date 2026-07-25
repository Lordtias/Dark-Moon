// Aplicacion coordina la carga inicial, los menús y la partida.
import { Aplicacion } from "./src/aplicacion/Aplicacion.js";
import { crearDepuradorEtapa4 } from "./src/juego/maestrias/DepuradorEtapa4.js";

const aplicacion = new Aplicacion();

// La referencia pública es deliberadamente pequeña y sirve para validaciones
// manuales. La lógica real continúa dentro de los módulos de dominio.
globalThis.darkMoonAplicacion = aplicacion;
globalThis.darkMoonDebug = crearDepuradorEtapa4({
  obtenerAplicacion: () => aplicacion,
});

aplicacion.iniciar();
