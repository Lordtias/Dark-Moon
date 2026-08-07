import { normalizarMensajesJuego } from "../../juego/mensajes/MensajesJuego.js";
import { idiomaActivo, traducir, traducirContenido } from "./ContextoIdioma.js";

export function resolverTextoMensajeJuego(mensaje) {
  if (!mensaje || typeof mensaje !== "object") return "";
  if (typeof mensaje.clave !== "string" || mensaje.clave.trim() === "") {
    return typeof mensaje.texto === "string" ? mensaje.texto : "";
  }

  const parametros = Object.fromEntries(
    Object.entries(mensaje.parametros ?? {}).map(([clave, valor]) => [
      clave,
      resolverParametro(valor),
    ]),
  );
  return traducir(mensaje.clave, {
    parametros,
    respaldo: mensaje.respaldo ?? "",
  });
}

export function resolverTextoMensajesJuego(valor, { separador = "\n" } = {}) {
  return normalizarMensajesJuego(valor)
    .map(resolverTextoMensajeJuego)
    .filter(Boolean)
    .join(separador);
}

function resolverParametro(valor) {
  if (Array.isArray(valor)) return valor.map(resolverParametro).join(", ");
  if (!valor || typeof valor !== "object") return valor;

  if (valor.tipoParametroMensaje === "contenido") {
    return traducirContenido(
      valor.categoria,
      valor.id,
      valor.campo ?? "nombre",
      valor.respaldo ?? "",
    );
  }

  if (valor.tipoParametroMensaje === "entidad") {
    return resolverEntidad(valor);
  }

  if (valor.tipoParametroMensaje === "traduccion") {
    const parametros = Object.fromEntries(
      Object.entries(valor.parametros ?? {}).map(([clave, contenido]) => [
        clave,
        resolverParametro(contenido),
      ]),
    );
    return traducir(valor.clave, {
      parametros,
      respaldo: valor.respaldo ?? "",
    });
  }

  return valor;
}

function resolverEntidad(referencia) {
  const respaldo = referencia.nombre ?? "";

  if (referencia.idPlantilla) {
    const base = traducirContenido(
      "enemigos",
      referencia.idPlantilla,
      "nombre",
      respaldo,
    );
    if (!referencia.idVariante) return base;

    const genero = referencia.genero === "femenino" ? "femenino" : "masculino";
    const variante = traducirContenido(
      "variantesEnemigos",
      referencia.idVariante,
      genero,
      "",
    );
    if (!variante) return base;

    return traducir("mensajes.entidades.enemigoVariante", {
      parametros: { base, variante },
      respaldo: idiomaActivo() === "en" ? `${variante} ${base}` : `${base} ${variante}`,
    });
  }

  if (referencia.id) {
    const localizado = traducirContenido(
      "entidades",
      referencia.id,
      "nombre",
      "",
    );
    if (localizado) return localizado;
  }

  return respaldo;
}
