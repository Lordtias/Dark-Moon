import { calcularDpsCombatiente } from "../juego/combate/CalculadorDPS.js";
import { obtenerAportesAtributosPrimarios } from "../entidad/destructible/combatiente/EstadisticasDerivadas.js";
import { crearContextoPotenciaHabilidad } from "../juego/magia/SistemaCatalizadores.js";
import { TIEMPO_REFERENCIA } from "../juego/tiempo/SistemaTiempo.js";
import { OPERACIONES_MODIFICADOR, OBJETIVOS_MODIFICADOR } from "../juego/modificadores/ContratosModificadoresCombatiente.js";
import { traducir, traducirContenido } from "./idiomas/ContextoIdioma.js";
import { ModalDetalleEstadistica } from "./personaje/ModalDetalleEstadistica.js";
import { obtenerEstadoPasivasJugador } from "./personaje/ConsultaPasivasJugador.js";

const ATRIBUTOS = ["fuerza", "destreza", "constitucion", "inteligencia", "sabiduria", "carisma"];
const DETALLES = Object.freeze({
  "danio-medio":{etiqueta:"Daño medio",icono:"⚔"}, dps:{etiqueta:"DPS",icono:"✦"},
  precision:{etiqueta:"Precisión",icono:"◎",resolucion:"precision"}, evasion:{etiqueta:"Evasión",icono:"↗",resolucion:"evasion"}, armadura:{etiqueta:"Armadura",icono:"⬙",resolucion:"armadura"},
  critico:{etiqueta:"Crítico",icono:"✧",resolucion:"probabilidadCritico",porcentaje:true}, bloqueo:{etiqueta:"Bloqueo",icono:"◇",resolucion:"probabilidadBloqueo",porcentaje:true}, "mitigacion-bloqueo":{etiqueta:"Mitigación de bloqueo",icono:"⬘",resolucion:"mitigacionBloqueo",porcentaje:true},
  "regen-vida":{etiqueta:"Regen. vida",icono:"+",resolucion:"regeneracionVida"}, "regen-mana":{etiqueta:"Regen. maná",icono:"◈",resolucion:"regeneracionMana"}, percepcion:{etiqueta:"Percepción",icono:"◉"}, alcance:{etiqueta:"Alcance",icono:"↔"},
  "danio-magico":{etiqueta:"Daño mágico",icono:"✦"}, "potencia-habilidad":{etiqueta:"Potencia de Habilidad",icono:"✧",porcentaje:true}, "potencia-efectos":{etiqueta:"Potencia de Efectos",icono:"✺",resolucion:"potenciaEfectos",porcentaje:true},
  "res-fuego":{etiqueta:"Fuego",icono:"♨",resolucion:"resistencia:fuego",porcentaje:true}, "res-frio":{etiqueta:"Frío",icono:"❄",resolucion:"resistencia:frio",porcentaje:true}, "res-rayo":{etiqueta:"Rayo",icono:"ϟ",resolucion:"resistencia:rayo",porcentaje:true}, "res-veneno":{etiqueta:"Veneno",icono:"◒",resolucion:"resistencia:veneno",porcentaje:true},
  "res-congelamiento":{etiqueta:"Congelamiento",icono:"❄",resolucion:"resistenciaEfecto:congelamiento",porcentaje:true}, "res-aturdimiento":{etiqueta:"Aturdimiento",icono:"✹",resolucion:"resistenciaEfecto:aturdimiento",porcentaje:true}, "res-envenenamiento":{etiqueta:"Envenenamiento",icono:"◒",resolucion:"resistenciaEfecto:envenenamiento",porcentaje:true}, "res-quemadura":{etiqueta:"Quemadura",icono:"♨",resolucion:"resistenciaEfecto:quemadura",porcentaje:true}, "res-mental":{etiqueta:"Resistencia Mental",icono:"◌",resolucion:"resistenciaMental",porcentaje:true,limiteDominio:75},
});

const CLAVE_APORTE_ESTADISTICA = Object.freeze({
  danioFisico: ["danio-medio", "Daño físico"],
  vidaMaxima: ["vida-maxima", "Vida máxima"],
  manaMaximo: ["mana-maximo", "Maná máximo"],
  precision: ["precision", "Precisión"],
  evasion: ["evasion", "Evasión"],
  regeneracionVida: ["regen-vida", "Regeneración de vida"],
  regeneracionMana: ["regen-mana", "Regeneración de maná"],
  danioMagico: ["danio-magico", "Daño mágico"],
  potenciaEfectos: ["potencia-efectos", "Potencia de Efectos"],
  resistenciaVeneno: ["res-veneno", "Resistencia a Veneno"],
  "resistencia:fuego": ["res-fuego", "Resistencia a Fuego"],
  "resistencia:frio": ["res-frio", "Resistencia a Frío"],
  "resistencia:rayo": ["res-rayo", "Resistencia a Rayo"],
  "resistencia:veneno": ["res-veneno", "Resistencia a Veneno"],
  "resistenciaEfecto:congelamiento": ["res-congelamiento", "Resistencia a Congelamiento"],
  "resistenciaEfecto:aturdimiento": ["res-aturdimiento", "Resistencia a Aturdimiento"],
  "resistenciaEfecto:envenenamiento": ["res-envenenamiento", "Resistencia a Envenenamiento"],
  "resistenciaEfecto:quemadura": ["res-quemadura", "Resistencia a Quemadura"],
  resistenciaMental: ["res-mental", "Resistencia Mental"],
  potenciaAura: ["potencia-aura", "Potencia de Aura"],
});

const CLAVE_ESTADISTICA_APORTES = Object.freeze({
  "danio-medio": "danioFisico",
  precision: "precision",
  evasion: "evasion",
  "regen-vida": "regeneracionVida",
  "regen-mana": "regeneracionMana",
  "danio-magico": "danioMagico",
  "potencia-efectos": "potenciaEfectos",
  "res-fuego": "resistencia:fuego",
  "res-frio": "resistencia:frio",
  "res-rayo": "resistencia:rayo",
  "res-veneno": "resistencia:veneno",
  "res-congelamiento": "resistenciaEfecto:congelamiento",
  "res-aturdimiento": "resistenciaEfecto:aturdimiento",
  "res-envenenamiento": "resistenciaEfecto:envenenamiento",
  "res-quemadura": "resistenciaEfecto:quemadura",
  "res-mental": "resistenciaMental",
});

export class PanelPersonaje {
  constructor({ contenedor, plantilla, configuracionHabilidades = null, configuracionEjecucionHabilidades = null } = {}) {
    if (!contenedor) throw new Error("PanelPersonaje necesita un contenedor.");
    if (!(plantilla instanceof HTMLTemplateElement)) throw new Error("PanelPersonaje necesita una plantilla HTML válida.");
    this.contenedor=contenedor; this.plantilla=plantilla; this.configuracionHabilidades=configuracionHabilidades; this.configuracionEjecucionHabilidades=configuracionEjecucionHabilidades; this.playerActual=null; this.juegoActual=null;
    this.indiceEfectos=crearIndiceEfectos(configuracionEjecucionHabilidades); this.modalDetalle=new ModalDetalleEstadistica();
    this.manejarClick=this.manejarClick.bind(this); this.manejarTecla=this.manejarTecla.bind(this); this.crearContenido();
    contenedor.addEventListener("click",this.manejarClick); contenedor.addEventListener("keydown",this.manejarTecla);
  }
  crearContenido() {
    this.contenedor.replaceChildren(this.plantilla.content.cloneNode(true));
    const v=this.obtener('[data-personaje="turno"]'); v.dataset.personaje="dps"; const fila=v.closest(".dato-personaje"); fila.querySelector("span").textContent="DPS"; fila.removeAttribute("title");
    const secciones=[...this.contenedor.querySelectorAll(":scope > .seccion-panel")]; secciones.find(s=>s.querySelector(".lista-atributos"))?.setAttribute("data-seccion-personaje","atributos"); secciones.find(s=>s.querySelector('[data-personaje="dps"]'))?.setAttribute("data-seccion-personaje","combate");
    this.crearHabilidades(); this.crearPasivas(); this.crearEfectos(); this.configurarDesgloses();
  }
  crearDato(etiqueta,campo,valor="—") { const b=document.createElement("button"); b.type="button"; b.className="dato-personaje dato-personaje--desglosable"; b.dataset.desglose=campo; const s=document.createElement("span");s.textContent=etiqueta;const st=document.createElement("strong");st.dataset.personaje=campo;st.textContent=valor;const i=document.createElement("i");i.className="dato-personaje__detalle";i.textContent="i";i.setAttribute("aria-hidden","true");b.append(s,st,i);return b; }
  crearHabilidades(){const s=document.createElement("section");s.className="seccion-panel seccion-habilidades-personaje";s.dataset.seccionPersonaje="habilidades";const h=document.createElement("h3");h.textContent=traducir("interfaz.personaje.habilidades",{respaldo:"Habilidades"});const r=document.createElement("div");r.className="resumen-personaje";r.append(this.crearDato(traducir("interfaz.personaje.danioMagico",{respaldo:"Daño mágico"}),"danio-magico","×1.00"),this.crearDato(traducir("interfaz.personaje.potenciaHabilidad",{respaldo:"Potencia de Habilidad"}),"potencia-habilidad","+0%"),this.crearDato(traducir("interfaz.personaje.potenciaEfectos",{respaldo:"Potencia de Efectos"}),"potencia-efectos","+0%"));s.append(h,r);this.contenedor.querySelector('[data-seccion-personaje="resistencias"]')?.before(s);}
  crearPasivas(){const s=document.createElement("section");s.className="seccion-panel seccion-pasivas-personaje";s.dataset.seccionPersonaje="pasivas";const h=document.createElement("h3");h.textContent=traducir("interfaz.personaje.pasivasAprendidas",{respaldo:"Pasivas aprendidas"});this.listaPasivas=document.createElement("div");this.listaPasivas.className="lista-pasivas-personaje";s.append(h,this.listaPasivas);this.contenedor.append(s);}
  crearEfectos(){const s=document.createElement("section");s.className="seccion-panel seccion-efectos-personaje";s.dataset.seccionPersonaje="efectos";const h=document.createElement("h3");h.textContent=traducir("interfaz.personaje.efectosActivos",{respaldo:"Efectos activos"});this.listaEfectos=document.createElement("div");this.listaEfectos.className="lista-efectos-personaje";s.append(h,this.listaEfectos);this.contenedor.append(s);}
  configurarDesgloses(){for(const campo of Object.keys(DETALLES)){const f=this.contenedor.querySelector(`[data-personaje="${campo}"]`)?.closest(".dato-personaje");if(!f||f.matches("button"))continue;f.dataset.desglose=campo;f.classList.add("dato-personaje--desglosable");f.tabIndex=0;const i=document.createElement("i");i.className="dato-personaje__detalle";i.textContent="i";i.setAttribute("aria-hidden","true");f.append(i);}for(const f of this.contenedor.querySelectorAll(".fila-atributo")){f.dataset.desglose=`atributo:${f.dataset.atributo}`;f.classList.add("fila-atributo--desglosable");}}
  obtener(sel){const e=this.contenedor.querySelector(sel);if(!e)throw new Error(`No se encontró "${sel}" en PanelPersonaje.`);return e;}
  manejarClick(event){const b=event.target.closest('[data-accion="sumar-atributo"]');if(b&&this.playerActual){event.stopPropagation();const r=this.playerActual.asignarPuntoAtributo(b.dataset.atributo);if(r.exito)this.actualizar(this.playerActual,{juego:this.juegoActual});b.blur();return;}const d=event.target.closest("[data-desglose]");if(d&&this.contenedor.contains(d)&&this.playerActual)this.abrirDetalle(d.dataset.desglose);}
  manejarTecla(event){if(!["Enter"," "].includes(event.key)||event.target.closest('[data-accion="sumar-atributo"]'))return;const d=event.target.closest("[data-desglose]");if(d&&this.playerActual){event.preventDefault();this.abrirDetalle(d.dataset.desglose);}}
  actualizar(player,{juego=this.juegoActual}={}){this.playerActual=player;this.juegoActual=juego??null;const e=player.estadisticasDerivadas;this.estadisticasActuales=e;this.aportesAtributosActuales=obtenerAportesAtributosPrimarios(player);this.resolucionPercepcionActual=player.resolverModificador(OBJETIVOS_MODIFICADOR.PERCEPCION,player.percepcionBase);this.dpsActual=calcularDpsCombatiente(player);this.potenciaActual=crearContextoPotenciaHabilidad({combatiente:player});this.obtener('[data-personaje="nombre"]').textContent=player.nombre;this.obtener('[data-personaje="clase"]').textContent=traducirContenido("profesiones",player.idProfesion,"nombre",player.clasePersonaje);this.obtener('[data-personaje="nivel"]').textContent=traducir("interfaz.personaje.nivel",{parametros:{nivel:player.nivel},respaldo:`Nivel ${player.nivel}`});this.actualizarExperiencia(player);this.obtener('[data-personaje="puntos-atributo"]').textContent=player.puntosAtributoDisponibles;this.obtener('[data-personaje="danio-medio"]').textContent=formato(e.danioFisico.promedio);this.obtener('[data-personaje="dps"]').textContent=formato(this.dpsActual.dps);this.actualizarBarra("vida",player.vidaActual,player.vidaMaxima);this.actualizarBarra("mana",player.manaActual,player.manaMaximo);for(const a of ATRIBUTOS)this.obtener(`.fila-atributo[data-atributo="${a}"] [data-campo="valor"]`).textContent=player.atributos[a];this.actualizarEstadisticas(player,e);for(const b of this.contenedor.querySelectorAll('[data-accion="sumar-atributo"]'))b.disabled=player.puntosAtributoDisponibles<=0;this.actualizarPasivas(player);this.actualizarEfectos(player);}
  asegurarMental(){if(this.contenedor.querySelector('[data-personaje="res-mental"]'))return;this.obtener('[data-personaje="res-quemadura"]').closest(".resumen-personaje").append(this.crearDato(traducir("interfaz.personaje.resistenciaMental",{respaldo:"Resistencia Mental"}),"res-mental","0%"));}
  actualizarEstadisticas(player,e){this.asegurarMental();const v={precision:e.precision,evasion:e.evasion,armadura:e.armadura,critico:`${formato(e.probabilidadCritico)}%`,bloqueo:`${formato(e.probabilidadBloqueo)}%`,"mitigacion-bloqueo":`${formato(e.mitigacionBloqueo)}%`,"regen-vida":formato(e.regeneracionVida),"regen-mana":formato(e.regeneracionMana),percepcion:formato(Math.max(0,this.resolucionPercepcionActual.resultado)),alcance:player.alcanceAtaque,"danio-magico":`×${e.multiplicadorDanioMagico.toFixed(2)}`,"potencia-habilidad":signoPorcentaje(this.potenciaActual?.potenciaHabilidad??0),"potencia-efectos":signoPorcentaje(e.potenciaEfectos),"res-fuego":`${formato(e.resistencias.fuego)}%`,"res-frio":`${formato(e.resistencias.frio)}%`,"res-rayo":`${formato(e.resistencias.rayo)}%`,"res-veneno":`${formato(e.resistencias.veneno)}%`,"res-congelamiento":`${formato(e.resistenciasEfectos.congelamiento)}%`,"res-aturdimiento":`${formato(e.resistenciasEfectos.aturdimiento)}%`,"res-envenenamiento":`${formato(e.resistenciasEfectos.envenenamiento)}%`,"res-quemadura":`${formato(e.resistenciasEfectos.quemadura)}%`,"res-mental":`${formato(e.resistenciaMental)}%`};for(const [k,val] of Object.entries(v))this.obtener(`[data-personaje="${k}"]`).textContent=val;}
  actualizarPasivas(player){const lista=obtenerEstadoPasivasJugador({jugador:player,configuracion:this.configuracionHabilidades});this.listaPasivas.replaceChildren();if(!lista.length){this.listaPasivas.append(vacio(traducir("interfaz.personaje.sinPasivas",{respaldo:"Sin pasivas aprendidas."})));return;}let m=null;for(const p of lista){if(p.maestria!==m){m=p.maestria;const h=document.createElement("h4");h.className="lista-pasivas-personaje__maestria";h.textContent=traducirContenido("maestrias",m,"nombre",ident(m));this.listaPasivas.append(h);}const a=document.createElement("article");a.className=`pasiva-personaje pasiva-personaje--${p.estado}`;const rutaIcono=this.configuracionEjecucionHabilidades?.habilidades?.[p.idHabilidad]?.icono??p.icono;const img=icono(rutaIcono,p.nombre,"pasiva-personaje__icono");const c=document.createElement("div");c.className="pasiva-personaje__cuerpo";const n=document.createElement("strong");n.textContent=traducirContenido("habilidades",p.idHabilidad,"nombre",p.nombre);const meta=document.createElement("span");const grado=traducir("interfaz.personaje.gradoPasiva",{parametros:{grado:p.grado},respaldo:`Grado ${p.grado}`});const motivo=motivoPasiva(p);meta.textContent=motivo?`${grado} · ${motivo}`:grado;c.append(n,meta);const estado=document.createElement("span");estado.className="pasiva-personaje__estado";estado.textContent=traducir(`interfaz.personaje.pasivaEstado.${p.estado}`,{respaldo:p.estado});a.append(img,c,estado);this.listaPasivas.append(a);}}
  actualizarEfectos(player){this.listaEfectos.replaceChildren();const lista=this.juegoActual?.obtenerEfectosTemporales?.(player)??[];if(!lista.length){this.listaEfectos.append(vacio(traducir("interfaz.personaje.sinEfectos",{respaldo:"Sin efectos temporales activos."})));return;}for(const e of lista.sort((a,b)=>(a.venceEn??Infinity)-(b.venceEn??Infinity))){const hab=this.indiceEfectos.get(e.efectoId);const a=document.createElement("article");a.className=`efecto-personaje efecto-personaje--${e.beneficioso?"beneficioso":"perjudicial"}`;const im=icono(hab?.icono,e.nombreEfecto,"efecto-personaje__icono");const c=document.createElement("div");c.className="efecto-personaje__cuerpo";const n=document.createElement("strong");n.textContent=traducirContenido("efectos",e.efectoId,"nombre",e.nombreEfecto);const tipo=document.createElement("span");tipo.textContent=tipoEfecto(e);const d=document.createElement("small");d.textContent=descripcionEfecto(e);c.append(n,tipo,d);const tm=document.createElement("span");tm.className="efecto-personaje__tiempo";const turns=Number.isFinite(e.venceEn)&&Number.isFinite(this.juegoActual?.tiempoActual)?Math.max(0,Math.ceil((e.venceEn-this.juegoActual.tiempoActual)/TIEMPO_REFERENCIA)):null;tm.textContent=turns===null?"—":traducir("interfaz.personaje.turnosRestantesCorto",{parametros:{turnos:turns},respaldo:`${turns} t`});a.append(im,c,tm);this.listaEfectos.append(a);}}
  abrirDetalle(clave){const d=clave.startsWith("atributo:")?this.detalleAtributo(clave.slice(9)):this.detalleEstadistica(clave);if(d)this.modalDetalle.abrir(d);}
  detalleAtributo(a){
    const val=this.playerActual?.atributos?.[a];
    if(!Number.isFinite(val))return null;
    const et=traducir(`interfaz.personaje.${a}`,{respaldo:ident(a)});
    const aportes=this.aportesAtributosActuales?.porAtributo?.[a]??[];
    const filas=[{tipo:"base",etiqueta:traducir("interfaz.personaje.valorActual",{respaldo:"Valor actual"}),valor:formato(val)}];
    for(const aporte of aportes){
      const [,respaldoBase]=CLAVE_APORTE_ESTADISTICA[aporte.estadistica]??[aporte.estadistica,ident(aporte.estadistica)];
      const respaldo=aporte.nota==="armas_fuerza"
        ?"Daño físico con armas de Fuerza"
        :aporte.nota==="armas_destreza"
          ?"Daño físico con armas de Destreza"
          :aporte.nota==="armas_inteligencia"
            ?"Daño físico con armas de Inteligencia"
            :respaldoBase;
      const claveAporte=aporte.nota?.startsWith("armas_")?aporte.nota:normalizarClaveTraduccion(aporte.estadistica);
      filas.push({
        tipo:aporte.valor<0?"penalizacion":"atributo",
        etiqueta:traducir(`interfaz.personaje.aporteEstadistica.${claveAporte}`,{respaldo}),
        valor:formatearAporteAtributo(aporte),
        icono:"◆",
      });
    }
    return{
      titulo:et,
      icono:"◆",
      valorFinal:formato(val),
      descripcion:descripcionDetalle(`atributo:${a}`),
      filas,
      nota:traducir("interfaz.personaje.atributoAportesNota",{respaldo:"Los aportes listados son los que este atributo genera en el cálculo canónico actual. Cuando dice aporte al valor base, modificadores posteriores todavía pueden alterar el resultado final."}),
    };
  }
  detalleEstadistica(k){
    const m=DETALLES[k];
    if(!m)return null;
    const visible=this.contenedor.querySelector(`[data-personaje="${k}"]`)?.textContent??"—";
    if(k==="dps")return{
      titulo:m.etiqueta,
      icono:m.icono,
      valorFinal:visible,
      descripcion:descripcionDetalle(k),
      filas:[
        {tipo:"base",etiqueta:"Daño medio",valor:formato(this.dpsActual?.danioMedio??0)},
        {tipo:"informacion",etiqueta:traducir("interfaz.personaje.costoEfectivo",{respaldo:"Costo efectivo"}),valor:this.dpsActual?.costoAtaqueEfectivo??"—"},
        {tipo:"informacion",etiqueta:traducir("interfaz.personaje.duracionAtaque",{respaldo:"Duración del ataque"}),valor:`${formato(this.dpsActual?.duracionAtaqueSegundos??0)} s`},
      ],
      nota:traducir("interfaz.personaje.dpsAyuda",{respaldo:"Daño bruto medio por segundo. No incluye precisión, crítico, armadura ni bloqueo."}),
    };
    let r=null;
    if(k==="potencia-habilidad")r=this.potenciaActual?.resolucionModificador;
    else if(k==="percepcion")r=this.resolucionPercepcionActual;
    else r=this.estadisticasActuales?.resolucionesModificadores?.[m.resolucion];
    const filas=[];
    if(r){
      filas.push({tipo:"base",etiqueta:traducir("interfaz.personaje.valorBase",{respaldo:"Valor base"}),valor:valorResolucion(r.valorBase,m.porcentaje)});
      for(const aporte of this.aportesAtributosEstadistica(k))filas.push({tipo:"atributo",etiqueta:`${nombreAtributo(aporte.atributo)} · ${traducir("interfaz.personaje.incluidoEnBase",{respaldo:"incluido en base"})}`,valor:formatearAporteAtributo(aporte),icono:"◆"});
      for(const mod of r.desglose?.aplicados??[])filas.push({tipo:tipoOperacion(mod.operacion,mod.valor),etiqueta:this.nombreFuente(mod),valor:formatearMod(mod)});
      if(m.limiteDominio&&r.resultado>m.limiteDominio)filas.push({tipo:"limite",etiqueta:traducir("interfaz.personaje.limiteDominio",{respaldo:"Límite del dominio"}),valor:`${m.limiteDominio}%`});
    }else{
      for(const aporte of this.aportesAtributosEstadistica(k))filas.push({tipo:"atributo",etiqueta:nombreAtributo(aporte.atributo),valor:formatearAporteAtributo(aporte),icono:"◆"});
    }
    return{
      titulo:m.etiqueta,
      icono:m.icono,
      valorFinal:visible,
      descripcion:descripcionDetalle(k),
      filas,
      nota:r
        ?traducir("interfaz.personaje.desgloseCanonicoNota",{respaldo:"El detalle usa la misma resolución canónica que produjo la estadística; la interfaz no recalcula el resultado."})
        :traducir("interfaz.personaje.sinDesgloseCanonico",{respaldo:"Este valor no expone todavía un desglose canónico adicional."}),
    };
  }
  aportesAtributosEstadistica(k){
    const clave=CLAVE_ESTADISTICA_APORTES[k];
    if(!clave)return[];
    return this.aportesAtributosActuales?.porEstadistica?.[clave]??[];
  }
  nombreFuente(mod){const f=mod?.fuente??{};if(f.tipo==="pasiva"&&f.idHabilidad){const h=this.configuracionHabilidades?.habilidades?.[f.idHabilidad];return traducirContenido("habilidades",f.idHabilidad,"nombre",h?.nombre??f.idHabilidad);}return f.afijoNombre??f.objetoNombre??f.nombre??(mod?.origen?ident(mod.origen):"Modificador");}
  actualizarExperiencia(p){this.obtener('[data-personaje="experiencia-texto"]').textContent=`${p.experiencia} / ${p.experienciaNecesaria} ${traducir("interfaz.personaje.xp",{respaldo:"PX"})}`;this.obtener('[data-personaje="experiencia-barra"]').style.width=`${Math.max(0,Math.min(100,p.porcentajeExperiencia))}%`;}
  actualizarBarra(r,a,m){this.obtener(`[data-personaje="${r}-texto"]`).textContent=`${Math.floor(a)} / ${Math.floor(m)}`;this.obtener(`[data-personaje="${r}-barra"]`).style.width=`${Math.max(0,Math.min(100,m>0?a/m*100:0))}%`;}
  destruir(){this.contenedor.removeEventListener("click",this.manejarClick);this.contenedor.removeEventListener("keydown",this.manejarTecla);this.modalDetalle?.destruir();}
}
function crearIndiceEfectos(c){const m=new Map();for(const [id,h] of Object.entries(c?.habilidades??{}))for(const g of Object.values(h?.ejecucion?.grados??{}))for(const e of g?.efectos??[])if(!m.has(e.efectoId))m.set(e.efectoId,{id,...h});return m;}
function icono(r,n,cl){const s=document.createElement("span");s.className=cl;if(r){const i=document.createElement("img");i.src=r;i.alt="";s.append(i);}else s.textContent=String(n??"?").charAt(0).toUpperCase();return s;}
function vacio(t){const p=document.createElement("p");p.className="mensaje-vacio mensaje-vacio--compacto";p.textContent=t;return p;}
function motivoPasiva(p){if(p.estado==="condicional")return traducir("interfaz.personaje.pasivaCondicional",{respaldo:"Aplica al contexto de la habilidad correspondiente"});if(p.estado!=="inactiva")return"";const k=p.condicionesNoCumplidas?.[0]?.clave??"generico";return traducir(`interfaz.personaje.pasivaMotivo.${k}`,{respaldo:"Condición actual no cumplida"});}
function tipoEfecto(e){const q=new Set(e?.etiquetas??[]);if(q.has("aura")||e.emision)return traducir("interfaz.personaje.efectoAura",{respaldo:"Aura"});if(q.has("maldicion")||e.resistenciaId==="mental")return traducir("interfaz.personaje.efectoMaldicion",{respaldo:"Maldición"});return traducir(e.beneficioso?"interfaz.personaje.efectoBeneficioso":"interfaz.personaje.efectoPerjudicial",{respaldo:e.beneficioso?"Beneficioso":"Perjudicial"});}
function descripcionEfecto(e){const ms=Array.isArray(e.modificadores)?e.modificadores:[];if(ms.length)return ms.map(m=>`${ident(m.objetivo)} ${formatearMod(m)}`).join(" · ");if(e.tipo==="bloqueo_habilidades")return traducir("interfaz.personaje.efectoBloqueaHabilidades",{respaldo:"Bloquea habilidades activas"});if(e.tipo==="bloqueo_total")return traducir("interfaz.personaje.efectoBloqueoTotal",{respaldo:"Impide actuar temporalmente"});if(e.tipo==="danio_periodico")return traducir("interfaz.personaje.efectoDanioPeriodico",{respaldo:"Daño periódico"});return e.nombreEfecto??"Efecto temporal";}
function tipoOperacion(op,v){if(op===OPERACIONES_MODIFICADOR.LIMITAR_MAXIMO)return"limite";if([OPERACIONES_MODIFICADOR.MULTIPLICAR,OPERACIONES_MODIFICADOR.MULTIPLICAR_REDONDEAR,OPERACIONES_MODIFICADOR.PORCENTAJE_MULTIPLICATIVO,OPERACIONES_MODIFICADOR.PORCENTAJE_INVERSO].includes(op))return"multiplicador";return v<0?"penalizacion":"bonificacion";}
function formatearMod(m){const v=Number(m?.valor)||0,s=v>0?"+":"";if([OPERACIONES_MODIFICADOR.PORCENTAJE_BASE,OPERACIONES_MODIFICADOR.PORCENTAJE_TOTAL,OPERACIONES_MODIFICADOR.PORCENTAJE_MULTIPLICATIVO,OPERACIONES_MODIFICADOR.PORCENTAJE_INVERSO].includes(m?.operacion))return`${s}${v}%`;if([OPERACIONES_MODIFICADOR.MULTIPLICAR,OPERACIONES_MODIFICADOR.MULTIPLICAR_REDONDEAR].includes(m?.operacion))return`×${v}`;if(m?.operacion===OPERACIONES_MODIFICADOR.LIMITAR_MAXIMO)return`máx. ${v}`;return`${s}${v}`;}
function descripcionDetalle(clave){
  const fallback={
    "atributo:fuerza":"Atributo físico principal. Modifica el daño físico de las armas cuya estadística ofensiva sea Fuerza.",
    "atributo:destreza":"Atributo de precisión y agilidad. Aumenta Precisión y Evasión, y puede gobernar el daño físico de armas ágiles.",
    "atributo:constitucion":"Atributo de resistencia corporal. Aporta Vida máxima, regeneración de Vida y defensas frente a Veneno y estados perjudiciales.",
    "atributo:inteligencia":"Atributo de poder mágico. Aporta Maná máximo, daño mágico y Potencia de Efectos.",
    "atributo:sabiduria":"Atributo de control y resistencia mágica. Aporta Maná, regeneración, daño y efectos mágicos, resistencias elementales y Resistencia Mental.",
    "atributo:carisma":"Atributo de influencia. Aumenta la Potencia de Aura canónica; las auras actuales no escalan automáticamente su magnitud por esta estadística.",
    "danio-medio":"Promedio del daño bruto del ataque físico actual antes de precisión, crítico, Armadura y Bloqueo del objetivo.",
    dps:"Daño bruto medio por segundo según el daño medio y el tiempo efectivo del ataque actual.",
    precision:"Valor usado para determinar la probabilidad de impactar frente a la Evasión del objetivo.",
    evasion:"Valor defensivo que reduce la probabilidad de que los ataques enemigos impacten.",
    armadura:"Defensa física que reduce el daño físico recibido según la fórmula canónica de Armadura.",
    critico:"Probabilidad de que un ataque válido sea crítico.",
    bloqueo:"Probabilidad de bloquear un golpe cuando la configuración actual permite Bloqueo.",
    "mitigacion-bloqueo":"Porcentaje del daño de un golpe bloqueado que se evita cuando el Bloqueo tiene éxito.",
    "regen-vida":"Vida recuperada en cada pulso de tiempo de referencia.",
    "regen-mana":"Maná recuperado en cada pulso de tiempo de referencia.",
    percepcion:"Cantidad de casillas que el combatiente puede percibir para visión y detección.",
    alcance:"Alcance máximo del ataque básico actual.",
    "danio-magico":"Multiplicador aplicado al daño mágico que escala con los atributos mágicos.",
    "potencia-habilidad":"Bonificación porcentual que modifica el daño de habilidades mediante el sistema canónico de modificadores.",
    "potencia-efectos":"Potencia que escala las magnitudes de efectos configurados para utilizarla, como el daño periódico de Quemadura y Envenenamiento.",
    "res-fuego":"Reduce el daño de Fuego recibido, hasta el límite de resistencia del sistema.",
    "res-frio":"Reduce el daño de Frío recibido, hasta el límite de resistencia del sistema.",
    "res-rayo":"Reduce el daño de Rayo recibido, hasta el límite de resistencia del sistema.",
    "res-veneno":"Reduce el daño de Veneno recibido, hasta el límite de resistencia del sistema.",
    "res-congelamiento":"Reduce la probabilidad de recibir Congelamiento.",
    "res-aturdimiento":"Reduce la probabilidad de recibir Aturdimiento.",
    "res-envenenamiento":"Reduce la probabilidad de recibir Envenenamiento.",
    "res-quemadura":"Reduce la probabilidad de recibir Quemadura.",
    "res-mental":"Reduce la probabilidad de recibir Maldiciones. Su valor final está limitado a 75%.",
  };
  return traducir(`interfaz.personaje.descripcionEstadistica.${normalizarClaveTraduccion(clave)}`,{respaldo:fallback[clave]??"Describe el valor canónico actual y su función en el juego."});
}
function formatearAporteAtributo(aporte){const v=Number(aporte?.valor)||0;const s=v>0?"+":"";return aporte?.unidad==="porcentaje"?`${s}${formato(v)}%`:`${s}${formato(v)}`;}
function nombreAtributo(id){return traducir(`interfaz.personaje.${id}`,{respaldo:ident(id)});}
function normalizarClaveTraduccion(v){return String(v??"").replace(/[:.-]/g,"_");}
function formato(v){const n=Number(v);return!Number.isFinite(n)?"—":Number.isInteger(n)?String(n):n.toFixed(1);}
function signoPorcentaje(v){const n=Number(v)||0;return`${n>=0?"+":""}${formato(n)}%`;}
function valorResolucion(v,p){const s=formato(v);return p&&s!=="—"?`${s}%`:s;}
function ident(v){return typeof v!=="string"||!v.trim()?"—":v.trim().replace(/[_-]+/g," ").replace(/\b\w/g,l=>l.toUpperCase());}
