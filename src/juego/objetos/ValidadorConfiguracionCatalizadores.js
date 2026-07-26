import { validarConfiguracionGeneracionObjetos } from "./ValidadorConfiguracionGeneracionObjetos.js";

const ID_PREFIJO_POTENCIA = "enfocado";
const PROPIEDAD_POTENCIA = "potenciaHabilidad";
const FAMILIAS_CATALIZADOR = new Set(["baston", "varita"]);

export function validarConfiguracionGeneracionCatalizadores(
  configuracion = {},
) {
  const copiaBase = copiarDatos(configuracion);
  const prefijoPotencia = copiaBase.prefijos?.[ID_PREFIJO_POTENCIA];

  // El validador general de ETAPA 1 conoce una lista cerrada de propiedades
  // activas. Se valida el catálogo completo con Enfocado temporalmente inactivo
  // y luego se aplica la validación específica y más estricta de ETAPA 6.
  if (prefijoPotencia) {
    prefijoPotencia.estado = "pendiente_balance";
  }

  validarConfiguracionGeneracionObjetos(copiaBase);
  validarPrefijoPotencia(configuracion.prefijos?.[ID_PREFIJO_POTENCIA]);
  return configuracion;
}

function validarPrefijoPotencia(prefijo) {
  validarObjetoPlano(prefijo, `el prefijo "${ID_PREFIJO_POTENCIA}"`);

  if (prefijo.estado !== "activo" || prefijo.tipoAfijo !== "prefijo") {
    throw new Error(
      "El prefijo Enfocado debe estar activo y declararse como prefijo.",
    );
  }
  if (!Number.isInteger(prefijo.pesoBase) || prefijo.pesoBase <= 0) {
    throw new Error("El prefijo Enfocado necesita un peso base positivo.");
  }

  const familias = prefijo.aplicaA?.familiasIncluidas;
  if (
    !Array.isArray(familias) ||
    familias.length !== FAMILIAS_CATALIZADOR.size ||
    familias.some((familia) => !FAMILIAS_CATALIZADOR.has(familia))
  ) {
    throw new Error("El prefijo Enfocado debe limitarse a bastones y varitas.");
  }

  if (!Array.isArray(prefijo.efectos) || prefijo.efectos.length !== 1) {
    throw new Error("El prefijo Enfocado debe contener un único efecto.");
  }

  const efecto = prefijo.efectos[0];
  if (efecto.propiedad !== PROPIEDAD_POTENCIA || efecto.operacion !== "sumar") {
    throw new Error("El prefijo Enfocado debe sumar Potencia de Habilidad.");
  }

  if (!Array.isArray(prefijo.grados) || prefijo.grados.length !== 3) {
    throw new Error(
      "El prefijo Enfocado debe declarar sus tres grados iniciales.",
    );
  }

  for (const grado of prefijo.grados) {
    const rango = grado.valores?.[PROPIEDAD_POTENCIA];
    if (
      !Number.isInteger(grado.grado) ||
      !Number.isInteger(grado.nivelObjetoMinimo) ||
      !Number.isInteger(grado.peso) ||
      grado.peso <= 0 ||
      !rango ||
      !Number.isFinite(rango.minimo) ||
      !Number.isFinite(rango.maximo) ||
      rango.minimo < 0 ||
      rango.maximo < rango.minimo
    ) {
      throw new Error(
        `El grado ${grado.grado ?? "desconocido"} de Enfocado no es válido.`,
      );
    }
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita ${descripcion} válido.`);
  }
}

function copiarDatos(valor) {
  if (Array.isArray(valor)) return valor.map(copiarDatos);
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, contenido]) => [
        clave,
        copiarDatos(contenido),
      ]),
    );
  }
  return valor;
}
