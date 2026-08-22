# Entrega — Daño y efectos: escalado global y potencia específica

## Estado

- **Etapa:** Daño y efectos — escalado global y potencia específica.
- **Estado final:** **Cerrada**.
- **Fecha de cierre:** 22/08/2026.
- **Rama:** `main`.
- **Commit base / HEAD verificado:** `449eb095aeebbee647542e6269e91bf289368bc4`.
- **Incremental funcional aprobado:** `Dark-Moon-Incremental-Funcional-Danio-Efectos.zip`.
- **Corrección funcional aplicada sobre ese incremental:** `Dark-Moon-Incremental-Correccion-Desglose-Atributos.zip`.
- **Validación manual:** el usuario confirmó el 22/08/2026: **“Pruebas superadas.”**
- No se realizó commit ni push.
- No se instalaron dependencias.

La copia de trabajo heredada del ZIP base presenta ruido de finales de línea. El cierre documental toma como estado funcional válido exactamente los dos incrementales anteriores, que contienen 33 rutas productivas únicas: 31 reemplazos y 2 archivos nuevos; la corrección posterior vuelve a reemplazar uno de esos 31 archivos y no amplía el alcance.

## Objetivo completado

Separar de forma explícita y genérica los ejes de **daño directo** y **potencia de efectos**, eliminando la ambigüedad de la antigua `Potencia de Habilidad` y permitiendo modificadores globales del portador sin crear reglas por arma, maestría, habilidad o nombre visible.

El estado final distingue:

- `Daño Físico`: componente físico de armas;
- `Daño Mágico`: daño mágico directo;
- `Daño de Habilidad`: daño directo generado por habilidades;
- `Daño de Fuego/Frío/Rayo/Veneno`: afinidad del componente directo;
- `Potencia de Efectos`: escalado general de efectos;
- `Potencia de Quemadura/Envenenamiento/Ralentización/Electrización`: escalado específico del efecto.

## Arquitectura final

### 1. Daño Físico global

`danoFisico` es un objetivo global del portador resuelto por `SistemaModificadoresCombatiente`.

No pregunta si un arma es de Fuerza, Destreza o Sabiduría. Se aplica únicamente cuando el componente físico procede de un arma:

```text
arma
→ componente físico propio
→ modificaciones locales del objeto
→ Daño Físico global del portador
→ componente físico resultante
```

En duales, ambas armas consultan el mismo estado global. Un afijo `Marcial` equipado en una sola pieza puede beneficiar a las dos armas sin una condición especial por mano. Un ataque natural no obtiene esta bonificación por el solo hecho de que exista un arma equipada.

### 2. Daño Mágico y daño por tipo

`danoMagico` se resuelve globalmente y parte del aporte derivado de Inteligencia/Sabiduría. Los modificadores del portador se acumulan sobre esa misma resolución.

Los componentes directos de Fuego, Frío, Rayo y Veneno usan además el objetivo genérico `danoTipo`, condicionado por `tipoDanio`.

Ejemplo de una espada con daño de Fuego:

```text
componente físico
→ Daño Físico

componente Fuego
→ Daño Mágico
→ Daño de Fuego
```

La existencia del componente mágico no convierte la parte física del arma en daño mágico.

### 3. Daño de Habilidad una sola vez

La estadística antes mostrada como `Potencia de Habilidad` se normaliza como **Daño de Habilidad** y utiliza la clave canónica `danoHabilidad`.

Su contrato vigente es:

- afecta daño directo de habilidades mágicas y físicas/de arma;
- no afecta ataques básicos;
- no afecta efectos temporales;
- se aplica exactamente una vez como capa exterior de la acción.

Para una habilidad de arma:

```text
arma / componentes
→ escalados físicos o mágicos propios
→ factorDanioArma de la habilidad
→ Daño de Habilidad UNA VEZ
→ combate canónico
```

De este modo no puede entrar dentro del arma y volver a multiplicar el resultado en `MotorAtaqueArmaHabilidad`.

### 4. Habilidad mágica directa

Una habilidad mágica elemental puede acumular ejes independientes cuando todos corresponden al mismo componente:

```text
Daño Mágico
× Daño de Habilidad
× Daño del tipo elemental
```

No se crea una fórmula particular para Ascua, Fuego, Arco u otra maestría. `ResolutorEscaladoDanio.js` traduce el contexto del componente a consultas del centralizador común.

### 5. Efectos independientes del daño directo

Los efectos no heredan modificadores del ataque o habilidad que los originó.

No reciben:

- Daño Físico;
- Daño Mágico;
- Daño de Habilidad;
- Daño de Fuego/Frío/Rayo/Veneno.

Su escalado es propio:

```text
magnitud base del efecto
× Potencia de Efectos
× Potencia específica del efecto
```

Contenido escalable inicial:

| Efecto | Escalado |
|---|---|
| Quemadura | daño periódico |
| Envenenamiento | daño periódico |
| Ralentización | intensidad |
| Electrización | intensidad |
| Congelamiento | ninguno por potencia |
| Aturdimiento | ninguno por potencia |

`ResolutorPotenciaEfectos.js` utiliza un único objetivo `potenciaEfecto` y `efectoId`; no existen motores separados por efecto.

### 6. Resistencias de daño frente a resistencias de efectos

El cierre conserva separados ambos dominios.

Que un efecto tenga una identidad temática no hace que su resistencia se deduzca de una resistencia elemental de daño. La aplicación/defensa de Quemadura, Envenenamiento, Congelamiento, Aturdimiento u otros efectos continúa usando sus contratos específicos existentes.

La potencia ofensiva de un efecto tampoco modifica esas resistencias.

## Afinidades mágicas

Las pasivas dejan de expresarse como `danoHabilidad` filtrado por `maestriaHabilidad`:

| Pasiva | Contrato actual |
|---|---|
| Afinidad ígnea | `Daño de Fuego +10%` |
| Afinidad glacial | `Daño de Frío +10%` |
| Afinidad tormentosa | `Daño de Rayo +10%` |
| Afinidad tóxica | `Daño de Veneno +10%` |

El beneficio sigue al tipo real de daño y no al nombre/maestría de la habilidad.

## Afijos incorporados/adaptados

Todos usan el contrato existente de afijo del `portador`.

| Prefijo | Efecto | Rareza actual | Aplicación |
|---|---|---|---|
| Enfocado | Daño de Habilidad | Mágico/Raro | armas, sin restricción de familia |
| Marcial | Daño Físico | Raro | armas; excluye varita |
| Místico | Daño Mágico | Raro | armas |
| Ígneo | Daño de Fuego | Mágico/Raro | armas y accesorios |
| Gélido | Daño de Frío | Mágico/Raro | armas y accesorios |
| Fulgurante | Daño de Rayo | Mágico/Raro | armas y accesorios |
| Tóxico | Daño de Veneno | Mágico/Raro | armas y accesorios |
| Catalítico | Potencia de Efectos | Raro | armas y accesorios |
| Incandescente | Potencia de Quemadura | Mágico/Raro | armas y accesorios |
| Virulento | Potencia de Envenenamiento | Mágico/Raro | armas y accesorios |
| Entorpecedor | Potencia de Ralentización | Mágico/Raro | armas y accesorios |
| Sobrecargado | Potencia de Electrización | Mágico/Raro | armas y accesorios |

Rangos implementados:

- Daño de Habilidad (`Enfocado`): 4–6 / 7–10 / 11–15;
- Daño Físico y Daño Mágico: 4–6 / 7–9 / 10–12;
- Daño por afinidad: 5–8 / 9–12 / 13–16;
- Potencia de Efectos: 4–6 / 7–9 / 10–12;
- Potencias específicas: 6–10 / 11–15 / 16–20.

Estos números son contenido actual, no una certificación de balance definitivo.

## Panel Personaje y nombres

El panel queda organizado en grupos separados:

```text
DAÑO
- Daño Físico
- Daño Mágico
- Daño de Habilidad

AFINIDADES DE DAÑO
- Fuego
- Frío
- Rayo
- Veneno

POTENCIA DE EFECTOS
- General
- Quemadura
- Envenenamiento
- Ralentización
- Electrización
```

Las descripciones hacen explícitas las acumulaciones:

- Daño Mágico puede acumularse con el daño elemental específico;
- Potencia de Efectos puede acumularse con la potencia específica;
- Daño de Habilidad se aplica una vez y no afecta efectos;
- Daño Físico afecta el componente físico de todas las armas equipadas.

### Corrección posterior a la primera prueba manual

Durante la validación del primer incremental se detectó:

1. `DanioMagico` aparecía como texto técnico pegado en los aportes de Inteligencia y Sabiduría;
2. el modal de Daño Mágico no mostraba el desglose completo de esos atributos.

Causa: los aportes de atributos utilizaban `danioMagico`, mientras el contrato vigente y el panel consumían `danoMagico`.

La corrección normaliza la clave en `EstadisticasDerivadas.js`. También se verificó la correspondencia de aportes del resto de atributos con las claves visibles del panel. El usuario aplicó la corrección y posteriormente confirmó que las pruebas fueron superadas.

## Archivos funcionales del estado aprobado

### Reemplazados

1. `src/config/habilidades/Habilidades.json`
2. `src/config/idiomas/en.json`
3. `src/config/idiomas/es.json`
4. `src/config/magia/Efectos.json`
5. `src/config/objetos/Armas.json`
6. `src/config/objetos/afijos/Prefijos.json`
7. `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`
8. `src/herramientas/balance/AnalizadorBalanceCombate.js`
9. `src/herramientas/balance/AnalizadorBalanceJuego.js`
10. `src/herramientas/balance/AnalizadorBalanceRegresion.js`
11. `src/herramientas/balance/BalanceAplicacion.js`
12. `src/herramientas/balance/ObjetivosBalance.json`
13. `src/herramientas/depuracion/DepuradorMagiaHabilidades.js`
14. `src/interfaz/PanelPersonaje.js`
15. `src/interfaz/habilidades/OrganizadorArbolHabilidades.js`
16. `src/interfaz/habilidades/PanelHabilidadesMaestrias.js`
17. `src/interfaz/objetos/ComparadorObjetos.js`
18. `src/interfaz/objetos/PresentadorObjeto.js`
19. `src/juego/combate/ComponentesDanio.js`
20. `src/juego/combate/SistemaCombate.js`
21. `src/juego/habilidades/ConfiguracionHabilidadEfectiva.js`
22. `src/juego/habilidades/MotorAtaqueArmaHabilidad.js`
23. `src/juego/habilidades/MotorDanioHabilidad.js`
24. `src/juego/habilidades/MotorEfectosHabilidad.js`
25. `src/juego/habilidades/SistemaHabilidadesJugador.js`
26. `src/juego/magia/SistemaCatalizadores.js`
27. `src/juego/mensajes/MensajesCalculoCombate.js`
28. `src/juego/modificadores/ContratosModificadoresCombatiente.js`
29. `src/juego/objetos/ValidadorConfiguracionGeneracionObjetos.js`
30. `src/juego/zonas/AplicadorContenidoZonaTemporal.js`
31. `src/juego/zonas/SistemaZonasTemporales.js`

`EstadisticasDerivadas.js` fue reemplazado nuevamente por el incremental correctivo; sigue siendo una única ruta funcional en el estado final.

### Agregados

1. `src/juego/combate/ResolutorEscaladoDanio.js`
2. `src/juego/efectos/ResolutorPotenciaEfectos.js`

### Eliminados

Ninguno.

## Documentación actualizada en FASE B

1. `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
2. `docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md`
3. `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
4. `docs/habilidades/entregas/ENTREGA_DANIO_Y_EFECTOS.md` — nuevo.

El maestro de combate también corrige la contradicción documental heredada: el HEAD base ya contiene CD2, por lo que CD2 deja de figurar como “siguiente bloque”.

## Validaciones técnicas del incremental funcional

Antes de entregar FASE A se habían validado sintaxis JavaScript, parseo de JSON y configuración de afijos. Después se ejecutaron las siete pruebas deterministas pendientes acordadas:

| Prueba | Resultado |
|---|---|
| Duales + Daño Físico global | Correcto: ambas armas reciben una sola resolución `×1,10` |
| Ataque natural | Correcto: permanece `×1,00` pese a existir Daño Físico global de arma |
| Espada con Fuego | Correcto: físico `×1,10`; Fuego `×1,56 = 1,20 × 1,30`, sin cruce |
| Habilidad de arma | Correcto: `80 → 88` con +10%; no aparece `×1,21` |
| Habilidad mágica | Correcto: `1,20 × 1,30 × 1,10 = ×1,716`; base 100 → 172 por redondeo canónico |
| Quemadura | Correcto: `10 × 1,20 × 1,30 = 15,6`; ignora ejes de daño directo |
| Ralentización / Electrización | Correcto: Ralentización `1,40 → 1,600`; Electrización `1,08 → 1,144` en el escenario de prueba |

Estas comprobaciones fueron ejecutadas por el asistente antes de materializar el incremental funcional. No se repitieron en FASE B porque no se modificó código.

## Pruebas manuales validadas por el usuario

El usuario aplicó el incremental funcional y su corrección, revisó el comportamiento dentro del juego y confirmó el 22/08/2026: **“Pruebas superadas.”**

Por tanto quedan registradas como validadas por el usuario las pruebas manuales solicitadas para:

- Daño Físico global y equipamiento;
- separación de componentes físicos/elementales;
- ataque básico frente a habilidad y Daño de Habilidad;
- habilidades mágicas con Daño Mágico + afinidad + Daño de Habilidad;
- efectos separados del daño directo;
- Ralentización/Electrización y potencias específicas;
- Panel Personaje, nombres y desgloses tras la corrección `danoMagico`.

## Dependencias

Ninguna nueva.

No se modifican Phaser, Electron, Node.js ni los mecanismos de empaquetado como parte del cierre.

## Persistencia

Por decisión explícita de esta etapa se asume que **no existen partidas guardadas que deban conservar retrocompatibilidad**.

Por tanto:

- no se agregan migraciones;
- no se agregan traductores ni aliases de save;
- no se crean patches de compatibilidad;
- los resultados derivados continúan reconstruyéndose desde sus fuentes canónicas.

## Compatibilidad web y Electron

La lógica permanece en módulos JavaScript ya consumidos por la versión web y por Chromium/Electron. No se introduce una dependencia de Node para gameplay ni se modifica la separación Phaser/HTML/dominio.

## Riesgos y pendientes

No quedan fallos funcionales conocidos después de la validación manual del usuario.

Pendientes fuera del alcance de este cierre:

- balance fino de los nuevos porcentajes y pesos de afijos globales/específicos;
- comprobar en una etapa de balance combinaciones extremas de Daño Mágico × Daño de Habilidad × afinidad × crítico × resistencias negativas;
- decidir en el futuro si Congelamiento, Aturdimiento u otros efectos deben recibir potencia específica;
- mantener la revisión semántica del diff al realizar el commit debido al ruido CRLF del ZIP base.

## Comprobación de restricciones

- un único `SistemaModificadoresCombatiente`: cumplido;
- sin motores por elemento o por efecto: cumplido;
- Daño Físico global sin condiciones especiales por mano/atributo: cumplido;
- Daño de Habilidad aplicado una sola vez: cumplido;
- efectos separados de modificadores de daño directo: cumplido;
- UI consume desgloses canónicos: cumplido;
- sin nombres visibles como regla de gameplay: cumplido;
- sin dependencias nuevas: cumplido;
- sin migraciones/patches de persistencia: cumplido;
- sin commit ni push: cumplido.

## Conventional Commit propuesto

```text
feat(combate): generalizar escalado de daño y potencia de efectos

- incorporar Daño Físico, Daño Mágico, Daño de Habilidad y daño global por tipo mediante el resolutor canónico de modificadores;
- aplicar Daño de Habilidad una sola vez a habilidades y escalar componentes elementales de armas sin mezclar su parte física;
- separar los efectos del daño directo y agregar Potencia de Quemadura, Envenenamiento, Ralentización y Electrización;
- actualizar Afinidades, afijos globales, herramientas, objetos y Panel Personaje con nombres y desgloses canónicos;
- corregir los aportes de Inteligencia/Sabiduría a Daño Mágico y registrar las pruebas técnicas y manuales satisfactorias;
- actualizar los documentos maestros y cerrar la etapa.
```

No se realizó el commit.

## ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Sistema de habilidades/modificadores y combate de Dark Moon

ETAPA CERRADA:
Daño y efectos — escalado global y potencia específica

ESTADO:
Cerrada

COMMIT BASE:
449eb095aeebbee647542e6269e91bf289368bc4

HEAD FINAL VERIFICADO:
449eb095aeebbee647542e6269e91bf289368bc4

GIT STATUS FINAL:
La copia de trabajo heredada mantiene ruido masivo de finales de línea del ZIP base. El cierre no usa ese ruido como alcance: el estado funcional aprobado está materializado en `Dark-Moon-Incremental-Funcional-Danio-Efectos.zip` más `Dark-Moon-Incremental-Correccion-Desglose-Atributos.zip`, con 33 rutas funcionales únicas (31 reemplazos + 2 agregados), y el incremental documental de cierre contiene exclusivamente 4 rutas bajo `docs/`. No hay eliminaciones funcionales ni archivos temporales incluidos en las entregas.

DOCUMENTO DE ENTREGA:
docs/habilidades/entregas/ENTREGA_DANIO_Y_EFECTOS.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Separar y generalizar el escalado de daño directo y de efectos: Daño Físico global de armas, Daño Mágico, Daño de Habilidad una sola vez, daño por afinidad y potencia general/específica de efectos, todos mediante contratos canónicos y con desgloses visibles.

ARQUITECTURA HEREDADA:
`SistemaModificadoresCombatiente` sigue siendo el único resolutor. `ResolutorEscaladoDanio` traduce componentes a Daño Físico/Mágico/tipo sin crear un motor paralelo. Daño de Habilidad se aplica como capa exterior una sola vez. Los efectos no heredan ejes de daño directo y usan Potencia de Efectos + `potenciaEfecto` condicionada por `efectoId`. Afijos de portador son globales aunque su fuente sea una pieza concreta. UI consume resoluciones y desgloses canónicos.

ARCHIVOS CLAVE:
- src/juego/combate/ResolutorEscaladoDanio.js: resolución común de Daño Físico, Mágico, Habilidad y tipo.
- src/juego/efectos/ResolutorPotenciaEfectos.js: potencia específica genérica por efecto.
- src/juego/habilidades/MotorAtaqueArmaHabilidad.js: garantiza la capa única de Daño de Habilidad en habilidades de arma.
- src/juego/habilidades/MotorEfectosHabilidad.js: combina potencia general/específica sin heredar daño directo.
- src/juego/modificadores/ContratosModificadoresCombatiente.js: registro canónico de objetivos y condiciones.
- src/interfaz/PanelPersonaje.js: presentación y desglose de los nuevos ejes.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser/Electron existentes permanecen sin cambios por esta etapa.

PRUEBAS CLAVE SUPERADAS:
- duales reciben Daño Físico global una sola vez y ataque natural permanece neutro;
- componentes físicos y elementales se escalan por sus ejes correctos;
- Daño de Habilidad entra exactamente una vez en habilidades de arma y se acumula correctamente en habilidades mágicas;
- Quemadura/Envenenamiento y Ralentización/Electrización usan potencia de efectos sin heredar daño directo;
- el usuario aplicó ambos incrementales funcionales y confirmó que las pruebas manuales fueron superadas.

PROBLEMAS O RIESGOS PENDIENTES:
- balance fino de porcentajes, pesos y rarezas de los nuevos afijos;
- combinaciones multiplicativas extremas deben medirse en una etapa de balance;
- el ZIP base conserva ruido CRLF y el commit debe limitarse al diff semántico de los incrementales.

DECISIONES APROBADAS:
- Daño Físico es global del portador pero solo potencia el componente físico de armas, incluidas ambas manos duales;
- Daño Mágico conserva su nombre y potencia componentes mágicos directos, incluido daño elemental agregado a armas;
- Daño de Habilidad afecta daño directo de todas las habilidades una sola vez y no afecta efectos;
- Fuego/Frío/Rayo/Veneno poseen modificadores globales propios acumulables con Daño Mágico;
- los efectos forman un dominio independiente y usan Potencia de Efectos más potencia específica por efecto;
- Quemadura, Envenenamiento, Ralentización y Electrización escalan; Congelamiento y Aturdimiento no por ahora;
- no se crean migraciones ni traductores para partidas guardadas antiguas;
- Panel Personaje debe explicar explícitamente las acumulaciones entre modificadores generales y específicos.

DECISIONES QUE SIGUEN ABIERTAS:
- balance definitivo de afijos y combinaciones extremas;
- eventual potencia específica de otros efectos.

SIGUIENTE ETAPA RECOMENDADA:
Balance de escalados globales de daño y efectos

OBJETIVO DE LA SIGUIENTE ETAPA:
Medir en combate real el impacto de Daño Físico, Daño Mágico, Daño de Habilidad, afinidades y potencias de efecto para ajustar porcentajes, pesos y rarezas sin alterar los contratos canónicos cerrados.

PRIMEROS ARCHIVOS A REVISAR:
- src/config/objetos/afijos/Prefijos.json
- src/config/objetos/Armas.json
- src/config/habilidades/Habilidades.json
- src/herramientas/balance/ObjetivosBalance.json

NO MODIFICAR SIN NUEVA APROBACIÓN:
- separación entre daño directo y efectos;
- Daño de Habilidad como capa exterior aplicada una sola vez;
- Daño Físico global limitado al componente físico de armas;
- resolución genérica `danoTipo`/`potenciaEfecto` sin motores por elemento o efecto;
- ausencia de migraciones retrocompatibles de guardado para esta etapa.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Los rangos y rarezas deben quedar respaldados por comparaciones reproducibles de builds físicas, mágicas, híbridas y de efectos, sin cambiar la arquitectura canónica ni ocultar combinaciones mediante excepciones por contenido.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(combate): generalizar escalado de daño y potencia de efectos

- incorporar Daño Físico, Daño Mágico, Daño de Habilidad y daño global por tipo mediante el resolutor canónico de modificadores;
- aplicar Daño de Habilidad una sola vez a habilidades y escalar componentes elementales de armas sin mezclar su parte física;
- separar los efectos del daño directo y agregar Potencia de Quemadura, Envenenamiento, Ralentización y Electrización;
- actualizar Afinidades, afijos globales, herramientas, objetos y Panel Personaje con nombres y desgloses canónicos;
- corregir los aportes de Inteligencia/Sabiduría a Daño Mágico y registrar las pruebas técnicas y manuales satisfactorias;
- actualizar los documentos maestros y cerrar la etapa.

----------------- FIN DEL ENLACE -----------------
