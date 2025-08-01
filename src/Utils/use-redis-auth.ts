/**
	Using Redis to store login data
	Modified from @kreivc (https://www.kreivc.com/)
*/

import type { Logger } from 'pino'
import { createClient } from 'redis'
import { proto } from '../../WAProto'
import {
	type AuthenticationCreds,
	type AuthenticationState,
	type SignalDataTypeMap,
} from '../Types'
import { initAuthCreds } from './auth-utils'
import { BufferJSON } from './generics'


export const useRedisAuthState = async(
	redis: ReturnType<typeof createClient>,
	authKey = 'auth',
	logger?: Logger
): Promise<{
	state: AuthenticationState
	saveCreds: () => Promise<void>
	removeCreds: () => Promise<void>
}> => {
	const writeData = async(id: string, data: AuthenticationCreds & any) => {
		logger?.debug({ id, data }, 'writing data')

		await redis.hSet(
			authKey,
			id,
			JSON.stringify(data, BufferJSON.replacer)
		)
	}

	const readData = async(id: string) => {
		const data = await redis.hGet(authKey, id)
		logger?.debug({ id, data }, 'reading data')

		return data ? JSON.parse(data, BufferJSON.reviver) : null
	}

	const creds: AuthenticationCreds =
		(await readData('creds')) || initAuthCreds()

	return {
		state: {
			creds,
			keys: {
				get: async(type, ids) => {
					logger?.debug({ ids, type }, 'getting data')
					const data: { [_: string]: SignalDataTypeMap[typeof type] } = {}
					await Promise.all(
						ids.map(async(id: string | number) => {
							let value = await readData(`${type}-${id}`)
							if(type === 'app-state-sync-key' && value) {
								value = proto.Message.AppStateSyncKeyData.fromObject(value)
							}

							data[id] = value
						})
					)
					return data
				},
				set: async(data) => {
					logger?.debug({ data }, 'setting data')
					const tasks: Promise<void|number>[] = []
					for(const category in data) {
						for(const id in data[category as keyof typeof data]) {
							const value = data[category as keyof typeof data]?.[id]
							const key = `${category}-${id}`
							tasks.push(
								value
									? writeData(
										key,
										value
									)
									: redis.hDel(authKey, key)
							)
						}
					}

					await Promise.all(tasks)
				},
			},
		},
		saveCreds: async() => {
			logger?.debug({ creds }, 'saving creds')
			await writeData('creds', creds)
		},
		removeCreds: async() => {
			logger?.debug('deleting creds')
			await redis.del(authKey)
		},
	}
}

