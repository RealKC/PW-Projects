import socket

class Response:
    data: bytes = b''

    def set_200_ok(self):
        self.data = b'HTTP/1.1 200 OK\r\n'

    def set_404_not_found(self):
        self.data = b'HTTP/1.1 404 NOT FOUND\r\n'

    def append_header(self, header, value):
        self.data += f'{header}: {value}\r\n'.encode()

    def append_body(self, body: bytes):
        self.data += b'\r\n'
        self.data += body
        self.data += b'\r\n'

    def send_to(self, socket: socket.socket):
        socket.sendall(self.data)
