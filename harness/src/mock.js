// LOCAL MOCK of the few PayPal endpoints the harness uses.
// It encodes OUR ASSUMPTIONS (idempotent create, capture-once). It checks the harness code paths only.
// A pass against the mock proves nothing about real PayPal behaviour.
import http from "node:http";
import { randomUUID } from "node:crypto";

export async function startMock() {
  const orders = new Map();
  const keys = new Map();
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json", "paypal-debug-id": randomUUID().slice(0, 8) }); res.end(JSON.stringify(obj)); };
    const url = req.url;
    if (url === "/v1/oauth2/token") return send(200, { access_token: "mock-token" });
    if (req.method === "POST" && url === "/v2/checkout/orders") {
      const key = req.headers["paypal-request-id"];
      if (key && keys.has(key)) return send(201, orders.get(keys.get(key)));
      const id = "MOCK" + randomUUID().slice(0, 8).toUpperCase();
      const order = { id, status: "PAYER_ACTION_REQUIRED", links: [{ rel: "payer-action", href: `https://sandbox.example/approve/${id}` }], purchase_units: [{ payments: {} }] };
      orders.set(id, order);
      if (key) keys.set(key, id);
      return send(201, order);
    }
    const m = url.match(/^\/v2\/checkout\/orders\/([^/]+)(\/capture)?$/);
    if (m) {
      const order = orders.get(m[1]);
      if (!order) return send(404, { name: "RESOURCE_NOT_FOUND" });
      if (!m[2]) return send(200, order);
      if (order.status === "COMPLETED") return send(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] });
      if (order.status !== "APPROVED") return send(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_NOT_APPROVED" }] });
      order.status = "COMPLETED";
      order.purchase_units[0].payments = { captures: [{ id: "CAP" + randomUUID().slice(0, 6), status: "COMPLETED" }] };
      return send(201, order);
    }
    send(404, {});
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    approve: (id) => { const o = orders.get(id); if (o) o.status = "APPROVED"; },
    close: () => server.close(),
  };
}
