# PLAN MAESTRO — BOTÍN CANÓNICO DE DARK MOON

**Estado general:** En ejecución; B-AUD implementada técnicamente y pendiente de validación manual.
**Última etapa cerrada:** B3 — Suerte, joyería y Tier III.
**Etapa actual:** B-AUD — Auditoría post-hito de botín, objetos y recompensas.
**Siguiente etapa recomendada tras B-AUD:** no existe una B4 definida en este Plan Maestro. Cualquier continuación requiere definición y aprobación explícitas de una nueva etapa.
**Base inicial del plan:** `b5b8b69df1e7faa3a3e0fd7475dc50f0019f95a0`.  
**Rama:** `main`.  
**Regla de persistencia del plan:** se asume que no existen partidas guardadas previas que deban conservarse. No se crearán migradores, aliases, wrappers ni parches de compatibilidad.

---

## 1. Objetivo

Generalizar el sistema de botín para que enemigos, cofres, recipientes, destructibles y futuras fuentes de recompensa utilicen un único motor canónico.

El sistema debe poder decidir:

- si existe recompensa;
- cuánto se intenta generar;
- qué familia de objetos puede participar;
- qué objetos concretos son válidos por contexto;
- qué drops siguen ligados deliberadamente a una fuente;
- qué objetos deben aparecer siempre;
- nivel, rareza y afijos mediante los generadores canónicos ya existentes.

El objetivo no es reescribir inventario, objetos, mazmorras ni Phaser.

---

## 2. Principios de arquitectura

Se conserva:

- un solo `SistemaBotin`;
- un único catálogo combinado de objetos en memoria;
- una sola generación de nivel de objeto;
- una sola generación de rareza;
- un solo sistema de afijos;
- una sola materialización de `BotinSuelo`;
- datos configurables en JSON;
- ausencia de condiciones por nombre visible;
- ausencia de motores por enemigo, cofre o destructible.

Flujo esperado:

```text
Fuente
  ↓
Solicitud canónica de botín
  ↓
SistemaBotin
  ↓
Resultado canónico
  ↓
BotinSuelo / contenedor / consumidor correspondiente
```

Phaser y la interfaz solamente representan el resultado.

---

## 3. Estado heredado al comenzar el plan

Antes de B1 ya existe:

- `src/juego/botin/SistemaBotin.js`;
- `src/juego/botin/ContextoGeneracionBotin.js`;
- generación canónica de nivel, rareza y afijos;
- `depositarObjetosEnSuelo()` para liberar instancias ya existentes sin volver a generar sus propiedades;
- tablas `tablaBotin` en enemigos, cofres, recipientes y destructibles;
- un catálogo combinado de Armas, Armaduras, Consumibles, Municiones, Contenedores y Materiales.

La deuda principal es que muchas fuentes deciden el botín general mediante IDs concretos.

Ejemplo actual:

```text
Fuente
  ↓
tablaBotin con idObjeto
  ↓
SistemaBotin
```

B1 no elimina todavía `tablaBotin`. La migración completa pertenece a B2 para evitar dejar fuentes parcialmente convertidas.

---

## 4. Terminología canónica

### 4.1. Perfil de recompensa

Responde principalmente:

> ¿Cuánto y con qué distribución general corresponde recompensar?

Perfiles iniciales:

- `enemigo_comun`;
- `enemigo_especial`;
- `jefe`;
- `recompensa_menor`;
- `recompensa_estandar`;
- `recompensa_mayor`.

Los perfiles no nombran cofres, bancos, cajas, biomas ni entidades concretas.

### 4.2. Marco de selección

Responde:

> ¿Qué familia de objetos puede seleccionarse?

Marcos canónicos aprobados:

1. `equipamiento`;
2. `comunes`;
3. `materiales`;
4. `desechables`.

### 4.3. Contexto

Responde:

> Dentro de lo permitido, ¿qué candidatos son válidos en esta situación?

Puede incluir, según la fuente y etapa:

- nivel;
- mapa/mazmorra;
- evento (`apertura`, `destruccion`, `derrota`, misión, etc.);
- familia de entidad;
- variante;
- materiales de la fuente;
- etiquetas;
- IDs permitidos/prohibidos;
- afinidades;
- tiers;
- otros filtros declarativos futuros.

### 4.4. Botín específico

Es un objeto deliberadamente ligado a una fuente y conserva una probabilidad propia.

Ejemplos:

- Rata → Cola de rata;
- Cucaracha → Caparazón de cucaracha;
- Esqueleto → resto óseo característico.

La existencia de un drop específico no impide además la recompensa genérica.

### 4.5. Botín garantizado

Es un objeto exacto que debe existir.

Casos:

- objeto de quest;
- llave;
- recompensa diseñada;
- material obligatorio;
- cualquier objeto que la configuración establezca como incondicional.

No consume una tirada de aparición. La creación de una instancia equipable puede continuar consumiendo la secuencia canónica de nivel/rareza/afijos cuando corresponda.

---

## 5. Los cuatro marcos

### 5.1. Equipamiento

Incluye tipos:

- `arma`;
- `armadura`;
- `quiver`;
- futuro `accesorio`.

`Contenedores.json` contiene actualmente el quiver equipable; un cofre del escenario no pertenece a este marco porque es una fuente, no un objeto candidato.

### 5.2. Comunes

Incluye:

- `consumible`;
- `municion`.

### 5.3. Materiales

Se reserva para recursos útiles presentes o futuros.

Conjunto inicial aprobado para B2:

- Madera;
- Tela;
- Metal;
- Piedra.

Podrán aparecer otros materiales sólo cuando exista una necesidad semántica real.

### 5.4. Desechables

Nuevo marco aprobado.

Representa objetos obtenibles y vendibles sin utilidad funcional directa actual.

El plan prevé mover desde `Materiales.json` a un nuevo `Desechables.json`, entre otros:

- Cola de rata;
- Caparazón de cucaracha;
- Hueso de esqueleto;
- Carne putrefacta;
- Hueso negro.

La migración pertenece a B2.

---

## 6. Relación Perfil + Marcos + Contexto

El perfil posee pesos generales para los cuatro marcos.

La fuente limita qué marcos puede utilizar.

El contexto puede agregar o excluir marcos y filtrar candidatos.

Los pesos de los marcos restantes se normalizan automáticamente.

```text
PERFIL
  │
  ├── peso Equipamiento
  ├── peso Comunes
  ├── peso Materiales
  └── peso Desechables
          │
          ▼
MARCOS PERMITIDOS POR LA FUENTE
          │
          ▼
+ marcos adicionales del contexto
- marcos excluidos del contexto
          │
          ▼
MARCOS EFECTIVOS
          │
          ▼
NORMALIZACIÓN DE PESOS
          │
          ▼
SELECCIÓN PONDERADA
          │
          ▼
FILTROS DEL CONTEXTO
          │
          ▼
OBJETO CANDIDATO
```

La fuente no necesita repetir porcentajes que pertenecen al perfil.

---

## 7. Variantes de enemigos

Decisión F aprobada.

Las variantes participan mediante contexto y configuración declarativa.

Reglas:

- `idVariante` forma parte del contexto disponible;
- una variante puede agregar o excluir marcos;
- `elite` agregará `equipamiento` durante B2;
- esto habilita la posibilidad de Equipamiento, no garantiza un objeto;
- los pesos continúan perteneciendo al perfil;
- no se crea `enemigo_elite` como perfil;
- no habrá `if (elite)` dentro de `SistemaBotin`;
- Enfermo y Gigante no modifican inicialmente el botín;
- el contrato queda preparado para que cualquier variante pueda hacerlo en el futuro.

Ejemplo conceptual:

```text
Rata normal
  perfil: enemigo_comun
  marcos base: comunes

Rata elite
  perfil: enemigo_comun
  marcos base: comunes
  variante elite: + equipamiento

Marcos efectivos:
  comunes + equipamiento
```

La Cola de rata específica continúa funcionando en ambos casos.

---

## 8. Ejemplos de fuentes

### 8.1. Rata

```text
Perfil:
  enemigo_comun

Marcos base:
  comunes

Específico:
  cola_rata, probabilidad actual conservada inicialmente

Contexto:
  nivel
  familia
  variante
  mazmorra
```

Una futura Rata Élite agrega `equipamiento` mediante su variante.

### 8.2. Cofre

```text
Perfil:
  recompensa_mayor

Marcos:
  equipamiento
  comunes
  materiales

Contexto:
  apertura
  nivel
  mazmorra
```

Un objeto de quest puede sumarse como garantizado.

### 8.3. Silla de madera

```text
Perfil:
  recompensa_menor

Marco:
  materiales

Contexto:
  evento: destruccion
  material: madera
```

Nunca es candidata a entregar una espada o una poción porque esos objetos pertenecen a otros marcos.

---

## 9. Recipientes: abrir frente a destruir

Decisión aprobada para B2.

Un recipiente conserva dos responsabilidades diferentes:

### Abrir

- entrega el contenido que ya posee;
- no entrega materiales estructurales;
- no vuelve a generar contenido si fue abierto parcialmente.

### Destruir

- toma únicamente el contenido que todavía existe;
- aplica inicialmente **80 % de supervivencia por objeto/pila restante**;
- el 20 % perdido representa la destrucción del contenido al romper el recipiente;
- después genera materiales estructurales mediante el marco `materiales`;
- suma garantizados si corresponden;
- nunca vuelve a generar el contenido original.

`depositarObjetosEnSuelo()` continúa siendo la ruta canónica para las instancias sobrevivientes.

El 80 % será configuración y podrá balancearse sin cambiar el motor.

---

## 10. Materiales estructurales aprobados para B2

Conjunto inicial:

```text
Madera
Tela
Metal
Piedra
```

Ejemplos previstos:

- banco → Madera;
- cama → Madera + Tela;
- mesa → Madera y, cuando corresponda, Tela;
- reja → Metal;
- lápida → Piedra;
- sarcófago → Piedra + posible Tela.

La entidad declara contexto/materiales compatibles; no codifica una lista de armas o armaduras.

---

## 11. Catálogos y metadatos de selección

La selección genérica utiliza el catálogo único que ya carga Dark Moon.

B1 define además metadatos opcionales de plantilla:

```text
generacionBotin.peso
generacionBotin.cantidadMinima
generacionBotin.cantidadMaxima
etiquetasBotin
```

Reglas iniciales:

- `peso` ausente → 1;
- cantidad ausente → 1;
- `etiquetasBotin` ausente → lista vacía;
- claves/configuraciones inválidas deben fallar explícitamente cuando sean consumidas.

B2 agregará metadatos solamente donde sean necesarios.

---

## 12. Aleatoriedad reproducible

B1 separa las secuencias de botín de la generación procedural general.

Secuencias canónicas del nuevo contrato:

```text
:especificos-botin
  → probabilidad/cantidad de drops específicos

:seleccion-botin
  → cantidad de tiradas genéricas
  → éxito de tiradas genéricas
  → marco
  → plantilla
  → cantidad genérica

:objetos
  → nivel
  → rareza
  → afijos
  → grados
  → valores
```

Así, agregar un afijo no cambia qué objeto fue seleccionado para una misma semilla, y agregar un drop específico no desplaza la secuencia genérica.

---

## 13. Suerte — diseño consolidado en B3

Carisma queda reemplazado canónicamente por **Suerte**. No existe compatibilidad transitoria ni alias porque el plan asume cero partidas guardadas anteriores.

Los seis atributos canónicos pasan a ser:

- Fuerza;
- Destreza;
- Constitución;
- Inteligencia;
- Sabiduría;
- Suerte.

Los enemigos reciben inicialmente `suerte: 10` como valor neutral. En B3 no existe todavía una utilidad de metajuego para Suerte enemiga.

La antigua contribución de Carisma a Potencia de Aura pasa a **Constitución**, manteniendo inicialmente el coeficiente heredado de 2. Esta decisión evita sobrecargar Sabiduría y permite que futuras construcciones de soporte compartan una base defensiva entre magos y guerreros. B3 no modifica todavía la magnitud funcional de las auras a partir de `potenciaAura`.

Suerte produce dos resultados derivados registrados en el resolutor canónico de modificadores:

### 13.1. Ajuste comercial

Regla definitiva de B3:

- referencia: Suerte 10;
- 2 % por punto respecto de la referencia;
- límite mínimo: -20 %;
- límite máximo: +20 %.

`EstadisticasDerivadas` calcula y resuelve `ajusteComercial`. Comercio consume ese resultado canónico y no contiene una segunda fórmula de Suerte.

### 13.2. Hallazgo mágico

`hallazgoMagico` aumenta únicamente el peso relativo de rarezas habilitadas superiores a Común.

Regla definitiva de B3:

- referencia: Suerte 10;
- +5 % de peso relativo por punto por encima de 10;
- mínimo: 0 %;
- límite final: +100 %.

Hallazgo mágico no aumenta:

- cantidad de objetos;
- probabilidad de que una fuente entregue algo;
- Tier;
- materiales;
- cantidad de cofres o recipientes;
- presupuesto procedural.

La rareza `Común` conserva su peso base. Cada rareza habilitada superior a Común multiplica su peso por `1 + hallazgoMagico / 100`. Una rareza forzada no se altera.

El presupuesto de población continúa consultando exclusivamente `SistemaBotin.calcularValorEsperadoSolicitudBotin()` y **no incorpora Hallazgo mágico**. De esta manera Suerte mejora la calidad real de una recompensa sin provocar que el planificador reduzca la recompensa estructural para compensarla.

### 13.3. Momento de evaluación de Hallazgo mágico

B3 corrige la asimetría heredada en recipientes. La recompensa se evalúa con el Hallazgo mágico actual **cuando se materializa realmente**:

- enemigos: al morir;
- cofres y recipientes: al abrirse por primera vez;
- cofre/recipiente todavía sin abrir: al destruirse.

Los cofres y recipientes guardan inicialmente su solicitud canónica de contenido y no los objetos ya tirados. `SistemaBotin` materializa esa solicitud exactamente una vez y la reemplaza por instancias reales. Abrir nuevamente nunca rerollea el contenido.

Si un recipiente se destruye sin abrir, primero se materializa una sola vez y después B2 aplica la supervivencia del 80 % por pila completa. Si ya estaba abierto, destruir procesa solamente las instancias que todavía quedan dentro.

Cambiar equipamiento de Fortuna inmediatamente antes de abrir una recompensa sigue siendo posible en B3. No se agrega una regla artificial de bloqueo de equipo o snapshot al entrar a la mazmorra.

---

## 14. Joyería — diseño consolidado en B3

Se incorpora:

`src/config/objetos/Accesorios.json`

Tipo canónico:

`accesorio`

Ranuras reutilizadas:

- collar;
- anillo derecho;
- anillo izquierdo.

### 14.1. Identidad elemental y bases

Por cada Tier existen cuatro anillos y cuatro collares:

- Rubí → resistencia a Fuego;
- Zafiro → resistencia a Frío;
- Topacio → resistencia a Rayo;
- Esmeralda → resistencia a Veneno.

Balance base aprobado:

- Tier I, nivel mínimo 1: 5 %;
- Tier II, nivel mínimo 5: 10 %;
- Tier III, nivel mínimo 8: 15 %.

Con tres Tiers se incorporan **24 bases de joyería**.

### 14.2. Prefijos

`Vigoroso` conserva su semántica y suma `accesorio` entre sus tipos permitidos.

`Arcano` queda disponible para generación en armadura, quiver y accesorio. Rangos de Maná máximo:

- grado I: +2 a +4;
- grado II: +5 a +8;
- grado III: +9 a +12.

### 14.3. Sufijos elementales y de efectos

Los sufijos elementales existentes pueden aparecer también en accesorios:

- `De ascuas`;
- `De escarcha`;
- `De tormenta`;
- `Del antídoto`.

Las resistencias de efectos quedan exclusivas de `accesorio`, corrigiendo el contrato previo que declaraba tipo armadura aunque sólo apuntaba a collar/anillos:

- `Del deshielo`;
- `De firmeza`;
- `De purificación`;
- `De ceniza`.

### 14.4. Resistencia Mental — De lucidez

`De lucidez` es exclusivo de joyería y modifica `resistenciaMental` mediante el resolutor global del portador:

- grado I: 3–6 %;
- grado II: 7–10 %;
- grado III: 11–15 %.

### 14.5. Hallazgo mágico — De fortuna

`De fortuna` es exclusivo de joyería y modifica `hallazgoMagico` mediante el mismo resolutor:

- grado I: +5 a +10 %;
- grado II: +11 a +20 %;
- grado III: +21 a +30 %.

No aumenta Suerte directamente y por lo tanto no modifica `ajusteComercial`.

### 14.6. Sufijo antiguo de Carisma

`Del soberano` se elimina de la configuración productiva al desaparecer Carisma.


---

## 15. Tier III — diseño consolidado en B3

El motor continúa aceptando cualquier Tier entero positivo. B3 no incorpora condiciones productivas del tipo `if (tier === 3)`.

Tier III se gobierna exclusivamente por los datos normales de cada base y `nivelMinimoGeneracion`.

Balance definitivo de B3:

- nivel mínimo de generación Tier III: **8**.

Se incorporan:

- 11 armas Tier III;
- 16 armaduras/escudo Tier III;
- 8 accesorios Tier III, ya contabilizados dentro de las 24 joyas.

Total de bases Tier III: **35**. Total de bases nuevas de objetos en B3: **51**.

La aparición desde nivel 8 permite que Tier III pueda comenzar en el tramo máximo de Fortaleza Abandonada y esté disponible durante Sala de Guerra, sin volverlo exclusivo de niveles 9–10.

---

## 16. Dirección visual consolidada en B3

B3 incorpora 51 iconos nuevos en `assets/imagenes/objetos/`.

Contrato visual aplicado:

- PNG;
- 64 × 64;
- fondo transparente;
- un objeto principal por icono;
- sin texto ni marco de rareza incorporado;
- lectura coherente con los objetos existentes;
- joyas diferenciables por gema/afinidad;
- Tier III con evolución visible de su familia sin romper la silueta funcional.

El detalle de objeto continúa comunicando rareza y estadísticas desde la interfaz. La joyería muestra sus resistencias y afijos mediante datos canónicos; el icono no codifica resultados derivados ni una rareza fija.

Estas decisiones se reflejan también en `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`.

---

## 17. Planes maestros cerrados heredados

No se reabren ni modifican:

- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`;
- `docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md`.

Este Plan Maestro de Botín hereda contratos de ambos sin alterar su cierre histórico.

---

## 18. Etapas

### B1 — Contrato y motor canónico de botín

Objetivo:

- definir perfiles genéricos;
- definir cuatro marcos;
- definir contrato de solicitud;
- resolver marcos efectivos;
- seleccionar marco y candidato de forma ponderada;
- soportar específicos y garantizados;
- separar secuencias pseudoaleatorias;
- cargar/validar `PerfilesBotin.json` durante el arranque normal;
- conservar `tablaBotin` productiva hasta B2;
- documentar todas las decisiones heredadas de B2/B3.

Estado: **Cerrada. Pruebas técnicas superadas y regresión manual aprobada por el usuario el 18/08/2026.**

### B2 — Migración de fuentes, Desechables y destrucción

Objetivo implementado:

- migrar enemigos recurrentes/especiales/jefes;
- auditar cada `tablaBotin` y separar específico frente a genérico;
- crear `Desechables.json`;
- mover restos vendibles desde Materiales;
- crear Madera/Tela/Metal/Piedra;
- migrar cofres/recipientes/destructibles;
- implementar abrir frente a destruir;
- aplicar 80 % de supervivencia del contenido;
- agregar materiales estructurales;
- integrar `elite → +equipamiento` desde configuración de variantes;
- dejar `SistemaBotin` como única ruta productiva;
- hacer que el presupuesto consulte el valor esperado al propio `SistemaBotin`, sin crear un segundo intérprete de perfiles/pesos/probabilidades.

Estado: **Cerrada. Implementación completa, validación técnica superada y pruebas manuales aprobadas por el usuario el 19/08/2026.**

### B3 — Suerte, joyería y Tier III

Objetivo implementado:

- Carisma → Suerte;
- Potencia de Aura → Constitución;
- Ajuste comercial canónico;
- Hallazgo mágico y evaluación al materializar;
- materialización diferida de cofres/recipientes exactamente una vez;
- Fortuna;
- De lucidez;
- Arcano activado y rebalanceado;
- accesorios Tier I/II/III;
- 24 bases elementales de joyería;
- 35 bases Tier III, desde nivel 8;
- 51 assets nuevos;
- Panel de Personaje y presentación de objetos actualizados;
- persistencia v5 sin migradores;
- Diseño Maestro Visual actualizado.

Estado: **Cerrada. Implementación técnica, correcciones de regresión y pruebas manuales aprobadas por el usuario el 19/08/2026.**

### B-AUD — Auditoría post-hito de botín, objetos y recompensas

Objetivo aprobado:

- auditar B1–B3 y sus integraciones directas sin convertir la etapa en una auditoría general de Dark Moon;
- eliminar configuración productiva que sólo represente backlog o seguimiento de desarrollo;
- eliminar solapes, validaciones y utilidades duplicadas cuando exista equivalencia demostrable;
- conservar `Raro` y `Único` visibles en el catálogo de rarezas, pero deshabilitados para generación hasta una futura etapa;
- preservar exactamente el gameplay observable y las secuencias reproducibles de B3;
- comprobar también los consumidores cuando la limpieza toque un contrato compartido.

Estado: **Implementada técnicamente. Pendiente de validación manual del usuario antes del cierre formal.**

No existe una B4 definida en este Plan Maestro y no debe iniciarse automáticamente.

---

## 19. Contrato incorporado por B1

Forma conceptual:

```text
{
  perfil,
  marcosPermitidos,
  contexto,
  especificos,
  garantizados
}
```

El resultado canónico mantiene siempre:

```text
objetosGenerados: []
```

Por tanto:

- `[]` → nada;
- `[objeto]` → uno;
- `[objeto1, objeto2, ...]` → varios.

No existen tres tipos diferentes de retorno.

---

## 20. Contexto implementado en B1

B1 soporta inicialmente:

- `marcosAdicionales`;
- `marcosExcluidos`;
- `idsPermitidos`;
- `idsExcluidos`;
- `etiquetasRequeridas`;
- `etiquetasExcluidas`.

Esto es intencionalmente genérico.

B2 podrá utilizar etiquetas para materiales/familias sin introducir condiciones por nombre de entidad dentro de `SistemaBotin`.

---

## 21. Errores explícitos

El motor debe fallar de forma explícita ante:

- perfil inexistente;
- marco desconocido;
- pesos negativos;
- perfil sin peso utilizable;
- objeto específico inexistente;
- objeto garantizado inexistente;
- cantidades inválidas;
- probabilidad inválida;
- solicitud sin marcos;
- filtros que dejen sin candidatos después de seleccionar un marco.

No se silencian configuraciones inválidas.

---

## 22. Balance de perfiles

B1 utilizó temporalmente `estadoBalance: provisional_b1` para dejar explícito que sus números todavía no habían sido contrastados contra las fuentes productivas.

B2 elimina ese atributo de la configuración productiva. El estado de una etapa o de su balance pertenece a la documentación y a las pruebas, no al contrato que ejecuta el juego.

Durante B2 los perfiles y las solicitudes reales se contrastaron contra el valor esperado de las tablas heredadas y contra la generación procedural completa. Los perfiles quedan configurables por JSON, pero ya no llevan identificadores de etapa ni metadatos de seguimiento documental.

La consulta de valor esperado pertenece a `SistemaBotin` y reutiliza el mismo contrato normalizado, marcos, candidatos, pesos y rangos de cantidad que la generación real. El planificador de población consume esa consulta y no interpreta botín por su cuenta.

---

## 23. Decisiones aprobadas A–F

### A — Marcos

Aprobado:

- Equipamiento;
- Comunes;
- Materiales;
- posteriormente Desechables como cuarto marco, aprobado en E.

El perfil aporta pesos, la fuente limita marcos y el contexto puede modificarlos.

### B — Resistencia Mental

Aprobado como sufijo exclusivo de joyería.

### C — Nombre

Aprobado: `De lucidez`.

### D — Valores base de joyería

Se definirán y balancearán durante B3; no se fijan en B1.

### E — Materiales frente a Desechables

Aprobado:

- `Desechables.json` futuro;
- tipo `desechable`;
- cuarto marco `desechables`;
- Materiales reservado para recursos útiles;
- drops característicos continúan específicos en la fuente.

### F — Variantes

Aprobado:

- variante como contexto;
- Élite agrega Equipamiento;
- no crea perfil `enemigo_elite`;
- no garantiza equipamiento;
- no existe condición especial por nombre dentro de `SistemaBotin`.

---

## 24. Criterio de cierre de B1

B1 sólo puede cerrarse cuando:

- `PerfilesBotin.json` carga y valida durante el arranque;
- el contrato normaliza perfiles, marcos, específicos y garantizados;
- marcos adicionales/excluidos funcionan;
- pesos se normalizan implícitamente mediante selección ponderada sobre marcos efectivos;
- selección de candidatos respeta tipo, nivel e IDs/etiquetas de contexto;
- ausencia de candidatos produce error explícito;
- específicos y garantizados se suman al resultado;
- misma semilla reproduce el mismo resultado;
- el sistema actual continúa funcionando sin migración parcial de fuentes;
- no se agregan dependencias;
- JSON/imports/sintaxis son válidos;
- pruebas manuales requeridas son ejecutadas/aprobadas por el usuario;
- el diff final contiene únicamente B1 y documentación correspondiente.

---

## 25. Criterio de inicio de B2

B2 no debe comenzar automáticamente.

Requiere:

- B1 cerrada: **cumplido**;
- aprobación de sus pruebas: **cumplido por el usuario el 18/08/2026**;
- volver a verificar ruta, rama, HEAD y `git status` sobre la base que el usuario entregue para continuar.

---

## 26. Cierre de B1

B1 queda **Cerrada**.

Resultado consolidado:

- el contrato canónico Perfil + Marcos + Contexto + Específicos + Garantizados quedó implementado;
- `SistemaBotin` conserva la ruta productiva heredada y dispone de la nueva resolución genérica para B2;
- los cuatro marcos canónicos quedan definidos: Equipamiento, Comunes, Materiales y Desechables;
- las decisiones A–F quedan documentadas y heredadas;
- no se migraron todavía fuentes productivas, Materiales/Desechables, variantes, Suerte, joyería ni Tier III;
- no se agregaron dependencias;
- las validaciones técnicas de B1 fueron superadas;
- el usuario confirmó la superación de las pruebas manuales de regresión el 18/08/2026;
- no se reabrieron los Planes Maestros cerrados de Habilidades ni Mazmorras;
- B2 continúa sin iniciar hasta una nueva solicitud explícita y una nueva verificación de base Git.


---

## 27. Implementación de B2

B2 parte del `HEAD` verificado `f2c2ec68e011fc0f67250688ca4debb61d524c23`, rama `main`, con `origin/main` coincidente y árbol limpio antes de modificar.

Decisiones consolidadas:

- `SistemaBotin` es la única autoridad productiva y también la única autoridad para consultar el valor esperado de una solicitud;
- no existe `CalculadorValorEsperadoBotin` ni otra interpretación paralela del contrato;
- enemigos, cofres, recipientes y destructibles utilizan solicitudes canónicas;
- `tablaBotin`, `tablaBotinAdicional`, `generarBotinEnSuelo()` y `generarContenidoBotin()` dejan de formar parte del flujo productivo;
- los drops característicos permanecen como específicos;
- los cofres importantes usan `recompensa_mayor` con los marcos `comunes` y `equipamiento`, sin objetos ni rarezas garantizadas;
- el Señor de la Guerra deja de forzar una `espada_acero` mágica: `espada_acero` queda como específico de probabilidad alta y su rareza sigue el generador canónico;
- `elite` agrega `equipamiento` desde `VariantesEnemigos.json`, sin condición por nombre dentro de `SistemaBotin`;
- `Desechables.json` contiene Cola de rata, Caparazón de cucaracha, Hueso de esqueleto, Carne putrefacta y Hueso negro;
- `Materiales.json` queda reservado inicialmente a Madera, Tela, Metal y Piedra;
- los materiales muestran una píldora visual `Material` derivada de `tipo: material`, sin duplicar esa categoría dentro de la descripción de cada objeto;
- abrir un recipiente consume exclusivamente las instancias ya generadas que contiene;
- destruirlo aplica la supervivencia configurada por pila restante y luego resuelve sus recompensas estructurales;
- la probabilidad inicial de supervivencia es 80 % y utiliza una secuencia pseudoaleatoria propia del contexto canónico;
- una pila sobrevive o se destruye completa: no se divide por unidad;
- Madera, Tela, Metal y Piedra participan en la generación estructural mediante solicitudes declarativas por entidad;
- el presupuesto procedural consulta `SistemaBotin.calcularValorEsperadoSolicitudBotin()` y no contiene una segunda fórmula de interpretación de loot;
- `estadoBalance: provisional_b1` se elimina de producción y no se reemplaza por un identificador de B2.

Balance técnico de referencia realizado en B2:

- enemigos recurrentes, considerados como conjunto, quedan aproximadamente 23 % por debajo del valor medio legado;
- enemigos especiales sin jefe, como conjunto, quedan aproximadamente 17 % por encima;
- el jefe queda aproximadamente 18 % por encima;
- contenidos genéricos de recipientes se ajustaron por grado de perfil y se mantienen aproximadamente dentro de ±30 % del valor esperado heredado;
- cofres moderados quedan aproximadamente 12 % por debajo;
- cofres importantes usan 2–3 tiradas seguras de `recompensa_mayor` sobre `comunes` + `equipamiento`; Equipamiento es muy probable pero no garantizado y no existe un ID/rareza fijo;
- los materiales estructurales son recompensa nueva y se presupuestan por separado mediante la misma consulta canónica.

Validación técnica realizada antes de preparar la entrega:

- 41 JSON válidos;
- 278 archivos JavaScript con sintaxis válida;
- 529 imports ES relativos comprobados, sin faltantes;
- 202 referencias visuales de JSON comprobadas, sin recursos faltantes;
- 132 solicitudes reales validadas, sin errores;
- validador de infraestructura completo superado;
- supervivencia configurada a 0 %, 100 % y 80 % comprobada;
- con 80 %, 798 de 1000 pilas sobrevivieron (79,8 %), con reproducibilidad por semilla y sin alterar cantidades de pila;
- persistencia v4 comprobada con Madera y Cola de rata mediante snapshot/restauración;
- 50 mazmorras completas generadas correctamente: 10 semillas por cada una de las cinco mazmorras;
- carga HTTP de entradas y recursos nuevos comprobada con respuestas 200;
- `git diff --check` sin errores.

Cierre formal:

- el usuario confirmó el 19/08/2026 que las pruebas manuales de B2 fueron satisfactorias;
- no se informaron incidencias pendientes sobre apertura/destrucción, enemigos Élite, cofres, inventario ni presentación;
- la ejecución Electron no fue realizada de forma independiente por el asistente en esta copia porque el ZIP no contiene `node_modules` ni existe un binario Electron disponible; no se instalaron dependencias para forzar esa prueba;
- B2 queda cerrada y B3 continúa sin iniciar hasta una nueva solicitud explícita y una nueva verificación de base Git.

B3 no debe comenzar automáticamente.

---

## 29. Implementación de B3

B3 parte del `HEAD` verificado `20d2f59601e9ce4b30057f17474d82a9233484c1`, rama `main`, con `origin/main` coincidente y árbol limpio antes de modificar.

Decisiones consolidadas:

- `Suerte` sustituye a `Carisma` sin alias ni migración;
- Potencia de Aura toma Constitución con coeficiente inicial 2;
- `ajusteComercial` y `hallazgoMagico` son objetivos canónicos del resolutor común;
- comercio consume `ajusteComercial` ya resuelto;
- Hallazgo mágico sólo modifica pesos relativos de rarezas habilitadas superiores a Común y tiene tope +100 %;
- el presupuesto procedural es independiente de Hallazgo mágico;
- cofres y recipientes conservan una solicitud pendiente y se materializan exactamente una vez al primer abrir o, si siguen cerrados, al destruirse;
- destruir conserva la supervivencia del 80 % definida en B2 sin regenerar objetos retirados;
- `accesorio` reutiliza collar y los dos anillos del equipamiento existente;
- se incorporan 24 joyas elementales con 5/10/15 % de resistencia base;
- `De lucidez` y `De fortuna` son exclusivos de accesorio;
- `Arcano` queda disponible para generación con rangos 2–4 / 5–8 / 9–12 de Maná;
- `Del soberano` se elimina;
- Tier III comienza en nivel 8 y se expresa sólo mediante datos normales del catálogo;
- persistencia pasa a v5 y reconstruye Ajuste comercial/Hallazgo mágico desde sus fuentes.

Validación técnica realizada antes de preparar la entrega:

- 142 módulos JavaScript del flujo afectado cargados realmente en Chromium mediante ES Modules, sin errores de página;
- configuraciones cargadas mediante el `CargadorConfiguracion` real: 118 objetos, 23 prefijos y 35 sufijos;
- 24 accesorios comprobados: 8 por Tier y resistencias base 5/10/15 %;
- 35 bases Tier III comprobadas, todas con `nivelMinimoGeneracion: 8`;
- Suerte 8/10/15/30 comprobada contra Ajuste comercial y Hallazgo mágico, incluidos los límites;
- Potencia de Aura comprobada con +2 por punto de Constitución;
- objetivo de modificador desconocido produce error explícito;
- `De fortuna` comprobado mediante el resolutor común del equipo;
- 60.000 tiradas reproducibles por escenario comprobaron que Hallazgo 0/25/100 incrementa sólo el peso efectivo de Mágico y no altera rareza forzada;
- valor esperado presupuestario idéntico con Hallazgo 0 y 100 (`308.33` en el caso de referencia);
- materialización diferida comprobada: primer acceso materializa, segundo acceso no rerollea;
- persistencia v5 comprobada: guarda Suerte, no persiste Ajuste comercial/Hallazgo mágico y rechaza explícitamente v4;
- los 51 assets B3 existen, son 64×64, RGBA y tienen transparencia;
- entradas web, JSON principales y los 51 assets respondieron HTTP 200 mediante servidor local;
- auditoría estática sin segunda definición de valor esperado, sin segunda fórmula de Suerte en Comercio y sin condición especial de Tier III;
- `git diff --check` superado.

Correcciones detectadas durante la validación manual:

- `PobladorInteractuablesMazmorra` fue ajustado para reconocer un cofre con solicitud pendiente como contenido diferido válido y no confundirlo con un cofre ya materializado vacío;
- el mayor valor esperado de Equipamiento tras joyería/Tier III requirió elevar `multiplicadorHabitacionEspecial` de 3 a 4 en Cementerio y Fortaleza Abandonada, sin modificar la ecuación canónica ni los presupuestos normales;
- después de estas correcciones se validaron 50/50 ciclos de creación/materialización/reapertura sin reroll, 30/30 generaciones de Alcantarilla y 200/200 generaciones finales entre las cinco mazmorras en niveles mínimo/máximo.

Cierre:

- el usuario confirmó el 19/08/2026 que las pruebas manuales M1–M11 de B3 fueron satisfactorias;
- Chromium del entorno del asistente bloqueó por política administrativa la navegación directa a `localhost`/`file`, aunque los módulos se ejecutaron mediante documento de prueba y las rutas HTTP se verificaron por separado;
- Electron no fue ejecutado independientemente por el asistente porque el ZIP no contiene `node_modules`/binario y B3 no autorizaba instalar dependencias;
- no quedan bloqueantes conocidos dentro del alcance aprobado;
- B3 queda cerrada y no existe una B4 definida. Cualquier continuación requiere una nueva etapa explícitamente aprobada.

---

## 30. Implementación de B-AUD

B-AUD parte del `HEAD` verificado `1701ba9bb0401e49623d4ed90174aa9c895b85ab`, rama `main`, con `origin/main` coincidente y árbol limpio al interpretar correctamente la política de finales de línea del repositorio.

La etapa no agrega contenido ni cambia balance. Su objetivo es que producción represente solamente contratos y datos vigentes, y que una semántica compartida tenga una única implementación cuando la equivalencia pueda demostrarse.

Hallazgos corregidos:

- los catálogos de afijos mezclaban contenido productivo con 31 entradas que sólo representaban diseño, balance o motor pendientes; esas entradas se eliminan en lugar de trasladarse a otro backlog documental;
- `Sufijos.json` contenía dos claves `de_fortuna`: una propuesta antigua y la implementación real. JSON utilizaba silenciosamente la última; B-AUD elimina la definición solapada y agrega una comprobación de claves duplicadas a la validación de la etapa;
- los afijos productivos conservaban campos puramente documentales como `estado`, `motivoEstado`, `requiere` y `notasDiseno`; se eliminan del contrato ejecutable;
- `Rarezas.json` conservaba estados de desarrollo. `Común` y `Mágico` quedan con `generacionHabilitada: true`; `Raro` y `Único` permanecen visibles con `generacionHabilitada: false`;
- los seis atributos base estaban repetidos en combatiente, jugador, estadísticas, persistencia, validación e interfaz. `ContratosAtributosCombatiente.js` pasa a ser el registro estructural único;
- la antigua validación especial de `carisma` desaparece: una configuración es válida si coincide exactamente con el contrato canónico vigente;
- la estructura de una solicitud declarativa de botín se valida desde `ContratoBotin.js`, evitando copias parciales en los validadores de mapas y entidades de mazmorra;
- rareza, nivel de objeto, afijos, marco/objeto de botín, población, encuentros especiales y stock comercial reutilizan una selección ponderada común basada en el mismo generador reproducible;
- `RarezasObjeto.js` deja de mantener un segundo catálogo codificado de cuatro rarezas. Sólo conserva las constantes con semántica estructural de Común/Mágico; la existencia y habilitación pertenecen a `Rarezas.json`;
- se elimina `obtenerTiposPorMarcoBotin()` al confirmarse que no tenía consumidores;
- `ValidadorInfraestructuraEntidades` estaba desactualizado respecto de B2/B3: no suministraba el catálogo de objetos al sistema de interacción, omitía Accesorios y esperaba materialización inmediata de cofres. Se actualiza como herramienta de depuración, sin modificar gameplay.

Comprobaciones de equivalencia técnica realizadas:

- 500 semillas comparadas antes/después para rareza, nivel de objeto, afijos, marcos, objetos, población, encuentros y stock comercial: salida idéntica byte a byte;
- 32 solicitudes reales de botín × 5 niveles × 5 semillas = 800 casos comparados contra B3: objetos, rarezas, niveles, afijos, detalle canónico y valor esperado idénticos byte a byte;
- 100 mazmorras completas comparadas contra B3 entre las cinco plantillas y sus niveles mínimo/máximo: mapa, resumen de generación, objetivos e interactuables idénticos byte a byte;
- 200 generaciones completas adicionales ejecutadas sobre B-AUD sin fallos;
- `ValidadorInfraestructuraEntidades` vuelve a ejecutar correctamente su batería completa;
- todos los JSON de `src/config` se comprobaron sin claves duplicadas;
- los catálogos de objetos y enemigos no repiten IDs entre sus archivos combinados;
- no quedan referencias a B1, B2, B3 o B-AUD dentro de producción;
- no quedan campos de seguimiento de desarrollo en la configuración productiva de objetos;
- sintaxis de los módulos JavaScript, JSON e imports relativos verificada sin faltantes.

B-AUD no modifica:

- fórmulas de Suerte, Hallazgo mágico o Ajuste comercial;
- pesos, probabilidades o balance de afijos productivos;
- valores de joyería o Tier III;
- supervivencia de destrucción;
- presupuesto procedural;
- persistencia v5;
- contratos de movimiento, combate, muerte, experiencia o habilidades;
- Diseño Maestro Visual.

El cierre formal de B-AUD requiere la validación manual del usuario y la comprobación final de Git/entrega incremental.
