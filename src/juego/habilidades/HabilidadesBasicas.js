import { obtenerConfiguracionAtaque } from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";

export const IDS_HABILIDADES_BASICAS = Object.freeze({
  ATACAR: "atacar",
  ESPERAR: "esperar",
});

export const ACCIONES_HABILIDAD_BASICA = Object.freeze({
  ATACAR: "atacar",
  ESPERAR: "esperar",
});

const ICONO_PUNO = "assets/imagenes/habilidades/basicas/ataque_puno.svg";
const ICONO_DUAL = "assets/imagenes/habilidades/basicas/ataque_dual.svg";
const ICONO_ESPERAR = "assets/imagenes/habilidades/basicas/esperar_turno.svg";

const ICONOS_ATAQUE_POR_FAMILIA = Object.freeze({
  daga: "assets/imagenes/habilidades/basicas/ataque_dagas.svg",
  espada: "assets/imagenes/habilidades/basicas/ataque_espada.svg",
  hacha: "assets/imagenes/habilidades/basicas/ataque_hacha.svg",
  mandoble: "assets/imagenes/habilidades/basicas/ataque_mandoble.svg",
  lanza: "assets/imagenes/habilidades/basicas/ataque_lanza.svg",
  arco: "assets/imagenes/habilidades/basicas/ataque_arco.svg",
  baston: "assets/imagenes/habilidades/basicas/ataque_baston.svg",
  varita: "assets/imagenes/habilidades/basicas/ataque_varita.svg",
});

export function esHabilidadBasica(idHabilidad) {
  return Object.values(IDS_HABILIDADES_BASICAS).includes(
    normalizarId(idHabilidad),
  );
}

export function crearAsignacionesBasicasIniciales() {
  return [
    IDS_HABILIDADES_BASICAS.ATACAR,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    IDS_HABILIDADES_BASICAS.ESPERAR,
  ];
}

export function obtenerCatalogoHabilidadesBasicas({ jugador } = {}) {
  return Object.freeze({
    [IDS_HABILIDADES_BASICAS.ATACAR]: crearHabilidadAtacar(jugador),
    [IDS_HABILIDADES_BASICAS.ESPERAR]: crearHabilidadEsperar(),
  });
}

export function obtenerHabilidadBasica({ idHabilidad, jugador } = {}) {
  const id = normalizarId(idHabilidad);
  return obtenerCatalogoHabilidadesBasicas({ jugador })[id] ?? null;
}

export function resolverIconoAtaqueBasico(jugador) {
  if (!jugador) {
    return ICONO_PUNO;
  }

  const configuracion = obtenerConfiguracionAtaque(jugador);

  // La decisión aprobada usa la ranura principal como fuente visual. Si no
  // existe arma principal, el icono vuelve al puño aunque el motor pueda
  // resolver un ataque de respaldo desde otra fuente.
  if (!configuracion.armaPrincipal) {
    return ICONO_PUNO;
  }

  if (configuracion.esAtaqueDual === true) {
    return ICONO_DUAL;
  }

  const familia = normalizarId(configuracion.armaPrincipal.familiaObjeto);
  return ICONOS_ATAQUE_POR_FAMILIA[familia] ?? ICONO_PUNO;
}

function crearHabilidadAtacar(jugador) {
  const configuracion = jugador ? obtenerConfiguracionAtaque(jugador) : null;
  const costoMana = configuracion?.costoManaAtaqueBasico ?? 0;

  return Object.freeze({
    id: IDS_HABILIDADES_BASICAS.ATACAR,
    nombre: "Atacar",
    descripcion: "Activa o confirma el ataque básico actual.",
    categoria: "basicas",
    tipo: "activa",
    grado: 1,
    gradoMaximo: 1,
    siempreAprendida: true,
    icono: resolverIconoAtaqueBasico(jugador),
    costoMana,
    accionCanonica: ACCIONES_HABILIDAD_BASICA.ATACAR,
  });
}

function crearHabilidadEsperar() {
  return Object.freeze({
    id: IDS_HABILIDADES_BASICAS.ESPERAR,
    nombre: "Esperar",
    descripcion: "Consume un turno sin desplazar al personaje.",
    categoria: "basicas",
    tipo: "activa",
    grado: 1,
    gradoMaximo: 1,
    siempreAprendida: true,
    icono: ICONO_ESPERAR,
    costoMana: null,
    accionCanonica: ACCIONES_HABILIDAD_BASICA.ESPERAR,
  });
}

function normalizarId(valor) {
  return typeof valor === "string" ? valor.trim().toLowerCase() : "";
}
