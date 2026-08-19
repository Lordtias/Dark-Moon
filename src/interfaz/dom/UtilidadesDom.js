// Utilidades DOM reutilizables por componentes de interfaz.
// No contienen estado de juego ni conocen pantallas concretas.
export function asegurarHojaEstilos({ id, ruta } = {}) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("La hoja de estilos necesita un id DOM válido.");
  }
  if (typeof ruta !== "string" || ruta.trim() === "") {
    throw new Error("La hoja de estilos necesita una ruta válida.");
  }
  if (document.getElementById(id)) {
    return;
  }

  const enlace = document.createElement("link");
  enlace.id = id;
  enlace.rel = "stylesheet";
  enlace.href = ruta;

  // La capa responsive es deliberadamente aditiva y debe conservar la última
  // prioridad del cascade incluso cuando un modal carga su CSS bajo demanda.
  const capaResponsive = document.getElementById("estilosResponsiveDarkMoon");
  if (capaResponsive?.parentNode === document.head) {
    document.head.insertBefore(enlace, capaResponsive);
  } else {
    document.head.appendChild(enlace);
  }
}

export function crearElemento(etiqueta, clase = "", texto = "") {
  const elemento = document.createElement(etiqueta);

  if (clase) {
    elemento.className = clase;
  }

  if (texto !== "") {
    elemento.textContent = texto;
  }

  return elemento;
}
