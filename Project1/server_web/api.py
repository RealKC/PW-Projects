import json
import logging
import socket

from response import Response

def handle(log: logging.Logger, client: socket.socket, verb: str, path: str, body: str, content_directory: str):
    log.info(f'Got request {verb} {path} w/ {body}')

    routes = {
        'POST': {
            'register-user': register_user_handler
        }
    }

    routes[verb][path](log, body, content_directory)

    redirect = Response()
    redirect.set_301_moved_permanently()
    redirect.append_header('Server', Response.SERVER)
    redirect.append_header('Location', '/index.html')
    redirect.send_to(client)


def register_user_handler(log: logging.Logger, body: str, content_directory: str):
    log.info(f'handle /api/register-user, with body: {body}')
    users_path = f'{content_directory}/resurse/utilizatori.json'
    with open(users_path, 'r+') as json_file:
        users: list = json.loads(json_file.read())
        users.append(json.loads(body))
        json_file.seek(0)
        json.dump(users, json_file, indent=4)
        json_file.truncate()
