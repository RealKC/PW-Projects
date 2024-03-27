import os
import socket
import logging
import threading

from response import Response

logging.basicConfig(level=logging.INFO)

LOG = logging.getLogger(f'{__name__}/web')

def get_request_data(start_line):
    components = start_line.split(' ')
    return (components[0], components[1][1:], components[2])

def get_content_type(path: str):
    if path.endswith('.html'):
        return 'text/html'
    if path.endswith('.css'):
        return 'text/css'
    if path.endswith('.js'):
        return 'text/javascript'
    if path.endswith('.png'):
        return 'image/png'
    if path.endswith('.ico'):
        return 'image/vnd.microsoft.icon'
    return 'application/octet-stream'

def client_supports_gzip(request_headers: str) -> bool:
    accept_encoding_start = request_headers.find('Accept-Encoding')
    if accept_encoding_start == -1:
        return False

    accept_encoding_end = request_headers[accept_encoding_start:].find('\r\n')
    # Malformed header so let's just say the client doesn't support gzip if it can't send correctly formed headers
    if accept_encoding_end == -1:
        return False

    return request_headers[accept_encoding_start:accept_encoding_start+accept_encoding_end].find('gzip') != -1

def handle_get(log: logging.Logger, client: socket.socket, path: str, supports_gzip: bool):
    log.info(f'Client supports gzip? {supports_gzip}')
    for filename in os.listdir('../continut'):
        if filename == path:
            response = Response()
            response.set_200_ok()
            with open(f'../continut/{filename}', 'rb') as file:
                response.append_body(body=file.read(), content_type=get_content_type(path), supports_gzip=supports_gzip)
            response.send_to(client)
            return
        elif os.path.isdir(f'../continut/{filename}') and path.startswith(filename):
            log.info(f'returning data from a subdirectory: {filename} {path}')
            response = Response()
            response.set_200_ok()
            with open(f'../continut/{path}', 'rb') as file:
                response.append_body(body=file.read(), content_type=get_content_type(path), supports_gzip=supports_gzip)
            response.send_to(client)
            return

    not_found = Response()
    not_found.set_404_not_found()
    not_found.send_to(client)

def client_connection_handler(client_socket):
    request = ''
    first_line = ''

    log = logging.getLogger(f'{__name__}/web/{threading.current_thread().name}');

    while True:
        data = client_socket.recv(1024)
        request += data.decode()
        log.info(f'S-a citit mesajul: \n------------------------------------\n{request}\n------------------------------------')
        pozitie = request.find('\r\n')
        if pozitie > -1:
            first_line = request[:pozitie]
            log.info(f'S-a citit linia de start din cerere: ### {first_line} ###')
            break

    log.info('S-a terminat citirea datelor receptionate')

    (verb, path, _http_version) = get_request_data(first_line)

    log.name += f' ~> {verb} {path}'

    if verb == 'GET':
        handle_get(log, client_socket, path, client_supports_gzip(request))

    client_socket.close()

    log.info('S-a terminat comunicarea cu clientul')

def main_loop(server_socket: socket.socket):
    while True:
        LOG.info('############################################################')
        LOG.info('Serverul asculta potentiali clienti')

        (client_socket, address) = server_socket.accept()
        LOG.info(f'S-a conectat clientul cu adresa: {address}')

        threading.Thread(
            target=client_connection_handler,
            args=[client_socket],
            name=f'Client {address}'
        ).start()


if __name__ == '__main__':
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind(('', 5678))
    server_socket.listen(5)

    try:
        main_loop(server_socket)
    except KeyboardInterrupt:
        LOG.info('shutting down...')
    except:
        LOG.exception('got exception in server main loop, shutting down....')
    finally:
        server_socket.close()
