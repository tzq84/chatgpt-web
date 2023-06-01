import express from 'express'
import type { RequestProps } from './types'
import type { ChatMessage } from './chatgpt'
import { chatConfig, chatReplyProcess, currentModel } from './chatgpt'
import { auth } from './middleware/auth'
import { limiter } from './middleware/limiter'
import { isNotEmptyString } from './utils/is'
import { getWechatAccessToken, getAuthSecretKey } from './utils'
import axios from 'axios'

const app = express()
const router = express.Router()

const formatDate = (date) => {
    let year = date.getFullYear();
    let month = (1 + date.getMonth()).toString().padStart(2, '0');
    let day = date.getDate().toString().padStart(2, '0');
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');
    let seconds = date.getSeconds().toString().padStart(2, '0');

    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
}

app.use(express.static('public'))
app.use(express.json())

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

router.post('/chat-process', [auth, limiter], async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')

  try {
    const { prompt, options = {}, systemMessage, temperature, top_p, userid, name } = req.body as RequestProps
    let firstChunk = true
    const result = await chatReplyProcess({
      message: prompt,
      lastContext: options,
      process: (chat: ChatMessage) => {
        res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
        firstChunk = false
      },
      systemMessage,
      temperature,
      top_p,
    })
    console.log("chat",{date:formatDate(new Date()),userid,name,prompt,completion:result&&result.data&&result.data.text?result.data.text:""})
  }
  catch (error) {
    res.write(JSON.stringify(error))
  }
  finally {
    res.end()
  }
})

router.post('/config', auth, async (req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

router.post('/session', async (req, res) => {
  try {
    const token = req && req.headers["authorization"] ? req.headers["authorization"].replace('Bearer ', '').trim() : ""
    // const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    const AUTH_SECRET_KEY = await getAuthSecretKey();
    const hasAuth = isNotEmptyString(AUTH_SECRET_KEY) && token == AUTH_SECRET_KEY
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    let userid = "", name = "", avatar = "";
    if (!token)
      throw new Error('Secret key is empty')

    try {
      const accessToken = await getWechatAccessToken()
      let response = await axios.get('https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo', {
        params: {
          access_token: accessToken,
          code: token,
        },
      });

      if (response.data.errcode === 0) {
        userid = response.data.userid;
        // user_ticket = response.data.user_ticket;
      } else {
        throw new Error(`Error getting user info: ${response.data.errmsg}`);
      }

      const AUTH_SECRET_KEY = await getAuthSecretKey();
      // if (AUTH_SECRET_KEY !== token)
      //   throw new Error('密钥无效 | Secret key is invalid')
      if(userid) {
        response = await axios.get('https://qyapi.weixin.qq.com/cgi-bin/user/get', {
          params: {
            access_token: accessToken,
            userid: userid
          },
        });

        if (response.data.errcode === 0) {
          name = response.data.name;
          // avatar = response.data.thumb_avatar;
          res.send({ status: 'Success', message: 'Verify successfully', token: AUTH_SECRET_KEY, userid: userid, name: name, avatar: avatar })
        } else {
          res.send({ status: 'Fail', message: "没有权限", data: null })
        }

        // response = await axios.post('https://qyapi.weixin.qq.com/cgi-bin/auth/getuserdetail?access_token='+accessToken, {
        //   // params: {
        //   //   access_token: accessToken
        //   // },
        //   data: {
        //     user_ticket: user_ticket
        //   }
        // });

        // console.log(user_ticket,response.data)
        // if (response.data.errcode === 0) {
        //   avatar = response.data.avatar;
        // }

        // res.send({ status: 'Success', message: 'Verify successfully', token: AUTH_SECRET_KEY, userid: userid, name: name, avatar: avatar })
      } else {
        res.send({ status: 'Fail', message: "没有权限", data: null })
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

app.use('', router)
app.use('/api', router)
app.set('trust proxy', 1)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
