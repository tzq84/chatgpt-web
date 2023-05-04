import axios from 'axios'
import persist from 'node-persist'
import { v4 as uuidv4 } from 'uuid'
// const accessTokenCache = new NodeCache({ stdTTL: 7100 });
// const authSecretKeyCache = new NodeCache({ stdTTL: 3600 });

interface SendResponseOptions<T = any> {
  type: 'Success' | 'Fail'
  message?: string
  data?: T
}

export function sendResponse<T>(options: SendResponseOptions<T>) {
  if (options.type === 'Success') {
    return Promise.resolve({
      message: options.message ?? null,
      data: options.data ?? null,
      status: options.type,
    })
  }

  // eslint-disable-next-line prefer-promise-reject-errors
  return Promise.reject({
    message: options.message ?? 'Failed',
    data: options.data ?? null,
    status: options.type,
  })
}

export async function getWechatAccessToken() {
  await persist.init();
  // const cachedAccessToken = accessTokenCache.get('accessToken');
  const cachedAccessToken = await persist.getItem('accessToken');

  if (cachedAccessToken && cachedAccessToken.expires > Date.now()) {
    return cachedAccessToken.token;
  } else {
    const corpId = process.env.CORP_ID, corpSecret = process.env.CORP_SECRET
    try {
      const response = await axios.get('https://qyapi.weixin.qq.com/cgi-bin/gettoken', {
        params: {
          corpid: corpId,
          corpsecret: corpSecret,
        },
      });

      if (response.data.errcode === 0) {
        const accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in * 1000; // 转换为毫秒
        // accessTokenCache.set('accessToken', accessToken);
        // 将accessToken及其过期时间持久化
        await persist.setItem('accessToken', {
          token: accessToken,
          expires: Date.now() + expiresIn - 60 * 1000, // 减少1分钟，防止在边界情况下过期
        });
        return accessToken;
      } else {
        throw new Error(`Error getting access token: ${response.data.errmsg}`);
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

export async function getAuthSecretKey() {
  await persist.init();
  // const cachedSecretKey = authSecretKeyCache.get('key');
  const cachedSecretKey = await persist.getItem('key');

  if (cachedSecretKey && cachedSecretKey.expires > Date.now()) {
    return cachedSecretKey.key;
  } else {
    try {
        const key = uuidv4();
        const expiresIn = 3600 * 1000; // 转换为毫秒
        await persist.setItem('key', {
          key: key,
          expires: Date.now() + expiresIn, // 减少1分钟，防止在边界情况下过期
        });
        return key;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}