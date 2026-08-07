let traductorActivo = null;

export function configurarTraductorActivo(traductor) {
  if (!traductor || typeof traductor.traducir !== "function") {
    throw new Error("Se necesita un traductor válido.");
  }
  traductorActivo = traductor;
  return traductorActivo;
}

export function obtenerTraductorActivo() {
  return traductorActivo;
}

export function traducir(clave, opciones = {}) {
  return traductorActivo?.traducir(clave, opciones) ?? opciones.respaldo ?? clave;
}

export function traducirContenido(categoria, id, campo, respaldo = "") {
  return traductorActivo?.traducirContenido(categoria, id, campo, respaldo) ?? respaldo;
}

export function idiomaActivo() {
  return traductorActivo?.obtenerIdioma?.() ?? "es";
}
