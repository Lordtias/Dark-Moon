// Agrega a una casilla una imagen de objeto
// con respaldo textual.
//
// Cuando existe una imagen:
//
// - El texto comienza oculto.
// - La imagen ocupa su lugar inmediatamente.
// - Si la imagen falla, aparece el texto.
//
// Esto evita que el nombre del objeto
// parpadee cada vez que la interfaz se actualiza.
export function agregarRepresentacionObjeto({
  contenedor,
  objeto,
  claseTexto,
} = {}) {
  if (!contenedor) {
    throw new Error("Se necesita un contenedor para representar el objeto.");
  }

  if (!objeto) {
    throw new Error("Se necesita un objeto para crear su representación.");
  }

  if (typeof claseTexto !== "string" || claseTexto.trim() === "") {
    throw new Error("Se necesita una clase válida para el texto del objeto.");
  }

  const texto = crearTextoObjeto({
    objeto,
    claseTexto,
  });

  const ruta = normalizarRuta(objeto.recursoVisual);

  // Si el objeto no tiene una imagen configurada,
  // mostramos directamente su nombre.
  if (!ruta) {
    contenedor.appendChild(texto);

    return;
  }

  // Como existe una imagen configurada,
  // ocultamos el respaldo desde el comienzo.
  //
  // Solamente se mostrará si la imagen falla.
  texto.hidden = true;

  const imagen = document.createElement("img");

  imagen.classList.add("imagen-objeto");

  // Reservamos las dimensiones originales
  // del recurso para evitar cambios de tamaño
  // mientras el navegador termina de cargarlo.
  imagen.width = 16;
  imagen.height = 16;

  // El contenedor ya tiene una descripción
  // completa mediante aria-label.
  imagen.alt = "";
  imagen.setAttribute("aria-hidden", "true");

  imagen.draggable = false;
  imagen.decoding = "async";

  imagen.addEventListener(
    "load",
    () => {
      // La imagen queda visible.
      //
      // El texto ya estaba oculto,
      // evitando cualquier destello.
      imagen.hidden = false;
      texto.hidden = true;
    },
    {
      once: true,
    },
  );

  imagen.addEventListener(
    "error",
    () => {
      // Eliminamos la imagen fallida
      // y mostramos el nombre como respaldo.
      imagen.remove();
      texto.hidden = false;
    },
    {
      once: true,
    },
  );

  // Registramos los eventos antes de asignar
  // la ruta para contemplar imágenes cacheadas.
  imagen.src = ruta;

  // La imagen se agrega antes del texto.
  //
  // El texto permanece en el DOM como respaldo,
  // pero oculto mientras la imagen sea válida.
  contenedor.append(imagen, texto);
}

// Crea el texto utilizado cuando un objeto
// no dispone de una imagen válida.
function crearTextoObjeto({ objeto, claseTexto }) {
  const texto = document.createElement("span");

  texto.classList.add(claseTexto);

  texto.textContent = objeto.nombre;

  return texto;
}

// Normaliza una ruta opcional.
//
// Las rutas vacías o inválidas se consideran
// recursos visuales no configurados.
function normalizarRuta(ruta) {
  return typeof ruta === "string" && ruta.trim() !== "" ? ruta.trim() : null;
}
