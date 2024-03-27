import os
import socket
import logging

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

def handle_get(client: socket.socket, path: str):
    for filename in os.listdir('../continut'):
        if filename == path:
            response = Response()
            response.set_200_ok()
            response.append_header('Content-Type', get_content_type(filename))
            with open(f'../continut/{filename}', 'rb') as file:
                data = file.read()
                response.append_header('Content-Length', len(data))
                response.append_body(data)
            response.send_to(client)
            return
        elif os.path.isdir(f'../continut/{filename}') and path.startswith(filename):
            LOG.info(f'returning data from a subdirectory: {filename} {path}')
            response = Response()
            response.set_200_ok()
            response.append_header('Content-Type', get_content_type(path))
            with open(f'../continut/{path}', 'rb') as file:
                data = file.read()
                response.append_header('Content-Length', len(data))
                response.append_body(data)
            response.send_to(client)
            return

    not_found = Response()
    not_found.set_404_not_found()
    not_found.send_to(client)

def main_loop(server_socket: socket.socket):
    while True:
        LOG.info('############################################################')
        LOG.info('Serverul asculta potentiali clienti')

        (client_socket, address) = server_socket.accept()
        LOG.info(f'S-a conectat clientul cu adresa: {address}')

        request = ''
        first_line = ''

        while True:
            data = client_socket.recv(1024)
            request += data.decode()
            LOG.info(f'S-a citit mesajul: \n------------------------------------\n{request}\n------------------------------------')
            pozitie = request.find('\r\n')
            if pozitie > -1:
                first_line = request[:pozitie]
                LOG.info(f'S-a citit linia de start din cerere: ### {first_line} ###')
                break

        LOG.info('S-a terminat citirea datelor receptionate')

        (verb, path, _http_version) = get_request_data(first_line)

        if verb == 'GET':
            handle_get(client_socket, path)

        client_socket.close()

        LOG.info('S-a terminat comunicarea cu clientul')

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
