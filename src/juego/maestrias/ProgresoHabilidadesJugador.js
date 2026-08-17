export const ORIGENES_PUNTO_HABILIDAD = Object.freeze({
  UNIVERSAL: "universal",
  ESPECIFICO: "especifico",
});

const VERSION_ESTADO_PROGRESO = 3;
// Fuente única de verdad de la progresión de habilidades del personaje.
//
// Conserva únicamente datos de progresión. No calcula daño, XP por acciones,
// recursos ni condiciones de combate. SistemaExperienciaMaestrias transforma
// hechos canónicos ya resueltos en experiencia y llama agregarExperienciaMaestria.
export class ProgresoHabilidadesJugador {
  constructor({ configuracion, idProfesion, estadoInicial = null } = {}) {
    validarConfiguracion(configuracion);
    this.configuracion = configuracion;
    this.idProfesion = normalizarId(idProfesion, "La profesión");
    this.puntosUniversales = configuracion.reglas.puntosUniversalesIniciales;
    this.maestrias = crearEstadoInicialMaestrias({
      configuracion,
      idProfesion: this.idProfesion,
    });
    this.gradosHabilidades = crearEstadoInicialHabilidades({
      habilidades: configuracion.habilidades,
      maestriasDisponibles: this.maestrias,
    });

    if (estadoInicial !== null) {
      this.restaurarEstado(estadoInicial);
    }
  }
  obtenerResumen() {
    const maestrias = {};
    for (const [idMaestria, estado] of Object.entries(this.maestrias)) {
      maestrias[idMaestria] = {
        ...estado,
        experienciaNecesaria: this.obtenerExperienciaNecesaria(idMaestria),
      };
    }
    const habilidades = {};
    for (const [idHabilidad, definicion] of Object.entries(
      this.configuracion.habilidades,
    )) {
      if (!Object.hasOwn(this.gradosHabilidades, idHabilidad)) {
        continue;
      }
      habilidades[idHabilidad] = {
        id: idHabilidad,
        nombre: definicion.nombre,
        maestria: definicion.maestria,
        tipo: definicion.tipo,
        requisitoNivelMaestria: definicion.requisitoNivelMaestria,
        grado: this.gradosHabilidades[idHabilidad],
        gradoMaximo: definicion.gradoMaximo,
      };
    }
    return copiarDatos({
      puntosUniversales: this.puntosUniversales,
      maestrias,
      habilidades,
    });
  }

  obtenerPuntosUniversales() {
    return this.puntosUniversales;
  }

  obtenerGradoHabilidad(idHabilidad) {
    const idNormalizado = this.validarHabilidad(idHabilidad);
    return this.gradosHabilidades[idNormalizado];
  }
  obtenerExperienciaNecesaria(idMaestria) {
    const idNormalizado = this.validarMaestria(idMaestria);
    const estado = this.maestrias[idNormalizado];
    const { nivelMaximoMaestria, experienciaPorNivel } =
      this.configuracion.reglas;

    if (estado.nivel >= nivelMaximoMaestria) {
      return 0;
    }

    return experienciaPorNivel[estado.nivel];
  }
  agregarPuntosUniversales(cantidad) {
    validarEnteroPositivo(cantidad, "La cantidad de puntos universales");
    this.puntosUniversales += cantidad;

    return {
      exito: true,
      puntosGanados: cantidad,
      puntosUniversales: this.puntosUniversales,
    };
  }
  // Operación canónica: recibe XP ya calculada por SistemaExperienciaMaestrias.
  agregarExperienciaMaestria({ idMaestria, cantidad } = {}) {
    const idNormalizado = this.validarMaestria(idMaestria);
    validarEnteroPositivo(cantidad, "La experiencia de maestría");
    const estado = this.maestrias[idNormalizado];
    const nivelMaximo = this.configuracion.reglas.nivelMaximoMaestria;

    if (estado.nivel >= nivelMaximo) {
      return {
        exito: true,
        idMaestria: idNormalizado,
        experienciaGanada: 0,
        nivelesGanados: 0,
        puntosEspecificosGanados: 0,
        nivelActual: estado.nivel,
        experienciaActual: estado.experiencia,
        experienciaTotal: estado.experienciaTotal,
        nivelMaximoAlcanzado: true,
      };
    }
    estado.experiencia += cantidad;
    estado.experienciaTotal += cantidad;

    let nivelesGanados = 0;
    let puntosEspecificosGanados = 0;

    while (estado.nivel < nivelMaximo) {
      const experienciaNecesaria =
        this.configuracion.reglas.experienciaPorNivel[estado.nivel];

      if (estado.experiencia < experienciaNecesaria) {
        break;
      }
      estado.experiencia -= experienciaNecesaria;
      estado.nivel++;
      estado.puntosEspecificos++;
      nivelesGanados++;
      puntosEspecificosGanados++;
    }

    if (estado.nivel >= nivelMaximo) {
      // Al alcanzar el máximo no queda un próximo umbral. La experiencia
      // sobrante se conserva en experienciaTotal, pero la barra actual
      // queda cerrada para no simular un nivel inexistente.
      estado.experiencia = 0;
    }
    return {
      exito: true,
      idMaestria: idNormalizado,
      experienciaGanada: cantidad,
      nivelesGanados,
      puntosEspecificosGanados,
      nivelActual: estado.nivel,
      experienciaActual: estado.experiencia,
      experienciaTotal: estado.experienciaTotal,
      nivelMaximoAlcanzado: estado.nivel >= nivelMaximo,
    };
  }
  mejorarHabilidad({ idHabilidad, origenPunto, idMaestriaPunto = null } = {}) {
    const idNormalizado = this.validarHabilidad(idHabilidad);
    const definicion = this.configuracion.habilidades[idNormalizado];
    const maestria = this.maestrias[definicion.maestria];
    const gradoActual = this.gradosHabilidades[idNormalizado];
    if (maestria.nivel < definicion.requisitoNivelMaestria) {
      return resultadoMejoraFallida({
        motivo: "NIVEL_MAESTRIA_INSUFICIENTE",
        idHabilidad: idNormalizado,
        gradoActual,
      });
    }

    if (gradoActual >= definicion.gradoMaximo) {
      return resultadoMejoraFallida({
        motivo: "GRADO_MAXIMO_ALCANZADO",
        idHabilidad: idNormalizado,
        gradoActual,
      });
    }

    const origenNormalizado = normalizarId(origenPunto, "El origen del punto");
    if (origenNormalizado === ORIGENES_PUNTO_HABILIDAD.UNIVERSAL) {
      if (this.puntosUniversales <= 0) {
        return resultadoMejoraFallida({
          motivo: "SIN_PUNTOS_UNIVERSALES",
          idHabilidad: idNormalizado,
          gradoActual,
        });
      }

      this.puntosUniversales--;
    } else if (origenNormalizado === ORIGENES_PUNTO_HABILIDAD.ESPECIFICO) {
      const idMaestriaOrigen = normalizarId(
        idMaestriaPunto,
        "La maestría de origen del punto",
      );
      if (idMaestriaOrigen !== definicion.maestria) {
        return resultadoMejoraFallida({
          motivo: "PUNTO_DE_OTRA_MAESTRIA",
          idHabilidad: idNormalizado,
          gradoActual,
        });
      }

      if (maestria.puntosEspecificos <= 0) {
        return resultadoMejoraFallida({
          motivo: "SIN_PUNTOS_ESPECIFICOS",
          idHabilidad: idNormalizado,
          gradoActual,
        });
      }
      maestria.puntosEspecificos--;
    } else {
      throw new Error(`El origen de punto "${origenNormalizado}" no existe.`);
    }

    // La validación completa se realizó antes de descontar. Desde aquí la
    // operación es atómica: un punto equivale exactamente a un grado.
    this.gradosHabilidades[idNormalizado]++;
    return {
      exito: true,
      motivo: null,
      idHabilidad: idNormalizado,
      origenPunto: origenNormalizado,
      gradoAnterior: gradoActual,
      gradoActual: this.gradosHabilidades[idNormalizado],
      puntosUniversales: this.puntosUniversales,
      puntosEspecificos: this.maestrias[definicion.maestria].puntosEspecificos,
    };
  }
  exportarEstado() {
    return copiarDatos({
      version: VERSION_ESTADO_PROGRESO,
      puntosUniversales: this.puntosUniversales,
      maestrias: this.maestrias,
      gradosHabilidades: this.gradosHabilidades,
    });
  }
  // Valida una copia completa antes de reemplazar el estado activo.
  // Un dato corrupto no puede consumir puntos ni alterar grados parcialmente.
  restaurarEstado(estado) {
    const normalizado = this.normalizarEstadoPersistido(estado);
    this.puntosUniversales = normalizado.puntosUniversales;
    this.maestrias = normalizado.maestrias;
    this.gradosHabilidades = normalizado.gradosHabilidades;
    return {
      exito: true,
      estado: this.exportarEstado(),
    };
  }

  normalizarEstadoPersistido(estado) {
    validarObjetoPlano(estado, "el estado de progreso de habilidades");

    if (estado.version !== VERSION_ESTADO_PROGRESO) {
      throw new Error(
        `La versión ${estado.version} del progreso de habilidades no es compatible.`,
      );
    }
    validarEnteroNoNegativo(
      estado.puntosUniversales,
      "Los puntos universales guardados",
    );
    validarObjetoPlano(estado.maestrias, "las maestrías guardadas");
    validarObjetoPlano(estado.gradosHabilidades, "los grados guardados");
    const maestrias = {};
    for (const idMaestria of Object.keys(this.maestrias)) {
      const guardada = estado.maestrias[idMaestria];
      validarObjetoPlano(guardada, `la maestría guardada "${idMaestria}"`);
      validarEnteroNoNegativo(
        guardada.nivel,
        `El nivel guardado de ${idMaestria}`,
      );
      validarEnteroNoNegativo(
        guardada.experiencia,
        `La experiencia actual de ${idMaestria}`,
      );
      validarEnteroNoNegativo(
        guardada.experienciaTotal,
        `La experiencia total de ${idMaestria}`,
      );
      validarEnteroNoNegativo(
        guardada.puntosEspecificos,
        `Los puntos específicos de ${idMaestria}`,
      );
      if (guardada.nivel > this.configuracion.reglas.nivelMaximoMaestria) {
        throw new Error(
          `El nivel guardado de "${idMaestria}" supera el máximo.`,
        );
      }
      if (
        guardada.nivel < this.configuracion.reglas.nivelMaximoMaestria &&
        guardada.experiencia >=
          this.configuracion.reglas.experienciaPorNivel[guardada.nivel]
      ) {
        throw new Error(
          `La experiencia guardada de "${idMaestria}" debería haber producido otro nivel.`,
        );
      }
      if (
        guardada.nivel === this.configuracion.reglas.nivelMaximoMaestria &&
        guardada.experiencia !== 0
      ) {
        throw new Error(
          `La maestría máxima "${idMaestria}" debe tener la barra cerrada.`,
        );
      }

      maestrias[idMaestria] = {
        nivel: guardada.nivel,
        experiencia: guardada.experiencia,
        experienciaTotal: guardada.experienciaTotal,
        puntosEspecificos: guardada.puntosEspecificos,
      };
    }
    const gradosHabilidades = {};
    for (const [idHabilidad, definicion] of Object.entries(
      this.configuracion.habilidades,
    )) {
      if (!Object.hasOwn(this.gradosHabilidades, idHabilidad)) {
        continue;
      }
      const grado = estado.gradosHabilidades[idHabilidad];
      validarEnteroNoNegativo(grado, `El grado guardado de ${idHabilidad}`);

      if (grado > definicion.gradoMaximo) {
        throw new Error(
          `El grado guardado de "${idHabilidad}" supera su máximo.`,
        );
      }
      if (
        grado > 0 &&
        maestrias[definicion.maestria].nivel < definicion.requisitoNivelMaestria
      ) {
        throw new Error(
          `La habilidad "${idHabilidad}" no cumple su requisito guardado.`,
        );
      }

      gradosHabilidades[idHabilidad] = grado;
    }

    return {
      puntosUniversales: estado.puntosUniversales,
      maestrias,
      gradosHabilidades,
    };
  }
  validarMaestria(idMaestria) {
    const normalizado = normalizarId(idMaestria, "La maestría");
    if (!this.maestrias[normalizado]) {
      throw new Error(`La maestría "${normalizado}" no está disponible.`);
    }
    return normalizado;
  }

  validarHabilidad(idHabilidad) {
    const normalizado = normalizarId(idHabilidad, "La habilidad");
    const habilidad = this.configuracion.habilidades[normalizado];

    if (!habilidad) {
      throw new Error(`La habilidad "${normalizado}" no existe.`);
    }
    if (!this.maestrias[habilidad.maestria]) {
      throw new Error(
        `La profesión "${this.idProfesion}" no puede aprender "${normalizado}".`,
      );
    }

    return normalizado;
  }
}

function crearEstadoInicialMaestrias({ configuracion, idProfesion }) {
  const resultado = {};

  for (const [idMaestria, definicion] of Object.entries(
    configuracion.maestrias,
  )) {
    if (!definicion.profesionesPermitidas.includes(idProfesion)) {
      continue;
    }
    resultado[idMaestria] = {
      nivel: 0,
      experiencia: 0,
      experienciaTotal: 0,
      puntosEspecificos: 0,
    };
  }

  if (Object.keys(resultado).length === 0) {
    throw new Error(
      `La profesión "${idProfesion}" no tiene maestrías disponibles.`,
    );
  }

  return resultado;
}

function crearEstadoInicialHabilidades({ habilidades, maestriasDisponibles }) {
  const resultado = {};
  for (const [idHabilidad, definicion] of Object.entries(habilidades)) {
    if (!Object.hasOwn(maestriasDisponibles, definicion.maestria)) {
      continue;
    }
    resultado[idHabilidad] = 0;
  }
  return resultado;
}
function resultadoMejoraFallida({ motivo, idHabilidad, gradoActual }) {
  return {
    exito: false,
    motivo,
    idHabilidad,
    gradoAnterior: gradoActual,
    gradoActual,
  };
}
function validarConfiguracion(configuracion) {
  if (
    configuracion === null ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion) ||
    !configuracion.reglas ||
    !configuracion.maestrias ||
    !configuracion.habilidades
  ) {
    throw new Error(
      "ProgresoHabilidadesJugador necesita una configuración validada.",
    );
  }
}
function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita ${descripcion} válido.`);
  }
}

function validarEnteroPositivo(valor, descripcion) {
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un entero mayor que 0.`);
  }
}
function validarEnteroNoNegativo(valor, descripcion) {
  if (!Number.isSafeInteger(valor) || valor < 0) {
    throw new Error(`${descripcion} debe ser un entero igual o mayor que 0.`);
  }
}

function normalizarId(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe ser un texto válido.`);
  }
  return valor.trim().toLowerCase();
}
function copiarDatos(valor) {
  if (Array.isArray(valor)) {
    return valor.map(copiarDatos);
  }
  if (valor !== null && typeof valor === "object") {
    const copia = {};
    for (const [clave, contenido] of Object.entries(valor)) {
      copia[clave] = copiarDatos(contenido);
    }
    return copia;
  }
  return valor;
}
