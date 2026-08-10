import { traducir } from "../idiomas/ContextoIdioma.js";

const DURACION_MINIMA_CARGA_MS = 1000;

// Presenta una cobertura global mientras la aplicación prepara un mapa.
// No decide cuándo el mapa está listo: solamente refleja el progreso que
// recibe de la capa de aplicación y garantiza una duración visual mínima.
export class PresentadorCargaMapaDom {
  constructor({ contenedor, texto, barra, progreso } = {}) {
    this.contenedor = validarElemento(contenedor, "pantalla de carga");
    this.texto = validarElemento(texto, "texto de carga");
    this.barra = validarElemento(barra, "barra de progreso de carga");
    this.progreso = validarElemento(progreso, "progreso de carga");
    this.inicioVisible = null;
    this.cargaActiva = null;
  }

  async mostrar({ idCarga } = {}) {
    if (idCarga === null || idCarga === undefined) {
      throw new Error("La pantalla de carga necesita una identidad de preparación.");
    }

    this.cargaActiva = idCarga;
    this.inicioVisible = obtenerInstante();
    this.contenedor.classList.remove("oculto");
    this.contenedor.setAttribute("aria-busy", "true");
    this.texto.textContent = traducir("interfaz.cargaMapa.cargando", {
      respaldo: "Cargando...",
    });
    this.actualizar({ idCarga, progreso: 0 });

    // Dos frames garantizan que la cobertura haya tenido oportunidad real de
    // pintarse antes de iniciar generación o preparación visual costosa.
    await esperarFrames(2);
    return true;
  }

  actualizar({ idCarga = this.cargaActiva, progreso = 0 } = {}) {
    if (idCarga !== this.cargaActiva) return false;

    const valor = normalizarProgreso(progreso);
    const porcentaje = Math.round(valor * 100);
    this.progreso.style.width = `${porcentaje}%`;
    this.barra.setAttribute("aria-valuenow", String(porcentaje));
    this.barra.setAttribute(
      "aria-label",
      traducir("interfaz.cargaMapa.progreso", {
        parametros: { porcentaje },
        respaldo: `Carga ${porcentaje} %`,
      }),
    );
    return porcentaje;
  }

  async esperarPintadoMapa({ idCarga = this.cargaActiva } = {}) {
    if (idCarga !== this.cargaActiva) return false;
    await esperarFrames(2);
    return idCarga === this.cargaActiva;
  }

  async ocultar({ idCarga = this.cargaActiva } = {}) {
    if (idCarga !== this.cargaActiva) return false;
    const inicio = this.inicioVisible;
    if (inicio !== null) {
      const transcurrido = obtenerInstante() - inicio;
      const restante = Math.max(0, DURACION_MINIMA_CARGA_MS - transcurrido);
      if (restante > 0) {
        await esperarMilisegundos(restante);
      }
    }

    if (idCarga !== this.cargaActiva) return false;

    this.actualizar({ idCarga, progreso: 1 });
    this.contenedor.classList.add("oculto");
    this.contenedor.setAttribute("aria-busy", "false");
    this.inicioVisible = null;
    this.cargaActiva = null;
    return true;
  }
}

function validarElemento(elemento, descripcion) {
  if (!elemento || typeof elemento.classList?.add !== "function") {
    throw new Error(`PresentadorCargaMapaDom necesita ${descripcion}.`);
  }
  return elemento;
}

function normalizarProgreso(valor) {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(1, Math.max(0, valor));
}

function obtenerInstante() {
  return typeof globalThis.performance?.now === "function"
    ? globalThis.performance.now()
    : Date.now();
}

function esperarFrames(cantidad) {
  const total = Math.max(1, Number.isInteger(cantidad) ? cantidad : 1);
  return new Promise((resolver) => {
    let restantes = total;
    const continuar = () => {
      restantes -= 1;
      if (restantes <= 0) {
        resolver();
        return;
      }
      programarFrame(continuar);
    };
    programarFrame(continuar);
  });
}

function programarFrame(callback) {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(callback);
    return;
  }
  setTimeout(callback, 16);
}

function esperarMilisegundos(milisegundos) {
  return new Promise((resolver) => setTimeout(resolver, milisegundos));
}
