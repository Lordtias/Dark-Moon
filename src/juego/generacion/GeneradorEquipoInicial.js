import {
  crearGeneradorAleatorio,
  crearSemillaAleatoria,
} from "./GeneradorAleatorio.js";
import { crearObjetoGenerado } from "../objetos/GeneradorObjetoAleatorio.js";
import { crearObjetosDesdeDefiniciones } from "../../objetos/FabricaObjetos.js";

const TIPOS_MAGIA_INICIAL = new Set(["arma", "armadura"]);

// Devuelve una copia independiente del conjunto recomendado
// configurado para una profesión.
export function crearSeleccionEquipoRecomendado({
  configuracionPersonaje,
  idProfesion,
} = {}) {
  const profesion = obtenerProfesion({
    configuracionPersonaje,
    idProfesion,
  });

  const configuracionEquipo = validarConfiguracionEquipoProfesion(
    profesion,
    idProfesion,
  );

  const conjunto = configuracionEquipo.conjuntos.find(
    (candidato) => candidato.id === configuracionEquipo.conjuntoRecomendado,
  );

  if (!conjunto) {
    throw new Error(
      `La profesión "${idProfesion}" no tiene un conjunto recomendado válido.`,
    );
  }

  return normalizarSeleccionEquipo({
    conjunto,
    origen: "recomendado",
    semilla: null,
    objetoMagico: null,
  });
}

// Elige uno de los conjuntos alternativos de la profesión.
//
// La selección se realiza una sola vez desde el menú y luego
// se conserva para evitar rerolls ilimitados.
export function crearSeleccionEquipoAleatorio({
  configuracionPersonaje,
  configuracionObjetos,
  configuracionGeneracionObjetos,
  idProfesion,
  semilla = crearSemillaAleatoria(),
} = {}) {
  validarObjetoPlano(configuracionObjetos, "La configuración de objetos");

  validarObjetoPlano(
    configuracionGeneracionObjetos,
    "La configuración de generación de objetos",
  );

  const profesion = obtenerProfesion({
    configuracionPersonaje,
    idProfesion,
  });

  const configuracionEquipo = validarConfiguracionEquipoProfesion(
    profesion,
    idProfesion,
  );

  const alternativas = configuracionEquipo.conjuntos.filter(
    (conjunto) => conjunto.id !== configuracionEquipo.conjuntoRecomendado,
  );

  if (alternativas.length === 0) {
    throw new Error(
      `La profesión "${idProfesion}" no tiene conjuntos alternativos.`,
    );
  }

  const aleatorio = crearGeneradorAleatorio(semilla);
  const conjunto = aleatorio.elegir(alternativas);

  const seleccion = normalizarSeleccionEquipo({
    conjunto,
    origen: "aleatorio",
    semilla: aleatorio.semilla,
    objetoMagico: null,
  });

  const reglasEquipoInicial = configuracionPersonaje.equipoInicial ?? {};

  const probabilidadObjetoMagico =
    reglasEquipoInicial.probabilidadObjetoMagico ?? 0;

  validarPorcentaje(
    probabilidadObjetoMagico,
    "La probabilidad de objeto mágico inicial",
  );

  const puedeGenerarMagico =
    aleatorio.siguiente() < probabilidadObjetoMagico / 100;

  if (!puedeGenerarMagico) {
    return seleccion;
  }

  const nivelObjeto = reglasEquipoInicial.nivelObjetoMagico ?? 1;

  if (!Number.isInteger(nivelObjeto) || nivelObjeto < 1) {
    throw new Error(
      "El nivel del objeto mágico inicial debe ser un entero mayor o igual que 1.",
    );
  }

  const resultadoMagico = intentarConvertirEquipamientoEnMagico({
    seleccion,
    configuracionObjetos,
    configuracionGeneracionObjetos,
    nivelObjeto,
    aleatorio,
  });

  return {
    ...seleccion,
    equipamiento: resultadoMagico.equipamiento,
    objetoMagico: resultadoMagico.objetoMagico,
  };
}

// Materializa las definiciones del conjunto para poder mostrar
// exactamente los mismos objetos que recibirá el jugador.
export function materializarSeleccionEquipo({
  seleccion,
  configuracionObjetos,
} = {}) {
  validarSeleccionEquipo(seleccion);

  return {
    inventario: crearObjetosDesdeDefiniciones({
      configuracionObjetos,
      definiciones: seleccion.inventario,
    }),
    equipamiento: crearObjetosDesdeDefiniciones({
      configuracionObjetos,
      definiciones: seleccion.equipamiento,
    }),
  };
}

// Calcula valores simples para la vista previa.
//
// No reemplaza los cálculos definitivos de Player ni del sistema
// de combate; solamente resume las propiedades base del conjunto.
export function calcularResumenSeleccionEquipo({
  seleccion,
  configuracionObjetos,
} = {}) {
  const objetos = materializarSeleccionEquipo({
    seleccion,
    configuracionObjetos,
  });

  const armaduraTotal = objetos.equipamiento.reduce(
    (total, objeto) => total + (objeto.propiedades.armadura ?? 0),
    0,
  );

  const armas = objetos.equipamiento.filter((objeto) => objeto.esArma);

  const armaPrincipal = armas[0] ?? null;

  const objetosMagicos = [
    ...objetos.equipamiento,
    ...objetos.inventario,
  ].filter((objeto) => objeto.rareza !== "comun");

  return {
    armaduraTotal,
    armaPrincipal,
    cantidadEquipados: objetos.equipamiento.length,
    cantidadInventario: objetos.inventario.length,
    cantidadObjetosMagicos: objetosMagicos.length,
    objetos,
  };
}

// Copia el conjunto elegido sobre la configuración de respaldo
// utilizada por ConfiguracionInicial.
//
// Aplicacion conserva la misma referencia de configuración, por lo
// que la partida posterior recibirá exactamente estas definiciones.
export function aplicarSeleccionEquipoAProfesion({
  configuracionPersonaje,
  idProfesion,
  seleccion,
} = {}) {
  validarSeleccionEquipo(seleccion);

  const profesion = obtenerProfesion({
    configuracionPersonaje,
    idProfesion,
  });

  profesion.contenedor = {
    ...(profesion.contenedor ?? {}),
    objetosIniciales: copiarProfundo(seleccion.inventario),
  };

  profesion.equipamiento = {
    ...(profesion.equipamiento ?? {}),
    objetosIniciales: copiarProfundo(seleccion.equipamiento),
  };
}

function intentarConvertirEquipamientoEnMagico({
  seleccion,
  configuracionObjetos,
  configuracionGeneracionObjetos,
  nivelObjeto,
  aleatorio,
}) {
  const candidatos = seleccion.equipamiento
    .map((definicion, indice) => ({
      definicion,
      indice,
      idObjeto: obtenerIdDefinicion(definicion),
    }))
    .filter(({ idObjeto }) => {
      const plantilla = configuracionObjetos[idObjeto];

      return (
        plantilla &&
        plantilla.tierBase === 1 &&
        TIPOS_MAGIA_INICIAL.has(plantilla.tipo)
      );
    });

  for (const candidato of aleatorio.mezclar(candidatos)) {
    try {
      const cantidad = obtenerCantidadDefinicion(candidato.definicion);

      const objeto = crearObjetoGenerado({
        configuracionObjetos,
        configuracionGeneracionObjetos,
        idObjeto: candidato.idObjeto,
        cantidad,
        nivelObjeto,
        aleatorio,
        rarezaForzada: "magico",
      });

      const equipamiento = copiarProfundo(seleccion.equipamiento);

      equipamiento[candidato.indice] = serializarObjetoGenerado(objeto);

      return {
        equipamiento,
        objetoMagico: {
          id: objeto.id,
          nombre: objeto.nombreCompleto ?? objeto.nombre,
          rareza: objeto.rareza,
        },
      };
    } catch (error) {
      // Una plantilla concreta puede no tener afijos compatibles
      // para nivel 1. Probamos con el siguiente candidato antes
      // de renunciar a la bonificación mágica.
      console.warn(
        `No se pudo convertir "${candidato.idObjeto}" ` +
          "en objeto mágico inicial:",
        error,
      );
    }
  }

  return {
    equipamiento: copiarProfundo(seleccion.equipamiento),
    objetoMagico: null,
  };
}

function serializarObjetoGenerado(objeto) {
  return {
    id: objeto.id,
    cantidad: objeto.cantidad,
    rareza: objeto.rareza,
    nivelObjeto: objeto.nivelObjeto,
    prefijos: copiarProfundo(objeto.prefijos ?? []),
    sufijos: copiarProfundo(objeto.sufijos ?? []),
    propiedadesFinales: copiarProfundo(objeto.propiedades),
  };
}

function normalizarSeleccionEquipo({
  conjunto,
  origen,
  semilla,
  objetoMagico,
}) {
  validarConjunto(conjunto);

  return {
    idConjunto: conjunto.id,
    nombre: conjunto.nombre,
    descripcion: conjunto.descripcion ?? "",
    origen,
    semilla,
    objetoMagico,
    inventario: copiarProfundo(conjunto.inventario ?? []),
    equipamiento: copiarProfundo(conjunto.equipamiento ?? []),
  };
}

function validarConfiguracionEquipoProfesion(profesion, idProfesion) {
  const configuracionEquipo = profesion.equipoInicial;

  if (
    configuracionEquipo === null ||
    typeof configuracionEquipo !== "object" ||
    Array.isArray(configuracionEquipo)
  ) {
    throw new Error(
      `La profesión "${idProfesion}" no tiene configuración de equipo inicial.`,
    );
  }

  if (
    typeof configuracionEquipo.conjuntoRecomendado !== "string" ||
    configuracionEquipo.conjuntoRecomendado.trim() === ""
  ) {
    throw new Error(
      `La profesión "${idProfesion}" debe declarar su conjunto recomendado.`,
    );
  }

  if (
    !Array.isArray(configuracionEquipo.conjuntos) ||
    configuracionEquipo.conjuntos.length === 0
  ) {
    throw new Error(
      `La profesión "${idProfesion}" necesita al menos un conjunto inicial.`,
    );
  }

  for (const conjunto of configuracionEquipo.conjuntos) {
    validarConjunto(conjunto);
  }

  return configuracionEquipo;
}

function validarConjunto(conjunto) {
  validarObjetoPlano(conjunto, "El conjunto inicial");

  for (const campo of ["id", "nombre"]) {
    if (typeof conjunto[campo] !== "string" || conjunto[campo].trim() === "") {
      throw new Error(`El conjunto inicial debe declarar "${campo}".`);
    }
  }

  if (!Array.isArray(conjunto.inventario)) {
    throw new Error(`El inventario de "${conjunto.id}" debe ser una lista.`);
  }

  if (
    !Array.isArray(conjunto.equipamiento) ||
    conjunto.equipamiento.length === 0
  ) {
    throw new Error(
      `El equipamiento de "${conjunto.id}" debe contener objetos.`,
    );
  }
}

function validarSeleccionEquipo(seleccion) {
  validarObjetoPlano(seleccion, "La selección de equipo");

  if (!Array.isArray(seleccion.inventario)) {
    throw new Error("La selección de equipo debe contener un inventario.");
  }

  if (!Array.isArray(seleccion.equipamiento)) {
    throw new Error("La selección de equipo debe contener equipamiento.");
  }
}

function obtenerProfesion({ configuracionPersonaje, idProfesion }) {
  validarObjetoPlano(configuracionPersonaje, "La configuración del personaje");

  if (typeof idProfesion !== "string" || idProfesion.trim() === "") {
    throw new Error("Se necesita una profesión válida.");
  }

  const profesion =
    configuracionPersonaje.profesiones?.[idProfesion.trim().toLowerCase()];

  if (!profesion) {
    throw new Error(`No existe la profesión "${idProfesion}".`);
  }

  return profesion;
}

function obtenerIdDefinicion(definicion) {
  if (typeof definicion === "string") {
    return definicion.trim().toLowerCase();
  }

  if (
    definicion !== null &&
    typeof definicion === "object" &&
    !Array.isArray(definicion) &&
    typeof definicion.id === "string"
  ) {
    return definicion.id.trim().toLowerCase();
  }

  throw new Error("Existe una definición de objeto inicial inválida.");
}

function obtenerCantidadDefinicion(definicion) {
  if (typeof definicion === "string") {
    return 1;
  }

  return definicion.cantidad ?? 1;
}

function validarPorcentaje(valor, descripcion) {
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
    throw new Error(`${descripcion} debe estar entre 0 y 100.`);
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}

function copiarProfundo(valor) {
  return JSON.parse(JSON.stringify(valor));
}
