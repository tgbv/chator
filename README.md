# Chator v2
-----------------------
Open source messaging system designed to be integrated with TOR network (see http://torproject.org).

This repository contains the backend source code. It is fully functional. <br>
- NodeJS and MySQL as backbone.<br>
- Expressjs for routing.<br>
- SocketIO v3 for duplex connections.

## Routes described
-----------------------

### Authentication
- `POST: /auth/login` Login based on username/password credentials. Login is RESTful, returns a JWT.
- `POST: /auth/register` Register with username/password credentials

### Friendlist
ALL require JWT.

- `GET: /friendlist` Retrieves all user's friends
- `POST: /friendlist/add-friends` User adds friends to its own friendlist
- `DELETE: /friendlist/unlink-friends` User unfriends other users

### Chatrooms (aka lobbies)
ALL require JWT.

- `GET: /chatrooms` Retrieves all lobbies to which user is assigned.
- `POST: /chatrooms/lobby/new` Creates a new lobby with users.

The following routes require user to be a part of lobby:
- `GET: /chatrooms/lobby/:lobby_id/users` Retrieves users assigned to lobby
- `GET: /chatrooms/lobby/:lobby_id/messages/:page` Retrieve messages assigned to lobby (sent by users). Paginated
- `POST: /chatrooms/lobby/:lobby_id/message` Sends a message to a lobby
- `DELETE: /chatrooms/lobby/:lobby_id` User leaves a lobby
- `POST: /chatrooms/lobby/:lobby_id/add-users` If user is admin of lobby it can add other users to it

## Duplex connections Events (websocket) described
-----------------------

Websocket events are defined in `/websocket` folder. Pseudo syntax: `/namespace :event`

c = client<br>
s = websocket server

Most inbound events will have outbound a loopback message in the syntax: `eventname_END`. See the [source code](https://github.com/tgbv/chator/blob/238554fa8f3231f0599381549a9fa7cf3bfe3381/websocket/lobby.ws.js#L46) for better understandment.

### Inbound events (c -> s)
- `/lobby/[0-9]+ :postMessage` User posts message to a lobby
- `/lobby/[0-9]+ :deleteMessage` User deletes its message from a lobby
- `/lobby/[0-9]+ :editMessage` User edits its message from a lobby
- `/lobby/[0-9]+ :leaveLobby` User leaves a lobby

### Outbound events (s -> c)
- `/lobby/[0-9]+ :welcome` Welcome message on connection establishment
- `/lobby/[0-9]+ :postedMessage` A new message has been posted
- `/lobby/[0-9]+ :deletedMessage` A message has been deleted
- `/lobby/[0-9]+ :editedMessage` A message has been edited
- `/lobby/[0-9]+ :deletedAllMessagesFromLobbyOfUser` As event name says
- `/lobby/[0-9]+ :userLeftLobby` A user has left a lobby

## Contribution/development
-----------------------

Development is currently suspended (I need a java guru to write the frontend), although contributions are welcome!
