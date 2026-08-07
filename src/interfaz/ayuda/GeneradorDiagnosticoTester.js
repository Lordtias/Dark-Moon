import {
  idiomaActivo,
  traducir,
  traducirContenido,
} from "../idiomas/ContextoIdioma.js";

export function generarDiagnosticoTester(contexto = {}) {
  const renderizador = contexto.renderizador ?? {};
  const preferencias = contexto.preferencias ?? {};
  const partida = contexto.partida ?? {};
  const idioma = contexto.idioma ?? idiomaActivo();
  const mapa = partida.mapaId
    ? traducirContenido("mapas", partida.mapaId, "nombre", partida.mapaNombre ?? partida.mapaId)
    : sinDato();

  const velocidad = traducirVelocidad(preferencias.velocidadAnimaciones);
  const ubicacion = partida.partidaIniciada
    ? traducir(`interfaz.ayuda.diagnostico.${partida.ubicacion === "ciudad" ? "ciudad" : "mazmorra"}`)
    : sinDato();

  const lineas = [
    `Dark Moon ${contexto.version ?? sinDato()}`,
    `${etiqueta("renderizador")}: ${renderizador.tipo ?? sinDato()}`,
    `${etiqueta("phaser")}: ${renderizador.phaserVersion ?? sinDato()}`,
    `${etiqueta("idioma")}: ${idioma}`,
    `${etiqueta("velocidad")}: ${velocidad}`,
    `${etiqueta("efectosReducidos")}: ${booleano(preferencias.efectosReducidos)}`,
    `${etiqueta("zoomInicial")}: ${porcentaje(preferencias.zoomInicial)}`,
    `${etiqueta("ubicacion")}: ${ubicacion}`,
    `${etiqueta("mapa")}: ${mapa}`,
    `${etiqueta("nivel")}: ${partida.nivelJugador ?? sinDato()}`,
    `${etiqueta("ventana")}: ${obtenerResolucionVentana()}`,
    `${etiqueta("navegador")}: ${globalThis.navigator?.userAgent ?? sinDato()}`,
  ];

  return lineas.join("\n");
}

export async function copiarTextoDiagnostico(texto) {
  const valor = String(texto ?? "");
  if (valor === "") return false;

  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(valor);
      return true;
    }
  } catch {
    // Se intenta el respaldo DOM debajo.
  }

  if (!globalThis.document?.body) return false;
  const area = document.createElement("textarea");
  area.value = valor;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  area.style.pointerEvents = "none";
  document.body.appendChild(area);
  area.select();
  let copiado = false;
  try {
    copiado = typeof document.execCommand === "function" && document.execCommand("copy");
  } catch {
    copiado = false;
  }
  area.remove();
  return copiado;
}

function etiqueta(clave) {
  return traducir(`interfaz.ayuda.diagnostico.${clave}`);
}

function sinDato() {
  return etiqueta("sinDato");
}

function booleano(valor) {
  return etiqueta(valor === true ? "si" : "no");
}

function porcentaje(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? `${Math.round(numero * 100)} %` : sinDato();
}

function obtenerResolucionVentana() {
  const ancho = Number(globalThis.innerWidth);
  const alto = Number(globalThis.innerHeight);
  return Number.isFinite(ancho) && Number.isFinite(alto)
    ? `${Math.round(ancho)}x${Math.round(alto)}`
    : sinDato();
}

function traducirVelocidad(valor) {
  switch (valor) {
    case "rapida":
      return traducir("interfaz.configuracion.velocidadRapida");
    case "muy-rapida":
    case "muy_rapida":
      return traducir("interfaz.configuracion.velocidadMuyRapida");
    case "normal":
      return traducir("interfaz.configuracion.velocidadNormal");
    default:
      return valor ?? sinDato();
  }
}
