// Aplicacion coordina la carga inicial, los menús y la partida.
import { Aplicacion } from "./src/aplicacion/Aplicacion.js";
import { PresentacionAplicacionDom } from "./src/interfaz/dom/PresentacionAplicacionDom.js";
import {
  resolverTipoRenderizador,
  utilizaPhaser,
} from "./src/interfaz/graficos/SelectorRenderizador.js";
import { cargarPhaser } from "./src/interfaz/graficos/phaser/CargadorPhaser.js";
import { crearDepuradorMagiaHabilidades } from "./src/herramientas/depuracion/DepuradorMagiaHabilidades.js";

iniciarDarkMoon();

async function iniciarDarkMoon() {
  const tipoRenderizador = resolverTipoRenderizador();

  try {
    const Phaser = utilizaPhaser(tipoRenderizador)
      ? await cargarPhaser()
      : null;

    const presentacion = new PresentacionAplicacionDom({
      tipoRenderizador,
      Phaser,
    });

    const aplicacion = new Aplicacion({
      presentacion,
    });

    // La referencia pública es deliberadamente pequeña y sirve para
    // validaciones manuales. La lógica real continúa dentro de los módulos de
    // dominio, independientemente del backend visual elegido.
    globalThis.darkMoonAplicacion = aplicacion;
    globalThis.darkMoonRenderizador = Object.freeze({
      tipo: tipoRenderizador,
      phaser: Phaser?.VERSION ?? null,
    });
    globalThis.darkMoonDebug = crearDepuradorMagiaHabilidades({
      obtenerAplicacion: () => aplicacion,
    });

    await aplicacion.iniciar();
  } catch (error) {
    mostrarErrorArranque(error);
  }
}

function mostrarErrorArranque(error) {
  console.error("No se pudo iniciar Dark Moon:", error);

  const textoError =
    error instanceof Error
      ? error.message
      : "No se pudo iniciar Dark Moon.";

  for (const id of ["startupError", "creationMessage"]) {
    const mensaje = document.getElementById(id);
    if (mensaje) {
      mensaje.textContent = textoError;
    }
  }
}
