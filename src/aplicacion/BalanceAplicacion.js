import { analizarBalanceProgresion } from "../juego/balance/AnalizadorBalanceProgresion.js";

const RUTAS_CONFIGURACION = Object.freeze({
  mapas: "./src/config/mapas/mapas.json",

  enemigos: "./src/config/entidades/Enemigos.json",

  enemigosEspeciales: "./src/config/entidades/EnemigosEspeciales.json",

  variantes: "./src/config/entidades/VariantesEnemigos.json",

  objetivos: "./src/config/balance/ObjetivosBalance.json",
});

const elementos = {
  estado: document.getElementById("balanceEstado"),

  resumen: document.getElementById("balanceResumen"),

  cuerpoRuta: document.getElementById("balanceRutaCuerpo"),

  cuerpoMapas: document.getElementById("balanceMapasCuerpo"),

  error: document.getElementById("balanceError"),

  botonRecargar: document.getElementById("balanceRecargar"),
};

elementos.botonRecargar.addEventListener("click", () => {
  cargarBalance();
});

cargarBalance();

async function cargarBalance() {
  prepararCarga();

  try {
    const [
      configuracionMapas,
      enemigos,
      enemigosEspeciales,
      variantesEnemigos,
      objetivosBalance,
    ] = await Promise.all([
      cargarJson(RUTAS_CONFIGURACION.mapas),

      cargarJson(RUTAS_CONFIGURACION.enemigos),

      cargarJson(RUTAS_CONFIGURACION.enemigosEspeciales),

      cargarJson(RUTAS_CONFIGURACION.variantes),

      cargarJson(RUTAS_CONFIGURACION.objetivos),
    ]);

    const plantillasEnemigos = combinarCatalogosEnemigos({
      enemigos,
      enemigosEspeciales,
    });

    const informe = analizarBalanceProgresion({
      configuracionMapas,
      plantillasEnemigos,
      variantesEnemigos,
      objetivosBalance,
    });

    window.balanceDarkMoon = informe;

    dibujarInforme(informe);
  } catch (error) {
    mostrarError(error);
  }
}

async function cargarJson(ruta) {
  const respuesta = await fetch(ruta, {
    cache: "no-store",
  });

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo cargar "${ruta}". Código HTTP ${respuesta.status}.`,
    );
  }

  try {
    return await respuesta.json();
  } catch (error) {
    throw new Error(`"${ruta}" no contiene un JSON válido. ${error.message}`);
  }
}

function combinarCatalogosEnemigos({ enemigos, enemigosEspeciales }) {
  validarCatalogo(enemigos, "enemigos recurrentes");

  validarCatalogo(enemigosEspeciales, "enemigos especiales");

  const duplicados = Object.keys(enemigos).filter((id) =>
    Object.prototype.hasOwnProperty.call(enemigosEspeciales, id),
  );

  if (duplicados.length > 0) {
    throw new Error(
      "Existen enemigos repetidos entre los catálogos: " +
        duplicados.join(", "),
    );
  }

  return {
    ...enemigos,
    ...enemigosEspeciales,
  };
}

function dibujarInforme(informe) {
  const cumpleObjetivo = informe.resumen.cumpleObjetivo;

  elementos.estado.textContent = cumpleObjetivo
    ? "La ruta recomendada cumple el objetivo."
    : "La ruta recomendada necesita ajustes.";

  elementos.estado.classList.toggle("balance-estado--correcto", cumpleObjetivo);

  elementos.estado.classList.toggle(
    "balance-estado--advertencia",
    !cumpleObjetivo,
  );

  dibujarResumen(informe);

  dibujarRuta(informe.rutaRecomendada);

  dibujarMapas(informe.detalleMapas);
}

function dibujarResumen(informe) {
  const resumen = informe.resumen;

  const configuracion = informe.configuracion;

  elementos.resumen.replaceChildren(
    crearTarjetaResumen({
      etiqueta: "Factor base de XP",

      valor: formatearPorcentaje(configuracion.factorBaseExperiencia),
    }),

    crearTarjetaResumen({
      etiqueta: "Niveles analizados",

      valor: `${resumen.nivelesAnalizados}`,
    }),

    crearTarjetaResumen({
      etiqueta: "Dentro del objetivo",

      valor: `${resumen.nivelesCorrectos}`,
    }),

    crearTarjetaResumen({
      etiqueta: "Expediciones mínimas",

      valor: formatearNumero(resumen.expedicionesMinimas),
    }),

    crearTarjetaResumen({
      etiqueta: "Expediciones máximas",

      valor: formatearNumero(resumen.expedicionesMaximas),
    }),

    crearTarjetaResumen({
      etiqueta: "Rango esperado",

      valor: `${formatearNumero(
        resumen.rangoObjetivo.minimo,
      )}–${formatearNumero(resumen.rangoObjetivo.maximo)}`,
    }),
  );
}

function crearTarjetaResumen({ etiqueta, valor }) {
  const tarjeta = document.createElement("article");

  tarjeta.classList.add("balance-tarjeta");

  const titulo = document.createElement("span");

  titulo.textContent = etiqueta;

  const contenido = document.createElement("strong");

  contenido.textContent = valor;

  tarjeta.append(titulo, contenido);

  return tarjeta;
}

function dibujarRuta(filas) {
  elementos.cuerpoRuta.replaceChildren(
    ...filas.map((fila) =>
      crearFilaTabla([
        fila.nivelJugador,
        fila.siguienteNivel,
        fila.mapa,
        fila.nivelMapa,

        formatearNumero(fila.experienciaNecesaria),

        formatearNumero(fila.experienciaEsperada),

        formatearNumero(fila.expedicionesEsperadas),

        crearEtiquetaEstado(fila.estado),
      ]),
    ),
  );
}

function dibujarMapas(filas) {
  elementos.cuerpoMapas.replaceChildren(
    ...filas.map((fila) =>
      crearFilaTabla([
        fila.mapa,
        fila.nivelMapa,

        formatearNumero(fila.cantidadRecurrentesPromedio),

        formatearPorcentaje(fila.probabilidadEspecial / 100),

        formatearPorcentaje(fila.probabilidadJefe / 100),

        formatearNumero(fila.experienciaRecurrentes),

        formatearNumero(fila.experienciaEspecial),

        formatearNumero(fila.experienciaJefe),

        formatearNumero(fila.experienciaAjustada),
      ]),
    ),
  );
}

function crearFilaTabla(valores) {
  const fila = document.createElement("tr");

  for (const valor of valores) {
    const celda = document.createElement("td");

    if (valor instanceof Node) {
      celda.appendChild(valor);
    } else {
      celda.textContent = `${valor}`;
    }

    fila.appendChild(celda);
  }

  return fila;
}

function crearEtiquetaEstado(estado) {
  const etiqueta = document.createElement("span");

  etiqueta.classList.add("balance-etiqueta", `balance-etiqueta--${estado}`);

  switch (estado) {
    case "correcto":
      etiqueta.textContent = "Correcto";
      break;

    case "demasiado_rapido":
      etiqueta.textContent = "Muy rápido";
      break;

    case "demasiado_lento":
      etiqueta.textContent = "Muy lento";
      break;

    default:
      etiqueta.textContent = estado;
  }

  return etiqueta;
}

function prepararCarga() {
  elementos.estado.textContent = "Calculando balance…";

  elementos.estado.className = "balance-estado";

  elementos.error.hidden = true;

  elementos.error.textContent = "";

  elementos.resumen.replaceChildren();

  elementos.cuerpoRuta.replaceChildren();

  elementos.cuerpoMapas.replaceChildren();
}

function mostrarError(error) {
  console.error(error);

  elementos.estado.textContent = "No se pudo completar el análisis.";

  elementos.estado.className = "balance-estado balance-estado--error";

  elementos.error.hidden = false;

  elementos.error.textContent =
    error instanceof Error ? error.message : `${error}`;
}

function formatearNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    !Number.isFinite(Number(valor))
  ) {
    return "—";
  }

  return new Intl.NumberFormat("es-UY", {
    maximumFractionDigits: 2,
  }).format(Number(valor));
}

function formatearPorcentaje(valor) {
  return new Intl.NumberFormat("es-UY", {
    style: "percent",

    maximumFractionDigits: 1,
  }).format(valor);
}

function validarCatalogo(catalogo, descripcion) {
  if (
    catalogo === null ||
    typeof catalogo !== "object" ||
    Array.isArray(catalogo)
  ) {
    throw new Error(`El catálogo de ${descripcion} no es válido.`);
  }
}
