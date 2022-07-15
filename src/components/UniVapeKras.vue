<template lang="pug">
  div.main
    div.title
      | Телеграм
    div.telegram(
    )
      button.telegram__code_button(
        @click="initiateTelegramLogin"
        :class="{ 'disabled': readyToStart }"
      )
        | Получить код
      input.telegram__code_input(
        v-model="telegramCode"
        :class="{ 'disabled': intervalProcess }"
      )
    button.app__button(
      @click="initiateTask"
      :class="{ 'disabled': !readyToStart || intervalProcess }"
    )
      | Запустить программу
    button.app__button(
      @click="endTask"
      :class="{ 'disabled': !intervalProcess }"
    )
      | Завершить выполнение
    div.app__error
      | {{ errorText }}
</template>

<script>
import Vue from 'vue'
import VueGoogleApi from 'vue-google-api'
import * as XLSX from 'xlsx'
import * as telegramApi from 'telegram-api-vue/dist/telegramApi.min'

export default {
  name: 'UniVapeKras',
  components: {
  },
  data() {
    return {
      clientPhoneNumber: "+7XXXXXXXXXX",
      currentFile: "",
      currentArr: "",
      oldArr: "",
      compareResult: {},
      telegramCode: "",
      readyToStart: false,
      intervalProcess: false,
      errorText: ""
    }
  },
  mounted() {
    const config = {
      apiKey: 'AIzaSyDT7IVv1iNY22C6s2VQhpWI2IXpDKxFFkQ',
      clientId: '196125121231-7fb47rkov3rr0lchcvgc03h877g22otr.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      discoveryDocs: [ "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest" ]
    }
    Vue.use(VueGoogleApi, config)
    // log out from google account each time we start the program for a safety measures
    // выходим из гугл аккаунта при каждом запуске из соображений безопасности
    this.$gapi.signOut()

    telegramApi.setConfig({
      app: {
        id: "XXXXXXXX", /* App ID */
        hash: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', /* App hash */
        version: '1.0.0' /* App version */
      },
      server: {
        test: [
          {
            id: 2, /* DC ID */
            host: '149.154.167.40',
            port: 80
          }
        ],
        production: [
          {
            id: 2, /* DC ID */
            host: '149.154.167.50',
            port: 80
          }
        ]
      }
    })
  },
  methods: {
    initiateTask() {
      telegramApi.getUserInfo().then((user) => {
        if (user.id) {
          // You have already signed in
          this.initiateComparing()
        } else {
          // Log in
          this.initiateTelegramSignIn()
        }
      }).catch(err => {
        console.error(err)
      })
    },
    endTask() {
      // manual stop for a task without closing
      // остановка работы приложения без закрытия программы
      this.readyToStart = true
      clearInterval(this.intervalProcess)
      this.intervalProcess = false
      this.telegramCode = ""
      this.$gapi.signOut()
    },
    initiateTelegramLogin() {
      telegramApi.sendCode(this.clientPhoneNumber).then((sent_code) => {
        // phone_code_hash will need to sign in or sign up
        window.phone_code_hash = sent_code.phone_code_hash

        this.readyToStart = true
      }).catch(err => {
        console.error(err)
      })
    },
    initiateTelegramSignIn() {
      if (!this.telegramCode || this.telegramCode.length !== 5) {
        let text = !this.telegramCode ? "Необходимо ввести телеграмм код" : "Длина телеграмм кода - не менее 5 символов"
        this.sendError(text)
        return false
      }

      telegramApi.signIn(this.clientPhoneNumber, window.phone_code_hash, this.telegramCode).then(() => {
        // Sign in complete
        delete window.phone_code_hash

        this.initiateComparing()
      }, (err) => {
        switch (err.type) {
          case 'PHONE_CODE_INVALID':
            this.sendError("Введён не верный код")
            break;
          case 'PHONE_NUMBER_UNOCCUPIED':
            this.sendError("Пользователь телеграм не найден")
            break;
          default:
            this.sendError("Неизвестная ошибка телеграм. Необходима перезагрузка " + err.type)
            break;
        }
      });
    },
    initiateComparing() {
      if (!this.readyToStart) return false

      this.$gapi.signIn()
        .then(user => {
          console.log('Signed in as %s', user.name)
        })
        .catch(err => {
          console.error('Not signed in: %s', err)
        })

      this.$gapi._libraryInit('client', { discoveryDocs: [ 'https://content.googleapis.com/discovery/v1/apis/drive/v3/rest' ]})
        .then((client) => {
          this.initiateDocumentLoading(client)

          this.intervalProcess = setInterval(() => {
            this.initiateDocumentLoading(client)
          },1000*60*5)
        })
    },
    compareLists(resultArr) {
      if (this.currentArr) {
        this.compareResult = {
          newList: [],
          changedList: []
        }

        resultArr.forEach((itemFromNewPrice) => {
          let wasInStore = this.currentArr.find((itemFromOldPrice) => {
            return itemFromNewPrice.name === itemFromOldPrice.name && itemFromNewPrice.desc === itemFromOldPrice.desc
          })

          if (!wasInStore) {
            // product is an absolute new product in price list - mark him as a new one
            // продукта не было в прайс листе - помечаем его соответствующим образом
            this.compareResult.newList.push(itemFromNewPrice)
          } else {
            // looking for a price change
            // ищем изменения цены
            if (itemFromNewPrice.opt1 !== wasInStore.opt1 || itemFromNewPrice.opt2 !== wasInStore.opt2) {
              // highlight changed price with cost difference. There is 2 different types of price
              // выделяем изменённые цены, снабжаем значением изменения цены. У товара имеется 2 типа цены
              if (itemFromNewPrice.opt1 !== wasInStore.opt1) {
                let difference = parseInt(itemFromNewPrice.opt1) - parseInt(wasInStore.opt1)
                if (difference > 0) difference = "+"+difference
                itemFromNewPrice.opt1 = "!!"+itemFromNewPrice.opt1 + "; " + wasInStore.opt1 + "; " + difference
              }
              if (itemFromNewPrice.opt2 !== wasInStore.opt2) {
                let difference = parseInt(itemFromNewPrice.opt2) - parseInt(wasInStore.opt2)
                if (difference > 0) difference = "+"+difference
                itemFromNewPrice.opt2 = "!!" + itemFromNewPrice.opt2 + "; " + wasInStore.opt2 + "; " + difference
              }
              this.compareResult.changedList.push(itemFromNewPrice)
            }
          }
        })

        // we have changes - have to send them to the client's telegram
        // произошли изменения - необходимо выслать их в телеграм клиенту
        if (this.compareResult.newList.length > 0 || this.compareResult.changedList.length > 0) {
          this.createXlsx(this.compareResult)
        }
      }
      this.currentArr = resultArr
    },
    createXlsx(compareResults) {
      // create an "array of arrays" in row-major order for xlsx plugin in order to create xlsx doc
      // создаём двумерный массив с основой на строках согласно требованиями документации xlsx плагина для создания xlsx документа
      const xlsxArray = []
      if (compareResults.newList.length > 0) {
        xlsxArray.push(['NEW'])
        xlsxArray.push(['Name', 'RRC', 'OPT1', 'OPT2', 'DESC'])
        compareResults.newList.forEach((oneRow) => {
          xlsxArray.push(
            [
              ...Object.values(oneRow)
            ]
          )
        })

        xlsxArray.push([''])
      }

      if (compareResults.changedList.length > 0) {
        xlsxArray.push(['CHANGED'])
        xlsxArray.push(['Name', 'RRC', 'OPT1', 'OPT2', 'DESC'])
        compareResults.changedList.forEach((oneRow) => {
          xlsxArray.push(
            [
              ...Object.values(oneRow)
            ]
          )
        })
      }

      let workbook = XLSX.utils.book_new()
      let worksheet = XLSX.utils.aoa_to_sheet(xlsxArray, { cellStyles: true })
      worksheet["!cols"] = [
        { width: "60" },
        { width: "8" },
        { width: "18" },
        { width: "18" }
      ]
      XLSX.utils.book_append_sheet(workbook, worksheet, "Differences")

      // create a file for sending via Telegram
      // создание файла для посылки в телеграм
      const fileBuffer = XLSX.write(workbook, {bookType: 'xlsx' , bookSST: false, type: 'buffer'})
      const blob = new Blob([fileBuffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
      const file = new File(
        [blob],
        `UniVapeKras ${new Date().toLocaleString("ru", {})}.xlsx`,
      )

      telegramApi.sendFile({
        id: "XXXXXXXXX",
        type: 'chat',
        file: file,
        caption: 'file_xlsx'
      }).then(function(updates) {
        console.log(updates)
      })
    },
    initiateDocumentLoading(client) {
      let vueComponent = this
      return client.drive.files.get({
        "fileId": "1DDFvNm0kaxJBfeREsv4cHDI9jAoo3z3n",
        "alt": "media",
      })
        .then(function(response) {
          // response.body return file stream in string; turn to Uint8Array format for xlsx plugin
          // response.body возвращает файловый поток в виде строки; xlsx plugin требует объект формата Uint8Array
          let workbook = XLSX.read(new Uint8Array(response.body.length).map((_, i) => response.body.charCodeAt(i)), {})
          vueComponent.currentFile = workbook.Sheets.TDSheet
          let resultArr = []

          Object.keys(vueComponent.currentFile).forEach((key) => {
            if (key[0] === "B" && parseInt(key.slice(1)) > 14) {
              if (vueComponent.currentFile["E"+key.slice(1)] || vueComponent.currentFile["G"+key.slice(1)]) {
                let item = {
                  name: vueComponent.currentFile[key].v,
                  rrc: vueComponent.currentFile["C"+key.slice(1)] ? vueComponent.currentFile["C"+key.slice(1)].v : "",
                  opt1: vueComponent.currentFile["E"+key.slice(1)] ? vueComponent.currentFile["E"+key.slice(1)].v : "",
                  opt2: vueComponent.currentFile["G"+key.slice(1)] ? vueComponent.currentFile["G"+key.slice(1)].v : "",
                  desc: vueComponent.currentFile["N"+key.slice(1)] ? vueComponent.currentFile["N"+key.slice(1)].v : ""
                }

                resultArr.push(item)
              }
            }

            return false
          });

          vueComponent.compareLists(resultArr)
        },
        function(err) { console.error(err) })
    },
    sendError(text) {
      this.errorText = text
      setTimeout(() => {
        this.errorText = ""
      }, 45000)
    }
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
input {
  border: 2px solid #333;
  box-sizing: border-box;
  border-radius: 8px;
  background: #ffffff !important;
  outline: none;
  padding: 6px;
  font-size: 28px;
}
button {
  border-radius: 6px;
  font-size: 16px;
  border: none;
  position: relative;
  box-sizing: border-box;
  outline: none;
  text-align: center;
  text-decoration: none;
  line-height: 100%;
  font-weight: 600;
  cursor: pointer;
  transition: .2s ease-in-out;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0099dc;
  color: #fff;
}
button:hover:not(.disabled) {
  background-color: #007ab0;
}
button:active:not(.disabled) {
  border-color: rgba(0,0,0,.24);
  box-shadow: inset 0 0 69px rgb(0 0 0 / 12%), inset 0 2px 4px rgb(0 0 0 / 24%);
  background-color: #007ab0;
}
.disabled {
  opacity: .4;
  cursor: default;
  pointer-events: none;
}
.main {
  display: block;
}
.title {
  font-size: 24px;
}
.telegram {
  margin: 15px auto;
  display: flex;
  width: 50%;
  max-width: 560px;
  min-width: 320px;
  justify-content: space-between;
}
.telegram__code_button {
  width: 48%;
  height: 48px;
}
.telegram__code_input {
  width: 48%;
  height: 48px;
}
.app__button {
  width: 50%;
  max-width: 560px;
  min-width: 320px;
  margin: 15px auto;
  height: 48px;
  font-size: 20px;
}
</style>
