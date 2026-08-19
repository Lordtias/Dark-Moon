# PLAN MAESTRO — BOTÍN CANÓNICO DE DARK MOON

**Estado general:** En ejecución.  
**Última etapa cerrada:** B1 — Contrato y motor canónico de botín.  
**Siguiente etapa recomendada:** B2 — Migración de fuentes, Desechables y destrucción (no iniciada).  
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

## 13. Suerte — diseño aprobado para B3

Carisma será reemplazado canónicamente por **Suerte**.

No habrá compatibilidad transitoria porque el plan asume cero partidas guardadas anteriores.

Suerte producirá dos resultados derivados:

### Ajuste comercial

Mantendrá inicialmente la regla económica actual de Carisma:

- referencia: Suerte 10;
- 2 % por punto;
- límite ±20 %.

El consumidor comercial deberá recibir el valor canónico ya resuelto; no reinterpretar Suerte por su cuenta.

### Hallazgo mágico

Aumentará el peso relativo de rarezas superiores a Común.

No aumentará:

- cantidad de objetos;
- probabilidad de que una fuente entregue algo;
- Tier;
- materiales.

Propuesta de balance aprobada como punto de partida para B3:

- referencia: Suerte 10;
- +5 % de peso relativo por punto por encima de 10;
- límite final configurable.

`ajusteComercial` y `hallazgoMagico` se incorporarán al registro canónico de objetivos modificables.

---

## 14. Joyería — diseño aprobado para B3

Se creará:

`src/config/objetos/Accesorios.json`

Tipo canónico futuro:

`accesorio`

Ranuras existentes reutilizadas:

- collar;
- anillo derecho;
- anillo izquierdo.

### 14.1. Identidad elemental

Como las varitas, las joyas estarán ligadas a las cuatro afinidades:

- Fuego;
- Frío;
- Rayo;
- Veneno.

Cada base posee una resistencia elemental propia.

Por cada Tier:

- 4 anillos;
- 4 collares.

Con Tier I, II y III:

**24 bases de joyería.**

Los valores numéricos de resistencia base quedan deliberadamente pendientes de balance de B3.

### 14.2. Prefijos permitidos

Se reutilizan sin cambiar su semántica:

- `Vigoroso` → Vida máxima;
- `Arcano` → Maná máximo.

`Arcano` deberá reanalizar su estado pendiente porque actualmente ya existen numerosas habilidades con coste real de Maná.

### 14.3. Sufijos permitidos

Las joyas pueden recibir:

- resistencia a Fuego;
- resistencia a Frío;
- resistencia a Rayo;
- resistencia a Veneno;
- resistencia a Congelamiento;
- resistencia a Aturdimiento;
- resistencia a Envenenamiento;
- resistencia a Quemadura;
- Resistencia Mental;
- Hallazgo mágico.

Las resistencias de efectos, Resistencia Mental y Hallazgo mágico serán exclusivas de joyería.

### 14.4. Resistencia Mental

El objetivo `resistenciaMental` ya existe en el motor de modificadores.

Nuevo sufijo aprobado:

`De lucidez`

Será exclusivo de joyería y otorgará Resistencia Mental.

### 14.5. Fortuna

`De fortuna` será exclusivo de joyería y modificará `hallazgoMagico`.

No aumenta Suerte directamente y, por tanto, no modifica precios comerciales.

`De abundancia` permanece pendiente y no forma parte de este plan inmediato.

### 14.6. Sufijo antiguo de Carisma

`Del soberano`, actualmente pendiente, no podrá conservar su semántica al desaparecer Carisma.

Se prevé reemplazar conceptualmente por un futuro sufijo de Suerte, tentativamente `Del afortunado`, pero permanecerá inactivo hasta balancear el efecto combinado sobre comercio y hallazgo.

---

## 15. Tier III — diseño aprobado para B3

El motor deberá aceptar cualquier Tier entero positivo.

No se crearán condiciones de producción del tipo:

```text
if (tier === 3)
```

Tier III será contenido normal gobernado por `nivelMinimoGeneracion` y balance.

Se agregarán bases Tier III de armas, armaduras y accesorios una vez estabilizado el motor.

El nivel mínimo exacto queda pendiente de balance; la hipótesis inicial de trabajo se sitúa aproximadamente en nivel 9–10 y debe validarse antes de quedar definitiva.

---

## 16. Dirección visual futura de B3

Los nuevos iconos de accesorios y Tier III deberán:

- ser PNG;
- tener fondo transparente;
- mantener aspecto pseudorrealista;
- reutilizar como referencia de calidad y lenguaje visual los objetos Tier II existentes;
- evitar placeholders geométricos o dibujos simples de depuración.

Cuando B3 implemente estos recursos se actualizará:

`docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`

B1 no modifica el Diseño Maestro Visual porque no incorpora cambios gráficos.

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

Objetivo futuro:

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
- dejar `SistemaBotin` como única ruta productiva.

No comenzar sin cierre/aprobación de B1.

### B3 — Suerte, joyería y Tier III

Objetivo futuro:

- Carisma → Suerte;
- Ajuste comercial;
- Hallazgo mágico;
- Fortuna;
- De lucidez;
- Accesorios Tier I/II/III;
- 24 bases elementales de joyería;
- Tier III de equipo;
- nuevos assets;
- actualización del Panel de Personaje;
- actualización del Diseño Maestro Visual.

No comenzar automáticamente después de B2.

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

## 22. Balance de perfiles de B1

`PerfilesBotin.json` incorpora valores iniciales con:

`estadoBalance: provisional_b1`

Estos valores permiten probar el contrato y las relaciones de grado de recompensa, pero **no se consideran balance de gameplay cerrado** porque B1 todavía no migra las fuentes productivas.

B2 deberá contrastarlos contra el valor esperado de las tablas actuales antes de activar la generación genérica real.

La arquitectura de los perfiles sí queda estable; sus números pueden ajustarse mediante JSON.

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
