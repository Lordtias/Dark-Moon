# ENTREGA P6.2B.1 — CONTRATO TEMPORAL FINAL Y PERFILES POR FAMILIA

Plan: Integración progresiva de Phaser, beta y Electron de Dark Moon  
Etapa: P6.2B.1  
Commit base: `cc88ed0b5c347e10cd665dcebefe6fb667cf54cb`  
Estado: Cerrada, validada manualmente y publicada en `d4a3b4f9e38b0f68da7c0b74ecd4a0f88c29b158`

## 1. Conclusión sencilla

### Qué se analizó

Se revisó el cálculo temporal real de ataques, la creación de eventos de jugador y enemigos, la composición de ataques simples y duales, `familiaObjeto`, el arranque de configuraciones y el plan visual neutral.

### Por qué

Las animaciones futuras deben respetar la velocidad final realmente ejecutada, incluidos todos los modificadores del juego, sin repetir fórmulas dentro de Phaser ni crear una solución especial para doble arma.

### Conclusión final

`SistemaTiempo.registrarAccion()` ya producía el dato correcto. El cambio necesario era conservar ese resultado en `CoordinadorTiempoPartida`, asociarlo con los eventos del actor y convertirlo una sola vez en duración visual.

### Acción correspondiente

Mantener esta infraestructura como base de P6.2B.2, P6.2C y etapas visuales posteriores. No modificar la ecuación temporal fuera de `SistemaTiempo`.

## 2. Estado local inicial

- copia de trabajo: `/mnt/data/p6_2b1_work/Dark-Moon`;
- `.git`: presente;
- rama: `main`;
- HEAD: `cc88ed0b5c347e10cd665dcebefe6fb667cf54cb`;
- estado inicial: limpio y alineado con `origin/main`;
- commit final confirmado: `d4a3b4f9e38b0f68da7c0b74ecd4a0f88c29b158`;
- estado publicado: confirmado en `main`.

## 3. Alcance implementado

- conservar `costoBase`, `costoFinal`, inicio y próximo turno ya calculados;
- asociar la ejecución temporal únicamente a eventos del actor que realizó la acción;
- aplicar el mismo contrato a jugador y enemigos;
- copiar `familiaObjeto` por fuente del ataque;
- distinguir fuentes de ataque natural sin inventar una familia de objeto;
- crear un catálogo JSON canónico de presentación;
- configurar secuencias `simple`, `dual`, `estocada` y `proyectil`;
- reservar campos de sonido sin agregar audio;
- validar el catálogo contra todas las familias de `Armas.json`;
- crear una única conversión de `costoFinal` a duración visual;
- distribuir la duración mediante proporciones que suman uno;
- incorporar el ritmo calculado al plan visual neutral;
- corregir documentalmente el cierre de P6.2A.

## 4. Arquitectura anterior

```text
SistemaTiempo calcula costoFinal
→ el llamador descarta el resultado
→ ataque_resuelto llega sin velocidad real
→ Phaser usa duraciones fijas
```

## 5. Arquitectura final

```text
SistemaCombate resuelve el ataque
→ SistemaTiempo calcula y registra costoFinal
→ CoordinadorTiempoPartida asocia esa ejecución con los eventos del actor
→ PlanificadorEventosVisuales elimina referencias de dominio
→ PlanificadorRitmoVisual convierte una vez costoFinal en duración total
→ la secuencia distribuye la duración entre fases
```

## 6. Una sola ecuación canónica

La velocidad jugable continúa determinada exclusivamente por:

```text
SistemaTiempo.calcularCostoTemporal()
```

Phaser no vuelve a calcular:

- coste del arma;
- factorTiempo;
- factorAtaque;
- modificadores del combatiente;
- coste efectivo por mano;
- pausa dual mediante otra fórmula.

La conversión a milisegundos es únicamente una transformación de presentación y se centraliza en `PlanificadorRitmoVisual`.

## 7. Catálogo canónico

Archivo:

```text
src/config/presentacion/PerfilesAtaquePorFamilia.json
```

Contiene:

- `ritmoVisual`: conversión y límites generales;
- `secuencias`: proporciones de fases;
- `familias`: forma y futura identidad sonora;
- `fallbacks`: ataque natural y familia desconocida.

Familias conectadas:

- daga;
- espada;
- hacha;
- mandoble;
- lanza;
- arco;
- bastón;
- varita.

## 8. Separación de responsabilidades

| Información | Fuente canónica |
|---|---|
| Resultado del ataque | `SistemaCombate` |
| Tiempo real ejecutado | `SistemaTiempo` |
| Familia utilizada | `Armas.json.familiaObjeto` |
| Forma, tamaño y futuro sonido | `PerfilesAtaquePorFamilia.json` |
| Duración y fases visuales | `PlanificadorRitmoVisual` |
| Reproducción | Phaser |

## 9. Ataques simples, duales y futuros proyectiles

Todos reciben una duración total desde el mismo `costoFinal`.

Ejemplo dual validado:

```text
costoFinal: 97
→ duración visual total: 388 ms
→ preparación: 58 ms
→ golpe principal: 109 ms
→ pausa entre manos: 35 ms
→ golpe secundario: 109 ms
→ retorno: 77 ms
```

La pausa entre manos es una fase de la secuencia dual, no una ecuación temporal independiente.

Un arco con `costoFinal: 120` utiliza la secuencia `proyectil` y obtiene 480 ms distribuidos entre preparación, lanzamiento, trayectoria y retorno. La animación real se implementará en P6.2C.

## 10. Jugadores y enemigos

No existen fórmulas o perfiles separados.

- jugador equipado: usa la familia de cada objeto;
- enemigo equipado: usa exactamente el mismo perfil;
- doble arma enemiga: usa la misma secuencia dual;
- enemigo sin arma: usa `ataque_natural`;
- ningún enemigo se identifica por su nombre visible.

## 11. Archivos agregados

```text
src/config/presentacion/PerfilesAtaquePorFamilia.json
src/interfaz/graficos/ContextoPerfilesAtaquePorFamilia.js
src/interfaz/graficos/PlanificadorRitmoVisual.js
src/interfaz/graficos/ValidadorPerfilesAtaquePorFamilia.js
docs/phaser/entregas/ENTREGA_P6_2_B_1.md
```

## 12. Archivos modificados

```text
src/aplicacion/Aplicacion.js
src/juego/configuracion/CargadorConfiguracion.js
src/juego/acciones/EventosAccion.js
src/juego/tiempo/CoordinadorTiempoPartida.js
src/interfaz/graficos/PlanificadorEventosVisuales.js
README.md
docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
docs/phaser/entregas/ENTREGA_P6_2_A.md
```

## 13. Archivos no modificados

- `SistemaCombate.js`;
- `ConfiguracionAtaque.js` y su fórmula dual;
- `Armas.json`;
- factores temporales;
- IA decisoria;
- persistencia;
- Canvas 2D;
- Phaser 4.2.1;
- reproductor de animaciones definitivo.

## 14. Dependencias

Ninguna dependencia nueva.

Se conserva Phaser `4.2.1` exacta y local.

## 15. Validaciones técnicas

- sintaxis JavaScript completa;
- JSON válidos;
- imports relativos existentes;
- catálogo conectado con las ocho familias reales;
- error explícito ante una familia sin perfil;
- secuencias con proporciones iguales a uno;
- ataque simple rápido y lento;
- ataque natural;
- ataque dual;
- arco mediante secuencia de proyectil;
- suma exacta de fases igual a duración total;
- asociación temporal sin modificar el evento original;
- `git diff --check`;
- recursos principales mediante HTTP.

## 16. Prueba manual recomendada

P6.2B.1 no cambia todavía las duraciones utilizadas por el reproductor actual. La prueba manual debe comprobar:

1. arranque normal sin error de configuración;
2. creación o carga de personaje;
3. ataque del jugador;
4. ataques de enemigos;
5. doble arma;
6. consola sin errores;
7. Canvas 2D sin regresión.

La percepción final del nuevo ritmo se validará en P6.2B.2 y P6.2C, cuando las animaciones consuman las fases ya planificadas.

## 17. Riesgos pendientes

- los valores de conversión y proporciones son iniciales y podrán afinarse visualmente;
- el reproductor actual todavía usa la animación provisional de P6.2A;
- sonidos continúan en `null`;
- la familia desconocida es fallback de ejecución, no sustituto de la validación de arranque.

## 18. Criterios de cierre

P6.2B.1 puede cerrarse cuando:

- el juego inicia con el nuevo JSON;
- todas las familias validan;
- jugador y enemigos conservan `costoFinal` en sus eventos;
- el plan visual obtiene duración y fases sin recalcular velocidad;
- no existen regresiones de combate, tiempo, persistencia o Canvas 2D;
- la prueba manual es aprobada;
- se realiza un commit propio y se confirma su SHA.

## 19. Conventional Commit propuesto

```text
feat(phaser): conectar ritmo visual con el tiempo canónico

- conservar el costo final realmente registrado para acciones del jugador y enemigos;
- asociar la ejecución temporal con los eventos pertenecientes al mismo actor;
- copiar familiaObjeto y ataque natural dentro de las fuentes visuales;
- incorporar un único planificador de duración basado en costoFinal;
- distribuir la duración mediante secuencias configurables sin ecuaciones duplicadas;
- agregar perfiles canónicos de animación y sonido futuro por familia de arma;
- validar perfiles contra todas las familias presentes en Armas.json;
- preparar secuencias simples, duales, de estocada y proyectil;
- conservar combate, tiempo, persistencia, Canvas 2D y Phaser 4.2.1;
- cerrar documentalmente P6.2A y documentar P6.2B.1.
```

## 20. Enlace para la siguiente etapa

---------------- INICIO DEL ENLACE ----------------

PLAN:
Integración progresiva de Phaser, beta y Electron de Dark Moon.

ETAPA CERRADA:
P6.2B.1 — Contrato temporal final y perfiles por familia

ESTADO:
Pausada hasta validación manual y commit

COMMIT BASE:
cc88ed0b5c347e10cd665dcebefe6fb667cf54cb

HEAD FINAL VERIFICADO:
cc88ed0b5c347e10cd665dcebefe6fb667cf54cb

GIT STATUS FINAL:
Implementación y documentación de P6.2B.1 presentes sin commit. Completar después de la validación manual.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_P6_2_B_1.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Transmitir el costo final canónico a la presentación y configurar secuencias y perfiles conectados por familiaObjeto.

ARQUITECTURA HEREDADA:
SistemaTiempo es la única fuente del costo final. CoordinadorTiempoPartida lo asocia con eventos del actor. PlanificadorRitmoVisual convierte una vez ese costo y distribuye fases configuradas. PerfilesAtaquePorFamilia.json decide forma y futuro sonido, nunca velocidad jugable.

ARCHIVOS CLAVE:
- src/juego/tiempo/CoordinadorTiempoPartida.js: une acción, evento y ejecución temporal.
- src/juego/acciones/EventosAccion.js: conserva costo final y familia por fuente.
- src/interfaz/graficos/PlanificadorRitmoVisual.js: única conversión de presentación.
- src/config/presentacion/PerfilesAtaquePorFamilia.json: secuencias y perfiles canónicos.
- src/interfaz/graficos/ValidadorPerfilesAtaquePorFamilia.js: conexión estricta con Armas.json.

DEPENDENCIAS Y VERSIONES:
Phaser 4.2.1 exacta. Ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- configuración y ocho familias validadas;
- costo final asociado con eventos;
- secuencias simple, dual, estocada y proyectil;
- suma exacta de fases;
- error por familia faltante;
- sintaxis, JSON e imports.

PROBLEMAS O RIESGOS PENDIENTES:
- prueba manual interactiva;
- afinación visual de proporciones durante P6.2B.2;
- animaciones definitivas todavía no consumen las fases;
- sonidos todavía no incorporados.

DECISIONES APROBADAS:
- costoFinal es la única velocidad autoritativa para presentación;
- no existen ecuaciones dobles;
- familiaObjeto decide forma y futuro sonido;
- perfiles y secuencias se alojan en un JSON canónico;
- jugador y enemigos comparten las mismas reglas;
- P6.2B se divide en P6.2B.1 y P6.2B.2.

DECISIONES QUE SIGUEN ABIERTAS:
- ajuste final de duración y proporciones después de ver las animaciones completas.

SIGUIENTE ETAPA RECOMENDADA:
P6.2B.2 — Animaciones cuerpo a cuerpo por familia

OBJETIVO DE LA SIGUIENTE ETAPA:
Reemplazar el pulso provisional por preparación, corte, golpe, estocada y retorno usando los perfiles y el ritmo canónico ya preparados.

PRIMEROS ARCHIVOS A REVISAR:
- src/config/presentacion/PerfilesAtaquePorFamilia.json
- src/interfaz/graficos/PlanificadorRitmoVisual.js
- src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js
- src/interfaz/graficos/phaser/CreadorEfectosCombatePhaser.js
- src/interfaz/graficos/phaser/ConfiguracionEfectosCombatePhaser.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- SistemaTiempo y su fórmula canónica;
- SistemaCombate;
- ConfiguracionAtaque y fórmula dual;
- Armas.json;
- persistencia;
- Phaser 4.2.1;
- proyectiles, reservados para P6.2C.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Daga, espada, hacha, mandoble, bastón, lanza y ataque natural muestran su perfil correcto; doble arma conserva orden y ritmo final; jugador y enemigos comparten el sistema; todas las entidades retornan a su posición visual exacta.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(phaser): conectar ritmo visual con el tiempo canónico

- conservar el costo final realmente registrado para acciones del jugador y enemigos;
- asociar la ejecución temporal con los eventos pertenecientes al mismo actor;
- copiar familiaObjeto y ataque natural dentro de las fuentes visuales;
- incorporar un único planificador de duración basado en costoFinal;
- distribuir la duración mediante secuencias configurables sin ecuaciones duplicadas;
- agregar perfiles canónicos de animación y sonido futuro por familia de arma;
- validar perfiles contra todas las familias presentes en Armas.json;
- preparar secuencias simples, duales, de estocada y proyectil;
- conservar combate, tiempo, persistencia, Canvas 2D y Phaser 4.2.1;
- cerrar documentalmente P6.2A y documentar P6.2B.1.

----------------- FIN DEL ENLACE -----------------
