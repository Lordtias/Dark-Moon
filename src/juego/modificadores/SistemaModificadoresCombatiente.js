import {
  AMBITOS_AFIJO,
  OBJETIVOS_MODIFICADOR_VALIDOS,
  OPERACIONES_MODIFICADOR,
  cumpleCondicionesModificador,
  normalizarContextoModificador,
  normalizarDescriptorModificador,
  validarObjetivoModificador,
} from "./ContratosModificadoresCombatiente.js";
import { obtenerModificadoresTemporalesObjetivo } from "../efectos/SistemaEfectosTemporales.js";

export class SistemaModificadoresCombatiente {
  constructor({ combatiente } = {}) {
    if (!combatiente || typeof combatiente !== "object") {
      throw new Error("SistemaModificadoresCombatiente necesita un combatiente.");
    }
    this.combatiente = combatiente;
    this.proveedores = new Map();
  }

  registrarProveedor({ id, obtenerModificadores } = {}) {
    const idNormalizado = normalizarIdProveedor(id);
    if (typeof obtenerModificadores !== "function") {
      throw new Error(`El proveedor "${idNormalizado}" necesita una función.`);
    }
    this.proveedores.set(idNormalizado, obtenerModificadores);
    return idNormalizado;
  }

  retirarProveedor(id) {
    return this.proveedores.delete(normalizarIdProveedor(id));
  }

  resolver(objetivo, valorBase, contexto = {}) {
    validarObjetivoModificador(objetivo);
    if (!Number.isFinite(valorBase)) {
      throw new Error(`El valor base de "${objetivo}" debe ser numérico.`);
    }
    const contextoNormalizado = normalizarContextoModificador(contexto);
    const candidatos = this.obtenerModificadoresVigentes({
      objetivo,
      contexto: contextoNormalizado,
    });
    const aplicados = [];
    const omitidos = [];

    for (const modificador of candidatos) {
      if (!cumpleCondicionesModificador(modificador.condiciones, contextoNormalizado)) {
        omitidos.push({
          ...modificador,
          motivo: "condiciones_no_cumplidas",
        });
        continue;
      }
      aplicados.push(modificador);
    }

    const planos = aplicados.filter(
      (m) => m.operacion === OPERACIONES_MODIFICADOR.SUMAR,
    );
    const porcentajesBase = aplicados.filter(
      (m) => m.operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_BASE,
    );
    const porcentajesTotal = aplicados.filter(
      (m) => m.operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_TOTAL,
    );
    const porcentajesMultiplicativos = aplicados.filter(
      (m) => m.operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_MULTIPLICATIVO,
    );
    const porcentajesInversos = aplicados.filter(
      (m) => m.operacion === OPERACIONES_MODIFICADOR.PORCENTAJE_INVERSO,
    );
    const multiplicadoresRedondeados = aplicados.filter(
      (m) => m.operacion === OPERACIONES_MODIFICADOR.MULTIPLICAR_REDONDEAR,
    );
    const multiplicadores = aplicados.filter(
      (m) => m.operacion === OPERACIONES_MODIFICADOR.MULTIPLICAR,
    );
    const limitesMaximos = aplicados.filter(
      (m) => m.operacion === OPERACIONES_MODIFICADOR.LIMITAR_MAXIMO,
    );

    const sumaPlana = sumarValores(planos);
    const porcentajeBase = sumarValores(porcentajesBase) / 100;
    const porcentajeTotal = sumarValores(porcentajesTotal) / 100;
    const multiplicadorPorcentual = porcentajesMultiplicativos.reduce(
      (total, modificador) => total * (1 + modificador.valor / 100),
      1,
    );
    const divisorPorcentual = porcentajesInversos.reduce(
      (total, modificador) => total * (1 + modificador.valor / 100),
      1,
    );
    const multiplicadorRedondeado = multiplicarValores(
      multiplicadoresRedondeados,
    );
    const multiplicador = multiplicarValores(multiplicadores);
    const limiteMaximo = limitesMaximos.length > 0
      ? Math.min(...limitesMaximos.map((modificador) => modificador.valor))
      : null;
    const subtotal = valorBase + sumaPlana + valorBase * porcentajeBase;
    const despuesPorcentajeTotal = subtotal * (1 + porcentajeTotal);
    const despuesPorcentajeMultiplicativo =
      despuesPorcentajeTotal * multiplicadorPorcentual;
    const despuesPorcentajeInverso =
      despuesPorcentajeMultiplicativo / divisorPorcentual;
    const despuesMultiplicacionRedondeada =
      multiplicadoresRedondeados.length > 0
        ? Math.round(despuesPorcentajeInverso * multiplicadorRedondeado)
        : despuesPorcentajeInverso;
    const despuesMultiplicacion = despuesMultiplicacionRedondeada * multiplicador;
    const resultado = limiteMaximo === null
      ? despuesMultiplicacion
      : Math.min(despuesMultiplicacion, limiteMaximo);

    if (!Number.isFinite(resultado)) {
      throw new Error(`La resolución de "${objetivo}" produjo un valor inválido.`);
    }

    return Object.freeze({
      objetivo,
      valorBase,
      contexto: contextoNormalizado,
      resultado,
      desglose: Object.freeze({
        sumaPlana,
        porcentajeBase: porcentajeBase * 100,
        porcentajeTotal: porcentajeTotal * 100,
        multiplicadorPorcentual,
        divisorPorcentual,
        multiplicadorRedondeado,
        multiplicador,
        limiteMaximo,
        subtotal,
        despuesPorcentajeTotal,
        despuesPorcentajeMultiplicativo,
        despuesPorcentajeInverso,
        despuesMultiplicacionRedondeada,
        despuesMultiplicacion,
        aplicados: Object.freeze(aplicados.map(congelarDescriptorCopia)),
        omitidos: Object.freeze(omitidos.map((item) => Object.freeze({ ...item }))),
      }),
    });
  }

  obtenerValor(objetivo, valorBase, contexto = {}) {
    return this.resolver(objetivo, valorBase, contexto).resultado;
  }

  obtenerModificadoresVigentes({ objetivo, contexto }) {
    const candidatos = [
      ...obtenerModificadoresEquipo(this.combatiente),
      ...obtenerModificadoresTemporalesObjetivo(this.combatiente),
      ...this.obtenerModificadoresProveedores({ objetivo, contexto }),
    ];

    const normalizados = candidatos.map((descriptor) =>
      normalizarDescriptorModificador(descriptor),
    );
    validarIdsModificadoresUnicos(normalizados);
    return normalizados.filter((descriptor) => descriptor.objetivo === objetivo);
  }

  obtenerModificadoresProveedores({ objetivo, contexto }) {
    const resultado = [];
    for (const [id, proveedor] of this.proveedores) {
      const aportes = proveedor({
        combatiente: this.combatiente,
        objetivo,
        contexto,
      });
      if (aportes === null || aportes === undefined) continue;
      if (!Array.isArray(aportes)) {
        throw new Error(`El proveedor de modificadores "${id}" debe devolver una lista.`);
      }
      resultado.push(...aportes);
    }
    return resultado;
  }

  obtenerResumenObjetivos() {
    return [...OBJETIVOS_MODIFICADOR_VALIDOS];
  }
}

export function obtenerModificadoresEquipo(combatiente) {
  const equipamiento = combatiente?.equipamiento;
  if (!equipamiento || typeof equipamiento.obtenerRanuras !== "function") {
    return [];
  }

  const resultado = [];
  for (const [ranura, objeto] of Object.entries(equipamiento.obtenerRanuras())) {
    if (!objeto) continue;
    const afijos = [
      ...(Array.isArray(objeto.prefijos) ? objeto.prefijos : []),
      ...(Array.isArray(objeto.sufijos) ? objeto.sufijos : []),
    ];
    for (const afijo of afijos) {
      const efectos = Array.isArray(afijo?.efectos) ? afijo.efectos : [];
      efectos.forEach((efecto, indice) => {
        if (efecto.ambito !== AMBITOS_AFIJO.PORTADOR) return;
        const objetivo = efecto.objetivo ?? efecto.propiedad;
        const valor = afijo.valores?.[efecto.propiedad ?? objetivo];
        if (!Number.isFinite(valor)) {
          throw new Error(
            `El afijo "${afijo.id}" no conserva un valor válido para "${objetivo}".`,
          );
        }
        resultado.push({
          id: `equipo:${ranura}:${afijo.tipoAfijo}:${afijo.id}:${indice}`,
          objetivo,
          operacion: efecto.operacion,
          valor,
          origen: "afijo_equipo",
          fuente: Object.freeze({
            tipo: "afijo_equipo",
            ranura,
            objetoId: objeto.id,
            objetoNombre: objeto.nombre,
            afijoId: afijo.id,
            afijoNombre: afijo.nombre,
          }),
          condiciones: efecto.condiciones ?? {},
        });
      });
    }
  }
  return resultado;
}

function sumarValores(modificadores) {
  return modificadores.reduce((total, modificador) => total + modificador.valor, 0);
}

function multiplicarValores(modificadores) {
  return modificadores.reduce(
    (acumulado, modificador) => acumulado * modificador.valor,
    1,
  );
}

function normalizarIdProveedor(id) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("Cada proveedor de modificadores necesita un ID válido.");
  }
  return id.trim().toLowerCase();
}

function congelarDescriptorCopia(descriptor) {
  return Object.freeze({ ...descriptor });
}

function validarIdsModificadoresUnicos(modificadores) {
  const ids = new Set();
  for (const modificador of modificadores) {
    if (ids.has(modificador.id)) {
      throw new Error(
        `El modificador "${modificador.id}" está declarado más de una vez.`,
      );
    }
    ids.add(modificador.id);
  }
}
