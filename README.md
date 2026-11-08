# Intelligent Notification Service (AI test)

Servicio que recibe peticiones en lenguaje natural (por ejemplo, "Manda un mail a feda@test.com diciendo hola"), extrae con un motor de IA el destinatario, el mensaje y el canal, y envía la notificación a través de un proveedor externo.

- Enunciado original: [docs/test-statement.md](docs/test-statement.md)
- Motor de IA y proveedor de notificaciones (mock): [provider/](provider/), con su documentación en `http://localhost:3001/docs`

> El historial de commits sigue el orden en que se fue construyendo, por hitos.

## Requisitos

- Node.js 26 (fijado en [.node-version](.node-version)).
- Docker, para el mock, el servicio y el test de carga.

## Uso

Desde `app/`:

| Comando         | Descripción                                                   |
| --------------- | ------------------------------------------------------------- |
| `npm install`   | Instala las dependencias                                      |
| `npm test`      | Lanza los tests                                               |
| `npm run dev`   | Arranca el servicio en el puerto 5000 con recarga en caliente |
| `npm run build` | Compila a `dist/`                                             |

El servicio comparte red con el contenedor del mock (`network_mode: service:provider`), que es quien publica el puerto 5000. Para levantar ambos:

```bash
docker compose up -d provider influxdb grafana
docker compose up -d --build app
```

## Test de carga

Con el mock y el servicio levantados:

```bash
docker compose run --rm load-test
```

Los resultados se ven en [Grafana](http://localhost:3000/d/ia-performance-scorecard/).

## Stack

Node.js 26 · TypeScript · Hono · Vitest.

El enunciado pide FastAPI; la empresa dejó elegir el lenguaje, y el servicio respeta el mismo contrato HTTP en el puerto 5000.

## Estructura

```
app/
  src/app.ts      rutas de la API
  src/server.ts   arranque del servidor HTTP
  test/           tests
```
