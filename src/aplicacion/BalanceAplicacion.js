import {
  cargarConfiguracionEnemigos,
  cargarConfiguracionGeneracionObjetos,
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
const ESTADOS = Object.freeze({
  CORRECTO: "correcto",
  ADVERTENCIA: "advertencia",
  INCORRECTO: "incorrecto",
  INFORMATIVO: "informativo",
});

const elementos = Object.fromEntries(
  [
    "balanceEstado",
    "balanceError",
    "balanceResumen",
    "balanceConclusiones",
    "balanceRutaCuerpo",
    "balanceNivelesCuerpo",
    "balanceMaestriasCuerpo",
    "balanceRitmoMagicoCuerpo",
    "balancePuntosCuerpo",
    "balanceManaCuerpo",
    "balancePerfilesMagoCuerpo",
    "balanceVaritasCuerpo",
    "balanceConstitucionCuerpo",
    "balanceReferenciasCuerpo",
    "balanceArmasDanioCuerpo",
    "balanceHabilidadesDanioCuerpo",
    "balanceResistenciasCuerpo",
    "balancePotenciaCuerpo",
    "balanceArquetiposCuerpo",
    "balanceEscenarios",
    "balanceAdvertencias",
    "balanceRecargar",
  ].map((id) => [id, document.getElementById(id)]),
);

elementos.balanceRecargar.addEventListener("click", cargarBalance);
cargarBalance();

async function cargarBalance() {
  prepararCarga();
  try {
    const [
      configuracionPersonaje,
      configuracionEnemigos,
      configuracionObjetosSinValidar,
      configuracionGeneracionObjetos,
      configuracionMapas,
      configuracionProgresoMagico,
      objetivosBalance,
    ] = await Promise.all([
      cargarConfiguracionPersonaje(),
      cargarConfiguracionEnemigos(),
      cargarConfiguracionObjetos(),
      cargarConfiguracionGeneracionObjetos(),
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
      configuracionGeneracionObjetos,
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
  return respuesta.json();
}

function dibujarInforme(informe) {
  const resumenCombate = informe.combate;
  const hayIncorrectos = [
    resumenCombate.armas.resumen.incorrectos,
    resumenCombate.habilidades.resumen.incorrectos,
    resumenCombate.potencia.resumen.escenariosAltos,
    resumenCombate.arquetipos.resumen.incorrectos,
  ].some((cantidad) => cantidad > 0);
  elementos.balanceEstado.textContent = hayIncorrectos
    ? "El análisis terminó. Hay resultados de combate que requieren una decisión antes de cambiar números."
    : "El análisis terminó. Los resultados están dentro de los rangos actuales o quedaron marcados como informativos.";
  elementos.balanceEstado.className = `balance-estado balance-estado--${
    hayIncorrectos ? "advertencia" : "correcto"
  }`;

  dibujarResumen(informe);
  dibujarConclusiones(informe.conclusiones);
  dibujarTablasProgresion(informe);
  dibujarTablasCombate(informe.combate);
  dibujarEscenarios(informe.escenariosTeoricos);
  dibujarAdvertencias(informe.advertencias);
}

function dibujarResumen(informe) {
  const datos = [
    ["Expediciones 1–10", formatearNumero(informe.resumen.expedicionesEstimadasNivel10)],
    ["Habilidades", informe.resumen.habilidadesAnalizadas],
    ["Grados", informe.resumen.gradosAnalizados],
    ["Armas evaluadas", informe.resumen.armasCombateAnalizadas],
    ["Simulaciones", informe.resumen.simulacionesCombate],
    ["Arquetipos", informe.combate.arquetipos.resumen.cantidad],
  ];
  elementos.balanceResumen.replaceChildren(
    ...datos.map(([etiqueta, valor]) => crearTarjetaResumen(etiqueta, valor)),
  );
}

function dibujarConclusiones(conclusiones) {
  elementos.balanceConclusiones.replaceChildren(
    ...conclusiones.resumenFacil.map((conclusion) => {
      const tarjeta = document.createElement("article");
      tarjeta.className = "balance-conclusion";
      const titulo = document.createElement("h3");
      titulo.textContent = tituloConclusion(conclusion.id);
      tarjeta.append(
        titulo,
        crearBloqueConclusion("Qué se analizó", conclusion.queSeAnalizo),
        crearBloqueConclusion("Por qué", conclusion.porQue),
        crearBloqueConclusion("Conclusión", conclusion.conclusion),
        crearBloqueConclusion("Qué recomiendo", conclusion.recomendacion, true),
      );
      return tarjeta;
    }),
  );
}

function tituloConclusion(id) {
  return {
    experiencia_general: "Experiencia general",
    ritmo_maestria: "Ritmo de maestrías",
    puntos_habilidad: "Puntos de habilidad",
    mana: "Maná y regeneración",
    varitas: "Consumo de las varitas",
    pociones_mana: "Pociones de Maná",
    armas_danio: "Daño de armas",
    habilidades_danio: "Daño de habilidades",
    potencia_habilidad: "Potencia de Habilidad",
    arquetipos: "Comparación de arquetipos",
  }[id] ?? id;
}

function crearBloqueConclusion(etiqueta, texto, destacado = false) {
  const contenedor = document.createElement("div");
  contenedor.className = destacado
    ? "balance-conclusion__bloque balance-conclusion__bloque--decision"
    : "balance-conclusion__bloque";
  const titulo = document.createElement("strong");
  titulo.textContent = etiqueta;
  const parrafo = document.createElement("p");
  parrafo.textContent = texto;
  contenedor.append(titulo, parrafo);
  return contenedor;
}

function dibujarTablasProgresion(informe) {
  const rango = informe.progresion.configuracion.rangoExpedicionesObjetivo;
  llenar("balanceRutaCuerpo", informe.progresion.rutaRecomendada, (fila) => [
    `${fila.nivelJugador} → ${fila.siguienteNivel}`,
    `${fila.mapa} ${fila.nivelMapa}`,
    formatearNumero(fila.experienciaNecesaria),
    formatearNumero(fila.experienciaEsperada),
    formatearNumero(fila.enemigosEsperados),
    formatearNumero(fila.expedicionesEsperadas),
    `Correcto entre ${rango.minimo} y ${rango.maximo} expediciones.`,
    crearEtiquetaEstado(normalizarEstado(fila.estado)),
  ]);

  llenar("balanceNivelesCuerpo", informe.progresion.tablaNiveles, (fila) => [
    fila.nivel,
    formatearNumero(fila.experienciaParaSiguiente),
    formatearNumero(fila.experienciaAcumulada),
    fila.puntosAtributoAcumulados,
    fila.puntosUniversalesAcumulados,
    "Registro acumulado; se evalúa mediante la ruta de expediciones, no por una fila aislada.",
    crearEtiquetaEstado(ESTADOS.INFORMATIVO),
  ]);

  const manaMediano = mediana(
    informe.maestrias.rutasDesbloqueo.map((fila) => fila.manaTotal),
  );
  llenar("balanceMaestriasCuerpo", informe.maestrias.rutasDesbloqueo, (fila) => {
    const diferencia = manaMediano > 0
      ? Math.abs(fila.manaTotal - manaMediano) / manaMediano
      : 0;
    const estado = diferencia <= 0.05
      ? ESTADOS.CORRECTO
      : diferencia <= 0.15
        ? ESTADOS.ADVERTENCIA
        : ESTADOS.INCORRECTO;
    return [
      capitalizar(fila.maestria),
      fila.escenario,
      `${fila.usosBasicaHastaNivel3} × ${fila.habilidadBasica} G${fila.gradoBasica}`,
      `${fila.usosIntermediaDesdeNivel3Hasta6} × ${fila.habilidadIntermedia} G${fila.gradoIntermedia}`,
      fila.usosTotales,
      fila.manaTotal,
      `El Maná total hasta maestría 6 debe quedar a ±5 % de la mediana (${formatearNumero(manaMediano)}).`,
      crearEtiquetaEstado(estado),
    ];
  });

  const ritmo = informe.progresionMagica.filas.filter(
    (fila) => fila.estrategia === "conservar_universales",
  );
  llenar("balanceRitmoMagicoCuerpo", ritmo, (fila) => {
    const nivel3 = fila.accesoNivel3?.nivelGeneral;
    const nivel6 = fila.accesoNivel6?.nivelGeneral;
    let estado = ESTADOS.ADVERTENCIA;
    if (fila.usosPorEnemigo === 2 && nivel3 >= 3 && nivel3 <= 5 && nivel6 >= 5 && nivel6 <= 7) {
      estado = ESTADOS.CORRECTO;
    } else if (!nivel3 || !nivel6 || nivel6 > 10) {
      estado = ESTADOS.INCORRECTO;
    }
    return [
      capitalizar(fila.maestria),
      fila.usosPorEnemigo,
      formatearHito(fila.accesoNivel3),
      formatearHito(fila.accesoNivel6),
      formatearHito(fila.arbolCompleto),
      fila.nivelMaestriaFinal,
      fila.puntosUniversalesRestantes,
      "Con 2 usos/enemigo, maestría 3 debería llegar en nivel 3–5 y maestría 6 en nivel 5–7.",
      crearEtiquetaEstado(estado),
    ];
  });

  llenar("balancePuntosCuerpo", informe.puntosHabilidad.hitos, (fila) => [
    fila.nivelMaestria,
    fila.puntosEspecificos,
    fila.puntosUniversalesMinimos,
    fila.puntosTotales,
    fila.objetivo,
    fila.puntosNecesarios,
    "Los puntos disponibles deben alcanzar el objetivo del hito sin crear grados gratuitos.",
    crearEtiquetaEstado(fila.alcanza ? ESTADOS.CORRECTO : ESTADOS.INCORRECTO),
  ]);

  llenar("balanceManaCuerpo", informe.mana.filasDestacadas, (fila) => {
    const basicasCorrectas = fila.lanzamientosBasicaBarata >= 4;
    const avanzadasCorrectas = fila.nivel < 6 || fila.lanzamientosAvanzadaCara >= 2;
    const estado = basicasCorrectas && avanzadasCorrectas
      ? ESTADOS.CORRECTO
      : ESTADOS.ADVERTENCIA;
    return [
      fila.profesion,
      fila.nivel,
      fila.vidaMaxima,
      fila.manaMaximo,
      `${formatearNumero(fila.regeneracionManaPorPulso)} / 100`,
      fila.lanzamientosBasicaBarata,
      fila.lanzamientosAvanzadaCara,
      fila.ataquesDobleVarita,
      "Debe permitir al menos 4 habilidades básicas y, desde nivel 6, 2 avanzadas con la reserva completa.",
      crearEtiquetaEstado(estado),
    ];
  });

  llenar("balancePerfilesMagoCuerpo", informe.mana.perfilesAlternativosMago, (fila) => [
    fila.nombreEstrategia,
    fila.nivel,
    fila.inteligencia,
    fila.sabiduria,
    fila.manaMaximo,
    formatearNumero(fila.regeneracionManaPorPulso),
    formatearNumero(fila.pulsosParaRecuperarTodo),
    formatearNumero(fila.multiplicadorDanioMagico),
    formatearNumero(fila.multiplicadorEfectos),
    "Comparación estratégica: no existe un único valor correcto mientras cada perfil conserve una ventaja distinta.",
    crearEtiquetaEstado(ESTADOS.INFORMATIVO),
  ]);

  const varitas = informe.sostenibilidadMana.varitas.filter(
    (fila) => fila.categoria === "tier_1",
  );
  llenar("balanceVaritasCuerpo", varitas, (fila) => {
    const estado = fila.estado === "consume_mana"
      ? ESTADOS.CORRECTO
      : ESTADOS.ADVERTENCIA;
    return [
      fila.profesion,
      fila.nivel,
      fila.accion,
      fila.costoMana,
      formatearNumero(fila.regeneracionDuranteAccion),
      formatearNumero(fila.costoNetoPromedio),
      fila.accionesAproximadasHastaAgotar ?? "No se agota",
      "El coste real debería ser positivo; si la regeneración anula el gasto, debe revisarse junto con el daño.",
      crearEtiquetaEstado(estado),
    ];
  });

  llenar("balanceConstitucionCuerpo", informe.constitucion.filas, (fila) => [
    fila.constitucion,
    `${fila.bonoResistencia} %`,
    `${formatearNumero(fila.probabilidadFinalBase100)} %`,
    `${formatearNumero(fila.probabilidadFinalBase40)} %`,
    `${formatearNumero(fila.probabilidadFinalBase20)} %`,
    "Escenario teórico: el bono debe ser pequeño, no superar 10 % y nunca convertir resistencia en inmunidad.",
    crearEtiquetaEstado(ESTADOS.INFORMATIVO),
  ]);
}

function dibujarTablasCombate(combate) {
  llenar("balanceReferenciasCuerpo", combate.referencias.filas, (fila) => [
    fila.nivel,
    fila.cantidadEnemigos,
    fila.vida,
    fila.armadura,
    fila.evasion,
    Object.entries(fila.resistencias).map(([id, valor]) => `${id}: ${valor} %`).join(" · "),
    fila.criterio,
    crearEtiquetaEstado(fila.estado),
  ]);

  llenar("balanceArmasDanioCuerpo", combate.armas.filas, (fila) => [
    fila.nombre,
    `T${fila.tier}`,
    fila.profesionReferencia,
    fila.objetivoReferencia,
    `${formatearNumero(fila.probabilidadImpactoPromedio)} %`,
    formatearNumero(fila.danioSinCritico),
    formatearNumero(fila.danioCritico),
    formatearNumero(fila.danioEsperadoAccion),
    formatearNumero(fila.danioEsperadoPor100),
    fila.danioEsperadoPorMana === null ? "—" : formatearNumero(fila.danioEsperadoPorMana),
    fila.alcance,
    fila.criterio,
    crearEtiquetaEstado(fila.estado),
  ]);

  llenar("balanceHabilidadesDanioCuerpo", combate.habilidades.filasPrincipales, (fila) => [
    fila.habilidad,
    capitalizar(fila.categoria),
    fila.grado,
    fila.nivelReferencia,
    `${fila.potenciaHabilidad} %`,
    fila.costoMana,
    fila.costoTemporal,
    `${formatearNumero(fila.probabilidadImpacto)} %`,
    formatearNumero(fila.danioSinCritico),
    formatearNumero(fila.danioCritico),
    formatearNumero(fila.danioTotalEsperado),
    formatearNumero(fila.danioEsperadoPor100),
    fila.danioEsperadoPorMana === null ? "—" : formatearNumero(fila.danioEsperadoPorMana),
    formatearNumero(fila.danioTresObjetivos),
    fila.criterio,
    crearEtiquetaEstado(fila.estado),
  ]);

  llenar("balanceResistenciasCuerpo", combate.habilidades.resistenciaMaximos, (fila) => [
    fila.habilidad,
    fila.grado,
    `${fila.resistenciaElemental} %`,
    `${fila.resistenciaEfecto} %`,
    formatearNumero(fila.danioDirectoEsperado),
    formatearNumero(fila.danioPeriodicoEsperado),
    formatearNumero(fila.danioTotalEsperado),
    `${formatearNumero(fila.probabilidadAplicacionEfecto)} %`,
    "A 75 % debe perder potencia, pero conservar utilidad proporcional mediante daño, área o control.",
    crearEtiquetaEstado(evaluarResistenciaFila(fila, combate.habilidades.resistenciaMaximos)),
  ]);

  llenar("balancePotenciaCuerpo", combate.potencia.filas, (fila) => [
    fila.nombre,
    `T${fila.tier}`,
    fila.tipo === "real" ? "Equipo base" : "Con afijo máximo",
    `${fila.potenciaHabilidad} %`,
    `×${formatearNumero(fila.multiplicadorHabilidad)}`,
    fila.cantidadCatalizadores,
    fila.criterio,
    crearEtiquetaEstado(fila.estado),
  ]);

  llenar("balanceArquetiposCuerpo", combate.arquetipos.filas, (fila) => [
    fila.nombre,
    fila.profesion,
    fila.arma,
    fila.habilidad,
    `${fila.ataquesBasicos} + ${fila.lanzamientos}`,
    fila.costoMana,
    fila.costoTemporal,
    formatearNumero(fila.danioObjetivoUnico),
    formatearNumero(fila.danioTresObjetivos),
    formatearNumero(fila.danioPor100),
    fila.dependenciaEquipo,
    fila.criterio,
    crearEtiquetaEstado(fila.estado),
  ]);
}

function evaluarResistenciaFila(fila, filas) {
  if (fila.resistenciaElemental === 0) return ESTADOS.INFORMATIVO;
  const base = filas.find(
    (otra) =>
      otra.idHabilidad === fila.idHabilidad &&
      otra.grado === fila.grado &&
      otra.escenarioPotencia === fila.escenarioPotencia &&
      otra.resistenciaElemental === 0,
  );
  if (!base || base.danioTotalEsperado <= 0) return ESTADOS.INFORMATIVO;
  const proporcion = fila.danioTotalEsperado / base.danioTotalEsperado;
  const esperada = 1 - fila.resistenciaElemental / 100;
  return Math.abs(proporcion - esperada) <= 0.12
    ? ESTADOS.CORRECTO
    : ESTADOS.ADVERTENCIA;
}

function dibujarEscenarios(escenarios) {
  const multiplicadoresArco = escenarios.arcos.map((fila) => fila.multiplicadorDanioParaIgualar);
  const reduccionesEspera = escenarios.habilidadesBasicas.map((fila) => fila.reduccionRendimientoPorcentual);
  const recuperacionesPociones = [...new Set(escenarios.pocionesMana.map((fila) => fila.escenario))];
  elementos.balanceEscenarios.replaceChildren(
    crearEscenario("Recarga del arco", [
      "No existe actualmente una recarga separada.",
      `Una recarga de 100 exigiría multiplicar el daño entre ${formatearNumero(Math.min(...multiplicadoresArco))} y ${formatearNumero(Math.max(...multiplicadoresArco))} para conservar el daño por tiempo.`,
    ]),
    crearEscenario("Espera de habilidades", [
      "Las habilidades consumen tiempo al lanzarse, pero no tienen enfriamiento posterior.",
      `Agregar 100 de espera reduciría el rendimiento entre ${formatearNumero(Math.min(...reduccionesEspera))} % y ${formatearNumero(Math.max(...reduccionesEspera))} %.`,
    ]),
    crearEscenario("Pociones de Maná", [
      "No existe actualmente una poción de Maná.",
      `Se comparan de forma teórica ${recuperacionesPociones.join(", ")} con un coste de consumo de 100.`,
    ]),
  );
}

function dibujarAdvertencias(advertencias) {
  elementos.balanceAdvertencias.replaceChildren(
    ...advertencias.map((advertencia) => {
      const li = document.createElement("li");
      li.textContent = advertencia.mensaje;
      return li;
    }),
  );
}

function llenar(id, filas, crearValores) {
  elementos[id].replaceChildren(
    ...filas.map((fila) => crearFilaTabla(crearValores(fila))),
  );
}

function crearFilaTabla(valores) {
  const tr = document.createElement("tr");
  for (const valor of valores) {
    const td = document.createElement("td");
    if (valor instanceof Node) td.appendChild(valor);
    else td.textContent = `${valor}`;
    tr.appendChild(td);
  }
  return tr;
}

function crearEtiquetaEstado(estado) {
  const normalizado = normalizarEstado(estado);
  const etiqueta = document.createElement("span");
  etiqueta.className = `balance-etiqueta balance-etiqueta--${normalizado}`;
  etiqueta.textContent = {
    correcto: "Correcto",
    advertencia: "Advertencia",
    incorrecto: "Incorrecto",
    informativo: "Informativo",
  }[normalizado];
  return etiqueta;
}

function normalizarEstado(estado) {
  if (estado === "correcto") return ESTADOS.CORRECTO;
  if (["advertencia", "demasiado_rapido", "demasiado_lento"].includes(estado)) {
    return ESTADOS.ADVERTENCIA;
  }
  if (estado === "incorrecto") return ESTADOS.INCORRECTO;
  return ESTADOS.INFORMATIVO;
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

function crearEscenario(titulo, textos) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "balance-escenario";
  const h3 = document.createElement("h3");
  h3.textContent = titulo;
  tarjeta.appendChild(h3);
  for (const texto of textos) {
    const p = document.createElement("p");
    p.textContent = texto;
    tarjeta.appendChild(p);
  }
  return tarjeta;
}

function prepararCarga() {
  elementos.balanceEstado.textContent = "Calculando balance…";
  elementos.balanceEstado.className = "balance-estado";
  elementos.balanceError.hidden = true;
  elementos.balanceError.textContent = "";
  for (const [id, elemento] of Object.entries(elementos)) {
    if (id === "balanceRecargar" || id === "balanceEstado" || id === "balanceError") continue;
    elemento.replaceChildren();
  }
}

function mostrarError(error) {
  console.error(error);
  elementos.balanceEstado.textContent = "No se pudo completar el análisis.";
  elementos.balanceEstado.className = "balance-estado balance-estado--error";
  elementos.balanceError.hidden = false;
  elementos.balanceError.textContent = error instanceof Error ? error.message : `${error}`;
}

function formatearHito(hito) {
  if (!hito) return "No alcanzado";
  return `Nivel ${hito.nivelGeneral} · ${hito.usosTotales} usos`;
}

function formatearNumero(valor) {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return "—";
  return new Intl.NumberFormat("es-UY", { maximumFractionDigits: 2 }).format(Number(valor));
}

function capitalizar(texto) {
  return `${texto}`.charAt(0).toUpperCase() + `${texto}`.slice(1);
}

function mediana(valores) {
  const ordenados = valores.filter(Number.isFinite).sort((a, b) => a - b);
  if (ordenados.length === 0) return 0;
  const medio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? (ordenados[medio - 1] + ordenados[medio]) / 2
    : ordenados[medio];
}
