from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        try:
            data = json.loads(body.decode("utf-8"))
            print("\n===== ALERTE PROMETHEUS =====")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            print("=============================\n")

            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Alert received")

        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Invalid JSON")

    def log_message(self, format, *args):
        print(f"[HTTP] {format % args}")

server = HTTPServer(("127.0.0.1", 5001), WebhookHandler)

print("Webhook Python en ecoute sur http://127.0.0.1:5001/")
server.serve_forever()