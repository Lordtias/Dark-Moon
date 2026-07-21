# Sistema de rarezas y afijos

## Estado del hito

El hito inicial queda cerrado con soporte funcional para:

- Objetos comunes.
- Objetos mágicos.
- Uno o dos afijos en objetos mágicos.
- Máximo de un prefijo y un sufijo.
- Nivel de objeto reproducible.
- Grados de afijo según el nivel del objeto.
- Valores exactos sorteados dentro de rangos configurables.
- Aplicación de los modificadores sobre propiedades finales.
- Generación desde tablas de botín.
- Visualización de rareza, nivel, grado y valores.
- Pesos configurables para rarezas, cantidades y familias de afijos.

## Flujo actual

```text
Tabla de botín
→ tirada de la entrada
→ cantidad
→ nivel del objeto
→ rareza
→ cantidad de afijos
→ familias compatibles
→ grado
→ valores exactos
→ propiedades finales
→ instancia de Objeto
```

Las tiradas que deciden si una entrada cae permanecen separadas de las tiradas que construyen la instancia. Esto permite modificar rarezas y afijos sin alterar los resultados base de una tabla para la misma semilla y orden de derrotas.

## Archivos de configuración

### `GeneracionObjetos.json`

Contiene reglas generales que no pertenecen a una rareza o afijo específico. Actualmente define la distribución del nivel del objeto respecto al nivel de la fuente.

### `Rarezas.json`

Cada rareza define:

- Estado.
- Color.
- Peso relativo.
- Nivel mínimo.
- Límites de prefijos y sufijos.
- Distribución ponderada de cantidad de afijos.

### `Prefijos.json` y `Sufijos.json`

Cada afijo define:

- Estado.
- Motivo de estado.
- Peso relativo de la familia.
- Tipos y ranuras compatibles.
- Rarezas permitidas.
- Grupo de exclusión.
- Efectos.
- Grados, niveles mínimos y rangos.
- Dependencias y notas de diseño para mecánicas futuras.

## Significado de los pesos

Los pesos son relativos y se evalúan después de filtrar las opciones compatibles.

Ejemplo:

```text
Afilado: 1000
Brutal:   700
```

Cuando ambas familias son compatibles, Afilado es más frecuente. No significa una probabilidad fija global, porque el conjunto de opciones cambia según el tipo, la ranura, la rareza, el nivel y los grupos de exclusión ya ocupados.

## Distribución inicial

### Rareza

```text
Común: 7000
Mágico: 3000
```

Equivale inicialmente a 70 % y 30 % cuando ambas rarezas son elegibles.

### Cantidad de afijos mágicos

```text
1 afijo: peso 60
2 afijos: peso 40
```

### Nivel del objeto

Respecto al nivel de la fuente:

```text
-1: peso 20
 0: peso 70
+1: peso 10
```

El nivel nunca puede ser inferior al mínimo configurado. Los pesos de resultados que terminan en el mismo nivel se acumulan.

## Reglas de compatibilidad

Un afijo solamente puede generarse cuando:

1. Su estado es `activo`.
2. Su peso es mayor que cero.
3. Permite la rareza seleccionada.
4. Permite el tipo de objeto.
5. Cumple sus restricciones de ranuras.
6. Tiene al menos un grado habilitado por el nivel del objeto.
7. Su ID no fue seleccionado antes.
8. Su grupo de exclusión todavía está libre.
9. La rareza todavía tiene espacio para su tipo de afijo.

## Mecánicas registradas pero inactivas

Los catálogos conservan propuestas futuras con estados como:

- `pendiente_motor`.
- `pendiente_diseno`.
- `pendiente_balance`.
- `reservado_raro`.
- `reservado_unico`.

Entre ellas se encuentran:

- Velocidad de ataque local.
- Daño físico global.
- Multiplicadores de más daño.
- Armadura porcentual local.
- Atributos por equipamiento.
- Daño elemental.
- Estados alterados.
- Velocidad de movimiento.
- Robo de Vida y Maná.
- Rareza y cantidad de objetos encontrados.
- Modificadores de hechizos.

El generador nunca selecciona estas entradas mientras no estén activas. El validador permite que documenten propiedades futuras, pero impide activarlas si el motor todavía no soporta sus efectos u operaciones.

## Límites de este hito

Quedan fuera del hito inicial y pertenecen a etapas futuras:

- Bases de equipamiento desbloqueadas por nivel.
- Comparación visual con el objeto equipado.
- Nombres compuestos a partir de prefijos y sufijos.
- Objetos raros.
- Objetos únicos.
- Daño elemental y estados alterados.
- Guardado y carga de partidas.
- Economía, comerciantes y fabricación.

## Criterio para activar un afijo futuro

Antes de cambiar su estado a `activo` debe cumplirse:

1. La propiedad existe y participa del motor.
2. La operación está implementada.
3. Su efecto local o global está definido.
4. Sus tipos y ranuras compatibles están decididos.
5. Tiene al menos un grado válido.
6. Tiene un peso base mayor que cero.
7. Su presentación en el modal es legible.
8. Fue probado junto con doble arma, equipamiento y progresión cuando corresponda.
