import {
  calcularCostoAccionCombatiente,
  TIEMPO_REFERENCIA,
  TIPOS_ACCION_TEMPORAL,
} from "../../juego/tiempo/SistemaTiempo.js";
import { obtenerPresentacionRarezaObjeto } from "./ContextoPresentacionObjetos.js";
import { RANGOS_DANIO_ELEMENTAL_LOCAL } from "../../juego/combate/ComponentesDanio.js";
import { idiomaActivo, traducir, traducirContenido } from "../idiomas/ContextoIdioma.js";

const ETIQUETAS_ATRIBUTO = Object.freeze({
  fuerza: "Fuerza",
  destreza: "Destreza",
  constitucion: "Constitución",
  inteligencia: "Inteligencia",
  sabiduria: "Sabiduría",
  carisma: "Carisma",
});
const ETIQUETAS_PATRON_ATAQUE = Object.freeze({
  adyacente: "Adyacente",
  lineal: "Lineal",
  libre: "Libre",
});
const ETIQUETAS_ELEMENTO = Object.freeze({
  fuego: "Fuego",
  frio: "Frío",
  rayo: "Rayo",
  veneno: "Veneno",
});

const RANGOS_ELEMENTALES_LOCALES = RANGOS_DANIO_ELEMENTAL_LOCAL;

const RESISTENCIAS_VISIBLES = Object.freeze([
  Object.freeze({
    propiedad: "resistenciaFuego",
    etiqueta: "Resistencia al fuego",
  }),
  Object.freeze({
    propiedad: "resistenciaFrio",
    etiqueta: "Resistencia al frío",
  }),
  Object.freeze({
    propiedad: "resistenciaRayo",
    etiqueta: "Resistencia al rayo",
  }),
  Object.freeze({
    propiedad: "resistenciaVeneno",
    etiqueta: "Resistencia al veneno",
  }),
  Object.freeze({
    propiedad: "resistenciaCongelamiento",
    etiqueta: "Resistencia al Congelamiento",
  }),
  Object.freeze({
    propiedad: "resistenciaAturdimiento",
    etiqueta: "Resistencia al Aturdimiento",
  }),
  Object.freeze({
    propiedad: "resistenciaEnvenenamiento",
    etiqueta: "Resistencia al Envenenamiento",
  }),
  Object.freeze({
    propiedad: "resistenciaQuemadura",
    etiqueta: "Resistencia a la Quemadura",
  }),
]);

const PRESENTACION_VALORES_AFIJO = Object.freeze({
  danioFisicoLocalPorcentaje: {
    etiqueta: "daño físico local",
    porcentaje: true,
  },
  potenciaHabilidad: {
    etiqueta: "Potencia de Habilidad",
    porcentaje: true,
  },
  armadura: { etiqueta: "Armadura" },
  vidaMaxima: { etiqueta: "Vida máxima" },
  manaMaximo: { etiqueta: "Maná máximo" },
  precision: { etiqueta: "Precisión" },
  probabilidadCritico: {
    etiqueta: "probabilidad de crítico",
    porcentaje: true,
  },
  multiplicadorCritico: { etiqueta: "multiplicador crítico" },
  evasion: { etiqueta: "Evasión" },
  regeneracionVida: { etiqueta: "regeneración de Vida" },
  regeneracionMana: { etiqueta: "regeneración de Maná" },
  resistenciaFuego: {
    etiqueta: "resistencia al fuego",
    porcentaje: true,
  },
  resistenciaFrio: {
    etiqueta: "resistencia al frío",
    porcentaje: true,
  },
  resistenciaRayo: {
    etiqueta: "resistencia al rayo",
    porcentaje: true,
  },
  resistenciaVeneno: {
    etiqueta: "resistencia al veneno",
    porcentaje: true,
  },
  resistenciaCongelamiento: {
    etiqueta: "resistencia al Congelamiento",
    porcentaje: true,
  },
  resistenciaAturdimiento: {
    etiqueta: "resistencia al Aturdimiento",
    porcentaje: true,
  },
  resistenciaEnvenenamiento: {
    etiqueta: "resistencia al Envenenamiento",
    porcentaje: true,
  },
  resistenciaQuemadura: {
    etiqueta: "resistencia a la Quemadura",
    porcentaje: true,
  },
  probabilidadBloqueo: {
    etiqueta: "probabilidad de bloqueo",
    porcentaje: true,
  },
  mitigacionBloqueo: {
    etiqueta: "mitigación al bloquear",
    porcentaje: true,
  },
});

// Convierte una instancia de Objeto en un modelo visual compartido por
// inventario, equipamiento, comparación y comercio.
export function crearPresentacionObjeto({ objeto, combatiente = null } = {}) {
  validarObjeto(objeto);

  const esMaterial = objeto.tipo === "material";
  return {
    nombre: traducirContenido("objetos", objeto.id, "nombre", objeto.nombre),
    subtitulo: crearSubtitulo(objeto),
    descripcion:
      objeto.descripcion.trim() !== ""
        ? traducirContenido("objetos", objeto.id, "descripcion", objeto.descripcion)
        : traducir("interfaz.detalleObjeto.sinDescripcion", { respaldo: "Este objeto no tiene una descripción disponible." }),
    recursoVisual: normalizarRuta(objeto.recursoVisual),
    cantidad: Number.isInteger(objeto.cantidad) ? objeto.cantidad : 1,
    rareza: obtenerPresentacionRarezaObjeto(objeto.rareza),
    nivelObjeto: Number.isInteger(objeto.nivelObjeto) ? objeto.nivelObjeto : 1,
    mostrarMetadatosGeneracion: objeto.esEquipable === true,
    informacionComercial: crearInformacionComercial(objeto),
    afijos: crearPresentacionAfijos(objeto),
    estadisticas: crearEstadisticasObjeto({ objeto, combatiente }),
    mostrarMensajeSinEstadisticas: !esMaterial,
  };
}

function crearSubtitulo(objeto) {
  const tipo = traducirTipoObjeto(objeto.tipo);

  if (objeto.esArma) {
    const manos = objeto.propiedades.manos;
    const etiquetaManos = manos === 1
      ? traducir("interfaz.detalleObjeto.mano", { respaldo: "mano" })
      : traducir("interfaz.detalleObjeto.manos", { respaldo: "manos" });
    return `${tipo} · ${manos} ${etiquetaManos}`;
  }
  if (objeto.esArmadura) {
    const ranuras = objeto.ranurasCompatibles
      .map(traducirRanuraEquipamiento)
      .join(" / ");
    return ranuras !== "" ? `${tipo} · ${ranuras}` : tipo;
  }

  return tipo;
}

function crearInformacionComercial(objeto) {
  const informacion = [
    {
      tipo: "peso",
      etiqueta: traducir("interfaz.detalleObjeto.peso", { respaldo: "Peso" }),
      valor: crearTextoMagnitudComercial({
        objeto,
        valorUnitario: obtenerNumeroNoNegativo(objeto.pesoUnitario),
        valorTotal: obtenerNumeroNoNegativo(objeto.pesoTotal),
        formateador: formatearPeso,
      }),
    },
  ];

  if (objeto.vendible === false) {
    informacion.push({
      tipo: "no-vendible",
      etiqueta: traducir("interfaz.detalleObjeto.noVendible", { respaldo: "No vendible" }),
      valor: "",
    });
    return informacion;
  }

  informacion.push({
    tipo: "valor",
    etiqueta: traducir("interfaz.detalleObjeto.valor", { respaldo: "Valor" }),
    valor: crearTextoMagnitudComercial({
      objeto,
      valorUnitario: obtenerNumeroNoNegativo(objeto.valorBase),
      valorTotal: obtenerNumeroNoNegativo(objeto.valorBaseTotal),
      formateador: formatearMonedas,
    }),
  });

  return informacion;
}

function crearTextoMagnitudComercial({
  objeto,
  valorUnitario,
  valorTotal,
  formateador,
}) {
  const cantidad =
    Number.isInteger(objeto.cantidad) && objeto.cantidad > 0
      ? objeto.cantidad
      : 1;
  const tieneContenedor =
    objeto.contenedorObjetos &&
    typeof objeto.contenedorObjetos.obtenerObjetos === "function";

  if (tieneContenedor) {
    return traducir("interfaz.detalleObjeto.propioTotal", {
      parametros: { propio: formateador(valorUnitario), total: formateador(valorTotal) },
      respaldo: `${formateador(valorUnitario)} propio · ${formateador(valorTotal)} total`,
    });
  }
  if (objeto.apilable === true && cantidad > 1) {
    return traducir("interfaz.detalleObjeto.unidadTotal", {
      parametros: { unidad: formateador(valorUnitario), total: formateador(valorTotal) },
      respaldo: `${formateador(valorUnitario)} c/u · ${formateador(valorTotal)} total`,
    });
  }

  return formateador(valorTotal);
}

function crearPresentacionAfijos(objeto) {
  const afijos = Array.isArray(objeto.afijos) ? objeto.afijos : [];
  return afijos.map((afijo) => ({
    id: afijo.id,
    tipo: afijo.tipoAfijo,
    tipoEtiqueta: afijo.tipoAfijo === "prefijo"
      ? traducir("interfaz.detalleObjeto.prefijo", { respaldo: "Prefijo" })
      : traducir("interfaz.detalleObjeto.sufijo", { respaldo: "Sufijo" }),
    nombre: traducirContenido("afijos", afijo.id, "nombre", afijo.nombre),
    grado: afijo.grado,
    descripcion:
      typeof afijo.descripcion === "string"
        ? traducirContenido("afijos", afijo.id, "descripcion", afijo.descripcion)
        : "",
    efectos: crearTextosEfectosAfijo(afijo),
  }));
}

function crearTextosEfectosAfijo(afijo) {
  const valores = afijo.valores ?? {};
  const textos = [];
  const propiedadesProcesadas = new Set();

  agregarTextoRangoAfijo({
    valores,
    textos,
    propiedadesProcesadas,
    propiedadMinimo: "danioFisicoLocalMinimo",
    propiedadMaximo: "danioFisicoLocalMaximo",
    descripcion: tDetalle("danioFisicoLocal", "daño físico local"),
  });

  for (const rango of RANGOS_ELEMENTALES_LOCALES) {
    agregarTextoRangoAfijo({
      valores,
      textos,
      propiedadesProcesadas,
      propiedadMinimo: rango.propiedadMinimo,
      propiedadMaximo: rango.propiedadMaximo,
      descripcion: traducir("interfaz.detalleObjeto.danioElementoLocalAtaque", {
        parametros: { elemento: traducirElemento(rango.tipo).toLowerCase() },
        respaldo: `daño de ${ETIQUETAS_ELEMENTO[rango.tipo].toLowerCase()} local al ataque básico`,
      }),
    });
  }

  for (const [propiedad, valor] of Object.entries(valores)) {
    if (propiedadesProcesadas.has(propiedad) || !Number.isFinite(valor)) {
      continue;
    }

    const configuracion = PRESENTACION_VALORES_AFIJO[propiedad];
    if (!configuracion) {
      textos.push(
        `${formatearNumeroConSignoFlexible(valor)} ${formatearIdentificador(propiedad)}`,
      );
      continue;
    }

    const valorFormateado = formatearNumeroConSignoFlexible(valor);
    const etiqueta = traducirEtiquetaValorAfijo(propiedad, configuracion.etiqueta);
    textos.push(
      configuracion.porcentaje
        ? traducir("interfaz.detalleObjeto.porcentajeDe", {
            parametros: { valor: valorFormateado, etiqueta },
            respaldo: `${valorFormateado} % de ${configuracion.etiqueta}`,
          })
        : traducir("interfaz.detalleObjeto.valorDe", {
            parametros: { valor: valorFormateado, etiqueta },
            respaldo: `${valorFormateado} de ${configuracion.etiqueta}`,
          }),
    );
  }

  if (
    textos.length === 0 &&
    typeof afijo.descripcion === "string" &&
    afijo.descripcion.trim() !== ""
  ) {
    textos.push(
      traducirContenido("afijos", afijo.id, "descripcion", afijo.descripcion.trim()),
    );
  }

  return textos;
}

function agregarTextoRangoAfijo({
  valores,
  textos,
  propiedadesProcesadas,
  propiedadMinimo,
  propiedadMaximo,
  descripcion,
}) {
  const minimo = valores[propiedadMinimo];
  const maximo = valores[propiedadMaximo];

  if (!Number.isFinite(minimo) || !Number.isFinite(maximo)) {
    return;
  }

  textos.push(
    traducir("interfaz.detalleObjeto.agregaRango", {
      parametros: {
        minimo: formatearNumeroFlexible(minimo),
        maximo: formatearNumeroFlexible(maximo),
        descripcion,
      },
      respaldo: `Agrega ${formatearNumeroFlexible(minimo)}–${formatearNumeroFlexible(maximo)} de ${descripcion}`,
    }),
  );
  propiedadesProcesadas.add(propiedadMinimo);
  propiedadesProcesadas.add(propiedadMaximo);
}

function crearEstadisticasObjeto({ objeto, combatiente }) {
  if (objeto.esArma) return crearEstadisticasArma({ objeto, combatiente });
  if (objeto.esArmadura) return crearEstadisticasArmadura(objeto);
  if (objeto.esQuiver) return crearEstadisticasQuiver(objeto);
  if (objeto.esMunicion) return crearEstadisticasMunicion(objeto);
  if (objeto.esConsumible) return crearEstadisticasConsumible(objeto);
  if (objeto.tipo === "material") return [];
  return crearEstadisticasGenericas(objeto);
}

function crearEstadisticasArma({ objeto, combatiente }) {
  const propiedades = objeto.propiedades;
  const costoBase = propiedades.costoAtaque;
  const costoEfectivo = combatiente
    ? calcularCostoAccionCombatiente({
        combatiente,
        tipoAccion: TIPOS_ACCION_TEMPORAL.ATAQUE,
        costoBase,
      })
    : costoBase;
  const velocidadAtaque = TIEMPO_REFERENCIA / costoEfectivo;
  const esVarita =
    objeto.familiaObjeto === "varita" &&
    propiedades.esCatalizador === true &&
    typeof propiedades.elementoAtaqueBasico === "string";
  const estadisticas = [];

  if (esVarita) {
    estadisticas.push(
      crearEstadistica(
        tDetalle("danioElemental", "Daño elemental"),
        `${formatearNumero(propiedades.danioElementalMinimo)} – ` +
          `${formatearNumero(propiedades.danioElementalMaximo)}`,
      ),
      crearEstadistica(
        tDetalle("elemento", "Elemento"),
        traducirElemento(propiedades.elementoAtaqueBasico),
      ),
    );
  } else {
    const rangoLocal = calcularRangoDanioFisicoLocal(propiedades);
    estadisticas.push(
      crearEstadistica(
        tDetalle("danioFisico", "Daño físico"),
        `${formatearNumero(rangoLocal.minimo)} – ${formatearNumero(rangoLocal.maximo)}`,
      ),
    );
  }

  estadisticas.push(...crearEstadisticasDanioElementalLocal(propiedades));

  estadisticas.push(
    crearEstadistica(
      tDetalle("atributo", "Atributo"),
      traducirContenido(
        "atributos",
        propiedades.atributoAtaque,
        "nombre",
        ETIQUETAS_ATRIBUTO[propiedades.atributoAtaque] ?? formatearIdentificador(propiedades.atributoAtaque),
      ),
    ),
    crearEstadistica(
      tDetalle("precision", "Precisión"),
      formatearNumeroConSigno(propiedades.precision),
    ),
    crearEstadistica(
      tDetalle("velocidadAtaque", "Velocidad de ataque"),
      traducir("interfaz.detalleObjeto.ataquesPorSegundo", {
        parametros: { valor: formatearNumero(velocidadAtaque, 2) },
        respaldo: `${formatearNumero(velocidadAtaque, 2)} ataques/s`,
      }),
    ),
    crearEstadistica(
      tDetalle("critico", "Crítico"),
      `${formatearNumero(propiedades.probabilidadCritico)} % × ` +
        `${formatearNumero(propiedades.multiplicadorCritico, 2)}`,
    ),
    crearEstadistica(tDetalle("alcance", "Alcance"), formatearNumero(propiedades.alcance)),
    crearEstadistica(
      tDetalle("tipoAtaque", "Tipo de ataque"),
      traducirTipoAtaque(propiedades.tipoAtaque),
    ),
    crearEstadistica(
      tDetalle("patron", "Patrón"),
      traducirPatronAtaque(propiedades.patronAtaque),
    ),
    crearEstadistica(tDetalle("manosEtiqueta", "Manos"), formatearNumero(propiedades.manos)),
  );

  if (
    propiedades.esCatalizador === true &&
    Number.isFinite(propiedades.potenciaHabilidad)
  ) {
    estadisticas.push(
      crearEstadistica(
        tDetalle("potenciaHabilidad", "Potencia de Habilidad"),
        `${formatearNumeroConSignoFlexible(propiedades.potenciaHabilidad)} %`,
      ),
    );
  }
  if (esVarita && Number.isFinite(propiedades.costoManaAtaqueBasico)) {
    estadisticas.push(
      crearEstadistica(
        tDetalle("manaAtaque", "Maná por ataque"),
        formatearNumero(propiedades.costoManaAtaqueBasico),
      ),
    );
  }
  if (propiedades.requiereQuiver) {
    estadisticas.push(
      crearEstadistica(
        tDetalle("municion", "Munición"),
        formatearIdentificador(propiedades.tipoMunicion),
      ),
    );
  }

  return estadisticas;
}

function crearEstadisticasDanioElementalLocal(propiedades) {
  const estadisticas = [];

  for (const rango of RANGOS_ELEMENTALES_LOCALES) {
    const minimo = propiedades[rango.propiedadMinimo];
    const maximo = propiedades[rango.propiedadMaximo];
    if (!Number.isFinite(minimo) || !Number.isFinite(maximo)) {
      continue;
    }

    estadisticas.push(
      crearEstadistica(
        traducir("interfaz.detalleObjeto.danioElementoLocal", {
          parametros: { elemento: traducirElemento(rango.tipo).toLowerCase() },
          respaldo: `Daño de ${ETIQUETAS_ELEMENTO[rango.tipo].toLowerCase()} local`,
        }),
        `${formatearNumeroFlexible(minimo)} – ${formatearNumeroFlexible(maximo)} ` +
          `(${traducir("interfaz.detalleObjeto.ataqueBasico", { respaldo: "ataque básico" })})`,
      ),
    );
  }

  return estadisticas;
}

function calcularRangoDanioFisicoLocal(propiedades) {
  const minimoBase = propiedades.danioFisicoMinimo;
  const maximoBase = propiedades.danioFisicoMaximo;
  const planoMinimo = propiedades.danioFisicoLocalMinimo ?? 0;
  const planoMaximo = propiedades.danioFisicoLocalMaximo ?? 0;
  const porcentaje = (propiedades.danioFisicoLocalPorcentaje ?? 0) / 100;
  const minimo = Math.max(
    0,
    Math.floor((minimoBase + planoMinimo) * (1 + porcentaje)),
  );
  const maximo = Math.max(
    minimo,
    Math.ceil((maximoBase + planoMaximo) * (1 + porcentaje)),
  );

  return { minimo, maximo };
}

function crearEstadisticasArmadura(objeto) {
  const propiedades = objeto.propiedades;
  const estadisticas = [
    crearEstadistica(tDetalle("armadura", "Armadura"), formatearNumero(propiedades.armadura ?? 0)),
  ];

  if (
    Number.isFinite(propiedades.probabilidadBloqueo) &&
    propiedades.probabilidadBloqueo > 0
  ) {
    estadisticas.push(
      crearEstadistica(
        tDetalle("bloqueo", "Bloqueo"),
        `${formatearNumero(propiedades.probabilidadBloqueo)} %`,
      ),
    );
  }
  if (
    Number.isFinite(propiedades.mitigacionBloqueo) &&
    propiedades.mitigacionBloqueo > 0
  ) {
    estadisticas.push(
      crearEstadistica(
        tDetalle("mitigacionBloqueo", "Mitigación de bloqueo"),
        `${formatearNumero(propiedades.mitigacionBloqueo)} %`,
      ),
    );
  }

  estadisticas.push(...crearEstadisticasResistencias(propiedades));
  return estadisticas;
}

function crearEstadisticasQuiver(objeto) {
  const contenedor = objeto.contenedorObjetos;
  const objetos = contenedor?.obtenerObjetos?.() ?? [];
  const cantidadMunicion = objetos.reduce(
    (total, objetoContenido) =>
      total +
      (Number.isInteger(objetoContenido.cantidad)
        ? objetoContenido.cantidad
        : 1),
    0,
  );
  const estadisticas = [
    crearEstadistica(
      tDetalle("tipoMunicion", "Tipo de munición"),
      formatearIdentificador(objeto.propiedades.tipoMunicion),
    ),
    crearEstadistica(
      tDetalle("capacidad", "Capacidad"),
      traducir("interfaz.detalleObjeto.pila", { parametros: { cantidad: contenedor?.capacidad ?? 0 }, respaldo: `${contenedor?.capacidad ?? 0} pila` }),
    ),
    crearEstadistica(
      tDetalle("contenido", "Contenido"),
      traducir("interfaz.detalleObjeto.unidades", { parametros: { cantidad: cantidadMunicion }, respaldo: `${cantidadMunicion} unidades` }),
    ),
  ];

  estadisticas.push(...crearEstadisticasResistencias(objeto.propiedades));
  return estadisticas;
}

function crearEstadisticasResistencias(propiedades) {
  return RESISTENCIAS_VISIBLES.flatMap(({ propiedad, etiqueta }) => {
    const valor = propiedades[propiedad];
    if (!Number.isFinite(valor) || valor === 0) {
      return [];
    }

    return [
      crearEstadistica(traducirResistencia(propiedad, etiqueta), `${formatearNumeroConSignoFlexible(valor)} %`),
    ];
  });
}

function crearEstadisticasMunicion(objeto) {
  return [
    crearEstadistica(
      tDetalle("tipoMunicion", "Tipo de munición"),
      formatearIdentificador(objeto.propiedades.tipoMunicion),
    ),
    crearEstadistica(tDetalle("cantidad", "Cantidad"), formatearNumero(objeto.cantidad)),
    crearEstadistica(tDetalle("maximoPila", "Máximo por pila"), formatearNumero(objeto.cantidadMaxima)),
  ];
}

function crearEstadisticasConsumible(objeto) {
  const efectos = objeto.propiedades.efectos ?? [];
  const estadisticas = efectos.map((efecto) =>
    crearEstadistica(
      traducirEfectoConsumible(efecto.tipo),
      formatearNumero(efecto.cantidad),
    ),
  );
  estadisticas.push(
    crearEstadistica(tDetalle("cantidad", "Cantidad"), formatearNumero(objeto.cantidad)),
  );
  return estadisticas;
}

function crearEstadisticasGenericas(objeto) {
  const estadisticas = [];
  if (objeto.apilable) {
    estadisticas.push(
      crearEstadistica(tDetalle("cantidad", "Cantidad"), formatearNumero(objeto.cantidad)),
      crearEstadistica(
        tDetalle("maximoPila", "Máximo por pila"),
        formatearNumero(objeto.cantidadMaxima),
      ),
    );
  }
  return estadisticas;
}

function crearEstadistica(etiqueta, valor) {
  return { etiqueta, valor };
}

function obtenerNumeroNoNegativo(valor) {
  return Number.isFinite(valor) && valor >= 0 ? valor : 0;
}

function traducirEtiquetaValorAfijo(propiedad, respaldo) {
  const claves = {
    danioFisicoLocalPorcentaje: "danioFisicoLocal",
    potenciaHabilidad: "potenciaHabilidad",
    armadura: "armadura",
    vidaMaxima: "vidaMaxima",
    manaMaximo: "manaMaximo",
    precision: "precision",
    probabilidadCritico: "probabilidadCritico",
    multiplicadorCritico: "multiplicadorCritico",
    evasion: "evasion",
    regeneracionVida: "regeneracionVida",
    regeneracionMana: "regeneracionMana",
    resistenciaFuego: "resistenciaFuego",
    resistenciaFrio: "resistenciaFrio",
    resistenciaRayo: "resistenciaRayo",
    resistenciaVeneno: "resistenciaVeneno",
    resistenciaCongelamiento: "resistenciaCongelamiento",
    resistenciaAturdimiento: "resistenciaAturdimiento",
    resistenciaEnvenenamiento: "resistenciaEnvenenamiento",
    resistenciaQuemadura: "resistenciaQuemadura",
    probabilidadBloqueo: "probabilidadBloqueo",
    mitigacionBloqueo: "mitigacionBloqueoAfijo",
  };
  const clave = claves[propiedad];
  return clave ? tDetalle(clave, respaldo) : respaldo;
}

function tDetalle(clave, respaldo) {
  return traducir(`interfaz.detalleObjeto.${clave}`, { respaldo });
}


function traducirRanuraEquipamiento(nombreRanura) {
  const claves = {
    cabeza: ["cabeza", "Cabeza"],
    torso: ["torso", "Torso"],
    manos: ["manos", "Manos"],
    piernas: ["piernas", "Piernas"],
    pies: ["pies", "Pies"],
    arma: ["arma", "Arma"],
    secundaria: ["secundaria", "Secundaria"],
    collar: ["collar", "Collar"],
    anillo_derecho: ["anilloDerecho", "Anillo der."],
    anillo_izquierdo: ["anilloIzquierdo", "Anillo izq."],
  };
  const [clave, respaldo] = claves[nombreRanura] ?? [null, formatearIdentificador(nombreRanura)];
  return clave
    ? traducir(`interfaz.equipamiento.${clave}`, { respaldo })
    : respaldo;
}

function traducirTipoObjeto(tipo) {
  const claves = {
    arma: ["tipoArma", "Arma"],
    armadura: ["tipoArmadura", "Armadura"],
    quiver: ["tipoQuiver", "Carcaj"],
    municion: ["tipoMunicion", "Munición"],
    consumible: ["tipoConsumible", "Consumible"],
    material: ["tipoMaterial", "Material"],
  };
  const [clave, respaldo] = claves[tipo] ?? [null, formatearIdentificador(tipo)];
  return clave ? tDetalle(clave, respaldo) : respaldo;
}

function traducirElemento(tipo) {
  const claves = {
    fuego: ["interfaz.personaje.fuego", "Fuego"],
    frio: ["interfaz.personaje.frio", "Frío"],
    rayo: ["interfaz.personaje.rayo", "Rayo"],
    veneno: ["interfaz.personaje.veneno", "Veneno"],
  };
  const [clave, respaldo] = claves[tipo] ?? [null, formatearIdentificador(tipo)];
  return clave ? traducir(clave, { respaldo }) : respaldo;
}

function traducirTipoAtaque(tipo) {
  if (tipo === "cuerpoACuerpo") return tDetalle("cuerpoACuerpo", "Cuerpo a cuerpo");
  if (tipo === "distancia") return tDetalle("distancia", "Distancia");
  return formatearIdentificador(tipo);
}

function traducirPatronAtaque(patron) {
  if (["adyacente", "lineal", "libre"].includes(patron)) {
    return tDetalle(patron, ETIQUETAS_PATRON_ATAQUE[patron]);
  }
  return formatearIdentificador(patron);
}

function traducirEfectoConsumible(tipo) {
  if (tipo === "recuperarVida") return tDetalle("recuperaVida", "Recupera Vida");
  if (tipo === "recuperarMana") return tDetalle("recuperaMana", "Recupera Maná");
  return formatearIdentificador(tipo);
}

function traducirResistencia(propiedad, respaldo) {
  const claves = {
    resistenciaFuego: "resistenciaFuego",
    resistenciaFrio: "resistenciaFrio",
    resistenciaRayo: "resistenciaRayo",
    resistenciaVeneno: "resistenciaVeneno",
    resistenciaCongelamiento: "resistenciaCongelamiento",
    resistenciaAturdimiento: "resistenciaAturdimiento",
    resistenciaEnvenenamiento: "resistenciaEnvenenamiento",
    resistenciaQuemadura: "resistenciaQuemadura",
  };
  const clave = claves[propiedad];
  return clave ? tDetalle(clave, respaldo) : respaldo;
}

function validarObjeto(objeto) {
  if (
    !objeto ||
    typeof objeto !== "object" ||
    typeof objeto.nombre !== "string" ||
    typeof objeto.tipo !== "string"
  ) {
    throw new Error("Se necesita un objeto válido para crear su presentación.");
  }
}

function normalizarRuta(ruta) {
  return typeof ruta === "string" && ruta.trim() !== "" ? ruta.trim() : null;
}

function formatearNumero(valor, decimalesMaximos = 0) {
  if (!Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat(idiomaActivo() === "en" ? "en-US" : "es-UY", {
    minimumFractionDigits: decimalesMaximos,
    maximumFractionDigits: decimalesMaximos,
  }).format(valor);
}

function formatearNumeroFlexible(valor) {
  if (!Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat(idiomaActivo() === "en" ? "en-US" : "es-UY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);
}

function formatearPeso(valor) {
  return new Intl.NumberFormat(idiomaActivo() === "en" ? "en-US" : "es-UY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(valor);
}

function formatearMonedas(valor) {
  return new Intl.NumberFormat(idiomaActivo() === "en" ? "en-US" : "es-UY", {
    maximumFractionDigits: 0,
  }).format(Math.round(valor));
}

function formatearNumeroConSigno(valor) {
  if (!Number.isFinite(valor)) return "—";
  const signo = valor > 0 ? "+" : "";
  return `${signo}${formatearNumero(valor)}`;
}

function formatearNumeroConSignoFlexible(valor) {
  if (!Number.isFinite(valor)) return "—";
  const signo = valor > 0 ? "+" : "";
  return `${signo}${formatearNumeroFlexible(valor)}`;
}

function formatearIdentificador(valor) {
  if (typeof valor !== "string" || valor.trim() === "") return "—";
  const texto = valor
    .replace(/([a-záéíóúñ])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim()
    .toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
