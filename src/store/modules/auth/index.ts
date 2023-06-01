import { defineStore } from 'pinia'
import { getToken, removeToken, setToken } from './helper'
import { store } from '@/store'
import { fetchSession } from '@/api'

interface SessionResponse {
  auth: boolean
  model: 'ChatGPTAPI' | 'ChatGPTUnofficialProxyAPI'
}

export interface AuthState {
  token: string | undefined
  userid: string | undefined
  name: string | undefined
  session: SessionResponse | null
}

export const useAuthStore = defineStore('auth-store', {
  state: (): AuthState => {
    const tokenInfo = getToken();
    return {
      token: tokenInfo && tokenInfo.token ? tokenInfo.token : "",
      userid: tokenInfo && tokenInfo.userid ? tokenInfo.userid : "",
      name: tokenInfo && tokenInfo.name ? tokenInfo.name : "",
      session: null,
    };
  },

  getters: {
    isChatGPTAPI(state): boolean {
      return state.session?.model === 'ChatGPTAPI'
    },
  },

  actions: {
    async getSession() {
      try {
        const { data } = await fetchSession<SessionResponse>()
        this.session = { ...data }
        return Promise.resolve(data)
      }
      catch (error) {
        return Promise.reject(error)
      }
    },

    setToken(token: any) {
      this.token = token
      setToken(token)
    },

    removeToken() {
      this.token = undefined
      removeToken()
    },
  },
})

export function useAuthStoreWithout() {
  return useAuthStore(store)
}
