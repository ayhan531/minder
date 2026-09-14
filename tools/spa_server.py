from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os


ROOT = Path(__file__).resolve().parents[1] / "dist"
PORT = int(os.environ.get("PORT", "4173"))


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        path = self.translate_path(self.path)
        if not Path(path).exists() and "." not in Path(self.path).name:
            self.path = "/index.html"
        return super().send_head()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("", PORT), SpaHandler)
    print(f"Serving {ROOT} at http://localhost:{PORT}")
    server.serve_forever()
