// handles everything related to lobbies

const { getAllFuncsOfClass, DB, 
	validateMessage, wsErrorHandler, errorHandler  } = require('../utils')

module.exports = (WS)=>{

	//console.log(getAllFuncsOfClass(WS))

	WS.on('connect', Socket=>{

		Socket.emit('welcome')

		/*
		*	handles a new message from client

			data = { content(string), type(int) }
		*/
		Socket.on('postMessage', async data=>{
			try {
				// first we validate the message
				let verdict = validateMessage(data)
				if(verdict !== true){
					return Socket.emit('postMessage_END', verdict)
				}

				// we insert it into database
				// no need to make sure we're part of the lobby,
				// the middleware one layer above does it for us :)
				let message = (await DB.q(`
						INSERT INTO c_messages(lobby_id, created_by, content, type)
						VALUES (?, ?, ?, ?) ;

						SELECT *
						FROM c_messages
						WHERE id = LAST_INSERT_ID();
					`, [
						Socket.$.lobby_id,
						Socket.$.jwt.user,
						data.content,
						data.type,
					]) )[1][0]

				// done! emit to all others and myself
				Socket.broadcast.emit('postedMessage', message)
				Socket.emit('postMessage_END', message)
			} catch(e) {
				wsErrorHandler(e, Socket)
			}
		})

		/*
		*	handles a new message delete request from client
		*/
		Socket.on('deleteMessage', async message_id=>{
			try {
				// deletes the message only if it belongs to the client and lobby
				let result = await DB.q(`
					DELETE FROM c_messages
					WHERE id = ?
						AND lobby_id = ?
						AND created_by = ? ;
				`, [
					message_id,
					Socket.$.lobby_id,
					Socket.$.jwt.user,
				])

				// check if any row has been deleted
				// aka if the message has been deleted
				if(result.affectedRows > 0)
				{
					// broadcast the change to everyone
					Socket.broadcast.emit('deletedMessage', message_id)
					Socket.emit('deleteMessage_END', true)
				}
				else 
					Socket.emit('deleteMessage_END', false)
			} catch(e) {
				return wsErrorHandler(e, Socket)
			}
		})

		/*
		*	handles a new message edit request

			should be able to edit only text messages
			messages must belong to client

			data = { content(string), message_id(id)}
		*/
		Socket.on("editMessage", async data=>{
			try {
				// validate the message first
				// type ought to be 0
				let valid = validateMessage({
					content: data.content,
					type: 0,
				})
				if( valid !== true )
					return Socket.emit('editMessage_END', valid)

				// do it
				let result = await DB.q(`
					UPDATE c_messages 
					SET content = ?
					WHERE id = ?
						AND lobby_id = ?
						AND created_by = ?
						AND type = 0 ;

					SELECT *
					FROM c_messages
					WHERE id = ?;
				`, [
					data.content,
					data.message_id,
					Socket.$.lobby_id,
					Socket.$.jwt.user,
					data.message_id,
				]);

				// if any row was validated, broadcast this edit
				if(result[0].affectedRows > 0) {
					Socket.broadcast.emit('editedMessage', result[1])
					Socket.emit('editMessage_END', true)
				}
				else Socket.emit('editMessage_END', false)

			}catch(e){
				wsErrorHandler(e, Socket)
			}
		})

		/*
		*	handles a case when user ejects from lobby

			user can delete its messages if it wants

			lobby must be a group

			data = { withMessages(bool) }
		*/
		Socket.on('leaveLobby', async data=>{
			try {
				// data MUST be something
				if(!data) data = {}

				// leave lobby
				await DB.q(`
					DELETE FROM c_user_lobby
					WHERE user_id = ?
						AND lobby_id = ?;
				`, [ Socket.$.jwt.user,
					Socket.$.lobby_id ])

				// delete messages if specified
				// first select the messages IDs, then delete them
				if( data.withMessages ){

					// select messages IDs first
					// dunno why mysql does not allow me to insert multiple rows into a variable
					let result = await DB.q(`
						SELECT c_messages.id
						FROM c_messages
						INNER JOIN c_lobbies 
							ON c_lobbies.id = c_messages.lobby_id
							AND c_lobbies.is_group = true
						WHERE c_messages.lobby_id = ?
							AND c_messages.created_by = ?;
					`, [
						Socket.$.lobby_id,
						Socket.$.jwt.user,
					])

					// now delete the messages
					if(result.length > 0)
						await DB.q(`
							DELETE FROM c_messages
							WHERE id IN (${ new Array(result.length).fill('?').join(',') });
						`, result.map(item=>item.id))

					// emit this to users
					Socket.broadcast.emit('deletedAllMessagesFromLobbyOfUser',{
						lobby_id: Socket.$.lobby_id,
						user_id:Socket.$.user,
					})
				}

				// emit this news to everyone
				Socket.broadcast.emit('userLeftLobby', {
					user_id: Socket.$.jwt.user,
					lobby_id: Socket.$.lobby_id,
				})
				Socket.emit('leaveLobby_END', true)

				// disconnect from namespace but don't close connection
				Socket.disconnect(false) 
			}catch(e){
				wsErrorHandler(e, Socket)
			}
		})
	})

}