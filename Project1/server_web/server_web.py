import api
import logging
import mimetypes
import multiprocessing
import socket

from argparse import ArgumentParser
from response import Response

logging.basicConfig(level=logging.INFO)

LOG = logging.getLogger(f'{__name__}/web')

CONTENT_DIRECTORY: str

def get_request_data(start_line):
    components = start_line.split(' ')
    return (components[0], components[1][1:], components[2])

def get_content_type(path: str):
    (type, _encoding) = mimetypes.guess_type(path)
    if type.startswith('text/'):
        type += '; charset=utf-8'
    return type

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
    if len(path) == 0 or path == '/':
        redirect = Response()
        redirect.set_301_moved_permanently()
        redirect.append_header('Server', Response.SERVER)
        redirect.append_header('Location', '/index.html')
        redirect.send_to(client)
        return

    try:
        with open(f'{CONTENT_DIRECTORY}/{path}', 'rb') as file:
            log.info(f'returning resource: {path}')
            response = Response()
            response.set_200_ok()
            response.append_header('Server', Response.SERVER)
            response.append_body(body=file.read(), content_type=get_content_type(path), supports_gzip=supports_gzip)
            response.send_to(client)
    except FileNotFoundError:
        log.info(f'client asked for non-existent {path}')
        not_found = Response()
        not_found.set_404_not_found()
        not_found.append_header('Server', Response.SERVER)
        with open(f'{CONTENT_DIRECTORY}/404.html', 'rb') as file:
            page = file.read()
        not_found.append_body(body=page, content_type='text/html; charset=utf-8', supports_gzip=supports_gzip)
        not_found.send_to(client)

def client_connection_handler(client_socket):
    request = ''
    first_line = ''

    log = logging.getLogger(f'{__name__}/web/{multiprocessing.current_process().name}');

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

    if path.startswith('api/') or path.startswith('/api'):
        api.handle(log, client_socket, verb, path[4:], request[request.find('\r\n\r\n'):], CONTENT_DIRECTORY)

    if verb == 'GET':
        handle_get(log, client_socket, path, client_supports_gzip(request))

    client_socket.close()

    log.info('S-a terminat comunicarea cu clientul')

def main_loop(server_socket: socket.socket):
    while True:
        LOG.info('############################################################')
        LOG.info('Serverul asculta potentiali clienti')

        (client_socket, address) = server_socket.accept()
        client_socket.set_inheritable(True)
        LOG.info(f'S-a conectat clientul cu adresa: {address}')

        multiprocessing.Process(
            target=client_connection_handler,
            args=[client_socket],
            name=f'Client {address}',
        ).start()
        client_socket.close()


if __name__ == '__main__':
    args_parser = ArgumentParser(
        prog='kyuubey',
        description='Server web for PW'
    )
    args_parser.add_argument('content_directory')
    args = args_parser.parse_args()
    CONTENT_DIRECTORY = args.content_directory

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
