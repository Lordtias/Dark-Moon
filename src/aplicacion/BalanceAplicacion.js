import {
  cargarConfiguracionEnemigos,
  cargarConfiguracionMapas,
  cargarConfiguracionObjetos,
  cargarConfiguracionPersonaje,
} from "../juego/configuracion/CargadorConfiguracion.js";
import { crearAnalizadorBalanceJuego } from "../juego/balance/AnalizadorBalanceJuego.js";
import {
  cargarYConfigurarProgresoMagico,
  obtenerConfiguracionEjecucionHabilidades,
} from "../juego/maestrias/ContextoProgresoMagico.js";
import { validarCatalogoCatalizadores } from "../juego/magia/SistemaCatalizadores.js";

const RUTA_OBJETIVOS = "./src/config/balance/ObjetivosBalance.json";

const elementos = {
  estado: document.getElementById("balanceEstado"),
  error: document.getElementById("balanceError"),
  resumen: document.getElementById("balanceResumen"),
  cuerpoRuta: document.getElementById("balanceRutaCuerpo"),
  cuerpoNiveles: document.getElementById("balanceNivelesCuerpo"),
  cuerpoMaestrias: document.getElementById("balanceMaestriasCuerpo"),
  cuerpoMana: document.getElementById("balanceManaCuerpo"),
  cuerpoConstitucion: document.getElementById("balanceConstitucionCuerpo"),
  escenarios: document.getElementById("balanceEscenarios"),
  advertencias: document.getElementById("balanceAdvertencias"),
  botonRecargar: document.getElementById("balanceRecargar"),
};

elementos.botonRecargar.addEventListener("click", cargarBalance);
cargarBalance();

async function cargarBalance() {
  prepararCarga();

  try {
    const [
      configuracionPersonaje,
      configuracionEnemigos,
      configuracionObjetosSinValidar,
      configuracionMapas,
      configuracionProgresoMagico,
      objetivosBalance,
    ] = await Promise.all([
      cargarConfiguracionPersonaje(),
      cargarConfiguracionEnemigos(),
      cargarConfiguracionObjetos(),
      cargarConfiguracionMapas(),
      cargarYConfigurarProgresoMagico(),
      cargarJson(RUTA_OBJETIVOS),
    ]);
    const configuracionObjetos = validarCatalogoCatalizadores(
      configuracionObjetosSinValidar,
    );
    const analizador = crearAnalizadorBalanceJuego({
      configuracionPersonaje,
      configuracionEnemigos,
      configuracionObjetos,
      configuracionMapas,
      configuracionProgresoMagico,
      configuracionEjecucionHabilidades:
        obtenerConfiguracionEjecucionHabilidades(),
      objetivosBalance,
    });
    const informe = analizador.lineaBase();

    globalThis.balanceDarkMoon = analizador;
    globalThis.balanceDarkMoonInforme = informe;

    dibujarInforme(informe);
  } catch (error) {
    mostrarError(error);
  }
}

async function cargarJson(ruta) {
  const respuesta = await fetch(ruta, { cache: "no-store" });
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar "${ruta}" (${respuesta.status}).`);
  }
  try {
    return await respuesta.json();
  } catch (error) {
    throw new Error(`"${ruta}" no contiene JSON válido. ${error.message}`);
  }
}

function dibujarInforme(informe) {
  const cumpleObjetivo = informe.resumen.rutaCumpleObjetivo;
  elementos.estado.textContent = cumpleObjetivo
    ? "La línea base fue calculada y la ruta cumple el rango objetivo."
    : "La línea base fue calculada, pero la ruta tiene valores fuera del rango objetivo.";
  elementos.estado.className =
    "balance-estado " +
    (cumpleObjetivo
      ? "balance-estado--correcto"
      : "balance-estado--advertencia");

  dibujarResumen(informe);
  dibujarRuta(informe.progresion.rutaRecomendada);
  dibujarNiveles(informe.progresion.tablaNiveles);
  dibujarMaestrias(informe.maestrias.rutasDesbloqueo);
  dibujarMana(informe.mana.filasDestacadas);
  dibujarConstitucion(informe.constitucion.filas);
  dibujarEscenarios(informe.escenariosTeoricos);
  dibujarAdvertencias(informe.advertencias);
}

function dibujarResumen(informe) {
  const datos = [
    ["Puntos iniciales", informe.resumen.puntosUniversalesIniciales],
    ["Niveles", informe.resumen.nivelesAnalizados],
    ["Habilidades", informe.resumen.habilidadesAnalizadas],
    ["Grados", informe.resumen.gradosAnalizados],
    ["Armas", informe.resumen.armasAnalizadas],
    ["Profesiones", informe.resumen.profesionesAnalizadas],
  ];
  elementos.resumen.replaceChildren(
    ...datos.map(([etiqueta, valor]) => crearTarjetaResumen(etiqueta, valor)),
  );
}

function dibujarRuta(filas) {
  elementos.cuerpoRuta.replaceChildren(
    ...filas.map((fila) =>
      crearFilaTabla([
        `${fila.nivelJugador} → ${fila.siguienteNivel}`,
        `${fila.mapa} ${fila.nivelMapa}`,
        formatearNumero(fila.experienciaNecesaria),
        formatearNumero(fila.experienciaEsperada),
        formatearNumero(fila.enemigosEsperados),
        formatearNumero(fila.expedicionesEsperadas),
        crearEtiquetaEstado(fila.estado),
      ]),
    ),
  );
}

function dibujarNiveles(filas) {
  elementos.cuerpoNiveles.replaceChildren(
    ...filas.map((fila) =>
      crearFilaTabla([
        fila.nivel,
        formatearNumero(fila.experienciaParaSiguiente),
        formatearNumero(fila.experienciaAcumulada),
        fila.puntosAtributoAcumulados,
        fila.puntosUniversalesAcumulados,
      ]),
    ),
  );
}

function dibujarMaestrias(filas) {
  elementos.cuerpoMaestrias.replaceChildren(
    ...filas.map((fila) =>
      crearFilaTabla([
        capitalizar(fila.maestria),
        fila.escenario,
        `${fila.usosBasicaHastaNivel3} × ${fila.habilidadBasica} G${fila.gradoBasica}`,
        `${fila.usosIntermediaDesdeNivel3Hasta6} × ${fila.habilidadIntermedia} G${fila.gradoIntermedia}`,
        fila.usosTotales,
        fila.manaTotal,
      ]),
    ),
  );
}

function dibujarMana(filas) {
  elementos.cuerpoMana.replaceChildren(
    ...filas.map((fila) =>
      crearFilaTabla([
        fila.profesion,
        fila.nivel,
        fila.vidaMaxima,
        fila.manaMaximo,
        `${formatearNumero(fila.regeneracionManaPorPulso)} / 100`,
        fila.lanzamientosBasicaBarata,
        fila.lanzamientosAvanzadaCara,
        fila.ataquesDobleVarita,
      ]),
    ),
  );
}

function dibujarConstitucion(filas) {
  elementos.cuerpoConstitucion.replaceChildren(
    ...filas.map((fila) =>
      crearFilaTabla([
        fila.constitucion,
        `${fila.bonoResistencia} %`,
        `${formatearNumero(fila.probabilidadFinalBase100)} %`,
        `${formatearNumero(fila.probabilidadFinalBase40)} %`,
        `${formatearNumero(fila.probabilidadFinalBase20)} %`,
      ]),
    ),
  );
}

function dibujarEscenarios(escenarios) {
  const multiplicadoresArco = escenarios.arcos.map(
    (fila) => fila.multiplicadorDanioParaIgualar,
  );
  const reduccionesEspera = escenarios.habilidadesBasicas.map(
    (fila) => fila.reduccionRendimientoPorcentual,
  );
  const recuperacionesPociones = [
    ...new Set(escenarios.pocionesMana.map((fila) => fila.escenario)),
  ];

  elementos.escenarios.replaceChildren(
    crearEscenario({
      titulo: "Recarga del arco",
      textos: [
        "Estado actual: no existe una acción de recarga separada.",
        `Con una recarga de 100, el daño nominal debería multiplicarse entre ${formatearNumero(
          Math.min(...multiplicadoresArco),
        )} y ${formatearNumero(
          Math.max(...multiplicadoresArco),
        )} para conservar el rendimiento actual.`,
      ],
    }),
    crearEscenario({
      titulo: "Espera de habilidades básicas",
      textos: [
        "Estado actual: el lanzamiento consume tiempo, pero puede repetirse en el próximo turno.",
        `Agregar una espera de 100 reduce el rendimiento teórico entre ${formatearNumero(
          Math.min(...reduccionesEspera),
        )} % y ${formatearNumero(Math.max(...reduccionesEspera))} %.`,
      ],
    }),
    crearEscenario({
      titulo: "Pociones de Maná",
      textos: [
        "Estado actual: no existe una poción de Maná.",
        `La línea base compara ${recuperacionesPociones.join(", ")} con un consumo temporal de 100.`,
      ],
    }),
  );
}

function dibujarAdvertencias(advertencias) {
  elementos.advertencias.replaceChildren(
    ...advertencias.map((advertencia) => {
      const elemento = document.createElement("li");
      elemento.textContent = advertencia.mensaje;
      return elemento;
    }),
  );
}

function crearTarjetaResumen(etiqueta, valor) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "balance-tarjeta";
  const titulo = document.createElement("span");
  titulo.textContent = etiqueta;
  const contenido = document.createElement("strong");
  contenido.textContent = `${valor}`;
  tarjeta.append(titulo, contenido);
  return tarjeta;
}

function crearEscenario({ titulo, textos }) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "balance-escenario";
  const encabezado = document.createElement("h3");
  encabezado.textContent = titulo;
  tarjeta.appendChild(encabezado);
  for (const texto of textos) {
    const parrafo = document.createElement("p");
    parrafo.textContent = texto;
    tarjeta.appendChild(parrafo);
  }
  return tarjeta;
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
  etiqueta.className = `balance-etiqueta balance-etiqueta--${estado}`;
  etiqueta.textContent =
    estado === "correcto"
      ? "Correcto"
      : estado === "demasiado_rapido"
        ? "Muy rápido"
        : estado === "demasiado_lento"
          ? "Muy lento"
          : estado;
  return etiqueta;
}

function prepararCarga() {
  elementos.estado.textContent = "Calculando balance…";
  elementos.estado.className = "balance-estado";
  elementos.error.hidden = true;
  elementos.error.textContent = "";
  elementos.resumen.replaceChildren();
  elementos.cuerpoRuta.replaceChildren();
  elementos.cuerpoNiveles.replaceChildren();
  elementos.cuerpoMaestrias.replaceChildren();
  elementos.cuerpoMana.replaceChildren();
  elementos.cuerpoConstitucion.replaceChildren();
  elementos.escenarios.replaceChildren();
  elementos.advertencias.replaceChildren();
}

function mostrarError(error) {
  console.error(error);
  elementos.estado.textContent = "No se pudo completar el análisis.";
  elementos.estado.className = "balance-estado balance-estado--error";
  elementos.error.hidden = false;
  elementos.error.textContent = error instanceof Error ? error.message : `${error}`;
}

function formatearNumero(valor) {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) {
    return "—";
  }
  return new Intl.NumberFormat("es-UY", {
    maximumFractionDigits: 2,
  }).format(Number(valor));
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
