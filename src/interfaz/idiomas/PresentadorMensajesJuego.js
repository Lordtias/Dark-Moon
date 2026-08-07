import { normalizarMensajesJuego } from "../../juego/mensajes/MensajesJuego.js";
import { idiomaActivo, traducir, traducirContenido } from "./ContextoIdioma.js";

export function resolverPresentacionMensajeJuego(mensaje) {
  if (!mensaje || typeof mensaje !== "object") {
    return Object.freeze({ destacado: "", texto: "" });
  }

  const texto = resolverFragmentoMensaje(mensaje);
  const destacado = mensaje.destacado
    ? resolverFragmentoMensaje(mensaje.destacado)
    : "";

  return Object.freeze({ destacado, texto });
}

export function resolverTextoMensajeJuego(mensaje) {
  const presentacion = resolverPresentacionMensajeJuego(mensaje);
  return [presentacion.destacado, presentacion.texto].filter(Boolean).join(" ");
}

function resolverFragmentoMensaje(fragmento) {
  if (!fragmento || typeof fragmento !== "object") return "";
  if (typeof fragmento.clave !== "string" || fragmento.clave.trim() === "") {
    return typeof fragmento.texto === "string" ? fragmento.texto : "";
  }

  const parametros = Object.fromEntries(
    Object.entries(fragmento.parametros ?? {}).map(([clave, valor]) => [
      clave,
      resolverParametro(valor),
    ]),
  );
  return traducir(fragmento.clave, {
    parametros,
    respaldo: fragmento.respaldo ?? "",
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
