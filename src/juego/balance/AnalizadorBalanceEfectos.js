import { crearEnemigo } from "../fabricas/FabricaEnemigos.js";
import { SistemaEfectosTemporales } from "../efectos/SistemaEfectosTemporales.js";
import { crearAtributosIniciales } from "../generacion/GeneradorAtributos.js";

const IDS_EFECTOS_VISIBLES = Object.freeze([
  "congelamiento",
  "aturdimiento",
  "envenenamiento",
  "quemadura",
]);
const RESISTENCIAS_ELEMENTALES = Object.freeze([
  "fuego",
  "frio",
  "rayo",
  "veneno",
]);
const RANURAS_ACCESORIOS = Object.freeze([
  "collar",
  "anillo_izquierdo",
  "anillo_derecho",
]);
const FACTORES_TEMPORALES = Object.freeze([
  "factorTiempo",
  "factorMovimiento",
  "factorAtaque",
  "factorAccion",
  "factorConsumo",
]);

// Este analizador no reproduce las reglas de los efectos: construye casos
// deterministas y los ejecuta mediante SistemaEfectosTemporales. Los cálculos
// teóricos de Constitución y accesorios se mantienen marcados como escenarios
// no implementados.
export function crearInformeBalanceEfectos({
  configuracionEnemigos,
  configuracionObjetos,
  configuracionGeneracionObjetos,
  configuracionMapas,
  configuracionEjecucionHabilidades,
  configuracionPersonaje,
  objetivosBalance,
} = {}) {
  validarEntrada({
    configuracionEnemigos,
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracionMapas,
    configuracionEjecucionHabilidades,
    configuracionPersonaje,
    objetivosBalance,
  });

  const objetivos = objetivosBalance.analisisEfectos;
  const usos = obtenerUsosEfectos(configuracionEjecucionHabilidades);
  const probabilidades = analizarProbabilidades({ usos, objetivos });
  const contratos = analizarContratos({ usos });
  const inmunidades = analizarInmunidades({ usos, objetivos });
  const constitucion = analizarConstitucion({
    configuracionPersonaje,
    objetivos,
  });
  const enemigos = analizarEnemigos({
    configuracionEnemigos,
    configuracionObjetos,
    configuracionMapas,
    objetivos,
  });
  const afijos = analizarAfijos({
    configuracionGeneracionObjetos,
    objetivos,
  });

  const resumen = {
    usosEfectosAnalizados: usos.length,
    casosProbabilidad: probabilidades.filas.length,
    contratosProbados: contratos.filas.length,
    inmunidadesProbadas: inmunidades.filas.length,
    perfilesConstitucion: constitucion.filas.length,
    enemigosVariantesAnalizados: enemigos.filas.length,
    enemigosExtremos: enemigos.extremos.length,
    afijosAnalizados: afijos.filas.length,
    casosAcumulacionAccesorios: afijos.acumulacion.length,
    correctos:
      contarEstado(probabilidades.filas, "correcto") +
      contarEstado(contratos.filas, "correcto") +
      contarEstado(inmunidades.filas, "correcto") +
      contarEstado(enemigos.filas, "correcto") +
      contarEstado(afijos.filas, "correcto") +
      contarEstado(afijos.acumulacion, "correcto"),
    advertencias:
      contarEstado(probabilidades.filas, "advertencia") +
      contarEstado(contratos.filas, "advertencia") +
      contarEstado(inmunidades.filas, "advertencia") +
      contarEstado(enemigos.filas, "advertencia") +
      contarEstado(afijos.filas, "advertencia") +
      contarEstado(afijos.acumulacion, "advertencia"),
    incorrectos:
      contarEstado(probabilidades.filas, "incorrecto") +
      contarEstado(contratos.filas, "incorrecto") +
      contarEstado(inmunidades.filas, "incorrecto") +
      contarEstado(enemigos.filas, "incorrecto") +
      contarEstado(afijos.filas, "incorrecto") +
      contarEstado(afijos.acumulacion, "incorrecto"),
  };

  return congelarProfundamente({
    tipoResultado: "simulacion_determinista_motores_reales",
    determinista: true,
    origenes: {
      probabilidades: "SistemaEfectosTemporales",
      contratos: "SistemaEfectosTemporales",
      inmunidades: "SistemaEfectosTemporales",
      enemigos: "FabricaEnemigos",
      constitucion: "escenario teórico no implementado",
      afijos: "catálogo validado de generación de objetos",
    },
    resumen,
    probabilidades,
    contratos,
    inmunidades,
    constitucion,
    enemigos,
    afijos,
    conclusiones: crearConclusiones({
      probabilidades,
      contratos,
      inmunidades,
      constitucion,
      enemigos,
      afijos,
    }),
  });
}

function obtenerUsosEfectos(configuracion) {
  const usos = [];
  for (const [idHabilidad, habilidad] of Object.entries(
    configuracion.habilidades,
  )) {
    if (!habilidad.ejecucion) continue;
    for (const [gradoTexto, grado] of Object.entries(
      habilidad.ejecucion.grados,
    )) {
      for (const efecto of grado.efectos ?? []) {
        if (!IDS_EFECTOS_VISIBLES.includes(efecto.efectoId)) continue;
        usos.push({
          idHabilidad,
          habilidad: habilidad.nombre,
          maestria: habilidad.maestria,
          grado: Number(gradoTexto),
          ...copiarProfundo(efecto),
        });
      }
    }
  }
  return usos.sort((a, b) =>
    a.efectoId.localeCompare(b.efectoId) ||
    a.habilidad.localeCompare(b.habilidad) ||
    a.grado - b.grado,
  );
}

function analizarProbabilidades({ usos, objetivos }) {
  const filas = [];
  for (const uso of usos) {
    for (const resistencia of objetivos.resistenciasPrueba) {
      const objetivo = crearObjetivoPrueba({
        resistenciasEfectos: { [uso.resistenciaId]: resistencia },
      });
      const sistema = crearSistema();
      const resultado = sistema.aplicar(
        crearDefinicion({ uso, objetivo, potencia: uso.valorBase ?? 1 }),
        { obtenerTiradaAplicacion: () => 1 },
      );
      const probabilidadFinal = resultado.probabilidadFinal ?? 0;
      const intentosEsperados = probabilidadFinal > 0
        ? redondear(100 / probabilidadFinal)
        : null;
      const estado = clasificarIntentos({ intentosEsperados, objetivos });
      filas.push({
        habilidad: uso.habilidad,
        grado: uso.grado,
        efecto: uso.nombreEfecto,
        efectoId: uso.efectoId,
        probabilidadBase: uso.probabilidadBase,
        resistencia,
        probabilidadFinal: redondear(probabilidadFinal),
        intentosEsperados,
        resultadoMotor: resultado.estadoAplicacion,
        estado,
        criterio:
          `Correcto hasta ${objetivos.intentosCorrectosMaximo} intentos; ` +
          `advertencia hasta ${objetivos.intentosAdvertenciaMaximo}.`,
      });
      sistema.destruir();
    }
  }
  return {
    filas,
    resumen: resumirEstados(filas),
  };
}

function clasificarIntentos({ intentosEsperados, objetivos }) {
  if (intentosEsperados === null) return "incorrecto";
  if (intentosEsperados <= objetivos.intentosCorrectosMaximo) {
    return "correcto";
  }
  if (intentosEsperados <= objetivos.intentosAdvertenciaMaximo) {
    return "advertencia";
  }
  return "incorrecto";
}

function analizarContratos({ usos }) {
  const congelamiento = buscarUso(usos, "congelamiento");
  const aturdimiento = buscarUso(usos, "aturdimiento", { mayorGrado: true });
  const quemaduraDebil = buscarUso(usos, "quemadura");
  const quemaduraFuerte = buscarUso(usos, "quemadura", { mayorGrado: true });
  const venenoDebil = buscarUso(usos, "envenenamiento", {
    perfilAplicacion: "refrescar_mayor_potencia",
  });
  const venenoFuerte = buscarUso(usos, "envenenamiento", {
    perfilAplicacion: "refrescar_mayor_potencia",
    mayorGrado: true,
  });
  const plaga = buscarUso(usos, "envenenamiento", {
    perfilAplicacion: "intensificar",
    mayorGrado: true,
  });

  const filas = [
    probarRechazoDuplicado(congelamiento),
    probarRechazoDuplicado(aturdimiento),
    probarRenovacionMayorPotencia({ usoDebil: quemaduraDebil, usoFuerte: quemaduraFuerte }),
    probarRenovacionMayorPotencia({ usoDebil: venenoDebil, usoFuerte: venenoFuerte }),
    probarIntensificacion(plaga),
  ];
  return { filas, resumen: resumirEstados(filas) };
}

function probarRechazoDuplicado(uso) {
  const objetivo = crearObjetivoPrueba();
  const sistema = crearSistema();
  const definicion = crearDefinicion({ uso, objetivo });
  const primero = sistema.aplicar(definicion, { obtenerTiradaAplicacion: () => 1 });
  const vencimientoPrimero = primero.efecto?.venceEn;
  const segundo = sistema.aplicar(definicion, { obtenerTiradaAplicacion: () => 1 });
  const activos = sistema.obtenerEfectosObjetivo(objetivo);
  const correcto =
    primero.aplicado === true &&
    segundo.estadoAplicacion === "rechazado_por_politica" &&
    segundo.motivo === "duplicado" &&
    activos.length === 1 &&
    activos[0].venceEn === vencimientoPrimero;
  const fila = {
    efecto: uso.nombreEfecto,
    contrato: "No acumula ni renueva mientras está activo",
    primeraAplicacion: primero.estadoAplicacion,
    reaplicacion: segundo.estadoAplicacion,
    motivo: segundo.motivo,
    instancias: activos.length,
    eventosPendientes: sistema.obtenerCantidadEventosPendientes(),
    estado: correcto ? "correcto" : "incorrecto",
    criterio: "La segunda aplicación debe rechazarse, conservar una instancia y no renovar el vencimiento.",
  };
  sistema.destruir();
  return fila;
}

function probarRenovacionMayorPotencia({ usoDebil, usoFuerte }) {
  const objetivo = crearObjetivoPrueba();
  const sistema = crearSistema();
  const primero = sistema.aplicar(
    crearDefinicion({ uso: usoFuerte, objetivo, potencia: usoFuerte.valorBase }),
    { obtenerTiradaAplicacion: () => 1 },
  );
  const segundo = sistema.aplicar(
    crearDefinicion({ uso: usoDebil, objetivo, potencia: usoDebil.valorBase }),
    { obtenerTiradaAplicacion: () => 1 },
  );
  const activos = sistema.obtenerEfectosObjetivo(objetivo);
  const eventosPendientes = sistema.obtenerCantidadEventosPendientes();
  const instanteTick = usoFuerte.intervalo ?? 100;
  sistema.avanzarTiempoParaPrueba(instanteTick);
  const resultadoTick = sistema.procesarEventosEn(instanteTick);
  const eventoDanio = resultadoTick.eventos.find(
    (evento) => evento.tipo === "danio_periodico_aplicado",
  );
  const potenciaActiva = eventoDanio?.danioBruto ?? eventoDanio?.danio ?? 0;
  const correcto =
    primero.aplicado === true &&
    segundo.aplicado === true &&
    segundo.estadoAplicacion === "aplicado" &&
    activos.length === 1 &&
    eventosPendientes === 2 &&
    potenciaActiva >= usoFuerte.valorBase;
  const fila = {
    efecto: usoFuerte.nombreEfecto,
    contrato: "Renueva duración y conserva la mayor potencia",
    primeraAplicacion: primero.estadoAplicacion,
    reaplicacion: segundo.estadoAplicacion,
    motivo: segundo.motivo ?? "renovado",
    instancias: activos.length,
    potenciaEsperada: usoFuerte.valorBase,
    potenciaActiva: redondear(potenciaActiva),
    eventosPendientes,
    estado: correcto ? "correcto" : "incorrecto",
    criterio: "Debe quedar una sola instancia, una sola agenda y el siguiente tick debe conservar la mayor potencia.",
  };
  sistema.destruir();
  return fila;
}

function probarIntensificacion(uso) {
  const objetivo = crearObjetivoPrueba();
  const sistema = crearSistema();
  const resultados = [];
  for (let intento = 0; intento < uso.maximo + 1; intento += 1) {
    resultados.push(
      sistema.aplicar(crearDefinicion({ uso, objetivo }), {
        obtenerTiradaAplicacion: () => 1,
      }),
    );
  }
  const activos = sistema.obtenerEfectosObjetivo(objetivo);
  const intensidad = activos[0]?.intensidad ?? 0;
  const correcto =
    resultados.every((resultado) => resultado.aplicado === true) &&
    activos.length === 1 &&
    intensidad === uso.maximo;
  const fila = {
    efecto: `${uso.nombreEfecto} — ${uso.habilidad}`,
    contrato: "Intensifica hasta el máximo sin crear instancias paralelas",
    primeraAplicacion: resultados[0]?.estadoAplicacion,
    reaplicacion: resultados.at(-1)?.estadoAplicacion,
    motivo: resultados.at(-1)?.motivo ?? "máximo conservado",
    instancias: activos.length,
    intensidadEsperada: uso.maximo,
    intensidadActiva: intensidad,
    eventosPendientes: sistema.obtenerCantidadEventosPendientes(),
    estado: correcto ? "correcto" : "incorrecto",
    criterio: "Debe alcanzar la intensidad máxima configurada manteniendo una única instancia y una única agenda.",
  };
  sistema.destruir();
  return fila;
}

function analizarInmunidades({ usos, objetivos }) {
  const filas = [];
  for (const idEfecto of IDS_EFECTOS_VISIBLES) {
    const uso = buscarUso(usos, idEfecto, { mayorGrado: true });
    const resistenciaPrueba = objetivos.resistenciaMensajePrueba;

    const objetivoResistente = crearObjetivoPrueba({
      resistenciasEfectos: { [uso.resistenciaId]: resistenciaPrueba },
    });
    const sistemaResistencia = crearSistema();
    const resistido = sistemaResistencia.aplicar(
      crearDefinicion({ uso, objetivo: objetivoResistente }),
      { obtenerTiradaAplicacion: () => 100 },
    );
    filas.push({
      efecto: uso.nombreEfecto,
      escenario: "Resistencia alta",
      resistencia: resistenciaPrueba,
      inmunidad: false,
      resultado: resistido.estadoAplicacion,
      mensaje: resistido.mensaje,
      activosDespues: sistemaResistencia.obtenerEfectosObjetivo(objetivoResistente).length,
      estado: resistido.estadoAplicacion === "resistido" ? "correcto" : "incorrecto",
      criterio: "Una tirada fallida por resistencia debe mostrarse como resistida, no como inmune.",
    });
    sistemaResistencia.destruir();

    const objetivoInmune = crearObjetivoPrueba({ inmunidadesEfectos: [uso.inmunidadId] });
    const sistemaInmune = crearSistema();
    const inmune = sistemaInmune.aplicar(
      crearDefinicion({ uso, objetivo: objetivoInmune }),
      { obtenerTiradaAplicacion: () => 1 },
    );
    filas.push({
      efecto: uso.nombreEfecto,
      escenario: "Inmunidad previa",
      resistencia: 0,
      inmunidad: true,
      resultado: inmune.estadoAplicacion,
      mensaje: inmune.mensaje,
      activosDespues: sistemaInmune.obtenerEfectosObjetivo(objetivoInmune).length,
      estado: inmune.estadoAplicacion === "inmune" ? "correcto" : "incorrecto",
      criterio: "Una inmunidad explícita debe informar 'inmune' y no crear el efecto.",
    });
    sistemaInmune.destruir();

    const objetivoAdquiere = crearObjetivoPrueba();
    const sistemaAdquiere = crearSistema();
    const aplicado = sistemaAdquiere.aplicar(
      crearDefinicion({ uso, objetivo: objetivoAdquiere }),
      { obtenerTiradaAplicacion: () => 1 },
    );
    objetivoAdquiere.estadisticasBase.inmunidadesEfectos = [uso.inmunidadId];
    const retiro = sistemaAdquiere.sincronizarInmunidades(objetivoAdquiere);
    const activosDespues = sistemaAdquiere.obtenerEfectosObjetivo(objetivoAdquiere).length;
    filas.push({
      efecto: uso.nombreEfecto,
      escenario: "Inmunidad adquirida durante el efecto",
      resistencia: 0,
      inmunidad: true,
      resultado: retiro.cantidad > 0 ? "retirado_por_inmunidad" : "no_retirado",
      mensaje: retiro.eventos[0]?.motivo ?? "sin evento",
      activosDespues,
      estado:
        aplicado.aplicado && retiro.cantidad === 1 && activosDespues === 0
          ? "correcto"
          : "incorrecto",
      criterio: "Al adquirir inmunidad, el efecto activo debe retirarse inmediatamente y quedar en cero instancias.",
    });
    sistemaAdquiere.destruir();
  }
  return { filas, resumen: resumirEstados(filas) };
}

function analizarConstitucion({ configuracionPersonaje, objetivos }) {
  const profesiones = configuracionPersonaje.profesiones ?? {};
  const filas = [];
  for (const [idProfesion, profesion] of Object.entries(profesiones)) {
    const atributosCreacion = crearPerfilCreacionDeterminista({
      configuracionPersonaje,
      profesion,
    });
    const constitucionInicial = atributosCreacion.constitucion;
    for (const nivel of objetivos.nivelesConstitucion) {
      for (const estrategia of objetivos.estrategiasConstitucion) {
        const puntosGanados = Math.max(0, nivel - 1);
        const invertidos = estrategia === "alta"
          ? puntosGanados
          : estrategia === "moderada"
            ? Math.floor(puntosGanados / 2)
            : 0;
        const constitucion = constitucionInicial + invertidos;
        const bono = calcularBonoConstitucion(constitucion, objetivos);
        filas.push({
          profesion: profesion.nombre ?? capitalizar(idProfesion),
          nivel,
          estrategia,
          constitucionInicial,
          puntosNivelEnConstitucion: invertidos,
          constitucion,
          bonoResistencia: bono,
          probabilidadBase40: redondear(40 * (1 - bono / 100)),
          probabilidadBase100: redondear(100 * (1 - bono / 100)),
          reemplazaAfijos: bono >= objetivos.afijoMedioReferencia,
          estado: "informativo",
          criterio:
            `Escenario no implementado: máximo ${objetivos.bonificacionMaximaConstitucion} % y debe quedar por debajo de un afijo medio (${objetivos.afijoMedioReferencia} %).`,
        });
      }
    }
  }
  return {
    formula:
      `1 % cada ${objetivos.puntosConstitucionPorPorcentaje} puntos por encima de ${objetivos.constitucionReferencia}; máximo ${objetivos.bonificacionMaximaConstitucion} %.`,
    filas,
    resumen: {
      cantidad: filas.length,
      bonoMinimo: Math.min(...filas.map((fila) => fila.bonoResistencia)),
      bonoMaximo: Math.max(...filas.map((fila) => fila.bonoResistencia)),
      reemplazaAfijos: filas.some((fila) => fila.reemplazaAfijos),
    },
  };
}

function crearPerfilCreacionDeterminista({
  configuracionPersonaje,
  profesion,
}) {
  const atributos = crearAtributosIniciales(configuracionPersonaje);
  const asignados = Object.fromEntries(
    Object.keys(atributos).map((id) => [id, 0]),
  );
  const configuracion = configuracionPersonaje.atributos;

  for (let punto = 0; punto < configuracion.puntosDisponibles; punto += 1) {
    const candidatos = configuracion.lista
      .filter(
        ({ id }) =>
          (profesion.pesosAtributos[id] ?? 0) > 0 &&
          atributos[id] < configuracion.valorMaximo,
      )
      .map(({ id }, indice) => ({
        id,
        indice,
        prioridad:
          (profesion.pesosAtributos[id] ?? 0) / (asignados[id] + 1),
      }))
      .sort(
        (a, b) => b.prioridad - a.prioridad || a.indice - b.indice,
      );
    if (candidatos.length === 0) {
      throw new Error(
        `No se pudieron distribuir los atributos de ${profesion.nombre}.`,
      );
    }
    const elegido = candidatos[0].id;
    atributos[elegido] += 1;
    asignados[elegido] += 1;
  }
  return atributos;
}

function calcularBonoConstitucion(constitucion, objetivos) {
  return Math.min(
    objetivos.bonificacionMaximaConstitucion,
    Math.max(
      0,
      Math.floor(
        (constitucion - objetivos.constitucionReferencia) /
          objetivos.puntosConstitucionPorPorcentaje,
      ),
    ),
  );
}

function analizarEnemigos({
  configuracionEnemigos,
  configuracionObjetos,
  configuracionMapas,
  objetivos,
}) {
  const apariciones = crearAparicionesEnemigos(configuracionMapas);
  const filas = [];
  const idsVariantes = [null, ...Object.keys(configuracionEnemigos.variantes)];

  for (const [idPlantilla, plantilla] of Object.entries(
    configuracionEnemigos.plantillas,
  )) {
    const ubicaciones = apariciones.get(idPlantilla) ?? [{
      idMapa: "sin_mapa",
      mapa: "Sin mapa asignado",
      nivel: plantilla.nivelesPermitidos?.minimo ?? 1,
      rol: "sin_asignar",
    }];
    for (const ubicacion of ubicaciones) {
      for (const idVariante of idsVariantes) {
        if (ubicacion.rol === "jefe" && idVariante !== null) continue;
        const nivel = limitar(
          ubicacion.nivel,
          plantilla.nivelesPermitidos?.minimo ?? 1,
          plantilla.nivelesPermitidos?.maximo ?? 20,
        );
        const enemigo = crearEnemigo({
          configuracionEnemigos,
          configuracionObjetos,
          idPlantilla,
          idVariante,
          nivel,
        });
        const stats = enemigo.estadisticasDerivadas;
        const resistencias = copiarResistencias(stats.resistencias, RESISTENCIAS_ELEMENTALES);
        const resistenciasEfectos = copiarResistencias(
          stats.resistenciasEfectos,
          IDS_EFECTOS_VISIBLES,
        );
        const inmunidades = [...(stats.inmunidadesEfectos ?? [])];
        const evaluacion = evaluarDefensasEnemigo({
          resistencias,
          resistenciasEfectos,
          inmunidades,
          rol: ubicacion.rol,
          objetivos,
        });
        filas.push({
          idPlantilla,
          enemigo: enemigo.nombre,
          variante: idVariante ?? "normal",
          mapa: ubicacion.mapa,
          rol: ubicacion.rol,
          nivel,
          vida: stats.vidaMaxima,
          armadura: stats.armadura,
          evasion: redondear(stats.evasion),
          precision: redondear(stats.precision),
          factorTiempo: redondear(enemigo.factorTiempo),
          factorMovimiento: redondear(enemigo.factorMovimiento),
          experiencia: enemigo.experienciaOtorgada,
          resistencias,
          resistenciasEfectos,
          inmunidades,
          defensasAltas: evaluacion.defensasAltas,
          estado: evaluacion.estado,
          criterio: evaluacion.criterio,
        });
      }
    }
  }

  const extremos = filas.filter((fila) =>
    fila.inmunidades.length > 0 ||
    Math.max(...Object.values(fila.resistencias)) >= objetivos.resistenciaAlta ||
    Math.max(...Object.values(fila.resistenciasEfectos)) >= objetivos.resistenciaAlta,
  );

  return {
    filas,
    extremos,
    resumen: {
      cantidad: filas.length,
      extremos: extremos.length,
      plantillasAdvertencia: new Set(
        filas
          .filter((fila) => fila.estado === "advertencia")
          .map((fila) => fila.idPlantilla),
      ).size,
      ...resumirEstados(filas),
    },
  };
}

function crearAparicionesEnemigos(configuracionMapas) {
  const apariciones = new Map();
  const registrar = ({ id, mapa, idMapa, nivel, rol }) => {
    if (!id) return;
    const actual = apariciones.get(id) ?? [];
    const clave = `${idMapa}:${nivel}:${rol}`;
    if (!actual.some((fila) => fila.clave === clave)) {
      actual.push({ clave, idMapa, mapa, nivel, rol });
      apariciones.set(id, actual);
    }
  };
  for (const [idMapa, mapa] of Object.entries(configuracionMapas.plantillas)) {
    const nivelMedio = Math.round((mapa.niveles.minimo + mapa.niveles.maximo) / 2);
    for (const permitido of mapa.enemigos?.permitidos ?? []) {
      registrar({ id: permitido.id, mapa: mapa.nombre, idMapa, nivel: nivelMedio, rol: "normal" });
    }
    for (const permitido of mapa.encuentroEspecial?.permitidos ?? []) {
      registrar({ id: permitido.id, mapa: mapa.nombre, idMapa, nivel: mapa.niveles.maximo, rol: "especial" });
    }
    for (const permitido of mapa.jefe?.permitidos ?? []) {
      registrar({ id: permitido.id, mapa: mapa.nombre, idMapa, nivel: mapa.niveles.maximo, rol: "jefe" });
    }
  }
  return apariciones;
}

function evaluarDefensasEnemigo({
  resistencias,
  resistenciasEfectos,
  inmunidades,
  rol,
  objetivos,
}) {
  const elementalesExtremas = Object.entries(resistencias)
    .filter(([, valor]) => valor >= objetivos.resistenciaExtrema)
    .map(([id]) => id);
  const efectosExtremos = Object.entries(resistenciasEfectos)
    .filter(([, valor]) => valor >= objetivos.resistenciaExtrema)
    .map(([id]) => id);
  const defensasAltas = [
    ...Object.entries(resistencias)
      .filter(([, valor]) => valor >= objetivos.resistenciaAlta)
      .map(([id, valor]) => `${id} ${valor}%`),
    ...Object.entries(resistenciasEfectos)
      .filter(([, valor]) => valor >= objetivos.resistenciaAlta)
      .map(([id, valor]) => `${id} ${valor}%`),
    ...inmunidades.map((id) => `inmune ${id}`),
  ];

  if (
    elementalesExtremas.length > objetivos.maestriasCasiAnuladasMaximo ||
    efectosExtremos.length > objetivos.maestriasCasiAnuladasMaximo
  ) {
    return {
      estado: "incorrecto",
      defensasAltas,
      criterio: `No debería acercarse al 75 % en más de ${objetivos.maestriasCasiAnuladasMaximo} elemento o efecto simultáneamente.`,
    };
  }

  if (rol === "jefe") {
    const control = [
      resistenciasEfectos.congelamiento,
      resistenciasEfectos.aturdimiento,
    ];
    const dentroRango = control.every(
      (valor) =>
        valor >= objetivos.resistenciaControlJefeMinima &&
        valor <= objetivos.resistenciaControlJefeMaxima,
    );
    return {
      estado: dentroRango ? "correcto" : "advertencia",
      defensasAltas,
      criterio:
        `Un jefe debería tener ${objetivos.resistenciaControlJefeMinima}–${objetivos.resistenciaControlJefeMaxima} % contra Congelamiento y Aturdimiento, sin reglas por nombre.`,
    };
  }

  if (inmunidades.length > 0 || elementalesExtremas.length + efectosExtremos.length > 0) {
    return {
      estado: "advertencia",
      defensasAltas,
      criterio: "Una defensa extrema o inmunidad en un enemigo no jefe necesita justificación temática y una alternativa viable.",
    };
  }

  return {
    estado: "correcto",
    defensasAltas,
    criterio: "No combina varias defensas extremas ni inmunidades que anulen opciones completas.",
  };
}

function analizarAfijos({ configuracionGeneracionObjetos, objetivos }) {
  const sufijos = configuracionGeneracionObjetos.sufijos;
  const filas = [];
  for (const [id, sufijo] of Object.entries(sufijos)) {
    const propiedad = sufijo.efectos?.find((efecto) =>
      [
        "resistenciaCongelamiento",
        "resistenciaAturdimiento",
        "resistenciaEnvenenamiento",
        "resistenciaQuemadura",
      ].includes(efecto.propiedad),
    )?.propiedad;
    if (!propiedad) continue;
    const ranuras = sufijo.aplicaA?.ranurasIncluidas ?? [];
    const restringido =
      ranuras.length === RANURAS_ACCESORIOS.length &&
      RANURAS_ACCESORIOS.every((ranura) => ranuras.includes(ranura));
    for (const grado of sufijo.grados) {
      const rango = grado.valores[propiedad];
      filas.push({
        id,
        sufijo: sufijo.nombre,
        propiedad,
        grado: grado.grado,
        nivelObjetoMinimo: grado.nivelObjetoMinimo,
        minimo: rango.minimo,
        maximo: rango.maximo,
        pesoBase: sufijo.pesoBase,
        pesoGrado: grado.peso,
        ranuras: [...ranuras],
        estado: restringido && rango.maximo <= 15 ? "correcto" : "incorrecto",
        criterio: "Debe aparecer únicamente en collar y ambos anillos, sin superar 15 % por accesorio en el grado máximo.",
      });
    }
  }

  const maximoAfijo = Math.max(...filas.map((fila) => fila.maximo));
  const acumulacion = [];
  for (const cantidadAccesorios of [1, 2, 3]) {
    for (const constitucion of [0, objetivos.bonificacionMaximaConstitucion]) {
      const resistenciaBruta = cantidadAccesorios * maximoAfijo + constitucion;
      const resistenciaFinal = Math.min(
        objetivos.limiteResistenciaFinal,
        resistenciaBruta,
      );
      const estado = resistenciaFinal >= objetivos.inmunidadPracticaDesde
        ? "advertencia"
        : "correcto";
      acumulacion.push({
        cantidadAccesorios,
        valorPorAccesorio: maximoAfijo,
        bonoConstitucion: constitucion,
        resistenciaBruta,
        resistenciaFinal,
        probabilidadFinalBase100: 100 - resistenciaFinal,
        alcanzaLimite: resistenciaFinal >= objetivos.limiteResistenciaFinal,
        inmunidadPractica: resistenciaFinal >= objetivos.inmunidadPracticaDesde,
        estado,
        criterio:
          `Correcto por debajo de ${objetivos.inmunidadPracticaDesde} %; el límite absoluto es ${objetivos.limiteResistenciaFinal} %.`,
      });
    }
  }

  return {
    filas,
    acumulacion,
    resumen: {
      cantidadSufijos: new Set(filas.map((fila) => fila.id)).size,
      cantidadGrados: filas.length,
      maximoPorAccesorio: maximoAfijo,
      ...resumirEstados([...filas, ...acumulacion]),
    },
  };
}

function crearConclusiones({
  probabilidades,
  contratos,
  inmunidades,
  constitucion,
  enemigos,
  afijos,
}) {
  const probabilidadesProblematicas = probabilidades.filas.filter(
    (fila) => fila.estado !== "correcto",
  );
  const contratosCorrectos = contratos.resumen.incorrectos === 0;
  const inmunidadesCorrectas = inmunidades.resumen.incorrectos === 0;
  const extremos = enemigos.extremos;
  const acumulacionMaxima = Math.max(
    ...afijos.acumulacion.map((fila) => fila.resistenciaFinal),
  );

  return {
    resumenFacil: [
      {
        id: "efectos_probabilidad",
        queSeAnalizo: "La probabilidad real de aplicar Congelamiento, Aturdimiento, Envenenamiento y Quemadura con resistencias de 0 %, 25 %, 50 % y 75 %.",
        porQue: "Una resistencia alta debe proteger, pero no debería convertir todas las habilidades en una pérdida inútil de Maná.",
        conclusion: probabilidadesProblematicas.length === 0
          ? "Todas las combinaciones quedan dentro del esfuerzo esperado."
          : `${probabilidadesProblematicas.length} combinaciones necesitan atención porque requieren demasiados intentos esperados.`,
        recomendacion: probabilidadesProblematicas.length === 0
          ? "Mantener las probabilidades actuales."
          : "Revisar las filas marcadas antes de modificar probabilidades o resistencias enemigas.",
      },
      {
        id: "efectos_contratos",
        queSeAnalizo: "Reaplicación, renovación, conservación de potencia, intensidad y cantidad de instancias.",
        porQue: "Una reaplicación incorrecta puede crear controles permanentes o daño periódico duplicado.",
        conclusion: contratosCorrectos
          ? "Los cinco contratos probados mantienen una sola instancia y se comportan como fue diseñado."
          : "Existe al menos un contrato que no coincide con el diseño aprobado.",
        recomendacion: contratosCorrectos
          ? "No cambiar la arquitectura de efectos."
          : "Corregir el contrato antes de tocar números de balance.",
      },
      {
        id: "efectos_inmunidades",
        queSeAnalizo: "La diferencia entre resistido, inmune y adquirir inmunidad con un efecto activo.",
        porQue: "Las inmunidades deben ser explícitas y sus mensajes no deben confundirse con una resistencia normal.",
        conclusion: inmunidadesCorrectas
          ? "El motor distingue correctamente los tres casos y retira el efecto cuando se adquiere inmunidad."
          : "Algún escenario de inmunidad no produjo el resultado esperado.",
        recomendacion: inmunidadesCorrectas
          ? "Mantener el contrato actual de inmunidades."
          : "Corregir primero el flujo de inmunidades.",
      },
      {
        id: "constitucion_resistencias",
        queSeAnalizo: "El aporte teórico de Constitución en las profesiones y niveles 1, 3, 6 y 10.",
        porQue: "Queremos que Constitución ayude un poco sin reemplazar los accesorios ni favorecer automáticamente a los atributos mágicos.",
        conclusion: `El bono medido va de ${constitucion.resumen.bonoMinimo} % a ${constitucion.resumen.bonoMaximo} % y no supera un afijo medio.`,
        recomendacion: constitucion.resumen.reemplazaAfijos
          ? "Reducir la fórmula antes de implementarla."
          : "La fórmula parece pequeña y viable; decidir su implementación en 12.4B.",
      },
      {
        id: "enemigos_resistencias",
        queSeAnalizo: "Resistencias, inmunidades y estadísticas de enemigos normales, variantes, especiales y jefe en los mapas donde aparecen.",
        porQue: "Un enemigo no debería combinar tantas defensas que anule varias configuraciones a la vez.",
        conclusion: `${extremos.length} apariciones o variantes contienen al menos una resistencia de 50 % o más o una inmunidad. Las advertencias corresponden a ${enemigos.resumen.plantillasAdvertencia} plantillas distintas; ${enemigos.resumen.incorrectos} quedaron incorrectas.`,
        recomendacion: enemigos.resumen.incorrectos > 0
          ? "Revisar los enemigos incorrectos antes de aprobar cambios."
          : "Conservar los valores y revisar únicamente las advertencias temáticas.",
      },
      {
        id: "afijos_resistencias",
        queSeAnalizo: "Valores, ranuras y acumulación teórica de los cuatro sufijos de resistencia.",
        porQue: "Tres accesorios no deberían producir una inmunidad práctica con demasiada facilidad.",
        conclusion: `El máximo teórico medido es ${acumulacionMaxima} % incluyendo Constitución; no alcanza el límite de 75 %.`,
        recomendacion: afijos.resumen.incorrectos > 0
          ? "Corregir restricciones o valores antes de crear accesorios naturales."
          : "Mantener los sufijos actuales hasta el balance específico de accesorios.",
      },
    ],
  };
}

function crearSistema() {
  let tiempo = 0;
  const sistema = new SistemaEfectosTemporales({
    obtenerTiempoActual: () => tiempo,
  });
  sistema.avanzarTiempoParaPrueba = (cantidad) => {
    tiempo += cantidad;
    return tiempo;
  };
  return sistema;
}

function crearObjetivoPrueba({
  resistenciasEfectos = {},
  inmunidadesEfectos = [],
} = {}) {
  const estadisticasBase = {
    armadura: 0,
    resistencias: { fuego: 0, frio: 0, rayo: 0, veneno: 0 },
    resistenciasEfectos: {
      congelamiento: 0,
      aturdimiento: 0,
      envenenamiento: 0,
      quemadura: 0,
      ...resistenciasEfectos,
    },
    inmunidadesEfectos: [...inmunidadesEfectos],
  };
  const objetivo = {
    nombre: "Objetivo determinista",
    estaVivo: true,
    estaDestruido: false,
    estadisticasBase,
    vidaActual: 1000,
    recibirDanio(cantidad) {
      const aplicado = Math.max(0, Math.round(cantidad));
      this.vidaActual = Math.max(0, this.vidaActual - aplicado);
      this.estaVivo = this.vidaActual > 0;
      return aplicado;
    },
    get estadisticasDerivadas() {
      return this.estadisticasBase;
    },
  };
  for (const factor of FACTORES_TEMPORALES) objetivo[factor] = 100;
  return objetivo;
}

function crearDefinicion({ uso, objetivo, potencia = null }) {
  const comun = {
    idDefinicion: uso.efectoId,
    efectoId: uso.efectoId,
    nombreEfecto: uso.nombreEfecto,
    perfilAplicacion: uso.perfilAplicacion,
    grupoAcumulacion: uso.grupoAcumulacion,
    fuente: { id: "balance-determinista", nombre: uso.habilidad, tipo: "analizador" },
    objetivo,
    tipo: uso.tipo,
    duracion: uso.duracion,
    intervalo: uso.intervalo ?? null,
    politicaAcumulacion: uso.politicaAcumulacion,
    politicaPotencia: uso.politicaPotencia,
    maximo: uso.maximo,
    incremento: uso.incremento,
    intensidadInicial: 1,
    probabilidadBase: uso.probabilidadBase,
    tiradaAplicacion: null,
    resistenciaId: uso.resistenciaId,
    modoResistencia: uso.modoResistencia,
    inmunidadId: uso.inmunidadId,
    eliminarAlAdquirirInmunidad: uso.eliminarAlAdquirirInmunidad,
    etiquetas: ["balance", uso.efectoId],
    beneficioso: uso.beneficioso === true,
  };
  if (uso.tipo === "danio_periodico") {
    return {
      ...comun,
      valor: 1,
      tipoDanio: null,
      componentesDanio: [{
        tipo: uso.tipoDanio,
        danioBruto: potencia ?? uso.valorBase,
      }],
    };
  }
  if (uso.tipo === "modificador_factor") {
    return { ...comun, valor: copiarProfundo(uso.valor), tipoDanio: null, componentesDanio: null };
  }
  return { ...comun, valor: potencia ?? uso.valorBase ?? 1, tipoDanio: null, componentesDanio: null };
}

function buscarUso(usos, efectoId, {
  perfilAplicacion = null,
  mayorGrado = false,
} = {}) {
  const candidatos = usos.filter(
    (uso) =>
      uso.efectoId === efectoId &&
      (perfilAplicacion === null || uso.perfilAplicacion === perfilAplicacion),
  );
  if (candidatos.length === 0) {
    throw new Error(`No existe un uso jugable del efecto "${efectoId}".`);
  }
  return [...candidatos].sort((a, b) =>
    mayorGrado ? b.grado - a.grado : a.grado - b.grado,
  )[0];
}

function copiarResistencias(origen = {}, ids) {
  return Object.fromEntries(
    ids.map((id) => [id, limitar(Number(origen?.[id] ?? 0), 0, 75)]),
  );
}

function resumirEstados(filas) {
  return {
    cantidad: filas.length,
    correctos: contarEstado(filas, "correcto"),
    advertencias: contarEstado(filas, "advertencia"),
    incorrectos: contarEstado(filas, "incorrecto"),
    informativos: contarEstado(filas, "informativo"),
  };
}

function contarEstado(filas, estado) {
  return filas.filter((fila) => fila.estado === estado).length;
}

function validarEntrada(entrada) {
  for (const [nombre, valor] of Object.entries(entrada)) {
    if (!valor || typeof valor !== "object") {
      throw new Error(`El analizador de efectos necesita ${nombre}.`);
    }
  }
  if (!entrada.objetivosBalance.analisisEfectos) {
    throw new Error("ObjetivosBalance.json no define analisisEfectos.");
  }
}

function copiarProfundo(valor) {
  if (Array.isArray(valor)) return valor.map(copiarProfundo);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, contenido]) => [clave, copiarProfundo(contenido)]),
    );
  }
  return valor;
}

function congelarProfundamente(valor) {
  if (!valor || typeof valor !== "object" || Object.isFrozen(valor)) return valor;
  for (const contenido of Object.values(valor)) congelarProfundamente(contenido);
  return Object.freeze(valor);
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function redondear(valor) {
  return Number.isFinite(valor) ? Number(valor.toFixed(2)) : valor;
}

function capitalizar(texto) {
  const valor = String(texto ?? "");
  return valor ? valor[0].toUpperCase() + valor.slice(1) : valor;
}
