import gzip
from io import BytesIO
import socket

class Response:
    SERVER = 'kyuubey / PW1'

    data: bytes = b''

    def set_200_ok(self):
        self.data = b'HTTP/1.1 200 OK\r\n'

    def set_301_moved_permanently(self):
        self.data= b'HTTP/1.1 301 Moved Permanently\r\n'

    def set_404_not_found(self):
        self.data = b'HTTP/1.1 404 Not Found\r\n'

    def append_header(self, header, value):
        self.data += f'{header}: {value}\r\n'.encode()

    def append_body(self, content_type: str, body: bytes, supports_gzip: bool):
        self.append_header('Content-Type', content_type)
        if supports_gzip:
            out = BytesIO()
            with gzip.GzipFile(fileobj=out, mode='wb') as f:
                f.write(body)
            gzipped = out.getvalue()
            self.append_header('Content-Encoding', 'gzip')
            self.append_header('Content-Length', len(gzipped))
            self.data += b'\r\n'
            self.data += gzipped
        else:
            self.append_header('Content-Length', len(body))
            self.data += b'\r\n'
            self.data += body

    def send_to(self, socket: socket.socket):
        socket.sendall(self.data)
