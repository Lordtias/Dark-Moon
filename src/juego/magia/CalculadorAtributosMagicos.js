import { CONFIGURACION_MAGIA } from "../../config/ConfiguracionMagia.js";

export const MAGNITUDES_ESCALADO_EFECTO = Object.freeze({
  NINGUNA: "ninguna",
  VALOR: "valor",
  DURACION: "duracion",
  VALOR_Y_DURACION: "valor_y_duracion",
});

const MAGNITUDES_ESCALADO_VALIDAS = Object.freeze(
  Object.values(MAGNITUDES_ESCALADO_EFECTO),
);

function validarNumeroFinito(valor, descripcion) {
  if (!Number.isFinite(valor)) {
    throw new Error(`${descripcion} debe ser un número finito.`);
  }
}

function validarAtributosMagicos(atributos) {
  if (!atributos || typeof atributos !== "object" || Array.isArray(atributos)) {
    throw new Error("Los atributos mágicos deben estar dentro de un objeto.");
  }

  validarNumeroFinito(atributos.inteligencia, "La Inteligencia");
  validarNumeroFinito(atributos.sabiduria, "La Sabiduría");

  if (atributos.inteligencia <= 0 || atributos.sabiduria <= 0) {
    throw new Error("Inteligencia y Sabiduría deben ser mayores que 0.");
  }
}

function calcularMultiplicador({
  atributos,
  coeficientes,
  minimo = CONFIGURACION_MAGIA.multiplicadores.minimo,
}) {
  validarAtributosMagicos(atributos);
  validarNumeroFinito(minimo, "El multiplicador mínimo");

  if (minimo <= 0) {
    throw new Error("El multiplicador mínimo debe ser mayor que 0.");
  }

  const referencia = CONFIGURACION_MAGIA.referenciaAtributos;
  const multiplicador =
    1 +
    coeficientes.inteligencia * (atributos.inteligencia - referencia) +
    coeficientes.sabiduria * (atributos.sabiduria - referencia);

  return Math.max(minimo, multiplicador);
}

export function calcularMultiplicadorDanioMagico(atributos) {
  return calcularMultiplicador({
    atributos,
    coeficientes: CONFIGURACION_MAGIA.multiplicadores.danioMagico,
  });
}

export function calcularMultiplicadorEfectos(atributos) {
  return calcularMultiplicador({
    atributos,
    coeficientes: CONFIGURACION_MAGIA.multiplicadores.efectos,
  });
}

export function calcularAporteManaMaximo(atributos) {
  validarAtributosMagicos(atributos);

  const referencia = CONFIGURACION_MAGIA.referenciaAtributos;
  const configuracion = CONFIGURACION_MAGIA.mana;

  return (
    configuracion.porInteligenciaRespectoDiez *
      (atributos.inteligencia - referencia) +
    configuracion.porSabiduriaRespectoDiez * (atributos.sabiduria - referencia)
  );
}

export function calcularManaMaximo({
  manaBase,
  manaPorNivel = 0,
  nivel = 1,
  atributos,
  bonificacionPlana = 0,
} = {}) {
  validarNumeroFinito(manaBase, "El Maná base");
  validarNumeroFinito(manaPorNivel, "El Maná por nivel");
  validarNumeroFinito(bonificacionPlana, "La bonificación plana de Maná");

  if (!Number.isInteger(nivel) || nivel < 1) {
    throw new Error("El nivel debe ser un entero igual o mayor que 1.");
  }

  const total =
    manaBase +
    (nivel - 1) * manaPorNivel +
    calcularAporteManaMaximo(atributos) +
    bonificacionPlana;

  return Math.max(CONFIGURACION_MAGIA.mana.minimo, Math.round(total));
}

export function calcularRegeneracionMana({
  regeneracionBase = 0,
  sabiduria,
  bonificacionPlana = 0,
  manaMaximo = 0,
  bonificacionPorcentual = 0,
} = {}) {
  validarNumeroFinito(regeneracionBase, "La regeneración base de Maná");
  validarNumeroFinito(sabiduria, "La Sabiduría");
  validarNumeroFinito(bonificacionPlana, "La regeneración plana de Maná");
  validarNumeroFinito(manaMaximo, "El Maná máximo");
  validarNumeroFinito(
    bonificacionPorcentual,
    "La regeneración porcentual de Maná",
  );

  if (sabiduria <= 0) {
    throw new Error("La Sabiduría debe ser mayor que 0.");
  }

  const regeneracion =
    regeneracionBase +
    CONFIGURACION_MAGIA.regeneracionMana.porSabiduria * sabiduria +
    bonificacionPlana +
    manaMaximo * (bonificacionPorcentual / 100);

  return Math.max(0, regeneracion);
}

export function escalarDanioMagico(danioBase, multiplicador) {
  validarNumeroFinito(danioBase, "El daño mágico base");
  validarNumeroFinito(multiplicador, "El multiplicador de daño mágico");

  if (danioBase < 0 || multiplicador <= 0) {
    throw new Error(
      "El daño mágico no puede ser negativo y su multiplicador debe ser positivo.",
    );
  }

  return danioBase * multiplicador;
}

function copiarValor(valor) {
  if (valor === null || typeof valor !== "object") {
    return valor;
  }

  if (Array.isArray(valor)) {
    return valor.map(copiarValor);
  }

  return Object.fromEntries(
    Object.entries(valor).map(([clave, actual]) => [
      clave,
      copiarValor(actual),
    ]),
  );
}

function copiarDefinicionEfecto(definicion) {
  const instantanea = {};

  for (const [clave, valor] of Object.entries(definicion)) {
    // El objetivo debe conservar su identidad. Copiarlo produciría un
    // efecto asociado a una entidad distinta y rompería el WeakMap del
    // motor temporal.
    if (clave === "objetivo") {
      instantanea[clave] = valor;
      continue;
    }

    // La ETAPA 2 exige descriptores estables de fuente. Se copia el
    // descriptor, pero nunca se recorre una instancia completa del mapa.
    if (clave === "fuente" && valor && typeof valor === "object") {
      instantanea[clave] = {
        id: valor.id ?? valor.idEntidad ?? null,
        nombre: valor.nombre ?? valor.id ?? "Fuente desconocida",
        tipo: valor.tipo ?? valor.tipoEntidad ?? "descriptor",
      };
      continue;
    }

    instantanea[clave] = copiarValor(valor);
  }

  return instantanea;
}

function escalarValorEfecto(definicion, multiplicador) {
  const instantanea = { ...definicion };

  if (Array.isArray(definicion.componentesDanio)) {
    instantanea.componentesDanio = definicion.componentesDanio.map(
      (componente) => ({
        ...componente,
        danioBruto: escalarDanioMagico(componente.danioBruto, multiplicador),
      }),
    );
    return instantanea;
  }

  if (!Number.isFinite(definicion.valor)) {
    throw new Error(
      "El escalado de valor solo admite un valor numérico o componentes de daño.",
    );
  }

  instantanea.valor = definicion.valor * multiplicador;
  return instantanea;
}

// Crea la instantánea que se entrega al motor temporal.
//
// Los valores escalados quedan fijados al aplicar el efecto. Los ticks futuros
// vuelven a consultar únicamente las defensas actuales del objetivo.
export function crearInstantaneaEfectoMagico({
  definicion,
  multiplicadorEfectos,
  magnitudEscalable = MAGNITUDES_ESCALADO_EFECTO.NINGUNA,
} = {}) {
  if (
    !definicion ||
    typeof definicion !== "object" ||
    Array.isArray(definicion)
  ) {
    throw new Error("La definición del efecto debe ser un objeto válido.");
  }

  validarNumeroFinito(
    multiplicadorEfectos,
    "El multiplicador de potencia de efectos",
  );

  if (multiplicadorEfectos <= 0) {
    throw new Error("El multiplicador de efectos debe ser mayor que 0.");
  }

  if (!MAGNITUDES_ESCALADO_VALIDAS.includes(magnitudEscalable)) {
    throw new Error(
      `La magnitud escalable "${magnitudEscalable}" no es válida.`,
    );
  }

  let instantanea = copiarDefinicionEfecto(definicion);
  const escalaValor = [
    MAGNITUDES_ESCALADO_EFECTO.VALOR,
    MAGNITUDES_ESCALADO_EFECTO.VALOR_Y_DURACION,
  ].includes(magnitudEscalable);
  const escalaDuracion = [
    MAGNITUDES_ESCALADO_EFECTO.DURACION,
    MAGNITUDES_ESCALADO_EFECTO.VALOR_Y_DURACION,
  ].includes(magnitudEscalable);

  if (escalaValor) {
    instantanea = escalarValorEfecto(instantanea, multiplicadorEfectos);
  }

  if (escalaDuracion) {
    validarNumeroFinito(instantanea.duracion, "La duración del efecto");
    instantanea.duracion = Math.max(
      CONFIGURACION_MAGIA.efectos.duracionMinima,
      Math.round(instantanea.duracion * multiplicadorEfectos),
    );
  }

  return Object.freeze(instantanea);
}

export function capturarEstadoRecursos(combatiente) {
  if (!combatiente || typeof combatiente !== "object") {
    throw new Error("Se necesita un combatiente para capturar sus recursos.");
  }

  const estado = {
    vidaActual: combatiente.vidaActual,
    vidaMaxima: combatiente.vidaMaxima,
    manaActual: combatiente.manaActual,
    manaMaximo: combatiente.manaMaximo,
  };

  for (const [nombre, valor] of Object.entries(estado)) {
    validarNumeroFinito(valor, `El valor de ${nombre}`);
  }

  return Object.freeze(estado);
}

function limitarRecurso(valor, maximo) {
  return Math.max(0, Math.min(maximo, Math.round(valor)));
}

export function conservarFaltanteRecurso({
  actual,
  maximoAnterior,
  maximoNuevo,
}) {
  validarNumeroFinito(actual, "El recurso actual");
  validarNumeroFinito(maximoAnterior, "El máximo anterior");
  validarNumeroFinito(maximoNuevo, "El máximo nuevo");

  return limitarRecurso(actual + (maximoNuevo - maximoAnterior), maximoNuevo);
}

export function conservarProporcionRecurso({
  actual,
  maximoAnterior,
  maximoNuevo,
}) {
  validarNumeroFinito(actual, "El recurso actual");
  validarNumeroFinito(maximoAnterior, "El máximo anterior");
  validarNumeroFinito(maximoNuevo, "El máximo nuevo");

  if (maximoNuevo <= 0) {
    return 0;
  }

  if (maximoAnterior <= 0) {
    return limitarRecurso(actual, maximoNuevo);
  }

  const proporcion = Math.max(0, Math.min(1, actual / maximoAnterior));
  return limitarRecurso(maximoNuevo * proporcion, maximoNuevo);
}

// La Vida conserva el faltante histórico para no alterar el comportamiento
// previo. El Maná conserva su proporción, evitando ganar o perder porcentaje
// al subir nivel, asignar atributos o cambiar equipo.
export function restaurarRecursosTrasRecalculo(combatiente, estadoAnterior) {
  if (!combatiente || typeof combatiente !== "object") {
    throw new Error("Se necesita un combatiente para restaurar sus recursos.");
  }

  combatiente.vidaActual = conservarFaltanteRecurso({
    actual: estadoAnterior.vidaActual,
    maximoAnterior: estadoAnterior.vidaMaxima,
    maximoNuevo: combatiente.vidaMaxima,
  });
  combatiente.manaActual = conservarProporcionRecurso({
    actual: estadoAnterior.manaActual,
    maximoAnterior: estadoAnterior.manaMaximo,
    maximoNuevo: combatiente.manaMaximo,
  });

  return {
    vidaActual: combatiente.vidaActual,
    vidaMaxima: combatiente.vidaMaxima,
    manaActual: combatiente.manaActual,
    manaMaximo: combatiente.manaMaximo,
  };
}
