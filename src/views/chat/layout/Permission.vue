<script setup lang='ts'>
import { onMounted, ref } from 'vue'
import { NModal, useMessage } from 'naive-ui'
import { fetchVerify } from '@/api'
import { useAuthStore } from '@/store'
// import Icon403 from '@/icons/403.vue'
import * as ww from '@wecom/jssdk'
import { useUserStore } from '@/store'
import type { UserInfo } from '@/store/modules/user/helper'

const userStore = useUserStore()

interface Props {
  visible: boolean
}

defineProps<Props>()

const authStore = useAuthStore()

const ms = useMessage()

// const loading = ref(false)
const token = ref('')

// const disabled = computed(() => !token.value.trim() || loading.value)
const env = import.meta.env;
const appid = env.VITE_WECOM_APP_ID
const agentid = env.VITE_WECOM_AGENT_ID
const redirect_uri = env.VITE_WECOM_REDIRECT_URI

onMounted(() => {
  const wwLogin = ww.createWWLoginPanel({
    el: '#ww_login',
    params: {
      login_type: 'CorpApp',
      appid,
      agentid,
      redirect_uri,
      state: 'loginState',
      redirect_type: 'callback',
    },
    onCheckWeComLogin({ isWeComLogin }) {
      console.log("isWeComLogin",isWeComLogin)
    },
    async onLoginSuccess({ code }) {
      try {
        const secretKey = await fetchVerify(code)
        const name = secretKey.name
        // const avatar = secretKey.avatar
        authStore.setToken({token:secretKey.token as string,userid:secretKey.userid as string})
        updateUserInfo({name})
        ms.success('success')
        window.location.reload()
      }
      catch (error: any) {
        ms.error(error.message ?? 'error')
        authStore.removeToken()
        token.value = ''
      }
    },
    onLoginFail(err) {
      console.log("err",err)
    },
  })
})

function updateUserInfo(options: Partial<UserInfo>) {
  userStore.updateUserInfo(options)
}

// async function handleVerify() {
//   const secretKey = token.value.trim()

//   if (!secretKey)
//     return

//   try {
//     loading.value = true
//     await fetchVerify(secretKey)
//     authStore.setToken(secretKey)
//     ms.success('success')
//     window.location.reload()
//   }
//   catch (error: any) {
//     ms.error(error.message ?? 'error')
//     authStore.removeToken()
//     token.value = ''
//   }
//   finally {
//     loading.value = false
//   }
// }

// function handlePress(event: KeyboardEvent) {
//   if (event.key === 'Enter' && !event.shiftKey) {
//     event.preventDefault()
//     handleVerify()
//   }
// }
</script>

<template>
  <NModal :show="visible" style="width: 90%; max-width: 480px">
  	<div id="ww_login" name="ww_login"></div>
  </NModal>
  <!-- <NModal :show="visible" style="width: 90%; max-width: 640px">
    <div class="p-10 bg-white rounded dark:bg-slate-800">
      <div class="space-y-4">
        <header class="space-y-2">
          <h2 class="text-2xl font-bold text-center text-slate-800 dark:text-neutral-200">
            403
          </h2>
          <p class="text-base text-center text-slate-500 dark:text-slate-500">
            {{ $t('common.unauthorizedTips') }}
          </p>
          <Icon403 class="w-[200px] m-auto" />
        </header>
        <NInput v-model:value="token" type="password" placeholder="" @keypress="handlePress" />
        <NButton
          block
          type="primary"
          :disabled="disabled"
          :loading="loading"
          @click="handleVerify"
        >
          {{ $t('common.verify') }}
        </NButton>
      </div>
    </div>
  </NModal> -->
</template>
