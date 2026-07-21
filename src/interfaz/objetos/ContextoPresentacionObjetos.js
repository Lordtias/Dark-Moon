// Mantiene la configuración visual de las rarezas
// disponible para todos los componentes de objetos.
//
// Dark Moon utiliza actualmente una única partida activa,
// por lo que un contexto compartido evita pasar el catálogo
// por cada panel, modal y vista individual.
let catalogoRarezas = null;

const COLOR_RESPALDO = "#d4d4d4";

// Registra el catálogo cargado desde Rarezas.json.
//
// El JSON continúa siendo la fuente de verdad para:
//
// - Nombre visible.
// - Color.
// - Estado.
// - Reglas de generación.
export function configurarContextoPresentacionObjetos({
  configuracionRarezas,
} = {}) {
  validarCatalogoRarezas(configuracionRarezas);

  catalogoRarezas = Object.fromEntries(
    Object.entries(configuracionRarezas).map(([idRareza, configuracion]) => {
      validarConfiguracionRareza({
        idRareza,
        configuracion,
      });

      return [
        normalizarIdRareza(idRareza),

        {
          ...configuracion,

          nombre: configuracion.nombre.trim(),

          colorInterfaz: configuracion.colorInterfaz.trim(),
        },
      ];
    }),
  );

  return catalogoRarezas;
}

// Devuelve un modelo visual seguro para una rareza.
//
// El respaldo permite inspeccionar objetos manuales
// incluso antes de iniciar formalmente una partida.
export function obtenerPresentacionRarezaObjeto(idRareza = "comun") {
  const id = normalizarIdRareza(idRareza);

  const configuracion = catalogoRarezas?.[id] ?? null;

  return {
    id,

    nombre: configuracion?.nombre ?? formatearIdentificador(id),

    color: configuracion?.colorInterfaz ?? COLOR_RESPALDO,

    colorSuave: convertirHexARgba(
      configuracion?.colorInterfaz ?? COLOR_RESPALDO,

      0.24,
    ),

    estado: configuracion?.estado ?? "desconocido",
  };
}

// Aplica variables CSS y metadatos de rareza
// sobre una casilla o una vista de detalle.
//
// Los estilos concretos continúan perteneciendo
// a las hojas CSS de cada componente.
export function aplicarAparienciaRarezaObjeto({ elemento, rareza } = {}) {
  if (!elemento || !elemento.classList || !elemento.style) {
    throw new Error(
      "Se necesita un elemento visual válido para aplicar la rareza.",
    );
  }

  const presentacion =
    typeof rareza === "string"
      ? obtenerPresentacionRarezaObjeto(rareza)
      : validarPresentacionRareza(rareza);

  // Eliminamos una clase anterior por si la misma vista
  // reutilizable cambia de objeto.
  for (const clase of [...elemento.classList]) {
    if (clase.startsWith("objeto-rareza-")) {
      elemento.classList.remove(clase);
    }
  }

  elemento.classList.add(
    "objeto-con-rareza",

    `objeto-rareza-${normalizarClaseCss(presentacion.id)}`,
  );

  elemento.dataset.rarezaObjeto = presentacion.id;

  elemento.style.setProperty("--color-rareza-objeto", presentacion.color);

  elemento.style.setProperty(
    "--color-rareza-objeto-suave",
    presentacion.colorSuave,
  );

  return presentacion;
}

function validarCatalogoRarezas(configuracionRarezas) {
  if (
    configuracionRarezas === null ||
    typeof configuracionRarezas !== "object" ||
    Array.isArray(configuracionRarezas) ||
    Object.keys(configuracionRarezas).length === 0
  ) {
    throw new Error("Se necesita un catálogo visual de rarezas válido.");
  }
}

function validarConfiguracionRareza({ idRareza, configuracion }) {
  normalizarIdRareza(idRareza);

  if (
    !configuracion ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion) ||
    typeof configuracion.nombre !== "string" ||
    configuracion.nombre.trim() === "" ||
    !esColorHexadecimal(configuracion.colorInterfaz)
  ) {
    throw new Error(`La presentación de la rareza "${idRareza}" no es válida.`);
  }
}

function validarPresentacionRareza(rareza) {
  if (
    !rareza ||
    typeof rareza !== "object" ||
    typeof rareza.id !== "string" ||
    typeof rareza.nombre !== "string" ||
    !esColorHexadecimal(rareza.color)
  ) {
    throw new Error("La presentación de rareza recibida no es válida.");
  }

  return {
    ...rareza,

    colorSuave: rareza.colorSuave ?? convertirHexARgba(rareza.color, 0.24),
  };
}

function normalizarIdRareza(valor) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error("La rareza visual debe tener un identificador válido.");
  }

  return valor.trim().toLowerCase();
}

function normalizarClaseCss(valor) {
  return valor.replace(/[^a-z0-9_-]/g, "-");
}

function esColorHexadecimal(valor) {
  return typeof valor === "string" && /^#[0-9a-f]{6}$/i.test(valor.trim());
}

function convertirHexARgba(color, alfa) {
  if (!esColorHexadecimal(color)) {
    return `rgba(212, 212, 212, ${alfa})`;
  }

  const hexadecimal = color.trim().slice(1);

  const rojo = Number.parseInt(hexadecimal.slice(0, 2), 16);

  const verde = Number.parseInt(hexadecimal.slice(2, 4), 16);

  const azul = Number.parseInt(hexadecimal.slice(4, 6), 16);

  return `rgba(${rojo}, ${verde}, ${azul}, ${alfa})`;
}

function formatearIdentificador(valor) {
  const texto = valor.replaceAll("_", " ").trim().toLowerCase();

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
