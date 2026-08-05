# ENTREGA P6.2C.1 — MOTOR DE PROYECTILES, ARCOS Y LANZA CON RECURSO VISUAL

Plan: Integración progresiva de Phaser, beta y Electron de Dark Moon  
Etapa: P6.2C.1  
Commit base: `9979c9fe30710bfcbcb055f277b237533de9c701`  
Estado: Cerrada, validada manualmente y publicada en `1a3c4f4aa9585e32d5b0d3448af569d746f05a88`

## 1. Conclusión sencilla

### Qué se analizó

Se revisó el consumo real de munición, el recorrido de los resultados desde combate hasta Phaser, la presentación provisional del arco, la estocada de lanza, los recursos horizontales adjuntos y la selección automática de objetivos físicos.

### Por qué

Una imagen fija de `flecha_madera` no permitiría representar futuras municiones. La línea blanca de lanza tampoco conservaba la variante exacta equipada ni la lectura de arma larga. Además, el selector automático ignoraba destructibles aun cuando no existían enemigos atacables.

### Conclusión final

El dominio ya conoce el objeto exacto que consume o equipa. Debe conservar una descripción visual mínima y pasarla hasta Phaser. La presentación puede utilizar esa ruta sin consultar catálogos ni duplicar decisiones. La lanza puede mantener largo visual dos sin mover al combatiente, variando solamente su centro según el alcance.

### Acción correspondiente

Validar manualmente flechas, munición exacta, alcance y orientación de lanzas, selección automática y regresiones; luego cerrar P6.2C.1 antes de comenzar varitas en P6.2C.2.

## 2. Estado inicial

- copia: `/mnt/data/p6_2c1_work/Dark-Moon`;
- `.git`: presente;
- rama: `main`;
- HEAD: `9979c9fe30710bfcbcb055f277b237533de9c701`;
- estado inicial: limpio y alineado con `origin/main`;
- commit y push: no realizados.

## 3. Alcance implementado

- secuencia `proyectil` ajustada a 40 % preparación, 15 % lanzamiento, 25 % trayectoria y 20 % retorno;
- captura de la munición exacta antes de disminuir su pila;
- descriptor inmutable con `idObjeto`, `tipoMunicion` y `recursoVisual`;
- transporte del descriptor por resultado, evento y plan visual;
- fuentes de ataque ampliadas con ID y ruta visual del arma exacta;
- flecha temporal creada desde el PNG horizontal de la munición consumida;
- rotación automática hacia cualquier casilla cardinal o diagonal;
- representación de impacto, fallo, bloqueo, crítico y casilla vacía;
- crítico integrado en la propia flecha y su impacto;
- lanza y lanza reforzada representadas con el PNG exacto equipado;
- largo visual de lanza equivalente a dos casillas;
- origen centrado en el atacante a alcance uno y en la casilla intermedia a alcance dos;
- eliminación del avance corporal de la estocada;
- creador genérico de recursos temporales preparado para uso futuro con armas o equipamiento;
- selector automático con prioridad enemigo, luego destructible, luego casilla;
- reemplazo de los tres recursos horizontales entregados por el usuario.

## 4. Contrato de munición

El consumo identifica primero el objeto exacto y copia:

```js
{
  idObjeto: "flecha_madera",
  tipoMunicion: "flecha",
  recursoVisual: "assets/imagenes/objetos/flecha_madera.png"
}
```

Después consume esa misma referencia. Phaser no recibe el objeto mutable completo y no consulta `Municiones.json`.

## 5. Contrato de armas lineales

Cada fuente conserva:

```js
{
  idObjeto: "lanza_reforzada",
  familiaObjeto: "lanza",
  recursoVisual: "assets/imagenes/objetos/lanza_reforzada.png"
}
```

El reproductor utiliza la ruta exacta sin condiciones por nombre de arma.

## 6. Lanza por alcance

- alcance uno: centro del recurso sobre el atacante;
- alcance dos: centro sobre la casilla intermedia;
- diagonal: largo visual adaptado a la distancia geométrica;
- el atacante no adelanta su cuerpo ni cambia de casilla lógica.

## 7. Selección automática

El orden es:

1. enemigo vivo y realmente atacable;
2. destructible no enemigo y realmente atacable;
3. casilla inicial de selección.

Un enemigo fuera de línea de visión o patrón no bloquea un destructible válido.

## 8. Archivos agregados

```text
src/interfaz/graficos/phaser/CreadorRecursosVisualesPhaser.js
docs/phaser/entregas/ENTREGA_P6_2_C_1.md
```

## 9. Recursos reemplazados

```text
assets/imagenes/objetos/flecha_madera.png
assets/imagenes/objetos/lanza.png
assets/imagenes/objetos/lanza_reforzada.png
```

## 10. Archivos principales modificados

```text
src/config/presentacion/PerfilesAtaquePorFamilia.json
src/entidad/destructible/combatiente/ConfiguracionAtaque.js
src/juego/combate/SistemaCombate.js
src/juego/combate/SistemaCombateJugador.js
src/juego/acciones/EventosAccion.js
src/interfaz/graficos/ValidadorPerfilesAtaquePorFamilia.js
src/interfaz/graficos/phaser/GestorRecursosPhaser.js
src/interfaz/graficos/phaser/EscenaArranquePhaser.js
src/interfaz/graficos/phaser/CreadorEfectosCombatePhaser.js
src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js
README.md
docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
docs/phaser/entregas/ENTREGA_P6_2_B_2.md
```

## 11. Fuera de alcance

- varitas y doble varita;
- proyectiles elementales;
- habilidades y áreas mágicas;
- equipamiento visible permanente;
- sonidos;
- flechas clavadas;
- botín inmediato, reservado para P6.4;
- cambios de daño, precisión, alcance, munición, Maná o tiempo.

## 12. Pruebas manuales necesarias

1. arco con flecha de madera en cardinal y diagonal;
2. alcance corto y máximo;
3. casilla vacía;
4. impacto, fallo, bloqueo y crítico;
5. muerte por flecha antes de la acción siguiente;
6. cambio automático entre dos tipos de munición cuando existan;
7. lanza y lanza reforzada a alcance uno;
8. ambas lanzas a alcance dos cardinal y diagonal;
9. confirmar que el personaje no avanza durante la estocada;
10. prioridad de enemigo sobre barril;
11. barril automático cuando no hay enemigo atacable;
12. enemigo arquero si existe uno equipado y con munición;
13. cancelación o cambio de mapa durante el proyectil;
14. zoom y redimensionamiento;
15. regresión `?render=canvas2d`;
16. consola sin errores.

## 13. Riesgos pendientes

La prueba automatizada valida contrato, orden y geometría, pero no reemplaza la evaluación estética en navegador. Los PNG proporcionados se incorporan sin rediseñarlos.

## 14. Enlace para la siguiente etapa

La siguiente etapa recomendada es P6.2C.2: proyectiles elementales de varitas y doble varita. Debe reutilizar `CreadorRecursosVisualesPhaser`, el `costoFinal`, los golpes canónicos y los datos elementales ya existentes, sin modificar daño, Maná ni reglas de doble arma.

## 15. Validaciones técnicas realizadas

| Verificación | Resultado |
|---|---|
| JavaScript de producción | 174 archivos correctos |
| JSON | 22 archivos válidos |
| Imports relativos | 386 referencias; ninguna ausente |
| Munición exacta | madera seguida por munición de prueba conserva ID y ruta distintos |
| Fuente de lanza | `lanza_reforzada` conserva su PNG exacto |
| Secuencia de proyectil | `0.40 / 0.15 / 0.25 / 0.20` y suma 1 |
| Selector automático | enemigo, luego destructible, luego casilla |
| Lanza alcance uno | centro del atacante; largo visual 64 px |
| Lanza alcance dos | centro de casilla intermedia; largo visual 64 px |
| Lanza diagonal alcance dos | centro intermedio; largo visual `64 × √2` |
| Creador genérico | ruta, textura, anclaje, escala y rotación validados con dobles de Phaser |
| Recursos HTTP | entradas principales y tres PNG con código 200 |
| `git diff --check` | sin errores |
| Archivos prohibidos | ninguno dentro del repositorio |
| Dependencias | ninguna nueva |

Chromium headless no completó el arranque dentro del entorno de ejecución. Por eso la entrega no afirma una prueba estética interactiva completa.

## 16. Observación sobre los PNG recibidos

Los tres archivos se incorporaron exactamente como fueron adjuntados, sin redibujarlos ni limpiar píxeles. La flecha y la lanza reforzada contienen píxeles visibles fuera de la silueta principal; si no eran intencionales, aparecerán al rotar el recurso y deberán reemplazarse por versiones limpias sin cambiar código.

## 17. Estado Git de la copia entregada

```text
Ruta: /mnt/data/p6_2c1_work/Dark-Moon
.git: presente
Rama: main
HEAD base: 9979c9fe30710bfcbcb055f277b237533de9c701
Estado: 17 archivos modificados y 2 agregados
Commit: no realizado
Push: no realizado
```


## 18. Cierre confirmado

P6.2C.1 fue validada manualmente y publicada por el usuario en `1a3c4f4aa9585e32d5b0d3448af569d746f05a88`. P6.2C.2 parte de ese ZIP y SHA como fuente de verdad.
