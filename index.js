require('dotenv').config()
const express = require('express')
const ngrok = require('ngrok')
const axios = require('axios')
const crypto = require('crypto')

const PORT = 3000
const app = express()
const passcode = crypto.randomBytes(48).toString('hex')


app.use(express.json())

const ghDispatch = () => {
  axios({
    url: process.env.GITHUB_BASE_URL,
    method: 'post',
    headers: {
      Authorization: 'token ' + process.env.GITHUB_TOKEN,
      'Content-Type': 'application/json',
    },
    data: {
      event_type: 'update_icon',
    },
  })
    .then(res => {
      if (res.status === 204) {
        console.log(`✅ Dispatch action was emitted`)
      } else {
        console.log(`❌ Dispatch action was failed to be emitted`)
      }
    })
    .catch(error => {
      if (error.response) {
        console.log(`❌ Dispatch failed, ${error.response.data.message}`)
      }
    })
}

// https://souporserious.com/getting-started-with-figma-webhooks/
app.post('/', async (request, response) => {
  if (request.body.passcode === passcode) {
    const { file_name, timestamp } = request.body
    console.log(`${file_name} was updated at ${timestamp}`)
    console.log(request.body)
    response.sendStatus(200)
    if (file_name === 'my_team library') {
      ghDispatch()
    }
  } else {
    response.sendStatus(403)
  }
})

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))

ngrok.connect(PORT).then(async endpoint => {
  axios({
    baseURL: process.env.FIGMA_BASE_URL,
    method: 'post',
    headers: {
      'X-Figma-Token': process.env.DEV_ACCESS_TOKEN,
    },
    data: {
      event_type: 'FILE_VERSION_UPDATE',
      team_id: process.env.FIGMA_TEAM_ID,
      passcode,
      endpoint,
    },
  })
    .then(res => {
      console.log(`✅ Webhook ${res.data.id} successfully created`)
      console.log(endpoint)
    })
    .catch(e => {
      console.log(e.response)
      if (e.response) {
        console.log(`❌ Error, ${e.response.data.message}, ${e.response.data.reason}`)
      }
    })
})
